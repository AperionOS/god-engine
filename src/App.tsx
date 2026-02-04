import { useEffect, useRef, useState, useCallback } from 'react';
import { World } from './engine/world';
import { HeightMap } from './engine/height';
import { setupCanvas, CanvasContext } from './ui/canvas';
import { renderTerrain } from './ui/renderers/terrain';
import { renderRivers } from './ui/renderers/rivers';
import { renderVegetation } from './ui/renderers/vegetation';
import { renderAgents } from './ui/renderers/agent';
import { useCamera } from './ui/hooks/useCamera';
import { AgentInspector } from './ui/components/AgentInspector';
import { Minimap } from './ui/components/Minimap';
import { CellTooltip } from './ui/components/CellTooltip';
import { LocationPicker } from './ui/components/LocationPicker';
import { ControlBar } from './ui/components/ControlBar';
import { Sidebar } from './ui/components/Sidebar';
import { CameraControls } from './ui/components/CameraControls';
import { EventLogPanel, type WorldEvent } from './ui/components/EventLogPanel';
import { SaveMapDialog } from './ui/components/SaveMapDialog';
import { MyMapsPanel } from './ui/components/MyMapsPanel';
import { Agent } from './engine/agent';
import { usePersistence } from './api';
import { Toaster, toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { EventType } from './engine/history';
import { useUIStore } from './stores/uiStore';
import { fetchTerrain, normalizeElevations, type LatLng } from './services/terrainLoader';
import { saveMap, loadMap } from './services/mapPersistence';
import { deserializeWorld } from './engine/serialize';

// Initialize world singleton
const WORLD_SIZE = 256;
const DEFAULT_SEED = 12345;
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
  
  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [history, setHistory] = useState<{ tick: number; population: number }[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  
  // Real terrain state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLoadingTerrain, setIsLoadingTerrain] = useState(false);
  const [terrainLocation, setTerrainLocation] = useState<string | null>(null);
  
  // Map persistence state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showMyMaps, setShowMyMaps] = useState(false);
  const [isSavingMap, setIsSavingMap] = useState(false);
  
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
  
  // Load real terrain
  const handleLoadRealTerrain = useCallback(async (location: LatLng, name: string) => {
    setIsLoadingTerrain(true);
    try {
      const tile = await fetchTerrain(location, 12, WORLD_SIZE);
      const normalizedElevations = normalizeElevations(tile);
      
      const heightMap = HeightMap.fromElevationData(
        normalizedElevations,
        tile.width,
        tile.height,
        {
          locationName: name,
          minElevation: tile.minElevation,
          maxElevation: tile.maxElevation,
          bounds: tile.bounds,
        }
      );
      
      // Reset state
      setPlaying(false);
      setTick(0);
      setHistory([]);
      setStats({ peakPopulation: 0, totalBirths: 0, totalDeaths: 0, extinctionTick: null });
      setSelectedAgent(null);
      persistence.reset();
      lastSyncedEventCount.current = 0;
      
      // Load terrain into world
      world.loadRealTerrain(heightMap);
      
      // Update window reference for E2E tests
      if (typeof window !== 'undefined') {
        (window as any).__GOD_ENGINE_WORLD__ = world;
      }
      
      setTerrainLocation(name);
      setShowLocationPicker(false);
      toast.success(`Loaded terrain: ${name}`);
      
      // Start a new cloud run
      await persistence.startRun(0);
    } catch (error) {
      console.error('Failed to load terrain:', error);
      toast.error('Failed to load terrain. Try a different location.');
    } finally {
      setIsLoadingTerrain(false);
    }
  }, [persistence, setPlaying]);

  // Save current world to cloud
  const handleSaveMap = useCallback(async (name: string) => {
    setIsSavingMap(true);
    try {
      await saveMap(world, {
        name,
        locationName: terrainLocation || undefined,
      });
      toast.success(`Map "${name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save map:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save map');
      throw error;
    } finally {
      setIsSavingMap(false);
    }
  }, [terrainLocation]);

  // Load a saved map from cloud
  const handleLoadMap = useCallback(async (mapId: string) => {
    setIsLoadingTerrain(true);
    try {
      const { meta, world: loadedWorld } = await loadMap(mapId);
      
      // Replace the global world instance
      world = loadedWorld;
      
      // Update window reference for E2E tests
      if (typeof window !== 'undefined') {
        (window as any).__GOD_ENGINE_WORLD__ = world;
      }
      
      // Reset UI state
      setPlaying(false);
      setTick(loadedWorld.tickCount);
      setHistory([{ tick: loadedWorld.tickCount, population: loadedWorld.agents.length }]);
      setStats({
        peakPopulation: loadedWorld.agents.length,
        totalBirths: 0,
        totalDeaths: 0,
        extinctionTick: null,
      });
      setSelectedAgent(null);
      setTerrainLocation(meta.locationName);
      setSeed(meta.seed);
      
      toast.success(`Loaded map: ${meta.name}`);
    } catch (error) {
      console.error('Failed to load map:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load map');
      throw error;
    } finally {
      setIsLoadingTerrain(false);
    }
  }, [setPlaying, setSeed]);

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
    setTerrainLocation(null); // Clear real terrain
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

  // Camera controls
  const handleZoomIn = useCallback(() => {
    camera.setZoom(Math.min(camera.zoom * 1.25, 4));
  }, [camera]);
  
  const handleZoomOut = useCallback(() => {
    camera.setZoom(Math.max(camera.zoom / 1.25, 0.5));
  }, [camera]);
  
  const handleResetCamera = useCallback(() => {
    camera.setZoom(1);
    camera.setPosition(0, 0);
  }, [camera]);
  
  const handleCenterOnAgents = useCallback(() => {
    if (world.agents.length === 0) return;
    const avgX = world.agents.reduce((sum, a) => sum + a.x, 0) / world.agents.length;
    const avgY = world.agents.reduce((sum, a) => sum + a.y, 0) / world.agents.length;
    // Convert to canvas coordinates
    const canvasWidth = ctx?.width ?? window.innerWidth;
    const canvasHeight = ctx?.height ?? window.innerHeight;
    camera.setPosition(-(avgX / world.width - 0.5) * canvasWidth, -(avgY / world.height - 0.5) * canvasHeight);
  }, [camera, ctx]);
  
  const handlePan = useCallback((dx: number, dy: number) => {
    camera.setPosition(camera.x + dx, camera.y + dy);
  }, [camera]);
  
  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `god-engine-${seed}-tick-${tick}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('Screenshot saved!');
  }, [seed, tick]);
  
  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

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
        case 'KeyF':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'KeyR':
          e.preventDefault();
          handleResetCamera();
          break;
        case 'KeyC':
          e.preventDefault();
          handleCenterOnAgents();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, incrementSpeed, decrementSpeed, toggleEventLog, handleFullscreen, handleResetCamera, handleCenterOnAgents]);

  // Setup Canvas - size to window
  useEffect(() => {
    if (canvasRef.current && !ctx) {
      const canvas = canvasRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      const context2d = canvas.getContext('2d');
      if (context2d) {
        setCtx({ canvas, ctx: context2d, width, height });
      }
    }
    
    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current && ctx) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        setCtx({ ...ctx, width, height });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef, ctx]);

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
          
          // Auto-pause on extinction (UX: stop the clock when the world ends)
          if (world.agents.length === 0) {
            setPlaying(false);
            toast.error(`Extinction at tick ${world.tickCount}`);
            break;
          }
          
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
            const currentTick = world.tickCount;
            const currentPop = world.agents?.length ?? 0;
            
            // Only add valid data points
            if (typeof currentTick === 'number' && isFinite(currentTick)) {
              setHistory(prev => {
                const next = [...prev, { tick: currentTick, population: currentPop }];
                // Keep last 50 points
                if (next.length > 50) return next.slice(next.length - 50);
                return next;
              });
            }
            
            // Update worldEvents for EventLogPanel (convert engine events to UI format)
            const recentEvents = world.history.events.slice(-100);
            setWorldEvents(recentEvents.map(e => ({
              tick: e.tick,
              type: e.type === EventType.AGENT_DEATH ? 'death' : 
                    e.type === EventType.AGENT_SPAWN ? 'spawn' : 'birth',
              description: e.details,
              location: e.x !== undefined && e.y !== undefined ? { x: e.x, y: e.y } : undefined,
            })));
            
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
        
        // Read LIVE camera values from ref (avoids stale closure bug)
        const cam = camera.ref.current;
        
        // Clear with identity transform first
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = '#111827'; // Tailwind gray-900
        c.fillRect(0, 0, width, height);

        // Apply Camera Transform
        c.save();
        c.translate(width / 2, height / 2); // Center pivot
        c.scale(cam.zoom, cam.zoom);
        c.translate(-width / 2 + cam.x, -height / 2 + cam.y);

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
  }, [ctx, isPlaying, speed, layers, camera.ref, persistence]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-gray-950 text-white">
      {/* Layer 0: Canvas (The World) */}
      <div className="absolute inset-0 z-0">
        <canvas 
          id="game-canvas" 
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="block w-full h-full cursor-crosshair"
        />
      </div>
      
      {/* Layer 1: HUD Overlays (pointer-events-none container, children opt-in) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Cell Tooltip */}
        {ctx && (
          <CellTooltip
            world={world}
            canvasRef={canvasRef}
            camera={camera}
            canvasSize={{ width: ctx.width, height: ctx.height }}
          />
        )}
        
        {/* Camera Controls (left side, above minimap) */}
        <div className="absolute left-4 bottom-44 pointer-events-auto">
          <CameraControls
            zoom={camera.zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetCamera}
            onCenter={handleCenterOnAgents}
            onPan={handlePan}
          />
        </div>
        
        {/* Minimap (bottom-left, below camera controls) */}
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <Minimap
            world={world}
            camera={camera}
            canvasSize={{ width: ctx?.width ?? window.innerWidth, height: ctx?.height ?? window.innerHeight }}
            onNavigate={handleMinimapNavigate}
            size={140}
          />
        </div>
        
        {/* Event Log Panel (top-left) */}
        {showEventLog && (
          <div className="absolute top-4 left-4 pointer-events-auto">
            <EventLogPanel
              events={worldEvents}
              isVisible={showEventLog}
              onClose={toggleEventLog}
            />
          </div>
        )}
        
        {/* Control Bar (bottom center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <ControlBar
            isPlaying={isPlaying}
            speed={speed}
            showEventLog={showEventLog}
            onPlayPause={handlePlayPause}
            onSpeedUp={incrementSpeed}
            onSpeedDown={decrementSpeed}
            onToggleEventLog={toggleEventLog}
            onScreenshot={handleScreenshot}
            onFullscreen={handleFullscreen}
          />
        </div>
        
        {/* Keyboard shortcuts hint (top-right, but not over sidebar) */}
        <div className="absolute top-4 right-[340px] text-xs text-gray-500 bg-gray-900/60 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-800/50">
          Space: Play · +/-: Speed · L: Log · F: Fullscreen
        </div>
      </div>

      {/* Layer 2: Sidebar (right side, full height) */}
      <div className="absolute top-0 right-0 h-full z-20 pointer-events-auto">
        <Sidebar
          tick={tick}
          population={world.agents.length}
          stats={stats}
          history={history}
          terrainLocation={terrainLocation}
          seed={seed}
          onSeedChange={setSeed}
          onRegenerate={handleRegenerate}
          onLoadRealTerrain={() => setShowLocationPicker(true)}
          layers={layers}
          onToggleLayer={toggleLayer}
          cloudConnected={!!persistence.runId}
          cloudSaving={persistence.isSaving}
          eventsSaved={persistence.eventsSaved}
          onGenerateLore={persistence.runId ? handleGenerateLore : undefined}
          lore={persistence.lore || undefined}
          isGeneratingLore={persistence.isSaving}
          onSaveMap={() => setShowSaveDialog(true)}
          onOpenMyMaps={() => setShowMyMaps(true)}
          isSavingMap={isSavingMap}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      
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
      
      {/* Location Picker Modal */}
      <AnimatePresence>
        {showLocationPicker && (
          <LocationPicker
            onSelect={handleLoadRealTerrain}
            onCancel={() => setShowLocationPicker(false)}
            isLoading={isLoadingTerrain}
          />
        )}
      </AnimatePresence>
      
      {/* Save Map Dialog */}
      <SaveMapDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveMap}
        locationName={terrainLocation || undefined}
      />
      
      {/* My Maps Panel */}
      <MyMapsPanel
        isOpen={showMyMaps}
        onClose={() => setShowMyMaps(false)}
        onLoadMap={handleLoadMap}
      />
    </div>
  );
}
