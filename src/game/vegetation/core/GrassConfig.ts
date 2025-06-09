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
  baseDensity: 1.2, // Restored from 0.75 for proper density
  patchDensity: 3.0, // Increased from 2.5
  patchCount: 6, // Increased from 5
  maxDistance: 400, // Restored from 280 for wider coverage
  lodLevels: [1.0, 0.7, 0.4, 0.1] // Less aggressive LOD for better quality
};
