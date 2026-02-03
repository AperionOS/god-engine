import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayerVisibility {
  terrain: boolean;
  rivers: boolean;
  vegetation: boolean;
  agents: boolean;
}

interface UIState {
  // Playback
  isPlaying: boolean;
  speed: number;
  
  // Visibility
  layers: LayerVisibility;
  showEventLog: boolean;
  sidebarCollapsed: boolean;
  
  // Preferences
  seed: number;
  seedHistory: number[];
  
  // Actions
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  incrementSpeed: () => void;
  decrementSpeed: () => void;
  
  setLayer: (layer: keyof LayerVisibility, visible: boolean) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  toggleEventLog: () => void;
  toggleSidebar: () => void;
  
  setSeed: (seed: number) => void;
  addToSeedHistory: (seed: number) => void;
  
  reset: () => void;
}

const DEFAULT_STATE = {
  isPlaying: false,
  speed: 1,
  layers: {
    terrain: true,
    rivers: true,
    vegetation: true,
    agents: true,
  },
  showEventLog: false,
  sidebarCollapsed: false,
  seed: 12345,
  seedHistory: [12345],
};

export const useUIStore = create<UIState>()(
  persist(
    (set, _get) => ({
      ...DEFAULT_STATE,
      
      // Playback actions
      setPlaying: (isPlaying) => set({ isPlaying }),
      togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setSpeed: (speed) => set({ speed: Math.max(1, Math.min(10, speed)) }),
      incrementSpeed: () => set((state) => ({ speed: Math.min(10, state.speed + 1) })),
      decrementSpeed: () => set((state) => ({ speed: Math.max(1, state.speed - 1) })),
      
      // Layer actions
      setLayer: (layer, visible) => 
        set((state) => ({ layers: { ...state.layers, [layer]: visible } })),
      toggleLayer: (layer) => 
        set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),
      toggleEventLog: () => set((state) => ({ showEventLog: !state.showEventLog })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      // Seed actions
      setSeed: (seed) => set({ seed }),
      addToSeedHistory: (seed) => 
        set((state) => {
          const history = [seed, ...state.seedHistory.filter(s => s !== seed)].slice(0, 10);
          return { seedHistory: history };
        }),
      
      // Reset (except persisted preferences)
      reset: () => set({ 
        isPlaying: false, 
        speed: 1,
        showEventLog: false,
      }),
    }),
    {
      name: 'god-engine-ui',
      partialize: (state) => ({
        // Only persist these fields
        layers: state.layers,
        sidebarCollapsed: state.sidebarCollapsed,
        seed: state.seed,
        seedHistory: state.seedHistory,
      }),
    }
  )
);
