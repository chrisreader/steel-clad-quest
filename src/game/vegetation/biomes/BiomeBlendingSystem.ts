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
   * SHARP BOUNDARY: Binary biome selection with no blending
   */
  static calculateEnhancedBiomeInfluence(
    position: THREE.Vector3,
    organicBiomes: OrganicBiomeShape[]
  ): EnhancedBiomeData {
    const influences: BiomeInfluence[] = [];
    
    // Find all biomes that contain this position
    for (const biome of organicBiomes) {
      const isInside = OrganicBiomeGenerator.isInsideOrganicBiome(position, biome);
      const distance = OrganicBiomeGenerator.getDistanceToOrganicBoundary(position, biome);
      
      if (isInside) {
        influences.push({
          biomeType: biome.biomeType,
          influence: biome.strength, // Full strength for inside positions
          distance: Math.abs(distance),
          source: 'organic'
        });
      }
    }
    
    // SHARP SELECTION: Choose the closest biome center if multiple biomes overlap
    let selectedBiome: BiomeType = 'normal';
    let selectedInfluence = 0.8; // Default normal biome strength
    
    if (influences.length > 0) {
      // If multiple biomes overlap, choose the one with smallest distance to boundary (closest to center)
      influences.sort((a, b) => a.distance - b.distance);
      selectedBiome = influences[0].biomeType;
      selectedInfluence = influences[0].influence;
    }
    
    return {
      dominantBiome: selectedBiome,
      totalInfluence: selectedInfluence,
      influences: influences.slice(0, 1), // Only keep the selected biome
      transitionIntensity: 0 // No transitions with sharp boundaries
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
    
    console.log(`🌿 SHARP MOSAIC: Generated ${biomes.length} distinct biome patches for region ${regionX}_${regionZ}`);
    return biomes;
  }
}
