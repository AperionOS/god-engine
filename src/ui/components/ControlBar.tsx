import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Minus, Plus, ScrollText, Maximize, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ControlBarProps {
  isPlaying: boolean;
  speed: number;
  showEventLog: boolean;
  onPlayPause: () => void;
  onSpeedUp: () => void;
  onSpeedDown: () => void;
  onToggleEventLog: () => void;
  onScreenshot?: () => void;
  onFullscreen?: () => void;
}

export function ControlBar({
  isPlaying,
  speed,
  showEventLog,
  onPlayPause,
  onSpeedUp,
  onSpeedDown,
  onToggleEventLog,
  onScreenshot,
  onFullscreen,
}: ControlBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <motion.div 
        className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-xl px-2 py-1.5 rounded-xl border border-gray-700/50 shadow-2xl"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Playback Controls */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-700/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-white/10"
                onClick={onPlayPause}
              >
                <motion.div
                  key={isPlaying ? 'pause' : 'play'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </motion.div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isPlaying ? 'Pause' : 'Play'} <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">Space</kbd></p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-0.5 px-2 border-r border-gray-700/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white/10"
                onClick={onSpeedDown}
                disabled={speed <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Slower <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">-</kbd></p>
            </TooltipContent>
          </Tooltip>
          
          <motion.div 
            className="w-12 text-center font-mono text-sm font-medium"
            key={speed}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {speed}x
          </motion.div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white/10"
                onClick={onSpeedUp}
                disabled={speed >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Faster <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">+</kbd></p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-0.5 pl-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg",
                  showEventLog ? "bg-blue-600 text-white hover:bg-blue-500" : "hover:bg-white/10"
                )}
                onClick={onToggleEventLog}
              >
                <ScrollText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Event Log <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">L</kbd></p>
            </TooltipContent>
          </Tooltip>

          {onScreenshot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-white/10"
                  onClick={onScreenshot}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Screenshot</p>
              </TooltipContent>
            </Tooltip>
          )}

          {onFullscreen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-white/10"
                  onClick={onFullscreen}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Fullscreen <kbd className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">F</kbd></p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
