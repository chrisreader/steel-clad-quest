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
  
  /**
   * NEW: Create organic environmental factors using noise instead of geometric patterns
   */
  public static createOrganicEnvironmentalFactors(
    position: THREE.Vector3,
    height: number
  ): EnvironmentalFactors {
    const moisture = MathUtils.clamp(0.5 + height * 0.1 - position.y * 0.05, 0.2, 0.8);
    const slope = MathUtils.clamp(Math.abs(Math.sin(position.x * 0.1) * Math.cos(position.z * 0.1)), 0, 0.6);
    const lightExposure = MathUtils.clamp(0.7 - height * 0.05 + position.y * 0.03, 0.3, 0.9);
    
    // Use organic noise for environmental features instead of geometric patterns
    const hasWater = GradientDensity.generateOrganicEnvironmentalNoise(position, 'water') > 0.5;
    const hasTrees = GradientDensity.generateOrganicEnvironmentalNoise(position, 'trees') > 0.5;
    const hasRocks = GradientDensity.generateOrganicEnvironmentalNoise(position, 'rocks') > 0.5;
    
    return {
      moisture: moisture,
      slope: slope,
      lightExposure: lightExposure,
      terrainDetails: {
        hasWater: hasWater,
        hasTrees: hasTrees,
        hasRocks: hasRocks,
        playerTraffic: 0
      }
    };
  }
  
  /**
   * Enhanced spawn probability with cross-region blending support
   */
  private static calculateSpawnProbability(
    position: THREE.Vector3, 
    environmentalFactors: EnvironmentalFactors,
    regionBounds: RegionBounds,
    lodDensityMultiplier: number = 1.0,
    neighboringRegions: Array<{ center: THREE.Vector3; size: number }> = []
  ): number {
    const { moisture, slope, lightExposure, terrainDetails } = environmentalFactors;
    
    // Start with noise-based base probability for organic variation
    const noiseDensity = GradientDensity.generateNoiseDensity(position);
    let spawnProbability = 0.7 + noiseDensity * 0.25; // Increased base probability
    
    // Apply environmental modifiers as gradients
    spawnProbability += moisture * 0.25;
    spawnProbability -= slope * 0.12;
    spawnProbability += lightExposure * 0.18;
    
    // Apply environmental density (graduated penalties)
    const environmentalDensity = GradientDensity.calculateEnvironmentalDensity(position, terrainDetails);
    spawnProbability *= environmentalDensity;
    
    // Apply edge falloff for smooth region blending
    const edgeFalloff = GradientDensity.calculateEdgeFalloff(position, regionBounds.center, regionBounds.size);
    spawnProbability *= edgeFalloff;
    
    // NEW: Apply cross-region blending for seamless coverage
    const crossRegionBlending = GradientDensity.calculateCrossRegionBlending(
      position, regionBounds.center, regionBounds.size, neighboringRegions
    );
    spawnProbability *= crossRegionBlending;
    
    // Apply LOD density scaling
    spawnProbability *= lodDensityMultiplier;
    
    return MathUtils.clamp(spawnProbability, 0, 0.98);
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
   * Enhanced organic grass distribution with cross-region blending
   */
  public static calculateGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    baseSpacing: number,
    minimumCoverage: number = 0.35, // Increased minimum coverage
    lodDensityMultiplier: number = 1.0,
    edgeBlendDistance: number = 25, // Increased blend distance
    neighboringRegions: Array<{ center: THREE.Vector3; size: number }> = []
  ) {
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];
    
    // Create expanded region bounds for better edge blending
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
    
    // Calculate target density with improved minimum coverage
    const targetDensity = Math.max(minimumCoverage, 1.0 / (baseSpacing * baseSpacing)) * lodDensityMultiplier;
    
    // Generate organic sampling points using Poisson Disk Sampling
    const bounds2D = {
      min: new THREE.Vector2(regionBounds.min.x, regionBounds.min.z),
      max: new THREE.Vector2(regionBounds.max.x, regionBounds.max.z)
    };
    
    // Use tighter spacing for better coverage
    const organicPoints = PoissonDiskSampling.generatePoissonPoints(bounds2D, baseSpacing * 0.7);
    
    // Process each organic point with enhanced gradient probability
    for (const point2D of organicPoints) {
      const worldPos = new THREE.Vector3(point2D.x, 0, point2D.y);
      
      // Calculate spawn probability with cross-region blending
      const spawnProbability = this.calculateSpawnProbability(
        worldPos,
        environmentalFactors,
        regionBounds,
        lodDensityMultiplier,
        neighboringRegions
      );
      
      // Use probability-based spawning with improved threshold
      if (Math.random() < spawnProbability) {
        this.addGrassBlade(positions, scales, rotations, species, worldPos, environmentalFactors);
      }
    }
    
    // Enhanced secondary coverage with better distribution
    const currentCoverage = positions.length / organicPoints.length;
    if (currentCoverage < minimumCoverage && lodDensityMultiplier > 0.2) {
      const additionalPoints = PoissonDiskSampling.generateBlueNoisePoints(
        bounds2D,
        (minimumCoverage - currentCoverage) * targetDensity * 1.2, // Increased multiplier
        0.85 // Slightly reduced jitter for better coverage
      );
      
      for (const additionalPoint of additionalPoints) {
        const worldPos = new THREE.Vector3(additionalPoint.x, 0, additionalPoint.y);
        
        // Apply enhanced probability for secondary coverage
        const secondaryProbability = this.calculateSpawnProbability(
          worldPos, environmentalFactors, regionBounds, lodDensityMultiplier, neighboringRegions
        ) * 0.75; // Increased from 0.6 to 0.75
        
        if (Math.random() < secondaryProbability) {
          this.addGrassBlade(positions, scales, rotations, species, worldPos, environmentalFactors);
        }
      }
      
      console.log(`🌱 Enhanced seamless coverage: added ${additionalPoints.length} secondary samples to reach ${minimumCoverage * 100}% coverage`);
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
