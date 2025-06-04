
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
