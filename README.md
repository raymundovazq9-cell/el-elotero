# El Elotero 🌽

Juego para celular (pantalla vertical) hecho con **Phaser 4 + Matter.js + Vite**.
Un elotero baja las calles empinadas de un barrio empujando su carrito lleno de
elotes. Los golpes tiran elotes; pierdes si se caen todos o si el carrito se voltea.

**Puntaje = metros recorridos × elotes que llevas + bono por tiempo en el aire.**

## Controles

- **FRENO** (pedal izquierdo): frena hasta una velocidad mínima; nunca te detienes.
- **ACELERAR** (pedal derecho): empuja más fuerte; sirve para saltar más lejos.
- Sin pedal el carrito rueda solo por la bajada.
- En el aire: FRENO inclina hacia atrás y ACELERAR hacia adelante (controlas el aterrizaje).
- En computadora: flechas ← → o A / D.

## Correr en la computadora

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>.

## Probar en el celular (misma WiFi)

`npm run dev` ya expone el servidor en la red local. En la terminal aparece algo como:

```
➜  Network: http://192.168.1.206:5173/
```

Abre esa dirección en el navegador del celular. Si no carga, revisa que el
firewall de macOS permita conexiones entrantes a Node.

## Arte

Todo el arte del juego son SVG en `public/assets/svg/` (contorno grueso, estilo
caricatura). Se rasterizan a 2× para pantallas retina y se muestran a escala 0.5
con `svgImage()` de `src/assets.js`, así que **1 unidad del SVG = 1 px del juego**.

| Archivo | Qué es | Notas |
|---|---|---|
| `carrito.svg` | Carrito (160×100) | El centro del chasis físico está en (80, 67) |
| `rueda.svg` | Rueda (40×40) | Radio físico 17 px |
| `elotero-torso.svg`, `elotero-pierna.svg` | Elotero | Cadera en (40, 86) del torso; pierna pivota en (8, 2) |
| `elote.svg` | Elote (24×24) | Se muestra a 0.42 para el radio físico de 9 px |
| `tope.svg`, `perro.svg`, `coche.svg` | Obstáculos | |
| `casa-detalles-*.svg`, `casa-ventanas-*.svg` | Casas | La pared de color se genera por código en `Scenery.wallTexture` |
| `poste.svg`, `puesto.svg`, `senora.svg` | Escenografía | |
| `cerros.svg`, `nube.svg` | Fondo lejano | |

Para cambiar un dibujo basta con editar el SVG; si cambias el tamaño, ajusta el
origen en la vista correspondiente (`src/views/`).

### Fondos generados con IA (opcional)

Se generaron dos panoramas en Canva (cerros con casitas e iglesia, de tarde y de
noche). Para usarlos descárgalos como PNG de ~1776×896 a
`public/assets/bg/fondo-tarde.png` y `public/assets/bg/fondo-noche.png` y pon
`AI_BACKGROUNDS = true` en `src/assets.js`. Si no existen se usa `cerros.svg`.

## Modo de prueba (depuración)

Parámetros en la URL:

- `?test=1` — salta la pantalla de inicio, usa una semilla fija y escribe estadísticas en la consola cada segundo (incluye número de objetos y cuerpos para detectar fugas).
- `&brake=3000-5000` / `&gas=6000-9000` — simula los pedales en esos intervalos (ms).
- `&elotes=3` — elotes iniciales.
- `&gameover=5000` — fuerza game over a los N ms.
- `&sky=340` — fija los metros del ciclo de cielo (340 = noche).
- `?debug=1` — dibuja los cuerpos de Matter encima del arte.
- `?headless=1` — bucle con setTimeout (para capturas en navegador sin pantalla).

## Estructura

```
src/
  main.js             configuración de Phaser (540x960, Matter, escenas)
  config.js           constantes de balance (velocidades, tamaños, elotes)
  theme.js            paleta, fuente Fredoka, fases del cielo
  assets.js           lista de SVG y helper svgImage()
  audio.js            efectos de sonido Web Audio y vibración
  music.js            loop de cumbia sintetizado (bajo, güiro, campana, melodía)
  debug.js            parámetros de prueba por URL
  scenes/             Boot, Title, Game, UI (HUD + pedales), Pause, GameOver
  objects/            física y reglas: Road, Cart, EloteManager, Obstacles, Difficulty
  views/              dibujo sincronizado con la física: CartView, EloteroView, EloteView, RoadView
  world/              Scenery (casas, postes, puestos, gente, papel picado), SkyCycle, Particles
  ui/widgets.js       botones, paneles, tarjetas, papel picado
```

Para ajustar la sensación del juego edita `src/config.js` y `src/objects/Difficulty.js`.
