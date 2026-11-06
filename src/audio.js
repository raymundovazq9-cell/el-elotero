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

// bus maestro: todo pasa por aquí (para bajar el volumen en pausa)
let bus = null;
export function getBus() {
  if (!ctx) return null;
  if (!bus) {
    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(ctx.destination);
  }
  return bus;
}

/** Volumen general (0..1) con rampa corta; sirve para la pausa. */
export function setMasterVolume(v, rampMs = 120) {
  const b = getBus();
  if (!b) return;
  const t = ctx.currentTime;
  b.gain.cancelScheduledValues(t);
  b.gain.setValueAtTime(b.gain.value, t);
  b.gain.linearRampToValueAtTime(v, t + rampMs / 1000);
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
    osc.connect(gain).connect(getBus());
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
    src.connect(gain).connect(getBus());
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
  /** Golpe seco al aterrizar; más fuerte con más impacto (px/paso). */
  thud(impact = 6) {
    const k = Math.min(1, impact / 16);
    noise({ dur: 0.06 + 0.06 * k, vol: 0.05 + 0.14 * k });
    tone({ freq: 90, to: 40, dur: 0.12 + 0.1 * k, type: 'triangle', vol: 0.06 + 0.1 * k });
  },
  /** Elote recogido: cada uno seguido sube medio tono (como las monedas). */
  ding(streak = 0) {
    const f = 660 * Math.pow(2, Math.min(streak, 14) / 12);
    tone({ freq: f, dur: 0.06, type: 'square', vol: 0.07 });
    tone({ freq: f * 1.5, dur: 0.1, type: 'square', vol: 0.07, delay: 0.06 });
  },
  /** Porra: gritos (ruido) y acorde mayor. */
  porra() {
    noise({ dur: 1.1, vol: 0.09 });
    noise({ dur: 0.9, vol: 0.08, delay: 0.25 });
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.07, delay: 0.08 * i }));
  },
  /** Beep de cuenta regresiva (alto = ¡vamos!). */
  beep(high = false) {
    tone({ freq: high ? 880 : 440, dur: high ? 0.4 : 0.12, type: 'square', vol: 0.09 });
  },
  inicio() {
    tone({ freq: 523, dur: 0.08, type: 'square', vol: 0.08 });
    tone({ freq: 659, dur: 0.08, type: 'square', vol: 0.08, delay: 0.08 });
    tone({ freq: 784, dur: 0.14, type: 'square', vol: 0.08, delay: 0.16 });
  },
};

/**
 * Sonido continuo del carrito. 'motor': oscilador que sube de tono con la
 * velocidad y revoluciona con el gas. 'empuje': retumbo bajo de las ruedas y
 * clics sobre el empedrado según la distancia. En el aire suena un "whoosh".
 */
export class EngineSound {
  constructor(kind = 'empuje') {
    this.kind = kind;
    this.nodes = null;
    this.clacDist = 0;
    this.lastFreq = 0;
  }

  build() {
    if (!ctx || this.nodes) return;
    try {
      const out = ctx.createGain();
      out.gain.value = 0;
      out.connect(getBus());
      const nodes = { out };
      if (this.kind === 'motor') {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 700;
        const g2 = ctx.createGain();
        g2.gain.value = 0.4;
        osc.connect(filt);
        osc2.connect(g2).connect(filt);
        filt.connect(out);
        osc.start();
        osc2.start();
        Object.assign(nodes, { osc, osc2 });
      } else {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 45;
        osc.connect(out);
        osc.start();
        nodes.osc = osc;
      }
      // whoosh: ruido en bucle filtrado
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 0.7;
      const wg = ctx.createGain();
      wg.gain.value = 0;
      src.connect(bp).connect(wg).connect(getBus());
      src.start();
      Object.assign(nodes, { whoosh: wg });
      this.nodes = nodes;
    } catch {
      this.nodes = null;
    }
  }

  /**
   * @param {number} speed |vx| en px/paso
   * @param {number} throttle -1 freno, 0 libre, 1 gas
   * @param {boolean} grounded
   * @param {number} airMs tiempo en el aire
   */
  update(speed, throttle, grounded, airMs, deltaMs = 16) {
    if (!ctx) return;
    if (!this.nodes) this.build();
    const n = this.nodes;
    if (!n) return;
    const t = ctx.currentTime;
    const mute = muted ? 0 : 1;
    const ramp = (param, v, ms = 80) => {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(v, t + ms / 1000);
    };
    if (this.kind === 'motor') {
      let freq = 55 + speed * 11;
      if (throttle > 0) freq *= grounded ? 1.25 : 1.6; // en el aire revoluciona
      let vol = 0.035 + (throttle > 0 ? 0.04 : 0) + Math.min(0.03, speed * 0.002);
      ramp(n.osc.frequency, freq, 120);
      ramp(n.osc2.frequency, freq / 2, 120);
      ramp(n.out.gain, vol * mute, 100);
    } else {
      const rolling = grounded ? Math.min(1, speed / 12) : 0;
      ramp(n.osc.frequency, 40 + speed * 3, 120);
      ramp(n.out.gain, 0.05 * rolling * mute, 100);
      if (grounded) {
        this.clacDist += speed;
        const gap = 90;
        if (this.clacDist > gap && !muted) {
          this.clacDist = 0;
          noise({ dur: 0.025, vol: 0.03 + Math.min(0.03, speed * 0.003) });
        }
      }
    }
    const air = grounded ? 0 : Math.min(1, Math.max(0, (airMs - 250) / 700));
    ramp(n.whoosh.gain, 0.09 * air * mute, 120);
  }

  /** Silencio inmediato (pausa) sin destruir los nodos. */
  silence() {
    const n = this.nodes;
    if (!n || !ctx) return;
    n.out.gain.cancelScheduledValues(ctx.currentTime);
    n.out.gain.setValueAtTime(0, ctx.currentTime);
    n.whoosh.gain.cancelScheduledValues(ctx.currentTime);
    n.whoosh.gain.setValueAtTime(0, ctx.currentTime);
  }

  stop() {
    const n = this.nodes;
    this.nodes = null;
    if (!n) return;
    try {
      n.out.disconnect();
      n.whoosh.disconnect();
      if (n.osc) n.osc.stop();
      if (n.osc2) n.osc2.stop();
    } catch {
      /* ignorar */
    }
  }
}

/** Vibración (Android/Chrome). En iPhone no hace nada. */
export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignorar */
  }
}
