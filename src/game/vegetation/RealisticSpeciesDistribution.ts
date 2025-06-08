
import * as THREE from 'three';
import { EnvironmentalRealism, EnvironmentalConditions } from './EnvironmentalRealism';
import { BiomeType, BiomeInfo } from './GrassBiomeManager';

export interface ClusteringBehavior {
  clusterSize: number;      // Average number of plants in a cluster
  clusterSpread: number;    // How spread out the cluster is
  clusterProbability: number; // Chance of forming clusters vs individual plants
  avoidanceDistance: number;  // Distance to avoid other species
}

export interface SpeciesCharacteristics {
  name: string;
  clustering: ClusteringBehavior;
  seasonalGrowth: {
    spring: number; // Growth multiplier
    summer: number;
    autumn: number;
    winter: number;
  };
  competitiveness: number; // 0-1, how well it competes with other species
  spreadRate: number;      // How quickly it colonizes new areas
}

export class RealisticSpeciesDistribution {
  private static readonly SPECIES_CHARACTERISTICS: Record<string, SpeciesCharacteristics> = {
    meadow: {
      name: 'Meadow Grass',
      clustering: {
        clusterSize: 4,
        clusterSpread: 0.8,
        clusterProbability: 0.7,
        avoidanceDistance: 0.3
      },
      seasonalGrowth: { spring: 1.2, summer: 1.0, autumn: 0.8, winter: 0.3 },
      competitiveness: 0.6,
      spreadRate: 0.5
    },
    prairie: {
      name: 'Prairie Grass',
      clustering: {
        clusterSize: 6,
        clusterSpread: 1.2,
        clusterProbability: 0.8,
        avoidanceDistance: 0.2
      },
      seasonalGrowth: { spring: 0.8, summer: 1.0, autumn: 1.1, winter: 0.5 },
      competitiveness: 0.8,
      spreadRate: 0.7
    },
    clumping: {
      name: 'Clumping Grass',
      clustering: {
        clusterSize: 8,
        clusterSpread: 0.5,
        clusterProbability: 0.9,
        avoidanceDistance: 0.5
      },
      seasonalGrowth: { spring: 1.1, summer: 0.9, autumn: 0.9, winter: 0.4 },
      competitiveness: 0.4,
      spreadRate: 0.3
    },
    fine: {
      name: 'Fine Grass',
      clustering: {
        clusterSize: 2,
        clusterSpread: 0.3,
        clusterProbability: 0.5,
        avoidanceDistance: 0.1
      },
      seasonalGrowth: { spring: 1.3, summer: 0.8, autumn: 0.7, winter: 0.2 },
      competitiveness: 0.3,
      spreadRate: 0.4
    }
  };

  /**
   * Generate realistic species distribution based on environmental suitability
   */
  public static generateRealisticDistribution(
    positions: THREE.Vector3[],
    biomeInfo: BiomeInfo,
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): string[] {
    const species: string[] = [];
    const occupiedPositions: Set<string> = new Set();

    // Calculate environmental conditions for each position
    const environmentalConditions = positions.map(pos => 
      EnvironmentalRealism.calculateEnvironmentalConditions(pos)
    );

    // First pass: place dominant species based on suitability
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const conditions = environmentalConditions[i];
      
      // Calculate suitability for each species
      const suitabilities = Object.keys(this.SPECIES_CHARACTERISTICS).map(speciesName => ({
        species: speciesName,
        suitability: EnvironmentalRealism.calculateSpeciesSuitability(speciesName, conditions),
        characteristics: this.SPECIES_CHARACTERISTICS[speciesName]
      }));

      // Apply seasonal growth modifiers
      suitabilities.forEach(s => {
        s.suitability *= s.characteristics.seasonalGrowth[season];
      });

      // Sort by suitability
      suitabilities.sort((a, b) => b.suitability - a.suitability);

      // Weighted random selection favoring suitable species
      const selectedSpecies = this.weightedSpeciesSelection(suitabilities);
      species[i] = selectedSpecies;
    }

    // Second pass: apply clustering behavior
    this.applyClusteringBehavior(positions, species, environmentalConditions);

    // Third pass: apply competition and avoidance
    this.applySpeciesCompetition(positions, species, environmentalConditions);

    return species;
  }

  private static weightedSpeciesSelection(
    suitabilities: Array<{ species: string; suitability: number; characteristics: SpeciesCharacteristics }>
  ): string {
    // Create weighted distribution
    const totalSuitability = suitabilities.reduce((sum, s) => sum + Math.max(0.1, s.suitability), 0);
    const random = Math.random() * totalSuitability;
    
    let cumulative = 0;
    for (const s of suitabilities) {
      cumulative += Math.max(0.1, s.suitability);
      if (random <= cumulative) {
        return s.species;
      }
    }
    
    return suitabilities[0].species; // Fallback
  }

  private static applyClusteringBehavior(
    positions: THREE.Vector3[],
    species: string[],
    conditions: EnvironmentalConditions[]
  ): void {
    for (let i = 0; i < positions.length; i++) {
      const currentSpecies = species[i];
      const characteristics = this.SPECIES_CHARACTERISTICS[currentSpecies];
      
      if (Math.random() < characteristics.clustering.clusterProbability) {
        // Find nearby positions for clustering
        const nearbyIndices = this.findNearbyPositions(
          positions,
          i,
          characteristics.clustering.clusterSpread
        );
        
        // Convert some nearby positions to the same species
        const clusterSize = Math.min(
          characteristics.clustering.clusterSize,
          nearbyIndices.length
        );
        
        for (let j = 0; j < clusterSize && j < nearbyIndices.length; j++) {
          if (Math.random() < 0.7) { // 70% chance to join cluster
            species[nearbyIndices[j]] = currentSpecies;
          }
        }
      }
    }
  }

  private static applySpeciesCompetition(
    positions: THREE.Vector3[],
    species: string[],
    conditions: EnvironmentalConditions[]
  ): void {
    for (let i = 0; i < positions.length; i++) {
      const currentSpecies = species[i];
      const currentCompetitiveness = this.SPECIES_CHARACTERISTICS[currentSpecies].competitiveness;
      
      // Find nearby different species
      const nearbyIndices = this.findNearbyPositions(positions, i, 0.5);
      
      for (const nearbyIndex of nearbyIndices) {
        const nearbySpecies = species[nearbyIndex];
        if (nearbySpecies !== currentSpecies) {
          const nearbyCompetitiveness = this.SPECIES_CHARACTERISTICS[nearbySpecies].competitiveness;
          
          // Competition outcome based on competitiveness and environmental suitability
          const currentSuitability = EnvironmentalRealism.calculateSpeciesSuitability(
            currentSpecies, conditions[i]
          );
          const nearbySuitability = EnvironmentalRealism.calculateSpeciesSuitability(
            nearbySpecies, conditions[nearbyIndex]
          );
          
          const competitionStrength = (currentCompetitiveness + currentSuitability) - 
                                    (nearbyCompetitiveness + nearbySuitability);
          
          // Sometimes the weaker species gets displaced
          if (competitionStrength > 0.3 && Math.random() < 0.2) {
            species[nearbyIndex] = currentSpecies;
          }
        }
      }
    }
  }

  private static findNearbyPositions(
    positions: THREE.Vector3[],
    centerIndex: number,
    radius: number
  ): number[] {
    const centerPos = positions[centerIndex];
    const nearby: number[] = [];
    
    for (let i = 0; i < positions.length; i++) {
      if (i !== centerIndex) {
        const distance = centerPos.distanceTo(positions[i]);
        if (distance <= radius) {
          nearby.push(i);
        }
      }
    }
    
    return nearby;
  }

  /**
   * Calculate realistic height variation based on environmental conditions and species
   */
  public static calculateRealisticHeight(
    species: string,
    baseHeight: number,
    conditions: EnvironmentalConditions,
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): number {
    const characteristics = this.SPECIES_CHARACTERISTICS[species];
    if (!characteristics) return baseHeight;

    let height = baseHeight;

    // Apply seasonal growth
    height *= characteristics.seasonalGrowth[season];

    // Environmental modifiers
    height *= (0.7 + conditions.moisture * 0.6); // Moisture strongly affects height
    height *= (0.8 + conditions.sunExposure * 0.4); // Sun exposure affects growth
    height *= Math.max(0.3, 1.0 - conditions.playerTraffic * 0.7); // Trampling reduces height

    // Wind exposure stunts growth
    if (conditions.windExposure > 0.7) {
      height *= 0.8;
    }

    // Add natural variation
    height *= (0.8 + Math.random() * 0.4);

    return Math.max(0.1, height);
  }
}
