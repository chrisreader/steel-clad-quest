import * as THREE from 'three';

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
  attackPower: number;
  movementSpeed: number;
  attackDamage: number;
  inventorySize: number;
  initialLevel: number;
}

export interface PlayerBody {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  body: THREE.Mesh;
  head: THREE.Mesh;
  // New realistic arm components
  leftUpperArm?: THREE.Mesh;
  rightUpperArm?: THREE.Mesh;
  leftForearm?: THREE.Mesh;
  rightForearm?: THREE.Mesh;
  leftElbow?: THREE.Group;
  rightElbow?: THREE.Group;
  leftWrist?: THREE.Group;
  rightWrist?: THREE.Group;
  // Add foot properties for complete body representation
  leftFoot?: THREE.Mesh;
  rightFoot?: THREE.Mesh;
}

// Equipment slot types
export type EquipmentSlotType = 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'mainhand' | 'offhand';

// Inventory slot interface
export interface InventorySlot {
  id: number;
  item: Item | null;
  isEmpty: boolean;
}

// Equipment slots interface
export interface EquippedItems {
  helmet: Item | null;
  chestplate: Item | null;
  leggings: Item | null;
  boots: Item | null;
  mainhand: Item | null;
  offhand: Item | null;
}

// Weapon system interfaces
export interface WeaponStats {
  damage: number;
  attackSpeed: number;
  range: number;
  durability: number;
  weight: number;
}

export interface WeaponConfig {
  id: string;
  name: string;
  type: 'sword' | 'axe' | 'mace' | 'bow';
  stats: WeaponStats;
  swingAnimation: {
    duration: number;
    phases: {
      windup: number;
      slash: number;
      recovery: number;
    };
    rotations: {
      neutral: { x: number; y: number; z: number };
      windup: { x: number; y: number; z: number };
      slash: { x: number; y: number; z: number };
    };
  };
}

// Enhanced Item interface
export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'material';
  subtype?: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'sword' | 'shield' | 'bow';
  value: number;
  stats?: Partial<PlayerStats>;
  description: string;
  quantity: number;
  equipmentSlot?: EquipmentSlotType;
  icon?: string; // For UI display
  tier?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  weaponId?: string; // Links to weapon system
}

// Enemy types enum
export enum EnemyType {
  GOBLIN = 'goblin',
  ORC = 'orc',
  SKELETON = 'skeleton',
  BOSS = 'boss'
}

// Enemy interface for the game entity
export interface Enemy {
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  goldReward: number;
  experienceReward: number;
  lastAttackTime: number;
  isDead: boolean;
  deathTime: number;
  type: EnemyType;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  walkTime: number;
  hitBox: THREE.Mesh;
  originalMaterials: THREE.Material[];
  isHit: boolean;
  hitTime: number;
  deathAnimation: {
    falling: boolean;
    rotationSpeed: number;
    fallSpeed: number;
  };
  weapon: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  attackRange: number;
  damageRange: number;
  attackCooldown: number;
  points: number;
  idleTime: number;
}

// Level and terrain interfaces
export interface Level {
  name: string;
  description: string;
  terrain: TerrainConfig;
  lighting: LightingConfig;
  spawns: {
    player: Vector3;
    enemies: Array<{
      type: Enemy['type'];
      position: Vector3;
    }>;
  };
}

export interface TerrainConfig {
  type: 'forest' | 'dungeon' | 'cave' | 'lava';
  size: { width: number; length: number };
  heightVariation: number;
  heightMap?: number[][];
  features: TerrainFeature[];
}

export interface TerrainFeature {
  type: 'tree' | 'rock' | 'bush' | 'building' | 'water';
  position: Vector3;
  scale: Vector3;
  rotation: Vector3;
  properties?: Record<string, any>;
}

export interface LightingConfig {
  ambient: {
    color: number;
    intensity: number;
  };
  directional: Array<{
    color: number;
    intensity: number;
    position: Vector3;
    castShadows: boolean;
  }>;
  point: Array<{
    color: number;
    intensity: number;
    position: Vector3;
    distance: number;
    castShadows: boolean;
  }>;
}

// First-person specific interfaces
export interface FirstPersonCamera {
  camera: THREE.PerspectiveCamera;
  yaw: number;
  pitch: number;
  sensitivity: number;
  bobbing: CameraBobbing;
  shake: CameraShake;
}

export interface CameraBobbing {
  enabled: boolean;
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface CameraShake {
  active: boolean;
  intensity: number;
  duration: number;
  startTime: number;
}

export interface PlayerHands {
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  weapon: THREE.Group | null;
  isVisible: boolean;
}

// Updated SwordSwingAnimation to WeaponSwingAnimation
export interface WeaponSwingAnimation {
  isActive: boolean;
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  startTime: number;
  duration: number;
  phases: {
    windup: number;
    slash: number;
    recovery: number;
  };
  rotations: {
    neutral: { x: number; y: number; z: number };
    windup: { x: number; y: number; z: number };
    slash: { x: number; y: number; z: number };
  };
  clock: THREE.Clock;
  trail: THREE.Line | null;
  trailPoints: THREE.Vector3[];
  cameraShakeIntensity: number;
  wristSnapIntensity: number;
}

// Legacy alias for backward compatibility
export type SwordSwingAnimation = WeaponSwingAnimation;

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

// First-person UI interfaces
export interface CrosshairConfig {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  style: 'cross' | 'dot' | 'circle';
}

export interface WeaponViewModel {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  swayAmount: number;
  bobAmount: number;
}

// Input system for first-person
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  block: boolean;
  inventory: boolean;
  interact: boolean;
  jump: boolean;
  run: boolean;
}

export interface MouseInput {
  deltaX: number;
  deltaY: number;
  isLocked: boolean;
}

// Sound system interfaces
export interface AudioConfig {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  spatialAudio: boolean;
}

export interface SoundEffect {
  id: string;
  url: string;
  volume: number;
  loop: boolean;
  spatial: boolean;
}

// Combat system for first-person
export interface CombatConfig {
  attackRange: number;
  blockChance: number;
  criticalChance: number;
  criticalMultiplier: number;
  staminaCostPerAttack: number;
  staminaCostPerBlock: number;
}

export interface DamageInfo {
  amount: number;
  isCritical: boolean;
  isBlocked: boolean;
  sourcePosition: Vector3;
  targetPosition: Vector3;
}

// Particle and effects system
export interface ParticleEffect {
  id: string;
  position: Vector3;
  particles: THREE.Points;
  duration: number;
  startTime: number;
  autoRemove: boolean;
}

export interface BloodSplatter {
  position: Vector3;
  velocity: Vector3;
  size: number;
  lifetime: number;
  color: number;
}

// Game settings and options
export interface GameSettings {
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    shadowQuality: 'off' | 'low' | 'medium' | 'high';
    antialiasing: boolean;
    vsync: boolean;
    fov: number;
  };
  audio: AudioConfig;
  controls: {
    mouseSensitivity: number;
    invertY: boolean;
    keyBindings: Record<string, string>;
  };
  gameplay: {
    crosshair: CrosshairConfig;
    showDamageNumbers: boolean;
    showHealthBars: boolean;
    autoSave: boolean;
  };
}

// Save system
export interface SaveData {
  version: string;
  timestamp: number;
  playerStats: PlayerStats;
  playerPosition: Vector3;
  currentLevel: string;
  inventory: Item[];
  quests: Quest[];
  skills: Skill[];
  gameTime: number;
  settings: GameSettings;
}

// Performance monitoring
export interface PerformanceStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
}

export interface Gold {
  mesh: THREE.Mesh;
  value: number;
  rotationSpeed: number;
}

// Add WeaponType definition for animation system
export type WeaponType = 'melee' | 'bow' | 'empty';
