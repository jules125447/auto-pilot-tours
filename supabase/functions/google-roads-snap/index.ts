// Snap-to-road via Google Roads API, appelée directement avec une clé serveur
// dédiée (GOOGLE_MAPS_SERVER_KEY). Cette clé doit avoir Roads API activée
// dans Google Cloud Console et être restreinte par IP (ou non restreinte
// si appelée depuis edge functions Supabase).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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
  const url = `https://roads.googleapis.com/v1/snapToRoads?interpolate=${body.interpolate ? 'true' : 'false'}&path=${encodeURIComponent(pathParam)}&key=${GOOGLE_MAPS_SERVER_KEY}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Google Roads error: ${(e as Error).message}` }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
