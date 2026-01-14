import { HeightMap } from './height';
import { FlowMap } from './flow';

export class MoistureMap {
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
}

export function calculateMoisture(
  heightMap: HeightMap,
  flowMap: FlowMap,
  maxDistance: number = 15
): MoistureMap {
  const { width, height } = heightMap;
  const moisture = new MoistureMap(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let closestRiverDist = maxDistance;

      // Search nearby cells for rivers
      for (let dy = -maxDistance; dy <= maxDistance; dy++) {
        for (let dx = -maxDistance; dx <= maxDistance; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (flowMap.getRiver(nx, ny)) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < closestRiverDist) {
                closestRiverDist = dist;
              }
            }
          }
        }
      }

      // Moisture decreases with distance from water
      let moistureValue = 1 - closestRiverDist / maxDistance;

      // Elevation penalty (higher = drier)
      const elevation = heightMap.get(x, y);
      if (elevation > 0.6) {
        moistureValue *= 0.5;
      }

      moisture.data[y * width + x] = Math.max(0, Math.min(1, moistureValue));
    }
  }

  return moisture;
}
