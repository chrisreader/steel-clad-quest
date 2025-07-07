// FOG-SYNCHRONIZED RENDER DISTANCES - All distances now sync with fog for optimal performance
export const FOG_CONFIG = {
  // Fog settings - natural view limits like real environments
  NEAR: 50,    // Fog starts at 50 units
  FAR: 300,    // Fog completely obscures at 300 units
  DENSITY: 0.008, // Fog density for exponential falloff
};

export const RENDER_DISTANCES = {
  // LOD ZONES - Multi-level detail system synchronized with fog
  LOD_ZONES: {
    HIGH_DETAIL: { min: 0, max: 100 },      // Full detail, all features
    MEDIUM_DETAIL: { min: 100, max: 200 },   // Reduced polygons, simplified materials
    LOW_DETAIL: { min: 200, max: FOG_CONFIG.FAR }, // Ultra-low poly, basic materials
    CULLED: FOG_CONFIG.FAR + 50             // Complete culling beyond fog + buffer
  },
  
  // DENSITY RINGS - Higher density closer to player
  DENSITY_RINGS: [
    { radius: 80, multiplier: 1.0 },    // Full density within 80 units
    { radius: 150, multiplier: 0.7 },   // 70% density at medium range
    { radius: 250, multiplier: 0.4 },   // 40% density at far range
    { radius: FOG_CONFIG.FAR, multiplier: 0.2 } // 20% density at fog limit
  ],
  
  // FEATURE RENDER DISTANCES - All sync with fog limits
  TERRAIN: FOG_CONFIG.FAR + 100,  // Terrain slightly beyond fog for seamless experience
  TREES: FOG_CONFIG.FAR,          // Trees fade into fog naturally
  ROCKS: FOG_CONFIG.FAR,          // Rocks fade into fog naturally  
  BUSHES: FOG_CONFIG.FAR * 0.8,   // Bushes disappear before fog limit (less important)
  CLOUDS: 500,                    // Clouds can be seen through fog
  ENEMIES: 250,                   // Enemies within fog visibility
  BIRDS: 200,                     // Birds within clear visibility
  
  // SPAWN MANAGEMENT - Smart spawning within fog visibility
  SPAWN: {
    MIN_DISTANCE: 60,             // Don't spawn too close to player
    MAX_DISTANCE: FOG_CONFIG.FAR * 0.6, // Spawn within 60% of fog limit
    DENSITY_SPAWN_RADIUS: 120     // Area where full density spawning occurs
  },
  
  // PROGRESSIVE QUALITY - Automatic quality reduction
  QUALITY_ZONES: {
    SHADOWS_CUTOFF: 120,          // No shadows beyond this distance
    TEXTURE_LOD_START: 80,        // Start reducing texture quality
    INSTANCING_START: 150,        // Use instanced rendering beyond this
    BILLBOARD_START: 220          // Use billboards beyond this
  },
  
  // PERFORMANCE LIMITS - Adaptive system
  MAX_FEATURES_PER_FRAME: 50,     // Limit feature generation per frame
  MAX_ACTIVE_FEATURES: 2000,      // Total active features limit
  FPS_TARGET: 60,                 // Target FPS for quality scaling
  QUALITY_SCALE_THRESHOLD: 45,    // Reduce quality if FPS drops below this
  
  // BACKWARDS COMPATIBILITY - Legacy properties for existing systems
  MASTER_CULL_DISTANCE: FOG_CONFIG.FAR + 100,  // Complete culling distance
  FADE_IN_DISTANCE: FOG_CONFIG.FAR * 0.6,      // Start becoming visible
  FADE_OUT_DISTANCE: FOG_CONFIG.FAR * 0.8,     // Start becoming invisible
  REGION_UNLOAD_MULTIPLIER: 1.5                // Region unloading multiplier
};

console.log('🎯 [RenderDistanceConfig] Unified distance configuration loaded - Player-centered world rendering');