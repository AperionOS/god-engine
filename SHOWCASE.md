# Evolution & Population Update

Phase 3 is now live. The "God Engine" has transitioned from a single-agent simulation to a population-based evolutionary ecosystem.

## 1. Population Dynamics
- **Land-Based Spawning**: The world now initializes with a configurable population (default: 10) of agents, automatically placed on non-ocean tiles.
- **Reproduction**: Agents that manage their hunger well and accumulate enough "Satiety Energy" will now enter a `REPRODUCING` state.
- **Monotonic ID Preservation**: Offspring are assigned unique, sequential IDs, maintaining perfect determinism in the update loop.

## 2. Genetic Traits & Mutation
Agents now possess inheritable traits that define their survival strategy:
- **`speed`**: How fast the agent moves. Higher speed helps find food but increases the metabolic cost of movement.
- **`senseRadius`**: How far the agent can "see" vegetation. Larger radius improves foraging efficiency but consumes more energy (to be balanced in future updates).
- **Mutations**: Offspring have a 10% chance to mutate traits by up to +/- 0.2. This enables natural selection—agents with better traits will survive longer and reproduce more.

## 3. Advanced Metabolism
- **Move Cost**: Movement now has a metabolic cost proportional to distance and speed.
- **Satiety Energy**: Eating restores hunger AND provides the energy required for reproduction.
- **Starvation**: If hunger reaches 100, the agent dies, leaving nutrients for the land.

## 4. Lineage Tracking
- The `HistoryLog` now tracks `AGENT_SPAWN` events including parentage (e.g., "Parent: 5").
- This allows for the future generation of "Family Trees" and evolutionary history.

## Verification
- ✅ All 53 tests passed.
- ✅ Determinism maintained across population spikes and mutations.
- ✅ Strided vegetation updates continue to ensure performance.
