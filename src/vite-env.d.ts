/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY?: string;
  readonly VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID?: string;
}
