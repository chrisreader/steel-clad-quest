
import * as THREE from 'three';
import { EnhancedGrassBladeConfig } from './EnhancedGrassGeometry';

export interface EnvironmentalFactors {
  moisture: number; // 0-1
  slope: number; // 0-1 (0 = flat, 1 = steep)
  lightExposure: number; // 0-1
  soilQuality: number; // 0-1
  nearWater: boolean;
  nearTrees: boolean;
  nearRocks: boolean;
  trampled: boolean;
}

export class EnvironmentalGrassDistribution {
  private static readonly MOISTURE_PREFERENCE = {
    meadow: 0.6,
    prairie: 0.4,
    clumping: 0.7,
    fine: 0.5
  };
  
  private static readonly SLOPE_TOLERANCE = {
    meadow: 0.3,
    prairie: 0.6,
    clumping: 0.2,
    fine: 0.4
  };
  
  public static calculateGrassDistribution(
    centerPosition: THREE.Vector3,
    size: number,
    environmentalFactors: EnvironmentalFactors,
    baseSpacing: number
  ): {
    positions: THREE.Vector3[];
    scales: THREE.Vector3[];
    rotations: THREE.Quaternion[];
    species: string[];
  } {
    const positions: THREE.Vector3[] = [];
    const scales: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const species: string[] = [];
    
    const halfSize = size / 2;
    
    // Calculate environmental modifiers
    const densityModifier = this.calculateDensityModifier(environmentalFactors);
    const adjustedSpacing = baseSpacing / densityModifier;
    
    for (let x = -halfSize; x < halfSize; x += adjustedSpacing) {
      for (let z = -halfSize; z < halfSize; z += adjustedSpacing) {
        const localFactors = this.calculateLocalFactors(
          x, z, centerPosition, environmentalFactors
        );
        
        // Skip if conditions are too harsh
        if (localFactors.soilQuality < 0.2 || localFactors.trampled) {
          continue;
        }
        
        // Calculate spawn probability
        const spawnProbability = this.calculateSpawnProbability(localFactors);
        if (Math.random() > spawnProbability) {
          continue;
        }
        
        // Choose species based on environmental conditions
        const chosenSpecies = this.selectSpeciesForConditions(localFactors);
        
        // Calculate position with natural variation
        const pos = new THREE.Vector3(
          centerPosition.x + x + (Math.random() - 0.5) * adjustedSpacing * 0.8,
          centerPosition.y,
          centerPosition.z + z + (Math.random() - 0.5) * adjustedSpacing * 0.8
        );
        
        // Calculate scale based on environmental health
        const healthFactor = (localFactors.moisture + localFactors.soilQuality + localFactors.lightExposure) / 3;
        const scale = new THREE.Vector3(
          0.8 + healthFactor * 0.6,
          0.7 + healthFactor * 0.8,
          0.8 + healthFactor * 0.6
        );
        
        // Random rotation
        const rotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.random() * Math.PI * 2
        );
        
        positions.push(pos);
        scales.push(scale);
        rotations.push(rotation);
        species.push(chosenSpecies);
      }
    }
    
    return { positions, scales, rotations, species };
  }
  
  private static calculateDensityModifier(factors: EnvironmentalFactors): number {
    let modifier = 1.0;
    
    // Moisture effects
    if (factors.moisture > 0.7) modifier *= 1.3; // Lush areas
    else if (factors.moisture < 0.3) modifier *= 0.6; // Dry areas
    
    // Slope effects
    if (factors.slope > 0.5) modifier *= 0.7; // Steep slopes have less grass
    
    // Light exposure
    if (factors.lightExposure < 0.3) modifier *= 0.5; // Shaded areas
    
    // Near features
    if (factors.nearWater) modifier *= 1.2;
    if (factors.nearTrees) modifier *= 0.8; // Less grass under trees
    if (factors.nearRocks) modifier *= 0.9;
    
    return Math.max(0.2, Math.min(2.0, modifier));
  }
  
  private static calculateLocalFactors(
    x: number, 
    z: number, 
    centerPosition: THREE.Vector3,
    baseFactors: EnvironmentalFactors
  ): EnvironmentalFactors {
    // Add local variation using noise-like functions
    const distance = Math.sqrt(x * x + z * z);
    const noiseValue = Math.sin(x * 0.1) * Math.cos(z * 0.1);
    
    return {
      moisture: Math.max(0, Math.min(1, baseFactors.moisture + noiseValue * 0.2)),
      slope: baseFactors.slope + Math.abs(noiseValue) * 0.1,
      lightExposure: Math.max(0, Math.min(1, baseFactors.lightExposure + noiseValue * 0.15)),
      soilQuality: Math.max(0, Math.min(1, baseFactors.soilQuality + noiseValue * 0.1)),
      nearWater: baseFactors.nearWater,
      nearTrees: baseFactors.nearTrees,
      nearRocks: baseFactors.nearRocks,
      trampled: baseFactors.trampled
    };
  }
  
  private static calculateSpawnProbability(factors: EnvironmentalFactors): number {
    let probability = 0.6; // Base probability
    
    // Adjust based on environmental factors
    probability *= (factors.moisture * 0.5 + 0.5); // Moisture influence
    probability *= (factors.soilQuality * 0.6 + 0.4); // Soil quality influence
    probability *= (factors.lightExposure * 0.4 + 0.6); // Light influence
    
    // Slope penalty
    probability *= (1 - factors.slope * 0.5);
    
    // Feature bonuses/penalties
    if (factors.nearWater) probability *= 1.2;
    if (factors.nearTrees) probability *= 0.7;
    if (factors.trampled) probability *= 0.1;
    
    return Math.max(0, Math.min(1, probability));
  }
  
  private static selectSpeciesForConditions(factors: EnvironmentalFactors): string {
    const species = ['meadow', 'prairie', 'clumping', 'fine'];
    const scores: { [key: string]: number } = {};
    
    for (const spec of species) {
      let score = 1.0;
      
      // Moisture preference
      const moisturePref = this.MOISTURE_PREFERENCE[spec as keyof typeof this.MOISTURE_PREFERENCE];
      const moistureDiff = Math.abs(factors.moisture - moisturePref);
      score *= (1 - moistureDiff);
      
      // Slope tolerance
      const slopeTol = this.SLOPE_TOLERANCE[spec as keyof typeof this.SLOPE_TOLERANCE];
      if (factors.slope > slopeTol) {
        score *= (1 - (factors.slope - slopeTol));
      }
      
      // Environmental bonuses
      if (spec === 'meadow' && factors.nearWater) score *= 1.3;
      if (spec === 'prairie' && factors.slope > 0.3) score *= 1.2;
      if (spec === 'clumping' && factors.moisture > 0.6) score *= 1.4;
      if (spec === 'fine' && factors.lightExposure > 0.7) score *= 1.2;
      
      scores[spec] = Math.max(0, score);
    }
    
    // Select species based on weighted random
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    if (totalScore === 0) return 'meadow'; // Fallback
    
    let random = Math.random() * totalScore;
    for (const [spec, score] of Object.entries(scores)) {
      random -= score;
      if (random <= 0) return spec;
    }
    
    return 'meadow'; // Fallback
  }
  
  public static createEnvironmentalFactorsForTerrain(
    position: THREE.Vector3,
    terrainHeight: number,
    nearbyFeatures: {
      hasWater: boolean;
      hasTrees: boolean;
      hasRocks: boolean;
      playerTraffic: number;
    }
  ): EnvironmentalFactors {
    // Calculate slope based on terrain variation (simplified)
    const slope = Math.min(1, Math.abs(terrainHeight) * 0.1);
    
    // Base moisture varies with terrain
    const baseMoisture = 0.5 + (terrainHeight > 0 ? -0.2 : 0.3);
    
    // Light exposure varies with slope and nearby trees
    const lightExposure = nearbyFeatures.hasTrees ? 0.3 : (1 - slope * 0.3);
    
    return {
      moisture: Math.max(0, Math.min(1, baseMoisture + (nearbyFeatures.hasWater ? 0.3 : 0))),
      slope,
      lightExposure,
      soilQuality: 0.6 + Math.random() * 0.3,
      nearWater: nearbyFeatures.hasWater,
      nearTrees: nearbyFeatures.hasTrees,
      nearRocks: nearbyFeatures.hasRocks,
      trampled: nearbyFeatures.playerTraffic > 0.5
    };
  }
}
