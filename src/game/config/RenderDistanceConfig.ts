// DEPRECATED: Use FogSynchronizedRenderConfig instead for fog-aware rendering
// This is kept for backward compatibility only
export const RENDER_DISTANCES = {
  // FOG-SYNCHRONIZED DISTANCES - Aggressive reduction for dense environments
  TERRAIN: 300,        // Reduced from 1500 to match fog
  
  // Fog-based culling distance - everything beyond fog is invisible anyway
  MASTER_CULL_DISTANCE: 400,  // Reduced from 2000
  
  // Feature-specific distances - ALL synchronized with fog visibility
  TREES: 300,          // Reduced from 1500 - fog hides them anyway
  ROCKS: 300,          // Reduced from 1500 - fog hides them anyway  
  BUSHES: 300,         // Reduced from 1500 - fog hides them anyway
  CLOUDS: 350,         // Slightly farther for realism
  ENEMIES: 200,        // Reduced from 800 - fog limits visibility
  BIRDS: 250,          // Reduced from 1000 - fog limits visibility
  
  // Dense environment spawn distances - closer but higher density
  SPAWN: {
    MIN_DISTANCE: 20,     // Closer spawning for denser environment
    MAX_DISTANCE: 200     // Much closer - fog limits visibility anyway
  },
  
  // Fog-synchronized fade distances
  FADE_IN_DISTANCE: 150,   // Much closer - fog does the fading
  FADE_OUT_DISTANCE: 250,  // Much closer - fog does the fading
  
  // Fog-aware region unloading
  REGION_UNLOAD_MULTIPLIER: 1.2  // More aggressive unloading
};

console.log('🎯 [RenderDistanceConfig] Unified distance configuration loaded - Player-centered world rendering');