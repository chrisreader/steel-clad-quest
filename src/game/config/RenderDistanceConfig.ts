/**
 * Centralized render distance configuration for all game systems
 * Ensures consistent world loading and prevents disappearing elements
 */

export const RENDER_DISTANCES = {
  // Base render distance for terrain and world regions
  TERRAIN: 800,
  
  // Scaled distances for different content types
  CLOUDS: 600,      // Clouds should be visible at long range
  BIRDS: 300,       // Birds visible at medium range  
  ENEMIES: 250,     // Enemies at medium range
  VEGETATION: 500,  // Trees/bushes at long range
  ROCKS: 400,       // Rock formations at medium-long range
  
  // LOD distances (for quality reduction, not culling)
  LOD_NEAR: 100,
  LOD_MEDIUM: 200, 
  LOD_FAR: 400,
  
  // Spawn distances (where new content appears)
  SPAWN: {
    MIN_DISTANCE: 50,   // Don't spawn too close
    MAX_DISTANCE: 400,  // Spawn within visible range
    BUFFER: 100         // Extra buffer for smooth spawning
  },
  
  // Cleanup distances (generous to prevent pop-out)
  CLEANUP: {
    CLOUDS: 700,
    BIRDS: 350,
    ENEMIES: 300,
    FEATURES: 500
  }
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