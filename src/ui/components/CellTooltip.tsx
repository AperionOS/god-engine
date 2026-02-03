import { useState, useCallback, useRef, useEffect } from 'react';
import { World } from '../../engine/world';
import { BiomeType } from '../../engine/enums';

const BIOME_NAMES: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: 'Ocean',
  [BiomeType.BEACH]: 'Beach',
  [BiomeType.PLAINS]: 'Plains',
  [BiomeType.FOREST]: 'Forest',
  [BiomeType.DESERT]: 'Desert',
  [BiomeType.MOUNTAIN]: 'Mountain',
  [BiomeType.SNOW]: 'Snow',
};

const BIOME_COLORS: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: 'bg-blue-900',
  [BiomeType.BEACH]: 'bg-yellow-200',
  [BiomeType.PLAINS]: 'bg-green-500',
  [BiomeType.FOREST]: 'bg-green-800',
  [BiomeType.DESERT]: 'bg-yellow-500',
  [BiomeType.MOUNTAIN]: 'bg-gray-500',
  [BiomeType.SNOW]: 'bg-blue-200',
};

interface CellInfo {
  x: number;
  y: number;
  biome: BiomeType;
  height: number;
  moisture: number;
  vegetation: number;
  flow: number;
  isRiver: boolean;
}

interface CellTooltipProps {
  world: World;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  camera: { x: number; y: number; zoom: number };
  canvasSize: { width: number; height: number };
}

export function CellTooltip({ world, canvasRef, camera, canvasSize }: CellTooltipProps) {
  const [cellInfo, setCellInfo] = useState<CellInfo | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const debounceRef = useRef<number | null>(null);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Debounce updates
    if (debounceRef.current) {
      cancelAnimationFrame(debounceRef.current);
    }
    
    debounceRef.current = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Inverse camera transform
      const localX = clickX - canvasSize.width / 2;
      const localY = clickY - canvasSize.height / 2;
      const unscaledX = localX / camera.zoom;
      const unscaledY = localY / camera.zoom;
      const worldSpaceX = unscaledX - (-canvasSize.width / 2 + camera.x);
      const worldSpaceY = unscaledY - (-canvasSize.height / 2 + camera.y);
      
      const cellWidth = canvasSize.width / world.width;
      const cellHeight = canvasSize.height / world.height;
      const gridX = Math.floor(worldSpaceX / cellWidth);
      const gridY = Math.floor(worldSpaceY / cellHeight);
      
      // Check bounds
      if (gridX < 0 || gridX >= world.width || gridY < 0 || gridY >= world.height) {
        setCellInfo(null);
        return;
      }
      
      setCellInfo({
        x: gridX,
        y: gridY,
        biome: world.biomeMap.get(gridX, gridY),
        height: world.heightMap.get(gridX, gridY),
        moisture: world.moistureMap.get(gridX, gridY),
        vegetation: world.vegetationMap.get(gridX, gridY),
        flow: world.flowMap.getFlow(gridX, gridY),
        isRiver: world.flowMap.getRiver(gridX, gridY),
      });
      
      setPosition({ x: e.clientX, y: e.clientY });
    });
  }, [world, canvasRef, camera, canvasSize]);
  
  const handleMouseLeave = useCallback(() => {
    setCellInfo(null);
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (debounceRef.current) {
        cancelAnimationFrame(debounceRef.current);
      }
    };
  }, [canvasRef, handleMouseMove, handleMouseLeave]);
  
  if (!cellInfo) return null;
  
  return (
    <div
      className="fixed z-50 pointer-events-none bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-sm"
      style={{
        left: position.x + 16,
        top: position.y + 16,
      }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
        <div className={`w-3 h-3 rounded ${BIOME_COLORS[cellInfo.biome]}`} />
        <span className="font-medium text-white">{BIOME_NAMES[cellInfo.biome]}</span>
        <span className="text-gray-500 text-xs ml-auto">({cellInfo.x}, {cellInfo.y})</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-gray-400">Height</div>
        <div className="text-right font-mono text-white">{cellInfo.height.toFixed(2)}</div>
        
        <div className="text-gray-400">Moisture</div>
        <div className="text-right font-mono text-blue-400">{cellInfo.moisture.toFixed(2)}</div>
        
        <div className="text-gray-400">Vegetation</div>
        <div className="text-right font-mono text-green-400">{cellInfo.vegetation.toFixed(2)}</div>
        
        {cellInfo.isRiver && (
          <>
            <div className="text-gray-400">River</div>
            <div className="text-right font-mono text-cyan-400">Yes</div>
          </>
        )}
      </div>
    </div>
  );
}
