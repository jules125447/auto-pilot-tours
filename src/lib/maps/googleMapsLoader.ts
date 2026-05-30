import { GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS_KEY } from "./platform";

let loaderPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __tiloGmapsCallback?: () => void;
  }
}

/**
 * Async loader for the Google Maps JavaScript API.
 * Returns the global `google` namespace once ready.
 * Uses `loading=async` + global callback as recommended by Google.
 */
export function loadGoogleMapsJs(
  libraries: string[] = ["geometry"]
): Promise<typeof google> {
  if (!HAS_GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Not in browser"));
  }
  if (typeof window.google !== "undefined" && window.google.maps) {
    return Promise.resolve(window.google);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const cbName = "__tiloGmapsCallback";
    window[cbName] = () => {
      if (window.google?.maps) resolve(window.google);
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
