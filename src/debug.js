// Utilidades de depuración activadas por query string, p.ej. ?test=1&brake=2000-4000
const params = new URLSearchParams(window.location.search);

export const DEBUG = {
  test: params.has('test'),
  // intervalos "inicio-fin,inicio-fin" en ms de juego en los que se simula el freno
  brakeWindows: (params.get('brake') || '')
    .split(',')
    .filter(Boolean)
    .map((w) => w.split('-').map(Number)),
};

export function isBrakeScripted(timeMs) {
  return DEBUG.brakeWindows.some(([a, b]) => timeMs >= a && timeMs < b);
}
