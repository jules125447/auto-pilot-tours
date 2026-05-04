import { useRef, useCallback } from "react";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";

/**
 * Waze-style voice guidance.
 *
 * Tiered announcements, like Waze:
 *  - far prep (~800 m): "Dans 800 mètres, tournez à gauche"
 *  - mid (~400 m):       "Dans 400 mètres, tournez à gauche"
 *  - near (~200 m):      "Dans 200 mètres, à gauche"
 *  - imminent (~80 m):   "À gauche"
 *  - now (~25 m):        "Tournez maintenant à gauche"
 *
 * Each (turnId, tier) is announced at most once.
 */

export type AnnouncementTier = "far" | "mid" | "near" | "imminent" | "now";

const TIERS: { tier: AnnouncementTier; min: number; max: number }[] = [
  { tier: "far", min: 800, max: 1100 },
  { tier: "mid", min: 400, max: 600 },
  { tier: "near", min: 200, max: 320 },
  { tier: "imminent", min: 80, max: 150 },
  { tier: "now", min: 0, max: 50 },
];

function shortDir(dir: TurnDirection): string {
  switch (dir) {
    case "left":
      return "à gauche";
    case "right":
      return "à droite";
    case "u-turn":
      return "demi-tour";
    case "arrive":
      return "à destination";
    default:
      return "tout droit";
  }
}

function formatDistanceFR(distMeters: number): string {
  if (distMeters >= 1000) {
    const km = distMeters / 1000;
    return `${km.toFixed(km >= 10 ? 0 : 1)} kilomètres`;
  }
  // round to nearest 50m for natural phrasing
  const rounded = Math.round(distMeters / 50) * 50;
  return `${Math.max(50, rounded)} mètres`;
}

function phraseFor(tier: AnnouncementTier, dir: TurnDirection, distMeters: number): string {
  if (dir === "arrive") {
    if (tier === "now" || tier === "imminent") return "Vous êtes arrivé à destination";
    return `Dans ${formatDistanceFR(distMeters)}, vous serez arrivé`;
  }
  switch (tier) {
    case "far":
    case "mid":
    case "near":
      return `Dans ${formatDistanceFR(distMeters)}, ${
        dir === "u-turn" ? "faites demi-tour" : `tournez ${shortDir(dir)}`
      }`;
    case "imminent":
      return dir === "u-turn" ? "Faites demi-tour" : `Tournez ${shortDir(dir)}`;
    case "now":
      return dir === "u-turn"
        ? "Demi-tour maintenant"
        : `Maintenant, ${shortDir(dir)}`;
  }
}

interface VoiceGuidanceOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export function useVoiceGuidance(options?: VoiceGuidanceOptions) {
  // key = `${turnSignature}|${tier}` — never replay the same announcement
  const announced = useRef<Set<string>>(new Set());
  const speaking = useRef(false);
  const queue = useRef<string[]>([]);
  const lastTurnSig = useRef<string>("");

  const flush = useCallback(() => {
    if (speaking.current) return;
    const text = queue.current.shift();
    if (!text) return;

    if (!("speechSynthesis" in window)) return;

    speaking.current = true;
    options?.onSpeakStart?.();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = speechSynthesis.getVoices();
    const frVoice =
      voices.find((v) => v.lang === "fr-FR") ||
      voices.find((v) => v.lang.startsWith("fr"));
    if (frVoice) utterance.voice = frVoice;

    const finish = () => {
      options?.onSpeakEnd?.();
      speaking.current = false;
      // small gap then flush next
      setTimeout(flush, 250);
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch {
      finish();
    }
  }, [options]);

  const speak = useCallback(
    (text: string) => {
      queue.current.push(text);
      flush();
    },
    [flush]
  );

  const announceDirection = useCallback(
    (dir: TurnDirection, distMeters: number, turnSignature?: string) => {
      if (dir === "straight") return;

      // Reset tiers if we moved on to a new turn
      const sig = turnSignature ?? `${dir}@${Math.round(distMeters / 25) * 25}`;
      if (sig !== lastTurnSig.current) {
        // when the turn signature changes, we can clear stale tiers tied to the old turn
        // (we keep ours scoped to current sig only)
        lastTurnSig.current = sig;
      }

      const tierMatch = TIERS.find(
        (t) => distMeters >= t.min && distMeters <= t.max
      );
      if (!tierMatch) return;

      const key = `${sig}|${tierMatch.tier}`;
      if (announced.current.has(key)) return;
      announced.current.add(key);

      speak(phraseFor(tierMatch.tier, dir, distMeters));
    },
    [speak]
  );

  const announceArrival = useCallback(
    (stopTitle: string) => {
      const key = `arrive|${stopTitle}`;
      if (announced.current.has(key)) return;
      announced.current.add(key);
      speak(`Vous êtes arrivé à ${stopTitle}`);
    },
    [speak]
  );

  const announceAudioZone = useCallback(
    (text: string) => {
      speak(text);
    },
    [speak]
  );

  const resetAnnouncements = useCallback(() => {
    announced.current.clear();
    lastTurnSig.current = "";
  }, []);

  return {
    speak,
    announceDirection,
    announceArrival,
    announceAudioZone,
    resetAnnouncements,
  };
}
