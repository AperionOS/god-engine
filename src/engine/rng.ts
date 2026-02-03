export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  // Mulberry32 - fast, deterministic PRNG
  next(): number {
    let z = (this.state += 0x6d2b79f5 | 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  // Returns float in [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Returns integer in [min, max]
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Clone RNG state
  clone(): SeededRNG {
    const cloned = new SeededRNG(0);
    cloned.state = this.state;
    return cloned;
  }

  // Get current state for serialization
  getState(): number {
    return this.state;
  }

  // Restore state for deserialization
  setState(state: number): void {
    this.state = state >>> 0;
  }
}
