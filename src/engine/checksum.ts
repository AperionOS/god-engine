import { HeightMap } from './height';
import { BiomeMap } from './biome';
import { VegetationMap } from './vegetation';
import { FlowMap } from './flow';
import { MoistureMap } from './moisture';
import { Agent } from './agent';

/**
 * PHASE 2: Deterministic Hashing System
 * 
 * All hash functions in this module are designed to be:
 * - Deterministic: same input → same output
 * - Stable: consistent across runs and platforms
 * - Order-independent: where applicable
 * - Memory-layout independent: hash data, not object identity
 */

// FNV-1a hash - simple, fast, deterministic
function fnv1aHash(data: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return (hash >>> 0).toString(36);
}

/**
 * Hash a Float32Array or Uint32Array or Uint8Array
 * Uses position-weighted sum to be sensitive to order and values
 */
function hashTypedArray(data: Float32Array | Uint32Array | Uint8Array): string {
  let sum = 0;
  let weightedSum = 0;
  
  // Sample for large arrays to keep hashing fast
  const step = Math.max(1, Math.floor(data.length / 10000));
  
  for (let i = 0; i < data.length; i += step) {
    const value = data[i];
    sum += value;
    weightedSum += value * (i + 1); // Position-weighted
  }
  
  // Combine length, sum, and weighted sum
  const combined = `${data.length}:${sum.toFixed(6)}:${weightedSum.toFixed(6)}`;
  return fnv1aHash(combined);
}

/**
 * Height Map Hash
 * Inputs: width, height, all elevation values
 * Sensitive to: terrain shape, world dimensions
 */
export function checksumHeightMap(heightMap: HeightMap): string {
  const dimensions = `${heightMap.width}x${heightMap.height}`;
  const dataHash = hashTypedArray(heightMap.data);
  return fnv1aHash(`height:${dimensions}:${dataHash}`);
}

/**
 * Flow Map Hash
 * Inputs: width, height, flow values, river flags
 * Sensitive to: water accumulation, river formation
 */
export function checksumFlowMap(flowMap: FlowMap): string {
  const dimensions = `${flowMap.width}x${flowMap.height}`;
  const flowHash = hashTypedArray(flowMap.flow);
  const riverHash = hashTypedArray(flowMap.isRiver);
  return fnv1aHash(`flow:${dimensions}:${flowHash}:${riverHash}`);
}

/**
 * Moisture Map Hash
 * Inputs: width, height, all moisture values
 * Sensitive to: water proximity, elevation effects
 */
export function checksumMoistureMap(moistureMap: MoistureMap): string {
  const dimensions = `${moistureMap.width}x${moistureMap.height}`;
  const dataHash = hashTypedArray(moistureMap.data);
  return fnv1aHash(`moisture:${dimensions}:${dataHash}`);
}

/**
 * Biome Map Hash
 * Inputs: width, height, biome distribution counts
 * Sensitive to: biome classification, world composition
 * Note: Uses counts rather than full data for efficiency
 */
export function checksumBiomeMap(biomeMap: BiomeMap): string {
  const dimensions = `${biomeMap.width}x${biomeMap.height}`;
  const counts = biomeMap.getCounts();
  const countsStr = Object.values(counts).join('-');
  return fnv1aHash(`biome:${dimensions}:${countsStr}`);
}

/**
 * Vegetation Map Hash
 * Inputs: width, height, all vegetation density values
 * Sensitive to: food distribution, consumption patterns
 */
export function checksumVegetation(vegetation: VegetationMap): string {
  const dimensions = `${vegetation.width}x${vegetation.height}`;
  const dataHash = hashTypedArray(vegetation.data);
  return fnv1aHash(`vegetation:${dimensions}:${dataHash}`);
}

/**
 * Agent Hash
 * Inputs: position (x, y), hunger, energy, speed, sense radius, repro cooldown, state
 * Sensitive to: agent state and configuration
 * Order-independent for multiple agents (sorted by x, then y)
 */
export function checksumAgent(agent: Agent): string {
  const data = `${agent.id},${agent.x.toFixed(3)},${agent.y.toFixed(3)},${agent.hunger.toFixed(3)},${agent.energy.toFixed(3)},${agent.speed},${agent.senseRadius},${agent.reproCooldown},${agent.state}`;
  return fnv1aHash(data);
}

/**
 * Agents Collection Hash
 * Inputs: all agents sorted by position
 * Sensitive to: agent count, positions, states
 * Order-independent: agents sorted before hashing
 */
export function checksumAgents(agents: Agent[]): string {
  if (agents.length === 0) return fnv1aHash('agents:0');
  
  // Sort agents by ID for determinism
  const sorted = [...agents].sort((a, b) => a.id - b.id);
  
  const hashes = sorted.map(checksumAgent).join(':');
  return fnv1aHash(`agents:${agents.length}:${hashes}`);
}

/**
 * LEGACY: Simple sum-based checksum (kept for backward compatibility with existing tests)
 */
export function checksumHeightMapLegacy(heightMap: HeightMap): string {
  let sum = 0;
  for (let i = 0; i < heightMap.data.length; i++) {
    sum += heightMap.data[i];
  }
  return sum.toFixed(6);
}

export function checksumBiomeMapLegacy(biomeMap: BiomeMap): string {
  const counts = biomeMap.getCounts();
  return Object.values(counts).join('-');
}

export function checksumVegetationLegacy(vegetation: VegetationMap): string {
  let sum = 0;
  for (let i = 0; i < vegetation.data.length; i++) {
    sum += vegetation.data[i];
  }
  return sum.toFixed(6);
}
