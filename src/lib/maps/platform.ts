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

// Browser-restricted key provided by the Lovable Google Maps Platform connector.
// Only authorized for Maps JavaScript API + Places API (New). Roads/Directions
// calls will REQUEST_DENIED with this key and fall back to OSRM/local matcher.
export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ||
  "";

export const GOOGLE_MAPS_TRACKING_ID =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined)?.trim() || "";

export const HAS_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.length > 0;
