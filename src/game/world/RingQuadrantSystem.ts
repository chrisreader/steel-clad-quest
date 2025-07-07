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
  
  // Define base ring parameters for infinite generation
  private static readonly BASE_RING_SIZE = 100; // Base radius for ring 1
  private static readonly RING_SIZE_MULTIPLIER = 1.8; // How much each ring grows
  private static readonly MAX_CACHED_RINGS = 20; // Cache first 20 rings for performance

  // Cache for generated ring definitions to avoid recalculation
  private ringCache: Map<number, RingDefinition> = new Map();

  // Base biome definitions that will be extended infinitely
  private baseBiomes = [
    { name: 'spawn', color: 0x5FAD5F }, // Spawn area - green
    { name: 'forest', color: 0x4A9A4A }, // Forest biome - darker green  
    { name: 'plains', color: 0x6B8E5A }, // Plains biome - olive green
    { name: 'hills', color: 0x3A8A3A }, // Hills biome - dark green
    { name: 'mountains', color: 0x4A5D3A }, // Mountain biome - brownish green
    { name: 'wasteland', color: 0x8B7355 }, // Wasteland biome - brown
    { name: 'desert', color: 0xDEB887 }, // Desert biome - sandy
    { name: 'tundra', color: 0x708090 }, // Tundra biome - gray
    { name: 'frozen', color: 0xE6E6FA } // Frozen biome - white
  ];
  
  private worldCenter: THREE.Vector3;
  private activeRegions: Map<string, Region> = new Map();
  
  constructor(worldCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.worldCenter = worldCenter;
    // Initialize noise for terrain generation
    this.noise = new Noise(Math.random());
  }
  
  // Get which ring and quadrant a position belongs to - INFINITE VERSION
  public getRegionForPosition(position: THREE.Vector3): RegionCoordinates {
    const dx = position.x - this.worldCenter.x;
    const dz = position.z - this.worldCenter.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate ring index based on distance - INFINITE GENERATION
    let ringIndex = 0;
    if (distance > 0) {
      // Ring 0: 0-50, Ring 1: 50-140, Ring 2: 140-292, etc.
      ringIndex = this.calculateRingIndex(distance);
    }
    
    // Calculate quadrant based on position
    let quadrant = 0;
    if (dx >= 0 && dz >= 0) quadrant = 0;      // NE
    else if (dx >= 0 && dz < 0) quadrant = 1;  // SE  
    else if (dx < 0 && dz < 0) quadrant = 2;   // SW
    else if (dx < 0 && dz >= 0) quadrant = 3;  // NW
    
    return { ringIndex, quadrant };
  }
  
  // Get the center position of a region - INFINITE VERSION
  public getRegionCenter(region: RegionCoordinates): THREE.Vector3 {
    const ring = this.getRingDefinition(region.ringIndex);
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
  
  // Get regions that should be active based on player position - INFINITE VERSION
  public getActiveRegions(playerPosition: THREE.Vector3, renderDistance: number): RegionCoordinates[] {
    const playerRegion = this.getRegionForPosition(playerPosition);
    const activeRegions: RegionCoordinates[] = [];
    
    // Always include player's current region
    activeRegions.push(playerRegion);
    
    // Check adjacent regions - NO UPPER LIMIT for infinite world
    for (let r = Math.max(0, playerRegion.ringIndex - 1); 
         r <= playerRegion.ringIndex + 2; // Load 2 rings ahead for smooth transitions
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
  
  // Get ring definition for a region - INFINITE VERSION WITH CACHING
  public getRingDefinition(ringIndex: number): RingDefinition {
    // Check cache first
    if (this.ringCache.has(ringIndex)) {
      return this.ringCache.get(ringIndex)!;
    }
    
    // Generate ring definition procedurally
    const ringDef = this.generateRingDefinition(ringIndex);
    
    // Cache if within reasonable limits
    if (ringIndex < RingQuadrantSystem.MAX_CACHED_RINGS) {
      this.ringCache.set(ringIndex, ringDef);
    }
    
    return ringDef;
  }
  
  // Helper to get difficulty for a region - INFINITE VERSION
  public getDifficultyForRegion(region: RegionCoordinates): number {
    return this.getRingDefinition(region.ringIndex).difficulty;
  }

  // NEW: Calculate which ring a distance falls into - FIXED FOR INFINITE GENERATION
  private calculateRingIndex(distance: number): number {
    if (distance <= 50) return 0; // Ring 0: spawn area (0-50)
    
    // For rings beyond 0, use exponential growth but handle all cases
    let currentRadius = 50;
    let ringIndex = 1;
    
    while (distance > currentRadius) {
      const nextRadius = currentRadius * RingQuadrantSystem.RING_SIZE_MULTIPLIER;
      if (distance <= nextRadius) break;
      currentRadius = nextRadius;
      ringIndex++;
      
      // Safety check to prevent infinite loops (though mathematically impossible)
      if (ringIndex > 1000) {
        console.warn(`Ring index exceeded 1000 for distance ${distance}, capping at 1000`);
        break;
      }
    }
    
    return ringIndex;
  }

  // NEW: Procedurally generate ring definition for any ring index
  private generateRingDefinition(ringIndex: number): RingDefinition {
    if (ringIndex === 0) {
      // Special case for spawn ring  
      return {
        innerRadius: 0,
        outerRadius: 50,
        difficulty: 1,
        terrainColor: this.baseBiomes[0].color, // Spawn green
        enemyTypes: ['goblin', 'wolf'],
        structureTypes: ['tavern'],
        eventChance: 0.1
      };
    }
    
    // Calculate ring boundaries using exponential growth
    const innerRadius = ringIndex === 1 ? 50 : 50 * Math.pow(RingQuadrantSystem.RING_SIZE_MULTIPLIER, ringIndex - 1);
    const outerRadius = 50 * Math.pow(RingQuadrantSystem.RING_SIZE_MULTIPLIER, ringIndex);
    
    // Calculate difficulty - grows with distance but caps at reasonable levels
    const difficulty = Math.min(10, 1 + Math.floor(ringIndex / 2));
    
    // Select biome based on ring index
    const biomeIndex = Math.min(this.baseBiomes.length - 1, Math.floor(ringIndex / 2));
    const biome = this.baseBiomes[biomeIndex];
    
    // Generate appropriate enemy types based on difficulty
    const enemyTypes = this.generateEnemyTypes(difficulty, biome.name);
    
    // Generate structure types based on biome and difficulty
    const structureTypes = this.generateStructureTypes(biome.name, difficulty);
    
    // Event chance increases with distance but caps
    const eventChance = Math.min(0.8, 0.1 + (ringIndex * 0.1));
    
    return {
      innerRadius,
      outerRadius,
      difficulty,
      terrainColor: biome.color,
      enemyTypes,
      structureTypes,
      eventChance
    };
  }

  // NEW: Generate enemy types based on difficulty and biome
  private generateEnemyTypes(difficulty: number, biomeName: string): string[] {
    const baseEnemies = ['goblin', 'wolf'];
    const intermediateEnemies = ['orc', 'bandit', 'bear'];
    const advancedEnemies = ['troll', 'warlord', 'witch', 'dragon'];
    
    let enemies = [...baseEnemies];
    
    if (difficulty >= 2) enemies.push(...intermediateEnemies);
    if (difficulty >= 4) enemies.push(...advancedEnemies);
    
    // Add biome-specific enemies
    switch (biomeName) {
      case 'forest':
        enemies.push('treant', 'dryad');
        break;
      case 'desert':
        enemies.push('scorpion', 'sphinx');
        break;
      case 'mountains':
        enemies.push('giant', 'yeti');
        break;
      case 'frozen':
        enemies.push('ice_elemental', 'frost_giant');
        break;
    }
    
    return enemies;
  }

  // NEW: Generate structure types based on biome and difficulty  
  private generateStructureTypes(biomeName: string, difficulty: number): string[] {
    const baseStructures = ['ruins', 'cabin'];
    const advancedStructures = ['castle', 'tower', 'temple', 'fortress'];
    
    let structures = [...baseStructures];
    
    if (difficulty >= 3) structures.push(...advancedStructures);
    
    // Add biome-specific structures
    switch (biomeName) {
      case 'desert':
        structures.push('pyramid', 'oasis');
        break;
      case 'mountains':
        structures.push('mine', 'monastery');
        break;
      case 'frozen':
        structures.push('ice_palace', 'glacier_cave');
        break;
    }
    
    return structures;
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
    
    // Check ring boundaries for transition zones - INFINITE VERSION
    const currentRingIndex = this.calculateRingIndex(distance);
    const currentRing = this.getRingDefinition(currentRingIndex);
    const nextRing = this.getRingDefinition(currentRingIndex + 1);
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
          fromRing: currentRingIndex,
          toRing: currentRingIndex + 1,
          blendFactor: distance > boundary - RingQuadrantSystem.TRANSITION_ZONE_SIZE ? finalBlendFactor : 0
        };
      } else {
        // Transitioning from outer ring to inner ring (approaching from outside)
        return {
          isInTransition: finalBlendFactor > 0,
          fromRing: currentRingIndex + 1,
          toRing: currentRingIndex,
          blendFactor: distance < boundary + RingQuadrantSystem.TRANSITION_ZONE_SIZE ? finalBlendFactor : 0
        };
      }
    }
    
    return { isInTransition: false, fromRing: -1, toRing: -1, blendFactor: 0 };
  }

  /**
   * Get blended color between two ring colors
   */
  public getBlendedRingColor(fromRingIndex: number, toRingIndex: number, blendFactor: number): number {
    if (fromRingIndex < 0 || toRingIndex < 0) {
      return this.getRingDefinition(0).terrainColor;
    }
    
    const fromColor = this.getRingDefinition(fromRingIndex).terrainColor;
    const toColor = this.getRingDefinition(toRingIndex).terrainColor;
    
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
        this.getRingDefinition(transitionInfo.fromRing).terrainColor,
        this.getRingDefinition(transitionInfo.toRing).terrainColor,
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
  
  // DEBUG: Create visual markers for ring boundaries
  public createDebugRingMarkers(scene: THREE.Scene): void {
    const segments = 64;
    
    // Create debug rings for first few rings only (performance)
    for (let ringIndex = 0; ringIndex < 5; ringIndex++) {
      const ring = this.getRingDefinition(ringIndex);
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
        
        const ringMesh = new THREE.LineLoop(geometry, material);
        ringMesh.position.copy(this.worldCenter);
        scene.add(ringMesh);
      });
      
      // Add quadrant dividers for this ring
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
    }
  }
}
