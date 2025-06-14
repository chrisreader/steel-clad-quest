
import * as THREE from 'three';
import { BiomeType } from '../core/GrassConfig';

export interface BiomeSeedPoint {
  position: THREE.Vector3;
  biomeType: BiomeType;
  radius: number;
  strength: number;
  id: string;
}

export interface BiomeInfluenceData {
  dominantBiome: BiomeType;
  strength: number;
  influences: Array<{ biomeType: BiomeType; influence: number; distance: number }>;
}

export class BiomeSeedManager {
  private static worldSeed: number = 12345;
  private static seedPoints: BiomeSeedPoint[] = [];
  private static generatedRegions: Set<string> = new Set();
  private static readonly REGION_SIZE = 512; // Generate seeds per 512x512 region
  private static readonly SEEDS_PER_REGION = 8; // 8 biome seeds per region
  private static readonly MIN_RADIUS = 50; // ~7,854 sq units
  private static readonly MAX_RADIUS = 89; // ~25,000 sq units
  private static readonly MIN_SEED_DISTANCE = 80; // Minimum distance between seeds

  public static setWorldSeed(seed: number): void {
    this.worldSeed = seed;
    this.seedPoints = [];
    this.generatedRegions.clear();
  }

  private static getRegionKey(position: THREE.Vector3): string {
    const regionX = Math.floor(position.x / this.REGION_SIZE);
    const regionZ = Math.floor(position.z / this.REGION_SIZE);
    return `${regionX}_${regionZ}`;
  }

  private static seededRandom(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return (n - Math.floor(n));
  }

  private static generateSeedsForRegion(regionX: number, regionZ: number): void {
    const regionKey = `${regionX}_${regionZ}`;
    if (this.generatedRegions.has(regionKey)) return;

    const regionSeed = this.worldSeed + regionX * 73856093 + regionZ * 19349663;
    const regionCenterX = regionX * this.REGION_SIZE + this.REGION_SIZE / 2;
    const regionCenterZ = regionZ * this.REGION_SIZE + this.REGION_SIZE / 2;

    const newSeeds: BiomeSeedPoint[] = [];

    // Generate biome seeds for this region
    for (let i = 0; i < this.SEEDS_PER_REGION; i++) {
      const seedX = regionCenterX + (this.seededRandom(i, 0, regionSeed) - 0.5) * this.REGION_SIZE * 0.8;
      const seedZ = regionCenterZ + (this.seededRandom(i, 1, regionSeed) - 0.5) * this.REGION_SIZE * 0.8;
      
      // Check minimum distance from existing seeds
      const proposedPosition = new THREE.Vector3(seedX, 0, seedZ);
      let validPosition = true;
      
      for (const existingSeed of [...this.seedPoints, ...newSeeds]) {
        if (existingSeed.position.distanceTo(proposedPosition) < this.MIN_SEED_DISTANCE) {
          validPosition = false;
          break;
        }
      }
      
      if (!validPosition) continue;

      // Determine biome type with clustering tendency
      const biomeRandom = this.seededRandom(i, 2, regionSeed);
      const clusterRandom = this.seededRandom(i, 3, regionSeed);
      
      let biomeType: BiomeType = 'normal';
      
      // Check for nearby biomes to create clustering
      const nearbySeeds = this.seedPoints.filter(seed => 
        seed.position.distanceTo(proposedPosition) < 200
      );
      
      if (nearbySeeds.length > 0 && clusterRandom < 0.6) {
        // 60% chance to cluster with nearby biome
        const nearestSeed = nearbySeeds.reduce((closest, seed) => 
          seed.position.distanceTo(proposedPosition) < closest.position.distanceTo(proposedPosition) 
            ? seed : closest
        );
        biomeType = nearestSeed.biomeType;
      } else {
        // Random biome selection
        if (biomeRandom < 0.3) {
          biomeType = 'meadow';
        } else if (biomeRandom < 0.6) {
          biomeType = 'prairie';
        } else {
          biomeType = 'normal';
        }
      }

      // Random radius between min and max
      const radiusRandom = this.seededRandom(i, 4, regionSeed);
      const radius = this.MIN_RADIUS + radiusRandom * (this.MAX_RADIUS - this.MIN_RADIUS);
      
      // Random strength
      const strengthRandom = this.seededRandom(i, 5, regionSeed);
      const strength = 0.7 + strengthRandom * 0.3; // 0.7 to 1.0

      const seedPoint: BiomeSeedPoint = {
        position: proposedPosition,
        biomeType,
        radius,
        strength,
        id: `${regionKey}_${i}`
      };

      newSeeds.push(seedPoint);
    }

    this.seedPoints.push(...newSeeds);
    this.generatedRegions.add(regionKey);
    
    console.log(`🌍 Generated ${newSeeds.length} biome seeds for region ${regionKey}`);
  }

  public static getBiomeInfluenceAtPosition(position: THREE.Vector3): BiomeInfluenceData {
    // Ensure seeds are generated for this area and surrounding regions
    const currentRegionX = Math.floor(position.x / this.REGION_SIZE);
    const currentRegionZ = Math.floor(position.z / this.REGION_SIZE);
    
    // Generate seeds for 3x3 grid around current region
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.generateSeedsForRegion(currentRegionX + dx, currentRegionZ + dz);
      }
    }

    // Find all seed points within influence range
    const influences: Array<{ biomeType: BiomeType; influence: number; distance: number }> = [];
    
    for (const seed of this.seedPoints) {
      const distance = seed.position.distanceTo(position);
      
      if (distance <= seed.radius * 1.5) { // Extended influence range
        // Calculate influence based on distance from seed center
        let influence = 0;
        
        if (distance <= seed.radius) {
          // Inside the main biome area
          influence = seed.strength * (1 - (distance / seed.radius) * 0.5);
        } else {
          // In the transition zone
          const transitionFactor = 1 - ((distance - seed.radius) / (seed.radius * 0.5));
          influence = seed.strength * transitionFactor * 0.3;
        }
        
        influence = Math.max(0, Math.min(1, influence));
        
        if (influence > 0.1) {
          influences.push({
            biomeType: seed.biomeType,
            influence,
            distance
          });
        }
      }
    }

    // Sort by influence strength
    influences.sort((a, b) => b.influence - a.influence);

    // Determine dominant biome
    let dominantBiome: BiomeType = 'normal';
    let totalStrength = 0;

    if (influences.length > 0) {
      dominantBiome = influences[0].biomeType;
      totalStrength = influences[0].influence;
    }

    return {
      dominantBiome,
      strength: totalStrength,
      influences: influences.slice(0, 3) // Return top 3 influences
    };
  }

  public static getAllSeedPoints(): BiomeSeedPoint[] {
    return [...this.seedPoints];
  }

  public static getSeedPointsInRadius(center: THREE.Vector3, radius: number): BiomeSeedPoint[] {
    return this.seedPoints.filter(seed => 
      seed.position.distanceTo(center) <= radius
    );
  }

  public static clearCache(): void {
    this.seedPoints = [];
    this.generatedRegions.clear();
  }

  public static getDebugInfo(): {
    totalSeeds: number;
    generatedRegions: number;
    biomeCounts: Record<BiomeType, number>;
  } {
    const biomeCounts: Record<BiomeType, number> = {
      normal: 0,
      meadow: 0,
      prairie: 0
    };

    for (const seed of this.seedPoints) {
      biomeCounts[seed.biomeType]++;
    }

    return {
      totalSeeds: this.seedPoints.length,
      generatedRegions: this.generatedRegions.size,
      biomeCounts
    };
  }
}
