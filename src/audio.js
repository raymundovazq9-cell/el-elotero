// Efectos de sonido sintetizados con Web Audio (sin archivos) y vibración.

let ctx = null;
const MUTE_KEY = 'elotero.mute';
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

/** Debe llamarse desde un gesto del usuario (toque) para desbloquear audio en móvil. */
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function getContext() {
  return ctx;
}

export function setMuted(v) {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* sin almacenamiento */
  }
}

export function isMuted() {
  return muted;
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
  /** Silbato del elotero (sube y baja). */
  silbato() {
    tone({ freq: 900, to: 1500, dur: 0.18, type: 'sine', vol: 0.12 });
    tone({ freq: 1500, to: 1000, dur: 0.22, type: 'sine', vol: 0.12, delay: 0.18 });
  },
  /** Traqueteo suave de las ruedas sobre el empedrado. */
  clac() {
    noise({ dur: 0.025, vol: 0.035 });
  },
  /** "¡Ay!" de la doña. */
  ay() {
    tone({ freq: 900, to: 400, dur: 0.22, type: 'triangle', vol: 0.1 });
  },
  /** "¡Órale!" del cholo: dos notas bajas. */
  orale() {
    tone({ freq: 220, to: 180, dur: 0.12, type: 'sawtooth', vol: 0.1 });
    tone({ freq: 260, to: 150, dur: 0.2, type: 'sawtooth', vol: 0.1, delay: 0.13 });
  },
  /** Chispas del cable de la CFE. */
  chispas() {
    noise({ dur: 0.05, vol: 0.12 });
    noise({ dur: 0.06, vol: 0.1, delay: 0.07 });
    tone({ freq: 2400, to: 1200, dur: 0.12, type: 'square', vol: 0.05, delay: 0.02 });
  },
  /** Bocina de la camioneta del gas. */
  bocina() {
    tone({ freq: 392, dur: 0.18, type: 'square', vol: 0.09 });
    tone({ freq: 523, dur: 0.28, type: 'square', vol: 0.09, delay: 0.2 });
  },
  /** Chile: silbido que sube. */
  chile() {
    tone({ freq: 300, to: 1600, dur: 0.3, type: 'sawtooth', vol: 0.08 });
    noise({ dur: 0.2, vol: 0.05, delay: 0.1 });
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
