
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
   * Calculate complex biome influences at a position with enhanced organic boundaries
   */
  static calculateEnhancedBiomeInfluence(
    position: THREE.Vector3,
    organicBiomes: OrganicBiomeShape[]
  ): EnhancedBiomeData {
    const influences: BiomeInfluence[] = [];
    
    // Calculate influence from each organic biome with enhanced boundary detection
    for (const biome of organicBiomes) {
      const influence = OrganicBiomeGenerator.calculateOrganicInfluence(position, biome);
      const distance = OrganicBiomeGenerator.getDistanceToOrganicBoundary(position, biome);
      
      if (influence > 0.005) { // Even lower threshold to detect more subtle influences
        influences.push({
          biomeType: biome.biomeType,
          influence,
          distance: Math.abs(distance),
          source: 'seed'
        });
      }
    }
    
    // Add enhanced ecological succession influences
    this.addEnhancedEcologicalInfluences(position, influences);
    
    // Add fractal micro-transition influences for complex boundaries
    this.addFractalTransitionInfluences(position, influences);
    
    // Sort by influence strength
    influences.sort((a, b) => b.influence - a.influence);
    
    // Calculate dominant biome and transition intensity
    const dominantBiome = influences.length > 0 ? influences[0].biomeType : 'normal';
    const totalInfluence = influences.reduce((sum, inf) => sum + inf.influence, 0);
    
    // Enhanced transition intensity calculation
    let transitionIntensity = 0;
    if (influences.length > 1) {
      const topThree = influences.slice(0, 3);
      const difference = topThree[0].influence - (topThree[1]?.influence || 0);
      transitionIntensity = Math.max(0, 1.0 - (difference / 0.3)); // Lower threshold for more transitions
    }
    
    // Calculate ecological factors
    const ecologicalFactors = this.calculateEcologicalFactors(position);
    
    return {
      dominantBiome,
      totalInfluence: Math.min(1.0, Math.max(0.7, totalInfluence)), // Higher minimum influence
      influences: influences.slice(0, 8), // Keep more influences for complex blending
      transitionIntensity,
      ecologicalFactors
    };
  }
  
  /**
   * Enhanced ecological succession patterns with more variation
   */
  private static addEnhancedEcologicalInfluences(
    position: THREE.Vector3,
    influences: BiomeInfluence[]
  ): void {
    // Multi-scale moisture patterns for realistic ecological zones
    const largeMoisture = NoiseUtilities.organicNoise(
      position.x * 0.001,
      position.z * 0.001,
      12345,
      4,
      0.005,
      1.0,
      0.6
    );
    
    const mediumMoisture = NoiseUtilities.organicNoise(
      position.x * 0.008,
      position.z * 0.008,
      12346,
      3,
      0.02,
      0.8,
      0.7
    );
    
    const combinedMoisture = largeMoisture * 0.7 + mediumMoisture * 0.3;
    
    // High moisture areas strongly favor meadows
    if (combinedMoisture > 0.1) { // Lower threshold
      influences.push({
        biomeType: 'meadow',
        influence: (combinedMoisture - 0.1) * 0.8, // Stronger influence
        distance: 0,
        source: 'ecological'
      });
    }
    
    // Dry areas favor prairie with variable intensity
    if (combinedMoisture < -0.05) { // Lower threshold
      influences.push({
        biomeType: 'prairie',
        influence: Math.abs(combinedMoisture + 0.05) * 0.7, // Stronger influence
        distance: 0,
        source: 'ecological'
      });
    }
    
    // Add elevation-based influences
    const elevation = NoiseUtilities.organicNoise(
      position.x * 0.0005,
      position.z * 0.0005,
      54321,
      5,
      0.002,
      1.0,
      0.5
    );
    
    if (elevation > 0.3) {
      influences.push({
        biomeType: 'prairie',
        influence: (elevation - 0.3) * 0.4,
        distance: 0,
        source: 'ecological'
      });
    }
  }
  
  /**
   * Add fractal micro-transition influences for complex, organic boundaries
   */
  private static addFractalTransitionInfluences(
    position: THREE.Vector3,
    influences: BiomeInfluence[]
  ): void {
    // Multi-octave noise for fractal boundary complexity
    const fractalNoise = NoiseUtilities.organicNoise(
      position.x * 0.05,
      position.z * 0.05,
      98765,
      5,
      0.1,
      1.0,
      0.65
    );
    
    const fineFractal = NoiseUtilities.organicNoise(
      position.x * 0.2,
      position.z * 0.2,
      98766,
      3,
      0.5,
      0.6,
      0.8
    );
    
    const combinedFractal = fractalNoise * 0.8 + fineFractal * 0.2;
    
    if (Math.abs(combinedFractal) > 0.2) { // Lower threshold for more variation
      const fractalBiome = combinedFractal > 0 ? 'meadow' : 'prairie';
      influences.push({
        biomeType: fractalBiome,
        influence: (Math.abs(combinedFractal) - 0.2) * 0.5, // Stronger influence
        distance: 0,
        source: 'transition'
      });
    }
    
    // Add "biome tendrils" - finger-like extensions
    const tendrilNoise = NoiseUtilities.organicNoise(
      position.x * 0.15,
      position.z * 0.15,
      11111,
      4,
      0.3,
      0.8,
      0.7
    );
    
    if (Math.abs(tendrilNoise) > 0.4) {
      const tendrilBiome = tendrilNoise > 0 ? 'meadow' : 'normal';
      influences.push({
        biomeType: tendrilBiome,
        influence: (Math.abs(tendrilNoise) - 0.4) * 0.3,
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
    ) + 1) * 0.5;
    
    const elevation = (NoiseUtilities.organicNoise(
      position.x * 0.001,
      position.z * 0.001,
      22222,
      4,
      0.005,
      1.0,
      0.6
    ) + 1) * 0.5;
    
    const biodiversity = (NoiseUtilities.organicNoise(
      position.x * 0.008,
      position.z * 0.008,
      33333,
      2,
      0.02,
      1.0,
      0.4
    ) + 1) * 0.5;
    
    return { moisture, elevation, biodiversity };
  }
  
  /**
   * Generate enhanced organic biome layout with variable sizes and irregular shapes
   */
  static generateOrganicBiomeLayout(
    worldSeed: number,
    regionX: number,
    regionZ: number,
    regionSize: number = 512
  ): OrganicBiomeShape[] {
    const biomes: OrganicBiomeShape[] = [];
    const biomeSeed = worldSeed + regionX * 73856093 + regionZ * 19349663;
    
    // Generate 6-10 organic biomes per region for better coverage
    const biomeCount = 6 + Math.floor(Math.abs(NoiseUtilities.seededNoise(biomeSeed, 0, 0)) * 4);
    
    for (let i = 0; i < biomeCount; i++) {
      const seedOffset = i * 1000;
      
      // Reduced padding to allow biomes to reach edges
      const padding = regionSize * 0.02; // Much smaller padding
      const x = regionX * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 1, 0)) * (regionSize - 2 * padding);
      const z = regionZ * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 2, 0)) * (regionSize - 2 * padding);
      
      const center = new THREE.Vector3(x, 0, z);
      
      // Enhanced biome type distribution with more variation
      const biomeRandom = NoiseUtilities.seededNoise(biomeSeed + seedOffset, 3, 0);
      let biomeType: BiomeType;
      
      if (biomeRandom > 0.15) {
        biomeType = 'meadow';
      } else if (biomeRandom > -0.4) {
        biomeType = 'prairie';
      } else {
        biomeType = 'normal';
      }
      
      // Much more variable radius (25-200 units for extreme size variation)
      const radiusRandom = Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 4, 0));
      const secondaryRadius = Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 5, 0));
      
      // Bimodal distribution for both very small and very large biomes
      let radius: number;
      if (radiusRandom > 0.7) {
        // Large biomes (120-200 units)
        radius = 120 + secondaryRadius * 80;
      } else if (radiusRandom > 0.3) {
        // Medium biomes (60-120 units)
        radius = 60 + secondaryRadius * 60;
      } else {
        // Small biomes (25-60 units)
        radius = 25 + secondaryRadius * 35;
      }
      
      // Enhanced strength for more visible impact
      const strength = 0.8 + Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 6, 0)) * 0.2;
      
      const organicBiome = OrganicBiomeGenerator.createOrganicBiome(
        center,
        biomeType,
        radius,
        biomeSeed + seedOffset,
        strength
      );
      
      biomes.push(organicBiome);
    }
    
    console.log(`🌿 ENHANCED ORGANIC v2: Generated ${biomes.length} highly variable biomes for region ${regionX}_${regionZ}`);
    return biomes;
  }
}
