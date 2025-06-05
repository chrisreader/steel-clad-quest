import * as THREE from 'three';
import { Noise } from 'noisejs';
import { TextureGenerator } from '../utils/graphics/TextureGenerator';

// Define interfaces for our ring-quadrant system
export interface RingDefinition {
  innerRadius: number;
  outerRadius: number;
  difficulty: number;
  terrainColor: number;
  enemyTypes: string[];
  structureTypes: string[];
  eventChance: number;
}

export interface RegionCoordinates {
  ringIndex: number;
  quadrant: number; // 0=NE, 1=SE, 2=SW, 3=NW
}

export interface Region {
  coordinates: RegionCoordinates;
  centerPosition: THREE.Vector3;
  terrain: THREE.Mesh | null;
  isLoaded: boolean;
}

export class RingQuadrantSystem {
  private noise: any;
  private static readonly TRANSITION_ZONE_SIZE = 18; // Size of transition zone between rings
  
  // Define 4 rings with increasing radius and difficulty
  private rings: RingDefinition[] = [
    {
      innerRadius: 0,
      outerRadius: 50, // Reduced from 200 to 50
      difficulty: 1,
      terrainColor: 0x5FAD5F, // Match existing green terrain
      enemyTypes: ['goblin', 'wolf'],
      structureTypes: ['tavern'],
      eventChance: 0.1
    },
    {
      innerRadius: 50, // Updated to match new center ring size
      outerRadius: 150, // Reduced proportionally
      difficulty: 2,
      terrainColor: 0x4A9A4A, // Slightly darker green
      enemyTypes: ['goblin', 'wolf', 'orc'],
      structureTypes: ['ruins', 'cabin'],
      eventChance: 0.2
    },
    {
      innerRadius: 150, // Updated to match previous ring
      outerRadius: 300, // Reduced proportionally
      difficulty: 3,
      terrainColor: 0x3A8A3A, // Even darker green
      enemyTypes: ['orc', 'bandit', 'troll'],
      structureTypes: ['castle', 'tower'],
      eventChance: 0.3
    },
    {
      innerRadius: 300, // Updated to match previous ring
      outerRadius: 600, // Reduced proportionally
      difficulty: 4,
      terrainColor: 0x2A7A2A, // Darkest green
      enemyTypes: ['troll', 'warlord', 'witch'],
      structureTypes: ['temple', 'fortress'],
      eventChance: 0.4
    }
  ];
  
  private worldCenter: THREE.Vector3;
  private activeRegions: Map<string, Region> = new Map();
  
  constructor(worldCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.worldCenter = worldCenter;
    // Initialize noise for terrain generation
    this.noise = new Noise(Math.random());
  }
  
  // Get which ring and quadrant a position belongs to
  public getRegionForPosition(position: THREE.Vector3): RegionCoordinates | null {
    const dx = position.x - this.worldCenter.x;
    const dz = position.z - this.worldCenter.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Find which ring contains this distance
    let ringIndex = -1;
    for (let i = 0; i < this.rings.length; i++) {
      if (distance >= this.rings[i].innerRadius && distance < this.rings[i].outerRadius) {
        ringIndex = i;
        break;
      }
    }
    
    // If no ring contains this position
    if (ringIndex === -1) return null;
    
    // Determine quadrant (0=NE, 1=SE, 2=SW, 3=NW)
    let quadrant = 0;
    if (dx >= 0 && dz >= 0) quadrant = 0;      // North-East
    else if (dx >= 0 && dz < 0) quadrant = 1;  // South-East
    else if (dx < 0 && dz < 0) quadrant = 2;   // South-West
    else if (dx < 0 && dz >= 0) quadrant = 3;  // North-West
    
    return { ringIndex, quadrant };
  }
  
  // Get the center position of a region
  public getRegionCenter(region: RegionCoordinates): THREE.Vector3 {
    const ring = this.rings[region.ringIndex];
    const midRadius = (ring.innerRadius + ring.outerRadius) / 2;
    
    // Calculate angle based on quadrant (center of quadrant)
    const quadrantAngle = Math.PI / 2; // 90 degrees per quadrant
    const angle = region.quadrant * quadrantAngle + (quadrantAngle / 2);
    
    return new THREE.Vector3(
      this.worldCenter.x + midRadius * Math.cos(angle),
      this.worldCenter.y,
      this.worldCenter.z + midRadius * Math.sin(angle)
    );
  }
  
  // Get a unique string key for a region
  public getRegionKey(region: RegionCoordinates): string {
    return `r${region.ringIndex}_q${region.quadrant}`;
  }
  
  // Get regions that should be active based on player position
  public getActiveRegions(playerPosition: THREE.Vector3, renderDistance: number): RegionCoordinates[] {
    const playerRegion = this.getRegionForPosition(playerPosition);
    if (!playerRegion) return [];
    
    const activeRegions: RegionCoordinates[] = [];
    
    // Always include player's current region
    activeRegions.push(playerRegion);
    
    // Check adjacent regions
    for (let r = Math.max(0, playerRegion.ringIndex - 1); 
         r <= Math.min(this.rings.length - 1, playerRegion.ringIndex + 1); 
         r++) {
      for (let q = 0; q < 4; q++) {
        // Skip current region (already added)
        if (r === playerRegion.ringIndex && q === playerRegion.quadrant) continue;
        
        // Check if region center is within render distance
        const regionCenter = this.getRegionCenter({ ringIndex: r, quadrant: q });
        if (regionCenter.distanceTo(playerPosition) <= renderDistance) {
          activeRegions.push({ ringIndex: r, quadrant: q });
        }
      }
    }
    
    return activeRegions;
  }
  
  // Get ring definition for a region
  public getRingDefinition(ringIndex: number): RingDefinition {
    return this.rings[ringIndex];
  }
  
  // Helper to get difficulty for a region
  public getDifficultyForRegion(region: RegionCoordinates): number {
    return this.rings[region.ringIndex].difficulty;
  }
  
  // New method: Generate heightmap for terrain with hills
  public generateHeightmap(width: number, height: number, scale: number = 50): number[][] {
    const data: number[][] = [];
    const frequency = 0.02; // Controls hill frequency
    
    for (let x = 0; x < width; x++) {
      data[x] = [];
      for (let z = 0; z < height; z++) {
        // Use multiple octaves for more natural terrain
        let height = 0;
        height += this.noise.perlin2(x * frequency, z * frequency) * scale;
        height += this.noise.perlin2(x * frequency * 2, z * frequency * 2) * (scale * 0.5);
        height += this.noise.perlin2(x * frequency * 4, z * frequency * 4) * (scale * 0.25);
        
        data[x][z] = Math.max(0, height); // Ensure non-negative heights
      }
    }
    return data;
  }
  
  /**
   * Check if a position is in a transition zone between rings
   */
  public getTransitionInfo(position: THREE.Vector3): { 
    isInTransition: boolean; 
    fromRing: number; 
    toRing: number; 
    blendFactor: number; 
  } {
    const dx = position.x - this.worldCenter.x;
    const dz = position.z - this.worldCenter.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check each ring boundary for transition zones
    for (let i = 0; i < this.rings.length - 1; i++) {
      const currentRing = this.rings[i];
      const nextRing = this.rings[i + 1];
      const boundary = currentRing.outerRadius;
      
      // Check if we're in the transition zone
      const distanceFromBoundary = Math.abs(distance - boundary);
      if (distanceFromBoundary <= RingQuadrantSystem.TRANSITION_ZONE_SIZE) {
        const blendFactor = 1 - (distanceFromBoundary / RingQuadrantSystem.TRANSITION_ZONE_SIZE);
        
        if (distance < boundary) {
          // Transitioning from inner ring to outer ring
          return {
            isInTransition: true,
            fromRing: i,
            toRing: i + 1,
            blendFactor: distance > boundary - RingQuadrantSystem.TRANSITION_ZONE_SIZE ? blendFactor : 0
          };
        } else {
          // Transitioning from outer ring to inner ring (approaching from outside)
          return {
            isInTransition: true,
            fromRing: i + 1,
            toRing: i,
            blendFactor: distance < boundary + RingQuadrantSystem.TRANSITION_ZONE_SIZE ? blendFactor : 0
          };
        }
      }
    }
    
    return { isInTransition: false, fromRing: -1, toRing: -1, blendFactor: 0 };
  }

  /**
   * Get blended color between two ring colors
   */
  public getBlendedRingColor(fromRingIndex: number, toRingIndex: number, blendFactor: number): number {
    if (fromRingIndex < 0 || fromRingIndex >= this.rings.length || 
        toRingIndex < 0 || toRingIndex >= this.rings.length) {
      return this.rings[0].terrainColor;
    }
    
    const fromColor = this.rings[fromRingIndex].terrainColor;
    const toColor = this.rings[toRingIndex].terrainColor;
    
    // Extract RGB components
    const fromR = (fromColor >> 16) & 255;
    const fromG = (fromColor >> 8) & 255;
    const fromB = fromColor & 255;
    
    const toR = (toColor >> 16) & 255;
    const toG = (toColor >> 8) & 255;
    const toB = toColor & 255;
    
    // Interpolate between colors
    const r = Math.round(fromR + (toR - fromR) * blendFactor);
    const g = Math.round(fromG + (toG - fromG) * blendFactor);
    const b = Math.round(fromB + (toB - fromB) * blendFactor);
    
    return (r << 16) | (g << 8) | b;
  }

  // Enhanced createTerrainWithHills with smooth transitions
  public createTerrainWithHills(region: RegionCoordinates, size: number = 100): THREE.Mesh {
    const segments = 63;
    const heightmap = this.generateHeightmap(segments + 1, segments + 1, 25);
    
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const vertices = geometry.attributes.position.array as Float32Array;
    
    // Apply heightmap to geometry
    for (let i = 0; i < vertices.length; i += 3) {
      const x = Math.floor((i / 3) / (segments + 1));
      const z = (i / 3) % (segments + 1);
      if (heightmap[x] && heightmap[x][z] !== undefined) {
        vertices[i + 2] = heightmap[x][z];
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Create enhanced material with realistic grass texture
    const center = this.getRegionCenter(region);
    const transitionInfo = this.getTransitionInfo(center);
    
    let material: THREE.MeshStandardMaterial;
    
    if (transitionInfo.isInTransition && transitionInfo.blendFactor > 0.1) {
      // Create blended material for transition zones
      const blendedColor = this.getBlendedRingColor(
        transitionInfo.fromRing,
        transitionInfo.toRing,
        transitionInfo.blendFactor
      );
      
      material = new THREE.MeshStandardMaterial({ 
        color: blendedColor,
        roughness: 0.8,
        metalness: 0.1
      });
      
      // Use realistic grass texture with blended color influence
      const grassTexture = TextureGenerator.createRealisticGrassTexture(blendedColor, region.ringIndex);
      material.map = grassTexture;
    } else {
      // Standard ring material
      const ring = this.rings[region.ringIndex];
      material = new THREE.MeshStandardMaterial({ 
        color: ring.terrainColor,
        roughness: 0.8,
        metalness: 0.1
      });
      
      // Use realistic grass texture
      const grassTexture = TextureGenerator.createRealisticGrassTexture(ring.terrainColor, region.ringIndex);
      material.map = grassTexture;
    }
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.copy(center);
    
    return terrain;
  }
  
  // DEBUG: Create visual markers for ring boundaries
  public createDebugRingMarkers(scene: THREE.Scene): void {
    const segments = 64;
    
    // Create a ring for each boundary
    this.rings.forEach((ring) => {
      [ring.innerRadius, ring.outerRadius].forEach((radius) => {
        if (radius === 0) return; // Skip center point
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          vertices.push(
            Math.cos(angle) * radius, 
            0.1, // Slightly above ground
            Math.sin(angle) * radius
          );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.LineBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.5
        });
        
        const ring = new THREE.LineLoop(geometry, material);
        ring.position.copy(this.worldCenter);
        scene.add(ring);
      });
      
      // Add quadrant dividers
      for (let q = 0; q < 4; q++) {
        const geometry = new THREE.BufferGeometry();
        const angle = q * Math.PI / 2;
        const vertices = [
          this.worldCenter.x, 0.1, this.worldCenter.z,
          this.worldCenter.x + Math.cos(angle) * ring.outerRadius,
          0.1,
          this.worldCenter.z + Math.sin(angle) * ring.outerRadius
        ];
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.LineBasicMaterial({ 
          color: 0xffffff, 
          transparent: true,
          opacity: 0.3
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      }
    });
  }
}
