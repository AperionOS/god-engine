import { Env, jsonResponse, errorResponse, getUserId, SavedMap } from '../_shared';

const CACHE_TTL = 3600; // 1 hour

/**
 * GET /api/maps/:id - Fetch a saved map
 * DELETE /api/maps/:id - Delete a saved map
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const userId = getUserId(request);
  const mapId = params.id as string;

  if (!mapId) {
    return errorResponse('Missing map ID', 400);
  }

  if (request.method === 'GET') {
    return handleGet(env, userId, mapId);
  }

  if (request.method === 'DELETE') {
    return handleDelete(env, userId, mapId);
  }

  return errorResponse('Method not allowed', 405);
};

async function handleGet(env: Env, userId: string, mapId: string): Promise<Response> {
  try {
    // Verify ownership
    const mapMeta = await env.DB.prepare(
      'SELECT * FROM saved_maps WHERE id = ? AND user_id = ?'
    ).bind(mapId, userId).first<SavedMap>();

    if (!mapMeta) {
      return errorResponse('Map not found or access denied', 404);
    }

    // Try KV cache first
    let worldData = await env.MAP_CACHE.get(`map:${mapId}`);

    if (!worldData) {
      // Fallback to R2
      const r2Object = await env.MAPS_BUCKET.get(mapMeta.r2_key);
      if (!r2Object) {
        return errorResponse('Map data not found in storage', 404);
      }
      worldData = await r2Object.text();

      // Refresh cache
      await env.MAP_CACHE.put(`map:${mapId}`, worldData, {
        expirationTtl: CACHE_TTL,
      });
    }

    return jsonResponse({
      id: mapId,
      name: mapMeta.name,
      locationName: mapMeta.location_name,
      lat: mapMeta.lat,
      lng: mapMeta.lng,
      seed: mapMeta.seed,
      tick: mapMeta.tick,
      population: mapMeta.population,
      createdAt: mapMeta.created_at,
      worldData: JSON.parse(worldData),
    });

  } catch (error) {
    console.error('Error fetching map:', error);
    return errorResponse('Failed to fetch map', 500);
  }
}

async function handleDelete(env: Env, userId: string, mapId: string): Promise<Response> {
  try {
    // Verify ownership and get r2_key
    const mapMeta = await env.DB.prepare(
      'SELECT r2_key FROM saved_maps WHERE id = ? AND user_id = ?'
    ).bind(mapId, userId).first<{ r2_key: string }>();

    if (!mapMeta) {
      return errorResponse('Map not found or access denied', 404);
    }

    // Delete from all storage layers
    await Promise.all([
      env.DB.prepare('DELETE FROM saved_maps WHERE id = ?').bind(mapId).run(),
      env.MAPS_BUCKET.delete(mapMeta.r2_key),
      env.MAP_CACHE.delete(`map:${mapId}`),
    ]);

    return jsonResponse({ deleted: true, id: mapId });

  } catch (error) {
    console.error('Error deleting map:', error);
    return errorResponse('Failed to delete map', 500);
  }
}
