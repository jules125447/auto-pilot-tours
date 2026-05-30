import { supabase } from "@/integrations/supabase/client";
import type { RouteResult } from "@/lib/routing";

/**
 * Google Routes API (v2) caller, routed through our Supabase edge function
 * which proxies via the Lovable Google Maps Platform connector gateway.
 * The edge function already normalizes the response into RouteResult shape.
 */
export async function fetchGoogleDirections(
  waypoints: [number, number][],
  _options?: { signal?: AbortSignal }
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  try {
    const { data, error } = await supabase.functions.invoke("google-directions", {
      body: { waypoints, travelMode: "DRIVE", language: "fr-FR" },
    });
    if (error || !data || data.error) return null;
    if (!Array.isArray(data.coordinates) || data.coordinates.length === 0) return null;
    return data as RouteResult;
  } catch {
    return null;
  }
}
