import * as THREE from 'three';

/**
 * UNIFIED RENDER DISTANCE SYSTEM
 * Centralized configuration to prevent disappearing elements
 * All systems MUST use these values for consistent world loading
 */

export const RENDER_DISTANCES = {
  // Base render distance for terrain and world regions - UNIFIED STANDARD
  TERRAIN: 800,
  
  // UNIFIED: All content matches terrain render distance for consistency
  CLOUDS: 800,      // Unified with terrain for continuous visibility
  BIRDS: 800,       // Unified with terrain for continuous visibility  
  ENEMIES: 800,     // Unified with terrain for continuous visibility
  VEGETATION: 800,  // Unified with terrain for continuous visibility
  ROCKS: 800,       // Unified with terrain for continuous visibility
  
  // LOD distances (for quality reduction, not culling) - Conservative values
  LOD_NEAR: 150,
  LOD_MEDIUM: 300, 
  LOD_FAR: 600,
  
  // Spawn distances (where new content appears) - Generous for smooth loading
  SPAWN: {
    MIN_DISTANCE: 100,  // Increased for smoother spawning
    MAX_DISTANCE: 600,  // Increased to match visibility range
    BUFFER: 200         // Larger buffer for seamless transitions
  },
  
  // Cleanup distances (very generous to prevent pop-out) - SAFETY FIRST
  CLEANUP: {
    CLOUDS: 1000,    // 25% buffer over render distance
    BIRDS: 1000,     // 25% buffer over render distance
    ENEMIES: 1000,   // 25% buffer over render distance
    FEATURES: 1000   // 25% buffer over render distance
  },
  
  // MASTER CULLING DISTANCE - Single source of truth
  MASTER_CULL_DISTANCE: 1000,  // 25% safety buffer over terrain render distance
  
  // Adaptive scaling based on ring size
  RING_SCALE_FACTOR: 1.5,  // Multiply distances by this for larger rings
  RING_SCALE_THRESHOLD: 3  // Start scaling at ring 3+
} as const;

export type RenderDistanceConfig = typeof RENDER_DISTANCES;

// Helper function to get scaled distance based on render distance
export function getScaledDistance(baseDistance: number, scale: number = 1.0): number {
  return Math.floor(baseDistance * scale);
}

// Helper to ensure minimum distance thresholds
export function ensureMinimumDistance(distance: number, minimum: number): number {
  return Math.max(distance, minimum);
}

// MASTER DISTANCE CALCULATOR - Single source of truth for all systems
export function getMasterRenderDistance(ringIndex: number = 0): number {
  const baseDistance = RENDER_DISTANCES.TERRAIN;
  
  // Apply adaptive scaling for larger rings
  if (ringIndex >= RENDER_DISTANCES.RING_SCALE_THRESHOLD) {
    return Math.floor(baseDistance * RENDER_DISTANCES.RING_SCALE_FACTOR);
  }
  
  return baseDistance;
}

// MASTER CULLING DISTANCE - Conservative culling for all systems
export function getMasterCullDistance(ringIndex: number = 0): number {
  const baseDistance = RENDER_DISTANCES.MASTER_CULL_DISTANCE;
  
  // Apply adaptive scaling for larger rings
  if (ringIndex >= RENDER_DISTANCES.RING_SCALE_THRESHOLD) {
    return Math.floor(baseDistance * RENDER_DISTANCES.RING_SCALE_FACTOR);
  }
  
  return baseDistance;
}

// UNIFIED PLAYER-CENTERED DISTANCE CALCULATION
export function calculatePlayerDistance(playerPosition: THREE.Vector3, targetPosition: THREE.Vector3): number {
  return playerPosition.distanceTo(targetPosition);
}