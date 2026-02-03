import { useEffect, useRef, useState } from 'react';
import { World } from './engine/world';
import { setupCanvas, clearCanvas, CanvasContext } from './ui/canvas';
import { renderTerrain } from './ui/renderers/terrain';
import { renderRivers } from './ui/renderers/rivers';
import { renderVegetation } from './ui/renderers/vegetation';
import { renderAgents } from './ui/renderers/agent';
import { useCamera } from './ui/hooks/useCamera';
import { AgentInspector } from './ui/components/AgentInspector';
import { Agent } from './engine/agent';
import { Activity, Users, Settings, Play, Pause, FastForward, ZoomIn } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Initialize world singleton
const WORLD_SIZE = 256;
const world = new World({ width: WORLD_SIZE, height: WORLD_SIZE, seed: 12345 });

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(canvasRef);
  const [ctx, setCtx] = useState<CanvasContext | null>(null);
  const [tick, setTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [layers, setLayers] = useState({
    terrain: true,
    rivers: true,
    vegetation: true,
    agents: true,
  });
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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

  // Setup Canvas
  useEffect(() => {
    if (canvasRef.current && !ctx) {
      const context = setupCanvas('game-canvas', 800, 800);
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
          world.tick();
          setTick(world.tickCount); // Trigger React re-render
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
  }, [ctx, isPlaying, speed, layers, camera]);

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
        
        {/* Overlay Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur px-6 py-3 rounded-full border border-gray-700 shadow-xl">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <div className="h-6 w-px bg-gray-700" />
          
          <button 
            onClick={() => setSpeed(1)}
            className={clsx("px-3 py-1 rounded text-sm font-medium transition-colors", speed === 1 ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-400")}
          >
            1x
          </button>
          <button 
            onClick={() => setSpeed(5)}
            className={clsx("px-3 py-1 rounded text-sm font-medium transition-colors", speed === 5 ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-400")}
          >
            5x
          </button>
        </div>
      </div>

      {/* Sidebar Inspector */}
      <div className="w-80 border-l border-gray-800 bg-gray-900 p-4 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">God Engine</h1>
            <p className="text-xs text-gray-400">Simulation Cockpit</p>
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
