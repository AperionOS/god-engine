import { World } from '../../engine/world';
import { CanvasContext } from '../canvas';

export function renderVegetation(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;
  const { vegetationMap } = world;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const veg = vegetationMap.get(x, y);
      if (veg > 0.1) {
        const alpha = Math.min(veg, 1);
        ctx.fillStyle = `rgba(34, 139, 34, ${alpha * 0.6})`;
        ctx.fillRect(
          x * cellWidth,
          y * cellHeight,
          cellWidth,
          cellHeight
        );
      }
    }
  }
}
