# El Elotero 🌽

Juego para celular (pantalla vertical) hecho con **Phaser 4 + Matter.js + Vite**.
Un elotero baja calles empinadas con su carrito lleno de elotes. Los golpes tiran
elotes; pierdes si se caen todos o si el carrito se voltea.

**Puntaje = metros recorridos × elotes que llevas + bono por tiempo en el aire.**

## Controles (un dedo)

- **Mantener presionado** = frenar (nunca se detiene del todo).
- **Soltar** = avanzar.

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

## Modo de prueba (depuración)

Parámetros en la URL:

- `?test=1` — salta la pantalla de inicio, usa una semilla fija y escribe estadísticas en la consola cada segundo.
- `&brake=3000-5000,9000-10000` — simula el freno en esos intervalos (ms).
- `&elotes=3` — elotes iniciales.
- `&gameover=5000` — fuerza game over a los N ms.

## Estructura

```
src/
  main.js             configuración de Phaser (540x960, Matter, escenas)
  config.js           constantes de balance (velocidades, tamaños, elotes)
  audio.js            efectos de sonido Web Audio y vibración
  debug.js            parámetros de prueba por URL
  scenes/             Boot, Title, Game, UI (HUD), GameOver
  objects/
    Road.js           calle infinita por tramos: baches, escalones, rampas, topes
    Cart.js           carrito (chasis compuesto + ruedas con suspensión), freno/avance
    EloteManager.js   elotes en el carrito, caídos y recogibles
    Obstacles.js      perros que cruzan y coches estacionados
    Difficulty.js     curva de dificultad según metros
```

Para ajustar la sensación del juego edita `src/config.js` y `src/objects/Difficulty.js`.
