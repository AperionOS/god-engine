import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../src/engine/rng';

describe('SeededRNG', () => {
  it('should produce deterministic values for same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should produce different values for different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    const vals1 = Array.from({ length: 10 }, () => rng1.next());
    const vals2 = Array.from({ length: 10 }, () => rng2.next());

    expect(vals1).not.toEqual(vals2);
  });

  it('should produce values in [0, 1)', () => {
    const rng = new SeededRNG(99999);

    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('should clone correctly', () => {
    const rng = new SeededRNG(11111);
    rng.next();
    rng.next();

    const cloned = rng.clone();

    expect(rng.next()).toBe(cloned.next());
  });

  it('should produce integers in specified range', () => {
    const rng = new SeededRNG(77777);

    for (let i = 0; i < 100; i++) {
      const val = rng.int(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});
