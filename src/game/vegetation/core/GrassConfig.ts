
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
  species: 'meadow' | 'prairie' | 'clumping' | 'fine' | 'wildflower' | 'reed' | 'fern' | 'crystal' | 'shrub' | 'thicket';
  color: THREE.Color;
  clustered: boolean;
  hasFlowers?: boolean;
  emissive?: THREE.Color;
  windResistance?: number;
}

export interface FlowerConfig {
  type: 'daisy' | 'poppy' | 'cornflower' | 'violet' | 'crystal_bloom';
  color: THREE.Color;
  size: number;
  stemHeight: number;
  petalCount: number;
  bloomSeason: 'spring' | 'summer' | 'autumn' | 'all';
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
    wildflower?: number;
    reed?: number;
    fern?: number;
    crystal?: number;
    shrub?: number;
    thicket?: number;
  };
  windExposure: number;
  rarity?: number;
  specialFeatures?: {
    hasFlowers?: boolean;
    hasMagicalGlow?: boolean;
    hasParticleEffects?: boolean;
    windBentGrass?: boolean;
  };
}

export interface GroundGrassConfiguration {
  densityMultiplier: number;
  heightReduction: number;
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
    wildflower?: number;
    reed?: number;
    fern?: number;
    crystal?: number;
    shrub?: number;
    thicket?: number;
  };
  windReduction: number;
}

export type BiomeType = 
  | 'normal' 
  | 'meadow' 
  | 'prairie'
  | 'wildflower_meadow'
  | 'dense_thicket'
  | 'sparse_steppe'
  | 'rolling_savanna'
  | 'lush_valley'
  | 'windswept_plain'
  | 'ancient_clearing'
  | 'crystalline_grove';

export interface BiomeInfo {
  type: BiomeType;
  strength: number;
  transitionZone: boolean;
}

// OPTIMIZED: Reduced to 200-unit viewable area for better FPS
export const DEFAULT_GRASS_CONFIG: GrassConfig = {
  baseDensity: 0.75,
  patchDensity: 2.5,
  patchCount: 5,
  maxDistance: 200, // Reduced from 280 for FPS optimization
  lodLevels: [1.0, 0.6, 0.3, 0.1] // More aggressive LOD scaling for better performance
};
