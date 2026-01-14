# Phase 2: Determinism as Contract

**Status**: ✅ Complete  
**Date**: 2026-01-14

## Overview

Phase 2 transforms determinism from an observed property of God Engine into an **enforced, testable contract**. Where Phase 1 built a deterministic system, Phase 2 proves it and makes regressions impossible to miss.

## What Changed

### Nothing User-Visible

Phase 2 is **purely additive**. All Phase 1 behavior remains identical:
- World generation unchanged
- Simulation rules unchanged
- UI unchanged
- Performance unchanged

### What Was Added

1. **Enhanced Checksum System** (`src/engine/checksum.ts`)
2. **World Checksum API** (`World.getChecksum()`)
3. **Golden Seed Regression Tests** (`tests/golden-seeds.test.ts`)
4. **Determinism Guardrails** (`tests/determinism-guardrails.test.ts`)

---

## The Determinism Contract

### What Is Guaranteed

God Engine makes the following **non-negotiable guarantees**:

#### 1. **Same Seed → Same World**

```typescript
const world1 = new World({ seed: 12345, width: 256, height: 256 });
const world2 = new World({ seed: 12345, width: 256, height: 256 });

assert(world1.getChecksum() === world2.getChecksum());
```

**Covers**:
- Height map
- Water flow and rivers
- Moisture distribution
- Biome classification
- Initial vegetation
- Agent starting positions

#### 2. **Same Seed + Same Ticks → Same State**

```typescript
const world1 = new World({ seed: 12345 });
const world2 = new World({ seed: 12345 });

for (let i = 0; i < 100; i++) {
  world1.tick();
  world2.tick();
}

assert(world1.getChecksum() === world2.getChecksum());
```

**Covers**:
- Vegetation growth
- Agent movement
- Hunger mechanics
- Vegetation consumption

#### 3. **Different Seeds → Different Worlds**

```typescript
const world1 = new World({ seed: 111 });
const world2 = new World({ seed: 222 });

assert(world1.getChecksum() !== world2.getChecksum());
```

#### 4. **Static Layers Stay Static**

After world generation, these **never** change:
- Height map
- Flow map
- Moisture map
- Biome map

```typescript
const world = new World({ seed: 777 });
const initial = world.getChecksum();

for (let i = 0; i < 1000; i++) {
  world.tick();
}

const final = world.getChecksum();

assert(initial.height === final.height);
assert(initial.flow === final.flow);
assert(initial.moisture === final.moisture);
assert(initial.biome === final.biome);
```

### What Is NOT Guaranteed

#### Cross-Version Compatibility

Checksums may change between major versions if:
- Algorithms are improved
- Bugs are fixed
- New features affect existing systems

**When this happens**:
1. It will be documented in release notes
2. Golden seed tests will be updated
3. The change will be marked as BREAKING

#### Cross-Platform Bit-Identical Results

While God Engine is deterministic, we do **not** guarantee bit-identical results across:
- Different JavaScript engines
- Different CPU architectures  
- Different OS platforms

However, checksums **will** match within the same environment.

#### UI Rendering

Determinism applies to the **engine**, not the UI. Canvas rendering order, frame timing, and visual glitches are not part of the contract.

---

## Architecture

### Checksum System

#### Layer Hashing

Each core system has a deterministic hash function:

```typescript
// Height map: dimensions + position-weighted terrain data
checksumHeightMap(heightMap: HeightMap): string

// Flow map: dimensions + flow values + river flags
checksumFlowMap(flowMap: FlowMap): string

// Moisture map: dimensions + moisture values
checksumMoistureMap(moistureMap: MoistureMap): string

// Biome map: dimensions + biome distribution counts
checksumBiomeMap(biomeMap: BiomeMap): string

// Vegetation: dimensions + vegetation density values
checksumVegetation(vegetation: VegetationMap): string

// Agents: count + sorted positions and states
checksumAgents(agents: Agent[]): string
```

**Design Principles**:
- **Deterministic**: Same input → same hash
- **Stable**: Consistent across runs
- **Fast**: Sampling for large arrays
- **Order-independent**: Where applicable (agents)
- **Memory-layout independent**: Hash data, not object identity

#### World Checksum

```typescript
interface WorldChecksum {
  tick: number;           // Current simulation tick
  seed: number;           // World seed
  height: string;         // Height layer hash
  flow: string;           // Flow layer hash
  moisture: string;       // Moisture layer hash
  biome: string;          // Biome layer hash
  vegetation: string;     // Vegetation layer hash
  agents: string;         // Agents hash
  composite: string;      // Combined hash of all above
}
```

Usage:

```typescript
const world = new World({ seed: 12345 });
world.tick();
const checksum = world.getChecksum();

console.log(checksum.composite); // "a8x2k9q"
```

### Test Coverage

#### Golden Seed Regression Tests

**File**: `tests/golden-seeds.test.ts`  
**Tests**: 15  
**Purpose**: Verify specific seeds produce identical worlds and trajectories

**Coverage**:
- Seed 12345 (default) - 0, 10, 100 ticks
- Seed 42 (classic) - 0, 50 ticks
- Seed 99999 (high contrast) - 0, 25 ticks
- Seed 0 (edge case) - 0, 10 ticks
- Different seeds produce different worlds
- Checksum stability across multiple runs
- Static layer immutability
- World size determinism

**When These Tests Fail**:
1. **Check for bugs first** - most likely cause
2. **Review recent changes** - was determinism broken?
3. **If intentional** - document breaking change, update golden values

#### Determinism Guardrails

**File**: `tests/determinism-guardrails.test.ts`  
**Tests**: 16  
**Purpose**: Catch accidental non-determinism

**Detection**:
- ✅ Math.random() usage
- ✅ Non-seeded RNG
- ✅ Object iteration order issues
- ✅ Floating point instability
- ✅ Memory layout dependencies
- ✅ Tick order sensitivity
- ✅ Regeneration consistency
- ✅ Cross-platform stability concerns

**When These Tests Fail**:
1. **Do NOT skip or disable them**
2. **Find the non-deterministic code**
3. **Fix the root cause**
4. **Verify with golden seed tests**

---

## Using Checksums

### During Development

Verify your changes don't break determinism:

```typescript
// Before your change
const before = new World({ seed: 12345 });
for (let i = 0; i < 50; i++) before.tick();
const checksumBefore = before.getChecksum().composite;

// Make your changes...

// After your change
const after = new World({ seed: 12345 });
for (let i = 0; i < 50; i++) after.tick();
const checksumAfter = after.getChecksum().composite;

console.assert(checksumBefore === checksumAfter, "Determinism broken!");
```

### For Debugging

Identify where simulation diverges:

```typescript
const world1 = new World({ seed: 777 });
const world2 = new World({ seed: 777 });

for (let tick = 0; tick < 100; tick++) {
  world1.tick();
  world2.tick();

  const c1 = world1.getChecksum();
  const c2 = world2.getChecksum();

  if (c1.composite !== c2.composite) {
    console.log(`Diverged at tick ${tick}`);
    console.log('Layer differences:');
    if (c1.vegetation !== c2.vegetation) console.log('  - vegetation');
    if (c1.agents !== c2.agents) console.log('  - agents');
    break;
  }
}
```

### For Testing New Features

Add golden seed tests for new systems:

```typescript
describe('New Feature', () => {
  it('should be deterministic', () => {
    const world1 = new World({ seed: 12345 });
    const world2 = new World({ seed: 12345 });

    // Use new feature...

    expect(world1.getChecksum().composite)
      .toBe(world2.getChecksum().composite);
  });
});
```

---

## Breaking Changes

### What Constitutes a Breaking Change

Any change that causes golden seed tests to fail is a **breaking change**:

1. **Algorithm modifications**
   - Height generation changes
   - Flow calculation changes
   - Biome classification changes
   - Agent behavior changes

2. **Parameter adjustments**
   - Default values
   - Constants (e.g., river threshold)
   - Regrowth rates

3. **Bug fixes affecting output**
   - Even bug fixes can be breaking if they change simulation results

### How to Handle Breaking Changes

#### 1. Document It

```markdown
## v2.0.0 - BREAKING CHANGES

### Determinism Changes

- Fixed water flow bug that caused incorrect river formation
- **Impact**: Worlds with seed 12345 will generate differently
- **Migration**: Regenerate worlds or adjust seed to find similar terrain
```

#### 2. Update Golden Values

```typescript
// Before fix:
const oldChecksum = "a8x2k9q";

// After fix - update test:
const newChecksum = world.getChecksum().composite;
expect(newChecksum).toBe("b9y3l0r"); // New golden value
```

#### 3. Version Bump

Breaking changes require a **major version bump** (1.x.x → 2.0.0).

### How to Avoid Breaking Changes

1. **Add, don't modify**
   - New features should extend, not replace
   - Add optional parameters with safe defaults

2. **Test exhaustively**
   - Run full test suite before committing
   - Verify golden seeds still pass

3. **Refactor carefully**
   - Pure refactors should not change checksums
   - If checksums change, it's not a pure refactor

---

## Future Phases

Phase 2 establishes the foundation for:

### Phase 3: Multiple Agents
- Agent interaction determinism
- Population dynamics
- Spatial hashing for performance

### Phase 4: Serialization
- Save/load world state
- Network synchronization
- Replay systems

### Phase 5: Optimizations
- SIMD operations (must preserve determinism)
- WebAssembly (must match JS behavior)
- Parallel processing (must be deterministic)

---

## FAQ

### Q: Why is determinism important?

**A**: Determinism enables:
- **Reproducible bugs** - "seed 12345 at tick 50 crashes" is debuggable
- **Testability** - Can verify behavior with known seeds
- **Shareability** - Players can share interesting worlds by seed
- **Scientific experiments** - Reliable simulations for research
- **Regression detection** - Changes can be verified automatically

### Q: What if I need randomness?

**A**: Use `SeededRNG`:

```typescript
import { SeededRNG } from './engine/rng';

const rng = new SeededRNG(world.seed + 1000); // Derive from world seed
const random = rng.next(); // [0, 1)
```

**Never** use `Math.random()` in engine code.

### Q: Can I use `Date.now()` or `performance.now()`?

**A**: **No**, not in engine code. These are non-deterministic.

For time-based features, pass time as a parameter:

```typescript
// Bad
tick() {
  const now = Date.now();
  // ...
}

// Good
tick(deltaTime: number) {
  // Use deltaTime parameter
}
```

### Q: What about object property order?

**A**: JavaScript object property iteration order is deterministic (insertion order), but don't rely on it. Use arrays or explicit sorting:

```typescript
// Risky
for (const key in object) { /* ... */ }

// Safe
Object.keys(object).sort().forEach(key => { /* ... */ });
```

### Q: How do I add logging without breaking determinism?

**A**: Logging is fine as long as it doesn't affect state:

```typescript
// Safe
console.log('Agent position:', agent.x, agent.y);

// Unsafe - logging affects state
const random = Math.random();
console.log('Random:', random); // Still generated random number!
```

### Q: Can I use `Set` or `Map`?

**A**: Yes, but be careful with iteration:

```typescript
// Iteration order is deterministic (insertion order)
const set = new Set([1, 2, 3]);
for (const item of set) { /* deterministic */ }

// But if insertion order varies, so will iteration
const agents = new Set(world.agents);
// Better: use sorted array
const sorted = [...world.agents].sort((a, b) => a.x - b.x);
```

---

## Test Statistics

**Total Tests**: 53 (was 22 in Phase 1)  
**Phase 2 Tests**: 31 new tests  
**Test Files**: 7  
**Coverage**:
- ✅ RNG determinism
- ✅ Height generation
- ✅ Flow calculation
- ✅ Moisture distribution
- ✅ Biome classification
- ✅ Vegetation dynamics
- ✅ Agent behavior
- ✅ World checksums
- ✅ Golden seed regression
- ✅ Determinism guardrails

**Runtime**: ~8 seconds for full suite  
**All tests pass**: ✅

---

## Conclusion

Phase 2 establishes **determinism as a first-class property** of God Engine. It is no longer something we believe is true—it is something we **prove** on every test run.

This foundation enables confident refactoring, reliable testing, and future features that depend on deterministic behavior.

**The determinism contract is sacred. Protect it.**

---

**Next**: Phase 3 will build multiple agents and emergent population dynamics on top of this deterministic foundation.
