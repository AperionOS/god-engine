import { SeededRNG } from './rng';

export interface HeightMapConfig {
  width: number;
  height: number;
  seed: number;
  octaves?: number;
  persistence?: number;
  scale?: number;
}

export class HeightMap {
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
      this.data[y * this.width + x] = value;
    }
  }

  normalize(): void {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] < min) min = this.data[i];
      if (this.data[i] > max) max = this.data[i];
    }
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < this.data.length; i++) {
        this.data[i] = (this.data[i] - min) / range;
      }
    }
  }
}

// Simple value noise implementation with deterministic hash
function hash2D(x: number, y: number): number {
  // Deterministic hash function
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return ((n >>> 0) / 4294967296);
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Get values at grid corners with seed offset
  const v00 = hash2D(xi + seed, yi);
  const v10 = hash2D(xi + 1 + seed, yi);
  const v01 = hash2D(xi + seed, yi + 1);
  const v11 = hash2D(xi + 1 + seed, yi + 1);

  // Smooth interpolation
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);

  const v0 = v00 * (1 - sx) + v10 * sx;
  const v1 = v01 * (1 - sx) + v11 * sx;
  return v0 * (1 - sy) + v1 * sy;
}

export function generateHeightMap(config: HeightMapConfig): HeightMap {
  const { width, height, seed, octaves = 4, persistence = 0.5, scale = 50 } = config;
  const heightMap = new HeightMap(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let amplitude = 1;
      let frequency = 1;
      let noiseValue = 0;

      for (let o = 0; o < octaves; o++) {
        const sampleX = (x / scale) * frequency;
        const sampleY = (y / scale) * frequency;
        noiseValue += valueNoise(sampleX, sampleY, seed + o * 1000) * amplitude;
        amplitude *= persistence;
        frequency *= 2;
      }

      heightMap.set(x, y, noiseValue);
    }
  }

  heightMap.normalize();
  return heightMap;
}
