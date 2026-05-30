import { Capacitor } from "@capacitor/core";

export type RuntimePlatform = "web" | "ios" | "android";

export function detectPlatform(): RuntimePlatform {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* noop */
  }
  return "web";
}

export const IS_NATIVE = detectPlatform() !== "web";

export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";

export const HAS_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.length > 0;
