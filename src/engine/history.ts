export enum EventType {
  AGENT_DEATH = 'AGENT_DEATH',
  AGENT_SPAWN = 'AGENT_SPAWN',
  WORLD_GENERATE = 'WORLD_GENERATE',
}

export interface HistoryEvent {
  tick: number;
  type: EventType;
  x?: number;
  y?: number;
  details?: string;
}

export class HistoryLog {
  events: HistoryEvent[] = [];

  log(event: HistoryEvent): void {
    this.events.push(event);
  }

  getRecent(limit: number = 10): HistoryEvent[] {
    return this.events.slice(-limit);
  }

  clear(): void {
    this.events = [];
  }
}
