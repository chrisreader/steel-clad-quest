
import * as THREE from 'three';
import { TextureGenerator } from '../../../utils';
import { RockShape } from '../types/RockTypes';
import { EnhancedRockMaterialSystem, LightingConditions } from './EnhancedRockMaterialSystem';

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
  private static enhancedSystem = new EnhancedRockMaterialSystem();

  public static createEnhancedRockMaterial(
    category: string, 
    rockShape: RockShape, 
    index: number
  ): THREE.MeshStandardMaterial {
    const enhancedMaterial = this.enhancedSystem.createEnhancedRockMaterial(
      category, 
      rockShape, 
      index, 
      'support'
    );
    return enhancedMaterial.material;
  }

  public static createRoleBasedMaterial(
    category: string, 
    rockShape: RockShape, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.MeshStandardMaterial {
    const enhancedMaterial = this.enhancedSystem.createEnhancedRockMaterial(
      category, 
      rockShape, 
      index, 
      role
    );
    return enhancedMaterial.material;
  }

  public static updateLightingConditions(conditions: LightingConditions): void {
    this.enhancedSystem.updateAllMaterials(conditions);
  }

  public static dispose(): void {
    this.enhancedSystem.dispose();
  }
}
