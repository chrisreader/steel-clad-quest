import * as THREE from 'three';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';

export interface GlobalFeature {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  type: 'tree' | 'rock' | 'bush' | 'cloud' | 'enemy' | 'bird' | 'structure';
  distanceFromPlayer: number;
  isVisible: boolean;
  spawnedAtPlayerPosition: THREE.Vector3;
  age: number;
}

export class GlobalFeatureManager {
  private static instance: GlobalFeatureManager | null = null;
  private features: Map<string, GlobalFeature> = new Map();
  private scene: THREE.Scene;
  
  // PERSISTENT FEATURE SYSTEM - Like tree foliage materials
  // Features are NEVER removed unless extremely far away
  private persistentFeatures: Set<GlobalFeature> = new Set();
  
  private constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🌍 [GlobalFeatureManager] Initialized - managing all world features globally');
  }
  
  public static getInstance(scene?: THREE.Scene): GlobalFeatureManager {
    if (!GlobalFeatureManager.instance && scene) {
      GlobalFeatureManager.instance = new GlobalFeatureManager(scene);
    }
    if (!GlobalFeatureManager.instance) {
      throw new Error('GlobalFeatureManager must be initialized with a scene first');
    }
    return GlobalFeatureManager.instance;
  }
  
  public registerFeature(
    id: string, 
    mesh: THREE.Object3D, 
    position: THREE.Vector3, 
    type: GlobalFeature['type'],
    playerPosition: THREE.Vector3
  ): void {
    const feature: GlobalFeature = {
      id,
      mesh,
      position: position.clone(),
      type,
      distanceFromPlayer: position.distanceTo(playerPosition),
      isVisible: true,
      spawnedAtPlayerPosition: playerPosition.clone(),
      age: 0
    };
    
    this.features.set(id, feature);
    
    // ADD TO PERSISTENT SET - Like tree foliage materials
    this.persistentFeatures.add(feature);
    
    console.log(`🌍 [GlobalFeatureManager] Registered PERSISTENT ${type} feature: ${id} at distance ${feature.distanceFromPlayer.toFixed(1)}`);
  }
  
  public unregisterFeature(id: string): void {
    const feature = this.features.get(id);
    if (feature) {
      console.log(`🌍 [GlobalFeatureManager] Unregistered ${feature.type} feature: ${id}`);
      this.features.delete(id);
      this.persistentFeatures.delete(feature);
    }
  }
  
  public updateFeatureVisibility(playerPosition: THREE.Vector3, deltaTime: number): void {
    const currentTime = performance.now();
    let visibleCount = 0;
    let hiddenCount = 0;
    const featuresToRemove: GlobalFeature[] = [];
    
    // PERSISTENT SYSTEM - Iterate through persistent set like tree foliage materials
    this.persistentFeatures.forEach((feature) => {
      // Update age
      feature.age += deltaTime * 1000;
      
      // Update distance from current player position
      feature.distanceFromPlayer = feature.position.distanceTo(playerPosition);
      
      // Determine if feature should be visible based on player distance
      const shouldBeVisible = feature.distanceFromPlayer <= this.getRenderDistanceForType(feature.type);
      
      // Update visibility if changed - but NEVER remove from scene unless extremely far
      if (feature.isVisible !== shouldBeVisible) {
        feature.isVisible = shouldBeVisible;
        
        if (shouldBeVisible) {
          // Ensure mesh is in scene and fade in
          if (!this.scene.children.includes(feature.mesh)) {
            this.scene.add(feature.mesh);
          }
          feature.mesh.visible = true;
          this.fadeInFeature(feature);
        } else {
          // Hide but DON'T remove from scene - like tree foliage materials
          feature.mesh.visible = false;
          this.fadeOutFeature(feature);
        }
      }
      
      // Apply opacity based on distance for smooth transitions
      if (feature.isVisible) {
        this.updateFeatureOpacity(feature);
        visibleCount++;
      } else {
        hiddenCount++;
      }
      
      // VERY CONSERVATIVE removal - only if extremely far away (2000+ units)
      if (feature.distanceFromPlayer > RENDER_DISTANCES.MASTER_CULL_DISTANCE) {
        featuresToRemove.push(feature);
      }
    });
    
    // Remove extremely distant features (very conservative)
    featuresToRemove.forEach(feature => {
      this.scene.remove(feature.mesh);
      this.disposeFeature(feature);
      this.features.delete(feature.id);
      this.persistentFeatures.delete(feature);
      console.log(`🗑️ [GlobalFeatureManager] Removed EXTREMELY distant ${feature.type}: ${feature.id} (distance: ${feature.distanceFromPlayer.toFixed(1)})`);
    });
    
    // Debug log every 5 seconds
    if (currentTime % 5000 < 100) {
      console.log(`🌍 [GlobalFeatureManager] PERSISTENT Status: ${visibleCount} visible, ${hiddenCount} hidden, ${this.persistentFeatures.size} persistent features`);
    }
  }
  
  private getRenderDistanceForType(type: GlobalFeature['type']): number {
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
  
  private fadeInFeature(feature: GlobalFeature): void {
    // Smooth fade in based on distance
    const fadeDistance = RENDER_DISTANCES.FADE_IN_DISTANCE;
    if (feature.distanceFromPlayer < fadeDistance) {
      this.setFeatureOpacity(feature, 1.0);
    } else {
      const fadeRange = this.getRenderDistanceForType(feature.type) - fadeDistance;
      const fadeProgress = (feature.distanceFromPlayer - fadeDistance) / fadeRange;
      const opacity = Math.max(0.1, 1.0 - fadeProgress);
      this.setFeatureOpacity(feature, opacity);
    }
  }
  
  private fadeOutFeature(feature: GlobalFeature): void {
    this.setFeatureOpacity(feature, 0.0);
  }
  
  private updateFeatureOpacity(feature: GlobalFeature): void {
    const fadeInDistance = RENDER_DISTANCES.FADE_IN_DISTANCE;
    const fadeOutDistance = RENDER_DISTANCES.FADE_OUT_DISTANCE;
    
    if (feature.distanceFromPlayer <= fadeInDistance) {
      this.setFeatureOpacity(feature, 1.0);
    } else if (feature.distanceFromPlayer <= fadeOutDistance) {
      const fadeRange = fadeOutDistance - fadeInDistance;
      const fadeProgress = (feature.distanceFromPlayer - fadeInDistance) / fadeRange;
      const opacity = Math.max(0.1, 1.0 - fadeProgress);
      this.setFeatureOpacity(feature, opacity);
    } else {
      this.setFeatureOpacity(feature, 0.1);
    }
  }
  
  private setFeatureOpacity(feature: GlobalFeature, opacity: number): void {
    feature.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if ('transparent' in mat) {
              mat.transparent = opacity < 1.0;
              mat.opacity = opacity;
            }
          });
        } else if ('transparent' in child.material) {
          child.material.transparent = opacity < 1.0;
          child.material.opacity = opacity;
        }
      }
    });
  }
  
  private disposeFeature(feature: GlobalFeature): void {
    feature.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
  
  public getFeatureCount(): number {
    return this.persistentFeatures.size;
  }
  
  public getFeaturesByType(type: GlobalFeature['type']): GlobalFeature[] {
    return Array.from(this.persistentFeatures.values()).filter(feature => feature.type === type);
  }
  
  public getVisibleFeatureCount(): number {
    return Array.from(this.persistentFeatures.values()).filter(feature => feature.isVisible).length;
  }
  
  public dispose(): void {
    console.log(`🗑️ [GlobalFeatureManager] Disposing ${this.persistentFeatures.size} persistent features`);
    
    this.persistentFeatures.forEach((feature) => {
      this.scene.remove(feature.mesh);
      this.disposeFeature(feature);
    });
    
    this.features.clear();
    this.persistentFeatures.clear();
    GlobalFeatureManager.instance = null;
  }
  
  // Debug method
  public getDebugInfo(): any {
    const typeCount = new Map<string, number>();
    const visibleTypeCount = new Map<string, number>();
    
    this.persistentFeatures.forEach(feature => {
      typeCount.set(feature.type, (typeCount.get(feature.type) || 0) + 1);
      if (feature.isVisible) {
        visibleTypeCount.set(feature.type, (visibleTypeCount.get(feature.type) || 0) + 1);
      }
    });
    
    return {
      totalPersistentFeatures: this.persistentFeatures.size,
      byType: Object.fromEntries(typeCount),
      visibleByType: Object.fromEntries(visibleTypeCount)
    };
  }
}