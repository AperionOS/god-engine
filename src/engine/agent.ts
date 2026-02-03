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

  constructor(config: AgentConfig) {
    this.id = config.id ?? 0;
    this.x = config.x;
    this.y = config.y;
    this.hunger = config.hunger ?? 0;
    this.energy = config.energy ?? 0;
    this.speed = config.speed ?? WORLD_CONFIG.AGENT.SPEED;
    this.senseRadius = config.senseRadius ?? WORLD_CONFIG.AGENT.SENSE_RADIUS;
  }

  update(vegetation: VegetationMap, rng: SeededRNG): void {
    if (this.state === AgentState.DEAD) return;

    // Hunger logic
    this.hunger += WORLD_CONFIG.AGENT.HUNGER_RATE;
    if (this.hunger >= this.maxHunger) {
      this.state = AgentState.DEAD;
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
        // Transition state, usually handled by World
        break;
    }

    // Reproduction check
    if (this.state === AgentState.IDLE && 
        this.hunger < WORLD_CONFIG.AGENT.REPRODUCTION.HUNGER_THRESHOLD && 
        this.energy >= WORLD_CONFIG.AGENT.REPRODUCTION.ENERGY_REQUIRED) {
      this.state = AgentState.REPRODUCING;
    }

    // Clamp to world bounds
    const { width, height } = vegetation;
    this.x = Math.max(0, Math.min(width - 1, this.x));
    this.y = Math.max(0, Math.min(height - 1, this.y));
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
    let bestX = this.x;
    let bestY = this.y;
    let bestVeg = 0;

    for (let dy = -this.senseRadius; dy <= this.senseRadius; dy++) {
      for (let dx = -this.senseRadius; dx <= this.senseRadius; dx++) {
        const nx = Math.floor(this.x + dx);
        const ny = Math.floor(this.y + dy);
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const veg = vegetation.get(nx, ny);
          if (veg > bestVeg) {
            bestVeg = veg;
            bestX = nx;
            bestY = ny;
          }
        }
      }
    }

    if (bestVeg > 0.1) {
      const dx = bestX - this.x;
      const dy = bestY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.5) {
        this.state = AgentState.EATING;
      } else {
        this.move((dx / dist) * this.speed, (dy / dist) * this.speed);
      }
    } else {
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
    this.hunger -= consumed * 15;
    this.energy += consumed * 20; // Gain energy from eating

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
