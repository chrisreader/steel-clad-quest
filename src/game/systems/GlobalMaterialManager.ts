import * as THREE from 'three';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';

export interface MaterialFeature {
  id: string;
  materials: THREE.Material[];
  position: THREE.Vector3;
  type: 'tree' | 'rock' | 'bush' | 'cloud' | 'enemy' | 'bird' | 'structure';
  originalOpacity: number[];
  distanceFromPlayer: number;
  spawnedAtPlayerPosition: THREE.Vector3;
  age: number;
}

/**
 * Material-based persistence system - Like tree foliage materials
 * Features are NEVER removed from scene, only materials are updated
 */
export class GlobalMaterialManager {
  private static instance: GlobalMaterialManager | null = null;
  private materialFeatures: Map<string, MaterialFeature> = new Map();
  
  // PERSISTENT MATERIAL SYSTEM - Like tree foliage materials
  private activeMaterials: Set<THREE.Material> = new Set();
  
  private constructor() {
    console.log('🎨 [GlobalMaterialManager] Initialized - material-based persistence like tree foliage');
  }
  
  public static getInstance(): GlobalMaterialManager {
    if (!GlobalMaterialManager.instance) {
      GlobalMaterialManager.instance = new GlobalMaterialManager();
    }
    return GlobalMaterialManager.instance;
  }
  
  public registerFeatureMaterials(
    id: string,
    materials: THREE.Material[],
    position: THREE.Vector3,
    type: MaterialFeature['type'],
    playerPosition: THREE.Vector3
  ): void {
    // Store original opacity values
    const originalOpacity = materials.map(mat => {
      if ('opacity' in mat) {
        return (mat as any).opacity;
      }
      return 1.0;
    });
    
    const feature: MaterialFeature = {
      id,
      materials: [...materials],
      position: position.clone(),
      type,
      originalOpacity,
      distanceFromPlayer: position.distanceTo(playerPosition),
      spawnedAtPlayerPosition: playerPosition.clone(),
      age: 0
    };
    
    this.materialFeatures.set(id, feature);
    
    // Add to active materials set - PERSISTENT like tree foliage
    materials.forEach(mat => {
      this.activeMaterials.add(mat);
      // Ensure materials support transparency
      if ('transparent' in mat) {
        (mat as any).transparent = true;
      }
    });
    
    console.log(`🎨 [GlobalMaterialManager] Registered PERSISTENT ${type} materials: ${id} with ${materials.length} materials`);
  }
  
  public unregisterFeatureMaterials(id: string): void {
    const feature = this.materialFeatures.get(id);
    if (feature) {
      feature.materials.forEach(mat => {
        this.activeMaterials.delete(mat);
      });
      this.materialFeatures.delete(id);
      console.log(`🎨 [GlobalMaterialManager] Unregistered ${feature.type} materials: ${id}`);
    }
  }
  
  public updateMaterialVisibility(playerPosition: THREE.Vector3, deltaTime: number): void {
    const currentTime = performance.now();
    let visibleCount = 0;
    let hiddenCount = 0;
    
    // DEBUG: Log update call every 2 seconds
    if (currentTime % 2000 < 100) {
      console.log(`🎨 [MaterialManager] UpdateMaterialVisibility - processing ${this.materialFeatures.size} features`);
    }
    
    // PERSISTENT SYSTEM - Update materials like tree foliage
    this.materialFeatures.forEach((feature) => {
      // Update age
      feature.age += deltaTime * 1000;
      
      // Update distance from current player position
      const oldDistance = feature.distanceFromPlayer;
      feature.distanceFromPlayer = feature.position.distanceTo(playerPosition);
      
      // DEBUG: Log distance changes for trees specifically
      if (feature.type === 'tree' && Math.abs(oldDistance - feature.distanceFromPlayer) > 10) {
        console.log(`🌳 [MaterialManager] Tree ${feature.id} distance changed: ${oldDistance.toFixed(1)} -> ${feature.distanceFromPlayer.toFixed(1)}`);
      }
      
      // Determine opacity based on distance
      const renderDistance = this.getRenderDistanceForType(feature.type);
      const opacity = this.calculateOpacity(feature.distanceFromPlayer, renderDistance);
      
      // Update all materials for this feature
      feature.materials.forEach((material, index) => {
        if ('opacity' in material) {
          const originalOpacity = feature.originalOpacity[index];
          (material as any).opacity = opacity * originalOpacity;
          (material as any).transparent = opacity < 1.0;
          (material as any).visible = opacity > 0.01; // Keep very transparent materials invisible
        }
      });
      
      if (opacity > 0.01) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    });
    
    // Debug log every 5 seconds
    if (currentTime % 5000 < 100) {
      console.log(`🎨 [MaterialManager] PERSISTENT Status: ${visibleCount} visible, ${hiddenCount} hidden, ${this.materialFeatures.size} material features`);
    }
  }
  
  private getRenderDistanceForType(type: MaterialFeature['type']): number {
    switch (type) {
      case 'tree':
      case 'rock':
      case 'bush':
        return RENDER_DISTANCES.TREES;
      case 'cloud':
        return RENDER_DISTANCES.CLOUDS;
      case 'enemy':
        return RENDER_DISTANCES.ENEMIES;
      case 'bird':
        return RENDER_DISTANCES.BIRDS;
      case 'structure':
        return RENDER_DISTANCES.TERRAIN;
      default:
        return RENDER_DISTANCES.TERRAIN;
    }
  }
  
  private calculateOpacity(distance: number, maxDistance: number): number {
    if (distance <= RENDER_DISTANCES.FADE_IN_DISTANCE) {
      return 1.0; // Fully visible
    } else if (distance <= RENDER_DISTANCES.FADE_OUT_DISTANCE) {
      // Smooth fade transition
      const fadeRange = RENDER_DISTANCES.FADE_OUT_DISTANCE - RENDER_DISTANCES.FADE_IN_DISTANCE;
      const fadeProgress = (distance - RENDER_DISTANCES.FADE_IN_DISTANCE) / fadeRange;
      return Math.max(0.1, 1.0 - fadeProgress);
    } else if (distance <= maxDistance) {
      return 0.1; // Very transparent but still present
    } else {
      return 0.0; // Invisible
    }
  }
  
  public getFeatureCount(): number {
    return this.materialFeatures.size;
  }
  
  public getFeaturesByType(type: MaterialFeature['type']): MaterialFeature[] {
    return Array.from(this.materialFeatures.values()).filter(feature => feature.type === type);
  }
  
  public getVisibleFeatureCount(): number {
    return Array.from(this.materialFeatures.values()).filter(feature => {
      const renderDistance = this.getRenderDistanceForType(feature.type);
      const opacity = this.calculateOpacity(feature.distanceFromPlayer, renderDistance);
      return opacity > 0.01;
    }).length;
  }
  
  public dispose(): void {
    console.log(`🗑️ [MaterialManager] Disposing ${this.materialFeatures.size} material features`);
    
    this.materialFeatures.forEach((feature) => {
      feature.materials.forEach(mat => {
        if ('dispose' in mat) {
          (mat as any).dispose();
        }
      });
    });
    
    this.materialFeatures.clear();
    this.activeMaterials.clear();
    GlobalMaterialManager.instance = null;
  }
  
  // Debug method
  public getDebugInfo(): any {
    const typeCount = new Map<string, number>();
    const visibleTypeCount = new Map<string, number>();
    
    this.materialFeatures.forEach(feature => {
      typeCount.set(feature.type, (typeCount.get(feature.type) || 0) + 1);
      const renderDistance = this.getRenderDistanceForType(feature.type);
      const opacity = this.calculateOpacity(feature.distanceFromPlayer, renderDistance);
      if (opacity > 0.01) {
        visibleTypeCount.set(feature.type, (visibleTypeCount.get(feature.type) || 0) + 1);
      }
    });
    
    return {
      totalMaterialFeatures: this.materialFeatures.size,
      byType: Object.fromEntries(typeCount),
      visibleByType: Object.fromEntries(visibleTypeCount)
    };
  }
}