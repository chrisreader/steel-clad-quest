
export { GrassSystem } from './GrassSystem';
export { GrassGeometry } from './core/GrassGeometry';
export { VegetationGeometry } from './core/VegetationGeometry';
export { GrassShader } from './core/GrassShader';
export { GrassRenderer } from './core/GrassRenderer';
export { BiomeManager } from './biomes/BiomeManager';
export { DeterministicBiomeManager } from './biomes/DeterministicBiomeManager';
export { BiomeSeedManager } from './biomes/BiomeSeedManager';
export { OrganicBiomeGenerator } from './biomes/OrganicBiomeGenerator';
export { BiomeBlendingSystem } from './biomes/BiomeBlendingSystem';
export { GrassRenderBubbleManager } from './performance/GrassRenderBubbleManager';
export { SeededGrassDistribution } from './SeededGrassDistribution';
export { LODManager } from './performance/LODManager';
export { WindSystem } from './animation/WindSystem';
export { EnvironmentalGrassDistribution } from './EnvironmentalGrassDistribution';

export type { GrassConfig, GrassBladeConfig, FlowerConfig, BiomeConfiguration, BiomeInfo, BiomeType } from './core/GrassConfig';
export type { EnvironmentalFactors } from './EnvironmentalGrassDistribution';
export type { ChunkCoordinate, ChunkBiomeData } from './biomes/DeterministicBiomeManager';
export type { BiomeSeedPoint } from './biomes/BiomeSeedManager';
export type { OrganicBiomeShape } from './biomes/OrganicBiomeGenerator';
export type { EnhancedBiomeData, BiomeInfluence } from './biomes/BiomeBlendingSystem';
export type { SeededGrassData } from './SeededGrassDistribution';
