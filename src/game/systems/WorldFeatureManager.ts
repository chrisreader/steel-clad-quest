import * as THREE from 'three';
import { DistanceManager } from './UnifiedDistanceManager';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';

export interface ManagedFeature {
  id: string;
  object: THREE.Object3D;
  position: THREE.Vector3;
  type: 'tree' | 'rock' | 'bush' | 'cloud' | 'bird' | 'enemy' | 'structure';
  regionKey?: string; // Original region for reference
  lastDistanceCheck: number;
  isVisible: boolean;
  disposeCallback?: () => void;
}

/**
 * UNIFIED WORLD FEATURE MANAGER
 * Single source of truth for ALL world features
 * Features are managed by distance from player, NOT by region boundaries
 * This creates a true "world bubble" that follows the player seamlessly
 */
export class WorldFeatureManager {
  private static instance: WorldFeatureManager | null = null;
  private scene: THREE.Scene;
  private features: Map<string, ManagedFeature> = new Map();
  
  // Unified distance thresholds - ALL features use these
  private readonly RENDER_DISTANCE = RENDER_DISTANCES.TERRAIN; // 800 units
  private readonly CULL_DISTANCE = RENDER_DISTANCES.MASTER_CULL_DISTANCE; // 1000 units
  private readonly FADE_START = this.RENDER_DISTANCE * 0.8; // 640 units
  
  // Performance optimization
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 100; // Update every 100ms for smooth performance
  
  private constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🌍 WorldFeatureManager initialized with unified distances:', {
      render: this.RENDER_DISTANCE,
      cull: this.CULL_DISTANCE,
      fadeStart: this.FADE_START
    });
  }
  
  public static getInstance(scene?: THREE.Scene): WorldFeatureManager {
    if (!WorldFeatureManager.instance && scene) {
      WorldFeatureManager.instance = new WorldFeatureManager(scene);
    }
    return WorldFeatureManager.instance!;
  }
  
  /**
   * REGISTER FEATURE - Add any world feature to be managed
   */
  public registerFeature(
    object: THREE.Object3D,
    type: ManagedFeature['type'],
    regionKey?: string,
    disposeCallback?: () => void
  ): void {
    const id = this.generateFeatureId();
    const feature: ManagedFeature = {
      id,
      object,
      position: object.position.clone(),
      type,
      regionKey,
      lastDistanceCheck: 0,
      isVisible: true,
      disposeCallback
    };
    
    this.features.set(id, feature);
    console.log(`🌍 [WorldFeatureManager] Registered ${type} feature ${id} at position ${object.position.x.toFixed(1)}, ${object.position.z.toFixed(1)}`);
  }
  
  /**
   * UNREGISTER FEATURE - Remove feature from management
   */
  public unregisterFeature(id: string): void {
    const feature = this.features.get(id);
    if (feature) {
      if (feature.disposeCallback) {
        feature.disposeCallback();
      }
      this.scene.remove(feature.object);
      this.features.delete(id);
      console.log(`🌍 [WorldFeatureManager] Unregistered ${feature.type} feature ${id}`);
    }
  }
  
  /**
   * UPDATE ALL FEATURES - Player-centered distance management
   */
  public update(): void {
    const now = performance.now();
    if (now - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = now;
    
    const playerPosition = DistanceManager.getPlayerPosition();
    const currentRing = DistanceManager.getCurrentRingIndex();
    
    // Get adaptive distances for current ring
    const renderDistance = DistanceManager.getRenderDistance();
    const cullDistance = DistanceManager.getCullDistance();
    
    let culledCount = 0;
    let visibleCount = 0;
    let fadedCount = 0;
    
    for (const [id, feature] of this.features.entries()) {
      const distance = DistanceManager.calculateDistanceFromPlayer(feature.position);
      feature.lastDistanceCheck = distance;
      
      // CONSERVATIVE CULLING - Only remove if way beyond cull distance
      if (distance > cullDistance) {
        this.unregisterFeature(id);
        culledCount++;
        continue;
      }
      
      // VISIBILITY MANAGEMENT
      const shouldBeVisible = distance <= renderDistance;
      
      if (shouldBeVisible && !feature.isVisible) {
        // Feature coming into range
        feature.object.visible = true;
        feature.isVisible = true;
        visibleCount++;
      } else if (!shouldBeVisible && feature.isVisible) {
        // Feature going out of range (but not culled)
        feature.object.visible = false;
        feature.isVisible = false;
      }
      
      // FADE MANAGEMENT for smooth transitions
      if (feature.isVisible && distance > this.FADE_START) {
        const fadeDistance = renderDistance - this.FADE_START;
        const fadeProgress = (distance - this.FADE_START) / fadeDistance;
        const opacity = Math.max(0.1, 1.0 - fadeProgress);
        
        // Apply fade to materials if possible
        this.applyFadeToFeature(feature, opacity);
        fadedCount++;
      } else if (feature.isVisible) {
        // Ensure full opacity when close
        this.applyFadeToFeature(feature, 1.0);
      }
    }
    
    // Debug output every 5 seconds
    if (now % 5000 < this.UPDATE_INTERVAL) {
      console.log(`🌍 [WorldFeatureManager] Ring ${currentRing} - Features: ${this.features.size}, Visible: ${visibleCount}, Faded: ${fadedCount}, Culled: ${culledCount}`);
    }
  }
  
  /**
   * APPLY FADE TO FEATURE - Smooth distance-based fading
   */
  private applyFadeToFeature(feature: ManagedFeature, opacity: number): void {
    feature.object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat instanceof THREE.Material) {
              mat.opacity = opacity;
              mat.transparent = opacity < 1.0;
              mat.needsUpdate = true;
            }
          });
        } else if (child.material instanceof THREE.Material) {
          child.material.opacity = opacity;
          child.material.transparent = opacity < 1.0;
          child.material.needsUpdate = true;
        }
      }
    });
  }
  
  /**
   * GET FEATURES BY TYPE - For system-specific queries
   */
  public getFeaturesByType(type: ManagedFeature['type']): ManagedFeature[] {
    return Array.from(this.features.values()).filter(f => f.type === type);
  }
  
  /**
   * GET FEATURES BY REGION - For region-based cleanup
   */
  public getFeaturesByRegion(regionKey: string): ManagedFeature[] {
    return Array.from(this.features.values()).filter(f => f.regionKey === regionKey);
  }
  
  /**
   * CLEANUP REGION - Remove all features from a specific region
   * Used when terrain regions are unloaded
   */
  public cleanupRegion(regionKey: string): void {
    const regionFeatures = this.getFeaturesByRegion(regionKey);
    regionFeatures.forEach(feature => {
      this.unregisterFeature(feature.id);
    });
    console.log(`🌍 [WorldFeatureManager] Cleaned up ${regionFeatures.length} features from region ${regionKey}`);
  }
  
  /**
   * FORCE IMMEDIATE UPDATE - For critical moments like ring changes
   */
  public forceUpdate(): void {
    this.lastUpdate = 0;
    this.update();
  }
  
  /**
   * GET DEBUG INFO
   */
  public getDebugInfo(): any {
    const byType = {};
    for (const feature of this.features.values()) {
      byType[feature.type] = (byType[feature.type] || 0) + 1;
    }
    
    return {
      totalFeatures: this.features.size,
      byType,
      renderDistance: this.RENDER_DISTANCE,
      cullDistance: this.CULL_DISTANCE,
      fadeStart: this.FADE_START
    };
  }
  
  private generateFeatureId(): string {
    return `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  public dispose(): void {
    for (const [id, feature] of this.features.entries()) {
      if (feature.disposeCallback) {
        feature.disposeCallback();
      }
      this.scene.remove(feature.object);
    }
    this.features.clear();
    WorldFeatureManager.instance = null;
    console.log('🌍 [WorldFeatureManager] Disposed');
  }
}