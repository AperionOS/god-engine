import { World } from '../../engine/world';
import { CanvasContext } from '../canvas';

/**
 * Death effect data structure (UI-only, no engine mutation)
 */
export interface DeathEffect {
  id: string;
  x: number;
  y: number;
  startMs: number;
  tick: number;
}

const EFFECT_DURATION_MS = 900;

/**
 * Render death effects as expanding red rings that fade out
 * Called from the render loop, purely visual, no engine state mutation
 */
export function renderDeathEffects(
  effects: DeathEffect[],
  world: World,
  canvasCtx: CanvasContext,
  now: number
): void {
  if (effects.length === 0) return;

  const { ctx, width, height } = canvasCtx;
  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  for (const effect of effects) {
    const elapsed = now - effect.startMs;
    if (elapsed >= EFFECT_DURATION_MS) continue;

    const progress = elapsed / EFFECT_DURATION_MS; // 0 → 1
    const alpha = 1 - progress; // Fade out
    const radius = 4 + progress * 20; // Expand from 4 to 24

    const screenX = effect.x * cellWidth;
    const screenY = effect.y * cellHeight;

    // Outer glow ring (red, fading)
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.8})`; // red-500
    ctx.lineWidth = 2 + (1 - progress) * 2; // Thicker at start
    ctx.stroke();

    // Inner flash (white, fades faster)
    if (progress < 0.3) {
      const innerAlpha = (0.3 - progress) / 0.3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${innerAlpha * 0.6})`;
      ctx.fill();
    }

    // Skull icon at center (optional, simple X mark)
    if (progress < 0.6) {
      const iconAlpha = Math.min(1, (0.6 - progress) / 0.4);
      ctx.strokeStyle = `rgba(255, 255, 255, ${iconAlpha * 0.9})`;
      ctx.lineWidth = 1.5;
      const iconSize = 3;
      ctx.beginPath();
      ctx.moveTo(screenX - iconSize, screenY - iconSize);
      ctx.lineTo(screenX + iconSize, screenY + iconSize);
      ctx.moveTo(screenX + iconSize, screenY - iconSize);
      ctx.lineTo(screenX - iconSize, screenY + iconSize);
      ctx.stroke();
    }
  }
}
