// Directions via Google Routes API (v2 computeRoutes), appelée directement
// avec la clé serveur GOOGLE_MAPS_SERVER_KEY (Routes API doit être activée
// dans Google Cloud Console).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  waypoints: Array<[number, number]>; // [lat, lng][], 2..25
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TWO_WHEELER';
  language?: string;
}

function isLatLng(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    p[0] >= -90 && p[0] <= 90 &&
    p[1] >= -180 && p[1] <= 180
  );
}

function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapManeuver(g?: string): { type: string; modifier?: string } {
  if (!g) return { type: 'straight' };
  const m = g.toLowerCase();
  if (m.startsWith('turn_')) return { type: 'turn', modifier: m.replace('turn_', '').replace(/_/g, ' ') };
  if (m.includes('uturn')) return { type: 'turn', modifier: 'uturn' };
  if (m.startsWith('roundabout') || m.startsWith('rotary')) return { type: 'roundabout turn' };
  if (m === 'merge') return { type: 'merge' };
  if (m.startsWith('fork_')) return { type: 'fork', modifier: m.replace('fork_', '') };
  if (m.startsWith('on_ramp')) return { type: 'on ramp', modifier: m.replace('on_ramp_', '') };
  return { type: m };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const GOOGLE_MAPS_SERVER_KEY = Deno.env.get('GOOGLE_MAPS_SERVER_KEY');
  if (!GOOGLE_MAPS_SERVER_KEY) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_SERVER_KEY missing' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(body.waypoints) || body.waypoints.length < 2 || body.waypoints.length > 25) {
    return new Response(JSON.stringify({ error: 'waypoints must be 2..25 [lat,lng] pairs' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!body.waypoints.every(isLatLng)) {
    return new Response(JSON.stringify({ error: 'waypoints contains invalid coordinates' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const travelMode = body.travelMode ?? 'DRIVE';
  const language = body.language ?? 'fr-FR';

  const origin = body.waypoints[0];
  const destination = body.waypoints[body.waypoints.length - 1];
  const intermediates = body.waypoints.slice(1, -1).map(([la, ln]) => ({
    location: { latLng: { latitude: la, longitude: ln } },
  }));

  const requestBody = {
    origin: { location: { latLng: { latitude: origin[0], longitude: origin[1] } } },
    destination: { location: { latLng: { latitude: destination[0], longitude: destination[1] } } },
    intermediates,
    travelMode,
    languageCode: language,
    regionCode: 'FR',
    polylineEncoding: 'ENCODED_POLYLINE',
  };

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_SERVER_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask':
          'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation,routes.legs.steps.endLocation',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `Routes API ${res.status}`, details: errText }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) {
      return new Response(JSON.stringify({ error: 'No route found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const coordinates = decodePolyline(route.polyline?.encodedPolyline ?? '');
    const distance = Number(route.distanceMeters ?? 0);
    const durationStr: string = route.duration ?? '0s';
    const duration = Number(durationStr.replace('s', '')) || 0;

    const steps: Array<{
      maneuver: { type: string; modifier?: string; location: [number, number] };
      distance: number;
      duration: number;
      name: string;
    }> = [];

    for (const leg of route.legs ?? []) {
      for (const s of leg.steps ?? []) {
        const m = mapManeuver(s.navigationInstruction?.maneuver);
        const sDur = Number((s.staticDuration ?? '0s').replace('s', '')) || 0;
        steps.push({
          maneuver: {
            type: m.type,
            modifier: m.modifier,
            location: [s.startLocation?.latLng?.longitude ?? 0, s.startLocation?.latLng?.latitude ?? 0],
          },
          distance: Number(s.distanceMeters ?? 0),
          duration: sDur,
          name: stripHtml(s.navigationInstruction?.instructions ?? ''),
        });
      }
    }

    return new Response(JSON.stringify({ coordinates, distance, duration, steps }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Google Routes error: ${(e as Error).message}` }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
