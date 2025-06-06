
import * as THREE from 'three';
import { ROCK_TYPES, RockType } from './RockMaterialGenerator';
import { RockShape } from '../types/RockTypes';
import { TIME_PHASES } from '../../../config/DayNightConfig';

export interface LightingConditions {
  timeOfDay: number;
  sunElevation: number;
  moonElevation: number;
  atmosphericMoisture: number;
  ambientTemperature: number;
}

export interface EnhancedRockMaterial {
  material: THREE.MeshStandardMaterial;
  baseProperties: {
    roughness: number;
    metalness: number;
    color: THREE.Color;
  };
  update: (conditions: LightingConditions) => void;
  dispose: () => void;
}

export class EnhancedRockMaterialSystem {
  private materials: Map<string, EnhancedRockMaterial> = new Map();
  private uniformsCache: Map<string, any> = new Map();

  public createEnhancedRockMaterial(
    category: string,
    rockShape: RockShape,
    index: number,
    role: 'foundation' | 'support' | 'accent' = 'support'
  ): EnhancedRockMaterial {
    const rockType = ROCK_TYPES[index % ROCK_TYPES.length];
    const materialId = `${category}_${index}_${role}`;
    
    // Check if material already exists
    if (this.materials.has(materialId)) {
      return this.materials.get(materialId)!;
    }

    const baseColor = new THREE.Color(rockType.color);
    
    // Enhanced weathering based on role and shape
    this.applyWeatheringEffects(baseColor, rockShape, category, role);
    
    // Create material with enhanced properties
    const material = new THREE.MeshStandardMaterial({
      color: baseColor.clone(),
      roughness: this.calculateBaseRoughness(rockType, rockShape, role),
      metalness: this.calculateBaseMetalness(rockType, role),
      normalScale: new THREE.Vector2(1.2, 1.2),
      envMapIntensity: 0.3
    });

    // Store base properties for dynamic updates
    const baseProperties = {
      roughness: material.roughness,
      metalness: material.metalness,
      color: baseColor.clone()
    };

    const enhancedMaterial: EnhancedRockMaterial = {
      material,
      baseProperties,
      update: (conditions: LightingConditions) => {
        this.updateMaterialForLighting(material, baseProperties, rockType, conditions, role);
      },
      dispose: () => {
        material.dispose();
        this.materials.delete(materialId);
      }
    };

    this.materials.set(materialId, enhancedMaterial);
    return enhancedMaterial;
  }

  private applyWeatheringEffects(
    color: THREE.Color,
    rockShape: RockShape,
    category: string,
    role: 'foundation' | 'support' | 'accent'
  ): void {
    // Foundation rocks get more moisture weathering
    if (role === 'foundation') {
      const moistureColor = new THREE.Color(0x2A2A1A);
      color.lerp(moistureColor, 0.3);
    }

    // Apply weathering based on shape
    if (rockShape.weatheringLevel > 0.5) {
      const weatheringColor = new THREE.Color(0x4A4A2A);
      color.lerp(weatheringColor, rockShape.weatheringLevel * 0.4);
    }

    // Larger rocks get more age-based weathering
    if (category === 'large' || category === 'massive') {
      const ageColor = new THREE.Color(0x3A3A2A);
      color.lerp(ageColor, 0.2);
    }
  }

  private calculateBaseRoughness(
    rockType: RockType,
    rockShape: RockShape,
    role: 'foundation' | 'support' | 'accent'
  ): number {
    let roughness = rockType.roughness;
    
    // Add weathering-based roughness
    roughness += rockShape.weatheringLevel * 0.15;
    
    // Role-based adjustments
    switch (role) {
      case 'foundation':
        roughness += 0.1; // More weathered
        break;
      case 'accent':
        roughness -= 0.05; // Less weathered
        break;
    }
    
    return Math.max(0.6, Math.min(1.0, roughness));
  }

  private calculateBaseMetalness(
    rockType: RockType,
    role: 'foundation' | 'support' | 'accent'
  ): number {
    let metalness = rockType.metalness;
    
    // Foundation rocks are less metallic due to weathering
    if (role === 'foundation') {
      metalness *= 0.7;
    }
    
    return Math.max(0.0, Math.min(0.3, metalness));
  }

  private updateMaterialForLighting(
    material: THREE.MeshStandardMaterial,
    baseProperties: any,
    rockType: RockType,
    conditions: LightingConditions,
    role: 'foundation' | 'support' | 'accent'
  ): void {
    // Calculate atmospheric moisture based on time of day
    const atmosphericMoisture = this.calculateAtmosphericMoisture(conditions.timeOfDay);
    
    // Update color based on lighting conditions
    this.updateColorForLighting(material, baseProperties, conditions, atmosphericMoisture, rockType);
    
    // Update surface properties
    this.updateSurfaceProperties(material, baseProperties, conditions, atmosphericMoisture, role);
    
    // Update environmental reflectance
    this.updateEnvironmentalReflectance(material, conditions);
  }

  private calculateAtmosphericMoisture(timeOfDay: number): number {
    // Higher moisture during dawn (0.12-0.25) and dusk (0.75-0.88)
    if ((timeOfDay >= 0.08 && timeOfDay <= 0.3) || (timeOfDay >= 0.7 && timeOfDay <= 0.9)) {
      return 0.8;
    }
    
    // Moderate moisture during night
    if (timeOfDay >= 0.9 || timeOfDay <= 0.08) {
      return 0.6;
    }
    
    // Low moisture during day
    return 0.2;
  }

  private updateColorForLighting(
    material: THREE.MeshStandardMaterial,
    baseProperties: any,
    conditions: LightingConditions,
    atmosphericMoisture: number,
    rockType: RockType
  ): void {
    const newColor = baseProperties.color.clone();
    
    // Apply atmospheric moisture darkening
    if (atmosphericMoisture > 0.5) {
      const darkeningFactor = (atmosphericMoisture - 0.5) * 0.4;
      newColor.multiplyScalar(1.0 - darkeningFactor);
    }
    
    // Apply sun angle color temperature effects
    if (conditions.sunElevation > 0) {
      const colorTemperature = this.calculateColorTemperature(conditions.timeOfDay);
      newColor.lerp(colorTemperature, 0.15);
    }
    
    // Apply moon lighting (cooler tones)
    if (conditions.moonElevation > 0.3 && conditions.sunElevation <= 0) {
      const moonTint = new THREE.Color(0x4A5D7A);
      newColor.lerp(moonTint, conditions.moonElevation * 0.2);
    }
    
    material.color.copy(newColor);
  }

  private calculateColorTemperature(timeOfDay: number): THREE.Color {
    // Warm colors during sunrise/sunset, neutral during day
    if (timeOfDay >= 0.12 && timeOfDay <= 0.3) {
      // Dawn - warm orange
      return new THREE.Color(0xFFB366);
    } else if (timeOfDay >= 0.7 && timeOfDay <= 0.85) {
      // Sunset - warm orange/red
      return new THREE.Color(0xFF8844);
    } else if (timeOfDay >= 0.3 && timeOfDay <= 0.7) {
      // Day - neutral white
      return new THREE.Color(0xFFFFFF);
    } else {
      // Night - cool blue
      return new THREE.Color(0x6495ED);
    }
  }

  private updateSurfaceProperties(
    material: THREE.MeshStandardMaterial,
    baseProperties: any,
    conditions: LightingConditions,
    atmosphericMoisture: number,
    role: 'foundation' | 'support' | 'accent'
  ): void {
    // Wet rocks are smoother and more reflective
    const moistureEffect = atmosphericMoisture > 0.5 ? (atmosphericMoisture - 0.5) * 2 : 0;
    
    material.roughness = baseProperties.roughness - (moistureEffect * 0.3);
    material.roughness = Math.max(0.4, Math.min(1.0, material.roughness));
    
    // Wet rocks have slight metallic appearance
    material.metalness = baseProperties.metalness + (moistureEffect * 0.1);
    material.metalness = Math.max(0.0, Math.min(0.3, material.metalness));
    
    // Environmental reflections are stronger when wet
    material.envMapIntensity = 0.3 + (moistureEffect * 0.4);
  }

  private updateEnvironmentalReflectance(
    material: THREE.MeshStandardMaterial,
    conditions: LightingConditions
  ): void {
    // Adjust material properties based on overall lighting intensity
    const lightingIntensity = Math.max(conditions.sunElevation, conditions.moonElevation * 0.3);
    
    // Subtle adjustments to enhance realism
    if (lightingIntensity > 0.5) {
      material.normalScale.setScalar(1.0 + lightingIntensity * 0.2);
    } else {
      material.normalScale.setScalar(0.8 + lightingIntensity * 0.4);
    }
  }

  public updateAllMaterials(conditions: LightingConditions): void {
    for (const enhancedMaterial of this.materials.values()) {
      enhancedMaterial.update(conditions);
    }
  }

  public dispose(): void {
    for (const enhancedMaterial of this.materials.values()) {
      enhancedMaterial.dispose();
    }
    this.materials.clear();
    this.uniformsCache.clear();
  }
}
