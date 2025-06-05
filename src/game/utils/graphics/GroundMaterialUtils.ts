
import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

export class GroundMaterialUtils {
  /**
   * Creates a realistic grass material with proper scaling and properties
   */
  static createRealisticGrassMaterial(baseColor: number = 0x4A7C59): THREE.MeshLambertMaterial {
    const grassTexture = TextureGenerator.createRealisticGrassTexture(baseColor);
    
    // Set consistent texture scaling
    grassTexture.repeat.set(8, 8);
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    
    const material = new THREE.MeshLambertMaterial({
      map: grassTexture,
      color: baseColor
    });
    
    return material;
  }
  
  /**
   * Creates a blended grass material for transition zones
   */
  static createBlendedGrassMaterial(
    color1: number,
    color2: number,
    blendFactor: number = 0.5
  ): THREE.MeshLambertMaterial {
    const blendedTexture = TextureGenerator.createBlendedGrassTexture(color1, color2, blendFactor);
    
    // Set consistent texture scaling
    blendedTexture.repeat.set(8, 8);
    blendedTexture.wrapS = blendedTexture.wrapT = THREE.RepeatWrapping;
    
    // Calculate blended color
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    const blendedR = Math.floor(r1 * (1 - blendFactor) + r2 * blendFactor);
    const blendedG = Math.floor(g1 * (1 - blendFactor) + g2 * blendFactor);
    const blendedB = Math.floor(b1 * (1 - blendFactor) + b2 * blendFactor);
    
    const blendedColor = (blendedR << 16) | (blendedG << 8) | blendedB;
    
    const material = new THREE.MeshLambertMaterial({
      map: blendedTexture,
      color: blendedColor
    });
    
    return material;
  }
  
  /**
   * Updates the center ground to use realistic grass matching the ring system
   */
  static updateCenterGroundMaterial(groundMesh: THREE.Mesh): void {
    // Use the same color as Ring 0 (center ring)
    const centerRingColor = 0x5FAD5F;
    const newMaterial = this.createRealisticGrassMaterial(centerRingColor);
    
    // Dispose of old material
    if (groundMesh.material instanceof THREE.Material) {
      groundMesh.material.dispose();
    }
    
    groundMesh.material = newMaterial;
    groundMesh.receiveShadow = true;
  }
}
