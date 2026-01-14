import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { World } from '../src/engine/world';
import { SeededRNG } from '../src/engine/rng';

/**
 * PHASE 2: Determinism Guardrails
 * 
 * These tests detect accidental non-determinism in the codebase.
 * They act as safety nets to catch:
 * - Usage of Math.random()
 * - Non-seeded RNG
 * - Iteration order dependencies
 * - Floating point instability
 * 
 * These tests should NEVER be disabled or removed.
 */

describe('Determinism Guardrails', () => {
  describe('Math.random() Protection', () => {
    let originalRandom: () => number;

    beforeEach(() => {
      // Save original Math.random
      originalRandom = Math.random;
    });

    afterEach(() => {
      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should not call Math.random() during world generation', () => {
      let randomCalled = false;

      Math.random = () => {
        randomCalled = true;
        return originalRandom();
      };

      new World({ width: 64, height: 64, seed: 12345 });

      expect(randomCalled).toBe(false);
    });

    it('should not call Math.random() during simulation', () => {
      const world = new World({ width: 64, height: 64, seed: 12345 });

      let randomCalled = false;
      Math.random = () => {
        randomCalled = true;
        return originalRandom();
      };

      for (let i = 0; i < 100; i++) {
        world.tick();
      }

      expect(randomCalled).toBe(false);
    });
  });

  describe('RNG Determinism', () => {
    it('should produce identical RNG sequences', () => {
      const rng1 = new SeededRNG(777);
      const rng2 = new SeededRNG(777);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 1000; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new SeededRNG(111);
      const rng2 = new SeededRNG(222);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should be reproducible after cloning', () => {
      const rng1 = new SeededRNG(999);
      
      // Advance state
      for (let i = 0; i < 50; i++) {
        rng1.next();
      }

      const rng2 = rng1.clone();

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('Object Iteration Order', () => {
    it('should produce same world regardless of property access order', () => {
      // Create worlds and access properties in different orders
      const world1 = new World({ width: 64, height: 64, seed: 555 });
      const _ = world1.heightMap;
      const __ = world1.flowMap;

      const world2 = new World({ width: 64, height: 64, seed: 555 });
      const ___ = world2.flowMap;
      const ____ = world2.heightMap;

      expect(world1.getChecksum().composite).toBe(world2.getChecksum().composite);
    });

    it('should handle agents in any order', () => {
      const world1 = new World({ width: 64, height: 64, seed: 888 });
      const world2 = new World({ width: 64, height: 64, seed: 888 });

      // Iterate agents in different orders
      for (const agent of world1.agents) {
        agent.update(world1.vegetationMap);
      }

      for (let i = world2.agents.length - 1; i >= 0; i--) {
        world2.agents[i].update(world2.vegetationMap);
      }

      // Different iteration order shouldn't matter for single agent
      // Both should have same final state
      expect(world1.agents[0].x).toBe(world2.agents[0].x);
      expect(world1.agents[0].y).toBe(world2.agents[0].y);
      expect(world1.agents[0].hunger).toBe(world2.agents[0].hunger);
    });
  });

  describe('Floating Point Stability', () => {
    it('should produce stable checksums with floating point operations', () => {
      const checksums: string[] = [];

      for (let run = 0; run < 10; run++) {
        const world = new World({ width: 64, height: 64, seed: 333 });

        for (let i = 0; i < 100; i++) {
          world.tick();
        }

        checksums.push(world.getChecksum().composite);
      }

      // All runs should produce identical checksums
      const unique = new Set(checksums);
      expect(unique.size).toBe(1);
    });

    it('should handle edge cases in height map', () => {
      const world1 = new World({ width: 64, height: 64, seed: 0 });
      const world2 = new World({ width: 64, height: 64, seed: 0 });

      // Check height values are in valid range
      for (let i = 0; i < world1.heightMap.data.length; i++) {
        const h1 = world1.heightMap.data[i];
        const h2 = world2.heightMap.data[i];

        expect(h1).toBe(h2);
        expect(h1).toBeGreaterThanOrEqual(0);
        expect(h1).toBeLessThanOrEqual(1);
        expect(Number.isFinite(h1)).toBe(true);
        expect(Number.isNaN(h1)).toBe(false);
      }
    });

    it('should handle division by zero gracefully', () => {
      // Create world with extreme seeds
      const extremeSeeds = [0, 1, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

      for (const seed of extremeSeeds) {
        expect(() => {
          const world = new World({ width: 32, height: 32, seed });
          for (let i = 0; i < 10; i++) {
            world.tick();
          }
          world.getChecksum();
        }).not.toThrow();
      }
    });
  });

  describe('Memory Layout Independence', () => {
    it('should produce same checksum regardless of allocation order', () => {
      // Create multiple worlds to potentially fragment memory
      const worlds = [];
      for (let i = 0; i < 5; i++) {
        worlds.push(new World({ width: 32, height: 32, seed: i }));
      }

      // Now create test worlds
      const world1 = new World({ width: 64, height: 64, seed: 777 });
      const checksum1 = world1.getChecksum().composite;

      // Create more objects to change memory layout
      const temp = new Array(1000).fill(0).map((_, i) => ({ value: i }));

      const world2 = new World({ width: 64, height: 64, seed: 777 });
      const checksum2 = world2.getChecksum().composite;

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('Tick Order Sensitivity', () => {
    it('should produce same result with sequential ticks', () => {
      const world1 = new World({ width: 64, height: 64, seed: 444 });
      const world2 = new World({ width: 64, height: 64, seed: 444 });

      // Tick sequentially
      for (let i = 0; i < 50; i++) {
        world1.tick();
      }

      // Tick in batches
      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 10; i++) {
          world2.tick();
        }
      }

      expect(world1.getChecksum().composite).toBe(world2.getChecksum().composite);
    });
  });

  describe('Regeneration Determinism', () => {
    it('should produce identical world after regeneration', () => {
      const world = new World({ width: 64, height: 64, seed: 111 });
      const checksum1 = world.getChecksum().composite;

      // Simulate for a while
      for (let i = 0; i < 50; i++) {
        world.tick();
      }

      // Regenerate with same seed
      world.regenerate(111);
      const checksum2 = world.getChecksum().composite;

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different world after regeneration with different seed', () => {
      const world = new World({ width: 64, height: 64, seed: 111 });
      const checksum1 = world.getChecksum().composite;

      world.regenerate(222);
      const checksum2 = world.getChecksum().composite;

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('Parallel Simulation Equivalence', () => {
    it('should produce same result when simulated in parallel conceptually', () => {
      // World 1: tick 100 times
      const world1 = new World({ width: 64, height: 64, seed: 666 });
      for (let i = 0; i < 100; i++) {
        world1.tick();
      }

      // World 2: create fresh and tick 100 times
      const world2 = new World({ width: 64, height: 64, seed: 666 });
      for (let i = 0; i < 100; i++) {
        world2.tick();
      }

      expect(world1.getChecksum().composite).toBe(world2.getChecksum().composite);
    });
  });

  describe('Cross-Platform Stability', () => {
    it('should use only deterministic operations', () => {
      // Verify typed arrays are used correctly
      const world = new World({ width: 64, height: 64, seed: 123 });

      expect(world.heightMap.data).toBeInstanceOf(Float32Array);
      expect(world.flowMap.flow).toBeInstanceOf(Uint32Array);
      expect(world.flowMap.isRiver).toBeInstanceOf(Uint8Array);
      expect(world.moistureMap.data).toBeInstanceOf(Float32Array);
      expect(world.biomeMap.data).toBeInstanceOf(Uint8Array);
      expect(world.vegetationMap.data).toBeInstanceOf(Float32Array);
    });
  });
});
