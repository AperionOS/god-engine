import { generateHeightMap, HeightMap } from './height';
import { calculateFlow, FlowMap } from './flow';
import { calculateMoisture, MoistureMap } from './moisture';
import { generateBiomeMap, BiomeMap } from './biome';
import { initializeVegetation, updateVegetation, VegetationMap } from './vegetation';
import { Agent, AgentConfig, AgentState } from './agent';
import { SeededRNG } from './rng';
import { HistoryLog, EventType } from './history';
import { BiomeType } from './enums';
import {
  checksumHeightMap,
  checksumFlowMap,
  checksumMoistureMap,
  checksumBiomeMap,
  checksumVegetation,
  checksumAgents,
} from './checksum';

export interface WorldConfig {
  width?: number;
  height?: number;
  seed: number;
  initialPopulation?: number;
  /** Pre-generated height map (for real terrain) */
  heightMap?: HeightMap;
}

/**
 * Composite checksum of entire world state
 * Used for determinism verification and regression testing
 */
export interface WorldChecksum {
  tick: number;
  seed: number;
  height: string;
  flow: string;
  moisture: string;
  biome: string;
  vegetation: string;
  agents: string;
  composite: string;
}

export class World {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly initialPopulation: number;
  
  /** True if using real terrain data */
  readonly isRealTerrain: boolean;

  heightMap!: HeightMap;
  flowMap!: FlowMap;
  moistureMap!: MoistureMap;
  biomeMap!: BiomeMap;
  vegetationMap!: VegetationMap;
  agents: Agent[] = [];
  nextAgentId: number = 1;
  rng!: SeededRNG;
  history: HistoryLog = new HistoryLog();

  tickCount: number = 0;
  
  private _externalHeightMap?: HeightMap;

  constructor(config: WorldConfig) {
    this.width = config.width ?? 256;
    this.height = config.height ?? 256;
    this.seed = config.seed;
    this.initialPopulation = config.initialPopulation ?? 10;
    this._externalHeightMap = config.heightMap;
    this.isRealTerrain = !!config.heightMap;
    this.generate();
  }

  private generate(): void {
    // Initialize persistent RNG for simulation
    this.rng = new SeededRNG(this.seed);
    this.history.clear();
    
    const terrainType = this._externalHeightMap?.realTerrainMetadata?.locationName 
      ? `Real Terrain: ${this._externalHeightMap.realTerrainMetadata.locationName}`
      : `Procedural Seed: ${this.seed}`;
    
    this.history.log({
      tick: 0,
      type: EventType.WORLD_GENERATE,
      details: terrainType,
    });

    // Use external height map if provided, otherwise generate procedurally
    if (this._externalHeightMap) {
      this.heightMap = this._externalHeightMap;
    } else {
      this.heightMap = generateHeightMap({
        width: this.width,
        height: this.height,
        seed: this.seed,
      });
    }

    this.flowMap = calculateFlow(this.heightMap);
    this.moistureMap = calculateMoisture(this.heightMap, this.flowMap);
    this.biomeMap = generateBiomeMap(this.heightMap, this.moistureMap);
    this.vegetationMap = initializeVegetation(this.biomeMap);

    // Initial population spawning
    this.nextAgentId = 1;
    this.agents = [];

    let attempts = 0;
    while (this.agents.length < this.initialPopulation && attempts < 1000) {
      const x = this.rng.range(0, this.width - 1);
      const y = this.rng.range(0, this.height - 1);
      
      const biome = this.biomeMap.get(Math.floor(x), Math.floor(y));
      if (biome !== BiomeType.OCEAN) {
        this.agents.push(new Agent({
          id: this.nextAgentId++,
          x,
          y,
        }));
      }
      attempts++;
    }

    this.tickCount = 0;
  }

  tick(): void {
    // GUARD: Strictly forbid Math.random() during simulation
    const originalRandom = Math.random;
    Math.random = () => {
      throw new Error('Non-deterministic Math.random() called during simulation! Use World.rng instead.');
    };

    try {
      updateVegetation(this.vegetationMap, this.biomeMap, this.moistureMap, this.tickCount);

      // Sort agents by ID to ensure deterministic update order
      this.agents.sort((a, b) => a.id - b.id);

      // Filter out dead agents and process updates
      const nextAgents: Agent[] = [];
      
      for (const agent of this.agents) {
        agent.update(this.vegetationMap, this.rng);

        if (agent.isDead()) {
          // Return nutrients to soil
          const x = Math.floor(agent.x);
          const y = Math.floor(agent.y);
          const currentVeg = this.vegetationMap.get(x, y);
          this.vegetationMap.set(x, y, currentVeg + 0.5); // Carcass nutrients
          
          this.history.log({
            tick: this.tickCount,
            type: EventType.AGENT_DEATH,
            x: agent.x,
            y: agent.y,
            details: 'Starvation',
          });
          continue; // Remove from list
        }

        // Handle reproduction
        if (agent.state === AgentState.REPRODUCING) {
          const offspring = agent.reproduce(this.nextAgentId++, this.rng);
          nextAgents.push(offspring);
          
          this.history.log({
            tick: this.tickCount,
            type: EventType.AGENT_SPAWN,
            x: offspring.x,
            y: offspring.y,
            details: `Parent: ${agent.id}`,
          });
        }

        nextAgents.push(agent);
      }

      this.agents = nextAgents;
      this.tickCount++;
    } finally {
      // Restore Math.random
      Math.random = originalRandom;
    }
  }

  regenerate(seed: number): void {
    (this as { seed: number }).seed = seed;
    this._externalHeightMap = undefined; // Clear real terrain on regenerate
    (this as { isRealTerrain: boolean }).isRealTerrain = false;
    this.generate();
  }
  
  /**
   * Load real terrain data and regenerate the world
   */
  loadRealTerrain(heightMap: HeightMap): void {
    this._externalHeightMap = heightMap;
    (this as { isRealTerrain: boolean }).isRealTerrain = true;
    this.generate();
  }

  /**
   * Generate a complete checksum of the world state
   * This captures all mutable state and can be used to verify determinism
   */
  getChecksum(): WorldChecksum {
    const heightHash = checksumHeightMap(this.heightMap);
    const flowHash = checksumFlowMap(this.flowMap);
    const moistureHash = checksumMoistureMap(this.moistureMap);
    const biomeHash = checksumBiomeMap(this.biomeMap);
    const vegetationHash = checksumVegetation(this.vegetationMap);
    const agentsHash = checksumAgents(this.agents);

    // Composite hash combines all layer hashes
    const composite = [
      `tick:${this.tickCount}`,
      `seed:${this.seed}`,
      heightHash,
      flowHash,
      moistureHash,
      biomeHash,
      vegetationHash,
      agentsHash,
    ].join('|');

    // Simple hash of the composite
    let hash = 0;
    for (let i = 0; i < composite.length; i++) {
      hash = ((hash << 5) - hash) + composite.charCodeAt(i);
      hash = hash & hash;
    }

    return {
      tick: this.tickCount,
      seed: this.seed,
      height: heightHash,
      flow: flowHash,
      moisture: moistureHash,
      biome: biomeHash,
      vegetation: vegetationHash,
      agents: agentsHash,
      composite: (hash >>> 0).toString(36),
    };
  }
}
