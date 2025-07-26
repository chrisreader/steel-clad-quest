export const RENDER_DISTANCES = {
  // FOG-SYNCHRONIZED RENDERING: Objects fade with fog wall - REDUCED 20% for performance
  TERRAIN: 256,  // Reduced from 320
  
  // Fog-aware culling distance - more aggressive
  MASTER_CULL_DISTANCE: 280,  // Reduced from 350
  
  // Main objects synchronized with fog wall - 20% reduction
  TREES: 256,        // Reduced from 320
  ROCKS: 256,        // Reduced from 320
  BUSHES: 256,       // Reduced from 320
  CLOUDS: 224,       // Reduced from 280
  ENEMIES: 192,      // Reduced from 240
  BIRDS: 224,        // Reduced from 280
  
  // Spawn distances - reduced for better performance
  SPAWN: {
    MIN_DISTANCE: 100,   // Keep same for gameplay
    MAX_DISTANCE: 200    // Reduced from 250
  },
  
  // Fog-synchronized fade distances - aligned with fog wall
  FADE_IN_DISTANCE: 240,   // Objects fully visible until approaching fog wall
  FADE_OUT_DISTANCE: 280,  // Fade out WITH the fog wall, not before it
  
  // Region unloading - fog-aware
  REGION_UNLOAD_MULTIPLIER: 1.2  // More aggressive unloading beyond fog wall
};

console.log('🎯 [RenderDistanceConfig] Unified distance configuration loaded - Player-centered world rendering');