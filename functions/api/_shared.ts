/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  AI: Ai;
}

export interface SimulationRun {
  id: string;
  seed: number;
  start_tick: number;
  end_tick: number | null;
  created_at: string;
  updated_at: string;
}

export interface HistoryEvent {
  id?: number;
  run_id: string;
  tick: number;
  event_type: string;
  x?: number;
  y?: number;
  details?: string;
}

export interface RunStats {
  id?: number;
  run_id: string;
  peak_population: number;
  total_births: number;
  total_deaths: number;
  extinction_tick?: number;
  final_tick?: number;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function generateRunId(): string {
  return crypto.randomUUID();
}
