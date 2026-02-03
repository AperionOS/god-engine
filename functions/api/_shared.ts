/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  AI: Ai;
  MAPS_BUCKET: R2Bucket;
  MAP_CACHE: KVNamespace;
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

export interface SavedMap {
  id: string;
  user_id: string;
  name: string;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  seed: number;
  tick: number;
  population: number;
  size_bytes: number;
  r2_key: string;
  created_at: string;
  updated_at: string;
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

export function getUserId(request: Request): string {
  // Check for Cloudflare Access JWT user
  const cfAccessJwtPayload = request.headers.get('cf-access-jwt-payload');
  if (cfAccessJwtPayload) {
    try {
      const payload = JSON.parse(atob(cfAccessJwtPayload));
      return payload.email || payload.sub || 'anonymous';
    } catch {
      // Fall through
    }
  }
  
  // Fallback: use IP or anonymous
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  return cfConnectingIp ? `ip:${cfConnectingIp}` : 'anonymous';
}
