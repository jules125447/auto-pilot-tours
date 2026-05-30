// Map-matching engine inspired by Waze/Google Maps approach.
// - Monotone progress (never goes backwards unless the user really did)
// - Direction-aware scoring (best segment = distance + heading match)
// - Local search window around previous progress (cheaper + more stable)
// - Light predictive lookahead based on speed (reduces perceived lag)
// - Confidence score so callers can decide between snapped vs raw position

export type LatLng = [number, number];

export interface MatcherState {
  progressMeters: number;       // cumulative distance along route of matched point
  segmentIndex: number;          // last matched segment index
  lateralMeters: number;         // how far the raw GPS was from the route
  confidence: number;            // 0..1 — how confident we are this is on-route
  matched: LatLng;               // snapped lat/lng (no prediction)
  displayPos: LatLng;            // snapped + light forward prediction (what to render)
  bearingDeg: number;            // route bearing at matched point
  totalMeters: number;           // total route length
}

export interface MatcherInput {
  route: LatLng[];
  raw: LatLng;
  headingDeg: number | null;     // device/movement heading
  speedKmh: number | null;
  accuracyMeters: number | null;
  dtSeconds: number;             // time since previous match
  prev: MatcherState | null;
}

const M_PER_DEG_LAT = 110574;

function metersPerDegLng(lat: number) {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function segmentBearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLng);
  return ((toDeg(Math.atan2(y, x)) + 360) % 360);
}

/** Precompute cumulative offsets so we can pick a segment by progress quickly. */
export interface PreparedRoute {
  route: LatLng[];
  cumulative: number[];   // cumulative[i] = meters from route[0] to route[i]
  total: number;
}

export function prepareRoute(route: LatLng[]): PreparedRoute {
  const cum: number[] = new Array(route.length).fill(0);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const mlat = M_PER_DEG_LAT;
    const mlng = metersPerDegLng((a[0] + b[0]) / 2);
    const dx = (b[1] - a[1]) * mlng;
    const dy = (b[0] - a[0]) * mlat;
    cum[i] = cum[i - 1] + Math.hypot(dx, dy);
  }
  return { route, cumulative: cum, total: cum[cum.length - 1] || 0 };
}

/** Find the segment index that contains a given progress distance. */
function segmentForProgress(prep: PreparedRoute, progress: number): number {
  const cum = prep.cumulative;
  if (progress <= 0) return 0;
  if (progress >= prep.total) return Math.max(0, cum.length - 2);
  // Binary search
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= progress) lo = mid;
    else hi = mid;
  }
  return lo;
}

interface Candidate {
  segIndex: number;
  t: number;            // 0..1 along segment
  px: LatLng;           // closest point on segment
  lateralM: number;
  progress: number;     // cumulative meters at px
  segBearing: number;
}

function evaluateSegment(
  prep: PreparedRoute,
  segIdx: number,
  raw: LatLng
): Candidate | null {
  const a = prep.route[segIdx];
  const b = prep.route[segIdx + 1];
  if (!a || !b) return null;

  const mlat = M_PER_DEG_LAT;
  const mlng = metersPerDegLng(raw[0]);
  const ax = (a[1] - raw[1]) * mlng;
  const ay = (a[0] - raw[0]) * mlat;
  const bx = (b[1] - raw[1]) * mlng;
  const by = (b[0] - raw[0]) * mlat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 1e-9) {
    t = -(ax * dx + ay * dy) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  const pxLng = raw[1] + (ax + t * dx) / mlng;
  const pxLat = raw[0] + (ay + t * dy) / mlat;
  const lateralM = Math.hypot(ax + t * dx, ay + t * dy);
  const segLen = prep.cumulative[segIdx + 1] - prep.cumulative[segIdx];
  const progress = prep.cumulative[segIdx] + segLen * t;
  return {
    segIndex: segIdx,
    t,
    px: [pxLat, pxLng],
    lateralM,
    progress,
    segBearing: segmentBearing(a, b),
  };
}

/** Score a candidate (lower = better). */
function scoreCandidate(
  c: Candidate,
  input: MatcherInput,
  prev: MatcherState | null
): number {
  // Base: lateral distance² (in meters) — dominant signal.
  let score = c.lateralM * c.lateralM;

  // Heading mismatch: if we know movement heading and we're moving, penalize
  // segments going the opposite way. At slow speed, heading is unreliable.
  const moving = (input.speedKmh ?? 0) >= 8;
  if (moving && input.headingDeg !== null) {
    const diff = Math.abs(angleDelta(c.segBearing, input.headingDeg));
    // 0° diff = no penalty; 180° = strong penalty (~ +60m equiv)
    const headingPenalty = (diff / 180) * 60;
    score += headingPenalty * headingPenalty;
  }

  // Backward penalty: snapping to a point before previous progress means
  // we're going backwards on the route — that's usually wrong.
  if (prev) {
    const back = prev.progressMeters - c.progress;
    if (back > 0) {
      // Allow a tiny backward correction (GPS jitter), penalize the rest hard.
      const tolerated = 6; // meters of free backward correction
      const excess = Math.max(0, back - tolerated);
      score += excess * excess * 4; // heavy penalty
    }

    // Forward leap penalty: jumping way ahead of where the user could plausibly
    // be (given speed) is suspicious.
    const speedMs = (input.speedKmh ?? prev.progressMeters > 0 ? (input.speedKmh ?? 0) : 0) / 3.6;
    const maxForward = Math.max(35, speedMs * Math.max(1, input.dtSeconds) * 2.5);
    const forward = c.progress - prev.progressMeters;
    if (forward > maxForward) {
      const excess = forward - maxForward;
      score += excess * excess;
    }
  }

  return score;
}

export function matchPosition(input: MatcherInput, prepared: PreparedRoute): MatcherState {
  const { raw, prev } = input;
  const accuracy = input.accuracyMeters ?? 20;
  const speedMs = (input.speedKmh ?? 0) / 3.6;

  // Determine search window. With a previous match, only look around it; this
  // both speeds things up AND avoids the classic "jumps to a parallel road"
  // failure mode.
  let segStart = 0;
  let segEnd = prepared.route.length - 2;

  if (prev) {
    // Search window scales with speed and dt. At 50 km/h for 1s, that's ~14m
    // travel; we keep a buffer for parallel-road avoidance.
    const aheadMeters = Math.max(60, speedMs * Math.max(1, input.dtSeconds) * 4 + 80);
    const behindMeters = Math.max(20, accuracy * 1.2);
    const lo = Math.max(0, prev.progressMeters - behindMeters);
    const hi = Math.min(prepared.total, prev.progressMeters + aheadMeters);
    segStart = segmentForProgress(prepared, lo);
    segEnd = Math.min(prepared.route.length - 2, segmentForProgress(prepared, hi) + 1);
  }

  let best: Candidate | null = null;
  let bestScore = Infinity;
  for (let i = segStart; i <= segEnd; i++) {
    const cand = evaluateSegment(prepared, i, raw);
    if (!cand) continue;
    const s = scoreCandidate(cand, input, prev);
    if (s < bestScore) {
      bestScore = s;
      best = cand;
    }
  }

  // Fallback: if window search produced nothing decent, fall back to global
  // search (only happens for the very first fix or after a long pause).
  if (!best || (prev && best.lateralM > Math.max(120, accuracy * 3))) {
    let gBest: Candidate | null = null;
    let gScore = Infinity;
    for (let i = 0; i < prepared.route.length - 1; i++) {
      const cand = evaluateSegment(prepared, i, raw);
      if (!cand) continue;
      const s = scoreCandidate(cand, input, null); // no prev penalty in global
      if (s < gScore) { gScore = s; gBest = cand; }
    }
    if (gBest) best = gBest;
  }

  if (!best) {
    return {
      progressMeters: prev?.progressMeters ?? 0,
      segmentIndex: prev?.segmentIndex ?? 0,
      lateralMeters: Infinity,
      confidence: 0,
      matched: raw,
      displayPos: raw,
      bearingDeg: prev?.bearingDeg ?? 0,
      totalMeters: prepared.total,
    };
  }

  // Monotone smoothing: never let progress regress unless user clearly
  // backed up (large lateral too — meaning U-turn / wrong way).
  let progress = best.progress;
  if (prev) {
    const back = prev.progressMeters - progress;
    if (back > 0 && back < 25 && best.lateralM < 30) {
      // Hold progress (GPS jitter)
      progress = prev.progressMeters;
    } else if (back > 0 && back < 80 && best.lateralM < 60) {
      // Allow slow regression
      progress = prev.progressMeters - back * 0.3;
    }
  }

  // Confidence: high when lateral is small and heading matches.
  const lateralConf = Math.max(0, 1 - best.lateralM / Math.max(40, accuracy * 1.8));
  let headingConf = 1;
  if ((input.speedKmh ?? 0) >= 10 && input.headingDeg !== null) {
    const diff = Math.abs(angleDelta(best.segBearing, input.headingDeg));
    headingConf = Math.max(0, 1 - diff / 120);
  }
  const confidence = Math.max(0, Math.min(1, lateralConf * 0.7 + headingConf * 0.3));

  // Recompute matched point from possibly-adjusted progress
  const segIdx = segmentForProgress(prepared, progress);
  const a = prepared.route[segIdx];
  const b = prepared.route[segIdx + 1] ?? a;
  const segLen = prepared.cumulative[segIdx + 1] - prepared.cumulative[segIdx];
  const localT = segLen > 0 ? (progress - prepared.cumulative[segIdx]) / segLen : 0;
  const matched: LatLng = [
    a[0] + (b[0] - a[0]) * localT,
    a[1] + (b[1] - a[1]) * localT,
  ];

  // Predictive lookahead: project ~0.6s ahead based on speed and route bearing.
  // This cancels most of the visible "arrow lags real position" feel without
  // overshooting on slow movement.
  let displayPos: LatLng = matched;
  let bearingDeg = segmentBearing(a, b);
  if (speedMs > 1.5 && confidence > 0.35) {
    const lookaheadM = Math.min(speedMs * 0.6, 18);
    const predicted = Math.min(prepared.total, progress + lookaheadM);
    const pSeg = segmentForProgress(prepared, predicted);
    const pa = prepared.route[pSeg];
    const pb = prepared.route[pSeg + 1] ?? pa;
    const pSegLen = prepared.cumulative[pSeg + 1] - prepared.cumulative[pSeg];
    const pt = pSegLen > 0 ? (predicted - prepared.cumulative[pSeg]) / pSegLen : 0;
    displayPos = [pa[0] + (pb[0] - pa[0]) * pt, pa[1] + (pb[1] - pa[1]) * pt];
    bearingDeg = segmentBearing(pa, pb);
  }

  return {
    progressMeters: progress,
    segmentIndex: segIdx,
    lateralMeters: best.lateralM,
    confidence,
    matched,
    displayPos,
    bearingDeg,
    totalMeters: prepared.total,
  };
}
