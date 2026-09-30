// WebAudio police scanner sound synthesizer ported directly from distress-globe
// Synthesised entirely in browser — no audio samples, tone keys off incident severity

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastBlipAt = 0;

const MIN_GAP_MS = 260;

export function isAudioEnabled(): boolean {
  return !!ctx && ctx.state === "running";
}

export async function enableAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return false;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") await ctx.resume();
  return ctx.state === "running";
}

export function disableAudio(): void {
  if (ctx && ctx.state === "running") ctx.suspend();
}

function tone({
  freq,
  start,
  dur,
  type = "sine",
  peak = 1,
  sweepTo = null,
}: {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  peak?: number;
  sweepTo?: number | null;
}) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/**
 * Trigger scanner blip.
 * Routine calls (sev 0-1) get a subtle tick.
 * Violent felonies (sev 3) get a distinct two-tone alert.
 */
export function playScannerBlip(sev = 0): void {
  if (!isAudioEnabled() || !ctx) return;
  const now = Date.now();
  if (now - lastBlipAt < MIN_GAP_MS && sev < 3) return;
  lastBlipAt = now;

  const t = ctx.currentTime + 0.01;

  if (sev >= 3) {
    tone({ freq: 880, start: t, dur: 0.16, type: "square", peak: 0.5 });
    tone({ freq: 660, start: t + 0.17, dur: 0.26, type: "square", peak: 0.5 });
    return;
  }
  if (sev === 2) {
    tone({ freq: 620, start: t, dur: 0.16, type: "triangle", peak: 0.4, sweepTo: 480 });
    return;
  }
  if (sev === 1) {
    tone({ freq: 520, start: t, dur: 0.1, type: "triangle", peak: 0.28 });
    return;
  }
  tone({ freq: 760, start: t, dur: 0.06, type: "sine", peak: 0.16 });
}

// Aliases matching distress-globe
export const blip = playScannerBlip;
export const enable = enableAudio;
export const disable = disableAudio;
export const isEnabled = isAudioEnabled;

/**
 * Mechanical rotary knob click for CRT TV / Radio tuner
 */
export function playTunerClick(): void {
  if (!isAudioEnabled() || !ctx) return;
  const t = ctx.currentTime;
  tone({ freq: 1400, start: t, dur: 0.02, type: "square", peak: 0.2, sweepTo: 300 });
}

/**
 * Analog white noise static burst for channel switching / radio scanning
 */
export function playStaticBurst(durationMs = 240): void {
  if (!isAudioEnabled() || !ctx || !master) return;
  try {
    const durSec = Math.max(0.08, durationMs / 1000);
    const bufferSize = Math.floor(ctx.sampleRate * durSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    noise.start(t);
    noise.stop(t + durSec + 0.02);
  } catch {
    /* ignore fallback */
  }
}

/**
 * Lock tone when tuner successfully acquires a signal
 */
export function playStationLockTone(): void {
  if (!isAudioEnabled() || !ctx) return;
  const t = ctx.currentTime;
  tone({ freq: 660, start: t, dur: 0.06, type: "sine", peak: 0.15 });
  tone({ freq: 990, start: t + 0.06, dur: 0.1, type: "sine", peak: 0.18 });
}
