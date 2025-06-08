
import * as THREE from 'three';
import { EnvironmentalFactors } from './EnvironmentalGrassDistribution';

export type BiomeType = 'normal' | 'meadow' | 'prairie';

export interface BiomeConfiguration {
  name: string;
  speciesDistribution: {
    meadow: number;
    prairie: number;
    clumping: number;
    fine: number;
  };
  densityMultiplier: number;
  heightMultiplier: number;
  windExposureMultiplier: number;
  preferredMoisture: number;
  color: THREE.Color; // For debug visualization
}

export interface BiomeInfo {
  type: BiomeType;
  strength: number; // 0-1, how pure the biome is
  transitionZone: boolean;
}

export class GrassBiomeManager {
  private static readonly BIOME_CONFIGS: Record<BiomeType, BiomeConfiguration> = {
    normal: {
      name: 'Mixed Temperate Grassland',
      speciesDistribution: {
        meadow: 0.3,
        prairie: 0.2,
        clumping: 0.35,
        fine: 0.15
      },
      densityMultiplier: 1.0,
      heightMultiplier: 0.68,
      windExposureMultiplier: 1.0,
      preferredMoisture: 0.5,
      color: new THREE.Color(0x90EE90) // Light green
    },
    meadow: {
      name: 'Lush Meadow',
      speciesDistribution: {
        meadow: 0.6,
        prairie: 0.05,
        clumping: 0.05,
        fine: 0.3
      },
      densityMultiplier: 1.5,
      heightMultiplier: 1.1,
      windExposureMultiplier: 0.7,
      preferredMoisture: 0.8,
      color: new THREE.Color(0x32CD32) // Lime green
    },
    prairie: {
      name: 'Open Prairie',
      speciesDistribution: {
        meadow: 0.1,
        prairie: 0.7,
        clumping: 0.05,
        fine: 0.15
      },
      densityMultiplier: 0.8,
      heightMultiplier: 1.04,
      windExposureMultiplier: 1.4,
      preferredMoisture: 0.4,
      color: new THREE.Color(0xFFD700) // Golden
    }
  };

  // Enhanced spawn protection with smaller radius for more variety
  private static readonly NORMAL_BIOME_RADIUS = 65; // Reduced from 100 to 65
  
  // Multi-scale noise frequencies for organic biome generation
  private static readonly LARGE_SCALE_FREQUENCY = 0.008;    // Major biome regions
  private static readonly MEDIUM_SCALE_FREQUENCY = 0.02;    // Sub-regions
  private static readonly DETAIL_SCALE_FREQUENCY = 0.06;    // Fine transitions
  private static readonly DOMAIN_WARP_FREQUENCY = 0.012;    // For organic shapes

  public static getBiomeAtPosition(position: THREE.Vector3): BiomeInfo {
    const distanceFromSpawn = position.length();
    
    // Enhanced spawn protection with softer transition
    if (distanceFromSpawn < this.NORMAL_BIOME_RADIUS) {
      const edgeTransitionStart = this.NORMAL_BIOME_RADIUS * 0.7; // Start transition at 70% of radius
      
      if (distanceFromSpawn < edgeTransitionStart) {
        // Pure normal biome in inner spawn area
        return {
          type: 'normal',
          strength: 1.0,
          transitionZone: false
        };
      } else {
        // Soft transition zone at spawn edge
        const transitionFactor = (distanceFromSpawn - edgeTransitionStart) / (this.NORMAL_BIOME_RADIUS - edgeTransitionStart);
        const strength = Math.max(0.6, 1.0 - (transitionFactor * 0.4));
        
        return {
          type: 'normal',
          strength: strength,
          transitionZone: true
        };
      }
    }

    // Enhanced procedural biome generation for Rings 1-3
    const biomeInfo = this.generateOrganicBiome(position.x, position.z);
    
    return biomeInfo;
  }

  private static generateOrganicBiome(x: number, z: number): BiomeInfo {
    // Apply domain warping for more organic shapes
    const warpX = this.generateLayeredNoise(x * this.DOMAIN_WARP_FREQUENCY, z * this.DOMAIN_WARP_FREQUENCY) * 40;
    const warpZ = this.generateLayeredNoise((x + 100) * this.DOMAIN_WARP_FREQUENCY, (z + 100) * this.DOMAIN_WARP_FREQUENCY) * 40;
    
    const warpedX = x + warpX;
    const warpedZ = z + warpZ;
    
    // Generate multi-scale noise for natural biome distribution
    const largePatch = this.generateLayeredNoise(warpedX * this.LARGE_SCALE_FREQUENCY, warpedZ * this.LARGE_SCALE_FREQUENCY);
    const mediumPatch = this.generateLayeredNoise(warpedX * this.MEDIUM_SCALE_FREQUENCY, warpedZ * this.MEDIUM_SCALE_FREQUENCY) * 0.6;
    const detailNoise = this.generateLayeredNoise(warpedX * this.DETAIL_SCALE_FREQUENCY, warpedZ * this.DETAIL_SCALE_FREQUENCY) * 0.3;
    
    // Combine noise layers for complex biome patterns
    const combinedNoise = largePatch + mediumPatch + detailNoise;
    
    // Enhanced biome selection with better balance
    let biomeType: BiomeType;
    let strength: number;
    let transitionZone: boolean = false;
    
    // Improved thresholds for more balanced distribution
    if (combinedNoise > 0.4) {
      // Meadow biomes (lush, high-moisture areas)
      biomeType = 'meadow';
      strength = Math.min(1.0, (combinedNoise - 0.4) / 0.6);
      transitionZone = strength < 0.6;
    } else if (combinedNoise < -0.3) {
      // Prairie biomes (open, wind-exposed areas)
      biomeType = 'prairie';
      strength = Math.min(1.0, Math.abs(combinedNoise + 0.3) / 0.5);
      transitionZone = strength < 0.6;
    } else {
      // Normal biomes (balanced mixed grasslands)
      biomeType = 'normal';
      const distanceFromCenter = Math.abs(combinedNoise + 0.05); // Slight offset for variety
      strength = Math.max(0.4, 1.0 - (distanceFromCenter / 0.35));
      transitionZone = strength < 0.7;
    }
    
    // Add secondary pattern for micro-biomes and variety
    const microPattern = this.generateLayeredNoise(
      (warpedX + 200) * this.DETAIL_SCALE_FREQUENCY * 2,
      (warpedZ + 200) * this.DETAIL_SCALE_FREQUENCY * 2
    ) * 0.2;
    
    // Occasionally override with micro-biomes for variety
    if (Math.abs(microPattern) > 0.15 && Math.random() < 0.15) {
      if (microPattern > 0.15) {
        biomeType = 'meadow';
        strength = 0.5 + Math.random() * 0.3;
        transitionZone = true;
      } else {
        biomeType = 'prairie';
        strength = 0.4 + Math.random() * 0.4;
        transitionZone = true;
      }
    }
    
    return {
      type: biomeType,
      strength: Math.max(0.3, strength),
      transitionZone: transitionZone
    };
  }

  private static generateLayeredNoise(x: number, z: number): number {
    // Enhanced multi-octave noise for more natural patterns
    const octave1 = Math.sin(x) * Math.cos(z);
    const octave2 = Math.sin(x * 2.1 + 1.7) * Math.cos(z * 1.9 + 2.3) * 0.5;
    const octave3 = Math.sin(x * 4.3 + 3.1) * Math.cos(z * 3.7 + 1.1) * 0.25;
    const octave4 = Math.sin(x * 8.7 + 2.9) * Math.cos(z * 7.3 + 4.7) * 0.125;
    
    return octave1 + octave2 + octave3 + octave4;
  }

  public static getBiomeConfiguration(biomeType: BiomeType): BiomeConfiguration {
    return this.BIOME_CONFIGS[biomeType];
  }

  public static adjustSpeciesForBiome(
    baseSpecies: string[], 
    biomeInfo: BiomeInfo
  ): string[] {
    const config = this.getBiomeConfiguration(biomeInfo.type);
    const adjustedSpecies: string[] = [];

    // Apply biome species distribution with transition blending
    for (let i = 0; i < baseSpecies.length; i++) {
      const random = Math.random();
      let cumulativeProbability = 0;

      // If in transition zone, blend with normal biome characteristics
      let effectiveDistribution = config.speciesDistribution;
      if (biomeInfo.transitionZone && biomeInfo.type !== 'normal') {
        const normalConfig = this.getBiomeConfiguration('normal');
        const blendFactor = biomeInfo.strength;
        
        effectiveDistribution = {
          meadow: config.speciesDistribution.meadow * blendFactor + normalConfig.speciesDistribution.meadow * (1 - blendFactor),
          prairie: config.speciesDistribution.prairie * blendFactor + normalConfig.speciesDistribution.prairie * (1 - blendFactor),
          clumping: config.speciesDistribution.clumping * blendFactor + normalConfig.speciesDistribution.clumping * (1 - blendFactor),
          fine: config.speciesDistribution.fine * blendFactor + normalConfig.speciesDistribution.fine * (1 - blendFactor)
        };
      }

      for (const [species, probability] of Object.entries(effectiveDistribution)) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
          adjustedSpecies.push(species);
          break;
        }
      }
    }

    return adjustedSpecies;
  }

  public static adjustEnvironmentalFactors(
    baseFactors: EnvironmentalFactors,
    biomeInfo: BiomeInfo
  ): EnvironmentalFactors {
    const config = this.getBiomeConfiguration(biomeInfo.type);
    
    // Enhanced environmental adjustment with transition blending
    const moistureAdjustment = biomeInfo.transitionZone ? 
      biomeInfo.strength * 0.3 : 0.4;
    
    return {
      ...baseFactors,
      moisture: this.lerpTowardsTarget(
        baseFactors.moisture, 
        config.preferredMoisture, 
        moistureAdjustment
      )
    };
  }

  private static lerpTowardsTarget(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  public static getAllBiomeTypes(): BiomeType[] {
    return Object.keys(this.BIOME_CONFIGS) as BiomeType[];
  }

  // Debug function to visualize biome distribution
  public static debugBiomeDistribution(centerX: number, centerZ: number, size: number, resolution: number = 50): void {
    console.log(`🌱 Biome Distribution Debug (${centerX}, ${centerZ}) - Size: ${size}`);
    
    const biomeCounts = { normal: 0, meadow: 0, prairie: 0 };
    const step = size / resolution;
    
    for (let x = 0; x < resolution; x++) {
      for (let z = 0; z < resolution; z++) {
        const worldX = centerX - size/2 + x * step;
        const worldZ = centerZ - size/2 + z * step;
        const position = new THREE.Vector3(worldX, 0, worldZ);
        const biome = this.getBiomeAtPosition(position);
        biomeCounts[biome.type]++;
      }
    }
    
    const total = resolution * resolution;
    console.log(`🌱 Normal: ${(biomeCounts.normal/total*100).toFixed(1)}%`);
    console.log(`🌱 Meadow: ${(biomeCounts.meadow/total*100).toFixed(1)}%`);
    console.log(`🌱 Prairie: ${(biomeCounts.prairie/total*100).toFixed(1)}%`);
  }
}
