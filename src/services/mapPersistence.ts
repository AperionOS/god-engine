/**
 * Map Persistence Service - Client API for saving/loading maps
 */

import { World } from '../engine/world';
import { serializeWorld, deserializeWorld, SerializedWorld } from '../engine/serialize';

export interface SavedMapMeta {
  id: string;
  name: string;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  seed: number;
  tick: number;
  population: number;
  sizeBytes?: number;
  createdAt: string;
}

export interface SaveMapOptions {
  name: string;
  locationName?: string;
  lat?: number;
  lng?: number;
}

export interface MapListResponse {
  maps: SavedMapMeta[];
  count: number;
  limit: number;
}

export interface LoadedMap {
  meta: SavedMapMeta;
  world: World;
}

/**
 * Save a world to the cloud
 */
export async function saveMap(world: World, options: SaveMapOptions): Promise<SavedMapMeta> {
  const serialized = serializeWorld(world);
  const worldData = JSON.stringify(serialized);

  const response = await fetch('/api/maps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: options.name,
      worldData,
      locationName: options.locationName || serialized.meta.locationName,
      lat: options.lat,
      lng: options.lng,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save map');
  }

  const result = await response.json();
  return {
    id: result.id,
    name: options.name,
    locationName: options.locationName || null,
    lat: options.lat || null,
    lng: options.lng || null,
    seed: result.seed,
    tick: result.tick,
    population: result.population,
    sizeBytes: result.sizeBytes,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List all saved maps for the current user
 */
export async function listMaps(): Promise<MapListResponse> {
  const response = await fetch('/api/maps');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list maps');
  }

  return response.json();
}

/**
 * Load a saved map by ID
 */
export async function loadMap(mapId: string): Promise<LoadedMap> {
  const response = await fetch(`/api/maps/${mapId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load map');
  }

  const data = await response.json();
  const world = deserializeWorld(data.worldData as SerializedWorld);

  return {
    meta: {
      id: data.id,
      name: data.name,
      locationName: data.locationName,
      lat: data.lat,
      lng: data.lng,
      seed: data.seed,
      tick: data.tick,
      population: data.population,
      createdAt: data.createdAt,
    },
    world,
  };
}

/**
 * Delete a saved map
 */
export async function deleteMap(mapId: string): Promise<void> {
  const response = await fetch(`/api/maps/${mapId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete map');
  }
}

/**
 * Export map as downloadable JSON file (local backup)
 */
export function exportMapToFile(world: World, filename: string): void {
  const serialized = serializeWorld(world);
  const json = JSON.stringify(serialized, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Import map from a local JSON file
 */
export function importMapFromFile(file: File): Promise<World> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json) as SerializedWorld;
        const world = deserializeWorld(data);
        resolve(world);
      } catch (error) {
        reject(new Error('Invalid map file format'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
