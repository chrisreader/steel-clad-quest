
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  experience: number;
  experienceToNext: number;
  gold: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Enemy {
  id: string;
  type: 'goblin' | 'orc' | 'skeleton' | 'boss';
  position: Vector3;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  goldReward: number;
  experienceReward: number;
  isAlive: boolean;
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'material';
  value: number;
  stats?: Partial<PlayerStats>;
  description: string;
  quantity: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  completed: boolean;
  rewards: {
    gold: number;
    experience: number;
    items?: Item[];
  };
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  currentLevel: string;
  score: number;
  timeElapsed: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
  unlocked: boolean;
}

export interface WeaponData {
  damage: number;
  range: number;
  speed: number;
  durability: number;
}

export interface ArmorData {
  defense: number;
  durability: number;
}
