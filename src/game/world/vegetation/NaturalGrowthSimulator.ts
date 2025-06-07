
import * as THREE from 'three';
import { BushSpeciesConfig } from './BushSpecies';

export interface GrowthEnvironment {
  lightDirection: THREE.Vector3;
  windDirection: THREE.Vector3;
  soilQuality: number; // 0-1
  moisture: number; // 0-1
  nearbyObstacles: THREE.Vector3[]; // Positions of nearby obstacles
  elevation: number;
  slope: number;
}

export interface GrowthModifiers {
  leanAngle: number;
  leanDirection: THREE.Vector3;
  sizeMultiplier: number;
  heightMultiplier: number;
  asymmetryFactor: number;
  branchingIntensity: number;
  leafDensityModifier: number;
}

export class NaturalGrowthSimulator {
  /**
   * Simulates natural growth patterns based on environmental factors
   */
  static simulateGrowth(
    species: BushSpeciesConfig,
    position: THREE.Vector3,
    environment: GrowthEnvironment
  ): GrowthModifiers {
    const modifiers: GrowthModifiers = {
      leanAngle: 0,
      leanDirection: new THREE.Vector3(0, 1, 0),
      sizeMultiplier: 1,
      heightMultiplier: 1,
      asymmetryFactor: species.type === 'dense_round' ? 0.2 : 0.4,
      branchingIntensity: 1,
      leafDensityModifier: 1
    };

    if (!species.environmentalAdaptation) {
      return this.applyBasicVariation(modifiers);
    }

    // Light seeking behavior
    this.applyLightSeeking(modifiers, environment.lightDirection);
    
    // Wind shaping
    this.applyWindShaping(modifiers, environment.windDirection, species);
    
    // Soil quality effects
    this.applySoilEffects(modifiers, environment.soilQuality, environment.moisture);
    
    // Obstacle avoidance
    this.applyObstacleAvoidance(modifiers, position, environment.nearbyObstacles);
    
    // Elevation and slope effects
    this.applyTerrainEffects(modifiers, environment.elevation, environment.slope);
    
    return modifiers;
  }

  private static applyLightSeeking(modifiers: GrowthModifiers, lightDirection: THREE.Vector3): void {
    // Bushes lean slightly toward light source
    const leanIntensity = 0.1 + Math.random() * 0.1; // 0.1-0.2 radians
    
    modifiers.leanAngle = leanIntensity;
    modifiers.leanDirection = lightDirection.clone().normalize();
    
    // More branching on the light side
    modifiers.branchingIntensity *= 1.0 + (Math.random() * 0.3);
    
    // Denser foliage toward light
    modifiers.leafDensityModifier *= 1.0 + (Math.random() * 0.2);
  }

  private static applyWindShaping(
    modifiers: GrowthModifiers, 
    windDirection: THREE.Vector3,
    species: BushSpeciesConfig
  ): void {
    const windIntensity = 0.5 + Math.random() * 0.5; // 0.5-1.0
    
    // Wind-resistant species lean less
    const resistanceFactor = species.type === 'tall_upright' ? 0.5 : 1.0;
    
    // Lean away from prevailing wind
    const windLean = windDirection.clone().multiplyScalar(-windIntensity * resistanceFactor * 0.15);
    modifiers.leanDirection.add(windLean);
    modifiers.leanAngle += windIntensity * resistanceFactor * 0.1;
    
    // Wind reduces height but increases spreading
    if (species.growthPattern === 'spreading' || species.growthPattern === 'cascading') {
      modifiers.sizeMultiplier *= 1.0 + windIntensity * 0.2;
      modifiers.heightMultiplier *= 1.0 - windIntensity * 0.1;
    }
    
    // Increased asymmetry from wind
    modifiers.asymmetryFactor += windIntensity * 0.2;
  }

  private static applySoilEffects(
    modifiers: GrowthModifiers, 
    soilQuality: number, 
    moisture: number
  ): void {
    // Poor soil = smaller, sparser bushes
    modifiers.sizeMultiplier *= 0.6 + soilQuality * 0.4; // 0.6-1.0
    modifiers.heightMultiplier *= 0.7 + soilQuality * 0.3; // 0.7-1.0
    
    // Moisture affects leaf density
    modifiers.leafDensityModifier *= 0.7 + moisture * 0.3; // 0.7-1.0
    
    // Very dry conditions create more branching (seeking water)
    if (moisture < 0.3) {
      modifiers.branchingIntensity *= 1.3;
      modifiers.asymmetryFactor += 0.2;
    }
  }

  private static applyObstacleAvoidance(
    modifiers: GrowthModifiers,
    position: THREE.Vector3,
    obstacles: THREE.Vector3[]
  ): void {
    const avoidanceRadius = 2.0;
    const avoidanceVector = new THREE.Vector3();
    
    obstacles.forEach(obstacle => {
      const distance = position.distanceTo(obstacle);
      if (distance < avoidanceRadius) {
        const avoid = position.clone().sub(obstacle).normalize();
        const strength = (avoidanceRadius - distance) / avoidanceRadius;
        avoidanceVector.add(avoid.multiplyScalar(strength));
      }
    });
    
    if (avoidanceVector.length() > 0) {
      // Grow away from obstacles
      modifiers.leanDirection.add(avoidanceVector.normalize().multiplyScalar(0.3));
      modifiers.asymmetryFactor += 0.3;
      
      // Reduced size due to competition
      modifiers.sizeMultiplier *= 0.8;
    }
  }

  private static applyTerrainEffects(
    modifiers: GrowthModifiers,
    elevation: number,
    slope: number
  ): void {
    // Higher elevation = smaller, hardier bushes
    const elevationFactor = Math.max(0.0, 1.0 - elevation / 100.0); // Assuming max elevation 100
    modifiers.sizeMultiplier *= 0.7 + elevationFactor * 0.3;
    modifiers.heightMultiplier *= 0.8 + elevationFactor * 0.2;
    
    // Steep slopes create asymmetric growth
    if (slope > 0.3) { // 30+ degree slope
      modifiers.asymmetryFactor += slope * 0.5;
      modifiers.leanAngle += slope * 0.2;
      
      // Lean perpendicular to slope for stability
      const slopeDirection = new THREE.Vector3(0, -slope, 1).normalize();
      modifiers.leanDirection.add(slopeDirection.multiplyScalar(0.5));
    }
  }

  private static applyBasicVariation(modifiers: GrowthModifiers): GrowthModifiers {
    // Even non-adaptive species have some natural variation
    modifiers.sizeMultiplier *= 0.9 + Math.random() * 0.2; // 0.9-1.1
    modifiers.heightMultiplier *= 0.9 + Math.random() * 0.2; // 0.9-1.1
    modifiers.asymmetryFactor += Math.random() * 0.1;
    modifiers.leanAngle = (Math.random() - 0.5) * 0.1; // Small random lean
    modifiers.leanDirection = new THREE.Vector3(
      Math.random() - 0.5,
      1,
      Math.random() - 0.5
    ).normalize();
    
    return modifiers;
  }

  /**
   * Generates realistic environment data for a position
   */
  static generateEnvironment(position: THREE.Vector3): GrowthEnvironment {
    return {
      lightDirection: new THREE.Vector3(0.3, 1, 0.2).normalize(),
      windDirection: new THREE.Vector3(1, 0, 0.3).normalize(),
      soilQuality: 0.6 + Math.random() * 0.4,
      moisture: 0.5 + Math.random() * 0.5,
      nearbyObstacles: [], // Would be populated by terrain system
      elevation: position.y,
      slope: Math.random() * 0.2 // 0-20% grade
    };
  }
}
