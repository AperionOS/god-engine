import { Env, RunStats, jsonResponse, errorResponse } from './_shared';

// POST /api/stats - Create or update stats for a run
// GET /api/stats?run_id=xxx - Get stats by run_id
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as RunStats;

      if (!body.run_id) {
        return errorResponse('run_id is required');
      }

      // Upsert stats
      await env.DB.prepare(
        `INSERT INTO run_stats (run_id, peak_population, total_births, total_deaths, extinction_tick, final_tick)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(run_id) DO UPDATE SET
           peak_population = excluded.peak_population,
           total_births = excluded.total_births,
           total_deaths = excluded.total_deaths,
           extinction_tick = excluded.extinction_tick,
           final_tick = excluded.final_tick,
           updated_at = datetime('now')`
      )
        .bind(
          body.run_id,
          body.peak_population ?? 0,
          body.total_births ?? 0,
          body.total_deaths ?? 0,
          body.extinction_tick ?? null,
          body.final_tick ?? null
        )
        .run();

      return jsonResponse({ success: true }, 201);
    } catch (err) {
      return errorResponse(`Failed to save stats: ${err}`, 500);
    }
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id');

    if (!runId) {
      return errorResponse('run_id query parameter is required');
    }

    try {
      const result = await env.DB.prepare(
        `SELECT * FROM run_stats WHERE run_id = ?`
      )
        .bind(runId)
        .first<RunStats>();

      if (!result) {
        return errorResponse('Stats not found', 404);
      }

      return jsonResponse(result);
    } catch (err) {
      return errorResponse(`Failed to fetch stats: ${err}`, 500);
    }
  }

  return errorResponse('Method not allowed', 405);
};
