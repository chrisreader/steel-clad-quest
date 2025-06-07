
import * as THREE from 'three';
import { RegionCoordinates } from '../../RingQuadrantSystem';
import { RockVariation, ROCK_VARIATIONS } from '../config/RockVariationConfig';
import { NoiseBasedDistributionSystem } from './NoiseBasedDistributionSystem';
import { DiscoveryZoneManager, DiscoveryZone, ExplorationCorridor } from './DiscoveryZoneManager';

export interface RockPlacementResult {
  position: THREE.Vector3;
  variation: RockVariation;
  isCorridorMarker: boolean;
  isLandmark: boolean;
  discoveryZoneId?: string;
}

export class EnhancedRockDistributionSystem {
  private noiseSystem: NoiseBasedDistributionSystem;
  private discoveryZoneManager: DiscoveryZoneManager;
  private placedRocks: Map<string, THREE.Vector3[]> = new Map();

  constructor() {
    this.noiseSystem = new NoiseBasedDistributionSystem();
    this.discoveryZoneManager = new DiscoveryZoneManager();
    console.log("🌍 EnhancedRockDistributionSystem initialized with full geological features");
  }

  public generateRockDistribution(
    region: RegionCoordinates,
    centerPosition: THREE.Vector3,
    regionSize: number
  ): RockPlacementResult[] {
    const regionKey = `${region.ringIndex}-${region.quadrant}`;
    console.log(`🪨 Generating enhanced rock distribution for region ${regionKey}`);

    // Step 1: Apply noise-based variation to blur ring boundaries
    const adjustedRing = this.noiseSystem.blurRingBoundaries(centerPosition, region.ringIndex);
    const effectiveRegion = { ...region, ringIndex: adjustedRing };

    // Step 2: Get modified size distribution for this region
    const sizeDistribution = this.noiseSystem.getModifiedSizeDistribution(effectiveRegion, centerPosition);
    
    // Step 3: Generate initial rock positions using geological variation
    const initialRocks = this.generateGeologicallyVariedRocks(effectiveRegion, centerPosition, regionSize, sizeDistribution);
    
    // Step 4: Generate discovery zones based on initial rock placement
    const discoveryZones = this.discoveryZoneManager.generateDiscoveryZones(
      effectiveRegion,
      centerPosition,
      initialRocks.map(r => r.position)
    );

    // Step 5: Generate exploration corridors
    const corridors = this.discoveryZoneManager.generateExplorationCorridors(
      effectiveRegion,
      discoveryZones,
      initialRocks.map(r => r.position)
    );

    // Step 6: Add corridor markers and landmarks
    const enhancedRocks = this.addNavigationalElements(initialRocks, corridors, discoveryZones);

    // Step 7: Store positions for future reference
    this.placedRocks.set(regionKey, enhancedRocks.map(r => r.position));

    console.log(`✅ Generated ${enhancedRocks.length} rocks with ${discoveryZones.length} discovery zones and ${corridors.length} corridors`);
    
    return enhancedRocks;
  }

  private generateGeologicallyVariedRocks(
    region: RegionCoordinates,
    centerPosition: THREE.Vector3,
    regionSize: number,
    sizeDistribution: any
  ): RockPlacementResult[] {
    const rocks: RockPlacementResult[] = [];
    const quadrantCharacteristics = this.noiseSystem.getQuadrantCharacteristics(region.quadrant);
    
    // Generate geological zones for this region
    const geologicalZones = this.noiseSystem.generateGeologicalZones(region, centerPosition);
    
    // Calculate base rock count with geological variation
    const baseCount = this.calculateBaseRockCount(region, regionSize);
    const samplesPerRock = 3; // Multiple placement attempts per rock
    
    for (let attempt = 0; attempt < baseCount * samplesPerRock; attempt++) {
      const candidatePosition = this.generateCandidatePosition(centerPosition, regionSize);
      
      // Apply noise-based density calculation
      const densityMultiplier = this.noiseSystem.calculateDensityMultiplier(candidatePosition, region);
      
      // Probabilistic placement based on density
      if (Math.random() > densityMultiplier) {
        continue;
      }

      // Select rock variation based on modified distribution
      const variation = this.selectRockVariation(sizeDistribution, quadrantCharacteristics);
      
      // Ensure minimum spacing between rocks
      if (this.hasValidSpacing(candidatePosition, rocks.map(r => r.position), variation)) {
        rocks.push({
          position: candidatePosition,
          variation,
          isCorridorMarker: false,
          isLandmark: false
        });
      }

      // Stop when we have enough rocks
      if (rocks.length >= baseCount) {
        break;
      }
    }

    console.log(`🌋 Generated ${rocks.length} geologically varied rocks for ${quadrantCharacteristics.name}`);
    return rocks;
  }

  private addNavigationalElements(
    baseRocks: RockPlacementResult[],
    corridors: ExplorationCorridor[],
    zones: DiscoveryZone[]
  ): RockPlacementResult[] {
    const enhancedRocks = [...baseRocks];

    // Add corridor markers (breadcrumb rocks)
    for (const corridor of corridors) {
      for (let i = 1; i < corridor.path.length - 1; i += 2) {
        const pathPoint = corridor.path[i];
        
        // Add small marker rocks on both sides of corridor
        const perpendicular = this.getPerpendicularVector(corridor.path, i);
        const markerDistance = corridor.width / 2 + 1;

        for (const side of [-1, 1]) {
          const markerPosition = pathPoint.clone().add(
            perpendicular.clone().multiplyScalar(markerDistance * side)
          );

          // Use tiny rocks as breadcrumbs
          const markerVariation = ROCK_VARIATIONS.find(v => v.category === 'tiny') || ROCK_VARIATIONS[0];
          
          enhancedRocks.push({
            position: markerPosition,
            variation: markerVariation,
            isCorridorMarker: true,
            isLandmark: false
          });
        }
      }

      // Add landmark rocks
      for (const landmark of corridor.landmarks) {
        const landmarkVariation = ROCK_VARIATIONS.find(v => v.category === 'large') || ROCK_VARIATIONS[3];
        
        enhancedRocks.push({
          position: landmark.clone(),
          variation: landmarkVariation,
          isCorridorMarker: false,
          isLandmark: true
        });
      }
    }

    // Add gateway rocks for discovery zones
    for (const zone of zones) {
      for (const entryPoint of zone.entryPoints) {
        const gatewayDirection = new THREE.Vector3().subVectors(zone.center, entryPoint).normalize();
        const gatewayPosition = entryPoint.clone().add(gatewayDirection.multiplyScalar(3));
        
        const gatewayVariation = ROCK_VARIATIONS.find(v => v.category === 'medium') || ROCK_VARIATIONS[2];
        
        enhancedRocks.push({
          position: gatewayPosition,
          variation: gatewayVariation,
          isCorridorMarker: false,
          isLandmark: false,
          discoveryZoneId: zone.id
        });
      }
    }

    return enhancedRocks;
  }

  private calculateBaseRockCount(region: RegionCoordinates, regionSize: number): number {
    const baseDensity = 0.3; // Base rocks per square unit
    const area = regionSize * regionSize;
    const baseCount = area * baseDensity;
    
    // Adjust for ring (outer rings have more rocks)
    const ringMultiplier = 1.0 + (region.ringIndex * 0.3);
    
    return Math.floor(baseCount * ringMultiplier);
  }

  private generateCandidatePosition(centerPosition: THREE.Vector3, regionSize: number): THREE.Vector3 {
    const halfSize = regionSize / 2;
    return new THREE.Vector3(
      centerPosition.x + (Math.random() - 0.5) * regionSize,
      centerPosition.y,
      centerPosition.z + (Math.random() - 0.5) * regionSize
    );
  }

  private selectRockVariation(sizeDistribution: any, quadrantCharacteristics: any): RockVariation {
    const random = Math.random();
    let cumulative = 0;

    for (const variation of ROCK_VARIATIONS) {
      cumulative += sizeDistribution[variation.category] || 0;
      if (random <= cumulative) {
        return variation;
      }
    }

    return ROCK_VARIATIONS[0]; // Fallback to tiny
  }

  private hasValidSpacing(position: THREE.Vector3, existingPositions: THREE.Vector3[], variation: RockVariation): boolean {
    const minSpacing = variation.category === 'tiny' ? 2 : 
                      variation.category === 'small' ? 4 :
                      variation.category === 'medium' ? 6 : 8;

    for (const existing of existingPositions) {
      if (position.distanceTo(existing) < minSpacing) {
        return false;
      }
    }

    return true;
  }

  private getPerpendicularVector(path: THREE.Vector3[], index: number): THREE.Vector3 {
    if (index === 0 || index >= path.length - 1) {
      return new THREE.Vector3(1, 0, 0);
    }

    const direction = new THREE.Vector3().subVectors(path[index + 1], path[index - 1]).normalize();
    return new THREE.Vector3(-direction.z, 0, direction.x);
  }

  // Public getters for external systems
  public getDiscoveryZones(region: RegionCoordinates): DiscoveryZone[] {
    return this.discoveryZoneManager.generateDiscoveryZones(region, new THREE.Vector3(), []);
  }

  public getAllDiscoveryZones(): DiscoveryZone[] {
    return this.discoveryZoneManager.getAllDiscoveryZones();
  }

  public getZonesForBuilding(): DiscoveryZone[] {
    return this.discoveryZoneManager.getZonesForCategory('settlement');
  }
}
