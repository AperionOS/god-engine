import { World } from '../../engine/world';
import { CanvasContext } from '../canvas';

export function renderAgents(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  ctx.fillStyle = '#ff0000';

  for (const agent of world.agents) {
    const screenX = agent.x * cellWidth;
    const screenY = agent.y * cellHeight;
    const radius = Math.max(2, cellWidth / 2);

    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
