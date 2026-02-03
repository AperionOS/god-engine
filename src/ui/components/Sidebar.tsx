import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Activity, Users, Skull, TrendingUp, Clock,
  ChevronLeft, ChevronRight, Mountain, Globe, RotateCcw, Sparkles,
  Cloud, CloudOff, Eye, EyeOff, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ResponsiveLine } from '@nivo/line';

interface Stats {
  peakPopulation: number;
  totalBirths: number;
  totalDeaths: number;
  extinctionTick: number | null;
}

interface LayerVisibility {
  terrain: boolean;
  rivers: boolean;
  vegetation: boolean;
  agents: boolean;
}

interface SidebarProps {
  // World info
  tick: number;
  population: number;
  stats: Stats;
  history: { tick: number; population: number }[];
  
  // Terrain
  terrainLocation: string | null;
  seed: number;
  onSeedChange: (seed: number) => void;
  onRegenerate: () => void;
  onLoadRealTerrain: () => void;
  
  // Layers
  layers: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
  
  // Cloud
  cloudConnected: boolean;
  cloudSaving: boolean;
  eventsSaved: number;
  
  // Lore
  onGenerateLore?: () => void;
  lore?: string;
  isGeneratingLore?: boolean;
  
  // UI
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  color = 'text-white',
  subtext 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType;
  color?: string;
  subtext?: string;
}) => (
  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
    <div className="flex items-center gap-2 text-gray-400 mb-1">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <div className={cn("text-xl font-bold font-mono", color)}>
      {value}
    </div>
    {subtext && (
      <div className="text-[10px] text-gray-500 mt-0.5">{subtext}</div>
    )}
  </div>
);

export function Sidebar({
  tick,
  population,
  stats,
  history,
  terrainLocation,
  seed,
  onSeedChange,
  onRegenerate,
  onLoadRealTerrain,
  layers,
  onToggleLayer,
  cloudConnected,
  cloudSaving,
  eventsSaved,
  onGenerateLore,
  lore,
  isGeneratingLore,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <motion.div 
        className={cn(
          "h-full bg-gray-900/95 backdrop-blur border-l border-gray-800 flex flex-col transition-all duration-300",
          isCollapsed ? "w-12" : "w-80"
        )}
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        {isCollapsed ? (
          /* Collapsed View - Icons Only */
          <div className="flex flex-col items-center gap-2 pt-12 px-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-lg bg-gray-800/50">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Population: {population}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-lg bg-gray-800/50">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Tick: {tick}</p>
              </TooltipContent>
            </Tooltip>
            
            <Separator className="my-2 w-6" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onLoadRealTerrain}
                >
                  <Mountain className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Load Real Terrain</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          /* Expanded View */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg leading-tight">God Engine</h1>
                <div className="flex items-center gap-2">
                  {terrainLocation ? (
                    <Badge variant="secondary" className="text-[10px] bg-green-900/50 text-green-400 border-green-700/50">
                      <Globe className="h-2.5 w-2.5 mr-1" />
                      {terrainLocation.split(',')[0]}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] bg-blue-900/50 text-blue-400 border-blue-700/50">
                      Seed: {seed}
                    </Badge>
                  )}
                  {cloudConnected ? (
                    <Cloud className={cn("h-3.5 w-3.5", cloudSaving ? "text-blue-400 animate-pulse" : "text-green-400")} />
                  ) : (
                    <CloudOff className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard 
                label="Population" 
                value={population} 
                icon={Users} 
                color="text-blue-400"
              />
              <StatCard 
                label="Tick" 
                value={tick} 
                icon={Clock} 
                color="text-gray-300"
              />
              <StatCard 
                label="Peak" 
                value={stats.peakPopulation} 
                icon={TrendingUp} 
                color="text-green-400"
              />
              <StatCard 
                label="Deaths" 
                value={stats.totalDeaths} 
                icon={Skull} 
                color="text-red-400"
              />
            </div>

            {/* Population Graph */}
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  Population History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-24">
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
                      areaOpacity={0.2}
                      curve="monotoneX"
                      animate={false}
                      isInteractive={false}
                      margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                      Collecting data...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Terrain Source */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Terrain Source
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={!terrainLocation ? "default" : "outline"}
                  size="sm"
                  onClick={onRegenerate}
                  className={cn(
                    "text-xs h-8",
                    !terrainLocation ? "bg-blue-600 hover:bg-blue-500" : ""
                  )}
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Procedural
                </Button>
                <Button
                  variant={terrainLocation ? "default" : "outline"}
                  size="sm"
                  onClick={onLoadRealTerrain}
                  className={cn(
                    "text-xs h-8",
                    terrainLocation ? "bg-green-600 hover:bg-green-500" : ""
                  )}
                >
                  <Mountain className="h-3 w-3 mr-1.5" />
                  Real World
                </Button>
              </div>
              
              {!terrainLocation && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={seed}
                    onChange={(e) => onSeedChange(parseInt(e.target.value) || 0)}
                    className="flex-1 h-8 text-xs bg-gray-800/50 border-gray-700/50 font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onRegenerate}
                    className="h-8 w-8"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Layer Toggles */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-3 w-3" />
                Layers
              </h3>
              <div className="space-y-1">
                {(Object.keys(layers) as (keyof LayerVisibility)[]).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-sm capitalize">{key}</span>
                    <Switch
                      checked={layers[key]}
                      onCheckedChange={() => onToggleLayer(key)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Lore */}
            {cloudConnected && onGenerateLore && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Button
                    onClick={onGenerateLore}
                    disabled={isGeneratingLore}
                    className="w-full bg-purple-600 hover:bg-purple-500 h-9 text-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    {isGeneratingLore ? 'Generating...' : 'Generate Lore'}
                  </Button>
                  
                  {lore && (
                    <motion.div
                      className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30 text-xs text-gray-300 italic leading-relaxed max-h-32 overflow-y-auto"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      {lore}
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-gray-800 text-[10px] text-gray-500 text-center">
            {eventsSaved > 0 && (
              <span>{eventsSaved} events synced</span>
            )}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
