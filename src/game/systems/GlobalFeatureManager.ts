import * as THREE from 'three';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';
import { GlobalMaterialManager } from './GlobalMaterialManager';

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
  private materialManager: GlobalMaterialManager;
  
  // PERSISTENT FEATURE SYSTEM - Like tree foliage materials
  // Features are NEVER removed unless extremely far away
  private persistentFeatures: Set<GlobalFeature> = new Set();
  
  private constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.materialManager = GlobalMaterialManager.getInstance();
    console.log('🌍 [GlobalFeatureManager] Initialized - using MATERIAL-BASED persistence like tree foliage');
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
    
    // MATERIAL-BASED PERSISTENCE - Extract and register all materials
    const materials: THREE.Material[] = [];
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          materials.push(...child.material);
        } else {
          materials.push(child.material);
        }
      }
    });
    
    // Register with material manager for persistent rendering
    this.materialManager.registerFeatureMaterials(id, materials, position, type, playerPosition);
    
    console.log(`🌍 [GlobalFeatureManager] Registered PERSISTENT ${type} feature: ${id} with ${materials.length} materials - NEVER REMOVED FROM SCENE`);
  }
  
  public unregisterFeature(id: string): void {
    const feature = this.features.get(id);
    if (feature) {
      console.log(`🌍 [GlobalFeatureManager] Unregistered ${feature.type} feature: ${id}`);
      this.materialManager.unregisterFeatureMaterials(id);
      this.features.delete(id);
      this.persistentFeatures.delete(feature);
    }
  }
  
  public updateFeatureVisibility(playerPosition: THREE.Vector3, deltaTime: number): void {
    // MATERIAL-BASED PERSISTENCE - Update materials instead of object visibility
    this.materialManager.updateMaterialVisibility(playerPosition, deltaTime);
    
    const currentTime = performance.now();
    const featuresToRemove: GlobalFeature[] = [];
    
    // DEBUG: Log update call every 5 seconds
    if (currentTime % 5000 < 100) {
      console.log(`🎨 [GlobalFeatureManager] MATERIAL-BASED persistence - processing ${this.persistentFeatures.size} features via materials`);
    }
    
    // PERSISTENT SYSTEM - Objects stay in scene, only update age and check for extreme distance removal
    this.persistentFeatures.forEach((feature) => {
      // Update age
      feature.age += deltaTime * 1000;
      
      // Update distance from current player position
      feature.distanceFromPlayer = feature.position.distanceTo(playerPosition);
      
      // VERY CONSERVATIVE removal - only if extremely far away (2000+ units)
      if (feature.distanceFromPlayer > RENDER_DISTANCES.MASTER_CULL_DISTANCE) {
        featuresToRemove.push(feature);
        console.log(`🗑️ [GlobalFeatureManager] Marking ${feature.type} ${feature.id} for extreme distance removal (${feature.distanceFromPlayer.toFixed(1)} > ${RENDER_DISTANCES.MASTER_CULL_DISTANCE})`);
      }
    });
    
    // Remove extremely distant features (very conservative) - both object and materials
    featuresToRemove.forEach(feature => {
      this.scene.remove(feature.mesh);
      this.materialManager.unregisterFeatureMaterials(feature.id);
      this.disposeFeature(feature);
      this.features.delete(feature.id);
      this.persistentFeatures.delete(feature);
      console.log(`🗑️ [GlobalFeatureManager] Removed EXTREMELY distant ${feature.type}: ${feature.id} (distance: ${feature.distanceFromPlayer.toFixed(1)})`);
    });
    
    // Debug log every 10 seconds
    if (currentTime % 10000 < 100) {
      const materialDebug = this.materialManager.getDebugInfo();
      console.log(`🎨 [GlobalFeatureManager] MATERIAL-BASED Status:`, materialDebug);
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
  
  // OLD OBJECT-BASED OPACITY METHODS REMOVED - Now handled by GlobalMaterialManager
  
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
    
    // Dispose material manager first
    this.materialManager.dispose();
    
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