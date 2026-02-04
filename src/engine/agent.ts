import { VegetationMap } from './vegetation';
import { SeededRNG } from './rng';
import { WORLD_CONFIG } from './config';

export enum AgentState {
  IDLE = 'IDLE',
  FORAGING = 'FORAGING',
  EATING = 'EATING',
  REPRODUCING = 'REPRODUCING',
  DEAD = 'DEAD',
}

export interface AgentConfig {
  id?: number;
  x: number;
  y: number;
  hunger?: number;
  speed?: number;
  senseRadius?: number;
  energy?: number;
}

export class Agent {
  readonly id: number;
  x: number;
  y: number;
  hunger: number;
  energy: number;
  speed: number;
  senseRadius: number;
  state: AgentState = AgentState.IDLE;
  maxHunger: number = WORLD_CONFIG.AGENT.MAX_HUNGER;
  maxEnergy: number = WORLD_CONFIG.AGENT.MAX_ENERGY;

  /** Scarcity v1: Cooldown ticks before agent can reproduce again */
  reproCooldown: number = 0;

  /** Scarcity v1: Set when the agent enters DEAD state (for explainability) */
  deathCause: string | null = null;

  constructor(config: AgentConfig) {
    this.id = config.id ?? 0;
    this.x = config.x;
    this.y = config.y;
    this.hunger = config.hunger ?? 0;
    this.energy = config.energy ?? 0;
    this.speed = config.speed ?? WORLD_CONFIG.AGENT.SPEED;
    this.senseRadius = config.senseRadius ?? WORLD_CONFIG.AGENT.SENSE_RADIUS;
  }

  /** Scarcity v1: Kill agent with a specific cause for logging */
  kill(cause: string): void {
    this.deathCause = cause;
    this.state = AgentState.DEAD;
  }

  update(vegetation: VegetationMap, rng: SeededRNG): void {
    if (this.state === AgentState.DEAD) return;

    // Cooldowns
    if (this.reproCooldown > 0) this.reproCooldown--;

    // Scarcity v1: Stored energy decays slowly (prevents "infinite reproduction")
    this.energy = Math.max(0, this.energy - WORLD_CONFIG.AGENT.ENERGY_DECAY);

    // Hunger increases every tick
    this.hunger += WORLD_CONFIG.AGENT.HUNGER_RATE;

    // Hard starvation death
    if (this.hunger >= this.maxHunger) {
      this.kill('Starvation');
      return;
    }

    // State Machine
    switch (this.state) {
      case AgentState.IDLE:
        this.handleIdle(rng);
        break;
      case AgentState.FORAGING:
        this.handleForaging(vegetation, rng);
        break;
      case AgentState.EATING:
        this.handleEating(vegetation);
        break;
      case AgentState.REPRODUCING:
        // Transition state, handled by World
        break;
    }

    // Scarcity v1: Reproduction gate - must be well-fed + have energy + be in abundant cell + off cooldown
    if (this.state === AgentState.IDLE && this.reproCooldown === 0) {
      const cellX = Math.floor(this.x);
      const cellY = Math.floor(this.y);
      const localVeg = vegetation.get(cellX, cellY);

      if (
        this.hunger < WORLD_CONFIG.AGENT.REPRODUCTION.HUNGER_THRESHOLD &&
        this.energy >= WORLD_CONFIG.AGENT.REPRODUCTION.ENERGY_REQUIRED &&
        localVeg >= WORLD_CONFIG.AGENT.REPRODUCTION.MIN_LOCAL_VEG
      ) {
        this.state = AgentState.REPRODUCING;
      }
    }

    // Clamp to world bounds
    const { width, height } = vegetation;
    this.x = Math.max(0, Math.min(width - 1, this.x));
    this.y = Math.max(0, Math.min(height - 1, this.y));

    // Clamp energy
    this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy));
  }

  private handleIdle(rng: SeededRNG): void {
    if (this.hunger > 30) {
      this.state = AgentState.FORAGING;
      return;
    }

    if (rng.next() < 0.1) {
      const angle = rng.range(0, Math.PI * 2);
      this.move(
        Math.cos(angle) * (this.speed * 0.5),
        Math.sin(angle) * (this.speed * 0.5)
      );
    }
  }

  private handleForaging(vegetation: VegetationMap, rng: SeededRNG): void {
    const { width, height } = vegetation;

    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    // If current tile is good enough, eat now (prevents "chasing slightly better food" loops)
    const hereVeg = vegetation.get(cx, cy);
    if (hereVeg >= 0.12) {
      this.state = AgentState.EATING;
      return;
    }

    let bestX = cx;
    let bestY = cy;
    let bestScore = 0;

    for (let dy = -this.senseRadius; dy <= this.senseRadius; dy++) {
      for (let dx = -this.senseRadius; dx <= this.senseRadius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const veg = vegetation.get(nx, ny);
        if (veg <= 0.02) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const score = veg / (1 + dist); // prefer closer food

        if (score > bestScore) {
          bestScore = score;
          bestX = nx;
          bestY = ny;
        }
      }
    }

    if (bestScore > 0) {
      const dx = bestX - this.x;
      const dy = bestY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.5) {
        this.state = AgentState.EATING;
      } else {
        this.move((dx / dist) * this.speed, (dy / dist) * this.speed);
      }
    } else {
      // No food nearby, roam
      const angle = rng.range(0, Math.PI * 2);
      this.move(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    }
  }

  private handleEating(vegetation: VegetationMap): void {
    const cellX = Math.floor(this.x);
    const cellY = Math.floor(this.y);
    const vegAvailable = vegetation.get(cellX, cellY);

    if (vegAvailable < 0.05) {
      this.state = AgentState.FORAGING;
      return;
    }

    const consumed = vegetation.consume(cellX, cellY, 0.2);
    
    // Eating reduces hunger and increases stored energy
    this.hunger -= consumed * 15;
    this.energy += consumed * 20;

    if (this.hunger <= 0) {
      this.hunger = 0;
      this.state = AgentState.IDLE;
    }
  }

  private move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    
    // Movement cost scales with speed and distance moved
    const dist = Math.sqrt(dx * dx + dy * dy);
    const cost = dist * WORLD_CONFIG.AGENT.MOVE_COST * this.speed;
    this.hunger += cost;
  }

  reproduce(nextId: number, rng: SeededRNG): Agent {
    this.energy -= WORLD_CONFIG.AGENT.REPRODUCTION.ENERGY_REQUIRED;
    this.energy = Math.max(0, this.energy);

    // Scarcity v1: Set reproduction cooldown
    this.reproCooldown = WORLD_CONFIG.AGENT.REPRODUCTION.COOLDOWN_TICKS;
    this.state = AgentState.IDLE;

    // Mutate traits
    const mutate = (val: number) => {
      if (rng.next() < WORLD_CONFIG.AGENT.REPRODUCTION.MUTATION_RATE) {
        const delta = rng.range(-WORLD_CONFIG.AGENT.REPRODUCTION.MUTATION_AMOUNT, WORLD_CONFIG.AGENT.REPRODUCTION.MUTATION_AMOUNT);
        return Math.max(0.1, val + delta);
      }
      return val;
    };

    return new Agent({
      id: nextId,
      x: this.x,
      y: this.y,
      hunger: 30, // Start slightly hungry
      energy: 0,
      speed: mutate(this.speed),
      senseRadius: mutate(this.senseRadius),
    });
  }

  isDead(): boolean {
    return this.state === AgentState.DEAD;
  }
}
