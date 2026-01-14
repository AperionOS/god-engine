export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export function setupCanvas(canvasId: string, width: number, height: number): CanvasContext {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas element with id "${canvasId}" not found`);
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  return { canvas, ctx, width, height };
}

export function clearCanvas(canvasCtx: CanvasContext): void {
  canvasCtx.ctx.clearRect(0, 0, canvasCtx.width, canvasCtx.height);
}
