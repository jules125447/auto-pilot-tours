/**
 * Unified geolocation API that uses the native Capacitor plugin on mobile
 * (real hardware GPS, works with screen off) and falls back to the
 * browser `navigator.geolocation` on web.
 *
 * Mirrors the web API shape so call sites stay symmetrical.
 */
import { Capacitor } from "@capacitor/core";
import { Geolocation, type PositionOptions } from "@capacitor/geolocation";

export interface UnifiedPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

export interface UnifiedError {
  code: number;
  message: string;
}

const HIGH_ACCURACY_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Request permission upfront (no-op on web — browser asks on first use).
 */
export async function ensureLocationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return true;
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted" || status.coarseLocation === "granted") return true;
    const req = await Geolocation.requestPermissions({ permissions: ["location"] });
    return req.location === "granted" || req.coarseLocation === "granted";
  } catch {
    return false;
  }
}

function toUnified(pos: any): UnifiedPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude ?? null,
      altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
      heading: pos.coords.heading ?? null,
      speed: pos.coords.speed ?? null,
    },
    timestamp: pos.timestamp,
  };
}

export async function getCurrentPositionUnified(
  options: PositionOptions = HIGH_ACCURACY_OPTS
): Promise<UnifiedPosition> {
  if (isNativePlatform()) {
    const pos = await Geolocation.getCurrentPosition(options);
    return toUnified(pos);
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(toUnified(p)),
      (e) => reject({ code: e.code, message: e.message } as UnifiedError),
      options
    );
  });
}

export interface UnifiedWatchHandle {
  clear: () => void;
}

export async function watchPositionUnified(
  onPosition: (pos: UnifiedPosition) => void,
  onError: (err: UnifiedError) => void,
  options: PositionOptions = HIGH_ACCURACY_OPTS
): Promise<UnifiedWatchHandle> {
  if (isNativePlatform()) {
    const id = await Geolocation.watchPosition(options, (pos, err) => {
      if (err) {
        onError({ code: 0, message: err.message ?? String(err) });
        return;
      }
      if (pos) onPosition(toUnified(pos));
    });
    return {
      clear: () => {
        Geolocation.clearWatch({ id }).catch(() => {});
      },
    };
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onPosition(toUnified(p)),
    (e) => onError({ code: e.code, message: e.message }),
    options
  );
  return {
    clear: () => navigator.geolocation.clearWatch(id),
  };
}
