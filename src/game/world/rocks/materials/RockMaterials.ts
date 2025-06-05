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
    
    // Enhanced color variation based on weathering and type
    const weatheredColor = baseColor.clone();
    
    // Different weathering effects per rock type
    switch(type) {
      case 'granite':
        // Granite weathers to lighter, more brownish tones
        weatheredColor.lerp(new THREE.Color(0xA0926B), weatheringLevel * 0.4);
        break;
      case 'sandstone':
        // Sandstone can weather to redder or grayer tones
        weatheredColor.lerp(new THREE.Color(0xB85450), weatheringLevel * 0.3);
        break;
      case 'limestone':
        // Limestone weathers to darker, more gray tones
        weatheredColor.lerp(new THREE.Color(0xC0B5A0), weatheringLevel * 0.5);
        break;
      case 'basalt':
        // Basalt weathers to brownish-black
        weatheredColor.lerp(new THREE.Color(0x3D3D2F), weatheringLevel * 0.3);
        break;
      case 'weathered':
        // Already weathered, just add more variation
        weatheredColor.lerp(new THREE.Color(0x8A7A6A), weatheringLevel * 0.2);
        break;
    }
    
    // Create realistic material with proper surface properties
    const material = new THREE.MeshStandardMaterial({
      color: weatheredColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: 0.7 + (weatheringLevel * 0.3), // Weathered rocks are rougher
      metalness: type === 'basalt' ? 0.1 : 0.02, // Basalt slightly more metallic
      normalScale: new THREE.Vector2(
        0.3 + weatheringLevel * 0.4, // More normal detail with weathering
        0.3 + weatheringLevel * 0.4
      ),
      
      // Add ambient occlusion and environment mapping for realism
      envMapIntensity: 0.2
    });
    
    return material;
  }
  
  public static dispose(): void {
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
  }
}
