/**
 * World Serialization - Converts world state to/from binary format for storage
 */

import { World, WorldConfig } from './world';
import { HeightMap } from './height';
import { FlowMap, calculateFlow } from './flow';
import { MoistureMap, calculateMoisture } from './moisture';
import { BiomeMap, generateBiomeMap } from './biome';
import { VegetationMap, initializeVegetation } from './vegetation';
import { Agent, AgentState } from './agent';
import { HistoryLog, EventType, HistoryEvent } from './history';
import { SeededRNG } from './rng';

export const SERIALIZATION_VERSION = 1;

/**
 * Serialized format for world state
 * Designed for JSON compatibility with typed arrays encoded as base64
 */
export interface SerializedWorld {
  version: number;
  meta: {
    seed: number;
    tick: number;
    width: number;
    height: number;
    population: number;
    nextAgentId: number;
    isRealTerrain: boolean;
    locationName?: string;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  layers: {
    // Base64 encoded typed arrays
    heightMap: string;
    moistureMap: string;
    biomeMap: string;
    vegetationMap: string;
  };
  agents: SerializedAgent[];
  history: HistoryEvent[];
  rngState: number; // RNG state for deterministic resume
}

export interface SerializedAgent {
  id: number;
  x: number;
  y: number;
  hunger: number;
  energy: number;
  speed: number;
  senseRadius: number;
  state: string;
  maxHunger: number;
  maxEnergy: number;
  reproCooldown: number;
}

/**
 * Encode typed array to base64
 */
function encodeTypedArray(arr: Float32Array | Uint8Array): string {
  const bytes = new Uint8Array(arr.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode base64 to typed array
 */
function decodeToFloat32Array(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

function decodeToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Serialize a World instance to a JSON-compatible object
 */
export function serializeWorld(world: World): SerializedWorld {
  const serialized: SerializedWorld = {
    version: SERIALIZATION_VERSION,
    meta: {
      seed: world.seed,
      tick: world.tickCount,
      width: world.width,
      height: world.height,
      population: world.agents.length,
      nextAgentId: world.nextAgentId,
      isRealTerrain: world.isRealTerrain,
      locationName: world.heightMap.realTerrainMetadata?.locationName,
      bounds: world.heightMap.realTerrainMetadata?.bounds,
    },
    layers: {
      heightMap: encodeTypedArray(world.heightMap.data),
      moistureMap: encodeTypedArray(world.moistureMap.data),
      biomeMap: encodeTypedArray(world.biomeMap.data),
      vegetationMap: encodeTypedArray(world.vegetationMap.data),
    },
    agents: world.agents.map(agent => ({
      id: agent.id,
      x: agent.x,
      y: agent.y,
      hunger: agent.hunger,
      energy: agent.energy,
      speed: agent.speed,
      senseRadius: agent.senseRadius,
      state: agent.state,
      maxHunger: agent.maxHunger,
      maxEnergy: agent.maxEnergy,
      reproCooldown: agent.reproCooldown,
    })),
    history: world.history.events,
    rngState: world.rng.getState(),
  };

  return serialized;
}

/**
 * Deserialize a saved state into a new World instance
 */
export function deserializeWorld(data: SerializedWorld): World {
  if (data.version !== SERIALIZATION_VERSION) {
    throw new Error(`Unsupported serialization version: ${data.version}`);
  }

  const { meta, layers, agents, history, rngState } = data;

  // Create a minimal world config
  const config: WorldConfig = {
    width: meta.width,
    height: meta.height,
    seed: meta.seed,
    initialPopulation: 0, // We'll restore agents manually
  };

  // Create world but bypass normal generation
  const world = Object.create(World.prototype) as World;
  
  // Set readonly properties via Object.defineProperty
  Object.defineProperty(world, 'width', { value: meta.width, writable: false });
  Object.defineProperty(world, 'height', { value: meta.height, writable: false });
  Object.defineProperty(world, 'seed', { value: meta.seed, writable: false });
  Object.defineProperty(world, 'initialPopulation', { value: agents.length, writable: false });
  Object.defineProperty(world, 'isRealTerrain', { value: meta.isRealTerrain, writable: false });
  
  world.tickCount = meta.tick;
  world.nextAgentId = meta.nextAgentId;

  // Restore RNG state
  world.rng = new SeededRNG(meta.seed);
  world.rng.setState(rngState);

  // Restore height map
  const heightMap = new HeightMap(meta.width, meta.height);
  heightMap.data.set(decodeToFloat32Array(layers.heightMap));
  if (meta.locationName || meta.bounds) {
    heightMap.realTerrainMetadata = {
      locationName: meta.locationName || 'Unknown',
      minElevation: 0,
      maxElevation: 1,
      bounds: meta.bounds || { north: 0, south: 0, east: 0, west: 0 },
    };
  }
  world.heightMap = heightMap;

  // Restore moisture map
  const moistureMap = new MoistureMap(meta.width, meta.height);
  (moistureMap.data as Float32Array).set(decodeToFloat32Array(layers.moistureMap));
  world.moistureMap = moistureMap;

  // Restore biome map
  const biomeMap = new BiomeMap(meta.width, meta.height);
  (biomeMap.data as Uint8Array).set(decodeToUint8Array(layers.biomeMap));
  world.biomeMap = biomeMap;

  // Restore vegetation map
  const vegetationMap = new VegetationMap(meta.width, meta.height);
  (vegetationMap.data as Float32Array).set(decodeToFloat32Array(layers.vegetationMap));
  world.vegetationMap = vegetationMap;

  // Recalculate flow map (derived from height, not stored)
  world.flowMap = calculateFlow(heightMap);

  // Restore agents
  world.agents = agents.map(a => {
    const agent = new Agent({
      id: a.id,
      x: a.x,
      y: a.y,
      hunger: a.hunger,
      speed: a.speed,
      senseRadius: a.senseRadius,
      energy: a.energy,
    });
    agent.state = a.state as AgentState;
    agent.maxHunger = a.maxHunger;
    agent.maxEnergy = a.maxEnergy ?? 100; // Default for backwards compat
    agent.reproCooldown = a.reproCooldown ?? 0;
    return agent;
  });

  // Restore history
  world.history = new HistoryLog();
  for (const event of history) {
    world.history.log(event);
  }

  return world;
}

/**
 * Compress serialized world to a smaller string using simple compression
 * For larger worlds, consider using pako/gzip
 */
export function compressWorldData(data: SerializedWorld): string {
  return JSON.stringify(data);
}

/**
 * Decompress world data
 */
export function decompressWorldData(compressed: string): SerializedWorld {
  return JSON.parse(compressed) as SerializedWorld;
}
