import * as THREE from 'three';
import { Noise } from 'noisejs';
import { TextureGenerator } from '../utils/graphics/TextureGenerator';
import { GroundMaterialUtils } from '../utils/graphics/GroundMaterialUtils';

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
  private static readonly TRANSITION_ZONE_SIZE = 12; // Reduced for more stable transitions
  
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
    
    let ringIndex = -1;
    for (let i = 0; i < this.rings.length; i++) {
      if (distance >= this.rings[i].innerRadius && distance < this.rings[i].outerRadius) {
        ringIndex = i;
        break;
      }
    }
    
    if (ringIndex === -1) return null;
    
    let quadrant = 0;
    if (dx >= 0 && dz >= 0) quadrant = 0;
    else if (dx >= 0 && dz < 0) quadrant = 1;
    else if (dx < 0 && dz < 0) quadrant = 2;
    else if (dx < 0 && dz >= 0) quadrant = 3;
    
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
  
  // Enhanced heightmap generation with proper base level for hills
  public generateHeightmap(width: number, height: number, scale: number = 25): number[][] {
    const data: number[][] = [];
    const frequency = 0.02; // Controls hill frequency
    const baseLevel = 2; // Minimum height above terrain base to prevent Z-fighting
    
    for (let x = 0; x < width; x++) {
      data[x] = [];
      for (let z = 0; z < height; z++) {
        // Use multiple octaves for more natural terrain
        let height = baseLevel; // Start from base level, not 0
        height += this.noise.perlin2(x * frequency, z * frequency) * scale;
        height += this.noise.perlin2(x * frequency * 2, z * frequency * 2) * (scale * 0.5);
        height += this.noise.perlin2(x * frequency * 4, z * frequency * 4) * (scale * 0.25);
        
        // Ensure minimum height to prevent terrain conflicts
        data[x][z] = Math.max(baseLevel, height);
      }
    }
    return data;
  }
  
  /**
   * Enhanced transition detection with hysteresis to prevent flickering
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
        // Enhanced blend factor calculation with hysteresis
        const rawBlendFactor = Math.min(1, Math.max(0, 1 - (distanceFromBoundary / RingQuadrantSystem.TRANSITION_ZONE_SIZE)));
        
        // Apply smoothstep function for even smoother transitions
        const smoothBlendFactor = rawBlendFactor * rawBlendFactor * rawBlendFactor * (rawBlendFactor * (rawBlendFactor * 6 - 15) + 10);
        
        // Add hysteresis - minimum threshold to prevent rapid switching
        const HYSTERESIS_THRESHOLD = 0.1;
        const finalBlendFactor = smoothBlendFactor < HYSTERESIS_THRESHOLD ? 0 : smoothBlendFactor;
        
        if (distance < boundary) {
          // Transitioning from inner ring to outer ring
          return {
            isInTransition: finalBlendFactor > 0,
            fromRing: i,
            toRing: i + 1,
            blendFactor: distance > boundary - RingQuadrantSystem.TRANSITION_ZONE_SIZE ? finalBlendFactor : 0
          };
        } else {
          // Transitioning from outer ring to inner ring (approaching from outside)
          return {
            isInTransition: finalBlendFactor > 0,
            fromRing: i + 1,
            toRing: i,
            blendFactor: distance < boundary + RingQuadrantSystem.TRANSITION_ZONE_SIZE ? finalBlendFactor : 0
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

  // Enhanced createTerrainWithHills with improved base level and Y-offset system
  public createTerrainWithHills(region: RegionCoordinates, size: number = 100): THREE.Mesh {
    const segments = 63;
    const heightmap = this.generateHeightmap(segments + 1, segments + 1, 20); // Reduced scale for more subtle hills
    
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const vertices = geometry.attributes.position.array as Float32Array;
    
    // Apply heightmap to geometry with proper base level
    for (let i = 0; i < vertices.length; i += 3) {
      const x = Math.floor((i / 3) / (segments + 1));
      const z = (i / 3) % (segments + 1);
      if (heightmap[x] && heightmap[x][z] !== undefined) {
        vertices[i + 2] = heightmap[x][z];
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Create enhanced material with realistic grass texture using GroundMaterialUtils
    const center = this.getRegionCenter(region);
    const transitionInfo = this.getTransitionInfo(center);
    
    let material: THREE.MeshStandardMaterial;
    
    // Enhanced minimum blend factor to prevent constant switching
    const MIN_BLEND_FACTOR = 0.25;
    
    if (transitionInfo.isInTransition && transitionInfo.blendFactor > MIN_BLEND_FACTOR) {
      console.log(`🌈 Creating blended terrain with hills for transition zone (blend: ${transitionInfo.blendFactor.toFixed(2)})`);
      
      // Create blended material for transition zones
      material = GroundMaterialUtils.createBlendedGrassMaterial(
        this.rings[transitionInfo.fromRing].terrainColor,
        this.rings[transitionInfo.toRing].terrainColor,
        transitionInfo.blendFactor,
        region.ringIndex
      );
    } else {
      console.log(`🌱 Creating standard terrain with hills for ring ${region.ringIndex}`);
      
      // Standard ring material with realistic grass
      const ring = this.rings[region.ringIndex];
      material = GroundMaterialUtils.createGrassMaterial(ring.terrainColor, region.ringIndex, {
        roughness: 0.9,
        metalness: 0.0,
        textureScale: 3
      });
    }
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    
    // Enhanced Y-offset system to completely prevent Z-fighting
    const baseLevel = 0.05; // Higher base level to clear other terrain
    const ringOffset = region.ringIndex * 0.01; // More separation between rings
    const quadrantOffset = region.quadrant * 0.005; // Quadrant separation
    const hillOffset = 0.02; // Additional offset for hilly terrain
    
    const totalYOffset = baseLevel + ringOffset + quadrantOffset + hillOffset;
    
    terrain.position.copy(center);
    terrain.position.y = totalYOffset;
    
    console.log(`✅ Enhanced terrain with hills created for ring ${region.ringIndex}, Y-offset: ${totalYOffset.toFixed(4)}`);
    
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
