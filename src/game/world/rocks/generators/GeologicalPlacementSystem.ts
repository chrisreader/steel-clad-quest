
import * as THREE from 'three';
import { Noise } from 'noisejs';
import { RegionCoordinates } from '../../RingQuadrantSystem';
import { BiomeRockSpawner, GeologicalFormation, BiomeCharacteristics } from './BiomeRockSpawner';
import { RockVariation } from '../config/RockVariationConfig';

export interface PlacementConstraints {
  minDistanceFromSpawn: number;
  maxSlopeAngle: number;
  minRockSpacing: number;
  avoidWaterBodies: boolean;
  preferElevatedGround: boolean;
}

export interface RockPlacementData {
  position: THREE.Vector3;
  variation: RockVariation;
  rotation: THREE.Euler;
  scale: number;
  formationType: string | null;
  isLandmark: boolean;
}

export class GeologicalPlacementSystem {
  private biomeSpawner: BiomeRockSpawner;
  private placementNoise: any;
  private elevationNoise: any;
  
  private constraints: PlacementConstraints = {
    minDistanceFromSpawn: 15, // Meters from spawn point
    maxSlopeAngle: 35, // Degrees
    minRockSpacing: 2, // Minimum distance between rocks
    avoidWaterBodies: true,
    preferElevatedGround: true
  };

  constructor() {
    this.biomeSpawner = new BiomeRockSpawner();
    this.placementNoise = new Noise(Math.random() * 3000);
    this.elevationNoise = new Noise(Math.random() * 4000);
  }

  public generateRockPlacements(
    region: RegionCoordinates,
    centerPosition: THREE.Vector3,
    regionSize: number,
    getTerrainHeight: (pos: THREE.Vector3) => number
  ): RockPlacementData[] {
    // Get biome-aware rock distribution
    const baseRockCount = this.calculateBaseRockCount(region.ringIndex);
    const distribution = this.biomeSpawner.calculateOrganicRockDistribution(
      region,
      centerPosition,
      baseRockCount
    );

    console.log(`🗿 Generating ${distribution.totalRocks} rocks for ${distribution.biome.name}`);

    const placements: RockPlacementData[] = [];
    const usedPositions: THREE.Vector3[] = [];

    // Generate rock placements using intelligent positioning
    for (let i = 0; i < distribution.totalRocks; i++) {
      const position = this.findOptimalRockPosition(
        centerPosition,
        regionSize,
        usedPositions,
        distribution.formations,
        distribution.biome,
        getTerrainHeight
      );

      if (position) {
        // Select appropriate rock variation for this position
        const variation = this.biomeSpawner.selectRockVariationForPosition(
          position,
          distribution.biome,
          distribution.formations,
          distribution.sizeDistribution
        );

        // Determine if this should be a landmark (large visible formations)
        const isLandmark = this.shouldBeLandmark(position, variation, distribution.formations);

        // Generate natural rotation and scale variation
        const placement: RockPlacementData = {
          position,
          variation,
          rotation: this.generateNaturalRotation(position, distribution.biome),
          scale: this.generateNaturalScale(variation, distribution.biome),
          formationType: this.getFormationTypeAtPosition(position, distribution.formations),
          isLandmark
        };

        placements.push(placement);
        usedPositions.push(position);
      }
    }

    console.log(`✅ Successfully placed ${placements.length} rocks with geological realism`);
    return placements;
  }

  private calculateBaseRockCount(ringIndex: number): number {
    // Non-linear base counts that feel more natural
    const baseCounts = [8, 20, 45, 35]; // Ring 3 actually has fewer rocks but larger ones
    return baseCounts[Math.min(ringIndex, 3)] + Math.floor(Math.random() * 8);
  }

  private findOptimalRockPosition(
    centerPosition: THREE.Vector3,
    regionSize: number,
    usedPositions: THREE.Vector3[],
    formations: GeologicalFormation[],
    biome: BiomeCharacteristics,
    getTerrainHeight: (pos: THREE.Vector3) => number
  ): THREE.Vector3 | null {
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate position with organic distribution
      const position = this.generateOrganicPosition(
        centerPosition,
        regionSize,
        formations,
        biome
      );

      // Check all placement constraints
      if (this.isValidPlacement(position, usedPositions, getTerrainHeight)) {
        // Set terrain height
        position.y = getTerrainHeight(position);
        return position;
      }
    }

    console.warn('⚠️ Could not find valid rock placement after max attempts');
    return null;
  }

  private generateOrganicPosition(
    centerPosition: THREE.Vector3,
    regionSize: number,
    formations: GeologicalFormation[],
    biome: BiomeCharacteristics
  ): THREE.Vector3 {
    // Use formation influence and noise for organic positioning
    const useFormationBias = Math.random() < biome.clusterTendency;
    
    let x: number, z: number;
    
    if (useFormationBias && formations.length > 0) {
      // Bias position toward geological formations
      const formation = formations[Math.floor(Math.random() * formations.length)];
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * formation.radius * 0.8;
      
      x = formation.center.x + Math.cos(angle) * distance;
      z = formation.center.z + Math.sin(angle) * distance;
    } else {
      // Use noise-based organic distribution
      const noiseX = this.placementNoise.perlin2(Math.random() * 100, 0) * regionSize * 0.3;
      const noiseZ = this.placementNoise.perlin2(0, Math.random() * 100) * regionSize * 0.3;
      
      x = centerPosition.x + (Math.random() - 0.5) * regionSize + noiseX;
      z = centerPosition.z + (Math.random() - 0.5) * regionSize + noiseZ;
    }
    
    return new THREE.Vector3(x, 0, z);
  }

  private isValidPlacement(
    position: THREE.Vector3,
    usedPositions: THREE.Vector3[],
    getTerrainHeight: (pos: THREE.Vector3) => number
  ): boolean {
    // Check minimum distance from spawn (0, 0, 0)
    const distanceFromSpawn = Math.sqrt(position.x * position.x + position.z * position.z);
    if (distanceFromSpawn < this.constraints.minDistanceFromSpawn) {
      return false;
    }

    // Check minimum spacing from other rocks
    for (const usedPos of usedPositions) {
      if (position.distanceTo(usedPos) < this.constraints.minRockSpacing) {
        return false;
      }
    }

    // Check terrain slope (simplified - would integrate with actual terrain system)
    const terrainHeight = getTerrainHeight(position);
    if (terrainHeight < 0.1) { // Avoid placing in water/invalid terrain
      return false;
    }

    // Additional terrain-based checks would go here
    // (slope angle, proximity to water, etc.)

    return true;
  }

  private shouldBeLandmark(
    position: THREE.Vector3,
    variation: RockVariation,
    formations: GeologicalFormation[]
  ): boolean {
    // Large/massive rocks in prominent formations can be landmarks
    if (variation.category !== 'large' && variation.category !== 'massive') {
      return false;
    }

    // Check if position is in a prominent formation
    for (const formation of formations) {
      if (formation.type === 'amphitheater' || formation.type === 'outcrop') {
        const distance = position.distanceTo(formation.center);
        if (distance < formation.radius * 0.5) {
          return Math.random() < 0.3; // 30% chance for landmark status
        }
      }
    }

    return false;
  }

  private generateNaturalRotation(position: THREE.Vector3, biome: BiomeCharacteristics): THREE.Euler {
    // Use position-based noise for consistent but varied rotation
    const rotationNoise = this.placementNoise.perlin3(
      position.x * 0.01,
      position.y * 0.01,
      position.z * 0.01
    );

    // More chaotic biomes have more varied rotations
    const rotationVariation = biome.name.includes('Chaotic') ? Math.PI : Math.PI * 0.5;

    return new THREE.Euler(
      (Math.random() - 0.5) * 0.3, // Slight X tilt
      rotationNoise * rotationVariation, // Main Y rotation
      (Math.random() - 0.5) * 0.2  // Slight Z tilt
    );
  }

  private generateNaturalScale(variation: RockVariation, biome: BiomeCharacteristics): number {
    // Base scale from size range
    const [minSize, maxSize] = variation.sizeRange;
    const baseScale = minSize + Math.random() * (maxSize - minSize);

    // Biome influence on scale
    const biomeScaleModifier = biome.weatheringLevel > 0.7 ? 0.9 : 1.1; // Weathered = smaller

    return baseScale * biomeScaleModifier * (0.8 + Math.random() * 0.4); // ±20% variation
  }

  private getFormationTypeAtPosition(
    position: THREE.Vector3,
    formations: GeologicalFormation[]
  ): string | null {
    for (const formation of formations) {
      const distance = position.distanceTo(formation.center);
      if (distance < formation.radius) {
        return formation.type;
      }
    }
    return null;
  }

  public createExplorationCorridor(
    startPosition: THREE.Vector3,
    endPosition: THREE.Vector3,
    placements: RockPlacementData[]
  ): void {
    // Remove rocks that block natural exploration paths
    const corridorWidth = 8; // Meters
    const direction = endPosition.clone().sub(startPosition).normalize();
    const corridorLength = startPosition.distanceTo(endPosition);

    for (let i = placements.length - 1; i >= 0; i--) {
      const rock = placements[i];
      
      // Calculate distance from rock to corridor line
      const toRock = rock.position.clone().sub(startPosition);
      const projectionLength = toRock.dot(direction);
      
      if (projectionLength >= 0 && projectionLength <= corridorLength) {
        const projectedPoint = startPosition.clone().add(direction.clone().multiplyScalar(projectionLength));
        const distanceToLine = rock.position.distanceTo(projectedPoint);
        
        if (distanceToLine < corridorWidth / 2) {
          placements.splice(i, 1);
          console.log(`🛤️ Removed rock to create exploration corridor`);
        }
      }
    }
  }
}
