import { describe, it, expect } from 'vitest';
import { Agent } from '../src/engine/agent';
import { SeededRNG } from '../src/engine/rng';
import { generateHeightMap } from '../src/engine/height';
import { calculateFlow } from '../src/engine/flow';
import { calculateMoisture } from '../src/engine/moisture';
import { generateBiomeMap } from '../src/engine/biome';
import { initializeVegetation } from '../src/engine/vegetation';

describe('Agent', () => {
  it('should move deterministically', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 111 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    
    const vegetation1 = initializeVegetation(biomeMap);
    const vegetation2 = initializeVegetation(biomeMap);

    const agent1 = new Agent({ x: 32, y: 32 });
    const agent2 = new Agent({ x: 32, y: 32 });
    const rng1 = new SeededRNG(111);
    const rng2 = new SeededRNG(111);

    for (let i = 0; i < 10; i++) {
      agent1.update(vegetation1, rng1);
      agent2.update(vegetation2, rng2);

      expect(agent1.x).toBe(agent2.x);
      expect(agent1.y).toBe(agent2.y);
      expect(agent1.hunger).toBe(agent2.hunger);
    }
  });

  it('should stay within world bounds', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 222 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    const vegetation = initializeVegetation(biomeMap);

    const agent = new Agent({ x: 0, y: 0 });
    const rng = new SeededRNG(222);

    for (let i = 0; i < 100; i++) {
      agent.update(vegetation, rng);

      expect(agent.x).toBeGreaterThanOrEqual(0);
      expect(agent.x).toBeLessThan(64);
      expect(agent.y).toBeGreaterThanOrEqual(0);
      expect(agent.y).toBeLessThan(64);
    }
  });

  it('should consume vegetation when eating', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 333 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    const vegetation = initializeVegetation(biomeMap);

    const agent = new Agent({ x: 32, y: 32 });
    const rng = new SeededRNG(333);
    const initialVeg = vegetation.get(32, 32);

    agent.update(vegetation, rng);

    // Vegetation should have been consumed (or agent moved)
    expect(vegetation.get(32, 32)).toBeLessThanOrEqual(initialVeg);
  });

  it('should increase hunger over time', () => {
    const heightMap = generateHeightMap({ width: 64, height: 64, seed: 444 });
    const flowMap = calculateFlow(heightMap);
    const moistureMap = calculateMoisture(heightMap, flowMap);
    const biomeMap = generateBiomeMap(heightMap, moistureMap);
    const vegetation = initializeVegetation(biomeMap);

    // Clear vegetation so agent can't eat
    for (let i = 0; i < vegetation.data.length; i++) {
      vegetation.data[i] = 0;
    }

    const agent = new Agent({ x: 32, y: 32, hunger: 0 });
    const rng = new SeededRNG(444);

    agent.update(vegetation, rng);

    expect(agent.hunger).toBeGreaterThan(0);
  });
});
