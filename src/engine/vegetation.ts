import { BiomeMap } from './biome';
import { BiomeType } from './enums';
import { MoistureMap } from './moisture';
import { WORLD_CONFIG } from './config';

export class VegetationMap {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height);
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  set(x: number, y: number, value: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.data[y * this.width + x] = Math.max(0, Math.min(1, value));
    }
  }

  consume(x: number, y: number, amount: number): number {
    const current = this.get(x, y);
    const consumed = Math.min(current, amount);
    this.set(x, y, current - consumed);
    return consumed;
  }
}

export function initializeVegetation(biomeMap: BiomeMap): VegetationMap {
  const { width, height } = biomeMap;
  const vegetation = new VegetationMap(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const biome = biomeMap.get(x, y);
      vegetation.set(x, y, WORLD_CONFIG.VEGETATION.MAX_DENSITY[biome]);
    }
  }

  return vegetation;
}

export function updateVegetation(
  vegetation: VegetationMap,
  biomeMap: BiomeMap,
  moistureMap: MoistureMap,
  tick: number
): void {
  const { width, height } = vegetation;
  
  // OPTIMIZATION: Strided updates
  // Only update 1/4th of the rows each tick
  // This reduces per-tick load by 75% while maintaining deterministic growth
  const stride = 4;
  const startY = tick % stride;

  for (let y = startY; y < height; y += stride) {
    for (let x = 0; x < width; x++) {
      const biome = biomeMap.get(x, y);
      const moisture = moistureMap.get(x, y);
      const current = vegetation.get(x, y);
      const maxVeg = WORLD_CONFIG.VEGETATION.MAX_DENSITY[biome];
      
      // Multiply growth by stride since we visit less often
      const baseGrowth = WORLD_CONFIG.VEGETATION.GROWTH_RATE[biome];
      const regrowth = baseGrowth * (1 + moisture) * stride;

      if (current < maxVeg) {
        vegetation.set(x, y, current + regrowth);
      }
    }
  }
}
