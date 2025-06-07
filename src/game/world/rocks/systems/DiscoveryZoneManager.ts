import * as THREE from 'three';
import { RegionCoordinates } from '../../RingQuadrantSystem';

export interface DiscoveryZone {
  id: string;
  center: THREE.Vector3;
  radius: number;
  category: 'settlement_suitable' | 'defensive_position' | 'hidden_cache' | 'scenic_overlook';
  accessibility: 'easy' | 'moderate' | 'challenging';
  entryPoints: THREE.Vector3[];
  landmarks: THREE.Vector3[];
  terrain: 'flat' | 'elevated' | 'sheltered' | 'open';
}

export interface PathCorridor {
  id: string;
  points: THREE.Vector3[];
  width: number;
  connects: string[]; // IDs of zones it connects
  difficulty: 'easy' | 'moderate' | 'winding';
  landmarks: THREE.Vector3[];
}

export class DiscoveryZoneManager {
  private discoveryZones: Map<string, DiscoveryZone> = new Map();
  private pathCorridors: Map<string, PathCorridor> = new Map();
  private rockPositions: Map<string, THREE.Vector3[]> = new Map();
  
  constructor() {
    console.log("🗺️ DiscoveryZoneManager initialized for accessible exploration areas");
  }
  
  public registerRockFormation(regionKey: string, position: THREE.Vector3, size: number): void {
    if (!this.rockPositions.has(regionKey)) {
      this.rockPositions.set(regionKey, []);
    }
    this.rockPositions.get(regionKey)!.push(position);
  }
  
  public analyzeAndCreateZones(regionCoords: RegionCoordinates): void {
    const regionKey = `${regionCoords.ringIndex}_${regionCoords.quadrant}`;
    const rocks = this.rockPositions.get(regionKey) || [];
    
    if (rocks.length < 3) return; // Need minimum rocks to create interesting zones
    
    // Find natural clearings between rock clusters
    const clearings = this.identifyNaturalClearings(rocks, regionCoords);
    
    // Create discovery zones in suitable clearings
    clearings.forEach((clearing, index) => {
      if (clearing.radius > 8) { // Minimum size for a discovery zone
        const zone = this.createDiscoveryZone(
          `${regionKey}_zone_${index}`,
          clearing.center,
          clearing.radius,
          rocks
        );
        this.discoveryZones.set(zone.id, zone);
      }
    });
    
    // Generate connecting corridors
    this.generateCorridorsBetweenZones(regionKey);
    
    console.log(`🗺️ Created ${clearings.length} discovery zones for region ${regionKey}`);
  }
  
  private identifyNaturalClearings(rocks: THREE.Vector3[], regionCoords: RegionCoordinates): { center: THREE.Vector3, radius: number }[] {
    const clearings: { center: THREE.Vector3, radius: number }[] = [];
    const searchRadius = regionCoords.ringIndex === 0 ? 40 : 60;
    const gridSize = 10;
    
    // Grid-based search for clearings
    for (let x = -searchRadius; x <= searchRadius; x += gridSize) {
      for (let z = -searchRadius; z <= searchRadius; z += gridSize) {
        const testPoint = new THREE.Vector3(x, 0, z);
        const clearRadius = this.calculateClearingRadius(testPoint, rocks);
        
        if (clearRadius > 8) { // Minimum clearing size
          clearings.push({ center: testPoint, radius: clearRadius });
        }
      }
    }
    
    // Remove overlapping clearings, keep the largest
    return this.removeDuplicateClearings(clearings);
  }
  
  private calculateClearingRadius(center: THREE.Vector3, rocks: THREE.Vector3[]): number {
    let minDistance = Infinity;
    
    for (const rock of rocks) {
      const distance = center.distanceTo(rock);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return Math.max(0, minDistance - 3); // Account for rock size
  }
  
  private removeDuplicateClearings(clearings: { center: THREE.Vector3, radius: number }[]): { center: THREE.Vector3, radius: number }[] {
    const filtered: { center: THREE.Vector3, radius: number }[] = [];
    
    for (const clearing of clearings) {
      let shouldAdd = true;
      
      for (const existing of filtered) {
        const distance = clearing.center.distanceTo(existing.center);
        if (distance < (clearing.radius + existing.radius) * 0.7) {
          if (clearing.radius <= existing.radius) {
            shouldAdd = false;
            break;
          } else {
            // Remove the smaller existing clearing
            const index = filtered.indexOf(existing);
            filtered.splice(index, 1);
          }
        }
      }
      
      if (shouldAdd) {
        filtered.push(clearing);
      }
    }
    
    return filtered;
  }
  
  private createDiscoveryZone(id: string, center: THREE.Vector3, radius: number, nearbyRocks: THREE.Vector3[]): DiscoveryZone {
    // Categorize zone based on characteristics
    const category = this.categorizeZone(center, radius, nearbyRocks);
    const accessibility = radius > 15 ? 'easy' : radius > 10 ? 'moderate' : 'challenging';
    
    // Find natural entry points
    const entryPoints = this.findEntryPoints(center, radius, nearbyRocks);
    
    // Identify potential landmarks
    const landmarks = this.identifyLandmarks(center, radius, nearbyRocks);
    
    // Determine terrain type
    const terrain = this.assessTerrain(center, nearbyRocks);
    
    return {
      id,
      center,
      radius,
      category,
      accessibility,
      entryPoints,
      landmarks,
      terrain
    };
  }
  
  private categorizeZone(center: THREE.Vector3, radius: number, rocks: THREE.Vector3[]): DiscoveryZone['category'] {
    const distanceFromOrigin = center.distanceTo(new THREE.Vector3(0, 0, 0));
    
    if (distanceFromOrigin < 30 && radius > 12) {
      return 'settlement_suitable';
    } else if (radius > 15 && rocks.length > 8) {
      return 'defensive_position';
    } else if (radius < 10 && rocks.length > 5) {
      return 'hidden_cache';
    } else {
      return 'scenic_overlook';
    }
  }
  
  private findEntryPoints(center: THREE.Vector3, radius: number, rocks: THREE.Vector3[]): THREE.Vector3[] {
    const entryPoints: THREE.Vector3[] = [];
    const numAngles = 8;
    
    for (let i = 0; i < numAngles; i++) {
      const angle = (i / numAngles) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const testPoint = center.clone().add(direction.multiplyScalar(radius * 0.8));
      
      // Check if this is a viable entry point (not blocked by rocks)
      let isViable = true;
      for (const rock of rocks) {
        if (testPoint.distanceTo(rock) < 5) {
          isViable = false;
          break;
        }
      }
      
      if (isViable) {
        entryPoints.push(testPoint);
      }
    }
    
    return entryPoints;
  }
  
  private identifyLandmarks(center: THREE.Vector3, radius: number, rocks: THREE.Vector3[]): THREE.Vector3[] {
    // Find the largest rocks near the zone as landmarks
    const landmarks: THREE.Vector3[] = [];
    const landmarkCandidates = rocks
      .filter(rock => center.distanceTo(rock) < radius * 2)
      .sort((a, b) => center.distanceTo(a) - center.distanceTo(b))
      .slice(0, 3); // Take up to 3 closest rocks as landmarks
    
    return landmarkCandidates;
  }
  
  private assessTerrain(center: THREE.Vector3, rocks: THREE.Vector3[]): DiscoveryZone['terrain'] {
    const nearbyRocks = rocks.filter(rock => center.distanceTo(rock) < 20);
    
    if (nearbyRocks.length > 6) {
      return 'sheltered';
    } else if (nearbyRocks.length < 3) {
      return 'open';
    } else if (center.y > 2) {
      return 'elevated';
    } else {
      return 'flat';
    }
  }
  
  private generateCorridorsBetweenZones(regionKey: string): void {
    const zones = Array.from(this.discoveryZones.values())
      .filter(zone => zone.id.startsWith(regionKey));
    
    if (zones.length < 2) return;
    
    // Create corridors between nearby zones
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const zoneA = zones[i];
        const zoneB = zones[j];
        const distance = zoneA.center.distanceTo(zoneB.center);
        
        if (distance < 50) { // Only connect nearby zones
          const corridor = this.createCorridor(zoneA, zoneB);
          this.pathCorridors.set(corridor.id, corridor);
        }
      }
    }
  }
  
  private createCorridor(zoneA: DiscoveryZone, zoneB: DiscoveryZone): PathCorridor {
    const id = `corridor_${zoneA.id}_${zoneB.id}`;
    
    // Create a natural, winding path between zones
    const points = this.generateWindingPath(zoneA.center, zoneB.center);
    const width = 4 + Math.random() * 2; // 4-6 unit wide corridors
    const difficulty = points.length > 5 ? 'winding' : 'easy';
    
    // Add breadcrumb landmarks along the path
    const landmarks = this.placeBreadcrumbLandmarks(points);
    
    return {
      id,
      points,
      width,
      connects: [zoneA.id, zoneB.id],
      difficulty,
      landmarks
    };
  }
  
  private generateWindingPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
    const points: THREE.Vector3[] = [start.clone()];
    const totalDistance = start.distanceTo(end);
    const numSegments = Math.floor(totalDistance / 8) + 2;
    
    for (let i = 1; i < numSegments; i++) {
      const t = i / numSegments;
      const straightLine = start.clone().lerp(end, t);
      
      // Add organic curvature
      const perpendicular = new THREE.Vector3()
        .crossVectors(end.clone().sub(start).normalize(), new THREE.Vector3(0, 1, 0))
        .normalize();
      
      const curvature = Math.sin(t * Math.PI * 2) * (totalDistance * 0.1);
      const curvedPoint = straightLine.add(perpendicular.multiplyScalar(curvature));
      
      points.push(curvedPoint);
    }
    
    points.push(end.clone());
    return points;
  }
  
  private placeBreadcrumbLandmarks(pathPoints: THREE.Vector3[]): THREE.Vector3[] {
    const landmarks: THREE.Vector3[] = [];
    const landmarkInterval = 3; // Every 3rd point
    
    for (let i = landmarkInterval; i < pathPoints.length; i += landmarkInterval) {
      const landmarkPos = pathPoints[i].clone();
      // Offset slightly to the side of the path
      const offset = new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
      landmarks.push(landmarkPos.add(offset));
    }
    
    return landmarks;
  }
  
  public getDiscoveryZones(): Map<string, DiscoveryZone> {
    return this.discoveryZones;
  }
  
  public getPathCorridors(): Map<string, PathCorridor> {
    return this.pathCorridors;
  }
  
  public getZonesInRegion(regionKey: string): DiscoveryZone[] {
    return Array.from(this.discoveryZones.values())
      .filter(zone => zone.id.startsWith(regionKey));
  }
  
  public dispose(): void {
    this.discoveryZones.clear();
    this.pathCorridors.clear();
    this.rockPositions.clear();
    console.log("🗺️ DiscoveryZoneManager disposed");
  }
}
