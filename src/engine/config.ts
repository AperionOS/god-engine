import { BiomeType } from './enums';

export const WORLD_CONFIG = {
  // Height Map Thresholds (0-1)
  HEIGHT: {
    OCEAN_LEVEL: 0.3,
    BEACH_LEVEL: 0.35,
    MOUNTAIN_LEVEL: 0.65,
    SNOW_LEVEL: 0.8,
  },

  // Moisture Thresholds (0-1)
  MOISTURE: {
    DESERT_THRESHOLD: 0.3,
    FOREST_THRESHOLD: 0.6,
  },

  // Vegetation Rules
  VEGETATION: {
    MAX_DENSITY: {
      [BiomeType.OCEAN]: 0,
      [BiomeType.BEACH]: 0.1,
      [BiomeType.PLAINS]: 0.5,
      [BiomeType.FOREST]: 0.9,
      [BiomeType.DESERT]: 0.05,
      [BiomeType.MOUNTAIN]: 0.2,
      [BiomeType.SNOW]: 0,
    } as Record<BiomeType, number>,
    
    GROWTH_RATE: {
      [BiomeType.OCEAN]: 0,
      [BiomeType.BEACH]: 0.001,
      [BiomeType.PLAINS]: 0.005,
      [BiomeType.FOREST]: 0.01,
      [BiomeType.DESERT]: 0.0005,
      [BiomeType.MOUNTAIN]: 0.002,
      [BiomeType.SNOW]: 0,
    } as Record<BiomeType, number>,
  },

  // Agent Rules
  AGENT: {
    MAX_HUNGER: 100,
    HUNGER_RATE: 0.1,
    MOVE_COST: 0.05, // Cost per tick when moving at speed 1
    SENSE_RADIUS: 5,
    SPEED: 1,
    REPRODUCTION: {
      HUNGER_THRESHOLD: 10, // Must have hunger below this to reproduce
      ENERGY_REQUIRED: 50,  // "Satiety" points required to produce offspring
      MUTATION_RATE: 0.1,   // Chance of a trait mutating
      MUTATION_AMOUNT: 0.2, // Max +/- change in trait value
    }
  }
};
