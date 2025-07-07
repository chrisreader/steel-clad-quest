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
  
  // PROCEDURAL INFINITE RING SYSTEM - No hardcoded limits
  // Ring size progression: 50, 150, 300, 600, 1200, 2400, 4800... (doubling pattern after ring 3)
  private static readonly BASE_RING_SIZES = [50, 150, 300, 600];
  
  // Biome color palettes for each quadrant in outer rings
  private static readonly BIOME_COLORS = {
    grassland: [0x5FAD5F, 0x4A9A4A, 0x3A8A3A, 0x2A7A2A], // Green progression
    desert: [0xD2B48C, 0xC19A6B, 0xB08956, 0x9F7845],     // Sandy browns
    forest: [0x228B22, 0x006400, 0x355E3B, 0x2F4F2F],     // Deep greens
    swamp: [0x4F7942, 0x3C5F37, 0x2F4B2C, 0x1C3A1C],      // Murky greens
    mountain: [0x696969, 0x555555, 0x2F4F4F, 0x1C1C1C]    // Grays to black
  };
  
  private worldCenter: THREE.Vector3;
  private activeRegions: Map<string, Region> = new Map();
  
  constructor(worldCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.worldCenter = worldCenter;
    // Initialize noise for terrain generation
    this.noise = new Noise(Math.random());
  }
  
  // INFINITE RING POSITION CALCULATION - No hardcoded limits
  public getRegionForPosition(position: THREE.Vector3): RegionCoordinates | null {
    const dx = position.x - this.worldCenter.x;
    const dz = position.z - this.worldCenter.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate ring index procedurally for infinite distance
    const ringIndex = this.calculateRingIndex(distance);
    
    // Calculate quadrant (NE=0, SE=1, SW=2, NW=3)
    let quadrant = 0;
    if (dx >= 0 && dz >= 0) quadrant = 0;      // Northeast
    else if (dx >= 0 && dz < 0) quadrant = 1;  // Southeast  
    else if (dx < 0 && dz < 0) quadrant = 2;   // Southwest
    else if (dx < 0 && dz >= 0) quadrant = 3;  // Northwest
    
    return { ringIndex, quadrant };
  }
  
  // PROCEDURAL RING INDEX CALCULATION - Infinite distance support
  private calculateRingIndex(distance: number): number {
    // Ring 0: 0-50, Ring 1: 50-150, Ring 2: 150-300, Ring 3: 300-600
    // Ring 4+: Doubling pattern 600-1200, 1200-2400, 2400-4800...
    
    if (distance < RingQuadrantSystem.BASE_RING_SIZES[0]) return 0;
    if (distance < RingQuadrantSystem.BASE_RING_SIZES[1]) return 1;
    if (distance < RingQuadrantSystem.BASE_RING_SIZES[2]) return 2;
    if (distance < RingQuadrantSystem.BASE_RING_SIZES[3]) return 3;
    
    // For Ring 4+: Calculate using doubling progression
    let currentRadius = RingQuadrantSystem.BASE_RING_SIZES[3]; // Start at 600
    let ringIndex = 4;
    
    while (distance >= currentRadius) {
      const nextRadius = currentRadius * 2; // Double each ring
      if (distance < nextRadius) {
        return ringIndex;
      }
      currentRadius = nextRadius;
      ringIndex++;
    }
    
    return ringIndex;
  }
  
  // PROCEDURAL REGION CENTER CALCULATION - Infinite ring support
  public getRegionCenter(region: RegionCoordinates): THREE.Vector3 {
    const { innerRadius, outerRadius } = this.getRingBounds(region.ringIndex);
    const midRadius = (innerRadius + outerRadius) / 2;
    
    // Calculate angle based on quadrant (center of quadrant)
    const quadrantAngle = Math.PI / 2; // 90 degrees per quadrant
    const angle = region.quadrant * quadrantAngle + (quadrantAngle / 2);
    
    return new THREE.Vector3(
      this.worldCenter.x + midRadius * Math.cos(angle),
      this.worldCenter.y,
      this.worldCenter.z + midRadius * Math.sin(angle)
    );
  }
  
  // PROCEDURAL RING BOUNDS CALCULATION - Infinite distance support
  private getRingBounds(ringIndex: number): { innerRadius: number; outerRadius: number } {
    if (ringIndex < RingQuadrantSystem.BASE_RING_SIZES.length) {
      // Base rings 0-3
      const innerRadius = ringIndex === 0 ? 0 : RingQuadrantSystem.BASE_RING_SIZES[ringIndex - 1];
      const outerRadius = RingQuadrantSystem.BASE_RING_SIZES[ringIndex];
      return { innerRadius, outerRadius };
    }
    
    // Ring 4+: Calculate using doubling progression
    let currentInner = RingQuadrantSystem.BASE_RING_SIZES[3]; // Start at 600
    let currentOuter = currentInner * 2; // 1200
    
    for (let i = 4; i < ringIndex; i++) {
      currentInner = currentOuter;
      currentOuter = currentOuter * 2;
    }
    
    return { innerRadius: currentInner, outerRadius: currentOuter };
  }
  
  // Get a unique string key for a region
  public getRegionKey(region: RegionCoordinates): string {
    return `r${region.ringIndex}_q${region.quadrant}`;
  }
  
  // INFINITE ACTIVE REGIONS - No hardcoded ring limits
  public getActiveRegions(playerPosition: THREE.Vector3, renderDistance: number): RegionCoordinates[] {
    const playerRegion = this.getRegionForPosition(playerPosition);
    if (!playerRegion) return [];
    
    const activeRegions: RegionCoordinates[] = [];
    
    // Always include player's current region
    activeRegions.push(playerRegion);
    
    // INFINITE RING EXPANSION - Check adjacent regions without limits
    const maxRingCheck = playerRegion.ringIndex + 3; // Check 3 rings out for safety
    
    for (let r = Math.max(0, playerRegion.ringIndex - 2); r <= maxRingCheck; r++) {
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
  
  // PROCEDURAL RING DEFINITION GENERATION - Infinite ring support
  public getRingDefinition(ringIndex: number): RingDefinition {
    const { innerRadius, outerRadius } = this.getRingBounds(ringIndex);
    
    // Generate procedural ring properties based on distance
    const difficulty = Math.min(10, 1 + Math.floor(ringIndex * 0.8)); // Cap at difficulty 10
    const eventChance = Math.min(0.6, 0.1 + (ringIndex * 0.05)); // Increase adventure events with distance
    
    // Determine biome and colors based on ring index
    const { terrainColor, enemyTypes, structureTypes } = this.getBiomeProperties(ringIndex);
    
    return {
      innerRadius,
      outerRadius,
      difficulty,
      terrainColor,
      enemyTypes,
      structureTypes,
      eventChance
    };
  }
  
  // PROCEDURAL BIOME PROPERTIES - Ring-based biome assignment
  private getBiomeProperties(ringIndex: number): {
    terrainColor: number;
    enemyTypes: string[];
    structureTypes: string[];
  } {
    if (ringIndex <= 1) {
      // Ring 0-1: Grassland (safe starting area)
      const colors = RingQuadrantSystem.BIOME_COLORS.grassland;
      const colorIndex = Math.min(ringIndex, colors.length - 1);
      return {
        terrainColor: colors[colorIndex],
        enemyTypes: ['goblin', 'wolf'],
        structureTypes: ['tavern', 'cabin']
      };
    }
    
    // Ring 2+: Each quadrant becomes a distinct biome based on ring depth
    const biomeDepth = Math.min(3, ringIndex - 2); // Use for color progression
    
    return {
      terrainColor: RingQuadrantSystem.BIOME_COLORS.grassland[biomeDepth], // Default to grassland
      enemyTypes: this.generateEnemyTypes(ringIndex),
      structureTypes: this.generateStructureTypes(ringIndex)
    };
  }
  
  // PROCEDURAL BIOME COLOR FOR QUADRANT - Ring-Quadrant specific biomes
  public getBiomeColorForQuadrant(ringIndex: number, quadrant: number): number {
    if (ringIndex <= 1) {
      // Ring 0-1: All grassland
      const colors = RingQuadrantSystem.BIOME_COLORS.grassland;
      return colors[Math.min(ringIndex, colors.length - 1)];
    }
    
    // Ring 2+: Quadrant-specific biomes with color progression
    const biomeDepth = Math.min(3, ringIndex - 2);
    
    switch (quadrant) {
      case 0: // Northeast: Desert biome
        return RingQuadrantSystem.BIOME_COLORS.desert[biomeDepth];
      case 1: // Southeast: Dense forest biome  
        return RingQuadrantSystem.BIOME_COLORS.forest[biomeDepth];
      case 2: // Southwest: Swamp biome
        return RingQuadrantSystem.BIOME_COLORS.swamp[biomeDepth];
      case 3: // Northwest: Mountain biome
        return RingQuadrantSystem.BIOME_COLORS.mountain[biomeDepth];
      default:
        return RingQuadrantSystem.BIOME_COLORS.grassland[biomeDepth];
    }
  }
  
  private generateEnemyTypes(ringIndex: number): string[] {
    const baseEnemies = ['goblin', 'wolf'];
    const advancedEnemies = ['orc', 'bandit', 'troll', 'warlord', 'witch', 'dragon'];
    
    // Add more enemy types as ring index increases
    const enemyCount = Math.min(6, 2 + Math.floor(ringIndex / 2));
    return [...baseEnemies, ...advancedEnemies.slice(0, enemyCount - 2)];
  }
  
  private generateStructureTypes(ringIndex: number): string[] {
    const baseStructures = ['cabin', 'ruins'];
    const advancedStructures = ['castle', 'tower', 'temple', 'fortress', 'dungeon', 'sanctuary'];
    
    // Add more structure types as ring index increases
    const structureCount = Math.min(6, 2 + Math.floor(ringIndex / 3));
    return [...baseStructures, ...advancedStructures.slice(0, structureCount - 2)];
  }
  
  // Helper to get difficulty for a region
  public getDifficultyForRegion(region: RegionCoordinates): number {
    return this.getRingDefinition(region.ringIndex).difficulty;
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
    
    // Check transitions for base rings only (0-3) to maintain compatibility
    for (let i = 0; i < RingQuadrantSystem.BASE_RING_SIZES.length - 1; i++) {
      const currentBounds = this.getRingBounds(i);
      const nextBounds = this.getRingBounds(i + 1);
      const boundary = currentBounds.outerRadius;
      
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
    if (fromRingIndex < 0 || toRingIndex < 0) {
      return RingQuadrantSystem.BIOME_COLORS.grassland[0];
    }
    
    const fromRing = this.getRingDefinition(fromRingIndex);
    const toRing = this.getRingDefinition(toRingIndex);
    
    const fromColor = fromRing.terrainColor;
    const toColor = toRing.terrainColor;
    
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
      const fromRing = this.getRingDefinition(transitionInfo.fromRing);
      const toRing = this.getRingDefinition(transitionInfo.toRing);
      material = GroundMaterialUtils.createBlendedGrassMaterial(
        fromRing.terrainColor,
        toRing.terrainColor,
        transitionInfo.blendFactor,
        region.ringIndex
      );
    } else {
      console.log(`🌱 Creating standard terrain with hills for ring ${region.ringIndex}`);
      
      // Standard ring material with realistic grass
      const ring = this.getRingDefinition(region.ringIndex);
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
  
  // DEBUG: Create visual markers for ring boundaries (base rings only)
  public createDebugRingMarkers(scene: THREE.Scene): void {
    const segments = 64;
    
    // Create markers for base rings only to avoid performance issues
    for (let i = 0; i < RingQuadrantSystem.BASE_RING_SIZES.length; i++) {
      const ringBounds = this.getRingBounds(i);
      [ringBounds.innerRadius, ringBounds.outerRadius].forEach((radius) => {
        if (radius === 0) return; // Skip center point
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
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
          this.worldCenter.x + Math.cos(angle) * ringBounds.outerRadius,
          0.1,
          this.worldCenter.z + Math.sin(angle) * ringBounds.outerRadius
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
    }
  }
}
