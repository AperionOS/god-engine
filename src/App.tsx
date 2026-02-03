import { useEffect, useRef, useState, useCallback } from 'react';
import { World } from './engine/world';
import { setupCanvas, CanvasContext } from './ui/canvas';
import { renderTerrain } from './ui/renderers/terrain';
import { renderRivers } from './ui/renderers/rivers';
import { renderVegetation } from './ui/renderers/vegetation';
import { renderAgents } from './ui/renderers/agent';
import { useCamera } from './ui/hooks/useCamera';
import { AgentInspector } from './ui/components/AgentInspector';
import { Minimap } from './ui/components/Minimap';
import { CellTooltip } from './ui/components/CellTooltip';
import { EventLog } from './ui/components/EventLog';
import { Agent } from './engine/agent';
import { usePersistence } from './api';
import { Activity, Users, Settings, Play, Pause, Cloud, CloudOff, Sparkles, RotateCcw, ScrollText } from 'lucide-react';
import { ResponsiveLine } from '@nivo/line';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { EventType } from './engine/history';
import { useUIStore } from './stores/uiStore';

// Initialize world singleton
const WORLD_SIZE = 256;
const DEFAULT_SEED = 12345;
const CANVAS_SIZE = 800;
let world = new World({ width: WORLD_SIZE, height: WORLD_SIZE, seed: DEFAULT_SEED });

// Expose world for E2E testing (determinism verification)
if (typeof window !== 'undefined') {
  (window as any).__GOD_ENGINE_WORLD__ = world;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(canvasRef);
  const [ctx, setCtx] = useState<CanvasContext | null>(null);
  const [tick, setTick] = useState(0);
  
  // Zustand store for UI state (persisted)
  const { 
    isPlaying, setPlaying, togglePlaying,
    speed, setSpeed, incrementSpeed, decrementSpeed,
    seed, setSeed, addToSeedHistory,
    layers, toggleLayer,
    showEventLog, toggleEventLog,
  } = useUIStore();
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [history, setHistory] = useState<{ tick: number; population: number }[]>([]);
  
  // Stats tracking
  const [stats, setStats] = useState({
    peakPopulation: 0,
    totalBirths: 0,
    totalDeaths: 0,
    extinctionTick: null as number | null,
  });
  
  // Persistence
  const persistence = usePersistence({ seed, enabled: true });
  const lastSyncedEventCount = useRef(0);
  
  // Camera navigation for minimap
  const handleMinimapNavigate = useCallback((x: number, y: number) => {
    camera.setPosition(x, y);
  }, [camera]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !ctx) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Inverse Transform
    // 1. Center relative
    const localX = clickX - ctx.width / 2;
    const localY = clickY - ctx.height / 2;
    
    // 2. Unscale
    const unscaledX = localX / camera.zoom;
    const unscaledY = localY / camera.zoom;
    
    // 3. Remove camera offset
    const worldSpaceX = unscaledX - (-ctx.width / 2 + camera.x);
    const worldSpaceY = unscaledY - (-ctx.height / 2 + camera.y);
    
    // 4. Convert to Grid Coordinates
    const cellWidth = ctx.width / world.width;
    const cellHeight = ctx.height / world.height;
    
    const gridX = worldSpaceX / cellWidth;
    const gridY = worldSpaceY / cellHeight;
    
    // Find nearest agent within radius
    const hitRadius = 2 / camera.zoom; // Adjust hit area based on zoom
    const agent = world.agents.find(a => {
      const dx = a.x - gridX;
      const dy = a.y - gridY;
      return Math.sqrt(dx*dx + dy*dy) < hitRadius;
    });
    
    setSelectedAgent(agent || null);
  };

  // Regenerate world with new seed
  const handleRegenerate = useCallback(async () => {
    setPlaying(false);
    world = new World({ width: WORLD_SIZE, height: WORLD_SIZE, seed });
    // Update window reference for E2E tests
    if (typeof window !== 'undefined') {
      (window as any).__GOD_ENGINE_WORLD__ = world;
    }
    setTick(0);
    setHistory([]);
    setStats({ peakPopulation: 0, totalBirths: 0, totalDeaths: 0, extinctionTick: null });
    setSelectedAgent(null);
    persistence.reset();
    lastSyncedEventCount.current = 0;
    addToSeedHistory(seed);
    
    // Start a new cloud run
    await persistence.startRun(0);
    toast.success(`World regenerated with seed ${seed}`);
  }, [seed, persistence, setPlaying, addToSeedHistory]);

  // Handle play/pause with cloud sync
  const handlePlayPause = useCallback(async () => {
    if (!isPlaying && !persistence.runId) {
      // Starting fresh - create cloud run
      await persistence.startRun(world.tickCount);
      toast.success('Cloud sync started');
    }
    togglePlaying();
  }, [isPlaying, persistence, togglePlaying]);

  // Generate lore
  const handleGenerateLore = useCallback(async () => {
    if (!persistence.runId) return;
    
    toast.promise(
      persistence.requestLore({
        peak_population: stats.peakPopulation,
        total_births: stats.totalBirths,
        total_deaths: stats.totalDeaths,
        extinction_tick: stats.extinctionTick ?? undefined,
        final_tick: world.tickCount,
      }),
      {
        loading: 'Generating lore...',
        success: 'Lore generated!',
        error: 'Failed to generate lore',
      }
    );
  }, [persistence, stats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'Equal':
        case 'NumpadAdd':
          e.preventDefault();
          incrementSpeed();
          break;
        case 'Minus':
        case 'NumpadSubtract':
          e.preventDefault();
          decrementSpeed();
          break;
        case 'KeyL':
          e.preventDefault();
          toggleEventLog();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, incrementSpeed, decrementSpeed, toggleEventLog]);

  // Setup Canvas
  useEffect(() => {
    if (canvasRef.current && !ctx) {
      const context = setupCanvas('game-canvas', CANVAS_SIZE, CANVAS_SIZE);
      setCtx(context);
    }
  }, [canvasRef]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    
    // Track stats incrementally instead of filtering every tick
    let birthCount = 0;
    let deathCount = 0;
    let lastEventIndex = 0;

    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      if (isPlaying) {
        accumulator += deltaTime * speed;
        const fixedDelta = 16; // 60 ticks/sec

        while (accumulator >= fixedDelta) {
          world.tick();
          
          // Process only new events (incremental)
          const events = world.history.events;
          for (let i = lastEventIndex; i < events.length; i++) {
            if (events[i].type === EventType.AGENT_SPAWN) birthCount++;
            else if (events[i].type === EventType.AGENT_DEATH) deathCount++;
          }
          lastEventIndex = events.length;
          
          // Update tick less frequently to reduce React overhead
          if (world.tickCount % 3 === 0) {
            setTick(world.tickCount);
          }
          
          // Track stats every 10 ticks instead of every tick
          if (world.tickCount % 10 === 0) {
            const currentPop = world.agents.length;
            setStats(prev => {
              const newPeak = Math.max(prev.peakPopulation, currentPop);
              const extinction = currentPop === 0 && prev.extinctionTick === null 
                ? world.tickCount 
                : prev.extinctionTick;
              
              return {
                peakPopulation: newPeak,
                totalBirths: birthCount,
                totalDeaths: deathCount,
                extinctionTick: extinction,
              };
            });
          }
          
          // Update Graph every 60 ticks (approx 1 sec)
          if (world.tickCount % 60 === 0) {
            setHistory(prev => {
              const next = [...prev, { tick: world.tickCount, population: world.agents.length }];
              // Keep last 50 points
              if (next.length > 50) return next.slice(next.length - 50);
              return next;
            });
            
            // Sync events to cloud periodically
            if (persistence.runId) {
              const newEvents = world.history.events.slice(lastSyncedEventCount.current);
              if (newEvents.length > 0) {
                persistence.queueEvents(newEvents);
                lastSyncedEventCount.current = world.history.events.length;
              }
            }
          }

          accumulator -= fixedDelta;
        }
      }

      if (ctx) {
        const { ctx: c, width, height } = ctx;
        
        // Clear background
        c.fillStyle = '#111827'; // Tailwind gray-900
        c.fillRect(0, 0, width, height);

        // Apply Camera Transform
        c.save();
        c.translate(width / 2, height / 2); // Center pivot
        c.scale(camera.zoom, camera.zoom);
        c.translate(-width / 2 + camera.x, -height / 2 + camera.y);

        if (layers.terrain) renderTerrain(world, ctx);
        if (layers.rivers) renderRivers(world, ctx);
        if (layers.vegetation) renderVegetation(world, ctx);
        if (layers.agents) renderAgents(world, ctx);

        c.restore();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [ctx, isPlaying, speed, layers, camera, persistence]);

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Main Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-950">
        <canvas 
          id="game-canvas" 
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="shadow-2xl border border-gray-800 rounded-lg cursor-crosshair"
        />
        
        {/* Cell Tooltip */}
        {ctx && (
          <CellTooltip
            world={world}
            canvasRef={canvasRef}
            camera={camera}
            canvasSize={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          />
        )}
        
        {/* Minimap (bottom-left) */}
        <div className="absolute bottom-6 left-6">
          <Minimap
            world={world}
            camera={camera}
            canvasSize={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onNavigate={handleMinimapNavigate}
            size={140}
          />
        </div>
        
        {/* Event Log Panel (top-left, toggleable) */}
        <AnimatePresence>
          {showEventLog && (
            <motion.div 
              className="absolute top-6 left-6 z-30 w-72 h-80 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-3 shadow-xl"
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <EventLog events={world.history.events} currentTick={tick} maxEvents={100} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Overlay Controls */}
        <motion.div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-gray-900/80 backdrop-blur px-6 py-3 rounded-full border border-gray-700 shadow-xl"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.button 
            onClick={handlePlayPause}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Play/Pause (Space)"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Pause size={24} />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Play size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Speed control with current speed display */}
          <div className="flex items-center gap-2">
            <motion.button 
              onClick={decrementSpeed}
              className="px-2 py-1 rounded text-sm font-medium hover:bg-white/10 text-gray-400"
              title="Slower (-)"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              −
            </motion.button>
            <motion.span 
              key={speed}
              className="w-8 text-center text-sm font-mono"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {speed}x
            </motion.span>
            <motion.button 
              onClick={incrementSpeed}
              className="px-2 py-1 rounded text-sm font-medium hover:bg-white/10 text-gray-400"
              title="Faster (+)"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              +
            </motion.button>
          </div>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Toggle event log */}
          <motion.button
            onClick={toggleEventLog}
            className={cn(
              "p-2 rounded-full transition-colors",
              showEventLog ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-400"
            )}
            title="Event Log (L)"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ScrollText size={18} />
          </motion.button>
          
          {/* Cloud sync indicator */}
          <div className="flex items-center gap-2 text-sm">
            {persistence.runId ? (
              <motion.div
                animate={{ scale: persistence.isSaving ? [1, 1.2, 1] : 1 }}
                transition={{ repeat: persistence.isSaving ? Infinity : 0, duration: 1 }}
              >
                <Cloud size={18} className={persistence.isSaving ? "text-blue-400" : "text-green-400"} />
              </motion.div>
            ) : (
              <CloudOff size={18} className="text-gray-500" />
            )}
            {persistence.eventsSaved > 0 && (
              <span className="text-gray-400 text-xs">{persistence.eventsSaved}</span>
            )}
          </div>
        </motion.div>
        
        {/* Keyboard shortcuts hint */}
        <div className="absolute top-6 right-6 text-xs text-gray-500 bg-gray-900/60 px-2 py-1 rounded pointer-events-none select-none">
          Space: Play · +/-: Speed · L: Log
        </div>
      </div>

      {/* Sidebar Inspector */}
      <motion.div 
        className="w-80 border-l border-gray-800 bg-gray-900 p-4 flex flex-col gap-6"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <motion.div 
            className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Activity className="text-white" />
          </motion.div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">God Engine</h1>
            <p className="text-xs text-gray-400">Simulation Cockpit</p>
          </div>
        </div>

        {/* Seed Control */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">World Seed</h2>
          <div className="flex gap-2">
            <Input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="flex-1 bg-gray-800 border-gray-700 font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              title="Regenerate World"
              className="bg-gray-800 border-gray-700 hover:bg-gray-700"
            >
              <RotateCcw size={18} />
            </Button>
          </div>
        </div>

        {/* Inspector */}
        <AnimatePresence mode="wait">
          {selectedAgent ? (
            <motion.div
              key="inspector"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AgentInspector agent={selectedAgent} />
            </motion.div>
          ) : (
            /* Vitals */
            <motion.div 
              key="vitals"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">World Vitals</h2>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Users size={16} />
                <span className="text-sm">Population</span>
              </div>
              <div className="text-2xl font-mono font-bold text-white">
                {world.agents.length}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Activity size={16} />
                <span className="text-sm">Tick</span>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-400">
                {tick}
              </div>
            </div>

            {/* Population Graph */}
            <div className="h-32 bg-gray-800 rounded-lg p-2 border border-gray-700">
              {history.length >= 2 ? (
                <ResponsiveLine
                  data={[{
                    id: 'population',
                    data: history.map(h => ({ x: h.tick, y: h.population }))
                  }]}
                  colors={['#3b82f6']}
                  enablePoints={false}
                  enableGridX={false}
                  enableGridY={false}
                  axisBottom={null}
                  axisLeft={null}
                  axisTop={null}
                  axisRight={null}
                  enableArea={true}
                  areaOpacity={0.15}
                  curve="monotoneX"
                  animate={false}
                  isInteractive={true}
                  useMesh={true}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  theme={{
                    tooltip: {
                      container: {
                        background: '#1f2937',
                        color: '#fff',
                        fontSize: 12,
                        borderRadius: 4,
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                  Waiting for data...
                </div>
              )}
            </div>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 rounded p-2 border border-gray-700">
                <span className="text-gray-400">Peak</span>
                <div className="font-mono font-bold text-green-400">{stats.peakPopulation}</div>
              </div>
              <div className="bg-gray-800 rounded p-2 border border-gray-700">
                <span className="text-gray-400">Deaths</span>
                <div className="font-mono font-bold text-red-400">{stats.totalDeaths}</div>
              </div>
            </div>
            
            {/* Generate Lore Button */}
            {persistence.runId && (
              <Button
                onClick={handleGenerateLore}
                disabled={persistence.isSaving}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700"
              >
                <Sparkles size={16} className="mr-2" />
                {persistence.isSaving ? 'Generating...' : 'Generate Lore'}
              </Button>
            )}
            
            {/* Lore Display */}
            <AnimatePresence>
              {persistence.lore && (
                <motion.div 
                  className="bg-gray-800 rounded-lg p-3 border border-purple-900/50 text-sm text-gray-300 italic leading-relaxed max-h-48 overflow-y-auto"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {persistence.lore}
                </motion.div>
              )}
            </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layers */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Settings size={14} /> Layers
          </h2>
          <div className="space-y-2">
            {Object.entries(layers).map(([key, active]) => (
              <motion.button
                key={key}
                onClick={() => toggleLayer(key as keyof typeof layers)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors border",
                  active 
                    ? "bg-blue-600/10 border-blue-600/30 text-blue-400" 
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="capitalize">{key}</span>
                <motion.div 
                  className={cn("w-2 h-2 rounded-full", active ? "bg-blue-400" : "bg-gray-600")}
                  animate={{ scale: active ? 1 : 0.8 }}
                />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
      <Toaster 
        theme="dark" 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            border: '1px solid #374151',
          },
        }}
      />
    </div>
  );
}
