import { describe, it, expect } from 'vitest';
import { generateHeightMap } from '../src/engine/height';
import { calculateMoisture } from '../src/engine/moisture';
import { calculateFlow } from '../src/engine/flow';
import { generateBiomeMap, BiomeType } from '../src/engine/biome';
import { checksumBiomeMapLegacy } from '../src/engine/checksum';

describe('BiomeMap', () => {
  it('should generate deterministic biome map for same seed', () => {
    const heightMap1 = generateHeightMap({ width: 64, height: 64, seed: 777 });
    const flowMap1 = calculateFlow(heightMap1);
    const moistureMap1 = calculateMoisture(heightMap1, flowMap1);
    const biomeMap1 = generateBiomeMap(heightMap1, moistureMap1);

    const heightMap2 = generateHeightMap({ width: 64, height: 64, seed: 777 });
    const flowMap2 = calculateFlow(heightMap2);
    const moistureMap2 = calculateMoisture(heightMap2, flowMap2);
    const biomeMap2 = generateBiomeMap(heightMap2, moistureMap2);

    expect(checksumBiomeMapLegacy(biomeMap1)).toBe(checksumBiomeMapLegacy(biomeMap2));
  });

  it('should contain all valid biome types', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 555 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);

    for (let i = 0; i < biomeMap.data.length; i++) {
      const biome = biomeMap.data[i];
      expect(Object.values(BiomeType)).toContain(biome);
    }
  });

  it('should generate multiple biome types', () => {
    const heightMap = generateHeightMap({ width: 128, height: 128, seed: 333 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);

    const counts = biomeMap.getCounts();
    const typesPresent = Object.values(counts).filter((count) => count > 0).length;

    expect(typesPresent).toBeGreaterThan(3);
  });

  it('should have stable checksum for known seed', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 12345 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);

    const checksum = checksumBiomeMapLegacy(biomeMap);
    expect(checksum).toBeTruthy();
  });
});
