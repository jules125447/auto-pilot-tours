import { useRef, useCallback } from "react";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";
import { speakUnified, stopSpeakingUnified } from "@/lib/nativeTts";

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

// Reduced to 3 tiers to avoid spammy / overlapping announcements.
// Each turn now triggers at most: a single prep ~350 m, an imminent ~80 m, and "now" at the apex.
const TIERS: { tier: AnnouncementTier; min: number; max: number }[] = [
  { tier: "mid", min: 250, max: 450 },
  { tier: "imminent", min: 70, max: 130 },
  { tier: "now", min: 0, max: 35 },
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
    case "roundabout":
      return "au rond-point";
    default:
      return "tout droit";
  }
}

function ordinalFR(n: number): string {
  if (n === 1) return "première";
  if (n === 2) return "deuxième";
  if (n === 3) return "troisième";
  if (n === 4) return "quatrième";
  if (n === 5) return "cinquième";
  return `${n}ème`;
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

function phraseFor(tier: AnnouncementTier, dir: TurnDirection, distMeters: number, roundaboutExit?: number): string {
  if (dir === "arrive") {
    if (tier === "now" || tier === "imminent") return "Vous êtes arrivé à destination";
    return `Dans ${formatDistanceFR(distMeters)}, vous serez arrivé`;
  }
  
  if (dir === "roundabout" && roundaboutExit) {
    const exitPhrase = `au rond-point, prenez la ${ordinalFR(roundaboutExit)} sortie`;
    switch (tier) {
      case "far":
      case "mid":
      case "near":
        return `Dans ${formatDistanceFR(distMeters)}, ${exitPhrase}`;
      case "imminent":
        return `Rond-point, ${ordinalFR(roundaboutExit)} sortie`;
      case "now":
        return `Maintenant, ${ordinalFR(roundaboutExit)} sortie au rond-point`;
    }
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

    speaking.current = true;
    options?.onSpeakStart?.();

    const finish = () => {
      options?.onSpeakEnd?.();
      speaking.current = false;
      setTimeout(flush, 250);
    };

    stopSpeakingUnified().finally(() => {
      speakUnified({
        text,
        lang: "fr-FR",
        rate: 1.05,
        pitch: 1.0,
        volume: 1.0,
        onEnd: finish,
        onError: finish,
      });
    });
  }, [options]);

  const speak = useCallback(
    (text: string) => {
      queue.current.push(text);
      flush();
    },
    [flush]
  );

  const announceDirection = useCallback(
    (dir: TurnDirection, distMeters: number, turnSignature?: string, roundaboutExit?: number) => {
      if (dir === "straight") return;

      // Reset tiers if we moved on to a new turn
      const sig = turnSignature ?? `${dir}@${Math.round(distMeters / 25) * 25}`;
      if (sig !== lastTurnSig.current) {
        lastTurnSig.current = sig;
      }

      const tierMatch = TIERS.find(
        (t) => distMeters >= t.min && distMeters <= t.max
      );
      if (!tierMatch) return;

      const key = `${sig}|${tierMatch.tier}`;
      if (announced.current.has(key)) return;
      announced.current.add(key);

      speak(phraseFor(tierMatch.tier, dir, distMeters, roundaboutExit));
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
