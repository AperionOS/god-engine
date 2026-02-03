import { World } from '../../engine/world';
import { AgentState } from '../../engine/agent';
import { CanvasContext } from '../canvas';

// Rich state colors with better contrast
const STATE_COLORS: Record<string, { fill: string; glow: string }> = {
  [AgentState.IDLE]: { fill: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.4)' },
  [AgentState.FORAGING]: { fill: '#60a5fa', glow: 'rgba(96, 165, 250, 0.5)' },
  [AgentState.EATING]: { fill: '#4ade80', glow: 'rgba(74, 222, 128, 0.5)' },
  [AgentState.REPRODUCING]: { fill: '#fb923c', glow: 'rgba(251, 146, 60, 0.6)' },
  [AgentState.DEAD]: { fill: '#374151', glow: 'rgba(55, 65, 81, 0.2)' },
};

export function renderAgents(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  // Sort agents by y-position for pseudo-depth (back to front)
  const sortedAgents = [...world.agents].sort((a, b) => a.y - b.y);

  for (const agent of sortedAgents) {
    const screenX = agent.x * cellWidth;
    const screenY = agent.y * cellHeight;
    const baseRadius = Math.max(4, cellWidth / 2);
    
    // Scale radius slightly by energy (well-fed agents look bigger)
    const energyFactor = 0.8 + (1 - agent.hunger / agent.maxHunger) * 0.4;
    const radius = baseRadius * energyFactor;
    
    const colors = STATE_COLORS[agent.state] || STATE_COLORS[AgentState.IDLE];

    // 1. Outer glow (state indicator)
    const glowRadius = radius * 2;
    const glowGradient = ctx.createRadialGradient(
      screenX, screenY, radius * 0.5,
      screenX, screenY, glowRadius
    );
    glowGradient.addColorStop(0, colors.glow);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main body with gradient
    const bodyGradient = ctx.createRadialGradient(
      screenX - radius * 0.3, screenY - radius * 0.3, 0,
      screenX, screenY, radius
    );
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.3, colors.fill);
    bodyGradient.addColorStop(1, shadeColor(colors.fill, -30));
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Hunger indicator ring (red ring appears when hungry)
    const hungerRatio = agent.hunger / agent.maxHunger;
    if (hungerRatio > 0.5) {
      const urgency = (hungerRatio - 0.5) * 2; // 0-1 as hunger goes 50-100%
      ctx.strokeStyle = `rgba(239, 68, 68, ${urgency * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Speed indicator (fast agents have a motion trail hint)
    if (agent.speed > 1.15) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Helper to darken/lighten a hex color
function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}