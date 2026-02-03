import { Env, jsonResponse, errorResponse, getUserId, SavedMap } from './_shared';

const MAX_MAPS_PER_USER = 50;
const CACHE_TTL = 3600; // 1 hour

interface CreateMapBody {
  name: string;
  worldData: string; // JSON stringified SerializedWorld
  locationName?: string;
  lat?: number;
  lng?: number;
}

/**
 * POST /api/maps - Create a new saved map
 * GET /api/maps - List user's maps
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const userId = getUserId(request);

  if (request.method === 'POST') {
    return handleCreate(request, env, userId);
  }

  if (request.method === 'GET') {
    return handleList(env, userId);
  }

  return errorResponse('Method not allowed', 405);
};

async function handleCreate(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json() as CreateMapBody;

    if (!body.name || !body.worldData) {
      return errorResponse('Missing required fields: name, worldData');
    }

    // Parse world data to extract metadata
    let worldMeta: {
      seed: number;
      tick: number;
      population: number;
      width: number;
      height: number;
    };

    try {
      const parsed = JSON.parse(body.worldData);
      worldMeta = {
        seed: parsed.meta?.seed ?? 0,
        tick: parsed.meta?.tick ?? 0,
        population: parsed.meta?.population ?? 0,
        width: parsed.meta?.width ?? 256,
        height: parsed.meta?.height ?? 256,
      };
    } catch {
      return errorResponse('Invalid worldData format');
    }

    // Check user's map limit
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM saved_maps WHERE user_id = ?'
    ).bind(userId).first<{ count: number }>();

    if (countResult && countResult.count >= MAX_MAPS_PER_USER) {
      return errorResponse(`Map limit reached (${MAX_MAPS_PER_USER}). Delete some maps first.`, 403);
    }

    // Generate IDs and keys
    const mapId = crypto.randomUUID();
    const r2Key = `${userId}/${mapId}.json`;
    const sizeBytes = new TextEncoder().encode(body.worldData).length;

    // Store in R2
    await env.MAPS_BUCKET.put(r2Key, body.worldData, {
      customMetadata: {
        userId,
        mapId,
        name: body.name,
      },
    });

    // Store in KV cache
    await env.MAP_CACHE.put(`map:${mapId}`, body.worldData, {
      expirationTtl: CACHE_TTL,
    });

    // Store metadata in D1
    await env.DB.prepare(`
      INSERT INTO saved_maps (id, user_id, name, location_name, lat, lng, seed, tick, population, size_bytes, r2_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      mapId,
      userId,
      body.name,
      body.locationName || null,
      body.lat || null,
      body.lng || null,
      worldMeta.seed,
      worldMeta.tick,
      worldMeta.population,
      sizeBytes,
      r2Key
    ).run();

    return jsonResponse({
      id: mapId,
      name: body.name,
      seed: worldMeta.seed,
      tick: worldMeta.tick,
      population: worldMeta.population,
      sizeBytes,
    }, 201);

  } catch (error) {
    console.error('Error creating map:', error);
    return errorResponse('Failed to save map', 500);
  }
}

async function handleList(env: Env, userId: string): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, location_name, lat, lng, seed, tick, population, size_bytes, created_at, updated_at
      FROM saved_maps
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 50
    `).bind(userId).all<SavedMap>();

    return jsonResponse({
      maps: result.results || [],
      count: result.results?.length || 0,
      limit: MAX_MAPS_PER_USER,
    });

  } catch (error) {
    console.error('Error listing maps:', error);
    return errorResponse('Failed to list maps', 500);
  }
}
