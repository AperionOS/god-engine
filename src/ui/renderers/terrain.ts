import { World } from '../../engine/world';
import { CanvasContext } from '../canvas';
import { BIOME_COLORS } from '../../engine/biome';

export function renderTerrain(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;
  const { biomeMap } = world;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const biome = biomeMap.get(x, y);
      const color = BIOME_COLORS[biome];

      // Parse hex color
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      // Fill pixels for this cell
      for (let py = 0; py < cellHeight; py++) {
        for (let px = 0; px < cellWidth; px++) {
          const pixelX = Math.floor(x * cellWidth + px);
          const pixelY = Math.floor(y * cellHeight + py);
          if (pixelX < width && pixelY < height) {
            const idx = (pixelY * width + pixelX) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
