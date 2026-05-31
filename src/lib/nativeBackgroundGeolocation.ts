/**
 * Background GPS — keeps tracking even when the app is in background
 * or the screen is off. Native (iOS/Android) only.
 *
 * On web this is a no-op (browsers can't keep GPS alive in background).
 * The plugin shows a persistent notification on Android (required by
 * Google Play for foreground location services) and uses the
 * `UIBackgroundModes: location` entitlement on iOS.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
      // Android-specific tuning (passed through to the native layer)
      interval?: number;
      fastestInterval?: number;
      activitiesInterval?: number;
      desiredAccuracy?: number;
    },
    callback: (
      position: {
        latitude: number;
        longitude: number;
        accuracy: number;
        altitude: number | null;
        altitudeAccuracy: number | null;
        bearing: number | null;
        speed: number | null;
        time: number;
      } | null,
      error?: { code: string; message: string }
    ) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
  // Plugin exposes accuracy constants as static-ish values; we keep a fallback.
  DESIRED_ACCURACY_HIGH?: number;
}

const isNative = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

export const getNativePlatform = (): "android" | "ios" | "web" => {
  try {
    const p = Capacitor.getPlatform();
    if (p === "android" || p === "ios") return p;
    return "web";
  } catch {
    return "web";
  }
};

export const isAndroidNative = (): boolean => getNativePlatform() === "android";

let plugin: BackgroundGeolocationPlugin | null = null;
let watcherId: string | null = null;

function getPlugin(): BackgroundGeolocationPlugin | null {
  if (!isNative) return null;
  if (plugin) return plugin;
  try {
    plugin = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
    return plugin;
  } catch {
    return null;
  }
}

export interface BackgroundPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface BackgroundGpsOptions {
  /** Minimum meters between two emitted fixes. Lower = smoother. */
  distanceFilter?: number;
  /** Desired interval between updates (ms). Android. */
  interval?: number;
  /** Fastest interval the OS will deliver updates (ms). Android. */
  fastestInterval?: number;
  /** Interval for activity recognition (ms). Android. */
  activitiesInterval?: number;
  /** Plugin accuracy constant; defaults to HIGH (0). */
  desiredAccuracy?: number;
}

// Sensible high-accuracy navigation defaults (Waze-like cadence).
const DEFAULT_OPTIONS: Required<BackgroundGpsOptions> = {
  distanceFilter: 2,
  interval: 500,
  fastestInterval: 250,
  activitiesInterval: 1000,
  // The Capacitor community plugin uses 0 for HIGH accuracy when the
  // constant is not exposed at runtime.
  desiredAccuracy: 0,
};

/**
 * Start a background watcher. Returns true if started (native), false otherwise.
 */
export async function startBackgroundGps(
  onPosition: (pos: BackgroundPosition) => void,
  options: BackgroundGpsOptions = {}
): Promise<boolean> {
  const p = getPlugin();
  if (!p) return false;
  if (watcherId) return true;

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const desiredAccuracy =
    options.desiredAccuracy ?? p.DESIRED_ACCURACY_HIGH ?? DEFAULT_OPTIONS.desiredAccuracy;

  try {
    watcherId = await p.addWatcher(
      {
        backgroundMessage: "Tilo continue de vous guider sur votre circuit.",
        backgroundTitle: "Navigation Tilo en cours",
        requestPermissions: true,
        stale: false,
        distanceFilter: opts.distanceFilter,
        interval: opts.interval,
        fastestInterval: opts.fastestInterval,
        activitiesInterval: opts.activitiesInterval,
        desiredAccuracy,
      },
      (location, error) => {
        if (error) return;
        if (!location) return;
        onPosition({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.bearing,
          timestamp: location.time,
        });
      }
    );
    return true;
  } catch {
    watcherId = null;
    return false;
  }
}

export async function stopBackgroundGps(): Promise<void> {
  const p = getPlugin();
  if (!p || !watcherId) return;
  try { await p.removeWatcher({ id: watcherId }); } catch {}
  watcherId = null;
}
