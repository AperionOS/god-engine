import { useEffect, useRef, useState, useCallback } from 'react';
import { World } from './engine/world';
import { setupCanvas, clearCanvas, CanvasContext } from './ui/canvas';
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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import { EventType } from './engine/history';

// Initialize world singleton
const WORLD_SIZE = 256;
const DEFAULT_SEED = 12345;
const CANVAS_SIZE = 800;
let world = new World({ width: WORLD_SIZE, height: WORLD_SIZE, seed: DEFAULT_SEED });

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(canvasRef);
  const [ctx, setCtx] = useState<CanvasContext | null>(null);
  const [tick, setTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [layers, setLayers] = useState({
    terrain: true,
    rivers: true,
    vegetation: true,
    agents: true,
  });
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [history, setHistory] = useState<{ tick: number; population: number }[]>([]);
  
  // Stats tracking
  const [stats, setStats] = useState({
    peakPopulation: 0,
    totalBirths: 0,
    totalDeaths: 0,
    extinctionTick: null as number | null,
  });
  
  // UI state
  const [showEventLog, setShowEventLog] = useState(false);
  
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
    setIsPlaying(false);
    world = new World({ width: WORLD_SIZE, height: WORLD_SIZE, seed });
    setTick(0);
    setHistory([]);
    setStats({ peakPopulation: 0, totalBirths: 0, totalDeaths: 0, extinctionTick: null });
    setSelectedAgent(null);
    persistence.reset();
    lastSyncedEventCount.current = 0;
    
    // Start a new cloud run
    await persistence.startRun(0);
  }, [seed, persistence]);

  // Handle play/pause with cloud sync
  const handlePlayPause = useCallback(async () => {
    if (!isPlaying && !persistence.runId) {
      // Starting fresh - create cloud run
      await persistence.startRun(world.tickCount);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, persistence]);

  // Generate lore
  const handleGenerateLore = useCallback(async () => {
    if (!persistence.runId) return;
    
    await persistence.requestLore({
      peak_population: stats.peakPopulation,
      total_births: stats.totalBirths,
      total_deaths: stats.totalDeaths,
      extinction_tick: stats.extinctionTick ?? undefined,
      final_tick: world.tickCount,
    });
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
          setSpeed(s => Math.min(s + 1, 10));
          break;
        case 'Minus':
        case 'NumpadSubtract':
          e.preventDefault();
          setSpeed(s => Math.max(s - 1, 1));
          break;
        case 'KeyL':
          e.preventDefault();
          setShowEventLog(v => !v);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);

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

    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      if (isPlaying) {
        accumulator += deltaTime * speed;
        const fixedDelta = 16; // 60 ticks/sec

        while (accumulator >= fixedDelta) {
          const prevAgentCount = world.agents.length;
          world.tick();
          setTick(world.tickCount); // Trigger React re-render
          
          // Track stats
          const currentPop = world.agents.length;
          setStats(prev => {
            const births = world.history.events.filter(e => e.type === EventType.AGENT_SPAWN).length;
            const deaths = world.history.events.filter(e => e.type === EventType.AGENT_DEATH).length;
            const newPeak = Math.max(prev.peakPopulation, currentPop);
            const extinction = currentPop === 0 && prev.extinctionTick === null 
              ? world.tickCount 
              : prev.extinctionTick;
            
            return {
              peakPopulation: newPeak,
              totalBirths: births,
              totalDeaths: deaths,
              extinctionTick: extinction,
            };
          });
          
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
        {showEventLog && (
          <div className="absolute top-6 left-6 w-72 h-80 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-3 shadow-xl">
            <EventLog events={world.history.events} currentTick={tick} maxEvents={100} />
          </div>
        )}
        
        {/* Overlay Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur px-6 py-3 rounded-full border border-gray-700 shadow-xl">
          <button 
            onClick={handlePlayPause}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Speed control with current speed display */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSpeed(s => Math.max(1, s - 1))}
              className="px-2 py-1 rounded text-sm font-medium hover:bg-white/10 text-gray-400"
              title="Slower (-)"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-mono">{speed}x</span>
            <button 
              onClick={() => setSpeed(s => Math.min(10, s + 1))}
              className="px-2 py-1 rounded text-sm font-medium hover:bg-white/10 text-gray-400"
              title="Faster (+)"
            >
              +
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Toggle event log */}
          <button
            onClick={() => setShowEventLog(v => !v)}
            className={clsx(
              "p-2 rounded-full transition-colors",
              showEventLog ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-400"
            )}
            title="Event Log (L)"
          >
            <ScrollText size={18} />
          </button>
          
          {/* Cloud sync indicator */}
          <div className="flex items-center gap-2 text-sm">
            {persistence.runId ? (
              <Cloud size={18} className={persistence.isSaving ? "text-blue-400 animate-pulse" : "text-green-400"} />
            ) : (
              <CloudOff size={18} className="text-gray-500" />
            )}
            {persistence.eventsSaved > 0 && (
              <span className="text-gray-400 text-xs">{persistence.eventsSaved}</span>
            )}
          </div>
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="absolute top-6 right-6 text-xs text-gray-500 bg-gray-900/60 px-2 py-1 rounded">
          Space: Play · +/-: Speed · L: Log
        </div>
      </div>

      {/* Sidebar Inspector */}
      <div className="w-80 border-l border-gray-800 bg-gray-900 p-4 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">God Engine</h1>
            <p className="text-xs text-gray-400">Simulation Cockpit</p>
          </div>
        </div>

        {/* Seed Control */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">World Seed</h2>
          <div className="flex gap-2">
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleRegenerate}
              className="p-2 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
              title="Regenerate World"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Inspector */}
        {selectedAgent ? (
          <AgentInspector agent={selectedAgent} />
        ) : (
          /* Vitals */
          <div className="space-y-4">
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="tick" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                    itemStyle={{ color: '#60a5fa' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="population" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
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
              <button
                onClick={handleGenerateLore}
                disabled={persistence.isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Sparkles size={16} />
                {persistence.isSaving ? 'Generating...' : 'Generate Lore'}
              </button>
            )}
            
            {/* Lore Display */}
            {persistence.lore && (
              <div className="bg-gray-800 rounded-lg p-3 border border-purple-900/50 text-sm text-gray-300 italic leading-relaxed max-h-48 overflow-y-auto">
                {persistence.lore}
              </div>
            )}
          </div>
        )}

        {/* Layers */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Settings size={14} /> Layers
          </h2>
          <div className="space-y-2">
            {Object.entries(layers).map(([key, active]) => (
              <button
                key={key}
                onClick={() => setLayers(prev => ({ ...prev, [key]: !prev[key as keyof typeof layers] }))}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors border",
                  active 
                    ? "bg-blue-600/10 border-blue-600/30 text-blue-400" 
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                )}
              >
                <span className="capitalize">{key}</span>
                <div className={clsx("w-2 h-2 rounded-full", active ? "bg-blue-400" : "bg-gray-600")} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
