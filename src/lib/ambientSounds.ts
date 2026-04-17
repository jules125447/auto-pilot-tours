/**
 * Ambient sound generator using Web Audio API.
 * Generates realistic ambient sounds in real-time without external files.
 */

export type AmbientSoundType = "river" | "rain" | "wind" | "birds" | "wolf" | "crickets" | "fire" | "thunder";

export const AMBIENT_SOUNDS: { type: AmbientSoundType; label: string; emoji: string }[] = [
  { type: "river", label: "Rivière", emoji: "💧" },
  { type: "rain", label: "Pluie", emoji: "🌧️" },
  { type: "wind", label: "Vent", emoji: "💨" },
  { type: "birds", label: "Oiseaux", emoji: "🐦" },
  { type: "wolf", label: "Loup", emoji: "🐺" },
  { type: "crickets", label: "Grillons", emoji: "🦗" },
  { type: "fire", label: "Feu de camp", emoji: "🔥" },
  { type: "thunder", label: "Orage", emoji: "⛈️" },
];

export interface AmbientInstance {
  ctx: AudioContext;
  gainNode: GainNode;
  nodes: AudioNode[];
  intervalIds: number[];
  originalVolume: number;
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

function createPinkNoise(ctx: AudioContext, bufferSize = 2): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createRiver(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  // Layer 1: Deep water rumble (brown noise, low-passed)
  const brown = createBrownNoise(ctx, 4);
  const lpDeep = ctx.createBiquadFilter();
  lpDeep.type = "lowpass";
  lpDeep.frequency.value = 400;
  lpDeep.Q.value = 0.3;
  const deepGain = ctx.createGain();
  deepGain.gain.value = 0.6;
  brown.connect(lpDeep);
  lpDeep.connect(deepGain);
  deepGain.connect(masterGain);
  brown.start();

  // Layer 2: Flowing/bubbling mid-range (pink noise, bandpassed with slow modulation)
  const pink = createPinkNoise(ctx, 4);
  const bpFlow = ctx.createBiquadFilter();
  bpFlow.type = "bandpass";
  bpFlow.frequency.value = 1200;
  bpFlow.Q.value = 0.5;
  const lfo1 = ctx.createOscillator();
  lfo1.frequency.value = 0.18;
  const lfo1Gain = ctx.createGain();
  lfo1Gain.gain.value = 500;
  lfo1.connect(lfo1Gain);
  lfo1Gain.connect(bpFlow.frequency);
  lfo1.start();
  const flowGain = ctx.createGain();
  flowGain.gain.value = 0.35;
  pink.connect(bpFlow);
  bpFlow.connect(flowGain);
  flowGain.connect(masterGain);
  pink.start();

  // Layer 3: High sparkle/splash (white noise, high-passed, very quiet)
  const white = createWhiteNoise(ctx, 3);
  const hpSplash = ctx.createBiquadFilter();
  hpSplash.type = "highpass";
  hpSplash.frequency.value = 5000;
  const splashGain = ctx.createGain();
  splashGain.gain.value = 0.08;
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.07;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.04;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(splashGain.gain);
  lfo2.start();
  white.connect(hpSplash);
  hpSplash.connect(splashGain);
  splashGain.connect(masterGain);
  white.start();

  return { nodes: [brown, lpDeep, deepGain, pink, bpFlow, lfo1, lfo1Gain, flowGain, white, hpSplash, splashGain, lfo2, lfo2Gain], intervalIds: [] };
}

function createRain(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  // Layer 1: Steady rain body (pink noise, shaped)
  const pink = createPinkNoise(ctx, 4);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 6000;
  bp.Q.value = 0.3;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.5;
  pink.connect(bp);
  bp.connect(bodyGain);
  bodyGain.connect(masterGain);
  pink.start();

  // Layer 2: Low rumble (distant rain on surfaces)
  const brown = createBrownNoise(ctx, 3);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.2;
  brown.connect(lp);
  lp.connect(rumbleGain);
  rumbleGain.connect(masterGain);
  brown.start();

  // Layer 3: Random drop impacts
  const intervalIds: number[] = [];
  const drop = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(3000 + Math.random() * 5000, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.02, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.015 + Math.random() * 0.02);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  };
  const id = window.setInterval(() => {
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      setTimeout(drop, Math.random() * 80);
    }
  }, 100) as unknown as number;
  intervalIds.push(id);

  return { nodes: [pink, bp, bodyGain, brown, lp, rumbleGain], intervalIds };
}

function createWind(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  // Layer 1: Main wind body with slow frequency sweep
  const pink = createPinkNoise(ctx, 6);
  const bp1 = ctx.createBiquadFilter();
  bp1.type = "bandpass";
  bp1.frequency.value = 500;
  bp1.Q.value = 0.6;
  const lfo1 = ctx.createOscillator();
  lfo1.frequency.value = 0.06;
  const lfo1G = ctx.createGain();
  lfo1G.gain.value = 350;
  lfo1.connect(lfo1G);
  lfo1G.connect(bp1.frequency);
  lfo1.start();

  // Volume swell
  const volLfo = ctx.createOscillator();
  volLfo.frequency.value = 0.04;
  const volG = ctx.createGain();
  volG.gain.value = 0.35;
  volLfo.connect(volG);
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.5;
  volG.connect(bodyGain.gain);
  volLfo.start();

  pink.connect(bp1);
  bp1.connect(bodyGain);
  bodyGain.connect(masterGain);
  pink.start();

  // Layer 2: High whistle
  const white = createWhiteNoise(ctx, 4);
  const bp2 = ctx.createBiquadFilter();
  bp2.type = "bandpass";
  bp2.frequency.value = 2500;
  bp2.Q.value = 3;
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.1;
  const lfo2G = ctx.createGain();
  lfo2G.gain.value = 800;
  lfo2.connect(lfo2G);
  lfo2G.connect(bp2.frequency);
  lfo2.start();
  const whistleGain = ctx.createGain();
  whistleGain.gain.value = 0.08;
  white.connect(bp2);
  bp2.connect(whistleGain);
  whistleGain.connect(masterGain);
  white.start();

  return { nodes: [pink, bp1, lfo1, lfo1G, volLfo, volG, bodyGain, white, bp2, lfo2, lfo2G, whistleGain], intervalIds: [] };
}

function createBirds(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const nodes: AudioNode[] = [];
  const intervalIds: number[] = [];

  // Bird song patterns — each "species" has distinct frequency range and rhythm
  const birdSong = (baseFreq: number, pattern: number[], vibrato: number) => {
    const now = ctx.currentTime + Math.random() * 0.5;
    let t = now;
    pattern.forEach((noteDur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = baseFreq * (0.9 + Math.random() * 0.2);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * (1 + vibrato * (Math.random() - 0.5)), t + noteDur * 0.6);
      osc.frequency.linearRampToValueAtTime(freq * (0.95 + Math.random() * 0.1), t + noteDur);

      // Add harmonic for richness
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2.01, t);
      osc2.frequency.linearRampToValueAtTime(freq * 2.01 * (1 + vibrato * 0.3), t + noteDur);
      const harm = ctx.createGain();
      harm.gain.value = 0.03;
      osc2.connect(harm);
      harm.connect(masterGain);
      osc2.start(t);
      osc2.stop(t + noteDur + 0.02);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.04, t + 0.01);
      gain.gain.setValueAtTime(0.08, t + noteDur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + noteDur + 0.02);

      t += noteDur + 0.02 + Math.random() * 0.03;
    });
  };

  // Species 1: Robin-like (rapid descending trill)
  const robin = () => {
    const notes = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => 0.06 + Math.random() * 0.08);
    birdSong(3200 + Math.random() * 800, notes, 0.3);
  };

  // Species 2: Blackbird-like (long melodic phrases)
  const blackbird = () => {
    const notes = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => 0.15 + Math.random() * 0.2);
    birdSong(1800 + Math.random() * 600, notes, 0.15);
  };

  // Species 3: Warbler-like (fast repeated note)
  const warbler = () => {
    const count = 5 + Math.floor(Math.random() * 8);
    const notes = Array.from({ length: count }, () => 0.04 + Math.random() * 0.03);
    birdSong(4500 + Math.random() * 1000, notes, 0.5);
  };

  // Schedule birds with natural timing
  const id1 = window.setInterval(() => {
    if (Math.random() > 0.3) robin();
  }, 1500 + Math.random() * 2000) as unknown as number;

  const id2 = window.setInterval(() => {
    if (Math.random() > 0.4) blackbird();
  }, 3000 + Math.random() * 3000) as unknown as number;

  const id3 = window.setInterval(() => {
    if (Math.random() > 0.6) warbler();
  }, 4000 + Math.random() * 4000) as unknown as number;

  intervalIds.push(id1, id2, id3);

  return { nodes, intervalIds };
}

function createWolf(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const nodes: AudioNode[] = [];
  const intervalIds: number[] = [];

  const howl = () => {
    const now = ctx.currentTime;
    const duration = 3 + Math.random() * 2;

    // Fundamental
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    const f0 = 180 + Math.random() * 40;
    osc1.frequency.setValueAtTime(f0, now);
    osc1.frequency.linearRampToValueAtTime(f0 * 2.2, now + duration * 0.35);
    osc1.frequency.setValueAtTime(f0 * 2.2, now + duration * 0.55);
    osc1.frequency.linearRampToValueAtTime(f0 * 1.8, now + duration * 0.75);
    osc1.frequency.linearRampToValueAtTime(f0 * 1.2, now + duration);

    // Vibrato
    const vib = ctx.createOscillator();
    vib.frequency.value = 4 + Math.random() * 2;
    const vibG = ctx.createGain();
    vibG.gain.value = 8;
    vib.connect(vibG);
    vibG.connect(osc1.frequency);
    vib.start(now);
    vib.stop(now + duration + 0.5);

    // Filter for realism
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 3;

    // Breath noise layer
    const noise = createBrownNoise(ctx);
    const nBp = ctx.createBiquadFilter();
    nBp.type = "bandpass";
    nBp.frequency.value = 400;
    nBp.Q.value = 1;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0, now);
    nGain.gain.linearRampToValueAtTime(0.04, now + duration * 0.3);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(nBp);
    nBp.connect(nGain);
    nGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + duration + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + duration * 0.15);
    gain.gain.setValueAtTime(0.1, now + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + duration + 0.5);
  };

  howl();
  const id = window.setInterval(howl, 10000 + Math.random() * 15000) as unknown as number;
  intervalIds.push(id);

  return { nodes, intervalIds };
}

function createCrickets(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  const nodes: AudioNode[] = [];
  const intervalIds: number[] = [];

  // Create multiple cricket "voices" with slightly different pitches and rhythms
  const createCricketVoice = (freq: number, onMs: number, offMs: number, vol: number) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const modOsc = ctx.createOscillator();
    modOsc.frequency.value = freq * 0.99; // Slight detuning creates chirp texture
    modOsc.type = "sine";

    const modGain = ctx.createGain();
    modGain.gain.value = vol;
    modOsc.connect(modGain);

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(gain);
    modGain.connect(gain);
    gain.connect(masterGain);
    osc.start();
    modOsc.start();
    nodes.push(osc, modOsc, modGain, gain);

    // Rhythmic chirping
    let on = true;
    const id = window.setInterval(() => {
      const now = ctx.currentTime;
      if (on) {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.005);
      } else {
        gain.gain.setValueAtTime(vol, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.01);
      }
      on = !on;
    }, on ? onMs : offMs) as unknown as number;
    intervalIds.push(id);
  };

  createCricketVoice(5800, 60, 80, 0.04);
  createCricketVoice(6200, 55, 120, 0.03);
  createCricketVoice(5400, 70, 150, 0.025);

  return { nodes, intervalIds };
}

function createFire(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  // Layer 1: Base crackle (filtered noise)
  const pink = createPinkNoise(ctx, 4);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  bp.Q.value = 0.4;
  const baseGain = ctx.createGain();
  baseGain.gain.value = 0.35;
  pink.connect(bp);
  bp.connect(baseGain);
  baseGain.connect(masterGain);
  pink.start();

  // Layer 2: Low roar
  const brown = createBrownNoise(ctx, 3);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 300;
  const roarGain = ctx.createGain();
  roarGain.gain.value = 0.25;
  const roarLfo = ctx.createOscillator();
  roarLfo.frequency.value = 0.5;
  const roarLfoG = ctx.createGain();
  roarLfoG.gain.value = 0.1;
  roarLfo.connect(roarLfoG);
  roarLfoG.connect(roarGain.gain);
  roarLfo.start();
  brown.connect(lp);
  lp.connect(roarGain);
  roarGain.connect(masterGain);
  brown.start();

  // Layer 3: Random pops and crackles
  const intervalIds: number[] = [];
  const pop = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800 + Math.random() * 2000, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.1, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.02 + Math.random() * 0.04);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  };

  const id = window.setInterval(() => {
    if (Math.random() > 0.3) pop();
    if (Math.random() > 0.6) setTimeout(pop, 20 + Math.random() * 50);
  }, 150 + Math.random() * 200) as unknown as number;
  intervalIds.push(id);

  return { nodes: [pink, bp, baseGain, brown, lp, roarGain, roarLfo, roarLfoG], intervalIds };
}

function createThunder(ctx: AudioContext, masterGain: GainNode): { nodes: AudioNode[]; intervalIds: number[] } {
  // Background rain
  const rainResult = createRain(ctx, masterGain);
  const intervalIds: number[] = [...rainResult.intervalIds];

  // Thunder rumbles with realistic low-frequency roll
  const rumble = () => {
    const now = ctx.currentTime;
    const dur = 2 + Math.random() * 3;

    // Initial crack
    const white = createWhiteNoise(ctx);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0, now);
    crackGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    white.connect(crackGain);
    crackGain.connect(masterGain);
    white.start(now);
    white.stop(now + 0.2);

    // Rolling rumble
    const brown = createBrownNoise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, now + 0.05);
    rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.2);
    // Multiple peaks to simulate rolling
    rumbleGain.gain.linearRampToValueAtTime(0.3, now + dur * 0.3);
    rumbleGain.gain.linearRampToValueAtTime(0.45, now + dur * 0.5);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    brown.connect(lp);
    lp.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    brown.start(now);
    brown.stop(now + dur + 0.5);
  };

  const id = window.setInterval(rumble, 6000 + Math.random() * 12000) as unknown as number;
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

  return { ctx, gainNode, nodes, intervalIds, originalVolume: volume };
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
