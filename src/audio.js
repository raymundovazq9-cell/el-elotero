// Efectos de sonido sintetizados con Web Audio (sin archivos) y vibración.

let ctx = null;
let muted = false;

/** Debe llamarse desde un gesto del usuario (toque) para desbloquear audio en móvil. */
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function setMuted(v) {
  muted = v;
}

function tone({ freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.12, delay = 0 }) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* ignorar fallos de audio */
  }
}

function noise({ dur = 0.08, vol = 0.1, delay = 0 }) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(gain).connect(ctx.destination);
    src.start(t0);
  } catch {
    /* ignorar */
  }
}

export const Sfx = {
  golpe() {
    noise({ dur: 0.07, vol: 0.12 });
    tone({ freq: 120, to: 60, dur: 0.08, type: 'triangle', vol: 0.1 });
  },
  eloteCaido() {
    tone({ freq: 520, to: 180, dur: 0.18, type: 'sawtooth', vol: 0.08 });
  },
  eloteRecogido() {
    tone({ freq: 660, dur: 0.07, type: 'square', vol: 0.08 });
    tone({ freq: 990, dur: 0.1, type: 'square', vol: 0.08, delay: 0.07 });
  },
  aterrizaje() {
    tone({ freq: 440, to: 880, dur: 0.12, type: 'triangle', vol: 0.09 });
    tone({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.09, delay: 0.12 });
  },
  perro() {
    tone({ freq: 700, to: 500, dur: 0.09, type: 'sawtooth', vol: 0.1 });
    tone({ freq: 650, to: 450, dur: 0.12, type: 'sawtooth', vol: 0.1, delay: 0.11 });
  },
  gameOver() {
    tone({ freq: 400, to: 200, dur: 0.25, type: 'square', vol: 0.1 });
    tone({ freq: 300, to: 120, dur: 0.4, type: 'square', vol: 0.1, delay: 0.25 });
  },
  inicio() {
    tone({ freq: 523, dur: 0.08, type: 'square', vol: 0.08 });
    tone({ freq: 659, dur: 0.08, type: 'square', vol: 0.08, delay: 0.08 });
    tone({ freq: 784, dur: 0.14, type: 'square', vol: 0.08, delay: 0.16 });
  },
};

/** Vibración (Android/Chrome). En iPhone no hace nada. */
export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignorar */
  }
}
