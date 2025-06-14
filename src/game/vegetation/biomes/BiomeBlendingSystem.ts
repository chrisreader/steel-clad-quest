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
   * Calculate biome influences with STRONG core biome dominance and sharp boundaries
   */
  static calculateEnhancedBiomeInfluence(
    position: THREE.Vector3,
    organicBiomes: OrganicBiomeShape[]
  ): EnhancedBiomeData {
    const influences: BiomeInfluence[] = [];
    
    // Calculate influence from organic biomes with MUCH stronger core dominance
    for (const biome of organicBiomes) {
      const influence = OrganicBiomeGenerator.calculateOrganicInfluence(position, biome);
      const distance = OrganicBiomeGenerator.getDistanceToOrganicBoundary(position, biome);
      
      if (influence > 0.1) { // Higher threshold for cleaner boundaries
        // DRAMATICALLY strengthen core biome influence
        let adjustedInfluence = influence;
        if (distance <= 0) {
          // Inside biome - make it VERY dominant (90%+ influence)
          adjustedInfluence = Math.min(1.0, influence * 1.8 + 0.7);
        }
        
        influences.push({
          biomeType: biome.biomeType,
          influence: adjustedInfluence,
          distance: Math.abs(distance),
          source: 'seed'
        });
      }
    }
    
    // Add MUCH weaker ecological influences (only 10% of previous strength)
    this.addWeakerEcologicalInfluences(position, influences);
    
    // Sort by influence strength
    influences.sort((a, b) => b.influence - a.influence);
    
    // Calculate dominant biome with STRONG preference for primary biome
    const dominantBiome = influences.length > 0 ? influences[0].biomeType : 'normal';
    const totalInfluence = influences.reduce((sum, inf) => sum + inf.influence, 0);
    
    // Much lower transition intensity for sharper boundaries
    let transitionIntensity = 0;
    if (influences.length > 1) {
      const difference = influences[0].influence - (influences[1]?.influence || 0);
      transitionIntensity = Math.max(0, 1.0 - (difference / 0.6)); // Much sharper cutoff
    }
    
    // Calculate ecological factors
    const ecologicalFactors = this.calculateEcologicalFactors(position);
    
    return {
      dominantBiome,
      totalInfluence: Math.min(1.0, Math.max(0.8, totalInfluence)), // Higher minimum influence
      influences: influences.slice(0, 3), // Keep fewer influences for cleaner results
      transitionIntensity,
      ecologicalFactors
    };
  }
  
  /**
   * MUCH weaker ecological influences to preserve distinct biome identity
   */
  private static addWeakerEcologicalInfluences(
    position: THREE.Vector3,
    influences: BiomeInfluence[]
  ): void {
    // Drastically reduced ecological influence for cleaner biome boundaries
    const largeMoisture = NoiseUtilities.organicNoise(
      position.x * 0.001,
      position.z * 0.001,
      12345,
      3,
      0.005,
      1.0,
      0.6
    );
    
    const mediumMoisture = NoiseUtilities.organicNoise(
      position.x * 0.008,
      position.z * 0.008,
      12346,
      2,
      0.02,
      0.5,
      0.7
    );
    
    const combinedMoisture = largeMoisture * 0.7 + mediumMoisture * 0.3;
    
    // MUCH weaker moisture influence (only 10% of previous strength)
    if (combinedMoisture > 0.3) { // Higher threshold
      influences.push({
        biomeType: 'meadow',
        influence: (combinedMoisture - 0.3) * 0.08, // Drastically reduced from 0.8
        distance: 0,
        source: 'ecological'
      });
    }
    
    // MUCH weaker dry area influence
    if (combinedMoisture < -0.2) { // Higher threshold
      influences.push({
        biomeType: 'prairie',
        influence: Math.abs(combinedMoisture + 0.2) * 0.07, // Drastically reduced from 0.7
        distance: 0,
        source: 'ecological'
      });
    }
    
    // Minimal elevation influence
    const elevation = NoiseUtilities.organicNoise(
      position.x * 0.0005,
      position.z * 0.0005,
      54321,
      4,
      0.002,
      1.0,
      0.5
    );
    
    if (elevation > 0.5) { // Much higher threshold
      influences.push({
        biomeType: 'prairie',
        influence: (elevation - 0.5) * 0.05, // Drastically reduced
        distance: 0,
        source: 'ecological'
      });
    }
  }
  
  /**
   * Calculate ecological factors (unchanged)
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
   * Generate organic biome layout with BETTER size distribution for distinct patches
   */
  static generateOrganicBiomeLayout(
    worldSeed: number,
    regionX: number,
    regionZ: number,
    regionSize: number = 512
  ): OrganicBiomeShape[] {
    const biomes: OrganicBiomeShape[] = [];
    const biomeSeed = worldSeed + regionX * 73856093 + regionZ * 19349663;
    
    // Generate 4-7 organic biomes per region for better distinct patches
    const biomeCount = 4 + Math.floor(Math.abs(NoiseUtilities.seededNoise(biomeSeed, 0, 0)) * 3);
    
    for (let i = 0; i < biomeCount; i++) {
      const seedOffset = i * 1000;
      
      // Better spacing to prevent overlap and ensure distinct patches
      const padding = regionSize * 0.1; // Increased padding for better separation
      const x = regionX * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 1, 0)) * (regionSize - 2 * padding);
      const z = regionZ * regionSize + padding + 
        Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 2, 0)) * (regionSize - 2 * padding);
      
      const center = new THREE.Vector3(x, 0, z);
      
      // More balanced biome type distribution
      const biomeRandom = NoiseUtilities.seededNoise(biomeSeed + seedOffset, 3, 0);
      let biomeType: BiomeType;
      
      if (biomeRandom > 0.3) {
        biomeType = 'meadow';
      } else if (biomeRandom > -0.3) {
        biomeType = 'prairie';
      } else {
        biomeType = 'normal';
      }
      
      // Better radius distribution for distinct, non-overlapping patches
      const radiusRandom = Math.abs(NoiseUtilities.seededNoise(biomeSeed + seedOffset, 4, 0));
      
      // More consistent sizing for cleaner boundaries
      let radius: number;
      if (radiusRandom > 0.6) {
        // Large biomes (80-140 units)
        radius = 80 + radiusRandom * 60;
      } else {
        // Medium biomes (40-80 units)
        radius = 40 + radiusRandom * 40;
      }
      
      // Higher strength for more distinct biome identity
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
    
    console.log(`🎨 DISTINCT BIOME MOSAIC: Generated ${biomes.length} distinct biome patches for region ${regionX}_${regionZ}`);
    return biomes;
  }
}
