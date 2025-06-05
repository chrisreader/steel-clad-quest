
import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

export class GroundMaterialUtils {
  /**
   * Creates a standard grass material with realistic textures
   */
  static createGrassMaterial(
    baseColor: number,
    ringIndex: number = 0,
    options: {
      roughness?: number;
      metalness?: number;
      textureScale?: number;
    } = {}
  ): THREE.MeshStandardMaterial {
    const {
      roughness = 0.8,
      metalness = 0.1,
      textureScale = 4
    } = options;

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness,
      metalness
    });

    // Apply realistic grass texture
    const grassTexture = TextureGenerator.createRealisticGrassTexture(baseColor, ringIndex);
    grassTexture.repeat.set(textureScale, textureScale);
    material.map = grassTexture;

    return material;
  }

  /**
   * Creates a blended material for smooth transitions between rings
   */
  static createBlendedGrassMaterial(
    color1: number,
    color2: number,
    blendFactor: number,
    ringIndex: number = 0
  ): THREE.MeshStandardMaterial {
    // Blend the colors
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * blendFactor);
    const g = Math.round(g1 + (g2 - g1) * blendFactor);
    const b = Math.round(b1 + (b2 - b1) * blendFactor);
    
    const blendedColor = (r << 16) | (g << 8) | b;

    return this.createGrassMaterial(blendedColor, ringIndex, {
      roughness: 0.8,
      metalness: 0.1,
      textureScale: 4
    });
  }

  /**
   * Creates materials optimized for different terrain types
   */
  static createTerrainMaterial(
    terrainType: 'grass' | 'dirt' | 'stone',
    baseColor: number,
    ringIndex: number = 0
  ): THREE.MeshStandardMaterial {
    switch (terrainType) {
      case 'grass':
        return this.createGrassMaterial(baseColor, ringIndex);
      
      case 'dirt':
        const material = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.9,
          metalness: 0.0
        });
        // Could add dirt texture here in the future
        return material;
      
      case 'stone':
        const stoneMaterial = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.7,
          metalness: 0.2
        });
        const stoneTexture = TextureGenerator.createStoneTexture(baseColor);
        stoneMaterial.map = stoneTexture;
        return stoneMaterial;
      
      default:
        return this.createGrassMaterial(baseColor, ringIndex);
    }
  }
}
