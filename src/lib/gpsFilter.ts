/**
 * Pro-grade GPS filtering pipeline used to clean noisy fixes before
 * snap-to-road. Inspired by Waze / Google Maps behaviour.
 *
 *  - Rejects fixes whose reported accuracy is worse than `maxAccuracyMeters`
 *  - Rejects "teleport" jumps (implied speed > maxJumpKmh)
 *  - 1D Kalman smoothing on latitude and longitude
 *  - Heading hysteresis: only emits a new heading if Δ > headingHysteresisDeg
 *  - Rolling speed average (last `speedWindowMs` ms) for stable ETA
 */
import { haversine } from "./turnDetection";

export interface RawFix {
  lat: number;
  lng: number;
  accuracy: number;
  speedMs: number | null; // m/s as reported by the device (may be null)
  headingDeg: number | null;
  timestamp: number; // ms epoch
}

export interface FilteredFix {
  lat: number;
  lng: number;
  accuracy: number;
  speedKmh: number;
  headingDeg: number | null;
  timestamp: number;
}

export interface FilterOptions {
  maxAccuracyMeters?: number; // default 30
  maxJumpKmh?: number; // default 180
  headingHysteresisDeg?: number; // default 8
  speedWindowMs?: number; // default 30_000
  // Kalman process noise — higher = trusts measurements more
  kalmanQ?: number; // default 3
}

interface Kalman1D {
  x: number; // estimate
  p: number; // estimate covariance
}

export class GpsFilter {
  private last: FilteredFix | null = null;
  private kLat: Kalman1D | null = null;
  private kLng: Kalman1D | null = null;
  private lastEmittedHeading: number | null = null;
  private speedSamples: { t: number; speedKmh: number }[] = [];

  private readonly maxAccuracy: number;
  private readonly maxJumpKmh: number;
  private readonly headingHyst: number;
  private readonly speedWindow: number;
  private readonly Q: number;

  constructor(opts: FilterOptions = {}) {
    this.maxAccuracy = opts.maxAccuracyMeters ?? 30;
    this.maxJumpKmh = opts.maxJumpKmh ?? 180;
    this.headingHyst = opts.headingHysteresisDeg ?? 8;
    this.speedWindow = opts.speedWindowMs ?? 30_000;
    this.Q = opts.kalmanQ ?? 3;
  }

  reset(): void {
    this.last = null;
    this.kLat = null;
    this.kLng = null;
    this.lastEmittedHeading = null;
    this.speedSamples = [];
  }

  /**
   * Push a raw fix; returns a filtered fix, or null if rejected.
   */
  push(raw: RawFix): FilteredFix | null {
    // Never trust the very-poor-accuracy fixes (network/wifi).
    if (raw.accuracy > this.maxAccuracy && this.last) return null;

    // Reject teleport jumps relative to last accepted fix.
    if (this.last) {
      const dtSec = Math.max(0.001, (raw.timestamp - this.last.timestamp) / 1000);
      const distM = haversine(this.last.lat, this.last.lng, raw.lat, raw.lng);
      const impliedKmh = (distM / dtSec) * 3.6;
      if (impliedKmh > this.maxJumpKmh) return null;
    }

    // Kalman R = measurement variance ~ accuracy^2.
    const R = Math.max(4, raw.accuracy * raw.accuracy);

    const kalmanStep = (k: Kalman1D | null, z: number): Kalman1D => {
      if (!k) return { x: z, p: R };
      const pPred = k.p + this.Q;
      const K = pPred / (pPred + R);
      return { x: k.x + K * (z - k.x), p: (1 - K) * pPred };
    };

    this.kLat = kalmanStep(this.kLat, raw.lat);
    this.kLng = kalmanStep(this.kLng, raw.lng);

    const smoothedLat = this.kLat.x;
    const smoothedLng = this.kLng.x;

    // Speed: prefer device-reported, fallback to derived.
    let speedKmh = raw.speedMs !== null ? Math.max(0, raw.speedMs * 3.6) : 0;
    if (this.last && raw.speedMs === null) {
      const dtSec = Math.max(0.001, (raw.timestamp - this.last.timestamp) / 1000);
      const distM = haversine(this.last.lat, this.last.lng, smoothedLat, smoothedLng);
      speedKmh = (distM / dtSec) * 3.6;
    }
    speedKmh = Math.min(speedKmh, this.maxJumpKmh);

    // Rolling-window average for stable ETA.
    this.speedSamples.push({ t: raw.timestamp, speedKmh });
    const cutoff = raw.timestamp - this.speedWindow;
    while (this.speedSamples.length && this.speedSamples[0].t < cutoff) {
      this.speedSamples.shift();
    }

    // Heading hysteresis.
    let outHeading = this.lastEmittedHeading;
    if (raw.headingDeg !== null) {
      if (
        this.lastEmittedHeading === null ||
        Math.abs(angleDelta(this.lastEmittedHeading, raw.headingDeg)) > this.headingHyst
      ) {
        outHeading = raw.headingDeg;
        this.lastEmittedHeading = raw.headingDeg;
      }
    }

    const filtered: FilteredFix = {
      lat: smoothedLat,
      lng: smoothedLng,
      accuracy: raw.accuracy,
      speedKmh,
      headingDeg: outHeading,
      timestamp: raw.timestamp,
    };
    this.last = filtered;
    return filtered;
  }

  /** Rolling-average speed over the configured window (km/h). */
  getAverageSpeedKmh(): number {
    if (this.speedSamples.length === 0) return 0;
    const sum = this.speedSamples.reduce((s, x) => s + x.speedKmh, 0);
    return sum / this.speedSamples.length;
  }
}

function angleDelta(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  return d;
}
