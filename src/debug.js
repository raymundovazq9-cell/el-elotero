// Utilidades de depuración activadas por query string, p.ej. ?test=1&brake=2000-4000
const params = new URLSearchParams(window.location.search);

export const DEBUG = {
  test: params.has('test'),
  // bucle con setTimeout para capturas en navegador headless (?headless=1)
  headless: params.has('headless') || params.has('test'),
  // dibuja los cuerpos de Matter encima del arte (?debug=1); ?nodebug=1 lo apaga
  physics: params.has('debug'),
  // número inicial de elotes para pruebas (?elotes=1)
  startElotes: params.has('elotes') ? Number(params.get('elotes')) : null,
  // fuerza game over a los N ms de juego (?gameover=5000)
  forceGameOverAt: params.has('gameover') ? Number(params.get('gameover')) : null,
  // metros fijos para el ciclo de cielo (?sky=330 = noche)
  skyMeters: params.has('sky') ? Number(params.get('sky')) : null,
  // intervalos "inicio-fin,inicio-fin" en ms de juego en los que se simula el freno
  brakeWindows: (params.get('brake') || '')
    .split(',')
    .filter(Boolean)
    .map((w) => w.split('-').map(Number)),
  gasWindows: (params.get('gas') || '')
    .split(',')
    .filter(Boolean)
    .map((w) => w.split('-').map(Number)),
};

export function isBrakeScripted(timeMs) {
  return DEBUG.brakeWindows.some(([a, b]) => timeMs >= a && timeMs < b);
}

export function isGasScripted(timeMs) {
  return DEBUG.gasWindows.some(([a, b]) => timeMs >= a && timeMs < b);
}
