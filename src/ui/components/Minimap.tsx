import { useEffect, useRef, useMemo } from 'react';
import { World } from '../../engine/world';
import { BiomeType } from '../../engine/enums';

const BIOME_COLORS: Record<BiomeType, string> = {
  [BiomeType.OCEAN]: '#1e3a5f',
  [BiomeType.BEACH]: '#f5deb3',
  [BiomeType.PLAINS]: '#7cba5f',
  [BiomeType.FOREST]: '#2d5a27',
  [BiomeType.DESERT]: '#e6c87a',
  [BiomeType.MOUNTAIN]: '#6b7280',
  [BiomeType.SNOW]: '#b8d4e8',
};

interface MinimapProps {
  world: World;
  camera: { x: number; y: number; zoom: number };
  canvasSize: { width: number; height: number };
  onNavigate: (x: number, y: number) => void;
  size?: number;
}

export function Minimap({ world, camera, canvasSize, onNavigate, size = 160 }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate minimap image data (memoized, only regenerates when world changes)
  const minimapImageData = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = world.width;
    canvas.height = world.height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(world.width, world.height);
    
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const biome = world.biomeMap.get(x, y);
        const color = BIOME_COLORS[biome] || '#000000';
        
        // Parse hex color
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        const idx = (y * world.width + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }, [world.biomeMap, world.width, world.height]);
  
  // Render minimap with viewport overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    
    // Clear and draw terrain
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(minimapImageData, 0, 0, size, size);
    
    // Draw agents as dots
    ctx.fillStyle = '#ffffff';
    const scale = size / world.width;
    for (const agent of world.agents) {
      const ax = agent.x * scale;
      const ay = agent.y * scale;
      ctx.fillRect(ax - 0.5, ay - 0.5, 1.5, 1.5);
    }
    
    // Calculate viewport rectangle
    const cellSize = canvasSize.width / world.width;
    const viewportWidthWorld = (canvasSize.width / camera.zoom) / cellSize;
    const viewportHeightWorld = (canvasSize.height / camera.zoom) / cellSize;
    
    // Camera position is offset from center
    const centerX = world.width / 2 - camera.x / cellSize;
    const centerY = world.height / 2 - camera.y / cellSize;
    
    const vpX = (centerX - viewportWidthWorld / 2) * scale;
    const vpY = (centerY - viewportHeightWorld / 2) * scale;
    const vpW = viewportWidthWorld * scale;
    const vpH = viewportHeightWorld * scale;
    
    // Draw viewport rectangle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    
    // Inner glow
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX + 1, vpY + 1, vpW - 2, vpH - 2);
  }, [minimapImageData, world.agents, camera, canvasSize, size]);
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to world coordinates
    const scale = size / world.width;
    const worldX = clickX / scale;
    const worldY = clickY / scale;
    
    // Convert to camera offset
    const cellSize = canvasSize.width / world.width;
    const newCameraX = (world.width / 2 - worldX) * cellSize;
    const newCameraY = (world.height / 2 - worldY) * cellSize;
    
    onNavigate(newCameraX, newCameraY);
  };
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onClick={handleClick}
        className="rounded border border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
      />
      <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-gray-400">
        {world.width}×{world.height}
      </div>
    </div>
  );
}
