
import * as THREE from 'three';
import { BiomeType, BiomeInfo } from '../core/GrassConfig';
import { EnhancedNoiseSystem } from './EnhancedNoiseSystem';

export interface BiomeInfluence {
  type: BiomeType;
  strength: number;
  distance: number;
}

export interface BlendedBiomeData {
  primaryBiome: BiomeType;
  influences: BiomeInfluence[];
  blendedColor: THREE.Color;
  blendedDensity: number;
  blendedHeight: number;
  transitionStrength: number;
}

export class BiomeBlendingSystem {
  private static biomeSeeds: THREE.Vector2[] = [];
  private static initialized = false;
  private static readonly TRANSITION_DISTANCE = 80; // Distance over which biomes blend
  private static readonly BIOME_SEED_RADIUS = 2000; // Area to generate biome seeds

  public static initialize(centerX: number = 0, centerZ: number = 0): void {
    if (this.initialized) return;
    
    this.biomeSeeds = EnhancedNoiseSystem.generateBiomeSeeds(
      centerX, 
      centerZ, 
      this.BIOME_SEED_RADIUS, 
      0.00008 // Density of biome seeds
    );
    
    this.initialized = true;
    console.log(`🌱 Generated ${this.biomeSeeds.length} biome seeds for realistic boundaries`);
  }

  public static getBlendedBiomeData(x: number, z: number): BlendedBiomeData {
    this.initialize();

    // Get environmental factors
    const temperature = EnhancedNoiseSystem.getTemperature(x, z);
    const moisture = EnhancedNoiseSystem.getMoisture(x, z);
    const elevation = EnhancedNoiseSystem.getElevation(x, z);

    // Get Voronoi seed influence
    const seedInfluence = EnhancedNoiseSystem.getBiomeSeedInfluence(x, z, this.biomeSeeds);

    // Determine primary biome based on environmental factors
    const primaryBiome = this.determinePrimaryBiome(temperature, moisture, elevation, seedInfluence);

    // Calculate nearby biome influences for blending
    const influences = this.calculateBiomeInfluences(x, z, temperature, moisture, elevation);

    // Blend properties based on influences
    const blendedColor = this.blendColors(influences);
    const blendedDensity = this.blendDensities(influences);
    const blendedHeight = this.blendHeights(influences);

    // Calculate transition strength (0 = pure biome, 1 = heavy blending)
    const transitionStrength = this.calculateTransitionStrength(influences);

    return {
      primaryBiome,
      influences,
      blendedColor,
      blendedDensity,
      blendedHeight,
      transitionStrength
    };
  }

  private static determinePrimaryBiome(
    temperature: number, 
    moisture: number, 
    elevation: number,
    seedInfluence: { type: string; strength: number }
  ): BiomeType {
    // Start with seed influence if strong enough
    if (seedInfluence.strength > 0.6) {
      return seedInfluence.type as BiomeType;
    }

    // Environmental biome determination with smooth boundaries
    if (moisture > 0.6 && temperature > 0.4) {
      return 'meadow'; // Warm and wet = lush meadow
    } else if (moisture < 0.4 && temperature > 0.5) {
      return 'prairie'; // Warm and dry = prairie
    } else {
      return 'normal'; // Mixed conditions
    }
  }

  private static calculateBiomeInfluences(
    x: number, 
    z: number, 
    temperature: number, 
    moisture: number, 
    elevation: number
  ): BiomeInfluence[] {
    const influences: BiomeInfluence[] = [];

    // Sample nearby points to determine transition zones
    const samplePoints = [
      { x: x, z: z },
      { x: x + this.TRANSITION_DISTANCE, z: z },
      { x: x - this.TRANSITION_DISTANCE, z: z },
      { x: x, z: z + this.TRANSITION_DISTANCE },
      { x: x, z: z - this.TRANSITION_DISTANCE },
      { x: x + this.TRANSITION_DISTANCE * 0.7, z: z + this.TRANSITION_DISTANCE * 0.7 },
      { x: x - this.TRANSITION_DISTANCE * 0.7, z: z - this.TRANSITION_DISTANCE * 0.7 }
    ];

    const biomeStrengths = new Map<BiomeType, number>();

    for (const point of samplePoints) {
      const pointTemp = EnhancedNoiseSystem.getTemperature(point.x, point.z);
      const pointMoisture = EnhancedNoiseSystem.getMoisture(point.x, point.z);
      const pointElevation = EnhancedNoiseSystem.getElevation(point.x, point.z);
      const pointSeedInfluence = EnhancedNoiseSystem.getBiomeSeedInfluence(point.x, point.z, this.biomeSeeds);

      const biome = this.determinePrimaryBiome(pointTemp, pointMoisture, pointElevation, pointSeedInfluence);
      const distance = Math.sqrt((point.x - x) ** 2 + (point.z - z) ** 2);
      const strength = Math.max(0, 1 - distance / this.TRANSITION_DISTANCE);

      biomeStrengths.set(biome, (biomeStrengths.get(biome) || 0) + strength);
    }

    // Normalize strengths and create influences
    const totalStrength = Array.from(biomeStrengths.values()).reduce((sum, s) => sum + s, 0);

    for (const [biome, strength] of biomeStrengths.entries()) {
      if (strength > 0.1) { // Only include significant influences
        influences.push({
          type: biome,
          strength: strength / totalStrength,
          distance: 0 // Will be calculated if needed
        });
      }
    }

    // Sort by strength (strongest first)
    influences.sort((a, b) => b.strength - a.strength);

    return influences;
  }

  private static blendColors(influences: BiomeInfluence[]): THREE.Color {
    const baseColors = {
      normal: new THREE.Color(0x6db070),
      meadow: new THREE.Color(0x4db84d),
      prairie: new THREE.Color(0xb8b84d)
    };

    let blendedColor = new THREE.Color(0, 0, 0);
    
    for (const influence of influences) {
      const biomeColor = baseColors[influence.type].clone();
      biomeColor.multiplyScalar(influence.strength);
      blendedColor.add(biomeColor);
    }

    return blendedColor;
  }

  private static blendDensities(influences: BiomeInfluence[]): number {
    const baseDensities = {
      normal: 1.5,
      meadow: 2.0,
      prairie: 1.2
    };

    let blendedDensity = 0;
    
    for (const influence of influences) {
      blendedDensity += baseDensities[influence.type] * influence.strength;
    }

    return blendedDensity;
  }

  private static blendHeights(influences: BiomeInfluence[]): number {
    const baseHeights = {
      normal: 1.0,
      meadow: 1.4,
      prairie: 0.8
    };

    let blendedHeight = 0;
    
    for (const influence of influences) {
      blendedHeight += baseHeights[influence.type] * influence.strength;
    }

    return blendedHeight;
  }

  private static calculateTransitionStrength(influences: BiomeInfluence[]): number {
    if (influences.length <= 1) return 0;

    // Calculate how evenly distributed the influences are
    const entropy = influences.reduce((sum, inf) => {
      return sum - inf.strength * Math.log2(inf.strength + 0.001);
    }, 0);

    // Normalize entropy to 0-1 range (more entropy = more transition)
    return Math.min(1, entropy / Math.log2(influences.length));
  }

  public static getBiomeInfo(x: number, z: number): BiomeInfo {
    const blendedData = this.getBlendedBiomeData(x, z);
    
    return {
      type: blendedData.primaryBiome,
      strength: 1 - blendedData.transitionStrength,
      transitionZone: blendedData.transitionStrength > 0.3
    };
  }
}
