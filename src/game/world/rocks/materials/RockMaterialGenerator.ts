
import * as THREE from 'three';
import { TextureGenerator } from '../../../utils';
import { RockShape, ClusterRole, RockCategory } from '../types/RockTypes';

export interface RockType {
  color: number;
  roughness: number;
  metalness: number;
  name: string;
}

export const ROCK_TYPES: RockType[] = [
  { color: 0x8B7355, roughness: 0.9, metalness: 0.1, name: 'granite' },
  { color: 0x696969, roughness: 0.85, metalness: 0.05, name: 'basalt' },
  { color: 0xA0A0A0, roughness: 0.8, metalness: 0.15, name: 'limestone' },
  { color: 0x8B7D6B, roughness: 0.95, metalness: 0.0, name: 'sandstone' },
  { color: 0x556B2F, roughness: 0.9, metalness: 0.05, name: 'moss_covered' },
  { color: 0x2F4F4F, roughness: 0.9, metalness: 0.2, name: 'slate' },
  { color: 0x8B4513, roughness: 0.85, metalness: 0.0, name: 'ironstone' }
];

export class RockMaterialGenerator {
  /**
   * Create material with complete blending system
   */
  public static createEnhancedRockMaterial(
    category: RockCategory, 
    rockShape: RockShape, 
    index: number
  ): THREE.MeshStandardMaterial {
    const rockType = ROCK_TYPES[index % ROCK_TYPES.length];
    const baseColor = new THREE.Color(rockType.color);
    
    // Apply noise-driven tint shifts for variation
    this.applyNoiseBasedTinting(baseColor, index);
    
    // Enhanced weathering based on shape and category
    if (rockShape.weatheringLevel > 0.5) {
      this.applyWeatheringEffects(baseColor, rockShape.weatheringLevel);
    }
    
    // Age-based weathering for larger rocks
    if (category === 'large' || category === 'massive') {
      this.applyAgeWeathering(baseColor);
    }
    
    // Position-based moss for bottom rocks (simulated)
    if (rockShape.type === 'weathered' && Math.random() < 0.6) {
      this.applyMossEffects(baseColor);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness + (rockShape.weatheringLevel * 0.1),
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(1.0, 1.0)
    });
    
    return material;
  }

  /**
   * Create role-based material with proper foundation/support/accent distribution
   */
  public static createRoleBasedMaterial(
    category: RockCategory, 
    rockShape: RockShape, 
    index: number, 
    role: ClusterRole
  ): THREE.MeshStandardMaterial {
    const material = this.createEnhancedRockMaterial(category, rockShape, index);
    
    // Role-specific material adjustments
    switch (role) {
      case 'foundation':
        this.applyFoundationMaterialEffects(material, rockShape);
        break;
        
      case 'support':
        this.applySupportMaterialEffects(material, rockShape);
        break;
        
      case 'accent':
        this.applyAccentMaterialEffects(material, rockShape);
        break;
    }
    
    return material;
  }

  /**
   * Apply noise-based tinting for natural variation
   */
  private static applyNoiseBasedTinting(color: THREE.Color, index: number): void {
    const noiseR = Math.sin(index * 2.1) * 0.1;
    const noiseG = Math.cos(index * 1.7) * 0.1;
    const noiseB = Math.sin(index * 2.3) * 0.1;
    
    color.r = Math.max(0, Math.min(1, color.r + noiseR));
    color.g = Math.max(0, Math.min(1, color.g + noiseG));
    color.b = Math.max(0, Math.min(1, color.b + noiseB));
  }

  /**
   * Apply weathering effects
   */
  private static applyWeatheringEffects(color: THREE.Color, weatheringLevel: number): void {
    const weatheringIntensity = weatheringLevel * 0.4;
    const weatheringColor = new THREE.Color(0x4A4A2A);
    color.lerp(weatheringColor, weatheringIntensity);
  }

  /**
   * Apply age-based weathering
   */
  private static applyAgeWeathering(color: THREE.Color): void {
    const ageColor = new THREE.Color(0x3A3A2A);
    color.lerp(ageColor, 0.15);
  }

  /**
   * Apply moss effects
   */
  private static applyMossEffects(color: THREE.Color): void {
    const mossColor = new THREE.Color(0x2F5F2F);
    color.lerp(mossColor, 0.25);
  }

  /**
   * Foundation rocks: darker tints, more moss
   */
  private static applyFoundationMaterialEffects(
    material: THREE.MeshStandardMaterial,
    rockShape: RockShape
  ): void {
    material.roughness = Math.min(1.0, material.roughness + 0.1);
    
    if (Math.random() < 0.7) {
      // Add moisture weathering tint
      const currentColor = material.color;
      const weatheringColor = new THREE.Color(0x2A2A1A);
      currentColor.lerp(weatheringColor, 0.2);
    }
    
    // Add moss if highly weathered
    if (rockShape.weatheringLevel > 0.7 && Math.random() < 0.8) {
      const mossColor = new THREE.Color(0x1F4F1F);
      material.color.lerp(mossColor, 0.3);
    }
  }

  /**
   * Support rocks: moderate weathering
   */
  private static applySupportMaterialEffects(
    material: THREE.MeshStandardMaterial,
    rockShape: RockShape
  ): void {
    if (Math.random() < 0.4) {
      const currentColor = material.color;
      const weatheringColor = new THREE.Color(0x3A3A2A);
      currentColor.lerp(weatheringColor, 0.1);
    }
  }

  /**
   * Accent rocks: brighter tint, less roughness
   */
  private static applyAccentMaterialEffects(
    material: THREE.MeshStandardMaterial,
    rockShape: RockShape
  ): void {
    material.roughness = Math.max(0.6, material.roughness - 0.1);
    
    // Brighten color slightly
    material.color.multiplyScalar(1.1);
    material.color.r = Math.min(1, material.color.r);
    material.color.g = Math.min(1, material.color.g);
    material.color.b = Math.min(1, material.color.b);
  }
}
