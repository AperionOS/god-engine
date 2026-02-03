import { Env, SimulationRun, jsonResponse, errorResponse, generateRunId } from './_shared';

interface CreateRunRequest {
  seed: number;
  start_tick?: number;
}

// POST /api/runs - Create a new simulation run
// GET /api/runs?seed=123 - Get runs by seed
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as CreateRunRequest;

      if (typeof body.seed !== 'number') {
        return errorResponse('seed is required and must be a number');
      }

      const id = generateRunId();
      const startTick = body.start_tick ?? 0;

      await env.DB.prepare(
        `INSERT INTO simulation_runs (id, seed, start_tick) VALUES (?, ?, ?)`
      )
        .bind(id, body.seed, startTick)
        .run();

      return jsonResponse({ id, seed: body.seed, start_tick: startTick }, 201);
    } catch (err) {
      return errorResponse(`Failed to create run: ${err}`, 500);
    }
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const seedParam = url.searchParams.get('seed');

    try {
      let result;
      if (seedParam) {
        const seed = parseInt(seedParam, 10);
        result = await env.DB.prepare(
          `SELECT * FROM simulation_runs WHERE seed = ? ORDER BY created_at DESC`
        )
          .bind(seed)
          .all<SimulationRun>();
      } else {
        result = await env.DB.prepare(
          `SELECT * FROM simulation_runs ORDER BY created_at DESC LIMIT 50`
        ).all<SimulationRun>();
      }

      return jsonResponse({ runs: result.results });
    } catch (err) {
      return errorResponse(`Failed to fetch runs: ${err}`, 500);
    }
  }

  return errorResponse('Method not allowed', 405);
};
