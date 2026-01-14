import { HeightMap } from './height';
import { BiomeMap } from './biome';
import { VegetationMap } from './vegetation';

export function checksumHeightMap(heightMap: HeightMap): string {
  let sum = 0;
  for (let i = 0; i < heightMap.data.length; i++) {
    sum += heightMap.data[i];
  }
  return sum.toFixed(6);
}

export function checksumBiomeMap(biomeMap: BiomeMap): string {
  const counts = biomeMap.getCounts();
  return Object.values(counts).join('-');
}

export function checksumVegetation(vegetation: VegetationMap): string {
  let sum = 0;
  for (let i = 0; i < vegetation.data.length; i++) {
    sum += vegetation.data[i];
  }
  return sum.toFixed(6);
}
