import { Env, HistoryEvent, jsonResponse, errorResponse } from './_shared';

interface BatchEventsRequest {
  run_id: string;
  events: Omit<HistoryEvent, 'run_id'>[];
}

// POST /api/events - Batch insert events
// GET /api/events?run_id=xxx&limit=100 - Get events by run_id
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as BatchEventsRequest;

      if (!body.run_id || !Array.isArray(body.events)) {
        return errorResponse('run_id and events array are required');
      }

      if (body.events.length === 0) {
        return jsonResponse({ inserted: 0 });
      }

      // Batch insert using a transaction
      const stmt = env.DB.prepare(
        `INSERT INTO history_events (run_id, tick, event_type, x, y, details) VALUES (?, ?, ?, ?, ?, ?)`
      );

      const batch = body.events.map((e) =>
        stmt.bind(body.run_id, e.tick, e.event_type, e.x ?? null, e.y ?? null, e.details ?? null)
      );

      await env.DB.batch(batch);

      return jsonResponse({ inserted: body.events.length }, 201);
    } catch (err) {
      return errorResponse(`Failed to insert events: ${err}`, 500);
    }
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id');
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);

    if (!runId) {
      return errorResponse('run_id query parameter is required');
    }

    try {
      const result = await env.DB.prepare(
        `SELECT * FROM history_events WHERE run_id = ? ORDER BY tick ASC LIMIT ?`
      )
        .bind(runId, limit)
        .all<HistoryEvent>();

      return jsonResponse({ events: result.results });
    } catch (err) {
      return errorResponse(`Failed to fetch events: ${err}`, 500);
    }
  }

  return errorResponse('Method not allowed', 405);
};
