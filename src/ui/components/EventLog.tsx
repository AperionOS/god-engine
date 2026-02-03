import { useEffect, useRef, useState } from 'react';
import { HistoryEvent, EventType } from '../../engine/history';
import { Skull, Baby, Globe, ChevronDown } from 'lucide-react';

const EVENT_CONFIG: Record<EventType, { icon: typeof Skull; color: string; label: string }> = {
  [EventType.AGENT_DEATH]: { icon: Skull, color: 'text-red-400', label: 'Death' },
  [EventType.AGENT_SPAWN]: { icon: Baby, color: 'text-green-400', label: 'Birth' },
  [EventType.WORLD_GENERATE]: { icon: Globe, color: 'text-blue-400', label: 'Genesis' },
};

interface EventLogProps {
  events: HistoryEvent[];
  currentTick: number;
  maxEvents?: number;
}

export function EventLog({ events, currentTick, maxEvents = 50 }: EventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Get recent events (reversed for newest first display)
  const recentEvents = events.slice(-maxEvents).reverse();
  
  // Auto-scroll to bottom when new events arrive (unless user is hovering)
  useEffect(() => {
    if (!isHovering && isAtBottom && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length, isHovering, isAtBottom]);
  
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    setIsAtBottom(scrollTop < 10);
  };
  
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setIsAtBottom(true);
    }
  };
  
  const formatTickDelta = (eventTick: number) => {
    const delta = currentTick - eventTick;
    if (delta === 0) return 'now';
    if (delta < 60) return `${delta}t ago`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    return `${Math.floor(delta / 3600)}h ago`;
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Event Log</h3>
        <span className="text-xs text-gray-500">{events.length} total</span>
      </div>
      
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {recentEvents.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            No events yet. Start the simulation!
          </div>
        ) : (
          recentEvents.map((event, idx) => {
            const config = EVENT_CONFIG[event.type];
            const Icon = config.icon;
            
            return (
              <div
                key={`${event.tick}-${event.type}-${idx}`}
                className="flex items-start gap-2 p-2 bg-gray-800/50 rounded border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <Icon size={14} className={`${config.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {formatTickDelta(event.tick)}
                    </span>
                  </div>
                  {event.details && (
                    <div className="text-[11px] text-gray-400 truncate">
                      {event.details}
                    </div>
                  )}
                  {event.x !== undefined && event.y !== undefined && (
                    <div className="text-[10px] text-gray-500">
                      @ ({Math.floor(event.x)}, {Math.floor(event.y)})
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Scroll to latest button */}
      {!isAtBottom && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-2 right-2 p-1.5 bg-blue-600 rounded-full shadow-lg hover:bg-blue-500 transition-colors"
        >
          <ChevronDown size={14} className="rotate-180" />
        </button>
      )}
    </div>
  );
}
