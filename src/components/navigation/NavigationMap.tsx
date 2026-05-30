/**
 * Dispatcher: chooses the best map renderer based on platform and
 * Google Maps API key availability.
 *
 * - Web (preview + PWA) with VITE_GOOGLE_MAPS_API_KEY → Google Maps JS
 * - Native (iOS/Android APK)                          → MapLibre fallback
 *   (Google Maps JS does not load reliably inside the Capacitor Android
 *   WebView — referrer restrictions + WebView quirks cause a blank map.)
 * - No key                                            → MapLibre + OpenFreeMap
 */
import NavigationMapGoogle from "./NavigationMapGoogle";
import NavigationMapMapLibre from "./NavigationMapMapLibre";
import { HAS_GOOGLE_MAPS_KEY, IS_NATIVE } from "@/lib/maps/platform";

type AnyProps = Parameters<typeof NavigationMapGoogle>[0];

const NavigationMap = (props: AnyProps) => {
  if (!IS_NATIVE && HAS_GOOGLE_MAPS_KEY) return <NavigationMapGoogle {...props} />;
  return <NavigationMapMapLibre {...(props as Parameters<typeof NavigationMapMapLibre>[0])} />;
};

export default NavigationMap;
