
import * as THREE from 'three';
import { RegionCoordinates } from '../../RingQuadrantSystem';

export interface DiscoveryZone {
  id: string;
  center: THREE.Vector3;
  radius: number;
  entryPoints: THREE.Vector3[];
  category: 'settlement' | 'defensive' | 'cache' | 'scenic';
  accessibilityRating: number;
  metadata: {
    terrainType: string;
    nearbyLandmarks: string[];
    suitableForBuilding: boolean;
    size: 'small' | 'medium' | 'large';
  };
}

export interface ExplorationCorridor {
  id: string;
  path: THREE.Vector3[];
  width: number;
  connections: string[];
  landmarks: THREE.Vector3[];
}

export class DiscoveryZoneManager {
  private discoveryZones: Map<string, DiscoveryZone[]> = new Map();
  private explorationCorridors: Map<string, ExplorationCorridor[]> = new Map();
  private zoneRegistry: Map<string, DiscoveryZone> = new Map();

  constructor() {
    console.log("🗺️ DiscoveryZoneManager initialized for accessible exploration");
  }

  public generateDiscoveryZones(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3,
    existingRockPositions: THREE.Vector3[]
  ): DiscoveryZone[] {
    const regionKey = `${region.ringIndex}-${region.quadrant}`;
    
    if (this.discoveryZones.has(regionKey)) {
      return this.discoveryZones.get(regionKey)!;
    }

    const zones: DiscoveryZone[] = [];
    const zoneCount = Math.min(4, 2 + region.ringIndex); // More zones in outer rings

    for (let i = 0; i < zoneCount; i++) {
      const zone = this.createAccessibleZone(region, centerPosition, existingRockPositions, i);
      if (zone) {
        zones.push(zone);
        this.zoneRegistry.set(zone.id, zone);
      }
    }

    this.discoveryZones.set(regionKey, zones);
    console.log(`🗺️ Generated ${zones.length} discovery zones for region ${regionKey}`);
    
    return zones;
  }

  private createAccessibleZone(
    region: RegionCoordinates,
    centerPosition: THREE.Vector3,
    rockPositions: THREE.Vector3[],
    index: number
  ): DiscoveryZone | null {
    // Find suitable location that's accessible but partially hidden
    const attempts = 20;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      const angle = (index / 4) * Math.PI * 2 + (Math.random() - 0.5) * Math.PI;
      const distance = 20 + Math.random() * 30;
      
      const candidate = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * distance
      );

      // Check if location is suitable (not too close to rocks but has some nearby)
      const minDistanceToRocks = this.getMinDistanceToRocks(candidate, rockPositions);
      const nearbyRockCount = this.getNearbyRockCount(candidate, rockPositions, 15);

      if (minDistanceToRocks > 8 && minDistanceToRocks < 25 && nearbyRockCount >= 2) {
        const zone: DiscoveryZone = {
          id: `zone_${region.ringIndex}_${region.quadrant}_${index}`,
          center: candidate,
          radius: 8 + Math.random() * 7, // 8-15 units
          entryPoints: this.generateEntryPoints(candidate, rockPositions),
          category: this.determineZoneCategory(region, nearbyRockCount),
          accessibilityRating: this.calculateAccessibilityRating(candidate, rockPositions),
          metadata: {
            terrainType: this.getTerrainType(region.quadrant),
            nearbyLandmarks: [],
            suitableForBuilding: minDistanceToRocks > 12,
            size: this.determineZoneSize(8 + Math.random() * 7)
          }
        };

        return zone;
      }
    }

    return null;
  }

  private generateEntryPoints(center: THREE.Vector3, rockPositions: THREE.Vector3[]): THREE.Vector3[] {
    const entryPoints: THREE.Vector3[] = [];
    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    
    for (const angle of angles) {
      const entryPoint = new THREE.Vector3(
        center.x + Math.cos(angle) * 12,
        center.y,
        center.z + Math.sin(angle) * 12
      );

      // Check if this entry point has a clear path
      if (this.hasAccessiblePath(center, entryPoint, rockPositions)) {
        entryPoints.push(entryPoint);
      }
    }

    // Ensure at least 2 entry points for accessibility
    while (entryPoints.length < 2) {
      const randomAngle = Math.random() * Math.PI * 2;
      const entryPoint = new THREE.Vector3(
        center.x + Math.cos(randomAngle) * 10,
        center.y,
        center.z + Math.sin(randomAngle) * 10
      );
      entryPoints.push(entryPoint);
    }

    return entryPoints;
  }

  private hasAccessiblePath(from: THREE.Vector3, to: THREE.Vector3, obstacles: THREE.Vector3[]): boolean {
    const pathVector = new THREE.Vector3().subVectors(to, from);
    const pathLength = pathVector.length();
    const pathDirection = pathVector.normalize();
    const checkInterval = 2;
    
    for (let dist = 0; dist < pathLength; dist += checkInterval) {
      const checkPoint = new THREE.Vector3().addVectors(
        from,
        pathDirection.clone().multiplyScalar(dist)
      );

      // Check if path is blocked by nearby rocks
      for (const rock of obstacles) {
        if (checkPoint.distanceTo(rock) < 4) { // 4 unit clearance
          return false;
        }
      }
    }

    return true;
  }

  public generateExplorationCorridors(
    region: RegionCoordinates,
    zones: DiscoveryZone[],
    rockPositions: THREE.Vector3[]
  ): ExplorationCorridor[] {
    const regionKey = `${region.ringIndex}-${region.quadrant}`;
    
    if (this.explorationCorridors.has(regionKey)) {
      return this.explorationCorridors.get(regionKey)!;
    }

    const corridors: ExplorationCorridor[] = [];

    // Create corridors between zones
    for (let i = 0; i < zones.length - 1; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const corridor = this.createNaturalCorridor(
          zones[i],
          zones[j],
          rockPositions,
          `corridor_${region.ringIndex}_${region.quadrant}_${i}_${j}`
        );
        
        if (corridor) {
          corridors.push(corridor);
        }
      }
    }

    this.explorationCorridors.set(regionKey, corridors);
    console.log(`🛤️ Generated ${corridors.length} exploration corridors for region ${regionKey}`);
    
    return corridors;
  }

  private createNaturalCorridor(
    zoneA: DiscoveryZone,
    zoneB: DiscoveryZone,
    obstacles: THREE.Vector3[],
    id: string
  ): ExplorationCorridor | null {
    const path = this.generateWindingPath(zoneA.center, zoneB.center, obstacles);
    
    if (path.length < 3) return null;

    const corridor: ExplorationCorridor = {
      id,
      path,
      width: 4 + Math.random() * 2, // 4-6 units wide
      connections: [zoneA.id, zoneB.id],
      landmarks: this.generateLandmarksAlongPath(path)
    };

    return corridor;
  }

  private generateWindingPath(start: THREE.Vector3, end: THREE.Vector3, obstacles: THREE.Vector3[]): THREE.Vector3[] {
    const path: THREE.Vector3[] = [start.clone()];
    const totalDistance = start.distanceTo(end);
    const segments = Math.max(3, Math.floor(totalDistance / 8));
    
    let current = start.clone();
    const targetVector = new THREE.Vector3().subVectors(end, start);
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments;
      const straightTarget = new THREE.Vector3().addVectors(
        start,
        targetVector.clone().multiplyScalar(progress)
      );

      // Add natural winding
      const windingOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        0,
        (Math.random() - 0.5) * 10
      );

      const candidate = straightTarget.clone().add(windingOffset);
      
      // Ensure path doesn't go too close to obstacles
      let validCandidate = this.findValidPathPoint(candidate, obstacles, current);
      path.push(validCandidate);
      current = validCandidate;
    }

    path.push(end.clone());
    return path;
  }

  private findValidPathPoint(candidate: THREE.Vector3, obstacles: THREE.Vector3[], from: THREE.Vector3): THREE.Vector3 {
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let isValid = true;
      
      for (const obstacle of obstacles) {
        if (candidate.distanceTo(obstacle) < 5) { // 5 unit clearance
          isValid = false;
          break;
        }
      }

      if (isValid) {
        return candidate;
      }

      // Adjust candidate position
      const adjustment = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        0,
        (Math.random() - 0.5) * 8
      );
      candidate.add(adjustment);
    }

    // Fallback to safer position closer to previous point
    return new THREE.Vector3().addVectors(from, 
      new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        0,
        (Math.random() - 0.5) * 6
      )
    );
  }

  private generateLandmarksAlongPath(path: THREE.Vector3[]): THREE.Vector3[] {
    const landmarks: THREE.Vector3[] = [];
    const landmarkInterval = Math.max(2, Math.floor(path.length / 3));
    
    for (let i = landmarkInterval; i < path.length - 1; i += landmarkInterval) {
      landmarks.push(path[i].clone());
    }

    return landmarks;
  }

  // Helper methods
  private getMinDistanceToRocks(position: THREE.Vector3, rocks: THREE.Vector3[]): number {
    let minDistance = Infinity;
    for (const rock of rocks) {
      const distance = position.distanceTo(rock);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private getNearbyRockCount(position: THREE.Vector3, rocks: THREE.Vector3[], radius: number): number {
    let count = 0;
    for (const rock of rocks) {
      if (position.distanceTo(rock) <= radius) {
        count++;
      }
    }
    return count;
  }

  private determineZoneCategory(region: RegionCoordinates, nearbyRockCount: number): DiscoveryZone['category'] {
    if (region.ringIndex === 0) return 'settlement';
    if (nearbyRockCount >= 5) return 'defensive';
    if (Math.random() < 0.3) return 'cache';
    return 'scenic';
  }

  private calculateAccessibilityRating(center: THREE.Vector3, obstacles: THREE.Vector3[]): number {
    const nearbyObstacles = obstacles.filter(obs => center.distanceTo(obs) < 20);
    const baseRating = 1.0;
    const obstacleReduction = nearbyObstacles.length * 0.1;
    return Math.max(0.2, Math.min(1.0, baseRating - obstacleReduction));
  }

  private getTerrainType(quadrant: number): string {
    const types = ['riverbed', 'hills', 'plains', 'broken'];
    return types[quadrant] || 'mixed';
  }

  private determineZoneSize(radius: number): 'small' | 'medium' | 'large' {
    if (radius < 10) return 'small';
    if (radius < 13) return 'medium';
    return 'large';
  }

  // Public registry access
  public getAllDiscoveryZones(): DiscoveryZone[] {
    return Array.from(this.zoneRegistry.values());
  }

  public getZoneById(id: string): DiscoveryZone | null {
    return this.zoneRegistry.get(id) || null;
  }

  public getZonesForCategory(category: DiscoveryZone['category']): DiscoveryZone[] {
    return Array.from(this.zoneRegistry.values()).filter(zone => zone.category === category);
  }
}
