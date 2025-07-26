export const RENDER_DISTANCES = {
  // FOG-SYNCHRONIZED RENDERING: Objects fade with fog wall at 240-300 units
  TERRAIN: 320,  // Match main objects to fog wall + small buffer
  
  // Fog-aware culling distance - objects beyond fog wall are invisible anyway
  MASTER_CULL_DISTANCE: 350,  // Just beyond max fog distance (300 units)
  
  // Main objects synchronized with fog wall (300 units max)
  TREES: 320,        // Fog-synchronized: fade out with fog wall
  ROCKS: 320,        // Fog-synchronized: fade out with fog wall  
  BUSHES: 320,       // Fog-synchronized: fade out with fog wall
  CLOUDS: 280,       // Medium-detail: within fog range
  ENEMIES: 240,      // Low-detail: well within fog range
  BIRDS: 280,        // Medium-detail: within fog range
  
  // Spawn distances - keep reasonable for gameplay
  SPAWN: {
    MIN_DISTANCE: 100,   // Don't spawn too close to player
    MAX_DISTANCE: 250    // Spawn within fog visibility range
  },
  
  // Fog-synchronized fade distances for smooth transitions
  FADE_IN_DISTANCE: 260,   // Start becoming visible before fog thickens
  FADE_OUT_DISTANCE: 280,  // Start fading as fog increases
  
  // Region unloading - fog-aware
  REGION_UNLOAD_MULTIPLIER: 1.2  // More aggressive unloading beyond fog wall
};

console.log('🎯 [RenderDistanceConfig] Unified distance configuration loaded - Player-centered world rendering');