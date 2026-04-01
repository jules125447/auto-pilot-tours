import { useRef, useCallback } from "react";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";

function directionText(dir: TurnDirection, distMeters: number): string {
  const dist =
    distMeters >= 1000
      ? `${(distMeters / 1000).toFixed(1)} kilomètres`
      : `${Math.round(distMeters / 10) * 10} mètres`;

  switch (dir) {
    case "left":
      return `Dans ${dist}, tournez à gauche`;
    case "right":
      return `Dans ${dist}, tournez à droite`;
    case "u-turn":
      return `Dans ${dist}, faites demi-tour`;
    case "arrive":
      return `Vous êtes arrivé à destination`;
    default:
      return `Continuez tout droit pendant ${dist}`;
  }
}

interface VoiceGuidanceOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export function useVoiceGuidance(options?: VoiceGuidanceOptions) {
  const lastSpoken = useRef<string>("");
  const cooldown = useRef(false);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    if (text === lastSpoken.current || cooldown.current) return;

    lastSpoken.current = text;
    cooldown.current = true;

    options?.onSpeakStart?.();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a French voice
    const voices = speechSynthesis.getVoices();
    const frVoice = voices.find((v) => v.lang.startsWith("fr"));
    if (frVoice) utterance.voice = frVoice;

    utterance.onend = () => {
      options?.onSpeakEnd?.();
      setTimeout(() => {
        cooldown.current = false;
      }, 3000);
    };

    utterance.onerror = () => {
      options?.onSpeakEnd?.();
      setTimeout(() => {
        cooldown.current = false;
      }, 3000);
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, [options]);

  const announceDirection = useCallback(
    (dir: TurnDirection, distMeters: number) => {
      const rounded = Math.round(distMeters);
      if (rounded <= 30) {
        speak(directionText(dir, distMeters));
      } else if (rounded <= 100 && rounded > 80) {
        speak(directionText(dir, distMeters));
      } else if (rounded <= 300 && rounded > 250) {
        speak(directionText(dir, distMeters));
      }
    },
    [speak]
  );

  const announceArrival = useCallback(
    (stopTitle: string) => {
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

  return { speak, announceDirection, announceArrival, announceAudioZone };
}
