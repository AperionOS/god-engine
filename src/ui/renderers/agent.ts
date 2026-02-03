import { World } from '../../engine/world';
import { AgentState } from '../../engine/agent';
import { CanvasContext } from '../canvas';

const STATE_COLORS: Record<string, string> = {
  [AgentState.IDLE]: '#ffffff',    // White for chill
  [AgentState.FORAGING]: '#3b82f6', // Blue for searching
  [AgentState.EATING]: '#22c55e',   // Green for eating
  [AgentState.REPRODUCING]: '#f59e0b', // Orange for reproducing
  [AgentState.DEAD]: '#1f2937'      // Dark grey
};

export function renderAgents(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  for (const agent of world.agents) {
    const screenX = agent.x * cellWidth;
    const screenY = agent.y * cellHeight;
    // Base radius
    const radius = Math.max(3, cellWidth / 2);

    // 1. Draw Body (Color = State)
    ctx.fillStyle = STATE_COLORS[agent.state] || '#ff0000';
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Hunger Indicator (Inner Dot)
    // The dot gets smaller as hunger gets higher (closer to death)
    const hungerPercent = Math.max(0, 1 - (agent.hunger / agent.maxHunger));
    if (hungerPercent < 0.9) { // Only show if somewhat hungry
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius * hungerPercent, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Highlight specialists (Optional: slight glow for high speed)
    if (agent.speed > 1.2) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
  }
}