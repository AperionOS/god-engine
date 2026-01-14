import { HeightMap } from './height';

export class FlowMap {
  readonly width: number;
  readonly height: number;
  readonly flow: Uint32Array;
  readonly isRiver: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.flow = new Uint32Array(width * height);
    this.isRiver = new Uint8Array(width * height);
  }

  getFlow(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.flow[y * this.width + x];
  }

  getRiver(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.isRiver[y * this.width + x] === 1;
  }
}

export function calculateFlow(heightMap: HeightMap, riverThreshold: number = 100): FlowMap {
  const { width, height } = heightMap;
  const flowMap = new FlowMap(width, height);

  // Initialize flow to 1 (self contribution)
  for (let i = 0; i < flowMap.flow.length; i++) {
    flowMap.flow[i] = 1;
  }

  // Build list of cells sorted by height (high to low)
  const cells: Array<{ x: number; y: number; h: number }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ x, y, h: heightMap.get(x, y) });
    }
  }
  cells.sort((a, b) => b.h - a.h);

  // Flow accumulation from high to low
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];

  for (const cell of cells) {
    const { x, y, h } = cell;
    const idx = y * width + x;

    // Find lowest neighbor
    let lowestX = x;
    let lowestY = y;
    let lowestH = h;

    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nh = heightMap.get(nx, ny);
        if (nh < lowestH) {
          lowestH = nh;
          lowestX = nx;
          lowestY = ny;
        }
      }
    }

    // If we found a lower neighbor, flow to it
    if (lowestX !== x || lowestY !== y) {
      const targetIdx = lowestY * width + lowestX;
      flowMap.flow[targetIdx] += flowMap.flow[idx];
    }
  }

  // Mark rivers
  for (let i = 0; i < flowMap.flow.length; i++) {
    flowMap.isRiver[i] = flowMap.flow[i] >= riverThreshold ? 1 : 0;
  }

  return flowMap;
}
