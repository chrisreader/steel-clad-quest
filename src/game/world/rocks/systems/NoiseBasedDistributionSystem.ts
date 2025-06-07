
import { Noise } from 'noisejs';
import * as THREE from 'three';
import { RegionCoordinates } from '../../RingQuadrantSystem';

export interface GeologicalVariation {
  densityMultiplier: number;
  biasVector: THREE.Vector2;
  isHotspot: boolean;
  isValley: boolean;
  transitionWeight: number;
}

export class NoiseBasedDistributionSystem {
  private densityNoise: Noise;
  private biasNoiseX: Noise;
  private biasNoiseY: Noise;
  private hotspotNoise: Noise;
  private transitionNoise: Noise;
  
  private readonly DENSITY_SCALE = 0.003; // Scale for density variation
  private readonly BIAS_SCALE = 0.002; // Scale for directional bias
  private readonly HOTSPOT_SCALE = 0.001; // Scale for hotspot detection
  private readonly TRANSITION_SCALE = 0.004; // Scale for transition zones
  
  constructor(seed: number = Math.random() * 1000) {
    this.densityNoise = new Noise(seed);
    this.biasNoiseX = new Noise(seed + 100);
    this.biasNoiseY = new Noise(seed + 200);
    this.hotspotNoise = new Noise(seed + 300);
    this.transitionNoise = new Noise(seed + 400);
    
    console.log("🌍 NoiseBasedDistributionSystem initialized with organic geological variation");
  }
  
  public getGeologicalVariation(position: THREE.Vector3, ringIndex: number): GeologicalVariation {
    const x = position.x;
    const z = position.z;
    
    // Multi-octave density variation (0.3 - 1.8 range)
    const densityBase = this.densityNoise.perlin2(x * this.DENSITY_SCALE, z * this.DENSITY_SCALE);
    const densityDetail = this.densityNoise.perlin2(x * this.DENSITY_SCALE * 3, z * this.DENSITY_SCALE * 3) * 0.3;
    const rawDensity = densityBase + densityDetail;
    const densityMultiplier = 0.3 + (rawDensity + 1) * 0.75; // Map to 0.3-1.8 range
    
    // Geological bias vectors for non-circular distribution
    const biasX = this.biasNoiseX.perlin2(x * this.BIAS_SCALE, z * this.BIAS_SCALE) * 20;
    const biasZ = this.biasNoiseY.perlin2(x * this.BIAS_SCALE, z * this.BIAS_SCALE) * 20;
    const biasVector = new THREE.Vector2(biasX, biasZ);
    
    // Hotspot detection (high density areas)
    const hotspotValue = this.hotspotNoise.perlin2(x * this.HOTSPOT_SCALE, z * this.HOTSPOT_SCALE);
    const isHotspot = hotspotValue > 0.6;
    
    // Valley detection (low density areas)
    const isValley = hotspotValue < -0.5;
    
    // Transition zone weight for blending between rings
    const transitionBase = this.transitionNoise.perlin2(x * this.TRANSITION_SCALE, z * this.TRANSITION_SCALE);
    const transitionWeight = Math.max(0, Math.min(1, (transitionBase + 1) * 0.5));
    
    // Apply ring-specific modifiers
    let finalDensity = densityMultiplier;
    
    if (isHotspot) {
      finalDensity *= 2.2; // Significantly increase density in hotspots
    } else if (isValley) {
      finalDensity *= 0.2; // Create clear areas in valleys
    }
    
    // Ring-based density scaling
    const ringDensityModifier = this.getRingDensityModifier(ringIndex);
    finalDensity *= ringDensityModifier;
    
    return {
      densityMultiplier: Math.max(0.1, Math.min(3.0, finalDensity)),
      biasVector,
      isHotspot,
      isValley,
      transitionWeight
    };
  }
  
  private getRingDensityModifier(ringIndex: number): number {
    // Base density increases with distance from settlement
    switch (ringIndex) {
      case 0: return 0.3; // Settlement area - very sparse
      case 1: return 0.8; // Transition area - moderate
      case 2: return 1.2; // Wild area - dense
      case 3: return 1.5; // Chaotic area - very dense
      default: return 1.0;
    }
  }
  
  public getOrganicSpawnPosition(basePosition: THREE.Vector3, variation: GeologicalVariation): THREE.Vector3 {
    // Apply geological bias to create non-circular distributions
    const organicPosition = basePosition.clone();
    organicPosition.x += variation.biasVector.x;
    organicPosition.z += variation.biasVector.y;
    
    // Add small random variation for micro-positioning
    organicPosition.x += (Math.random() - 0.5) * 2;
    organicPosition.z += (Math.random() - 0.5) * 2;
    
    return organicPosition;
  }
  
  public shouldSpawnRock(position: THREE.Vector3, ringIndex: number, baseSpawnChance: number): boolean {
    const variation = this.getGeologicalVariation(position, ringIndex);
    const modifiedChance = baseSpawnChance * variation.densityMultiplier;
    
    return Math.random() < modifiedChance;
  }
}
