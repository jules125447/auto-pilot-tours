/**
 * Text-to-speech that uses the native Capacitor plugin on mobile
 * (smoother, no AudioContext gating) and falls back to Web Speech
 * Synthesis on browsers.
 */
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const isNative = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

export interface SpeakOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: () => void;
}

export async function speakUnified(opts: SpeakOptions): Promise<void> {
  const { text, lang = "fr-FR", rate = 1.05, pitch = 1.0, volume = 1.0, onEnd, onError } = opts;

  if (isNative) {
    try {
      await TextToSpeech.stop().catch(() => {});
      await TextToSpeech.speak({
        text,
        lang,
        rate,
        pitch,
        volume,
        category: "playback",
      });
      onEnd?.();
    } catch (e) {
      onError?.();
    }
    return;
  }

  if (!("speechSynthesis" in window)) {
    onError?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  const voices = speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
  if (frVoice) utterance.voice = frVoice;

  let done = false;
  const finish = (err?: boolean) => {
    if (done) return;
    done = true;
    if (err) onError?.();
    else onEnd?.();
  };
  utterance.onend = () => finish(false);
  utterance.onerror = () => finish(true);

  // Safety net for iOS Safari where onend can be unreliable
  const estimated = Math.max(2500, (text.length / 14) * 1000 + 1500);
  setTimeout(() => finish(false), estimated);

  try {
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  } catch {
    finish(true);
  }
}

export async function stopSpeakingUnified(): Promise<void> {
  if (isNative) {
    try { await TextToSpeech.stop(); } catch {}
    return;
  }
  try { speechSynthesis.cancel(); } catch {}
}
