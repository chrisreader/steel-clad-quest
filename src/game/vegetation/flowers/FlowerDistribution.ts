
import * as THREE from 'three';
import { FlowerGeometry, FlowerSpecies } from './FlowerGeometry';
import { BiomeTransitionSystem } from '../biomes/BiomeTransitionSystem';
import { ChunkCoordinate } from '../biomes/DeterministicBiomeManager';

export interface FlowerPatchData {
  position: THREE.Vector3;
  species: FlowerSpecies;
  flowerCount: number;
  patchRadius: number;
  rotation: number;
}

export class FlowerDistribution {
  private static flowerCache: Map<string, THREE.Group[]> = new Map();

  public static generateFlowersForChunk(
    chunk: ChunkCoordinate,
    season: string = 'summer'
  ): THREE.Group[] {
    const chunkKey = `${chunk.x}_${chunk.z}_${season}`;
    
    if (this.flowerCache.has(chunkKey)) {
      return this.flowerCache.get(chunkKey)!;
    }

    const chunkSize = 64;
    const chunkCenter = new THREE.Vector3(
      chunk.x * chunkSize + chunkSize / 2,
      0,
      chunk.z * chunkSize + chunkSize / 2
    );
    
    const seed = chunk.x * 73856093 + chunk.z * 19349663;
    const seededRandom = this.createSeededRandom(seed);
    
    const flowerGroups: THREE.Group[] = [];
    const patchData: FlowerPatchData[] = [];

    // Generate flower patches based on biome transitions
    const patchAttempts = 8; // Try to place several patches per chunk
    
    for (let i = 0; i < patchAttempts; i++) {
      const localX = (seededRandom() - 0.5) * chunkSize * 0.8;
      const localZ = (seededRandom() - 0.5) * chunkSize * 0.8;
      const patchPosition = new THREE.Vector3(
        chunkCenter.x + localX,
        0,
        chunkCenter.z + localZ
      );
      
      // Check biome transition at this position
      const transition = BiomeTransitionSystem.calculateBiomeTransition(patchPosition, seed);
      
      // Calculate flower spawn probability based on biome
      const spawnProbability = this.calculateFlowerSpawnProbability(
        transition,
        patchPosition,
        seededRandom
      );
      
      if (seededRandom() < spawnProbability) {
        const patchInfo = this.generateFlowerPatch(
          patchPosition,
          transition,
          season,
          seededRandom
        );
        
        if (patchInfo) {
          patchData.push(patchInfo);
        }
      }
    }

    // Create actual flower groups from patch data
    for (const patch of patchData) {
      const flowerGroup = FlowerGeometry.createFlowerPatch(
        patch.species,
        patch.patchRadius,
        patch.flowerCount
      );
      
      flowerGroup.position.copy(patch.position);
      flowerGroup.rotation.y = patch.rotation;
      
      // Add wind animation data
      flowerGroup.userData.windPhase = Math.random() * Math.PI * 2;
      flowerGroup.userData.windStrength = 0.3 + Math.random() * 0.4;
      
      flowerGroups.push(flowerGroup);
    }

    this.flowerCache.set(chunkKey, flowerGroups);
    
    console.log(`🌸 Generated ${flowerGroups.length} flower patches for chunk ${chunkKey}`);
    
    return flowerGroups;
  }

  private static calculateFlowerSpawnProbability(
    transition: any,
    position: THREE.Vector3,
    seededRandom: () => number
  ): number {
    let baseProbability = 0.15; // Base 15% chance
    
    // Increase probability in meadow biomes
    if (transition.primaryBiome === 'meadow') {
      baseProbability = 0.4;
    } else if (transition.primaryBiome === 'prairie') {
      baseProbability = 0.25;
    }
    
    // Increase probability in transition zones (edge effect)
    if (transition.secondaryBiome) {
      baseProbability += transition.blendFactor * 0.2;
    }
    
    // Add environmental noise for natural clustering
    const noiseX = Math.sin(position.x * 0.02) * Math.cos(position.z * 0.02);
    const noiseZ = Math.sin(position.z * 0.015) * Math.cos(position.x * 0.015);
    const environmentalFactor = (noiseX + noiseZ) * 0.5 + 1; // 0.5 to 1.5 range
    
    baseProbability *= environmentalFactor;
    
    // Add some randomness
    baseProbability *= (0.7 + seededRandom() * 0.6);
    
    return Math.min(baseProbability, 0.8);
  }

  private static generateFlowerPatch(
    position: THREE.Vector3,
    transition: any,
    season: string,
    seededRandom: () => number
  ): FlowerPatchData | null {
    // Select appropriate flower species for the biome
    const primarySpecies = FlowerGeometry.getSpeciesForBiome(transition.primaryBiome, season);
    const secondarySpecies = transition.secondaryBiome ? 
      FlowerGeometry.getSpeciesForBiome(transition.secondaryBiome, season) : [];
    
    const allAvailableSpecies = [...primarySpecies, ...secondarySpecies];
    
    if (allAvailableSpecies.length === 0) {
      return null; // No suitable species for this biome/season
    }
    
    // Select species based on biome blend
    let selectedSpecies: FlowerSpecies;
    if (transition.secondaryBiome && seededRandom() < transition.blendFactor) {
      selectedSpecies = secondarySpecies[Math.floor(seededRandom() * secondarySpecies.length)];
    } else {
      selectedSpecies = primarySpecies[Math.floor(seededRandom() * primarySpecies.length)];
    }
    
    // Calculate patch size and flower count based on biome
    let baseFlowerCount = 3;
    let basePatchRadius = 1.5;
    
    if (transition.primaryBiome === 'meadow') {
      baseFlowerCount = 5;
      basePatchRadius = 2.0;
    } else if (transition.primaryBiome === 'prairie') {
      baseFlowerCount = 3;
      basePatchRadius = 1.8;
    }
    
    const flowerCount = Math.max(1, baseFlowerCount + Math.floor((seededRandom() - 0.5) * 3));
    const patchRadius = basePatchRadius * (0.7 + seededRandom() * 0.6);
    
    return {
      position: position.clone(),
      species: selectedSpecies,
      flowerCount,
      patchRadius,
      rotation: seededRandom() * Math.PI * 2
    };
  }

  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
  }

  public static clearCache(): void {
    this.flowerCache.clear();
  }

  public static getCacheSize(): number {
    return this.flowerCache.size;
  }
}
