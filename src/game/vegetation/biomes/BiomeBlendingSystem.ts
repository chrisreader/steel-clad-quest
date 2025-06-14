
import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';
import { OrganicBiomeShape, OrganicBiomeGenerator } from './OrganicBiomeGenerator';
import { NoiseUtilities } from '../../utils/math/NoiseUtilities';

export interface BiomeInfluence {
  biomeType: BiomeType;
  influence: number;
  distance: number;
  source: 'organic';
}

export interface EnhancedBiomeData {
  dominantBiome: BiomeType;
  totalInfluence: number;
  influences: BiomeInfluence[];
  transitionIntensity: number;
}

export class BiomeBlendingSystem {
  /**
   * Simplified biome influence calculation with clean boundaries
   */
  static calculateEnhancedBiomeInfluence(
    position: THREE.Vector3,
    organicBiomes: OrganicBiomeShape[]
  ): EnhancedBiomeData {
    const influences: BiomeInfluence[] = [];
    
    // Calculate influence from each organic biome only
    for (const biome of organicBiomes) {
      const influence = OrganicBiomeGenerator.calculateOrganicInfluence(position, biome);
      const distance = OrganicBiomeGenerator.getDistanceToOrganicBoundary(position, biome);
      
      if (influence > 0.01) {
        influences.push({
          biomeType: biome.biomeType,
          influence,
          distance: Math.abs(distance),
          source: 'organic'
        });
      }
    }
    
    // Sort by influence strength
    influences.sort((a, b) => b.influence - a.influence);
    
    // Calculate dominant biome
    const dominantBiome = influences.length > 0 ? influences[0].biomeType : 'normal';
    const totalInfluence = influences.length > 0 ? influences[0].influence : 0.7;
    
    // Simple transition intensity calculation
    let transitionIntensity = 0;
    if (influences.length > 1) {
      const difference = influences[0].influence - influences[1].influence;
      transitionIntensity = Math.max(0, 1.0 - (difference / 0.5));
    }
    
    return {
      dominantBiome,
      totalInfluence: Math.max(0.7, totalInfluence),
      influences: influences.slice(0, 2),
      transitionIntensity
    };
  }
  
  /**
   * Generate simplified organic biome layout with larger, exploration-focused biomes
   */
  static generateOrganicBiomeLayout(
    worldSeed: number,
    regionX: number,
    regionZ: number,
    regionSize: number = 512
  ): OrganicBiomeShape[] {
    const biomes: OrganicBiomeShape[] = [];
    const biomeSeed = worldSeed + regionX * 73856093 + regionZ * 19349663;
    
    // Generate 3-5 large organic biomes per region for better exploration
    const biomeCount = 3 + Math.floor(Math.abs(NoiseUtilities.seededNoise(biomeSeed, 0, 0)) * 3);
    
    for (let i = 0; i < biomeCount; i++) {
      const seedOffset = i * 1000;
      
      // Larger padding to accommodate bigger biomes
      const padding = regionSize * 0.15;
      const x = regionX * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 1, 0)) * (regionSize - 2 * padding);
      const z = regionZ * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 2, 0)) * (regionSize - 2 * padding);
      
      const center = new THREE.Vector3(x, 0, z);
      
      // Balanced biome type distribution
      const biomeRandom = NoiseUtilities.seededNoise(biomeSeed + seedOffset, 3, 0);
      let biomeType: BiomeType;
      
      if (biomeRandom > 0.33) {
        biomeType = 'meadow';
      } else if (biomeRandom > -0.33) {
        biomeType = 'prairie';
      } else {
        biomeType = 'normal';
      }
      
      // Target: 4096-16384 square units = 36-72 unit radius
      const radiusRandom = Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 4, 0));
      const radius = 36 + radiusRandom * 36; // 36-72 unit radius range
      
      // Strong influence for clear biome dominance
      const strength = 0.9 + Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 6, 0)) * 0.1;
      
      const organicBiome = OrganicBiomeGenerator.createOrganicBiome(
        center,
        biomeType,
        radius,
        biomeSeed + seedOffset,
        strength
      );
      
      biomes.push(organicBiome);
    }
    
    console.log(`🌿 SIMPLIFIED ORGANIC: Generated ${biomes.length} exploration-sized biomes for region ${regionX}_${regionZ}`);
    return biomes;
  }
}
