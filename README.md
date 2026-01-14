# God Engine

A deterministic, seed-driven 2D procedural world simulation rendered via HTML Canvas.

## 🎯 Project Goal

Build a living, breathing world where every system follows causal relationships:

```
height → water/flow → moisture → biome → vegetation/food → agent behavior
```

Every layer is **causal**, **explicit**, and **deterministic**. Same seed = identical world + identical simulation.

## ✨ Core Principles

- **Deterministic**: Same seed produces identical worlds and simulation steps
- **Engine/UI Separation**: Core simulation runs without DOM or Canvas dependencies
- **No Global Randomness**: All randomness comes from seeded RNG
- **Architected for Growth**: Simple foundation, expandable design
- **Visual Feedback**: Rendering exists as soon as maps exist

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test
```

Open your browser to `http://localhost:5173` to see the simulation.

## 🎮 Controls

- **Seed Input**: Enter a number to generate a specific world
- **Regenerate**: Create a new world with the current seed
- **Play/Pause**: Start or stop the simulation
- **Step**: Advance simulation by one tick
- **Speed Slider**: Control simulation speed (0.1x to 5x)
- **Layer Toggles**: Show/hide rivers and vegetation overlays

## 🌍 Systems Implemented (v0)

### ✅ Seeded RNG
- Mulberry32 PRNG implementation
- Deterministic random number generation
- Unit tested for consistency

### ✅ Height Map
- 256x256 grid world (configurable)
- Layered value noise with multiple octaves
- Normalized to [0, 1]
- Deterministic generation with checksums

### ✅ Water Flow & Rivers
- Downhill flow accumulation algorithm
- Each cell flows to lowest neighbor
- River threshold based on flow accumulation
- Deterministic river formation

### ✅ Moisture Map
- Distance-based moisture from rivers/water
- Elevation penalty for high terrain
- Influences biome and vegetation

### ✅ Biome Classification
Seven distinct biomes based on height + moisture:
- **Ocean**: Deep water (height < 0.3)
- **Beach**: Coastal areas (height 0.3-0.35)
- **Plains**: Grasslands (medium moisture)
- **Forest**: Dense vegetation (high moisture)
- **Desert**: Arid lands (low moisture)
- **Mountain**: Rocky peaks (height 0.65-0.8)
- **Snow**: High altitude (height > 0.8)

### ✅ Vegetation Layer
- Per-cell vegetation value [0, 1]
- Initial values depend on biome type
- Regrowth each tick based on moisture + biome
- Consumption by agents

### ✅ Agent System
- Single autonomous agent
- Senses nearby vegetation
- Moves toward food sources
- Consumes vegetation to reduce hunger
- Hunger increases over time

### ✅ Rendering
- Biome-colored terrain
- River overlay (toggleable)
- Vegetation density overlay (toggleable)
- Agent visualization
- 60 FPS performance at default world size

## 🏗️ Architecture

### Engine (`src/engine/`)
Pure TypeScript modules with no UI dependencies:
- `rng.ts` - Seeded random number generation
- `world.ts` - World container and tick loop
- `height.ts` - Height map generation
- `flow.ts` - Water flow accumulation
- `moisture.ts` - Moisture computation
- `biome.ts` - Biome classification
- `vegetation.ts` - Vegetation growth rules
- `agent.ts` - Agent behavior
- `checksum.ts` - Deterministic map hashing

### UI (`src/ui/`)
Canvas rendering and controls:
- `canvas.ts` - Canvas setup and utilities
- `renderers/` - Specialized renderers for each layer
- `controls.ts` - UI control bindings

### Main (`src/main.ts`)
Wires engine and UI together with game loop.

## 🧪 Testing

God Engine has comprehensive test coverage ensuring determinism:

```bash
pnpm test
```

**Test Suite**:
- ✅ 53 tests across 7 test files
- ✅ RNG produces identical sequences for same seed
- ✅ Height maps generate consistently
- ✅ Biome classification is deterministic
- ✅ Vegetation growth is reproducible
- ✅ Agent behavior is predictable
- ✅ **Phase 2**: Golden seed regression tests
- ✅ **Phase 2**: Determinism guardrails (Math.random detection, etc.)

**Phase 2 Determinism Contract**: See [PHASE2.md](PHASE2.md) for details on the enforced determinism guarantees and testing infrastructure.

## 🗺️ Roadmap

### Phase 1: Multiple Agents (Next)
- Population of agents with different behaviors
- Agent-to-agent interactions
- Reproduction and death mechanics

### Phase 2: Enhanced Environment
- Temperature system
- Seasonal changes
- Weather simulation
- Day/night cycle

### Phase 3: Evolution
- Agent genetics
- Natural selection
- Trait inheritance
- Species diversification

### Phase 4: Civilization
- Tool use and technology
- Shelter construction
- Resource gathering
- Social structures

### Phase 5: Emergent Complexity
- Trade networks
- Conflict resolution
- Cultural development
- Historical narrative generation

## 📊 Performance

- Default world size: 256x256 cells
- Target: 60 FPS rendering
- Efficient map generation with caching
- Static maps not recomputed per frame

## 🔬 Determinism Guarantees

Every system in God Engine is deterministic:

1. **Same seed** → **Same world** every time
2. **Same world + same inputs** → **Same simulation** every time
3. **All randomness** comes from **seeded RNG**
4. **No external dependencies** that could introduce non-determinism

This enables:
- Reproducible simulations
- Reliable testing
- Shared world seeds
- Debugging complex behaviors
- Scientific experimentation

## 🛠️ Technology Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast development and building
- **HTML Canvas 2D** - Rendering
- **Vitest** - Unit testing

## 📝 License

MIT

## 🤝 Contributing

This is an experimental project exploring procedural generation and emergent behavior. Contributions, ideas, and feedback are welcome!

---

**God Engine** - Where deterministic chaos creates living worlds.
