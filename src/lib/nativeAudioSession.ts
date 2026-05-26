/**
 * Audio session config for iOS — allows Tilo's TTS + music to play
 * concurrently with Spotify / Apple Music instead of pausing them.
 *
 * On native, the @capacitor-community/text-to-speech plugin honors the
 * `category: "ambient"` option (set in nativeTts), which by default
 * mixes with other audio on iOS.
 *
 * For <audio> elements (music segments), we ensure iOS playsinline so
 * playback isn't interrupted by Safari's fullscreen takeover.
 */
export function applyAudioElementHints(audio: HTMLAudioElement): void {
  try {
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.preload = "auto";
    audio.crossOrigin = audio.crossOrigin ?? "anonymous";
  } catch {}
}
