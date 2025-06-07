
import * as THREE from 'three';
import { RegionCoordinates } from '../../RingQuadrantSystem';
import { NoiseBasedDistributionSystem, GeologicalVariation } from './NoiseBasedDistributionSystem';
import { DiscoveryZoneManager } from './DiscoveryZoneManager';
import { ROCK_VARIATIONS, RockVariation } from '../config/RockVariationConfig';

export interface RingDistributionConfig {
  ringIndex: number;
  sizeDistribution: {
    tiny: number;
    small: number;
    medium: number;
    large: number;
    massive: number;
  };
  baseSpawnChance: number;
  clusteringFactor: number;
}

export class EnhancedRockDistributionSystem {
  private noiseSystem: NoiseBasedDistributionSystem;
  private discoveryZoneManager: DiscoveryZoneManager;
  private ringConfigs: Map<number, RingDistributionConfig> = new Map();
  
  constructor(seed?: number) {
    this.noiseSystem = new NoiseBasedDistributionSystem(seed);
    this.discoveryZoneManager = new DiscoveryZoneManager();
    
    this.initializeRingConfigurations();
    console.log("⚡ EnhancedRockDistributionSystem initialized with organic distribution");
  }
  
  private initializeRingConfigurations(): void {
    // Ring 0: Settlement area (85% tiny/small, 12% medium, 3% large)
    this.ringConfigs.set(0, {
      ringIndex: 0,
      sizeDistribution: {
        tiny: 0.55,
        small: 0.30,
        medium: 0.12,
        large: 0.03,
        massive: 0.0
      },
      baseSpawnChance: 0.15,
      clusteringFactor: 0.3
    });
    
    // Ring 1: Balanced natural (45% tiny/small, 35% medium, 15% large, 5% massive)
    this.ringConfigs.set(1, {
      ringIndex: 1,
      sizeDistribution: {
        tiny: 0.25,
        small: 0.20,
        medium: 0.35,
        large: 0.15,
        massive: 0.05
      },
      baseSpawnChance: 0.25,
      clusteringFactor: 0.6
    });
    
    // Ring 2: Wild geology (25% tiny/small, 35% medium, 25% large, 15% massive)
    this.ringConfigs.set(2, {
      ringIndex: 2,
      sizeDistribution: {
        tiny: 0.15,
        small: 0.10,
        medium: 0.35,
        large: 0.25,
        massive: 0.15
      },
      baseSpawnChance: 0.35,
      clusteringFactor: 0.8
    });
    
    // Ring 3: Chaotic formations (15% tiny/small, 25% medium, 35% large, 25% massive)
    this.ringConfigs.set(3, {
      ringIndex: 3,
      sizeDistribution: {
        tiny: 0.08,
        small: 0.07,
        medium: 0.25,
        large: 0.35,
        massive: 0.25
      },
      baseSpawnChance: 0.45,
      clusteringFactor: 1.0
    });
    
    console.log("🌍 Ring-based size distribution configurations initialized");
  }
  
  public shouldSpawnRock(position: THREE.Vector3, regionCoords: RegionCoordinates): boolean {
    const config = this.ringConfigs.get(regionCoords.ringIndex);
    if (!config) return false;
    
    return this.noiseSystem.shouldSpawnRock(position, regionCoords.ringIndex, config.baseSpawnChance);
  }
  
  public selectRockVariation(position: THREE.Vector3, regionCoords: RegionCoordinates): RockVariation | null {
    const config = this.ringConfigs.get(regionCoords.ringIndex);
    if (!config) return null;
    
    const variation = this.noiseSystem.getGeologicalVariation(position, regionCoords.ringIndex);
    
    // Apply geographic noise modifiers (±40% variation)
    const noiseModifier = 0.6 + (variation.transitionWeight * 0.8); // 0.6 to 1.4 range
    
    // Select size category based on ring distribution
    const sizeCategory = this.selectSizeCategory(config.sizeDistribution, noiseModifier);
    
    // Find matching rock variations for this size category
    const matchingVariations = ROCK_VARIATIONS.filter(rv => rv.category === sizeCategory);
    if (matchingVariations.length === 0) return null;
    
    // Weight selection by variation weights
    const totalWeight = matchingVariations.reduce((sum, rv) => sum + rv.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const rockVariation of matchingVariations) {
      random -= rockVariation.weight;
      if (random <= 0) {
        return rockVariation;
      }
    }
    
    return matchingVariations[0]; // Fallback
  }
  
  private selectSizeCategory(distribution: RingDistributionConfig['sizeDistribution'], noiseModifier: number): RockVariation['category'] {
    // Apply noise modifier to distribution weights
    const modifiedDistribution = {
      tiny: distribution.tiny * noiseModifier,
      small: distribution.small * noiseModifier,
      medium: distribution.medium * noiseModifier,
      large: distribution.large * noiseModifier,
      massive: distribution.massive * noiseModifier
    };
    
    // Normalize to ensure they sum to 1
    const total = Object.values(modifiedDistribution).reduce((sum, val) => sum + val, 0);
    Object.keys(modifiedDistribution).forEach(key => {
      modifiedDistribution[key as keyof typeof modifiedDistribution] /= total;
    });
    
    // Select category based on weighted random
    let random = Math.random();
    
    if (random < modifiedDistribution.tiny) return 'tiny';
    random -= modifiedDistribution.tiny;
    
    if (random < modifiedDistribution.small) return 'small';
    random -= modifiedDistribution.small;
    
    if (random < modifiedDistribution.medium) return 'medium';
    random -= modifiedDistribution.medium;
    
    if (random < modifiedDistribution.large) return 'large';
    
    return 'massive';
  }
  
  public getOrganicSpawnPosition(basePosition: THREE.Vector3, regionCoords: RegionCoordinates): THREE.Vector3 {
    const variation = this.noiseSystem.getGeologicalVariation(basePosition, regionCoords.ringIndex);
    return this.noiseSystem.getOrganicSpawnPosition(basePosition, variation);
  }
  
  public shouldCreateCluster(position: THREE.Vector3, rockVariation: RockVariation, regionCoords: RegionCoordinates): boolean {
    if (!rockVariation.isCluster) return false;
    
    const config = this.ringConfigs.get(regionCoords.ringIndex);
    if (!config) return false;
    
    const variation = this.noiseSystem.getGeologicalVariation(position, regionCoords.ringIndex);
    const clusterChance = config.clusteringFactor * variation.densityMultiplier * 0.3;
    
    return Math.random() < clusterChance;
  }
  
  public registerRockFormation(regionCoords: RegionCoordinates, position: THREE.Vector3, size: number): void {
    const regionKey = `${regionCoords.ringIndex}_${regionCoords.quadrant}`;
    this.discoveryZoneManager.registerRockFormation(regionKey, position, size);
  }
  
  public generateDiscoveryZones(regionCoords: RegionCoordinates): void {
    this.discoveryZoneManager.analyzeAndCreateZones(regionCoords);
  }
  
  public getGeologicalVariation(position: THREE.Vector3, ringIndex: number): GeologicalVariation {
    return this.noiseSystem.getGeologicalVariation(position, ringIndex);
  }
  
  public getDiscoveryZoneManager(): DiscoveryZoneManager {
    return this.discoveryZoneManager;
  }
  
  public getRingConfig(ringIndex: number): RingDistributionConfig | undefined {
    return this.ringConfigs.get(ringIndex);
  }
  
  public dispose(): void {
    this.discoveryZoneManager.dispose();
    console.log("⚡ EnhancedRockDistributionSystem disposed");
  }
}
