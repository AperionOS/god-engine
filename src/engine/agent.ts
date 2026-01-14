import { VegetationMap } from './vegetation';

export interface AgentConfig {
  x: number;
  y: number;
  hunger?: number;
  speed?: number;
  senseRadius?: number;
}

export class Agent {
  x: number;
  y: number;
  hunger: number;
  speed: number;
  senseRadius: number;

  constructor(config: AgentConfig) {
    this.x = config.x;
    this.y = config.y;
    this.hunger = config.hunger ?? 0;
    this.speed = config.speed ?? 1;
    this.senseRadius = config.senseRadius ?? 5;
  }

  update(vegetation: VegetationMap): void {
    const { width, height } = vegetation;

    // Find best vegetation nearby
    let bestX = this.x;
    let bestY = this.y;
    let bestVeg = 0;

    for (let dy = -this.senseRadius; dy <= this.senseRadius; dy++) {
      for (let dx = -this.senseRadius; dx <= this.senseRadius; dx++) {
        const nx = Math.floor(this.x + dx);
        const ny = Math.floor(this.y + dy);
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const veg = vegetation.get(nx, ny);
          if (veg > bestVeg) {
            bestVeg = veg;
            bestX = nx;
            bestY = ny;
          }
        }
      }
    }

    // Move toward best vegetation
    if (bestVeg > 0) {
      const dx = bestX - this.x;
      const dy = bestY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    }

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(width - 1, this.x));
    this.y = Math.max(0, Math.min(height - 1, this.y));

    // Try to eat
    const cellX = Math.floor(this.x);
    const cellY = Math.floor(this.y);
    const consumed = vegetation.consume(cellX, cellY, 0.1);
    this.hunger = Math.max(0, this.hunger - consumed * 10);

    // Increase hunger over time
    this.hunger += 0.1;
  }
}
