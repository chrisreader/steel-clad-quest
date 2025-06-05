
export const TIME_PHASES = {
  NIGHT_START: 0.0,
  NIGHT_END: 0.12,
  DAWN_START: 0.12,
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
    color: 0x1a1a2e, // Cooler night color
    baseIntensity: 0.8
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
    color: 0x4a5d7a, // Cooler moon color
    baseIntensity: 0.25 // Reduced moon influence
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

// More realistic color palettes with darker pre-sunrise colors
export const SKY_COLOR_PALETTES = {
  night: {
    zenith: 0x000428,
    horizon: 0x001122
  },
  dawn: {
    zenith: 0x1a1a3a, // Much darker dawn zenith
    horizon: 0x4a3c5a  // Muted purple instead of bright orange
  },
  day: {
    zenith: 0x4A90E2,
    horizon: 0xB0C4DE
  },
  sunset: {
    zenith: 0x4A5D7A,
    horizon: 0xFF6B35
  },
  civilTwilight: {
    zenith: 0x1a1a3a,
    horizon: 0x2a2a4a
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
  night: 0x000040,
  dawn: 0x2a2a4a,     // Much darker dawn fog
  day: 0x87CEEB,
  sunset: 0xFF8C42,
  civilTwilight: 0x1e1e3e,
  nauticalTwilight: 0x1a1a3a,
  astronomicalTwilight: 0x0d0d26
};
