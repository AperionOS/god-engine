import { describe, it, expect } from 'vitest';
import { generateHeightMap } from '../src/engine/height';
import { calculateFlow } from '../src/engine/flow';
import { calculateMoisture } from '../src/engine/moisture';
import { generateBiomeMap } from '../src/engine/biome';
import { initializeVegetation, updateVegetation } from '../src/engine/vegetation';
import { checksumVegetationLegacy } from '../src/engine/checksum';

describe('VegetationMap', () => {
  it('should initialize deterministically', () => {
    const heightMap1 = generateHeightMap({ width: 64, height: 64, seed: 888 });
    const flowMap1 = calculateFlow(heightMap1);
    const moistureMap1 = calculateMoisture(heightMap1, flowMap1);
    const biomeMap1 = generateBiomeMap(heightMap1, moistureMap1);
    const vegetation1 = initializeVegetation(biomeMap1);

    const heightMap2 = generateHeightMap({ width: 64, height: 64, seed: 888 });
    const flowMap2 = calculateFlow(heightMap2);
    const moistureMap2 = calculateMoisture(heightMap2, flowMap2);
    const biomeMap2 = generateBiomeMap(heightMap2, moistureMap2);
    const vegetation2 = initializeVegetation(biomeMap2);

    expect(checksumVegetationLegacy(vegetation1)).toBe(checksumVegetationLegacy(vegetation2));
  });

  it('should have values in [0, 1]', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 444 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    const vegetation = initializeVegetation(biomeMap);

    for (let i = 0; i < vegetation.data.length; i++) {
      expect(vegetation.data[i]).toBeGreaterThanOrEqual(0);
      expect(vegetation.data[i]).toBeLessThanOrEqual(1);
    }
  });

  it('should regrow deterministically', () => {
    const heightMap = generateHeightMap({ width: 32, height: 32, seed: 555 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    
    const vegetation1 = initializeVegetation(biomeMap);
    const vegetation2 = initializeVegetation(biomeMap);

    // Consume some vegetation
    vegetation1.consume(10, 10, 0.5);
    vegetation2.consume(10, 10, 0.5);

    // Update both
    updateVegetation(vegetation1, biomeMap, moistureMap, 0);
    updateVegetation(vegetation2, biomeMap, moistureMap, 0);

    expect(checksumVegetationLegacy(vegetation1)).toBe(checksumVegetationLegacy(vegetation2));
  });

  it('should consume vegetation correctly', () => {
    const heightMap = generateHeightMap({ width: 32, height: 32, seed: 666 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    const vegetation = initializeVegetation(biomeMap);

    const initial = vegetation.get(15, 15);
    const consumed = vegetation.consume(15, 15, 0.3);

    expect(consumed).toBeGreaterThan(0);
    expect(vegetation.get(15, 15)).toBe(initial - consumed);
  });
});
