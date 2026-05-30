import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_TRACKING_ID, HAS_GOOGLE_MAPS_KEY } from "./platform";

// Use a permissive type to avoid coupling the loader to the global namespace
// types — google.maps types are loaded via tsconfig but at runtime we just
// resolve with whatever the script attaches to window.google.
type GoogleNs = any;

let loaderPromise: Promise<GoogleNs> | null = null;

/**
 * Async loader for the Google Maps JavaScript API.
 * Returns the global `google` namespace once ready.
 * Uses `loading=async` + global callback as recommended by Google.
 */
export function loadGoogleMapsJs(
  libraries: string[] = ["geometry"]
): Promise<GoogleNs> {
  if (!HAS_GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Not in browser"));
  }
  const w = window as any;
  if (w.google?.maps) {
    return Promise.resolve(w.google);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const cbName = "__tiloGmapsCallback";
    w[cbName] = () => {
      if (w.google?.maps) resolve(w.google);
      else reject(new Error("Google Maps loaded but namespace missing"));
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      loading: "async",
      callback: cbName,
      libraries: libraries.join(","),
      language: "fr",
      region: "FR",
      v: "weekly",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
