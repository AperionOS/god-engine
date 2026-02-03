# God Engine

## 🔭 Project Overview

**God Engine** is a deterministic, seed-driven 2D procedural world simulation rendered via HTML Canvas.

The core philosophy is that every system follows a strict causal chain:
`Height → Flow → Moisture → Biome → Vegetation → Agents`

This ensures that the same seed always produces the exact same world and simulation trajectory, down to the individual tick.

### Core Principles
- **Determinism**: Same seed + Same inputs = Identical state.
- **Separation of Concerns**: `src/engine` contains pure logic with no DOM/Canvas dependencies. `src/ui` handles rendering.
- **No Global Randomness**: All RNG is seeded. `Math.random()` is strictly forbidden in the engine.

## 🛠 Tech Stack

- **Language**: TypeScript (Strict mode)
- **Bundler**: Vite
- **Testing**: Vitest
- **Rendering**: HTML5 Canvas API (2D Context)
- **Package Manager**: pnpm

## 🚀 Getting Started

### Installation
```bash
pnpm install
```

### Development Server
Starts the local development server at `http://localhost:5173`.
```bash
pnpm dev
```

### Running Tests
The test suite is critical for maintaining the determinism contract.
```bash
pnpm test
```

### Build for Production
```bash
pnpm build
```

## 🏗 Architecture

### 1. The Engine (`src/engine/`)
The engine is a pure state machine. It holds the `World` class which acts as the container for all simulation layers.

- **`World`**: The main entry point. Initializes layers and runs the `tick()` loop.
- **`HeightMap`**: Base layer. Value noise generation.
- **`FlowMap`**: Calculates water flow based on height differences.
- **`MoistureMap`**: Derived from flow and proximity to water.
- **`BiomeMap`**: Classifies cells based on Height + Moisture.
- **`VegetationMap`**: Dynamic layer that grows/dies based on biome rules.
- **`Agent`**: Autonomous entities with a Finite State Machine (IDLE, FORAGING, EATING, REPRODUCING, DEAD) and inheritable traits (speed, senseRadius).
- **`HistoryLog`**: Records simulation events (Deaths, Spawns, Parentage) for future lore generation.

### 2. The UI (`src/ui/`)
The UI observes the Engine state and renders it. It does **not** modify engine state directly (except for triggering regeneration via controls).

- **`Canvas`**: Manages the HTML canvas element and scaling.
- **`Renderers`**: Specialized modules for drawing terrain, rivers, vegetation, etc.

## 🧬 Determinism & Checksums

The project implements a **strict determinism contract** (detailed in `PHASE2.md`).

- **Golden Seeds**: Specific seeds (e.g., `12345`) are tested against known checksums to ensure no regressions occur in world generation.
- **Guardrails**: Tests actively check for forbidden usage of `Math.random()` or other non-deterministic patterns.
- **Checksums**: Every layer (`height`, `flow`, etc.) has a `checksum*` function. The `World` class aggregates these into a composite hash.

**If you break a golden seed test, you have likely broken determinism.**

## 📂 Project Structure

```text
src/
├── engine/           # Pure simulation logic (NO UI code here)
│   ├── world.ts      # Main simulation container
│   ├── rng.ts        # Seeded Random Number Generator
│   ├── checksum.ts   # Hashing functions for state verification
│   └── [systems].ts  # Individual systems (height, biome, etc.)
├── ui/               # Rendering and DOM interaction
│   ├── canvas.ts     # Canvas setup
│   └── renderers/    # Visual logic
├── main.ts           # Entry point (wires Engine + UI)
└── style.css         # Global styles
tests/
├── golden-seeds.test.ts # REGRESSION TESTS (Critical)
└── [system].test.ts     # Unit tests for specific systems
```

## 📝 Development Guidelines

1.  **Preserve Determinism**: Never introduce non-seeded randomness.
2.  **Engine/UI Split**: Keep simulation logic out of the UI and UI logic out of the Engine.
3.  **Test Often**: Run `pnpm test` before committing to ensure checksums match.
4.  **Performance**: The engine runs on a loop. Avoid heavy per-tick allocations.
