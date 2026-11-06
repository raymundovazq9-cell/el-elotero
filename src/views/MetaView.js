import { COLORS, textStyle } from '../theme.js';
import { drawPapelPicado } from '../ui/widgets.js';

/** Meta de una copa: dos postes, arco de papel picado, letrero META y línea a cuadros. */
export function drawMeta(scene, x, groundY) {
  const items = [];
  const g = scene.add.graphics().setDepth(-3);
  // línea a cuadros en el piso
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle((i + j) % 2 ? 0xffffff : 0x1a1a1a, 1);
      g.fillRect(x - 12 + j * 12, groundY - 2 + i * 0, 12, 4);
    }
  }
  g.fillStyle(0xffffff, 1);
  g.fillRect(x - 14, groundY - 4, 28, 6);
  g.fillStyle(0x1a1a1a, 1);
  for (let i = 0; i < 4; i++) g.fillRect(x - 14 + i * 7, groundY - 4 + (i % 2) * 3, 7, 3);
  // postes
  g.fillStyle(0xc0392b, 1);
  g.lineStyle(3, 0x1a1a1a, 1);
  for (const px of [x - 70, x + 70]) {
    g.fillRect(px - 6, groundY - 190, 12, 190);
    g.strokeRect(px - 6, groundY - 190, 12, 190);
  }
  // travesaño
  g.fillStyle(0xf7c948, 1);
  g.fillRect(x - 76, groundY - 200, 152, 16);
  g.strokeRect(x - 76, groundY - 200, 152, 16);
  items.push(g);
  items.push(
    scene.add
      .text(x, groundY - 192, 'META', textStyle(16, COLORS.negro, { stroke: COLORS.cremaHex, strokeThickness: 2, fontStyle: '700' }))
      .setOrigin(0.5)
      .setDepth(-2.9)
  );
  // papel picado colgando del travesaño
  const flags = drawPapelPicado(scene, x - 70, groundY - 184, x + 70, groundY - 184, 16, 4);
  if (flags) items.push(flags);
  return {
    destroy() {
      items.forEach((i) => i && i.destroy && i.destroy());
    },
  };
}
