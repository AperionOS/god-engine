const API_BASE = '/api';

export interface CreateRunResponse {
  id: string;
  seed: number;
  start_tick: number;
}

export interface SimulationRun {
  id: string;
  seed: number;
  start_tick: number;
  end_tick: number | null;
  created_at: string;
  updated_at: string;
}

export interface HistoryEventPayload {
  tick: number;
  event_type: string;
  x?: number;
  y?: number;
  details?: string;
}

export interface RunStats {
  run_id: string;
  peak_population: number;
  total_births: number;
  total_deaths: number;
  extinction_tick?: number;
  final_tick?: number;
}

export interface LoreResponse {
  lore: string;
  run_id: string;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as { error?: string }).error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Runs
export async function createRun(seed: number, startTick = 0): Promise<CreateRunResponse> {
  return apiRequest<CreateRunResponse>('/runs', {
    method: 'POST',
    body: JSON.stringify({ seed, start_tick: startTick }),
  });
}

export async function getRunsBySeed(seed: number): Promise<{ runs: SimulationRun[] }> {
  return apiRequest<{ runs: SimulationRun[] }>(`/runs?seed=${seed}`);
}

export async function getRecentRuns(): Promise<{ runs: SimulationRun[] }> {
  return apiRequest<{ runs: SimulationRun[] }>('/runs');
}

// Events
export async function postEvents(
  runId: string,
  events: HistoryEventPayload[]
): Promise<{ inserted: number }> {
  return apiRequest<{ inserted: number }>('/events', {
    method: 'POST',
    body: JSON.stringify({ run_id: runId, events }),
  });
}

export async function getEvents(
  runId: string,
  limit = 100
): Promise<{ events: HistoryEventPayload[] }> {
  return apiRequest<{ events: HistoryEventPayload[] }>(`/events?run_id=${runId}&limit=${limit}`);
}

// Stats
export async function postStats(stats: RunStats): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/stats', {
    method: 'POST',
    body: JSON.stringify(stats),
  });
}

export async function getStats(runId: string): Promise<RunStats> {
  return apiRequest<RunStats>(`/stats?run_id=${runId}`);
}

// Lore (AI)
export async function generateLore(
  runId: string,
  seed: number,
  stats?: Omit<RunStats, 'run_id'>,
  eventsSummary?: string
): Promise<LoreResponse> {
  return apiRequest<LoreResponse>('/lore', {
    method: 'POST',
    body: JSON.stringify({
      run_id: runId,
      seed,
      stats,
      events_summary: eventsSummary,
    }),
  });
}
