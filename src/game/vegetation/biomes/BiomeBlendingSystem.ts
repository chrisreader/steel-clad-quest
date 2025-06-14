
import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';
import { OrganicBiomeShape, OrganicBiomeGenerator } from './OrganicBiomeGenerator';
import { NoiseUtilities } from '../../utils/math/NoiseUtilities';

export interface BiomeInfluence {
  biomeType: BiomeType;
  influence: number;
  distance: number;
  source: 'seed' | 'ecological' | 'transition';
}

export interface EnhancedBiomeData {
  dominantBiome: BiomeType;
  totalInfluence: number;
  influences: BiomeInfluence[];
  transitionIntensity: number;
  ecologicalFactors: {
    moisture: number;
    elevation: number;
    biodiversity: number;
  };
}

export class BiomeBlendingSystem {
  /**
   * Calculate complex biome influences at a position
   */
  static calculateEnhancedBiomeInfluence(
    position: THREE.Vector3,
    organicBiomes: OrganicBiomeShape[]
  ): EnhancedBiomeData {
    const influences: BiomeInfluence[] = [];
    
    // Calculate influence from each organic biome
    for (const biome of organicBiomes) {
      const influence = OrganicBiomeGenerator.calculateOrganicInfluence(position, biome);
      const distance = OrganicBiomeGenerator.getDistanceToOrganicBoundary(position, biome);
      
      if (influence > 0.05) {
        influences.push({
          biomeType: biome.biomeType,
          influence,
          distance: Math.abs(distance),
          source: 'seed'
        });
      }
    }
    
    // Add ecological succession influences
    this.addEcologicalInfluences(position, influences);
    
    // Add micro-transition influences for realistic blending
    this.addMicroTransitionInfluences(position, influences);
    
    // Sort by influence strength
    influences.sort((a, b) => b.influence - a.influence);
    
    // Calculate dominant biome and transition intensity
    const dominantBiome = influences.length > 0 ? influences[0].biomeType : 'normal';
    const totalInfluence = influences.reduce((sum, inf) => sum + inf.influence, 0);
    
    // Calculate transition intensity based on competing influences
    let transitionIntensity = 0;
    if (influences.length > 1) {
      const topTwo = influences.slice(0, 2);
      const difference = topTwo[0].influence - topTwo[1].influence;
      transitionIntensity = Math.max(0, 1.0 - (difference / 0.5));
    }
    
    // Calculate ecological factors
    const ecologicalFactors = this.calculateEcologicalFactors(position);
    
    return {
      dominantBiome,
      totalInfluence: Math.min(1.0, totalInfluence),
      influences: influences.slice(0, 5), // Keep top 5 influences
      transitionIntensity,
      ecologicalFactors
    };
  }
  
  /**
   * Add ecological succession patterns
   */
  private static addEcologicalInfluences(
    position: THREE.Vector3,
    influences: BiomeInfluence[]
  ): void {
    // Simulate ecological patterns like water proximity affecting meadow growth
    const moistureNoise = NoiseUtilities.organicNoise(
      position.x * 0.003,
      position.z * 0.003,
      12345,
      4,
      0.01,
      1.0,
      0.6
    );
    
    // High moisture areas favor meadows
    if (moistureNoise > 0.3) {
      influences.push({
        biomeType: 'meadow',
        influence: (moistureNoise - 0.3) * 0.4,
        distance: 0,
        source: 'ecological'
      });
    }
    
    // Dry areas favor prairie
    if (moistureNoise < -0.2) {
      influences.push({
        biomeType: 'prairie',
        influence: Math.abs(moistureNoise + 0.2) * 0.3,
        distance: 0,
        source: 'ecological'
      });
    }
  }
  
  /**
   * Add micro-transition influences for realistic blending
   */
  private static addMicroTransitionInfluences(
    position: THREE.Vector3,
    influences: BiomeInfluence[]
  ): void {
    // Create small pockets of different biomes for realism
    const microNoise = NoiseUtilities.organicNoise(
      position.x * 0.02,
      position.z * 0.02,
      54321,
      3,
      0.05,
      1.0,
      0.7
    );
    
    if (Math.abs(microNoise) > 0.6) {
      const microBiome = microNoise > 0 ? 'meadow' : 'prairie';
      influences.push({
        biomeType: microBiome,
        influence: (Math.abs(microNoise) - 0.6) * 0.2,
        distance: 0,
        source: 'transition'
      });
    }
  }
  
  /**
   * Calculate ecological factors that affect biome characteristics
   */
  private static calculateEcologicalFactors(position: THREE.Vector3): {
    moisture: number;
    elevation: number;
    biodiversity: number;
  } {
    const moisture = (NoiseUtilities.organicNoise(
      position.x * 0.002,
      position.z * 0.002,
      11111,
      3,
      0.01,
      1.0,
      0.5
    ) + 1) * 0.5; // 0-1 range
    
    const elevation = (NoiseUtilities.organicNoise(
      position.x * 0.001,
      position.z * 0.001,
      22222,
      4,
      0.005,
      1.0,
      0.6
    ) + 1) * 0.5; // 0-1 range
    
    const biodiversity = (NoiseUtilities.organicNoise(
      position.x * 0.008,
      position.z * 0.008,
      33333,
      2,
      0.02,
      1.0,
      0.4
    ) + 1) * 0.5; // 0-1 range
    
    return { moisture, elevation, biodiversity };
  }
  
  /**
   * Generate random organic biome layout for a world seed
   */
  static generateOrganicBiomeLayout(
    worldSeed: number,
    regionX: number,
    regionZ: number,
    regionSize: number = 512
  ): OrganicBiomeShape[] {
    const biomes: OrganicBiomeShape[] = [];
    const biomeSeed = worldSeed + regionX * 73856093 + regionZ * 19349663;
    
    // Generate 3-8 organic biomes per region
    const biomeCount = 3 + Math.floor(Math.abs(NoiseUtilities.seededNoise(biomeSeed, 0, 0)) * 5);
    
    for (let i = 0; i < biomeCount; i++) {
      const seedOffset = i * 1000;
      
      // Random position within region with some padding
      const padding = regionSize * 0.1;
      const x = regionX * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 1, 0)) * (regionSize - 2 * padding);
      const z = regionZ * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 2, 0)) * (regionSize - 2 * padding);
      
      const center = new THREE.Vector3(x, 0, z);
      
      // Random biome type with some clustering
      const biomeRandom = NoiseUtilities.seededNoise(biomeSeed + seedOffset, 3, 0);
      let biomeType: BiomeType;
      
      if (biomeRandom > 0.3) {
        biomeType = 'meadow';
      } else if (biomeRandom > -0.2) {
        biomeType = 'prairie';
      } else {
        biomeType = 'normal';
      }
      
      // Variable radius (30-120 units for more varied sizes)
      const radiusRandom = Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 4, 0));
      const radius = 30 + radiusRandom * 90;
      
      // Variable strength
      const strength = 0.6 + Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 5, 0)) * 0.4;
      
      const organicBiome = OrganicBiomeGenerator.createOrganicBiome(
        center,
        biomeType,
        radius,
        biomeSeed + seedOffset,
        strength
      );
      
      biomes.push(organicBiome);
    }
    
    return biomes;
  }
}
