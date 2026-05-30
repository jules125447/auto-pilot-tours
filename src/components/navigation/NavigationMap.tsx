/**
 * Dispatcher: chooses the best map renderer based on platform and
 * Google Maps API key availability.
 *
 * - Web with VITE_GOOGLE_MAPS_API_KEY  → Google Maps JS
 * - Native (iOS/Android)               → Google Maps JS for now (the
 *   @capacitor/google-maps native plugin requires per-platform setup that
 *   only works in a custom build; on web preview and inside the Capacitor
 *   WebView, the JS API works fine and is consistent with the web build).
 * - No key                             → MapLibre + OpenFreeMap fallback
 */
import NavigationMapGoogle from "./NavigationMapGoogle";
import NavigationMapMapLibre from "./NavigationMapMapLibre";
import { HAS_GOOGLE_MAPS_KEY } from "@/lib/maps/platform";

type AnyProps = Parameters<typeof NavigationMapGoogle>[0];

const NavigationMap = (props: AnyProps) => {
  if (HAS_GOOGLE_MAPS_KEY) return <NavigationMapGoogle {...props} />;
  return <NavigationMapMapLibre {...(props as Parameters<typeof NavigationMapMapLibre>[0])} />;
};

export default NavigationMap;
