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
    // Scarcity v1: Start below max so the world isn't fully saturated at tick 0
    INITIAL_BASE: 0.25,           // 25% of biome max
    INITIAL_MOISTURE_BONUS: 0.55, // +55% * moisture (0..1)

    MAX_DENSITY: {
      [BiomeType.OCEAN]: 0,
      [BiomeType.BEACH]: 0.1,
      [BiomeType.PLAINS]: 0.5,
      [BiomeType.FOREST]: 0.9,
      [BiomeType.DESERT]: 0.05,
      [BiomeType.MOUNTAIN]: 0.2,
      [BiomeType.SNOW]: 0,
    } as Record<BiomeType, number>,
    
    // Scarcity v1: Tuned down ~5-10x (prevents infinite food)
    GROWTH_RATE: {
      [BiomeType.OCEAN]: 0,
      [BiomeType.BEACH]: 0.0002,
      [BiomeType.PLAINS]: 0.0010,
      [BiomeType.FOREST]: 0.0020,
      [BiomeType.DESERT]: 0.0001,
      [BiomeType.MOUNTAIN]: 0.0005,
      [BiomeType.SNOW]: 0,
    } as Record<BiomeType, number>,
  },

  // Agent Rules
  AGENT: {
    MAX_HUNGER: 100,
    HUNGER_RATE: 0.1,
    MOVE_COST: 0.05, // Cost per tick when moving at speed 1

    // Scarcity v1: cap & decay stored energy so reproduction requires sustained intake
    MAX_ENERGY: 100,
    ENERGY_DECAY: 0.02, // per tick

    SENSE_RADIUS: 5,
    SPEED: 1,

    REPRODUCTION: {
      HUNGER_THRESHOLD: 15, // Must have hunger below this to reproduce (was 10)
      ENERGY_REQUIRED: 35,  // "Satiety" points required to produce offspring (was 50)

      // Scarcity v1: reproduction only in locally abundant cells
      MIN_LOCAL_VEG: 0.15,  // (was 0.25)

      // Scarcity v1: prevent rapid repeat births from the same agent
      COOLDOWN_TICKS: 240,  // (was 300)

      MUTATION_RATE: 0.1,   // Chance of a trait mutating
      MUTATION_AMOUNT: 0.2, // Max +/- change in trait value
    },
  },
};
