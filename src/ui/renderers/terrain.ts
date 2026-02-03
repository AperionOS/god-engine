import { World } from '../../engine/world';
import { CanvasContext } from '../canvas';
import { BIOME_COLORS } from '../../engine/biome';
import { BiomeType } from '../../engine/enums';

// Darker variants for shading
const BIOME_COLORS_DARK: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: '#0f3a6b',
  [BiomeType.BEACH]: '#c9b078',
  [BiomeType.PLAINS]: '#5a8030',
  [BiomeType.FOREST]: '#1a3008',
  [BiomeType.DESERT]: '#b08840',
  [BiomeType.MOUNTAIN]: '#4a4038',
  [BiomeType.SNOW]: '#d0d0d0',
};

// Lighter variants for highlights
const BIOME_COLORS_LIGHT: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: '#2a6ab0',
  [BiomeType.BEACH]: '#f8e8c0',
  [BiomeType.PLAINS]: '#a8d070',
  [BiomeType.FOREST]: '#3a7020',
  [BiomeType.DESERT]: '#e8c880',
  [BiomeType.MOUNTAIN]: '#988878',
  [BiomeType.SNOW]: '#ffffff',
};

function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

// Cache for computed cell colors (cleared on world regeneration)
let colorCache: string[][] | null = null;
let cachedWorldWidth = 0;
let cachedWorldHeight = 0;

export function clearTerrainCache(): void {
  colorCache = null;
}

export function renderTerrain(world: World, canvasCtx: CanvasContext): void {
  const { ctx, width, height } = canvasCtx;
  const { biomeMap, heightMap } = world;

  const cellWidth = width / world.width;
  const cellHeight = height / world.height;

  // Rebuild cache if world size changed or cache is empty
  if (!colorCache || cachedWorldWidth !== world.width || cachedWorldHeight !== world.height) {
    colorCache = [];
    cachedWorldWidth = world.width;
    cachedWorldHeight = world.height;
    
    for (let y = 0; y < world.height; y++) {
      colorCache[y] = [];
      for (let x = 0; x < world.width; x++) {
        const biome = biomeMap.get(x, y);
        const h = heightMap.get(x, y);
        
        const baseColor = parseHex(BIOME_COLORS[biome]);
        const darkColor = parseHex(BIOME_COLORS_DARK[biome]);
        const lightColor = parseHex(BIOME_COLORS_LIGHT[biome]);
        
        const shadeFactor = Math.max(0, Math.min(1, (h + 0.2) / 1.2));
        
        let finalColor: [number, number, number];
        if (shadeFactor < 0.5) {
          finalColor = lerpColor(darkColor, baseColor, shadeFactor * 2);
        } else {
          finalColor = lerpColor(baseColor, lightColor, (shadeFactor - 0.5) * 2);
        }
        
        const noise = ((x * 7 + y * 13) % 17) / 17 - 0.5;
        const variation = noise * 8;
        
        const r = Math.max(0, Math.min(255, finalColor[0] + variation));
        const g = Math.max(0, Math.min(255, finalColor[1] + variation));
        const b = Math.max(0, Math.min(255, finalColor[2] + variation));
        
        colorCache[y][x] = rgbToHex(r, g, b);
      }
    }
  }

  // Draw using fillRect (respects canvas transforms)
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      ctx.fillStyle = colorCache[y][x];
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
    }
  }
  
  // Add vignette overlay (draw at world coordinates)
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.3,
    width / 2, height / 2, height * 0.8
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
