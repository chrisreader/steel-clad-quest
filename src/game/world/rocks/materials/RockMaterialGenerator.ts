
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
  private static materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  public static createEnhancedRockMaterial(
    category: RockCategory, 
    rockShape: RockShape, 
    index: number
  ): THREE.MeshStandardMaterial {
    const rockType = ROCK_TYPES[index % ROCK_TYPES.length];
    const baseColor = new THREE.Color(rockType.color);
    
    // Apply noise-driven tint shifts
    const tintShift = this.generateNoiseTint(index);
    baseColor.lerp(tintShift, 0.15);
    
    // Enhanced weathering based on shape and category
    if (rockShape.weatheringLevel > 0.5) {
      const weatheringIntensity = rockShape.weatheringLevel * 0.4;
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, weatheringIntensity);
    }
    
    // Age-based weathering for larger rocks
    if (category === 'large' || category === 'massive') {
      const ageColor = new THREE.Color(0x3A3A2A);
      baseColor.lerp(ageColor, 0.15);
    }
    
    // Position-based moss for bottom rocks
    if (rockShape.type === 'weathered' && Math.random() < 0.6) {
      const mossColor = new THREE.Color(0x2F5F2F);
      baseColor.lerp(mossColor, 0.25);
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

  public static createRoleBasedMaterial(
    category: RockCategory, 
    rockShape: RockShape, 
    index: number, 
    role: ClusterRole
  ): THREE.MeshStandardMaterial {
    const cacheKey = `${category}_${rockShape.type}_${index}_${role}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!.clone();
    }
    
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
    
    this.materialCache.set(cacheKey, material.clone());
    return material;
  }

  /**
   * Apply foundation-specific material effects (darker, more moss)
   */
  private static applyFoundationMaterialEffects(material: THREE.MeshStandardMaterial, rockShape: RockShape): void {
    // Foundation rocks are more weathered (bottom of formation)
    material.roughness = Math.min(1.0, material.roughness + 0.1);
    
    if (Math.random() < 0.7) {
      // Add moisture weathering tint
      const currentColor = material.color;
      const weatheringColor = new THREE.Color(0x2A2A1A);
      currentColor.lerp(weatheringColor, 0.2);
    }
    
    // Add moss if highly weathered
    if (rockShape.weatheringLevel > 0.7 && Math.random() < 0.8) {
      const currentColor = material.color;
      const mossColor = new THREE.Color(0x2F5F2F);
      currentColor.lerp(mossColor, 0.3);
    }
  }

  /**
   * Apply support-specific material effects (moderate weathering)
   */
  private static applySupportMaterialEffects(material: THREE.MeshStandardMaterial, rockShape: RockShape): void {
    // Support rocks have moderate weathering
    if (Math.random() < 0.4) {
      const currentColor = material.color;
      const weatheringColor = new THREE.Color(0x3A3A2A);
      currentColor.lerp(weatheringColor, 0.1);
    }
  }

  /**
   * Apply accent-specific material effects (brighter, less rough)
   */
  private static applyAccentMaterialEffects(material: THREE.MeshStandardMaterial, rockShape: RockShape): void {
    // Accent rocks can be fresher (less weathered)
    material.roughness = Math.max(0.6, material.roughness - 0.1);
    
    // Brighter tint for accent rocks
    const currentColor = material.color;
    const brighterColor = currentColor.clone().multiplyScalar(1.1);
    currentColor.lerp(brighterColor, 0.15);
  }

  /**
   * Generate noise-driven tint variation
   */
  private static generateNoiseTint(index: number): THREE.Color {
    const seed = index * 12345 + 67890;
    const r = ((seed * 9301 + 49297) % 233280) / 233280;
    const g = ((seed * 9301 + 49297 + 12345) % 233280) / 233280;
    const b = ((seed * 9301 + 49297 + 24690) % 233280) / 233280;
    
    // Create subtle color variations
    return new THREE.Color(
      0.8 + r * 0.4,
      0.8 + g * 0.4,
      0.8 + b * 0.4
    );
  }

  /**
   * Apply weathering blending based on material type and weathering level
   */
  public static applyWeatheringBlending(
    material: THREE.MeshStandardMaterial, 
    weatheringLevel: number, 
    materialType: string
  ): void {
    if (weatheringLevel > 0.6) {
      const currentColor = material.color;
      
      switch (materialType) {
        case 'granite':
          const graniteWeathering = new THREE.Color(0x6B6B47);
          currentColor.lerp(graniteWeathering, weatheringLevel * 0.3);
          break;
          
        case 'sandstone':
          const sandstoneWeathering = new THREE.Color(0x7B6D5B);
          currentColor.lerp(sandstoneWeathering, weatheringLevel * 0.4);
          break;
          
        case 'limestone':
          const limestoneWeathering = new THREE.Color(0x909090);
          currentColor.lerp(limestoneWeathering, weatheringLevel * 0.2);
          break;
          
        default:
          const defaultWeathering = new THREE.Color(0x5A5A3A);
          currentColor.lerp(defaultWeathering, weatheringLevel * 0.25);
      }
      
      // Increase roughness with weathering
      material.roughness = Math.min(1.0, material.roughness + weatheringLevel * 0.15);
    }
  }

  /**
   * Clear material cache to prevent memory leaks
   */
  public static clearCache(): void {
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
  }
}
