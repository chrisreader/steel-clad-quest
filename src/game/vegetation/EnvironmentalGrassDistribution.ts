import * as THREE from 'three';
import { MathUtils } from '../utils/math/MathUtils';
import { PoissonDiskSampling } from '../utils/math/PoissonDiskSampling';
import { GradientDensity } from '../utils/math/GradientDensity';

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

export interface RegionBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: number;
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
    // Reduce geometric patterns that create large exclusion zones
    const moisture = MathUtils.clamp(0.6 + height * 0.05, 0.4, 0.9);
    const slope = MathUtils.clamp(Math.abs(Math.sin(position.x * 0.05) * Math.cos(position.z * 0.05)), 0, 0.4);
    const lightExposure = MathUtils.clamp(0.8 - height * 0.02, 0.5, 0.95);
    
    return {
      moisture: moisture,
      slope: slope,
      lightExposure: lightExposure,
      terrainDetails: terrainDetails
    };
  }
  
  /**
   * OPTIMIZED: Calculate spawn probability with reduced baseline for better performance
   */
  private static calculateSpawnProbability(
    position: THREE.Vector3, 
    environmentalFactors: EnvironmentalFactors,
    regionBounds: RegionBounds,
    lodDensityMultiplier: number = 1.0
  ): number {
    const { moisture, slope, lightExposure, terrainDetails } = environmentalFactors;
    
    // OPTIMIZED: Reduced base probability for better performance
    const noiseDensity = GradientDensity.generateNoiseDensity(position);
    let spawnProbability = 0.55 + noiseDensity * 0.15; // Reduced from 0.75 + 0.2
    
    // Apply lighter environmental modifiers
    spawnProbability += moisture * 0.12; // Reduced from 0.15
    spawnProbability -= slope * 0.06;    // Reduced from 0.08
    spawnProbability += lightExposure * 0.08; // Reduced from 0.1
    
    // Apply environmental density (now with minimal penalties)
    const environmentalDensity = GradientDensity.calculateEnvironmentalDensity(position, terrainDetails);
    spawnProbability *= environmentalDensity;
    
    // Apply edge falloff for smooth region blending
    const edgeFalloff = GradientDensity.calculateEdgeFalloff(position, regionBounds.center, regionBounds.size);
    spawnProbability *= edgeFalloff;
    
    // Apply LOD density scaling
    spawnProbability *= lodDensityMultiplier;
    
    // OPTIMIZED: Reduced minimum spawn probability for better performance
    return MathUtils.clamp(spawnProbability, 0.2, 0.9); // Reduced from 0.3, 0.98
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

  /**
   * OPTIMIZED: Organic grass distribution with reduced coverage and conditional features
   */
  public static calculateGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    baseSpacing: number,
    minimumCoverage: number = 0.25, // Note: This is now passed from caller with reduced values
    lodDensityMultiplier: number = 1.0,
    edgeBlendDistance: number = 20
  ) {
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];
    
    // Create expanded region bounds for edge blending
    const expandedSize = size + edgeBlendDistance * 2;
    const regionBounds: RegionBounds = {
      min: new THREE.Vector3(
        centerPosition.x - expandedSize * 0.5,
        centerPosition.y - 10,
        centerPosition.z - expandedSize * 0.5
      ),
      max: new THREE.Vector3(
        centerPosition.x + expandedSize * 0.5,
        centerPosition.y + 10,
        centerPosition.z + expandedSize * 0.5
      ),
      center: centerPosition.clone(),
      size: size
    };
    
    // Calculate target density based on LOD and minimum coverage
    const targetDensity = Math.max(minimumCoverage, 1.0 / (baseSpacing * baseSpacing)) * lodDensityMultiplier;
    
    // Generate organic sampling points using Poisson Disk Sampling
    const bounds2D = {
      min: new THREE.Vector2(regionBounds.min.x, regionBounds.min.z),
      max: new THREE.Vector2(regionBounds.max.x, regionBounds.max.z)
    };
    
    const organicPoints = PoissonDiskSampling.generatePoissonPoints(bounds2D, baseSpacing * 0.8);
    
    // Process each organic point with gradient probability
    for (const point2D of organicPoints) {
      const worldPos = new THREE.Vector3(point2D.x, 0, point2D.y);
      
      // Calculate spawn probability using improved gradient system
      const spawnProbability = this.calculateSpawnProbability(
        worldPos,
        environmentalFactors,
        regionBounds,
        lodDensityMultiplier
      );
      
      // Use probability-based spawning with higher success rate
      if (Math.random() < spawnProbability) {
        this.addGrassBlade(positions, scales, rotations, species, worldPos, environmentalFactors, lodDensityMultiplier);
      }
    }
    
    // OPTIMIZED: Disable secondary sampling for very low LOD to improve performance
    const currentCoverage = positions.length / organicPoints.length;
    if (currentCoverage < minimumCoverage && lodDensityMultiplier > 0.5) { // Changed from 0.1
      const additionalPoints = PoissonDiskSampling.generateBlueNoisePoints(
        bounds2D,
        (minimumCoverage - currentCoverage) * targetDensity * 1.2, // Reduced from 1.5
        0.9 // High jitter for natural distribution
      );
      
      for (const additionalPoint of additionalPoints) {
        const worldPos = new THREE.Vector3(additionalPoint.x, 0, additionalPoint.y);
        
        // Apply higher probability for secondary coverage to ensure minimum
        const secondaryProbability = this.calculateSpawnProbability(
          worldPos, environmentalFactors, regionBounds, lodDensityMultiplier
        ) * 0.7; // Reduced from 0.8
        
        if (Math.random() < secondaryProbability) {
          this.addGrassBlade(positions, scales, rotations, species, worldPos, environmentalFactors, lodDensityMultiplier);
        }
      }
      
      // OPTIMIZED: Reduce logging frequency
      if (additionalPoints.length > 0) {
        console.log(`🌱 Enhanced organic coverage: added ${additionalPoints.length} secondary samples to reach ${minimumCoverage * 100}% coverage`);
      }
    }
    
    return { positions, scales, rotations, species };
  }
  
  private static addGrassBlade(
    positions: THREE.Vector3[],
    scales: THREE.Vector3[],
    rotations: THREE.Quaternion[],
    species: string[],
    worldPos: THREE.Vector3,
    environmentalFactors: EnvironmentalFactors,
    lodDensityMultiplier: number = 1.0
  ): void {
    // OPTIMIZED: Skip height variation calculations for distant grass (LOD < 0.3)
    let heightVariation = 1.0;
    if (lodDensityMultiplier > 0.3) {
      heightVariation = this.calculateSmoothHeightVariation(worldPos);
    }
    
    positions.push(worldPos.clone());
    
    // Enhanced randomness for scale to break up visual patterns
    const baseScaleX = 0.7 + Math.random() * 0.6;
    const baseScaleZ = 0.7 + Math.random() * 0.6;
    const heightModifiedScale = (0.8 + Math.random() * 0.4) * heightVariation;
    
    scales.push(new THREE.Vector3(
      baseScaleX,
      heightModifiedScale,
      baseScaleZ
    ));
    
    // Enhanced rotation randomness with slight clustering for natural look
    const baseRotation = Math.random() * Math.PI * 2;
    const clusteringNoise = (Math.random() - 0.5) * 0.3; // Small clustering variation
    rotations.push(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      baseRotation + clusteringNoise
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
