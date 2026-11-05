# El Elotero 🌽

Juego para celular (pantalla **horizontal**) hecho con **Phaser 4 + Matter.js + Vite**,
al estilo *Hill Climb Racing*: un elotero recorre las colinas del barrio con su
carrito, recoge elotes (la moneda del juego), esquiva doñas, cholos y la camioneta
del gas, y compra carritos, mejoras y ropa en la tienda.

Pierdes si el carrito cae de cabeza, si se te caen todos los elotes del carrito o si
te quedas atorado 6 segundos sin avanzar (se cansa el elotero).

## Controles

- **FRENO** (pedal izquierdo): frena; si lo mantienes, da reversa lenta para despegarte.
- **ACELERAR** (pedal derecho): empuja. Sin pedal, el carrito rueda solo y puede regresarse en una subida.
- En el aire: **ACELERAR** levanta la nariz (caballito) y **FRENO** la baja. Una vuelta completa es una *marometa*.
- En computadora: flechas ← → o A / D.

## Economía

| Qué | Elotes |
|---|---|
| Elote recogido (en el piso o en los arcos de las crestas) | +1 |
| Cada 100 m | +5, +10, +15… |
| Marometa | +10 |
| Tiempo en el aire | +2 por segundo (saltos de más de 0.7 s) |
| Venta a un cliente (pasar lento junto a él) | +3 |
| Misión del día cumplida | 60 a 200 |

Los elotes **del carrito** son las vidas: se caen con los golpes, los cholos te los
quitan si pasas lento y las bolsas de elotes reponen dos.

## Tienda

- **Carritos**: carrito clásico, triciclo, bici-carro, motocarro y camioneta. Cada uno con su física (`src/data/carts.js`).
- **Mejoras** (6 niveles cada una): piernas, llantas, suspensión, canasta y frenos (`src/data/upgrades.js`).
- **Ropa**: sombreros, mandiles y playeras, solo adorno (`src/data/clothes.js`).
- **Lugar**: Callejón (gratis), Mercado y Feria, cada uno con su récord (`src/data/levels.js`).
- **Misiones**: tres al día, cada una se cumple en una sola partida (`src/data/missions.js`).

El progreso se guarda en `localStorage` (`elotero.save`).

## Correr en la computadora

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>.

## Probar en el celular (misma WiFi)

`npm run dev` expone el servidor en la red local. En la terminal aparece algo como:

```
➜  Network: http://192.168.1.206:5173/
```

Abre esa dirección en el celular y gíralo en horizontal. Si no carga, revisa que el
firewall de macOS permita conexiones entrantes a Node.

## Arte

Todo el arte son SVG en `public/assets/svg/` (contorno grueso, estilo caricatura).
Se rasterizan a 2× para pantallas retina y se muestran a escala 0.5, así que
**1 unidad del SVG = 1 px del juego**. Para cambiar un dibujo basta con editar el SVG
y recargar; la lista de recursos está en `src/assets.js`.

| Archivo | Qué es |
|---|---|
| `carrito`, `triciclo`, `bici-carro`, `motocarro`, `camioneta` | los cinco modelos (el punto de origen de cada uno está en `carts.js`) |
| `rueda`, `elote` | rueda (se escala por radio) y elote |
| `elotero-cabeza`, `elotero-pierna`, `playera-*`, `mandil-*`, `sombrero-*` | el elotero por capas |
| `tope`, `coche`, `poste-caido`, `camioneta-gas`, `perro`, `dona`, `cholo`, `cliente`, `chile`, `bolsa` | obstáculos y personajes |
| `casa-*`, `poste`, `puesto*`, `senora`, `lona`, `rueda-fortuna`, `carpa`, `cerros`, `nube` | escenografía |

El cable de la CFE, el papel picado, los focos de la feria y el empedrado se dibujan por código.

## Parámetros de depuración (query string)

| Parámetro | Efecto |
|---|---|
| `?debug=1` | dibuja los cuerpos físicos encima del arte |
| `?test=1` | arranca directo en el juego con semilla fija y escribe `[test]` en consola cada segundo |
| `&auto=1` | piloto automático: acelera en el piso y nivela en el aire |
| `&gas=0-3000,5000-8000` / `&brake=…` | guiones de pedales en ms de juego |
| `&cart=motocarro` `&level=feria` `&up=piernas:3,canasta:6` `&wear=sombrero:lucha` | carrito, escenario, mejoras y ropa de la prueba |
| `&phys=wheelAccel:0.05` | sobreescribe parámetros físicos del carrito |
| `&bank=5000` `&reset=1` | banco para pruebas de tienda / borrar el guardado |
| `?scene=Garage&tab=mejoras&headless=1` | abrir una escena directo (capturas) |
| `&notopes=1` `&sky=330` `&elotes=1` `&gameover=5000` `&mseed=x` | sin topes, hora del día fija, elotes iniciales, forzar game over, semilla de misiones |

## Estructura

```
src/
  config.js            constantes de física y economía
  debug.js             parámetros de depuración
  save.js              progreso en localStorage
  data/                carritos, mejoras, ropa, escenarios, misiones
  objects/             Terrain (colinas), Cart, EloteManager, Actors, Stall, Tricks
  views/               CartView, EloteroView, EloteroTorso, EloteView, RoadView, CartPreview
  world/               Scenery (temas), SkyCycle, Particles
  scenes/              Boot, Title, Garage (tienda), Game, UI, Pause, GameOver
  ui/widgets.js        botones, paneles, papel picado
  audio.js, music.js   efectos y cumbia sintetizados con Web Audio
```
