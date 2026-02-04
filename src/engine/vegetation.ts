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

/**
 * Scarcity v1: Initialize vegetation below max using moisture (deterministic)
 * This creates natural scarcity at tick 0 - the world isn't a "free buffet"
 */
export function initializeVegetation(biomeMap: BiomeMap, moistureMap: MoistureMap): VegetationMap {
  const { width, height } = biomeMap;
  const vegetation = new VegetationMap(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const biome = biomeMap.get(x, y);
      const maxVeg = WORLD_CONFIG.VEGETATION.MAX_DENSITY[biome];

      if (maxVeg <= 0) {
        vegetation.set(x, y, 0);
        continue;
      }

      // Use moisture to deterministically vary initial vegetation
      const moisture = moistureMap.get(x, y); // 0..1
      const initFrac =
        WORLD_CONFIG.VEGETATION.INITIAL_BASE +
        WORLD_CONFIG.VEGETATION.INITIAL_MOISTURE_BONUS * moisture;

      vegetation.set(x, y, Math.min(maxVeg, maxVeg * initFrac));
    }
  }

  return vegetation;
}

/**
 * Scarcity v1: Logistic regrowth - fast when depleted, slows near max
 * This prevents depleted zones from instantly refilling
 */
export function updateVegetation(
  vegetation: VegetationMap,
  biomeMap: BiomeMap,
  moistureMap: MoistureMap,
  tick: number
): void {
  const { width, height } = vegetation;
  
  // OPTIMIZATION: Strided updates
  // Only update 1/4th of the rows each tick
  const stride = 4;
  const startY = tick % stride;

  for (let y = startY; y < height; y += stride) {
    for (let x = 0; x < width; x++) {
      const biome = biomeMap.get(x, y);
      const maxVeg = WORLD_CONFIG.VEGETATION.MAX_DENSITY[biome];
      if (maxVeg <= 0) continue;

      const moisture = moistureMap.get(x, y);
      const current = vegetation.get(x, y);

      const base = WORLD_CONFIG.VEGETATION.GROWTH_RATE[biome];

      // Moisture influences growth, but doesn't explode it
      const moistureFactor = 0.25 + 0.75 * moisture;

      // Logistic: fast when depleted, slows near max
      const deficit = 1 - current / Math.max(1e-6, maxVeg);

      // Multiply by stride since we update 1/4 rows per tick
      const regrowth = base * moistureFactor * deficit * stride;

      if (regrowth > 0 && current < maxVeg) {
        // Clamp to biome max (prevents exceeding MAX_DENSITY)
        vegetation.set(x, y, Math.min(maxVeg, current + regrowth));
      }
    }
  }
}
