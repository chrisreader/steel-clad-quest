import * as THREE from 'three';
import { RENDER_DISTANCES, FOG_CONFIG } from '../config/RenderDistanceConfig';

export interface DensityZone {
  center: THREE.Vector3;
  radius: number;
  multiplier: number;
  featureTypes: ('trees' | 'rocks' | 'bushes' | 'all')[];
}

export class SmartDensityManager {
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private customDensityZones: DensityZone[] = [];
  
  constructor() {
    console.log('🌍 [SmartDensityManager] Intelligent density system initialized');
  }

  public updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
  }

  public addDensityZone(zone: DensityZone): void {
    this.customDensityZones.push(zone);
    console.log(`🌍 [Density] Added custom density zone at ${zone.center.x}, ${zone.center.z} with ${zone.multiplier}x multiplier`);
  }

  public getDensityMultiplier(position: THREE.Vector3, featureType: 'trees' | 'rocks' | 'bushes'): number {
    const distanceToPlayer = this.playerPosition.distanceTo(position);
    
    // Base density based on distance from player (density rings)
    let baseDensity = this.getBaseDensityFromDistance(distanceToPlayer);
    
    // Apply custom density zones
    let customMultiplier = 1.0;
    for (const zone of this.customDensityZones) {
      const distanceToZone = position.distanceTo(zone.center);
      if (distanceToZone <= zone.radius) {
        if (zone.featureTypes.includes(featureType) || zone.featureTypes.includes('all')) {
          // Use inverse distance for smooth falloff within zone
          const zoneInfluence = 1.0 - (distanceToZone / zone.radius);
          customMultiplier *= 1.0 + (zone.multiplier - 1.0) * zoneInfluence;
        }
      }
    }
    
    // Performance-based scaling
    const performanceScale = this.getPerformanceScaling();
    
    // Fog visibility optimization - reduce density of features that won't be visible
    const fogVisibilityScale = this.getFogVisibilityScale(distanceToPlayer);
    
    const finalDensity = baseDensity * customMultiplier * performanceScale * fogVisibilityScale;
    
    return Math.max(0.1, Math.min(2.0, finalDensity)); // Clamp between 0.1 and 2.0
  }

  private getBaseDensityFromDistance(distance: number): number {
    const { DENSITY_RINGS } = RENDER_DISTANCES;
    
    // Find the appropriate density ring
    for (let i = 0; i < DENSITY_RINGS.length; i++) {
      if (distance <= DENSITY_RINGS[i].radius) {
        return DENSITY_RINGS[i].multiplier;
      }
    }
    
    // Beyond all rings, use minimal density
    return 0.1;
  }

  private getPerformanceScaling(): number {
    // This would ideally connect to a performance monitor
    // For now, return a conservative scaling
    return 0.8; // 80% of full density for better performance
  }

  private getFogVisibilityScale(distance: number): number {
    // Features close to or beyond fog limit get reduced density since they're barely visible
    if (distance > FOG_CONFIG.FAR * 0.8) {
      // Start reducing density at 80% of fog distance
      const fadeStart = FOG_CONFIG.FAR * 0.8;
      const fadeRange = FOG_CONFIG.FAR * 0.2;
      const fadeProgress = (distance - fadeStart) / fadeRange;
      return Math.max(0.2, 1.0 - fadeProgress * 0.8); // Reduce to 20% density near fog limit
    }
    
    return 1.0; // Full density within clear visibility
  }

  public shouldSpawnFeature(
    position: THREE.Vector3, 
    featureType: 'trees' | 'rocks' | 'bushes',
    baseSpawnChance: number
  ): boolean {
    const densityMultiplier = this.getDensityMultiplier(position, featureType);
    const adjustedChance = baseSpawnChance * densityMultiplier;
    
    return Math.random() < adjustedChance;
  }

  public getOptimalFeatureCount(
    regionSize: number,
    featureType: 'trees' | 'rocks' | 'bushes',
    regionCenter: THREE.Vector3
  ): number {
    const baseCounts = {
      trees: { min: 8, max: 25 },
      rocks: { min: 3, max: 12 },
      bushes: { min: 10, max: 30 }
    };

    const baseRange = baseCounts[featureType];
    const distanceToPlayer = this.playerPosition.distanceTo(regionCenter);
    const densityMultiplier = this.getDensityMultiplier(regionCenter, featureType);
    
    // Calculate optimal count based on density
    const baseCount = baseRange.min + (baseRange.max - baseRange.min) * densityMultiplier;
    
    // Scale by region size
    const sizeScale = Math.min(2.0, regionSize / 100);
    
    // Performance limit - don't spawn too many features at once
    const maxFeaturesPerType = Math.floor(RENDER_DISTANCES.MAX_FEATURES_PER_FRAME / 3);
    
    const finalCount = Math.floor(baseCount * sizeScale);
    return Math.min(finalCount, maxFeaturesPerType);
  }

  public createForestCluster(center: THREE.Vector3, radius: number): void {
    this.addDensityZone({
      center: center.clone(),
      radius,
      multiplier: 2.5, // 2.5x tree density in forests
      featureTypes: ['trees']
    });
    
    // Add some bushes around the forest edge
    this.addDensityZone({
      center: center.clone(),
      radius: radius * 1.2,
      multiplier: 1.8,
      featureTypes: ['bushes']
    });
  }

  public createRockField(center: THREE.Vector3, radius: number): void {
    this.addDensityZone({
      center: center.clone(),
      radius,
      multiplier: 3.0, // 3x rock density in rock fields
      featureTypes: ['rocks']
    });
  }

  public createClearingZone(center: THREE.Vector3, radius: number): void {
    this.addDensityZone({
      center: center.clone(),
      radius,
      multiplier: 0.2, // Minimal features in clearings
      featureTypes: ['all']
    });
  }

  public getDebugInfo(): any {
    return {
      playerPosition: this.playerPosition,
      densityZones: this.customDensityZones.length,
      activeDensityRings: RENDER_DISTANCES.DENSITY_RINGS
    };
  }

  public clearDensityZones(): void {
    this.customDensityZones = [];
    console.log('🌍 [SmartDensityManager] All custom density zones cleared');
  }

  public dispose(): void {
    this.clearDensityZones();
    console.log('🌍 [SmartDensityManager] Disposed');
  }
}