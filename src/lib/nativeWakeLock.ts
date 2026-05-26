/**
 * Keeps the screen awake during navigation, like Waze / Google Maps.
 *
 * - On native (Capacitor): uses @capacitor-community/keep-awake (system-level)
 * - On web: uses the standard Wake Lock API (Chrome/Edge/Safari 16.4+)
 *
 * Wake locks are released automatically when the page is hidden; we
 * re-acquire on visibilitychange while `active` is true.
 */
import { Capacitor } from "@capacitor/core";

let isActive = false;
let webLock: any = null;

const isNative = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

async function nativeKeepAwakeOn() {
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.keepAwake();
  } catch {}
}

async function nativeKeepAwakeOff() {
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.allowSleep();
  } catch {}
}

async function webAcquire() {
  try {
    // @ts-ignore — wakeLock not in older TS lib
    if (!navigator.wakeLock) return;
    // @ts-ignore
    webLock = await navigator.wakeLock.request("screen");
    webLock?.addEventListener?.("release", () => {
      webLock = null;
    });
  } catch {
    webLock = null;
  }
}

async function webRelease() {
  try { await webLock?.release?.(); } catch {}
  webLock = null;
}

function onVisibility() {
  if (document.visibilityState === "visible" && isActive && !isNative && !webLock) {
    webAcquire();
  }
}

export async function activateWakeLock(): Promise<void> {
  if (isActive) return;
  isActive = true;
  if (isNative) {
    await nativeKeepAwakeOn();
  } else {
    await webAcquire();
    document.addEventListener("visibilitychange", onVisibility);
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!isActive) return;
  isActive = false;
  if (isNative) {
    await nativeKeepAwakeOff();
  } else {
    document.removeEventListener("visibilitychange", onVisibility);
    await webRelease();
  }
}
