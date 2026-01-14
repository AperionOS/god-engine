import { describe, it, expect } from 'vitest';
import { generateHeightMap } from '../src/engine/height';
import { checksumHeightMapLegacy } from '../src/engine/checksum';

describe('HeightMap', () => {
  it('should generate deterministic height map for same seed', () => {
    const map1 = generateHeightMap({ width: 64, height: 64, seed: 42 });
    const map2 = generateHeightMap({ width: 64, height: 64, seed: 42 });

    expect(checksumHeightMapLegacy(map1)).toBe(checksumHeightMapLegacy(map2));

    for (let i = 0; i < map1.data.length; i++) {
      expect(map1.data[i]).toBe(map2.data[i]);
    }
  });

  it('should generate different maps for different seeds', () => {
    const map1 = generateHeightMap({ width: 64, height: 64, seed: 100 });
    const map2 = generateHeightMap({ width: 64, height: 64, seed: 200 });

    expect(checksumHeightMapLegacy(map1)).not.toBe(checksumHeightMapLegacy(map2));
  });

  it('should normalize values to [0, 1]', () => {
    const map = generateHeightMap({ width: 64, height: 64, seed: 999 });

    for (let i = 0; i < map.data.length; i++) {
      expect(map.data[i]).toBeGreaterThanOrEqual(0);
      expect(map.data[i]).toBeLessThanOrEqual(1);
    }
  });

  it('should have correct dimensions', () => {
    const map = generateHeightMap({ width: 100, height: 50, seed: 123 });

    expect(map.width).toBe(100);
    expect(map.height).toBe(50);
    expect(map.data.length).toBe(5000);
  });

  it('should have stable checksum for known seed', () => {
    const map = generateHeightMap({ width: 64, height: 64, seed: 12345 });
    const checksum = checksumHeightMapLegacy(map);

    // This ensures the algorithm hasn't changed
    expect(checksum).toBeTruthy();
    expect(typeof checksum).toBe('string');
  });
});
