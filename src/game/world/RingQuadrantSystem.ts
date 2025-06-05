
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
  
  // Define 4 rings with increasing radius and difficulty
  private rings: RingDefinition[] = [
    {
      innerRadius: 0,
      outerRadius: 50,
      difficulty: 1,
      terrainColor: 0x5FAD5F, // Bright lime green
      enemyTypes: ['goblin', 'wolf'],
      structureTypes: ['tavern'],
      eventChance: 0.1
    },
    {
      innerRadius: 50,
      outerRadius: 150,
      difficulty: 2,
      terrainColor: 0x4A9A4A, // Darker green
      enemyTypes: ['goblin', 'wolf', 'orc'],
      structureTypes: ['ruins', 'cabin'],
      eventChance: 0.2
    },
    {
      innerRadius: 150,
      outerRadius: 300,
      difficulty: 3,
      terrainColor: 0x3A8A3A, // Even darker green
      enemyTypes: ['orc', 'bandit', 'troll'],
      structureTypes: ['castle', 'tower'],
      eventChance: 0.3
    },
    {
      innerRadius: 300,
      outerRadius: 600,
      difficulty: 4,
      terrainColor: 0x2A7A2A, // Darkest green
      enemyTypes: ['troll', 'warlord', 'witch'],
      structureTypes: ['temple', 'fortress'],
      eventChance: 0.4
    }
  ];
  
  private worldCenter: THREE.Vector3;
  private activeRegions: Map<string, Region> = new Map();
  private transitionZoneWidth: number = 15; // Width of transition zones between rings
  
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
  
  // Check if a position is in a transition zone between rings
  public getTransitionInfo(position: THREE.Vector3): { isTransition: boolean; fromRing: number; toRing: number; blendFactor: number } {
    const dx = position.x - this.worldCenter.x;
    const dz = position.z - this.worldCenter.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check each ring boundary for transitions
    for (let i = 0; i < this.rings.length - 1; i++) {
      const ringBoundary = this.rings[i].outerRadius;
      const distanceFromBoundary = Math.abs(distance - ringBoundary);
      
      if (distanceFromBoundary <= this.transitionZoneWidth / 2) {
        const blendFactor = distanceFromBoundary / (this.transitionZoneWidth / 2);
        return {
          isTransition: true,
          fromRing: distance < ringBoundary ? i : i + 1,
          toRing: distance < ringBoundary ? i + 1 : i,
          blendFactor: distance < ringBoundary ? 1 - blendFactor : blendFactor
        };
      }
    }
    
    return { isTransition: false, fromRing: -1, toRing: -1, blendFactor: 0 };
  }
  
  // Get blended color for transition zones
  public getBlendedTerrainColor(position: THREE.Vector3): number {
    const transitionInfo = this.getTransitionInfo(position);
    
    if (!transitionInfo.isTransition) {
      const region = this.getRegionForPosition(position);
      return region ? this.rings[region.ringIndex].terrainColor : this.rings[0].terrainColor;
    }
    
    // Blend colors between rings
    const color1 = this.rings[transitionInfo.fromRing].terrainColor;
    const color2 = this.rings[transitionInfo.toRing].terrainColor;
    
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    const blend = transitionInfo.blendFactor;
    const blendedR = Math.floor(r1 * (1 - blend) + r2 * blend);
    const blendedG = Math.floor(g1 * (1 - blend) + g2 * blend);
    const blendedB = Math.floor(b1 * (1 - blend) + b2 * blend);
    
    return (blendedR << 16) | (blendedG << 8) | blendedB;
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
  
  // Enhanced method: Create terrain with realistic grass and smooth transitions
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
    
    // Get position for terrain center to determine if it's in a transition zone
    const center = this.getRegionCenter(region);
    const transitionInfo = this.getTransitionInfo(center);
    
    let material: THREE.MeshLambertMaterial;
    
    if (transitionInfo.isTransition) {
      // Create blended texture for transition zones
      const color1 = this.rings[transitionInfo.fromRing].terrainColor;
      const color2 = this.rings[transitionInfo.toRing].terrainColor;
      const blendedTexture = TextureGenerator.createBlendedGrassTexture(color1, color2, transitionInfo.blendFactor);
      
      material = new THREE.MeshLambertMaterial({
        map: blendedTexture,
        color: this.getBlendedTerrainColor(center)
      });
    } else {
      // Use standard realistic grass texture
      const ring = this.rings[region.ringIndex];
      const grassTexture = TextureGenerator.createRealisticGrassTexture(ring.terrainColor);
      
      material = new THREE.MeshLambertMaterial({
        map: grassTexture,
        color: ring.terrainColor
      });
    }
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    
    // Position terrain at region center
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
