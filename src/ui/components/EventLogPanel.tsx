import { cn } from '@/lib/utils';
import { X, Skull, Baby, Heart, TrendingUp, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export type EventType = 'death' | 'spawn' | 'birth' | 'population_peak' | 'extinction';

export interface WorldEvent {
  tick: number;
  type: EventType;
  description?: string;
  agentId?: number;
  location?: { x: number; y: number };
}

interface EventLogPanelProps {
  events: WorldEvent[];
  isVisible: boolean;
  onClose: () => void;
  maxEvents?: number;
}

const eventConfig: Record<EventType, { icon: typeof Skull; color: string; bg: string }> = {
  death: { icon: Skull, color: 'text-red-400', bg: 'bg-red-900/20' },
  spawn: { icon: Baby, color: 'text-green-400', bg: 'bg-green-900/20' },
  birth: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-900/20' },
  population_peak: { icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  extinction: { icon: Skull, color: 'text-red-500', bg: 'bg-red-900/30' },
};

const formatEventMessage = (event: WorldEvent): string => {
  if (event.description) return event.description;
  
  switch (event.type) {
    case 'death':
      return event.agentId ? `Agent #${event.agentId} died` : 'An agent died';
    case 'spawn':
      return event.agentId ? `Agent #${event.agentId} spawned` : 'New agent spawned';
    case 'birth':
      return event.agentId ? `Agent #${event.agentId} was born` : 'New birth';
    case 'population_peak':
      return 'Population reached new peak';
    case 'extinction':
      return 'Population went extinct';
    default:
      return 'Unknown event';
  }
};

export function EventLogPanel({ 
  events, 
  isVisible, 
  onClose,
  maxEvents = 100 
}: EventLogPanelProps) {
  const displayEvents = events.slice(-maxEvents).reverse();
  
  if (!isVisible) return null;
  
  return (
    <div className="w-80 max-h-96 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-semibold">Event Log</h3>
          <Badge variant="secondary" className="text-[10px] h-5">
                {events.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg hover:bg-gray-700"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Events */}
          <ScrollArea className="h-72">
            <div className="p-2 space-y-1">
              {displayEvents.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-500 text-sm">
                  No events yet
                </div>
              ) : (
                displayEvents.map((event, index) => {
                  const config = eventConfig[event.type] || eventConfig.death;
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={`${event.tick}-${event.type}-${index}`}
                      className={cn(
                        "flex items-start gap-2.5 px-2.5 py-2 rounded-lg",
                        config.bg,
                        "border border-transparent hover:border-gray-700/50 transition-colors"
                      )}
                    >
                      <div className={cn("mt-0.5", config.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 leading-snug">
                          {formatEventMessage(event)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          <span>Tick {event.tick}</span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {event.location.x}, {event.location.y}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
  );
}
