
export const TIME_PHASES = {
  NIGHT_START: 0.0,
  NIGHT_END: 0.15,
  DAWN_START: 0.15,
  DAWN_END: 0.25,
  DAY_START: 0.25,
  DAY_END: 0.7,
  SUNSET_START: 0.7,
  SUNSET_END: 0.8,
  CIVIL_TWILIGHT_START: 0.8,
  CIVIL_TWILIGHT_END: 0.85,
  NAUTICAL_TWILIGHT_START: 0.85,
  NAUTICAL_TWILIGHT_END: 0.9,
  ASTRONOMICAL_TWILIGHT_START: 0.9,
  ASTRONOMICAL_TWILIGHT_END: 1.0
};

export const DAY_NIGHT_CONFIG = {
  cycleSpeed: 1 / 60, // 1-minute cycle
  sunRadius: 150,
  moonRadius: 140,
  shadowUpdateThreshold: 10,
  shadowCameraSize: 200
};

export const LIGHTING_CONFIG = {
  ambient: {
    color: 0x404040,
    baseIntensity: 1.0
  },
  directional: {
    color: 0xffffff,
    intensity: 1.2,
    shadowMapSize: 4096,
    shadowBias: -0.00005,
    shadowNormalBias: 0.003,
    shadowCameraNear: 0.1,
    shadowCameraFar: 500
  },
  moon: {
    color: 0x6495ED,
    baseIntensity: 0.4
  },
  tavern: {
    color: 0xFFB366,
    intensity: 1.2,
    distance: 40,
    shadowMapSize: 1024,
    shadowBias: -0.00005
  },
  fill: {
    color: 0xB0E0E6,
    position: { x: -10, y: 15, z: -10 }
  },
  rim: {
    color: 0xB0E0E6,
    position: { x: -12, y: 8, z: -12 }
  }
};

export const FOG_CONFIG = {
  near: 25,
  far: 120
};

// Realistic color palettes for each phase
export const SKY_COLOR_PALETTES = {
  night: {
    zenith: 0x000428,
    horizon: 0x004e92
  },
  dawn: {
    zenith: 0x87CEEB,
    horizon: 0xFFC373  // Less pink, more natural orange
  },
  day: {
    zenith: 0x4A90E2,
    horizon: 0xB0C4DE  // More blue-white, less sky blue
  },
  sunset: {
    zenith: 0x4A5D7A,
    horizon: 0xFF6B35
  },
  civilTwilight: {
    zenith: 0x1a1a3a,
    horizon: 0x4A5D7A
  },
  nauticalTwilight: {
    zenith: 0x0f0f2a,
    horizon: 0x1a1a3a
  },
  astronomicalTwilight: {
    zenith: 0x080820,
    horizon: 0x0f0f2a
  }
};

export const FOG_COLOR_PALETTES = {
  night: 0x000050,
  dawn: 0x8B9DC3,     // Softer blue-gray instead of bright cream
  day: 0x87CEEB,      // Cleaner blue-white instead of steel blue
  sunset: 0xFF8C42,
  civilTwilight: 0x2E2E5E,
  nauticalTwilight: 0x1A1A3A,
  astronomicalTwilight: 0x0D0D26
};
