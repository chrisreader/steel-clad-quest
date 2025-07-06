import * as THREE from 'three';

/**
 * Manages shared materials for human NPCs to optimize performance
 * by reducing material cloning and improving memory usage
 */
export class HumanMaterialManager {
  private static materialCache = new Map<string, THREE.MeshPhongMaterial>();

  /**
   * Creates and caches a shared material
   */
  public static createSharedMaterial(
    key: string,
    color: number,
    shininess: number = 30,
    specular: number = 0x333333
  ): THREE.MeshPhongMaterial {
    const cacheKey = `${key}_${color}_${shininess}_${specular}`;
    
    if (!this.materialCache.has(cacheKey)) {
      const material = new THREE.MeshPhongMaterial({
        color,
        shininess,
        specular
      });
      this.materialCache.set(cacheKey, material);
    }
    
    return this.materialCache.get(cacheKey)!;
  }

  /**
   * Creates human skin materials
   */
  public static createHumanSkinMaterials(colors: { skin: number; muscle: number; accent: number }) {
    return {
      skin: this.createSharedMaterial('skin', colors.skin, 30, 0x333333),
      muscle: this.createSharedMaterial('muscle', colors.muscle, 35, 0x444444),
      accent: this.createSharedMaterial('accent', colors.accent, 25, 0x222222)
    };
  }

  /**
   * Creates clothing materials
   */
  public static createClothingMaterial(color: number, type: 'shirt' | 'pants' = 'shirt'): THREE.MeshPhongMaterial {
    const shininess = type === 'shirt' ? 5 : 8;
    const specular = type === 'shirt' ? 0x111111 : 0x181818;
    return this.createSharedMaterial(`${type}`, color, shininess, specular);
  }

  /**
   * Creates shoe material
   */
  public static createShoeMaterial(): THREE.MeshPhongMaterial {
    return this.createSharedMaterial('shoe', 0x404040, 20, 0x222222);
  }

  /**
   * Dispose of all cached materials
   */
  public static dispose(): void {
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
  }
}

// Add cleanup to be called when the application shuts down
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    HumanMaterialManager.dispose();
  });
}