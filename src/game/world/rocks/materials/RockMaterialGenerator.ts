
import * as THREE from 'three';
import { TextureGenerator } from '../../../utils';
import { RockShape } from '../config/RockShapeConfig';

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
  public static createEnhancedRockMaterial(
    category: string, 
    rockShape: RockShape, 
    index: number
  ): THREE.MeshStandardMaterial {
    const rockType = ROCK_TYPES[index % ROCK_TYPES.length];
    const baseColor = new THREE.Color(rockType.color);
    
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
    
    // Position-based moss for bottom rocks (simulated)
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
    category: string, 
    rockShape: RockShape, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.MeshStandardMaterial {
    const material = this.createEnhancedRockMaterial(category, rockShape, index);
    
    // Role-specific weathering adjustments
    switch (role) {
      case 'foundation':
        // Foundation rocks are more weathered (bottom of formation)
        material.roughness = Math.min(1.0, material.roughness + 0.1);
        if (Math.random() < 0.7) {
          // Add moisture weathering tint
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x2A2A1A);
          currentColor.lerp(weatheringColor, 0.2);
        }
        break;
        
      case 'support':
        // Support rocks have moderate weathering
        if (Math.random() < 0.4) {
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x3A3A2A);
          currentColor.lerp(weatheringColor, 0.1);
        }
        break;
        
      case 'accent':
        // Accent rocks can be fresher (less weathered)
        material.roughness = Math.max(0.6, material.roughness - 0.1);
        break;
    }
    
    return material;
  }
}
