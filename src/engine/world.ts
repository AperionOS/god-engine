import { generateHeightMap, HeightMap } from './height';
import { calculateFlow, FlowMap } from './flow';
import { calculateMoisture, MoistureMap } from './moisture';
import { generateBiomeMap, BiomeMap } from './biome';
import { initializeVegetation, updateVegetation, VegetationMap } from './vegetation';
import { Agent, AgentConfig } from './agent';
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

  heightMap!: HeightMap;
  flowMap!: FlowMap;
  moistureMap!: MoistureMap;
  biomeMap!: BiomeMap;
  vegetationMap!: VegetationMap;
  agents: Agent[] = [];

  tickCount: number = 0;

  constructor(config: WorldConfig) {
    this.width = config.width ?? 256;
    this.height = config.height ?? 256;
    this.seed = config.seed;
    this.generate();
  }

  private generate(): void {
    this.heightMap = generateHeightMap({
      width: this.width,
      height: this.height,
      seed: this.seed,
    });

    this.flowMap = calculateFlow(this.heightMap);
    this.moistureMap = calculateMoisture(this.heightMap, this.flowMap);
    this.biomeMap = generateBiomeMap(this.heightMap, this.moistureMap);
    this.vegetationMap = initializeVegetation(this.biomeMap);

    // Add a single agent in the center
    this.agents = [
      new Agent({
        x: this.width / 2,
        y: this.height / 2,
      }),
    ];

    this.tickCount = 0;
  }

  tick(): void {
    updateVegetation(this.vegetationMap, this.biomeMap, this.moistureMap);

    for (const agent of this.agents) {
      agent.update(this.vegetationMap);
    }

    this.tickCount++;
  }

  regenerate(seed: number): void {
    (this as { seed: number }).seed = seed;
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
