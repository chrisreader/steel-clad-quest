
import * as THREE from 'three';
import { noise } from 'noisejs';
import { RegionCoordinates } from '../../RingQuadrantSystem';

export interface GeologicalBias {
  direction: THREE.Vector2;
  strength: number;
  range: number;
}

export interface GeologicalZone {
  center: THREE.Vector3;
  radius: number;
  type: 'hotspot' | 'valley';
  intensity: number;
}

export interface QuadrantCharacteristics {
  name: string;
  weatheringBonus: number;
  clusteringBias: number;
  sizeModifier: number;
  densityModifier: number;
  noiseSeed: number;
}

export class NoiseBasedDistributionSystem {
  private noise = new noise.Noise(Math.random());
  private geologicalBiases: Map<string, GeologicalBias> = new Map();
  private geologicalZones: Map<string, GeologicalZone[]> = new Map();

  // Quadrant-specific characteristics
  private quadrantCharacteristics: QuadrantCharacteristics[] = [
    { name: 'NE_Riverbed', weatheringBonus: 0.3, clusteringBias: 0.6, sizeModifier: 0.8, densityModifier: 0.7, noiseSeed: 1234 },
    { name: 'SE_HillCountry', weatheringBonus: 0.1, clusteringBias: 1.4, sizeModifier: 1.3, densityModifier: 1.2, noiseSeed: 5678 },
    { name: 'SW_Plains', weatheringBonus: 0.2, clusteringBias: 0.3, sizeModifier: 1.5, densityModifier: 0.4, noiseSeed: 9012 },
    { name: 'NW_BrokenTerrain', weatheringBonus: 0.4, clusteringBias: 1.8, sizeModifier: 1.1, densityModifier: 1.6, noiseSeed: 3456 }
  ];

  // Ring-based size distribution weights
  private ringDistributions = [
    { tiny: 0.60, small: 0.25, medium: 0.12, large: 0.03, massive: 0.00 }, // Ring 0
    { tiny: 0.25, small: 0.20, medium: 0.35, large: 0.15, massive: 0.05 }, // Ring 1  
    { tiny: 0.15, small: 0.10, medium: 0.35, large: 0.25, massive: 0.15 }, // Ring 2
    { tiny: 0.10, small: 0.05, medium: 0.25, large: 0.35, massive: 0.25 }  // Ring 3
  ];

  constructor() {
    console.log("🌋 NoiseBasedDistributionSystem initialized with geological variation");
  }

  public generateGeologicalBias(region: RegionCoordinates): GeologicalBias {
    const regionKey = `${region.ringIndex}-${region.quadrant}`;
    
    if (this.geologicalBiases.has(regionKey)) {
      return this.geologicalBiases.get(regionKey)!;
    }

    const characteristics = this.quadrantCharacteristics[region.quadrant];
    
    // Create bias vector that shifts density away from perfect circles
    const biasAngle = (region.quadrant * Math.PI / 2) + (Math.PI / 4); // Point toward quadrant center
    const biasDirection = new THREE.Vector2(
      Math.cos(biasAngle),
      Math.sin(biasAngle)
    );

    const bias: GeologicalBias = {
      direction: biasDirection,
      strength: 0.3 + (characteristics.densityModifier - 1.0) * 0.2,
      range: 50 + region.ringIndex * 25
    };

    this.geologicalBiases.set(regionKey, bias);
    return bias;
  }

  public generateGeologicalZones(region: RegionCoordinates, centerPosition: THREE.Vector3): GeologicalZone[] {
    const regionKey = `${region.ringIndex}-${region.quadrant}`;
    
    if (this.geologicalZones.has(regionKey)) {
      return this.geologicalZones.get(regionKey)!;
    }

    const characteristics = this.quadrantCharacteristics[region.quadrant];
    const zones: GeologicalZone[] = [];
    
    // Generate 2-4 geological zones per region
    const zoneCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < zoneCount; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const distance = Math.random() * 40;
      const zoneCenter = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * distance
      );

      const zoneType = Math.random() < 0.6 ? 'hotspot' : 'valley';
      const zone: GeologicalZone = {
        center: zoneCenter,
        radius: 15 + Math.random() * 20,
        type: zoneType,
        intensity: 0.4 + Math.random() * 0.4
      };

      zones.push(zone);
    }

    this.geologicalZones.set(regionKey, zones);
    return zones;
  }

  public calculateDensityMultiplier(position: THREE.Vector3, region: RegionCoordinates): number {
    const characteristics = this.quadrantCharacteristics[region.quadrant];
    
    // Base noise layers for organic variation
    const scale1 = 0.02;
    const scale2 = 0.05;
    const scale3 = 0.1;
    
    const noise1 = this.noise.perlin2(position.x * scale1, position.z * scale1);
    const noise2 = this.noise.perlin2(position.x * scale2, position.z * scale2) * 0.5;
    const noise3 = this.noise.perlin2(position.x * scale3, position.z * scale3) * 0.25;
    
    let densityMultiplier = (noise1 + noise2 + noise3) * 0.8 + 1.0;

    // Apply geological bias
    const bias = this.generateGeologicalBias(region);
    const regionCenter = new THREE.Vector3(0, 0, 0); // Simplified center
    const toBias = new THREE.Vector2(position.x - regionCenter.x, position.z - regionCenter.z);
    const biasInfluence = toBias.dot(bias.direction) * bias.strength * 0.01;
    densityMultiplier += biasInfluence;

    // Apply geological zones
    const zones = this.geologicalZones.get(`${region.ringIndex}-${region.quadrant}`) || [];
    for (const zone of zones) {
      const distance = position.distanceTo(zone.center);
      if (distance < zone.radius) {
        const zoneInfluence = (1.0 - distance / zone.radius) * zone.intensity;
        if (zone.type === 'hotspot') {
          densityMultiplier += zoneInfluence * 0.8;
        } else {
          densityMultiplier -= zoneInfluence * 0.6;
        }
      }
    }

    // Apply quadrant characteristics
    densityMultiplier *= characteristics.densityModifier;

    return Math.max(0.1, Math.min(2.5, densityMultiplier));
  }

  public getModifiedSizeDistribution(region: RegionCoordinates, position: THREE.Vector3): any {
    const baseDistribution = this.ringDistributions[Math.min(region.ringIndex, 3)];
    const characteristics = this.quadrantCharacteristics[region.quadrant];
    
    // Apply geographic noise modifiers (±40% variation)
    const noiseValue = this.noise.perlin2(position.x * 0.01, position.z * 0.01);
    const variationFactor = 1.0 + (noiseValue * 0.4);
    
    // Apply quadrant size modifier
    const sizeModifier = characteristics.sizeModifier * variationFactor;
    
    // Shift distribution based on modifiers
    const modified = { ...baseDistribution };
    
    if (sizeModifier > 1.0) {
      // Favor larger rocks
      const shift = (sizeModifier - 1.0) * 0.3;
      modified.tiny = Math.max(0.05, modified.tiny - shift);
      modified.small = Math.max(0.05, modified.small - shift * 0.5);
      modified.large = Math.min(0.6, modified.large + shift * 0.7);
      modified.massive = Math.min(0.4, modified.massive + shift * 0.8);
    } else {
      // Favor smaller rocks
      const shift = (1.0 - sizeModifier) * 0.3;
      modified.tiny = Math.min(0.8, modified.tiny + shift);
      modified.small = Math.min(0.6, modified.small + shift * 0.7);
      modified.large = Math.max(0.0, modified.large - shift * 0.5);
      modified.massive = Math.max(0.0, modified.massive - shift);
    }

    return modified;
  }

  public getQuadrantCharacteristics(quadrant: number): QuadrantCharacteristics {
    return this.quadrantCharacteristics[quadrant];
  }

  public blurRingBoundaries(position: THREE.Vector3, originalRing: number): number {
    // Create organic transition zones that blur ring boundaries
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    const transitionNoise = this.noise.perlin2(position.x * 0.03, position.z * 0.03);
    
    // Add noise-based variation to ring boundaries
    const noiseOffset = transitionNoise * 15; // ±15 unit variation
    const adjustedDistance = distanceFromCenter + noiseOffset;
    
    // Recalculate ring based on adjusted distance
    if (adjustedDistance < 50) return 0;
    if (adjustedDistance < 120) return 1;
    if (adjustedDistance < 200) return 2;
    return 3;
  }
}
