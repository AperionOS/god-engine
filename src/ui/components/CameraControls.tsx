import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ZoomIn, ZoomOut, Maximize2, Target, Move, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CameraControlsProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onCenter: () => void;
  onPan: (dx: number, dy: number) => void;
  className?: string;
}

export function CameraControls({
  zoom,
  minZoom = 0.5,
  maxZoom = 4,
  onZoomIn,
  onZoomOut,
  onReset,
  onCenter,
  onPan,
  className,
}: CameraControlsProps) {
  const zoomPercent = Math.round(zoom * 100);
  
  return (
    <TooltipProvider delayDuration={300}>
      <motion.div 
        className={cn(
          "flex flex-col gap-1 bg-gray-900/90 backdrop-blur-xl p-1.5 rounded-xl border border-gray-700/50 shadow-2xl",
          className
        )}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {/* Zoom In */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white/10"
              onClick={onZoomIn}
              disabled={zoom >= maxZoom}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zoom In <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">+</kbd></p>
          </TooltipContent>
        </Tooltip>

        {/* Zoom Display */}
        <div className="px-1 py-0.5 text-center">
          <motion.span 
            className="text-[10px] font-mono text-gray-400"
            key={zoomPercent}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {zoomPercent}%
          </motion.span>
        </div>

        {/* Zoom Out */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white/10"
              onClick={onZoomOut}
              disabled={zoom <= minZoom}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zoom Out <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">-</kbd></p>
          </TooltipContent>
        </Tooltip>

        <div className="h-px bg-gray-700/50 my-1" />

        {/* Reset Zoom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white/10"
              onClick={onReset}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Reset View <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">R</kbd></p>
          </TooltipContent>
        </Tooltip>

        {/* Center on Agents */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white/10"
              onClick={onCenter}
            >
              <Target className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Center on Agents <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">C</kbd></p>
          </TooltipContent>
        </Tooltip>

        <div className="h-px bg-gray-700/50 my-1" />

        {/* Pan Controls */}
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          <div />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded hover:bg-white/10"
            onClick={() => onPan(0, -20)}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <div />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded hover:bg-white/10"
            onClick={() => onPan(-20, 0)}
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <div className="flex items-center justify-center">
            <Move className="h-3 w-3 text-gray-500" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded hover:bg-white/10"
            onClick={() => onPan(20, 0)}
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
          
          <div />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded hover:bg-white/10"
            onClick={() => onPan(0, 20)}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <div />
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
