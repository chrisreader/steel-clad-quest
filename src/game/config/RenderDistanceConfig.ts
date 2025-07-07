export const RENDER_DISTANCES = {
  // Master render distance for all terrain features
  TERRAIN: 800,
  
  // Conservative culling distance - only remove when absolutely sure
  MASTER_CULL_DISTANCE: 1000,
  
  // Feature-specific distances
  TREES: 800,        // Same as terrain
  ROCKS: 800,        // Same as terrain  
  BUSHES: 800,       // Same as terrain
  CLOUDS: 800,       // Same as terrain
  ENEMIES: 600,      // Slightly closer for performance
  BIRDS: 700,        // Between enemies and terrain
  
  // Spawn distances - where new entities appear
  SPAWN: {
    MIN_DISTANCE: 100,   // Don't spawn too close to player
    MAX_DISTANCE: 600    // Don't spawn too far from player
  },
  
  // Fade distances for smooth transitions
  FADE_IN_DISTANCE: 700,   // Start becoming visible
  FADE_OUT_DISTANCE: 850,  // Start becoming invisible
  
  // Region unloading - more conservative than feature distance
  REGION_UNLOAD_MULTIPLIER: 1.5  // Only unload regions when player is 1.5x render distance away
};

console.log('🎯 [RenderDistanceConfig] Unified distance configuration loaded - Player-centered world rendering');