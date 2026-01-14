import { BiomeMap, BiomeType } from './biome';
import { MoistureMap } from './moisture';

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

const BIOME_VEGETATION: Record<BiomeType, number> = {
  [BiomeType.OCEAN]: 0,
  [BiomeType.BEACH]: 0.1,
  [BiomeType.PLAINS]: 0.5,
  [BiomeType.FOREST]: 0.9,
  [BiomeType.DESERT]: 0.05,
  [BiomeType.MOUNTAIN]: 0.2,
  [BiomeType.SNOW]: 0,
};

const BIOME_REGROWTH: Record<BiomeType, number> = {
  [BiomeType.OCEAN]: 0,
  [BiomeType.BEACH]: 0.001,
  [BiomeType.PLAINS]: 0.005,
  [BiomeType.FOREST]: 0.01,
  [BiomeType.DESERT]: 0.0005,
  [BiomeType.MOUNTAIN]: 0.002,
  [BiomeType.SNOW]: 0,
};

export function initializeVegetation(biomeMap: BiomeMap): VegetationMap {
  const { width, height } = biomeMap;
  const vegetation = new VegetationMap(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const biome = biomeMap.get(x, y);
      vegetation.set(x, y, BIOME_VEGETATION[biome]);
    }
  }

  return vegetation;
}

export function updateVegetation(
  vegetation: VegetationMap,
  biomeMap: BiomeMap,
  moistureMap: MoistureMap
): void {
  const { width, height } = vegetation;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const biome = biomeMap.get(x, y);
      const moisture = moistureMap.get(x, y);
      const current = vegetation.get(x, y);
      const maxVeg = BIOME_VEGETATION[biome];
      const regrowth = BIOME_REGROWTH[biome] * (1 + moisture);

      if (current < maxVeg) {
        vegetation.set(x, y, current + regrowth);
      }
    }
  }
}
