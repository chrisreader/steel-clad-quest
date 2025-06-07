
import * as THREE from 'three';
import { Noise } from 'noisejs';
import { RegionCoordinates } from '../../RingQuadrantSystem';
import { RockVariation, ROCK_VARIATIONS } from '../config/RockVariationConfig';

export interface GeologicalFormation {
  type: 'battlefield' | 'landslide' | 'erosion' | 'amphitheater' | 'outcrop' | 'scattered';
  center: THREE.Vector3;
  radius: number;
  intensity: number;
  rockTypeBonus: string[]; // Which rock types are more common in this formation
}

export interface BiomeCharacteristics {
  name: string;
  rockDensityModifier: number;
  preferredSizes: { [key: string]: number }; // Weight multipliers for each size category
  clusterTendency: number; // 0-1, how much rocks cluster vs scatter
  weatheringLevel: number; // 0-1, how weathered rocks appear
  formationTypes: string[]; // Which geological formations are common
}

export class BiomeRockSpawner {
  private noise: any;
  private formationNoise: any;
  private densityNoise: any;
  
  // Biome definitions for different quadrants and geographic features
  private biomes: Map<string, BiomeCharacteristics> = new Map([
    ['ancient_riverbed', {
      name: 'Ancient Riverbed',
      rockDensityModifier: 0.7,
      preferredSizes: { tiny: 1.5, small: 1.3, medium: 1.8, large: 0.6, massive: 0.3 },
      clusterTendency: 0.3,
      weatheringLevel: 0.8,
      formationTypes: ['erosion', 'scattered']
    }],
    ['hill_country', {
      name: 'Hill Country',
      rockDensityModifier: 1.4,
      preferredSizes: { tiny: 0.8, small: 1.0, medium: 1.2, large: 1.6, massive: 1.4 },
      clusterTendency: 0.8,
      weatheringLevel: 0.4,
      formationTypes: ['outcrop', 'amphitheater', 'landslide']
    }],
    ['broken_plains', {
      name: 'Broken Plains',
      rockDensityModifier: 0.9,
      preferredSizes: { tiny: 1.2, small: 1.4, medium: 1.1, large: 1.3, massive: 0.8 },
      clusterTendency: 0.4,
      weatheringLevel: 0.6,
      formationTypes: ['outcrop', 'scattered', 'battlefield']
    }],
    ['chaotic_terrain', {
      name: 'Chaotic Terrain',
      rockDensityModifier: 1.6,
      preferredSizes: { tiny: 1.0, small: 0.9, medium: 1.3, large: 1.5, massive: 1.8 },
      clusterTendency: 0.7,
      weatheringLevel: 0.3,
      formationTypes: ['landslide', 'outcrop', 'amphitheater']
    }]
  ]);

  constructor() {
    this.noise = new Noise(Math.random());
    this.formationNoise = new Noise(Math.random() * 1000);
    this.densityNoise = new Noise(Math.random() * 2000);
  }

  public calculateOrganicRockDistribution(
    region: RegionCoordinates,
    centerPosition: THREE.Vector3,
    baseRockCount: number
  ): {
    totalRocks: number;
    sizeDistribution: { [key: string]: number };
    formations: GeologicalFormation[];
    biome: BiomeCharacteristics;
  } {
    // Determine biome based on quadrant and noise
    const biome = this.determineBiome(region, centerPosition);
    
    // Calculate organic density using noise layers
    const organicDensity = this.calculateOrganicDensity(centerPosition, region.ringIndex);
    
    // Apply biome modifier and organic variation
    const adjustedRockCount = Math.round(
      baseRockCount * biome.rockDensityModifier * organicDensity
    );
    
    // Create size distribution based on biome preferences and ring
    const sizeDistribution = this.calculateBiomeAwareSizeDistribution(
      region.ringIndex, 
      biome,
      organicDensity
    );
    
    // Generate geological formations for this region
    const formations = this.generateGeologicalFormations(
      centerPosition,
      biome,
      adjustedRockCount
    );

    console.log(`🌍 Biome: ${biome.name}, Rocks: ${adjustedRockCount}, Density: ${organicDensity.toFixed(2)}`);

    return {
      totalRocks: adjustedRockCount,
      sizeDistribution,
      formations,
      biome
    };
  }

  private determineBiome(region: RegionCoordinates, position: THREE.Vector3): BiomeCharacteristics {
    // Use quadrant as base biome type with noise variation
    const quadrantBiomes = [
      'ancient_riverbed',  // NE - 0
      'hill_country',      // SE - 1  
      'broken_plains',     // SW - 2
      'chaotic_terrain'    // NW - 3
    ];
    
    // Add noise-based variation to prevent rigid quadrant boundaries
    const noiseValue = this.noise.perlin2(position.x * 0.001, position.z * 0.001);
    const biomeShift = Math.floor(noiseValue * 2); // Can shift by 0-1 quadrants
    
    const biomeIndex = (region.quadrant + biomeShift) % 4;
    const biomeKey = quadrantBiomes[Math.abs(biomeIndex)];
    
    return this.biomes.get(biomeKey) || this.biomes.get('broken_plains')!;
  }

  private calculateOrganicDensity(position: THREE.Vector3, ringIndex: number): number {
    // Base density from ring (non-linear progression)
    const ringDensities = [0.3, 0.7, 1.2, 1.8]; // Not linear scaling
    const baseDensity = ringDensities[Math.min(ringIndex, 3)];
    
    // Add multiple noise layers for organic variation
    const largescaleNoise = this.densityNoise.perlin2(position.x * 0.002, position.z * 0.002);
    const mediumscaleNoise = this.densityNoise.perlin2(position.x * 0.008, position.z * 0.008);
    const finescaleNoise = this.densityNoise.perlin2(position.x * 0.02, position.z * 0.02);
    
    // Combine noise layers with different weights
    const noiseVariation = (
      largescaleNoise * 0.6 +
      mediumscaleNoise * 0.3 +
      finescaleNoise * 0.1
    );
    
    // Apply noise variation (can increase or decrease density by up to 80%)
    const organicFactor = 1.0 + (noiseVariation * 0.8);
    
    // Ensure minimum density and apply geographic bias
    return Math.max(0.2, baseDensity * organicFactor);
  }

  private calculateBiomeAwareSizeDistribution(
    ringIndex: number,
    biome: BiomeCharacteristics,
    organicDensity: number
  ): { [key: string]: number } {
    // Base distributions by ring (more organic than before)
    const baseDistributions = [
      { tiny: 0.70, small: 0.20, medium: 0.08, large: 0.02, massive: 0.00 }, // Ring 0 - Settlement
      { tiny: 0.40, small: 0.30, medium: 0.20, large: 0.08, massive: 0.02 }, // Ring 1 - Transition
      { tiny: 0.25, small: 0.25, medium: 0.30, large: 0.15, massive: 0.05 }, // Ring 2 - Wild
      { tiny: 0.15, small: 0.20, medium: 0.25, large: 0.25, massive: 0.15 }  // Ring 3 - Chaotic
    ];
    
    const baseDistribution = baseDistributions[Math.min(ringIndex, 3)];
    const adjustedDistribution: { [key: string]: number } = {};
    
    // Apply biome preferences with organic density influence
    Object.keys(baseDistribution).forEach(size => {
      const baseWeight = baseDistribution[size as keyof typeof baseDistribution];
      const biomeMultiplier = biome.preferredSizes[size] || 1.0;
      const densityInfluence = 0.8 + (organicDensity * 0.4); // Higher density = more varied sizes
      
      adjustedDistribution[size] = baseWeight * biomeMultiplier * densityInfluence;
    });
    
    // Normalize to ensure total weight = 1
    const totalWeight = Object.values(adjustedDistribution).reduce((sum, weight) => sum + weight, 0);
    Object.keys(adjustedDistribution).forEach(size => {
      adjustedDistribution[size] /= totalWeight;
    });
    
    return adjustedDistribution;
  }

  private generateGeologicalFormations(
    centerPosition: THREE.Vector3,
    biome: BiomeCharacteristics,
    rockCount: number
  ): GeologicalFormation[] {
    const formations: GeologicalFormation[] = [];
    
    // Determine number of formations based on rock count and biome
    const formationCount = Math.max(1, Math.floor(rockCount / 15) + Math.floor(Math.random() * 2));
    
    for (let i = 0; i < formationCount; i++) {
      // Random formation type from biome preferences
      const formationType = biome.formationTypes[
        Math.floor(Math.random() * biome.formationTypes.length)
      ] as GeologicalFormation['type'];
      
      // Position formations organically around the region
      const angle = (i / formationCount) * Math.PI * 2 + (Math.random() - 0.5) * Math.PI;
      const distance = 20 + Math.random() * 40; // Spread formations out
      
      const formationCenter = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * distance
      );
      
      // Formation characteristics based on type
      const formationSpecs = this.getFormationSpecs(formationType);
      
      formations.push({
        type: formationType,
        center: formationCenter,
        radius: formationSpecs.radius + Math.random() * 10,
        intensity: 0.5 + Math.random() * 0.5,
        rockTypeBonus: formationSpecs.preferredTypes
      });
    }
    
    console.log(`⛰️ Generated ${formations.length} geological formations for ${biome.name}`);
    return formations;
  }

  private getFormationSpecs(type: GeologicalFormation['type']): {
    radius: number;
    preferredTypes: string[];
  } {
    switch (type) {
      case 'battlefield':
        return { radius: 25, preferredTypes: ['medium', 'large'] };
      case 'landslide':
        return { radius: 30, preferredTypes: ['small', 'medium', 'massive'] };
      case 'erosion':
        return { radius: 40, preferredTypes: ['tiny', 'small'] };
      case 'amphitheater':
        return { radius: 35, preferredTypes: ['large', 'massive'] };
      case 'outcrop':
        return { radius: 20, preferredTypes: ['medium', 'large', 'massive'] };
      case 'scattered':
      default:
        return { radius: 50, preferredTypes: ['tiny', 'small', 'medium'] };
    }
  }

  public getFormationInfluenceAtPosition(
    position: THREE.Vector3,
    formations: GeologicalFormation[]
  ): {
    densityMultiplier: number;
    sizeInfluence: { [key: string]: number };
    formationType: string | null;
  } {
    let strongestInfluence = 0;
    let dominantFormation: GeologicalFormation | null = null;
    
    // Find strongest formation influence at this position
    for (const formation of formations) {
      const distance = position.distanceTo(formation.center);
      const influence = Math.max(0, 1 - (distance / formation.radius)) * formation.intensity;
      
      if (influence > strongestInfluence) {
        strongestInfluence = influence;
        dominantFormation = formation;
      }
    }
    
    if (!dominantFormation || strongestInfluence < 0.1) {
      return {
        densityMultiplier: 1.0,
        sizeInfluence: {},
        formationType: null
      };
    }
    
    // Calculate formation-specific influences
    const densityMultiplier = 1.0 + (strongestInfluence * 1.5); // Formations increase density
    const sizeInfluence: { [key: string]: number } = {};
    
    // Boost preferred rock types for this formation
    dominantFormation.rockTypeBonus.forEach(size => {
      sizeInfluence[size] = 1.0 + (strongestInfluence * 2.0);
    });
    
    return {
      densityMultiplier,
      sizeInfluence,
      formationType: dominantFormation.type
    };
  }

  public selectRockVariationForPosition(
    position: THREE.Vector3,
    biome: BiomeCharacteristics,
    formations: GeologicalFormation[],
    targetSizeDistribution: { [key: string]: number }
  ): RockVariation {
    // Get formation influence at this position
    const formationInfluence = this.getFormationInfluenceAtPosition(position, formations);
    
    // Combine biome preferences with formation influence
    const weights: { [key: string]: number } = {};
    
    ROCK_VARIATIONS.forEach(variation => {
      const biomeWeight = biome.preferredSizes[variation.category] || 1.0;
      const targetWeight = targetSizeDistribution[variation.category] || 0.1;
      const formationWeight = formationInfluence.sizeInfluence[variation.category] || 1.0;
      
      weights[variation.category] = variation.weight * biomeWeight * targetWeight * formationWeight;
    });
    
    // Weighted random selection
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const variation of ROCK_VARIATIONS) {
      random -= weights[variation.category];
      if (random <= 0) {
        return variation;
      }
    }
    
    // Fallback to first variation
    return ROCK_VARIATIONS[0];
  }
}
