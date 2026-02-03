import { useCallback, useRef, useState } from 'react';
import { HistoryEvent, EventType } from '../engine/history';
import {
  createRun,
  postEvents,
  postStats,
  generateLore,
  type HistoryEventPayload,
  type RunStats,
  type LoreResponse,
} from './client';

const BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 5000;

interface UsePersistenceOptions {
  seed: number;
  enabled?: boolean;
}

interface PersistenceState {
  runId: string | null;
  isSaving: boolean;
  error: string | null;
  eventsSaved: number;
  lore: string | null;
}

export function usePersistence({ seed, enabled = true }: UsePersistenceOptions) {
  const [state, setState] = useState<PersistenceState>({
    runId: null,
    isSaving: false,
    error: null,
    eventsSaved: 0,
    lore: null,
  });

  const eventBuffer = useRef<HistoryEventPayload[]>([]);
  const batchTimeoutRef = useRef<number | null>(null);

  const startRun = useCallback(async (startTick = 0) => {
    if (!enabled) return null;

    try {
      setState((s) => ({ ...s, isSaving: true, error: null }));
      const result = await createRun(seed, startTick);
      setState((s) => ({ ...s, runId: result.id, isSaving: false }));
      return result.id;
    } catch (err) {
      setState((s) => ({ ...s, error: String(err), isSaving: false }));
      return null;
    }
  }, [seed, enabled]);

  const flushEvents = useCallback(async () => {
    const runId = state.runId;
    if (!runId || eventBuffer.current.length === 0) return;

    const eventsToSend = [...eventBuffer.current];
    eventBuffer.current = [];

    try {
      const result = await postEvents(runId, eventsToSend);
      setState((s) => ({ ...s, eventsSaved: s.eventsSaved + result.inserted }));
    } catch (err) {
      // Put events back on failure
      eventBuffer.current = [...eventsToSend, ...eventBuffer.current];
      setState((s) => ({ ...s, error: String(err) }));
    }
  }, [state.runId]);

  const queueEvent = useCallback((event: HistoryEvent) => {
    if (!enabled || !state.runId) return;

    const payload: HistoryEventPayload = {
      tick: event.tick,
      event_type: event.type,
      x: event.x,
      y: event.y,
      details: event.details,
    };

    eventBuffer.current.push(payload);

    // Flush if batch size reached
    if (eventBuffer.current.length >= BATCH_SIZE) {
      flushEvents();
    } else if (!batchTimeoutRef.current) {
      // Schedule a flush after interval
      batchTimeoutRef.current = window.setTimeout(() => {
        batchTimeoutRef.current = null;
        flushEvents();
      }, BATCH_INTERVAL_MS);
    }
  }, [enabled, state.runId, flushEvents]);

  const queueEvents = useCallback((events: HistoryEvent[]) => {
    events.forEach(queueEvent);
  }, [queueEvent]);

  const saveStats = useCallback(async (stats: Omit<RunStats, 'run_id'>) => {
    if (!state.runId) return;

    try {
      setState((s) => ({ ...s, isSaving: true }));
      await postStats({ run_id: state.runId, ...stats });
      setState((s) => ({ ...s, isSaving: false }));
    } catch (err) {
      setState((s) => ({ ...s, error: String(err), isSaving: false }));
    }
  }, [state.runId]);

  const requestLore = useCallback(async (stats: Omit<RunStats, 'run_id'>, eventsSummary?: string) => {
    if (!state.runId) return null;

    try {
      setState((s) => ({ ...s, isSaving: true }));
      const result = await generateLore(state.runId, seed, stats, eventsSummary);
      setState((s) => ({ ...s, lore: result.lore, isSaving: false }));
      return result.lore;
    } catch (err) {
      setState((s) => ({ ...s, error: String(err), isSaving: false }));
      return null;
    }
  }, [state.runId, seed]);

  const endRun = useCallback(async (stats: Omit<RunStats, 'run_id'>) => {
    // Flush any remaining events
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    await flushEvents();
    await saveStats(stats);
  }, [flushEvents, saveStats]);

  const reset = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    eventBuffer.current = [];
    setState({
      runId: null,
      isSaving: false,
      error: null,
      eventsSaved: 0,
      lore: null,
    });
  }, []);

  return {
    ...state,
    startRun,
    queueEvent,
    queueEvents,
    flushEvents,
    saveStats,
    requestLore,
    endRun,
    reset,
  };
}
