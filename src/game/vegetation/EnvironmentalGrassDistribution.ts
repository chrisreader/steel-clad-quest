import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';

export interface EnvironmentalFactors {
  moisture: number;
  slope: number;
  lightExposure: number;
  terrainDetails: {
    hasWater: boolean;
    hasTrees: boolean;
    hasRocks: boolean;
    playerTraffic: number;
  };
}

export class EnvironmentalGrassDistribution {
  public static createEnvironmentalFactorsForTerrain(
    position: THREE.Vector3,
    height: number,
    terrainDetails: {
      hasWater: boolean;
      hasTrees: boolean;
      hasRocks: boolean;
      playerTraffic: number;
    }
  ): EnvironmentalFactors {
    const moisture = MathUtils.clamp(0.5 + height * 0.1 - position.y * 0.05, 0.2, 0.8);
    const slope = MathUtils.clamp(Math.abs(Math.sin(position.x * 0.1) * Math.cos(position.z * 0.1)), 0, 0.6);
    const lightExposure = MathUtils.clamp(0.7 - height * 0.05 + position.y * 0.03, 0.3, 0.9);
    
    return {
      moisture: moisture,
      slope: slope,
      lightExposure: lightExposure,
      terrainDetails: terrainDetails
    };
  }
  
  private static shouldSpawnGrass(position: THREE.Vector3, environmentalFactors: EnvironmentalFactors): boolean {
    const { moisture, slope, lightExposure, terrainDetails } = environmentalFactors;
    
    // High base probability with minimal environmental penalties
    let spawnProbability = 0.85;
    
    // Small positive modifiers only - no harsh penalties
    spawnProbability += moisture * 0.1;
    spawnProbability += lightExposure * 0.1;
    
    // Minimal slope penalty only
    spawnProbability -= slope * 0.05;
    
    // Remove all harsh environmental penalties - grass can grow almost anywhere
    spawnProbability -= terrainDetails.playerTraffic * 0.1;
    
    // Ensure very high minimum spawn probability to prevent empty areas
    return Math.random() < MathUtils.clamp(spawnProbability, 0.75, 0.95);
  }
  
  private static selectSpeciesBasedOnEnvironment(environmentalFactors: EnvironmentalFactors): string {
    const { moisture, slope, lightExposure } = environmentalFactors;
    
    let speciesPreference: { [species: string]: number } = {
      'meadow': 0.3 + moisture * 0.2,
      'prairie': 0.2 + lightExposure * 0.3,
      'clumping': 0.3 - slope * 0.2,
      'fine': 0.2
    };
    
    let totalPreference = 0;
    for (const species in speciesPreference) {
      totalPreference += speciesPreference[species];
    }
    
    let randomValue = Math.random() * totalPreference;
    let cumulativeProbability = 0;
    
    for (const species in speciesPreference) {
      cumulativeProbability += speciesPreference[species];
      if (randomValue <= cumulativeProbability) {
        return species;
      }
    }
    
    return 'meadow';
  }

  public static calculateGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    baseSpacing: number,
    minimumCoverage: number = 0.25 // Guarantee at least 25% coverage
  ) {
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];
    
    const gridSize = Math.floor(size / baseSpacing);
    const halfSize = size * 0.5;
    const totalPossiblePositions = gridSize * gridSize;
    let spawnedCount = 0;
    
    // First pass: normal spawning with environmental checks
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const worldX = centerPosition.x - halfSize + (x * baseSpacing) + (Math.random() - 0.5) * baseSpacing * 0.8;
        const worldZ = centerPosition.z - halfSize + (z * baseSpacing) + (Math.random() - 0.5) * baseSpacing * 0.8;
        const worldPos = new THREE.Vector3(worldX, 0, worldZ);
        
        if (this.shouldSpawnGrass(worldPos, environmentalFactors)) {
          this.addGrassBlade(positions, scales, rotations, species, worldPos, environmentalFactors);
          spawnedCount++;
        }
      }
    }
    
    // Second pass: ensure minimum coverage if we haven't met the threshold
    const currentCoverage = spawnedCount / totalPossiblePositions;
    if (currentCoverage < minimumCoverage) {
      const neededGrass = Math.floor(totalPossiblePositions * minimumCoverage) - spawnedCount;
      
      for (let i = 0; i < neededGrass; i++) {
        // Generate random positions in the region
        const randomX = centerPosition.x - halfSize + Math.random() * size;
        const randomZ = centerPosition.z - halfSize + Math.random() * size;
        const worldPos = new THREE.Vector3(randomX, 0, randomZ);
        
        this.addGrassBlade(positions, scales, rotations, species, worldPos, environmentalFactors);
      }
      
      console.log(`🌱 Guaranteed minimum grass coverage: added ${neededGrass} extra blades to reach ${minimumCoverage * 100}% coverage`);
    }
    
    return { positions, scales, rotations, species };
  }
  
  private static addGrassBlade(
    positions: THREE.Vector3[],
    scales: THREE.Vector3[],
    rotations: THREE.Quaternion[],
    species: string[],
    worldPos: THREE.Vector3,
    environmentalFactors: EnvironmentalFactors
  ): void {
    // Calculate smooth height variation based on position
    const heightVariation = this.calculateSmoothHeightVariation(worldPos);
    
    positions.push(worldPos.clone());
    
    // Apply height variation to scale (affecting both regular and ground grass)
    const baseScale = 0.8 + Math.random() * 0.4;
    const heightModifiedScale = baseScale * heightVariation;
    
    scales.push(new THREE.Vector3(
      0.8 + Math.random() * 0.4,
      heightModifiedScale, // This will be further modified by biome and grass type
      0.8 + Math.random() * 0.4
    ));
    
    rotations.push(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.random() * Math.PI * 2
    ));
    
    species.push(this.selectSpeciesBasedOnEnvironment(environmentalFactors));
  }

  // Add smooth height variation calculation
  private static calculateSmoothHeightVariation(position: THREE.Vector3): number {
    // Use multiple noise octaves for smooth height variation
    const noiseScale1 = 0.008; // Large patches
    const noiseScale2 = 0.025; // Medium patches  
    const noiseScale3 = 0.08;  // Small variations
    
    // Generate layered noise for natural height variation
    const noise1 = Math.sin(position.x * noiseScale1) * Math.cos(position.z * noiseScale1);
    const noise2 = Math.sin(position.x * noiseScale2) * Math.cos(position.z * noiseScale2) * 0.5;
    const noise3 = Math.sin(position.x * noiseScale3) * Math.cos(position.z * noiseScale3) * 0.25;
    
    const combinedNoise = noise1 + noise2 + noise3;
    
    // Convert to height multiplier (0.7 to 1.2 range for 30% variation)
    const normalizedNoise = (combinedNoise + 1.75) / 3.5; // Normalize to 0-1
    const heightMultiplier = 0.7 + (normalizedNoise * 0.5); // 0.7 to 1.2 range
    
    return Math.max(0.7, Math.min(1.2, heightMultiplier));
  }
}
