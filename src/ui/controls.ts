export interface ControlsConfig {
  onSeedChange: (seed: number) => void;
  onPlayPause: (playing: boolean) => void;
  onStep: () => void;
  onSpeedChange: (speed: number) => void;
  onLayerToggle: (layer: string, enabled: boolean) => void;
}

export interface ControlsState {
  playing: boolean;
  speed: number;
  layers: {
    rivers: boolean;
    vegetation: boolean;
  };
}

export function setupControls(config: ControlsConfig): ControlsState {
  const state: ControlsState = {
    playing: false,
    speed: 1,
    layers: {
      rivers: true,
      vegetation: true,
    },
  };

  // Seed input
  const seedInput = document.getElementById('seed-input') as HTMLInputElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;

  regenerateBtn?.addEventListener('click', () => {
    const seed = parseInt(seedInput.value) || Date.now();
    config.onSeedChange(seed);
  });

  // Play/Pause
  const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
  playPauseBtn?.addEventListener('click', () => {
    state.playing = !state.playing;
    playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
    config.onPlayPause(state.playing);
  });

  // Step
  const stepBtn = document.getElementById('step-btn') as HTMLButtonElement;
  stepBtn?.addEventListener('click', () => {
    config.onStep();
  });

  // Speed
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedLabel = document.getElementById('speed-label') as HTMLSpanElement;
  speedSlider?.addEventListener('input', () => {
    state.speed = parseFloat(speedSlider.value);
    if (speedLabel) speedLabel.textContent = state.speed.toFixed(1);
    config.onSpeedChange(state.speed);
  });

  // Layer toggles
  const riversToggle = document.getElementById('rivers-toggle') as HTMLInputElement;
  riversToggle?.addEventListener('change', () => {
    state.layers.rivers = riversToggle.checked;
    config.onLayerToggle('rivers', riversToggle.checked);
  });

  const vegetationToggle = document.getElementById('vegetation-toggle') as HTMLInputElement;
  vegetationToggle?.addEventListener('change', () => {
    state.layers.vegetation = vegetationToggle.checked;
    config.onLayerToggle('vegetation', vegetationToggle.checked);
  });

  return state;
}
