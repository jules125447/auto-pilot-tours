import { supabase } from "@/integrations/supabase/client";

const CONSENT_KEY = "analytics_consent";
const PING_BATCH_SIZE = 10;
const PING_INTERVAL_MS = 8000;

export function hasAnalyticsConsent() {
  return localStorage.getItem(CONSENT_KEY) === "true";
}
export function setAnalyticsConsent(v: boolean) {
  localStorage.setItem(CONSENT_KEY, v ? "true" : "false");
}

let currentSessionId: string | null = null;
let pingBuffer: { lat: number; lng: number; speed?: number; t: number }[] = [];
let flushTimer: number | null = null;
let circuitIdRef: string | null = null;
let startedAtMs = 0;
let totalDistanceM = 0;

export async function startSession(circuitId: string, userId: string | null) {
  if (!hasAnalyticsConsent()) return null;
  try {
    const { data, error } = await supabase
      .from("navigation_sessions")
      .insert({ circuit_id: circuitId, user_id: userId })
      .select("id")
      .single();
    if (error || !data) return null;
    currentSessionId = data.id;
    circuitIdRef = circuitId;
    startedAtMs = Date.now();
    totalDistanceM = 0;
    scheduleFlush();
    return currentSessionId;
  } catch {
    return null;
  }
}

export function trackGpsPing(lat: number, lng: number, speedKmh?: number) {
  if (!currentSessionId) return;
  pingBuffer.push({ lat, lng, speed: speedKmh, t: Date.now() });
  if (pingBuffer.length >= PING_BATCH_SIZE) flushPings();
}

export function addDistance(meters: number) {
  totalDistanceM += meters;
}

async function flushPings() {
  if (!currentSessionId || pingBuffer.length === 0) return;
  const batch = pingBuffer.splice(0);
  const sid = currentSessionId;
  const cid = circuitIdRef!;
  try {
    await supabase.from("gps_pings").insert(
      batch.map((p) => ({
        session_id: sid,
        circuit_id: cid,
        lat: p.lat,
        lng: p.lng,
        speed_kmh: p.speed ?? null,
        recorded_at: new Date(p.t).toISOString(),
      }))
    );
  } catch {
    /* swallow */
  }
}

function scheduleFlush() {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = window.setInterval(flushPings, PING_INTERVAL_MS);
}

export async function trackStopVisit(stopId: string, dwellSeconds: number) {
  if (!currentSessionId || !circuitIdRef) return;
  try {
    await supabase.from("stop_visits").insert({
      session_id: currentSessionId,
      circuit_id: circuitIdRef,
      stop_id: stopId,
      dwell_seconds: Math.round(dwellSeconds),
    });
  } catch {}
}

export async function trackAudioPlay(
  audioZoneId: string,
  playedSeconds: number,
  totalSeconds: number | null,
  completed: boolean
) {
  if (!currentSessionId || !circuitIdRef) return;
  try {
    await supabase.from("audio_plays").insert({
      session_id: currentSessionId,
      circuit_id: circuitIdRef,
      audio_zone_id: audioZoneId,
      played_seconds: Math.round(playedSeconds),
      total_seconds: totalSeconds ? Math.round(totalSeconds) : null,
      completed,
    });
  } catch {}
}

export async function endSession(completed: boolean) {
  if (!currentSessionId) return;
  await flushPings();
  const sid = currentSessionId;
  const durationS = Math.round((Date.now() - startedAtMs) / 1000);
  try {
    await supabase
      .from("navigation_sessions")
      .update({
        ended_at: new Date().toISOString(),
        completed,
        duration_s: durationS,
        distance_m: Math.round(totalDistanceM),
      })
      .eq("id", sid);
  } catch {}
  currentSessionId = null;
  circuitIdRef = null;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
