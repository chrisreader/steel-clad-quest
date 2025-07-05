
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

// Phase 2: Aggressive LOD distances for 15-25% FPS improvement  
export const DEFAULT_GRASS_CONFIG: GrassConfig = {
  baseDensity: 0.6, // Reduced by 20% from 0.75
  patchDensity: 2.0, // Reduced by 20% from 2.5
  patchCount: 5,
  maxDistance: 60, // Phase 2: Aggressive reduction from 200 to match new LOD
  lodLevels: [1.0, 0.5, 0.2, 0.05] // Phase 2: More aggressive LOD scaling
};
