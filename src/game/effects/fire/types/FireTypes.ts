
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
  lightIntensity: 1.5,
  lightDistance: 8
};

export const FIREPLACE_PARTICLE_CONFIGS = {
  flames: {
    count: 40,
    size: 0.5,
    speed: 2.0,
    color: new THREE.Color(0xFF6600),
    opacity: 0.9,
    lifetime: 2.5,
    spread: 0.8
  } as FireParticleConfig,
  
  smoke: {
    count: 20,
    size: 0.8,
    speed: 1.2,
    color: new THREE.Color(0x888888),
    opacity: 0.4,
    lifetime: 4.0,
    spread: 1.2
  } as FireParticleConfig,
  
  embers: {
    count: 15,
    size: 0.2,
    speed: 0.6,
    color: new THREE.Color(0xFF4400),
    opacity: 1.0,
    lifetime: 3.0,
    spread: 1.0
  } as FireParticleConfig
};
