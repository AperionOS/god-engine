import './style.css';
import { World } from './engine/world';
import { setupCanvas, clearCanvas, CanvasContext } from './ui/canvas';
import { renderTerrain } from './ui/renderers/terrain';
import { renderRivers } from './ui/renderers/rivers';
import { renderVegetation } from './ui/renderers/vegetation';
import { renderAgents } from './ui/renderers/agent';
import { setupControls, ControlsState } from './ui/controls';

const CANVAS_SIZE = 800;
const WORLD_SIZE = 256;

let world = new World({ width: WORLD_SIZE, height: WORLD_SIZE, seed: 12345 });
let canvasCtx: CanvasContext;
let controlsState: ControlsState;
let lastFrameTime = 0;
let accumulator = 0;

function render() {
  clearCanvas(canvasCtx);
  renderTerrain(world, canvasCtx);

  if (controlsState.layers.rivers) {
    renderRivers(world, canvasCtx);
  }

  if (controlsState.layers.vegetation) {
    renderVegetation(world, canvasCtx);
  }

  renderAgents(world, canvasCtx);

  // Update stats
  const statsEl = document.getElementById('stats');
  if (statsEl) {
    const lastEvent = world.history.getRecent(1)[0];
    const eventText = lastEvent 
      ? ` | Last Event: ${lastEvent.type} @ ${lastEvent.tick}` 
      : '';
    statsEl.textContent = `Tick: ${world.tickCount} | Seed: ${world.seed} | Agents: ${world.agents.length}${eventText}`;
  }
}

function update(deltaTime: number) {
  if (controlsState.playing) {
    accumulator += deltaTime * controlsState.speed;

    // Fixed timestep: 16ms (60 ticks per second at 1x speed)
    const fixedDelta = 16;

    while (accumulator >= fixedDelta) {
      world.tick();
      accumulator -= fixedDelta;
    }
  }
}

function loop(currentTime: number) {
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  update(deltaTime);
  render();

  requestAnimationFrame(loop);
}

function init() {
  canvasCtx = setupCanvas('game-canvas', CANVAS_SIZE, CANVAS_SIZE);

  controlsState = setupControls({
    onSeedChange: (seed) => {
      world.regenerate(seed);
      const seedInput = document.getElementById('seed-input') as HTMLInputElement;
      if (seedInput) seedInput.value = seed.toString();
      render();
    },
    onPlayPause: (playing) => {
      if (!playing) {
        accumulator = 0;
      }
    },
    onStep: () => {
      world.tick();
      render();
    },
    onSpeedChange: () => {
      // Speed is handled in update loop
    },
    onLayerToggle: () => {
      render();
    },
  });

  // Set initial seed in input
  const seedInput = document.getElementById('seed-input') as HTMLInputElement;
  if (seedInput) seedInput.value = world.seed.toString();

  render();
  requestAnimationFrame(loop);
}

init();
