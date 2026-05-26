/**
 * Background GPS — keeps tracking even when the app is in background
 * or the screen is off. Native (iOS/Android) only.
 *
 * On web this is a no-op (browsers can't keep GPS alive in background).
 * The regular `watchPositionUnified` continues to work foreground.
 *
 * The plugin shows a persistent notification on Android (required by
 * Google Play for foreground location services) and uses the
 * `UIBackgroundModes: location` entitlement on iOS (must be set in
 * Info.plist after `npx cap add ios`).
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
}

const isNative = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

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

/**
 * Start a background watcher. Returns true if started (native), false otherwise.
 */
export async function startBackgroundGps(
  onPosition: (pos: BackgroundPosition) => void
): Promise<boolean> {
  const p = getPlugin();
  if (!p) return false;
  if (watcherId) return true;

  try {
    watcherId = await p.addWatcher(
      {
        backgroundMessage: "Tilo continue de vous guider sur votre circuit.",
        backgroundTitle: "Navigation Tilo en cours",
        requestPermissions: true,
        stale: false,
        distanceFilter: 5, // meters
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
