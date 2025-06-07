
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
    count: 35, // Increased from 25 for better visibility
    size: 0.4, // Increased size
    speed: 2.5, // Increased speed for more dynamic movement
    color: new THREE.Color(0xFF6600),
    opacity: 0.9, // Higher opacity for better visibility
    lifetime: 2.0, // Longer lifetime for more stable flames
    spread: 1.0 // Slightly larger spread
  } as FireParticleConfig,
  
  smoke: {
    count: 20, // Increased from 15
    size: 0.6, // Larger smoke particles
    speed: 1.5, // Faster smoke movement
    color: new THREE.Color(0x888888),
    opacity: 0.5, // Slightly higher opacity
    lifetime: 3.5, // Longer lifetime
    spread: 1.4 // Larger spread for smoke
  } as FireParticleConfig,
  
  embers: {
    count: 15, // Increased from 12
    size: 0.15, // Slightly larger embers
    speed: 0.8, // Faster ember movement
    color: new THREE.Color(0xFF4400),
    opacity: 1.0, // Full opacity for bright embers
    lifetime: 2.5, // Longer lifetime
    spread: 1.2 // Larger spread
  } as FireParticleConfig
};
