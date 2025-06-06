
import * as THREE from 'three';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { LightingConditions } from '../materials/EnhancedRockMaterialSystem';
import { TIME_PHASES } from '../../../config/DayNightConfig';

export class RockLightingIntegration {
  private scene: THREE.Scene;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 100; // Update every 100ms for smooth transitions

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public updateRockLighting(
    timeOfDay: number,
    sunPosition: THREE.Vector3,
    moonPosition: THREE.Vector3,
    playerPosition?: THREE.Vector3
  ): void {
    const currentTime = Date.now();
    
    // Throttle updates for performance
    if (currentTime - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    
    this.lastUpdateTime = currentTime;
    
    // Calculate lighting conditions
    const conditions = this.calculateLightingConditions(
      timeOfDay,
      sunPosition,
      moonPosition,
      playerPosition
    );
    
    // Update all rock materials
    RockMaterialGenerator.updateLightingConditions(conditions);
  }

  private calculateLightingConditions(
    timeOfDay: number,
    sunPosition: THREE.Vector3,
    moonPosition: THREE.Vector3,
    playerPosition?: THREE.Vector3
  ): LightingConditions {
    // Calculate sun elevation (-1 to 1, where 1 is directly overhead)
    const sunElevation = this.calculateCelestialElevation(sunPosition);
    
    // Calculate moon elevation
    const moonElevation = this.calculateCelestialElevation(moonPosition);
    
    // Calculate atmospheric moisture based on time and weather
    const atmosphericMoisture = this.calculateAtmosphericMoisture(timeOfDay);
    
    // Calculate ambient temperature (affects material properties)
    const ambientTemperature = this.calculateAmbientTemperature(timeOfDay, sunElevation);
    
    return {
      timeOfDay,
      sunElevation,
      moonElevation,
      atmosphericMoisture,
      ambientTemperature
    };
  }

  private calculateCelestialElevation(position: THREE.Vector3): number {
    // Normalize position to get elevation angle
    const distance = position.length();
    if (distance === 0) return 0;
    
    const elevation = position.y / distance;
    return Math.max(-1, Math.min(1, elevation));
  }

  private calculateAtmosphericMoisture(timeOfDay: number): number {
    // High moisture during dawn and dusk
    if ((timeOfDay >= 0.08 && timeOfDay <= 0.3) || (timeOfDay >= 0.7 && timeOfDay <= 0.9)) {
      return 0.8 + Math.sin(timeOfDay * Math.PI * 8) * 0.1; // Small variation
    }
    
    // Moderate moisture during night
    if (timeOfDay >= 0.9 || timeOfDay <= 0.08) {
      return 0.6;
    }
    
    // Low moisture during day with slight variation
    return 0.2 + Math.sin(timeOfDay * Math.PI * 4) * 0.1;
  }

  private calculateAmbientTemperature(timeOfDay: number, sunElevation: number): number {
    // Base temperature varies with time of day
    let baseTemp = 0.5; // Neutral
    
    if (timeOfDay >= 0.25 && timeOfDay <= 0.75) {
      // Day time - warmer
      baseTemp = 0.7 + sunElevation * 0.3;
    } else {
      // Night time - cooler
      baseTemp = 0.3;
    }
    
    return Math.max(0, Math.min(1, baseTemp));
  }

  public getCurrentPhase(timeOfDay: number): string {
    if (timeOfDay >= TIME_PHASES.NIGHT_START && timeOfDay < TIME_PHASES.NIGHT_END) {
      return 'night';
    } else if (timeOfDay >= TIME_PHASES.DAWN_START && timeOfDay < TIME_PHASES.DAWN_END) {
      return 'dawn';
    } else if (timeOfDay >= TIME_PHASES.DAY_START && timeOfDay < TIME_PHASES.DAY_END) {
      return 'day';
    } else if (timeOfDay >= TIME_PHASES.SUNSET_START && timeOfDay < TIME_PHASES.SUNSET_END) {
      return 'sunset';
    } else if (timeOfDay >= TIME_PHASES.CIVIL_TWILIGHT_START && timeOfDay < TIME_PHASES.CIVIL_TWILIGHT_END) {
      return 'civil_twilight';
    } else if (timeOfDay >= TIME_PHASES.NAUTICAL_TWILIGHT_START && timeOfDay < TIME_PHASES.NAUTICAL_TWILIGHT_END) {
      return 'nautical_twilight';
    } else {
      return 'astronomical_twilight';
    }
  }

  public dispose(): void {
    RockMaterialGenerator.dispose();
  }
}
