import * as THREE from 'three';

export interface FireConfig {
  intensity: number;
  size: number;
  flickerSpeed: number;
  particleCount: number;
  smokeEnabled: boolean;
  emberCount: number;
  lightColor: number;
  lightIntensity: number;
  lightDistance: number;
}

export interface FireParticleConfig {
  count: number;
  size: number;
  speed: number;
  color: THREE.Color;
  opacity: number;
  lifetime: number;
  spread: number;
}

export interface FireLightConfig {
  color: number;
  baseIntensity: number;
  maxIntensity: number;
  flickerSpeed: number;
  distance: number;
  castShadow: boolean;
}

export interface FireSoundConfig {
  volume: number;
  loop: boolean;
  fadeInTime: number;
  fadeOutTime: number;
  distanceModel: 'linear' | 'inverse' | 'exponential';
}

export const DEFAULT_FIRE_CONFIG: FireConfig = {
  intensity: 1.0,
  size: 1.0,
  flickerSpeed: 2.0,
  particleCount: 45,
  smokeEnabled: true,
  emberCount: 12,
  lightColor: 0xFF6600,
  lightIntensity: 12.0, // Strong intensity for shadow casting
  lightDistance: 60     // Good range for area lighting
};

export const FIREPLACE_PARTICLE_CONFIGS = {
  flames: {
    count: 8, // Reduced from 25 (68% reduction)
    size: 0.3,
    speed: 2.0,
    color: new THREE.Color(0xFF6600),
    opacity: 0.8,
    lifetime: 1.5,
    spread: 0.8
  } as FireParticleConfig,
  
  smoke: {
    count: 5, // Reduced from 15 (67% reduction)
    size: 0.5,
    speed: 1.0,
    color: new THREE.Color(0x888888),
    opacity: 0.4,
    lifetime: 3.0,
    spread: 1.2
  } as FireParticleConfig,
  
  embers: {
    count: 4, // Reduced from 12 (67% reduction)
    size: 0.1,
    speed: 0.5,
    color: new THREE.Color(0xFF4400),
    opacity: 0.9,
    lifetime: 2.0,
    spread: 1.0
  } as FireParticleConfig
};
