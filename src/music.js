// Loop de cumbia sintetizado con Web Audio: bajo, güiro, campana y melodía.
import { getContext, getBus, isMuted } from './audio.js';

const BPM = 96;
const STEPS_PER_BEAT = 4; // semicorcheas
const BARS = 8;
const TOTAL_STEPS = BARS * 4 * STEPS_PER_BEAT;

// progresión: Am Am Dm Dm E7 E7 Am Am (raíz MIDI por compás)
const ROOTS = [57, 57, 50, 50, 52, 52, 57, 57];
// melodía por corcheas (2 pasos cada una), 8 compases = 64 corcheas; 0 = silencio
const MELODY = [
  69, 0, 72, 0, 71, 69, 0, 0, 67, 0, 69, 0, 71, 0, 0, 0, 74, 0, 72, 0, 71, 69, 0, 0, 65, 0, 67, 0, 69, 0, 0, 0, 64, 0, 68, 0, 71, 0, 72, 0, 71, 0, 68, 0, 64, 0,
  0, 0, 69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 69, 0, 69, 0, 0, 0,
];

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

class CumbiaLoop {
  constructor() {
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.volume = 0.5;
    this.bpm = BPM;
  }

  get stepDur() {
    return 60 / this.bpm / STEPS_PER_BEAT;
  }

  /** Cambia el tempo (por escenario); vale llamar antes de start(). */
  setTempo(bpm) {
    this.bpm = bpm || BPM;
  }

  start() {
    const ctx = getContext();
    if (!ctx || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setVolume(v) {
    this.volume = v;
  }

  schedule() {
    const ctx = getContext();
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + 0.12) {
      if (!isMuted()) this.playStep(ctx, this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % TOTAL_STEPS;
    }
  }

  playStep(ctx, step, t) {
    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const root = ROOTS[bar];
    const v = this.volume;

    // bajo de cumbia: raíz en 1, quinta en el "y" de 2, raíz en 3, quinta en 4
    if (inBar === 0) this.bass(ctx, t, root - 12, v);
    if (inBar === 6) this.bass(ctx, t, root - 5, v);
    if (inBar === 8) this.bass(ctx, t, root - 12, v);
    if (inBar === 12) this.bass(ctx, t, root - 5, v);

    // güiro: chk en cada corchea, más largo en los tiempos
    if (inBar % 2 === 0) this.guiro(ctx, t, inBar % 4 === 0 ? 0.06 : 0.035, v);

    // campana / cencerro en los contratiempos
    if (inBar % 4 === 2) this.bell(ctx, t, v);

    // melodía por corcheas
    if (step % 2 === 0) {
      const note = MELODY[step / 2];
      if (note) this.lead(ctx, t, note, v);
    }
  }

  bass(ctx, t, midi, v) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(midiToFreq(midi), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(g).connect(getBus());
    osc.start(t);
    osc.stop(t + 0.3);
  }

  guiro(ctx, t, dur, v) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 3200;
    filt.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0.09 * v;
    src.connect(filt).connect(g).connect(getBus());
    src.start(t);
  }

  bell(ctx, t, v) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.05 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g).connect(getBus());
    osc.start(t);
    osc.stop(t + 0.1);
  }

  lead(ctx, t, midi, v) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(midiToFreq(midi), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g).connect(getBus());
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const Music = new CumbiaLoop();
