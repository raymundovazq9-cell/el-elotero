// Utilidades de depuración activadas por query string, p.ej. ?test=1&brake=2000-4000
const params = new URLSearchParams(window.location.search);

export const DEBUG = {
  test: params.has('test'),
  // semilla de las misiones del día para pruebas (?mseed=x)
  missionSeed: params.get('mseed'),
  // escena inicial para capturas (?scene=Garage) y pestaña de la tienda (?tab=mejoras)
  scene: params.get('scene'),
  tab: params.get('tab'),
  // borra el progreso guardado al cargar (?reset=1)
  reset: params.has('reset'),
  // escenario a cargar directo en pruebas (?level=feria)
  level: params.get('level'),
  // ropa a equipar en pruebas (?wear=sombrero:lucha,mandil:rojo)
  wear: Object.fromEntries(
    (params.get('wear') || '')
      .split(',')
      .filter(Boolean)
      .map((kv) => kv.split(':'))
  ),
  // carrito a usar en pruebas (?cart=motocarro)
  cart: params.get('cart'),
  // niveles de mejora para pruebas (?up=piernas:3,canasta:6)
  upgrades: Object.fromEntries(
    (params.get('up') || '')
      .split(',')
      .filter(Boolean)
      .map((kv) => {
        const [k, v] = kv.split(':');
        return [k, Number(v)];
      })
  ),
  // parámetros físicos del carrito a sobreescribir en pruebas (?phys=wheelAccel:0.05,density:0.004)
  phys: Object.fromEntries(
    (params.get('phys') || '')
      .split(',')
      .filter(Boolean)
      .map((kv) => {
        const [k, v] = kv.split(':');
        return [k, Number(v)];
      })
  ),
  // banco inicial para pruebas de tienda (?bank=5000)
  bank: params.has('bank') ? Number(params.get('bank')) : null,
  // bucle con setTimeout para capturas en navegador headless (?headless=1)
  headless: params.has('headless') || params.has('test'),
  // dibuja los cuerpos de Matter encima del arte (?debug=1); ?nodebug=1 lo apaga
  physics: params.has('debug'),
  // número inicial de elotes para pruebas (?elotes=1)
  startElotes: params.has('elotes') ? Number(params.get('elotes')) : null,
  // fuerza game over a los N ms de juego (?gameover=5000)
  forceGameOverAt: params.has('gameover') ? Number(params.get('gameover')) : null,
  // piloto automático de pruebas: acelera en el piso y nivela en el aire (?auto=1)
  auto: params.has('auto'),
  // quita los topes del terreno (?notopes=1), para aislar problemas de física
  noTopes: params.has('notopes'),
  // metros fijos para el ciclo de cielo (?sky=330 = noche)
  skyMeters: params.has('sky') ? Number(params.get('sky')) : null,
  paint: params.get('paint') || '',
  calca: params.get('calca') || '',
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
