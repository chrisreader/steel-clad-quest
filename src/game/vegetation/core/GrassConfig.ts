
import * as THREE from 'three';

export interface GrassConfig {
  baseDensity: number;
  patchDensity: number;
  patchCount: number;
  maxDistance: number;
  lodLevels: number[];
}

export interface GrassBladeConfig {
  height: number;
  width: number;
  segments: number;
  curve: number;
  taper: number;
  species: 'meadow' | 'prairie' | 'clumping' | 'fine';
  color: THREE.Color;
  clustered: boolean;
}

export interface BiomeConfiguration {
  name: string;
  densityMultiplier: number;
  heightMultiplier: number;
  colorModifier: THREE.Color;
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
  };
  windExposure: number;
}

export interface GroundGrassConfiguration {
  densityMultiplier: number;
  heightReduction: number;
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
  };
  windReduction: number;
}

export type BiomeType = 'normal' | 'meadow' | 'prairie';

export interface BiomeInfo {
  type: BiomeType;
  strength: number;
  transitionZone: boolean;
}

// OPTIMIZED: Reduced density and distance for better performance
export const DEFAULT_GRASS_CONFIG: GrassConfig = {
  baseDensity: 0.75, // Reduced from 1.2 for 37% performance gain
  patchDensity: 2.5,
  patchCount: 5,
  maxDistance: 280, // Reduced from 400 for GPU optimization
  lodLevels: [1.0, 0.5, 0.2, 0.05] // More aggressive LOD scaling
};
