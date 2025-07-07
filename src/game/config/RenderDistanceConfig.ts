export const RENDER_DISTANCES = {
  // Master render distance for all terrain features - INCREASED to match region loading
  TERRAIN: 1500,
  
  // Conservative culling distance - very conservative, only remove when extremely far
  MASTER_CULL_DISTANCE: 2000,
  
  // Feature-specific distances - INCREASED to match terrain/region system
  TREES: 1500,       // Match terrain to prevent disappearing
  ROCKS: 1500,       // Match terrain to prevent disappearing
  BUSHES: 1500,      // Match terrain to prevent disappearing
  CLOUDS: 1200,      // Slightly closer for performance
  ENEMIES: 800,      // Slightly closer for performance
  BIRDS: 1000,       // Between enemies and terrain
  
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