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
