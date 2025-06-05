
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';

export class RockMaterialPool {
  private static instance: RockMaterialPool;
  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();
  
  private rockTypes = [
    { name: 'granite', color: 0x8B7355, roughness: 0.9, metalness: 0.1 },
    { name: 'basalt', color: 0x696969, roughness: 0.85, metalness: 0.05 },
    { name: 'limestone', color: 0xA0A0A0, roughness: 0.8, metalness: 0.15 },
    { name: 'sandstone', color: 0x8B4513, roughness: 0.95, metalness: 0.0 },
    { name: 'slate', color: 0x2F4F4F, roughness: 0.9, metalness: 0.2 }
  ];

  public static getInstance(): RockMaterialPool {
    if (!RockMaterialPool.instance) {
      RockMaterialPool.instance = new RockMaterialPool();
    }
    return RockMaterialPool.instance;
  }

  private constructor() {
    this.initializeMaterials();
  }

  private initializeMaterials(): void {
    this.rockTypes.forEach(rockType => {
      const material = new THREE.MeshStandardMaterial({
        color: rockType.color,
        map: TextureGenerator.createStoneTexture(),
        roughness: rockType.roughness,
        metalness: rockType.metalness,
        normalScale: new THREE.Vector2(1.0, 1.0)
      });
      this.materials.set(rockType.name, material);
    });
  }

  public getMaterial(category: string, weatheringLevel: number = 0): THREE.MeshStandardMaterial {
    const rockType = this.rockTypes[Math.abs(category.length) % this.rockTypes.length];
    const baseMaterial = this.materials.get(rockType.name);
    
    if (!baseMaterial) {
      return this.materials.values().next().value;
    }

    // Clone and modify for weathering without creating new base materials
    const material = baseMaterial.clone();
    
    if (weatheringLevel > 0.5) {
      const weatheringColor = new THREE.Color(0x4A4A2A);
      material.color.lerp(weatheringColor, weatheringLevel * 0.3);
      material.roughness = Math.min(1.0, material.roughness + weatheringLevel * 0.1);
    }

    return material;
  }

  public dispose(): void {
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
  }
}
