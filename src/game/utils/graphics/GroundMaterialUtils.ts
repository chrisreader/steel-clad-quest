
import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

export class GroundMaterialUtils {
  /**
   * Creates a standard grass material with realistic textures - FIXED VERSION
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
      roughness = 0.9, // Increased for more realistic grass
      metalness = 0.0, // Grass should not be metallic
      textureScale = 3 // Reduced from 4 for better visual quality
    } = options;

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness,
      metalness
    });

    // Apply realistic grass texture with proper filtering
    const grassTexture = TextureGenerator.createRealisticGrassTexture(baseColor, ringIndex);
    grassTexture.repeat.set(textureScale, textureScale);
    
    // Improved texture filtering to prevent glitching
    grassTexture.magFilter = THREE.LinearFilter;
    grassTexture.minFilter = THREE.LinearMipmapLinearFilter;
    grassTexture.anisotropy = 4; // Better quality at angles
    
    material.map = grassTexture;

    console.log(`🌱 Created grass material for ring ${ringIndex} with color 0x${baseColor.toString(16)}`);

    return material;
  }

  /**
   * Creates a blended material for smooth transitions between rings - ENHANCED VERSION
   */
  static createBlendedGrassMaterial(
    color1: number,
    color2: number,
    blendFactor: number,
    ringIndex: number = 0
  ): THREE.MeshStandardMaterial {
    // Improved color blending using proper color space
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    // Use gamma-correct blending for more natural results
    const gamma = 2.2;
    const r1Linear = Math.pow(r1 / 255, gamma);
    const g1Linear = Math.pow(g1 / 255, gamma);
    const b1Linear = Math.pow(b1 / 255, gamma);
    
    const r2Linear = Math.pow(r2 / 255, gamma);
    const g2Linear = Math.pow(g2 / 255, gamma);
    const b2Linear = Math.pow(b2 / 255, gamma);
    
    const rBlended = Math.pow(r1Linear + (r2Linear - r1Linear) * blendFactor, 1/gamma);
    const gBlended = Math.pow(g1Linear + (g2Linear - g1Linear) * blendFactor, 1/gamma);
    const bBlended = Math.pow(b1Linear + (b2Linear - b1Linear) * blendFactor, 1/gamma);
    
    const r = Math.round(rBlended * 255);
    const g = Math.round(gBlended * 255);
    const b = Math.round(bBlended * 255);
    
    const blendedColor = (r << 16) | (g << 8) | b;

    console.log(`🌈 Creating blended material: 0x${color1.toString(16)} → 0x${color2.toString(16)} (factor: ${blendFactor.toFixed(2)}) = 0x${blendedColor.toString(16)}`);

    return this.createGrassMaterial(blendedColor, ringIndex, {
      roughness: 0.9,
      metalness: 0.0,
      textureScale: 3
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
          roughness: 0.95,
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
        stoneTexture.magFilter = THREE.LinearFilter;
        stoneTexture.minFilter = THREE.LinearMipmapLinearFilter;
        stoneMaterial.map = stoneTexture;
        return stoneMaterial;
      
      default:
        return this.createGrassMaterial(baseColor, ringIndex);
    }
  }
}
