# El Elotero 🌽

Juego para celular (pantalla **horizontal**) hecho con **Phaser 4 + Matter.js + Vite**,
al estilo *Hill Climb Racing 2*: un elotero recorre las colinas del barrio con su
carrito, recoge elotes (la moneda del juego), hace trucos, esquiva doñas, cholos,
balones y la camioneta del gas, corre copas contra otros eloteros y compra
carritos, mejoras, pintura y ropa en la tienda.

Pierdes si el carrito cae de cabeza (o se queda parado de nariz), si se te caen
todos los elotes del carrito o si te quedas atorado 6 segundos sin avanzar.

## Controles

- **FRENO** (pedal izquierdo): frena; si lo mantienes, da reversa lenta para despegarte.
- **ACELERAR** (pedal derecho): empuja. Sin pedal, el carrito rueda solo y puede regresarse en una subida.
- En el aire: **ACELERAR** levanta la nariz y **FRENO** la baja. Una vuelta completa es una *marometa*.
- En computadora: flechas ← → o A / D.

## Modos

- **Aventura**: colinas infinitas por escenario, cada uno con su récord de metros. Las colinas crecen con los metros.
- **Copa**: carrera corta con meta (400 a 700 m) contra tres eloteros del barrio con carritos parecidos al tuyo.
  Atraviesan tu carrito (no chocan contigo). Premio según el lugar; si te volteas o te quedas sin elotes, quedas último.

## Economía y trucos

| Qué | Elotes |
|---|---|
| Elote recogido (en el piso, en los arcos de las crestas o a la salida de las rampas) | +1 |
| Cada 100 m (solo aventura) | +5, +10, +15… |
| Marometa | +10 |
| Tiempo en el aire | +2 por segundo (saltos de más de 0.7 s) |
| Caballito (solo la rueda trasera, nariz arriba) | +2 por segundo |
| Aterrizaje perfecto (caer parejo tras un salto largo) | +3 |
| Saltar la camioneta del gas / al tamalero / el tráiler | +6 / +5 / +10 |
| Venta a un cliente (pasar lento junto a él) | +3 |
| Misión del día cumplida | 60 a 200 |
| Copa: 1º / 2º / 3º / 4º | 100 % / 55 % / 30 % / 12 % del premio |

Los trucos encadenados en menos de 2.5 s suben el **combo** (hasta ×5) y multiplican el bono.
Un golpe o un elote perdido lo rompen.

Los elotes **del carrito** son las vidas: se caen con los golpes, los cholos te los
quitan si pasas lento y las bolsas de elotes reponen dos. Dentro de la caja pesan
más (`ELOTES.holdGravity`) para que no brinquen con cada bache.

## Tienda

- **Carritos**: carrito, triciclo, bici-carro, motocarro, camioneta, cuatrimoto y combi. Cada uno con su física (`src/data/carts.js`).
- **Mejoras** (6 niveles cada una): piernas, llantas, suspensión, canasta y frenos (`src/data/upgrades.js`).
- **Pintura**: ocho colores que recolorean el SVG del carrito y seis calcomanías (`src/data/paints.js`, `src/paint.js`).
- **Ropa**: sombreros, mandiles y playeras, solo adorno (`src/data/clothes.js`).
- **Lugar**: Callejón (gratis), Mercado, Feria, Pueblo y Carretera, cada uno con su récord y su copa (`src/data/levels.js`, `src/data/cups.js`).
- **Misiones**: tres al día, cada una se cumple en una sola partida de aventura (`src/data/missions.js`).

El progreso se guarda en `localStorage` (`elotero.save`).

## Personajes y obstáculos

Perro y doña (cruzan y te frenan), cholo (roba si pasas lento), cliente (compra si
pasas lento), coche estacionado, poste caído, camioneta del gas, tamalero en bici
y tráiler (vehículos lentos que se saltan), cable bajo de la CFE tras las rampas,
balón que patean los niños (Pueblo), charcos que quitan fricción (Carretera; las
llantas mejoradas ayudan), chile (turbo 2 s) y bolsa de elotes. Terreno: topes,
baches, escaleras, rampas, rampas grandes y barrancas.

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
**1 unidad del SVG = 1 px del juego**. La lista de recursos está en `src/assets.js`.
Los fondos lejanos (siluetas por tema, ventanas de noche, sol y luna) se dibujan
por código en `src/world/Parallax.js`; el cable de la CFE, el papel picado, los
focos, el empedrado, las barrancas y la meta también.

Para la pintura, cada SVG de carrito declara en `vista.pintura` qué colores son la
base y la sombra; `src/paint.js` los reemplaza y carga la textura `<carrito>@<color>`.

## Parámetros de depuración (query string)

| Parámetro | Efecto |
|---|---|
| `?debug=1` | dibuja los cuerpos físicos encima del arte |
| `?test=1` | arranca directo en el juego con semilla fija y escribe `[test]` en consola cada segundo (también `LOST`, `TRUCO`, `COMBO`, `RACE`, `rivals`) |
| `&auto=1` | piloto automático (el mismo `Driver` de los rivales) |
| `&mode=copa&cup=feria` | arranca una copa |
| `&gas=0-3000,5000-8000` / `&brake=…` | guiones de pedales en ms de juego |
| `&cart=motocarro` `&level=feria` `&up=piernas:3,canasta:6` `&wear=sombrero:lucha` `&paint=azul` `&calca=balon` | carrito, escenario, mejoras, ropa y pintura de la prueba (se guardan) |
| `&phys=wheelAccel:0.05` | sobreescribe parámetros físicos del carrito |
| `&bank=5000` `&reset=1` | banco para pruebas de tienda / borrar el guardado |
| `?scene=Garage&tab=pintura&headless=1` | abrir una escena directo (capturas); `?wipe=Garage` prueba la cortina desde el título |
| `&notopes=1` `&sky=330` `&elotes=1` `&gameover=5000` `&mseed=x` | sin topes, hora del día fija, elotes iniciales, forzar game over, semilla de misiones |

## Estructura

```
src/
  config.js            constantes de física, cámara y economía
  debug.js             parámetros de depuración
  save.js              progreso en localStorage
  paint.js             pintura de carritos (recolor de SVG)
  data/                carritos, mejoras, ropa, pinturas, escenarios, copas, rivales, misiones
  objects/             Terrain (colinas), Cart, Driver (IA), Rival, Race, EloteManager, Actors, Stall, Tricks
  views/               CartView, EloteroView, EloteroTorso, EloteView, RoadView, CartPreview, MetaView
  world/               Scenery (temas), SkyCycle + Parallax (fondo), Particles
  scenes/              Boot, Title, Garage, Cup, Game, UI, Pause, GameOver, RaceResult, Wipe (cortina)
  ui/                  widgets (botones, paneles, papel picado) y transitions
  audio.js, music.js   efectos, motor/ruedas y cumbia sintetizados con Web Audio
```
