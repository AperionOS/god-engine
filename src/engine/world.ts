import { generateHeightMap, HeightMap } from './height';
import { calculateFlow, FlowMap } from './flow';
import { calculateMoisture, MoistureMap } from './moisture';
import { generateBiomeMap, BiomeMap } from './biome';
import { initializeVegetation, updateVegetation, VegetationMap } from './vegetation';
import { Agent, AgentConfig } from './agent';

export interface WorldConfig {
  width?: number;
  height?: number;
  seed: number;
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
}
