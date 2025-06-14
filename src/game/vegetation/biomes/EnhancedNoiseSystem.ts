
import * as THREE from 'three';

export interface NoiseLayer {
  scale: number;
  amplitude: number;
  offset: THREE.Vector2;
}

export interface EnvironmentalFactors {
  temperature: number; // -1 to 1
  moisture: number;    // -1 to 1
  elevation: number;   // -1 to 1
}

export interface VoronoiSeed {
  position: THREE.Vector2;
  biomeType: string;
  strength: number;
}

export class EnhancedNoiseSystem {
  private static temperatureLayers: NoiseLayer[] = [
    { scale: 0.0008, amplitude: 1.0, offset: new THREE.Vector2(0, 0) },
    { scale: 0.002, amplitude: 0.5, offset: new THREE.Vector2(100, 200) },
    { scale: 0.006, amplitude: 0.25, offset: new THREE.Vector2(300, 400) }
  ];

  private static moistureLayers: NoiseLayer[] = [
    { scale: 0.001, amplitude: 1.0, offset: new THREE.Vector2(500, 600) },
    { scale: 0.003, amplitude: 0.6, offset: new THREE.Vector2(700, 800) },
    { scale: 0.008, amplitude: 0.3, offset: new THREE.Vector2(900, 1000) }
  ];

  private static elevationLayers: NoiseLayer[] = [
    { scale: 0.0005, amplitude: 1.0, offset: new THREE.Vector2(1100, 1200) },
    { scale: 0.0015, amplitude: 0.4, offset: new THREE.Vector2(1300, 1400) },
    { scale: 0.005, amplitude: 0.2, offset: new THREE.Vector2(1500, 1600) }
  ];

  // Voronoi seeds for biome centers (scattered around world)
  private static voronoiSeeds: VoronoiSeed[] = [
    { position: new THREE.Vector2(0, 0), biomeType: 'normal', strength: 1.0 },
    { position: new THREE.Vector2(400, 300), biomeType: 'meadow', strength: 1.2 },
    { position: new THREE.Vector2(-300, 500), biomeType: 'prairie', strength: 1.1 },
    { position: new THREE.Vector2(800, -200), biomeType: 'meadow', strength: 0.9 },
    { position: new THREE.Vector2(-600, -400), biomeType: 'prairie', strength: 1.0 },
    { position: new THREE.Vector2(200, 700), biomeType: 'normal', strength: 0.8 },
    { position: new THREE.Vector2(-800, 100), biomeType: 'meadow', strength: 1.1 },
    { position: new THREE.Vector2(600, 600), biomeType: 'prairie', strength: 1.0 }
  ];

  /**
   * Generate multi-octave fractal noise
   */
  public static generateFractalNoise(
    position: THREE.Vector2, 
    layers: NoiseLayer[], 
    seed: number = 0
  ): number {
    let value = 0;
    let totalAmplitude = 0;

    for (const layer of layers) {
      const sampleX = (position.x + layer.offset.x) * layer.scale;
      const sampleY = (position.y + layer.offset.y) * layer.scale;
      
      // Enhanced noise function with domain warping
      const noise1 = Math.sin(sampleX + seed * 0.001) * Math.cos(sampleY + seed * 0.001);
      const noise2 = Math.sin(sampleX * 1.7 + seed * 0.002) * Math.cos(sampleY * 1.7 + seed * 0.002);
      const combinedNoise = (noise1 + noise2 * 0.5) / 1.5;
      
      value += combinedNoise * layer.amplitude;
      totalAmplitude += layer.amplitude;
    }

    return value / totalAmplitude;
  }

  /**
   * Sample environmental factors at a world position
   */
  public static sampleEnvironmentalFactors(
    worldPosition: THREE.Vector3, 
    worldSeed: number
  ): EnvironmentalFactors {
    const pos2D = new THREE.Vector2(worldPosition.x, worldPosition.z);

    // Generate environmental layers with different characteristics
    const temperature = this.generateFractalNoise(pos2D, this.temperatureLayers, worldSeed);
    const moisture = this.generateFractalNoise(pos2D, this.moistureLayers, worldSeed + 1000);
    const elevation = this.generateFractalNoise(pos2D, this.elevationLayers, worldSeed + 2000);

    // Add latitude effect for temperature (colder further from center)
    const latitudeEffect = Math.abs(worldPosition.z * 0.001);
    const adjustedTemperature = temperature - latitudeEffect * 0.3;

    // Add river-like moisture patterns
    const riverNoise = Math.sin(worldPosition.x * 0.003) * Math.cos(worldPosition.z * 0.002);
    const adjustedMoisture = moisture + riverNoise * 0.4;

    return {
      temperature: Math.max(-1, Math.min(1, adjustedTemperature)),
      moisture: Math.max(-1, Math.min(1, adjustedMoisture)),
      elevation: Math.max(-1, Math.min(1, elevation))
    };
  }

  /**
   * Calculate Voronoi-influenced biome strength
   */
  public static calculateVoronoiBiomeInfluence(
    worldPosition: THREE.Vector3,
    biomeType: string
  ): number {
    const pos2D = new THREE.Vector2(worldPosition.x, worldPosition.z);
    let influence = 0;
    let totalWeight = 0;

    for (const seed of this.voronoiSeeds) {
      if (seed.biomeType === biomeType) {
        const distance = pos2D.distanceTo(seed.position);
        const maxInfluenceDistance = 800; // Maximum influence range
        
        if (distance < maxInfluenceDistance) {
          // Smooth falloff function
          const falloff = 1.0 - (distance / maxInfluenceDistance);
          const smoothFalloff = falloff * falloff * (3 - 2 * falloff); // Smoothstep
          
          const weight = smoothFalloff * seed.strength;
          influence += weight;
          totalWeight += weight;
        }
      }
    }

    return totalWeight > 0 ? influence / totalWeight : 0;
  }

  /**
   * Add turbulence for irregular biome shapes
   */
  public static addTurbulence(
    baseValue: number,
    position: THREE.Vector3,
    intensity: number = 0.3
  ): number {
    const turbulenceX = Math.sin(position.x * 0.02) * Math.cos(position.z * 0.025);
    const turbulenceZ = Math.cos(position.x * 0.018) * Math.sin(position.z * 0.022);
    const turbulence = (turbulenceX + turbulenceZ) * 0.5 * intensity;
    
    return baseValue + turbulence;
  }
}
