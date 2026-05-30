// Snap-to-road via Google Roads API, routed through the Lovable
// Google Maps Platform connector gateway. Browser keys are not authorized
// for the Roads API, so we proxy server-side.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

interface Body {
  path: Array<[number, number]>; // [lat, lng][]
  interpolate?: boolean;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!GOOGLE_MAPS_API_KEY) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY (connector) missing' }), {
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

  if (!Array.isArray(body.path) || body.path.length === 0 || body.path.length > 100) {
    return new Response(JSON.stringify({ error: 'path must be 1..100 [lat,lng] pairs' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!body.path.every(isLatLng)) {
    return new Response(JSON.stringify({ error: 'path contains invalid coordinates' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pathParam = body.path.map(([la, ln]) => `${la},${ln}`).join('|');
  const url = `${GATEWAY_URL}/roads/v1/snapToRoads?interpolate=${body.interpolate ? 'true' : 'false'}&path=${encodeURIComponent(pathParam)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
      },
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Gateway error: ${(e as Error).message}` }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
