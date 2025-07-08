export const RENDER_DISTANCES = {
  // FOG-SYNCHRONIZED DISTANCES - Optimized for massive environments with fog-based culling
  
  // Base fog visibility (typical fog ends around 400 units)
  FOG_VISIBILITY_BASE: 400,
  
  // Fog-aware render distances - synchronized with fog system
  TERRAIN: 320,          // 80% of fog distance - terrain fades into fog
  TREES: 280,            // 70% of fog distance - trees fade before terrain
  ROCKS: 300,            // 75% of fog distance - larger rocks visible longer
  BUSHES: 200,           // 50% of fog distance - small details disappear first
  GRASS: 150,            // 37.5% of fog distance - grass only in clear visibility
  
  // Performance-critical distances
  CLOUDS: 500,           // Above fog layer, can render further
  ENEMIES: 250,          // 62.5% of fog distance - gameplay critical
  BIRDS: 300,            // 75% of fog distance - atmospheric
  
  // FOG-BASED LOD RANGES
  LOD_RANGES: {
    CLOSE: 100,          // 0-100 units: Full detail, all effects
    MEDIUM: 200,         // 100-200 units: Medium detail, reduced effects
    FAR: 300,            // 200-300 units: Low detail, basic materials
    CULL: 400            // 300+ units: Complete removal beyond fog
  },
  
  // Spawn distances - optimized for fog visibility
  SPAWN: {
    MIN_DISTANCE: 50,    // Closer spawning for better density
    MAX_DISTANCE: 250    // Within fog visibility for immediate experience
  },
  
  // Fog-masked transitions
  FADE_IN_DISTANCE: 200,   // Objects fade in as fog clears
  FADE_OUT_DISTANCE: 350,  // Objects fade out into fog
  
  // Streaming distances - reduced for performance
  REGION_UNLOAD_MULTIPLIER: 1.2,  // Aggressive unloading just outside fog
  
  // Performance scaling factors
  PERFORMANCE_SCALING: {
    HIGH_FPS_MULTIPLIER: 1.2,    // Extend distances when FPS > 60
    LOW_FPS_MULTIPLIER: 0.7,     // Reduce distances when FPS < 40
    CRITICAL_FPS_MULTIPLIER: 0.5  // Aggressive reduction when FPS < 30
  },
  
  // Legacy compatibility - use FOG-based culling instead
  MASTER_CULL_DISTANCE: 400      // Equivalent to fog visibility base
};

console.log('🎯 [RenderDistanceConfig] Unified distance configuration loaded - Player-centered world rendering');