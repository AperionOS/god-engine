import { HeightMap } from './height';
import { MoistureMap } from './moisture';

export enum BiomeType {
  OCEAN = 0,
  BEACH = 1,
  PLAINS = 2,
  FOREST = 3,
  DESERT = 4,
  MOUNTAIN = 5,
  SNOW = 6,
}

export const BIOME_COLORS: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: '#1a5490',
  [BiomeType.BEACH]: '#e8d4a0',
  [BiomeType.PLAINS]: '#88b058',
  [BiomeType.FOREST]: '#2d5016',
  [BiomeType.DESERT]: '#d4a860',
  [BiomeType.MOUNTAIN]: '#786858',
  [BiomeType.SNOW]: '#f0f0f0',
};

export class BiomeMap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }

  get(x: number, y: number): BiomeType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return BiomeType.OCEAN;
    return this.data[y * this.width + x];
  }

  set(x: number, y: number, biome: BiomeType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.data[y * this.width + x] = biome;
    }
  }

  getCounts(): Record<BiomeType, number> {
    const counts: Record<BiomeType, number> = {
      [BiomeType.OCEAN]: 0,
      [BiomeType.BEACH]: 0,
      [BiomeType.PLAINS]: 0,
      [BiomeType.FOREST]: 0,
      [BiomeType.DESERT]: 0,
      [BiomeType.MOUNTAIN]: 0,
      [BiomeType.SNOW]: 0,
    };
    for (let i = 0; i < this.data.length; i++) {
      counts[this.data[i]]++;
    }
    return counts;
  }
}

function classifyBiome(height: number, moisture: number): BiomeType {
  // Ocean
  if (height < 0.3) return BiomeType.OCEAN;

  // Beach
  if (height < 0.35) return BiomeType.BEACH;

  // Snow
  if (height > 0.8) return BiomeType.SNOW;

  // Mountain
  if (height > 0.65) return BiomeType.MOUNTAIN;

  // Desert (low moisture)
  if (moisture < 0.3) return BiomeType.DESERT;

  // Forest (high moisture)
  if (moisture > 0.6) return BiomeType.FOREST;

  // Plains (medium moisture)
  return BiomeType.PLAINS;
}

export function generateBiomeMap(heightMap: HeightMap, moistureMap: MoistureMap): BiomeMap {
  const { width, height } = heightMap;
  const biomeMap = new BiomeMap(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const h = heightMap.get(x, y);
      const m = moistureMap.get(x, y);
      const biome = classifyBiome(h, m);
      biomeMap.set(x, y, biome);
    }
  }

  return biomeMap;
}
