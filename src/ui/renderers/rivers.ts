import { World } from '../../engine/world';
import { CanvasContext } from '../canvas';

export function renderRivers(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;
  const { flowMap } = world;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  ctx.fillStyle = '#3a8fc9';

  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (flowMap.getRiver(x, y)) {
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
