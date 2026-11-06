// Modelos de carrito. `fisica` se mezcla sobre CART de config.js; `vista` dice
// cómo dibujarlo: imagen del cuerpo, punto de la imagen que coincide con el
// centro del chasis físico, posición de la olla y modo/posición del elotero.
//   boxX / boxWidth: dónde van las paredes y los elotes respecto al centro del chasis.
//   elotero.modo: 'empujando' (corre detrás) | 'montado' (pedalea sentado) | 'manejando' (va en la cabina)
//   motor: true si suena a motor (si no, retumbo de ruedas y traqueteo)
//   vista.pintura: colores del SVG que cambia la pintura (base y sombra); vista.calcomania: dónde va la calca

export const CARTS = [
  {
    id: 'carrito',
    nombre: 'Carrito',
    descripcion: 'El clásico de madera, a pura pierna.',
    precio: 0,
    fisica: {
      bodyWidth: 110,
      bodyHeight: 26,
      wallHeight: 38,
      boxX: 0,
      boxWidth: 110,
      density: 0.004,
      wheels: [
        { x: -44, y: 26, r: 17 },
        { x: 44, y: 26, r: 17 },
      ],
      wheelSpeedMax: 0.62,
      wheelAccel: 0.06,
      wheelFriction: 1.3,
      suspensionStiffness: 0.35,
      suspensionDamping: 0.12,
      maxSpeedX: 16,
      airTilt: 0.04,
      antiWheelie: 0.75, // cuánto se corta el gas al levantar la nariz
    },
    vista: {
      cuerpo: 'carrito',
      pintura: { base: ['#c0392b'], sombra: ['#8e2a1f'] },
      calcomania: { x: 42, y: 0 },
      origen: { x: 80, y: 67 },
      olla: { x: 62, y: -55 },
      elotero: { modo: 'empujando', x: -98, y: 2 },
    },
  },
  {
    id: 'triciclo',
    nombre: 'Triciclo',
    descripcion: 'Caja al frente. Pesado y difícil de voltear.',
    precio: 600,
    fisica: {
      bodyWidth: 150,
      bodyHeight: 26,
      wallHeight: 40,
      boxX: 22,
      boxWidth: 100,
      density: 0.0045,
      wheels: [
        { x: -66, y: 28, r: 16 },
        { x: 48, y: 28, r: 16 },
      ],
      wheelSpeedMax: 0.6,
      wheelAccel: 0.055,
      wheelFriction: 1.35,
      suspensionStiffness: 0.4,
      suspensionDamping: 0.14,
      maxSpeedX: 15,
      airTilt: 0.034,
      antiWheelie: 0.7, // cuánto se corta el gas al levantar la nariz
    },
    vista: {
      cuerpo: 'triciclo',
      pintura: { base: ['#2e8b57'], sombra: ['#1f6b41'] },
      calcomania: { x: 56, y: 4 },
      origen: { x: 104, y: 70 },
      olla: { x: 60, y: -52 },
      elotero: { modo: 'montado', x: -50, y: -22 },
    },
  },
  {
    id: 'bici',
    nombre: 'Bici-carro',
    descripcion: 'Rápida y ligera, pero se encabrita.',
    precio: 1200,
    fisica: {
      bodyWidth: 130,
      bodyHeight: 16,
      wallHeight: 42,
      boxX: 40,
      boxWidth: 78,
      density: 0.0036,
      wheels: [
        { x: -50, y: 30, r: 19 },
        { x: 62, y: 30, r: 19 },
      ],
      wheelSpeedMax: 0.74,
      wheelAccel: 0.06,
      wheelFriction: 1.25,
      suspensionStiffness: 0.45,
      suspensionDamping: 0.1,
      maxSpeedX: 18,
      airTilt: 0.05,
      antiWheelie: 0.85, // cuánto se corta el gas al levantar la nariz
    },
    vista: {
      cuerpo: 'bici-carro',
      pintura: { base: ['#e4007c'], sombra: [] },
      calcomania: { x: 58, y: 6 },
      origen: { x: 100, y: 70 },
      olla: { x: 65, y: -52 },
      elotero: { modo: 'montado', x: -38, y: -30 },
    },
  },
  {
    id: 'motocarro',
    nombre: 'Motocarro',
    descripcion: 'Con motor: sube casi todo.',
    precio: 3000,
    motor: true,
    fisica: {
      bodyWidth: 170,
      bodyHeight: 26,
      wallHeight: 42,
      boxX: -45,
      boxWidth: 90,
      density: 0.005,
      wheels: [
        { x: -42, y: 30, r: 18 },
        { x: 70, y: 30, r: 18 },
      ],
      wheelSpeedMax: 0.82,
      wheelAccel: 0.07,
      wheelFriction: 1.35,
      suspensionStiffness: 0.42,
      suspensionDamping: 0.15,
      maxSpeedX: 19,
      airTilt: 0.035,
      antiWheelie: 0.9, // cuánto se corta el gas al levantar la nariz
    },
    vista: {
      cuerpo: 'motocarro',
      pintura: { base: ['#2b6cb0'], sombra: ['#1d4f85'] },
      calcomania: { x: -70, y: 6 },
      origen: { x: 115, y: 70 },
      olla: { x: -10, y: -56 },
      elotero: { modo: 'manejando', x: 32, y: -22 },
    },
  },
  {
    id: 'camioneta',
    nombre: 'Camioneta',
    descripcion: 'La troca elotera: pesada y aguantadora.',
    precio: 7000,
    motor: true,
    fisica: {
      bodyWidth: 210,
      bodyHeight: 30,
      wallHeight: 44,
      boxX: -52,
      boxWidth: 100,
      density: 0.006,
      wheels: [
        { x: -62, y: 34, r: 22 },
        { x: 62, y: 34, r: 22 },
      ],
      wheelSpeedMax: 0.9,
      wheelAccel: 0.08,
      wheelFriction: 1.4,
      suspensionStiffness: 0.5,
      suspensionDamping: 0.18,
      maxSpeedX: 21,
      airTilt: 0.03,
      antiWheelie: 0.8, // cuánto se corta el gas al levantar la nariz
    },
    vista: {
      cuerpo: 'camioneta',
      pintura: { base: ['#f2762e'], sombra: ['#d96a24', '#c9661e', '#b5521a'] },
      calcomania: { x: 70, y: -6 },
      origen: { x: 130, y: 80 },
      olla: { x: 59, y: -74 },
      elotero: { modo: 'manejando', x: 58, y: -10 },
    },
  },
  {
    id: 'cuatrimoto',
    nombre: 'Cuatrimoto',
    descripcion: 'Brincona y veloz, pero lleva pocos elotes.',
    precio: 4500,
    motor: true,
    fisica: {
      bodyWidth: 150,
      bodyHeight: 26,
      wallHeight: 40,
      boxX: -45,
      boxWidth: 78,
      density: 0.0042,
      wheels: [
        { x: -50, y: 30, r: 20 },
        { x: 50, y: 30, r: 20 },
      ],
      wheelSpeedMax: 0.86,
      wheelAccel: 0.075,
      wheelFriction: 1.4,
      suspensionStiffness: 0.4,
      suspensionDamping: 0.13,
      maxSpeedX: 20,
      airTilt: 0.05,
      antiWheelie: 0.85, // cuánto se corta el gas al levantar la nariz
      canastaBase: -1, // un elote menos de inicio y dos menos de tope
    },
    vista: {
      cuerpo: 'cuatrimoto',
      pintura: { base: ['#8e44ad'], sombra: ['#6c3483', '#5b3a80'] },
      calcomania: { x: 58, y: 2 },
      origen: { x: 90, y: 60 },
      olla: { x: 68, y: -58 },
      elotero: { modo: 'manejando', x: 10, y: -22 },
    },
  },
  {
    id: 'combi',
    nombre: 'Combi',
    descripcion: 'Parrilla enorme, pesada y rapidísima.',
    precio: 12000,
    motor: true,
    fisica: {
      bodyWidth: 230,
      bodyHeight: 24,
      wallHeight: 40,
      boxX: 0,
      boxWidth: 150,
      density: 0.0065,
      wheels: [
        { x: -72, y: 62, r: 22 },
        { x: 72, y: 62, r: 22 },
      ],
      wheelSpeedMax: 0.95,
      wheelAccel: 0.075,
      wheelFriction: 1.45,
      suspensionStiffness: 0.55,
      suspensionDamping: 0.2,
      maxSpeedX: 22,
      airTilt: 0.028,
      antiWheelie: 0.8, // cuánto se corta el gas al levantar la nariz
      canastaBase: 3, // tres elotes más de inicio y seis más de tope
    },
    vista: {
      cuerpo: 'combi',
      pintura: { base: ['#1abc9c'], sombra: ['#148f77'] },
      calcomania: { x: -60, y: 32 },
      origen: { x: 135, y: 56 },
      olla: { x: 100, y: -30 },
      elotero: { modo: 'manejando', x: 52, y: 46 },
    },
  },
];

export function cartById(id) {
  return CARTS.find((c) => c.id === id) || CARTS[0];
}
