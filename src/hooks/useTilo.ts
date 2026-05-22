import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TiloEvent =
  | { type: "welcome"; userName: string; circuitName: string; circuitDescription?: string }
  | { type: "circuit_start"; circuitName: string }
  | { type: "speed_warning"; speed: number }
  | { type: "poi_arrival"; poiName: string; poiDescription?: string }
  | { type: "poi_commentary"; poiName: string; poiDescription?: string }
  | { type: "joke" }
  | { type: "idle_banter" }
  | { type: "trip_end"; circuitName: string };

interface UseTiloOptions {
  /** Speech function (re-uses the existing voice guidance pipeline so audio ducking works) */
  speak: (text: string) => void;
  /** Whether the navigation context is active (audio unlocked, on circuit page) */
  active: boolean;
  /** External "is currently speaking" signal coming from the TTS engine */
  isSpeakingExternal: boolean;
  /** Personality for this circuit — influences the AI prompt tone */
  personality?: {
    dominant_expression?: string;
    energy_level?: number;
    style?: string;
  };
}

/**
 * Queues contextual Tilo interventions, fetches a French line from the
 * `tilo-speak` edge function and triggers the visible avatar + voice.
 */
export function useTilo({ speak, active, isSpeakingExternal }: UseTiloOptions) {
  const [visible, setVisible] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [lookDirection, setLookDirection] = useState<-1 | 0 | 1>(0);

  const queueRef = useRef<TiloEvent[]>([]);
  const processingRef = useRef(false);
  const lastEventAtRef = useRef<Record<string, number>>({});
  const lastAnySpeakAtRef = useRef<number>(0);

  const cooldownMs: Record<TiloEvent["type"], number> = {
    welcome: 0,
    circuit_start: 0,
    speed_warning: 90_000,
    poi_arrival: 15_000,
    poi_commentary: 30_000,
    joke: 240_000,
    idle_banter: 180_000,
    trip_end: 0,
  };

  const fetchLine = useCallback(async (event: TiloEvent): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("tilo-speak", {
        body: {
          eventType: event.type,
          context: { ...event },
        },
      });
      if (error || !data?.text) return "";
      return data.text as string;
    } catch {
      return "";
    }
  }, []);

  // Reflect external speech state (for mouth animation)
  useEffect(() => {
    setSpeaking(isSpeakingExternal);
  }, [isSpeakingExternal]);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!active || !visible) return;
    const event = queueRef.current.shift();
    if (!event) return;

    processingRef.current = true;
    const text = await fetchLine(event);
    if (text) {
      setMessage(text);
      // hide bubble after a while
      window.setTimeout(() => {
        setMessage((current) => (current === text ? null : current));
      }, Math.max(5000, text.length * 80));
      speak(text);
      lastAnySpeakAtRef.current = Date.now();
    }
    processingRef.current = false;

    // Continue queue after a small gap
    window.setTimeout(() => processQueue(), 1200);
  }, [active, visible, fetchLine, speak]);

  const enqueue = useCallback(
    (event: TiloEvent, opts?: { priority?: boolean }) => {
      const now = Date.now();
      const last = lastEventAtRef.current[event.type] ?? 0;
      const cd = cooldownMs[event.type];
      if (cd > 0 && now - last < cd) return;
      lastEventAtRef.current[event.type] = now;

      if (opts?.priority) queueRef.current.unshift(event);
      else queueRef.current.push(event);

      processQueue();
    },
    [processQueue]
  );

  // Hide Tilo if user manually closes — won't auto-reopen this session
  const setHidden = useCallback(() => {
    setVisible(false);
    setMessage(null);
    queueRef.current = [];
  }, []);

  const setShown = useCallback(() => {
    setVisible(true);
  }, []);

  return {
    visible,
    speaking,
    message,
    lookDirection,
    setLookDirection,
    enqueue,
    hide: setHidden,
    show: setShown,
    lastSpokeAt: () => lastAnySpeakAtRef.current,
  };
}
