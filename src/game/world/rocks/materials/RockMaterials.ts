
import * as THREE from 'three';
import { TextureGenerator } from '../../../utils';

export class RockMaterials {
  private static materials: Map<string, THREE.Material> = new Map();
  
  public static getRockMaterial(
    type: 'granite' | 'sandstone' | 'limestone' | 'basalt' | 'weathered',
    weatheringLevel: number = 0
  ): THREE.Material {
    const key = `${type}_${Math.floor(weatheringLevel * 10)}`;
    
    if (this.materials.has(key)) {
      return this.materials.get(key)!.clone();
    }
    
    const material = this.createRockMaterial(type, weatheringLevel);
    this.materials.set(key, material);
    return material.clone();
  }
  
  private static createRockMaterial(
    type: 'granite' | 'sandstone' | 'limestone' | 'basalt' | 'weathered',
    weatheringLevel: number
  ): THREE.Material {
    const baseColors = {
      granite: new THREE.Color(0x8B7355),
      sandstone: new THREE.Color(0xC4A484),
      limestone: new THREE.Color(0xE6D7C3),
      basalt: new THREE.Color(0x4A4A4A),
      weathered: new THREE.Color(0x9B8B7A)
    };
    
    const baseColor = baseColors[type];
    
    // Adjust color based on weathering
    const weatheredColor = baseColor.clone();
    weatheredColor.lerp(new THREE.Color(0x888888), weatheringLevel * 0.3);
    
    return new THREE.MeshStandardMaterial({
      color: weatheredColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: 0.8 + (weatheringLevel * 0.2),
      metalness: 0.05,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });
  }
  
  public static dispose(): void {
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
  }
}
