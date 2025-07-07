import * as THREE from 'three';
import { RENDER_DISTANCES, getMasterRenderDistance, getMasterCullDistance } from '../config/RenderDistanceConfig';

/**
 * UNIFIED DISTANCE MANAGER
 * Single source of truth for all distance-based calculations
 * Prevents disappearing elements by ensuring consistent player-centered distance calculations
 */
export class UnifiedDistanceManager {
  private static instance: UnifiedDistanceManager | null = null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private currentRingIndex: number = 0;
  
  // Cached adaptive distances based on current ring
  private cachedRenderDistance: number = RENDER_DISTANCES.TERRAIN;
  private cachedCullDistance: number = RENDER_DISTANCES.MASTER_CULL_DISTANCE;
  private lastRingUpdate: number = -1;
  
  private constructor() {
    console.log('🎯 UnifiedDistanceManager initialized');
  }
  
  public static getInstance(): UnifiedDistanceManager {
    if (!UnifiedDistanceManager.instance) {
      UnifiedDistanceManager.instance = new UnifiedDistanceManager();
    }
    return UnifiedDistanceManager.instance;
  }
  
  public updatePlayerPosition(position: THREE.Vector3, ringIndex: number): void {
    this.playerPosition.copy(position);
    
    // Update adaptive distances if ring changed
    if (ringIndex !== this.lastRingUpdate) {
      this.currentRingIndex = ringIndex;
      this.cachedRenderDistance = getMasterRenderDistance(ringIndex);
      this.cachedCullDistance = getMasterCullDistance(ringIndex);
      this.lastRingUpdate = ringIndex;
      
      console.log(`🎯 [UnifiedDistance] Ring ${ringIndex} - Render: ${this.cachedRenderDistance}, Cull: ${this.cachedCullDistance}`);
    }
  }
  
  public getPlayerPosition(): THREE.Vector3 {
    return this.playerPosition.clone();
  }
  
  public getCurrentRingIndex(): number {
    return this.currentRingIndex;
  }
  
  public getRenderDistance(): number {
    return this.cachedRenderDistance;
  }
  
  public getCullDistance(): number {
    return this.cachedCullDistance;
  }
  
  /**
   * UNIFIED DISTANCE CALCULATION
   * Single method for all systems to calculate distance from player
   * Ensures consistency and prevents spawn-point fallbacks
   */
  public calculateDistanceFromPlayer(position: THREE.Vector3): number {
    return this.playerPosition.distanceTo(position);
  }
  
  /**
   * CHECK IF POSITION SHOULD BE CULLED
   * Conservative culling with adaptive distances
   */
  public shouldCull(position: THREE.Vector3): boolean {
    const distance = this.calculateDistanceFromPlayer(position);
    return distance > this.cachedCullDistance;
  }
  
  /**
   * CHECK IF POSITION IS WITHIN RENDER DISTANCE
   */
  public isWithinRenderDistance(position: THREE.Vector3): boolean {
    const distance = this.calculateDistanceFromPlayer(position);
    return distance <= this.cachedRenderDistance;
  }
  
  /**
   * GET FADE FACTOR FOR DISTANCE-BASED OPACITY
   * Returns 0-1 based on distance for smooth fading
   */
  public getFadeFactor(position: THREE.Vector3, fadeStart: number = 0.7, fadeEnd: number = 1.0): number {
    const distance = this.calculateDistanceFromPlayer(position);
    const renderDistance = this.cachedRenderDistance;
    
    const fadeStartDistance = renderDistance * fadeStart;
    const fadeEndDistance = renderDistance * fadeEnd;
    
    if (distance <= fadeStartDistance) return 1.0;
    if (distance >= fadeEndDistance) return 0.0;
    
    const fadeRange = fadeEndDistance - fadeStartDistance;
    const fadeProgress = (distance - fadeStartDistance) / fadeRange;
    return Math.max(0, Math.min(1, 1 - fadeProgress));
  }
  
  /**
   * GET ADAPTIVE SPAWN DISTANCES FOR RING
   */
  public getSpawnDistances(): { min: number; max: number } {
    return {
      min: RENDER_DISTANCES.SPAWN.MIN_DISTANCE,
      max: Math.min(RENDER_DISTANCES.SPAWN.MAX_DISTANCE, this.cachedRenderDistance * 0.7)
    };
  }
  
  /**
   * DEBUG INFO
   */
  public getDebugInfo(): any {
    return {
      playerPosition: this.playerPosition.toArray(),
      currentRing: this.currentRingIndex,
      renderDistance: this.cachedRenderDistance,
      cullDistance: this.cachedCullDistance
    };
  }
}

// Global instance access
export const DistanceManager = UnifiedDistanceManager.getInstance();