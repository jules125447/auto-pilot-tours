/**
 * Ambient sound generator using Web Audio API.
 * Generates realistic ambient sounds in real-time without external files.
 */

export type AmbientSoundType = "river" | "rain" | "wind" | "birds" | "wolf" | "crickets" | "fire" | "thunder";

export const AMBIENT_SOUNDS: { type: AmbientSoundType; label: string; emoji: string }[] = [
  { type: "river", label: "Rivière", emoji: "🏞️" },
  { type: "rain", label: "Pluie", emoji: "🌧️" },
  { type: "wind", label: "Vent", emoji: "💨" },
  { type: "birds", label: "Oiseaux", emoji: "🐦" },
  { type: "wolf", label: "Loup", emoji: "🐺" },
  { type: "crickets", label: "Grillons", emoji: "🦗" },
  { type: "fire", label: "Feu de camp", emoji: "🔥" },
  { type: "thunder", label: "Orage", emoji: "⛈️" },
];

interface AmbientInstance {
  ctx: AudioContext;
  gainNode: GainNode;
  nodes: AudioNode[];
  intervalIds: number[];
}

function createWhiteNoise(ctx: AudioContext, bufferSize = 2): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createBrownNoise(ctx: AudioContext, bufferSize = 2): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createRiver(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const brown = createBrownNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  filter.Q.value = 0.5;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  brown.connect(filter);
  filter.connect(masterGain);
  brown.start();

  return { nodes: [brown, filter, lfo, lfoGain], intervalIds: [] };
}

function createRain(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const white = createWhiteNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 4000;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = "lowpass";
  filter2.frequency.value = 10000;

  white.connect(filter);
  filter.connect(filter2);
  filter2.connect(masterGain);
  white.start();

  return { nodes: [white, filter, filter2], intervalIds: [] };
}

function createWind(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const white = createWhiteNoise(ctx, 4);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 600;
  bandpass.Q.value = 0.8;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain);
  lfoGain.connect(bandpass.frequency);
  lfo.start();

  const volLfo = ctx.createOscillator();
  volLfo.frequency.value = 0.08;
  const volLfoGain = ctx.createGain();
  volLfoGain.gain.value = 0.3;
  volLfo.connect(volLfoGain);
  volLfoGain.connect(masterGain.gain);
  volLfo.start();

  white.connect(bandpass);
  bandpass.connect(masterGain);
  white.start();

  return { nodes: [white, bandpass, lfo, lfoGain, volLfo, volLfoGain], intervalIds: [] };
}

function createBirds(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const nodes: AudioNode[] = [];
  const intervalIds: number[] = [];

  const chirp = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 2000 + Math.random() * 4000;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * (0.7 + Math.random() * 0.6), now + 0.1);
    osc.type = "sine";
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + Math.random() * 0.1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  };

  // Random chirps
  const id = window.setInterval(() => {
    if (Math.random() > 0.4) chirp();
    if (Math.random() > 0.7) setTimeout(chirp, 50 + Math.random() * 100);
  }, 300 + Math.random() * 700) as unknown as number;
  intervalIds.push(id);

  return { nodes, intervalIds };
}

function createWolf(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const nodes: AudioNode[] = [];
  const intervalIds: number[] = [];

  const howl = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(400, now + 1.5);
    osc.frequency.linearRampToValueAtTime(350, now + 3);
    osc.frequency.linearRampToValueAtTime(200, now + 4);
    
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 2;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.5);
    gain.gain.setValueAtTime(0.12, now + 2.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 4.5);
  };

  howl();
  const id = window.setInterval(howl, 8000 + Math.random() * 12000) as unknown as number;
  intervalIds.push(id);

  return { nodes, intervalIds };
}

function createCrickets(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 5500;

  const modulator = ctx.createOscillator();
  modulator.frequency.value = 30;
  const modGain = ctx.createGain();
  modGain.gain.value = 0.5;
  modulator.connect(modGain);

  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  modGain.connect(gain.gain);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  modulator.start();

  return { nodes: [osc, modulator, modGain, gain], intervalIds: [] };
}

function createFire(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const white = createWhiteNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1000;
  bp.Q.value = 0.3;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.2;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();

  white.connect(bp);
  bp.connect(masterGain);
  white.start();

  return { nodes: [white, bp, lfo, lfoGain], intervalIds: [] };
}

function createThunder(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  // Background rain
  const rainResult = createRain(ctx, masterGain);
  const intervalIds: number[] = [...rainResult.intervalIds];

  // Periodic thunder rumbles
  const rumble = () => {
    const now = ctx.currentTime;
    const brown = createBrownNoise(ctx);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2 + Math.random() * 2);
    brown.connect(gain);
    gain.connect(masterGain);
    brown.start(now);
    brown.stop(now + 4);
  };

  const id = window.setInterval(rumble, 5000 + Math.random() * 10000) as unknown as number;
  intervalIds.push(id);

  return { nodes: [...rainResult.nodes], intervalIds };
}

const creators: Record<AmbientSoundType, (ctx: AudioContext, gain: GainNode) => { nodes: AudioNode[]; intervalIds: number[] }> = {
  river: createRiver,
  rain: createRain,
  wind: createWind,
  birds: createBirds,
  wolf: createWolf,
  crickets: createCrickets,
  fire: createFire,
  thunder: createThunder,
};

export function startAmbientSound(type: AmbientSoundType, volume = 0.7): AmbientInstance {
  const ctx = new AudioContext();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0; // Start silent for fade-in
  gainNode.connect(ctx.destination);

  const { nodes, intervalIds } = creators[type](ctx, gainNode);

  // Fade in
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);

  return { ctx, gainNode, nodes, intervalIds };
}

export function stopAmbientSound(instance: AmbientInstance): Promise<void> {
  return new Promise((resolve) => {
    const { ctx, gainNode, intervalIds } = instance;
    intervalIds.forEach((id) => clearInterval(id));

    // Fade out
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 2);

    setTimeout(() => {
      ctx.close().catch(() => {});
      resolve();
    }, 2200);
  });
}
