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
  
  // Base ring size for procedural generation
  private static readonly BASE_RING_SIZE = 50;
  private static readonly RING_SIZE_MULTIPLIER = 2.0;
  
  // Define base ring templates for procedural generation
  private ringTemplates: RingDefinition[] = [
    {
      innerRadius: 0,
      outerRadius: 50,
      difficulty: 1,
      terrainColor: 0x5FAD5F, // Green terrain
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
  
  constructor(worldCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.worldCenter = worldCenter;
    // Initialize noise for terrain generation
    this.noise = new Noise(Math.random());
  }
  
  // Get which ring and quadrant a position belongs to (infinite procedural)
  public getRegionForPosition(position: THREE.Vector3): RegionCoordinates | null {
    const dx = position.x - this.worldCenter.x;
    const dz = position.z - this.worldCenter.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate ring index procedurally for infinite rings
    let ringIndex = this.calculateRingIndex(distance);
    
    if (ringIndex < 0) return null;
    
    let quadrant = 0;
    if (dx >= 0 && dz >= 0) quadrant = 0;
    else if (dx >= 0 && dz < 0) quadrant = 1;
    else if (dx < 0 && dz < 0) quadrant = 2;
    else if (dx < 0 && dz >= 0) quadrant = 3;
    
    return { ringIndex, quadrant };
  }
  
  // Get the center position of a region (infinite procedural) - ENHANCED VERSION
  public getRegionCenter(region: RegionCoordinates): THREE.Vector3 {
    const ring = this.getRingDefinition(region.ringIndex);
    
    // FIXED: For Ring 0 (spawn), use the world center
    if (region.ringIndex === 0) {
      // For spawn ring, place quadrants closer to center to prevent gaps
      const spawnRadius = 25; // Small radius for spawn quadrants
      const quadrantAngle = Math.PI / 2; // 90 degrees per quadrant
      const angle = region.quadrant * quadrantAngle + (quadrantAngle / 2);
      
      return new THREE.Vector3(
        this.worldCenter.x + spawnRadius * Math.cos(angle),
        this.worldCenter.y,
        this.worldCenter.z + spawnRadius * Math.sin(angle)
      );
    }
    
    // ENHANCED: For other rings, use more accurate center calculation
    const midRadius = (ring.innerRadius + ring.outerRadius) / 2;
    
    // Calculate angle based on quadrant (center of quadrant)
    const quadrantAngle = Math.PI / 2; // 90 degrees per quadrant
    const angle = region.quadrant * quadrantAngle + (quadrantAngle / 2);
    
    const center = new THREE.Vector3(
      this.worldCenter.x + midRadius * Math.cos(angle),
      this.worldCenter.y,
      this.worldCenter.z + midRadius * Math.sin(angle)
    );
    
    // Debug logging for region centers
    console.log(`📍 [RingSystem] Region R${region.ringIndex}Q${region.quadrant} center: (${center.x.toFixed(1)}, ${center.z.toFixed(1)}), radius: ${midRadius.toFixed(1)}`);
    
    return center;
  }
  
  // Get a unique string key for a region
  public getRegionKey(region: RegionCoordinates): string {
    return `r${region.ringIndex}_q${region.quadrant}`;
  }
  
  // Get regions that should be active based on player position - PLAYER BUBBLE SYSTEM
  public getActiveRegions(playerPosition: THREE.Vector3, renderDistance: number): RegionCoordinates[] {
    const playerRegion = this.getRegionForPosition(playerPosition);
    if (!playerRegion) return [];
    
    const activeRegions: RegionCoordinates[] = [];
    const activeRegionKeys = new Set<string>();
    
    // Always include player's current region
    activeRegions.push(playerRegion);
    activeRegionKeys.add(this.getRegionKey(playerRegion));
    
    // ADAPTIVE SAFETY BUFFER: Calculate buffer based on current ring size to prevent gaps
    const currentRing = this.getRingDefinition(playerRegion.ringIndex);
    const ringSize = currentRing.outerRadius - currentRing.innerRadius;
    
    // CRITICAL: Adaptive buffer sizing - larger rings need bigger buffers
    const baseBuffer = Math.max(200, ringSize * 0.8); // Minimum 200 units or 80% of ring size
    const adaptiveRenderDistance = Math.max(renderDistance, baseBuffer);
    const bufferedRenderDistance = adaptiveRenderDistance * 1.5; // 50% buffer for large rings
    
    console.log(`🌐 [PlayerBubble] Ring ${playerRegion.ringIndex} - Ring Size: ${ringSize.toFixed(0)}, Adaptive Render: ${adaptiveRenderDistance.toFixed(0)}, Buffered: ${bufferedRenderDistance.toFixed(0)}`);
    
    // ENHANCED: Ring-aware loading - load more rings for larger ring systems
    const ringDifficulty = Math.max(2, Math.ceil(ringSize / 100)); // More complex rings need more neighbors
    const ringRange = Math.max(3, ringDifficulty); // Minimum 3 rings, more for complex areas
    
    console.log(`🌐 [PlayerBubble] Ring ${playerRegion.ringIndex} loading - Ring Range: ±${ringRange}, Adaptive Render: ${adaptiveRenderDistance.toFixed(0)}`);
    
    // COMPREHENSIVE LOADING: Load all rings within adaptive range
    for (let r = Math.max(0, playerRegion.ringIndex - ringRange); 
         r <= playerRegion.ringIndex + ringRange; 
         r++) {
      for (let q = 0; q < 4; q++) {
        const regionCoords: RegionCoordinates = { ringIndex: r, quadrant: q };
        const regionKey = this.getRegionKey(regionCoords);
        
        // Skip if already added
        if (activeRegionKeys.has(regionKey)) continue;
        
        // ALWAYS LOAD ADJACENT REGIONS: Ensure no gaps in coverage
        const regionCenter = this.getRegionCenter(regionCoords);
        const distanceToRegion = regionCenter.distanceTo(playerPosition);
        
        // Load if within adaptive distance OR if it's an adjacent ring to prevent gaps
        const isAdjacentRing = Math.abs(r - playerRegion.ringIndex) <= 1;
        const isWithinDistance = distanceToRegion <= bufferedRenderDistance;
        
        if (isWithinDistance || isAdjacentRing) {
          activeRegions.push(regionCoords);
          activeRegionKeys.add(regionKey);
          const reason = isAdjacentRing ? "adjacent" : "distance";
          console.log(`✅ [PlayerBubble] Loading region ${regionKey} (${reason}) - Distance: ${distanceToRegion.toFixed(0)}`);
        }
      }
    }
    
    // ENHANCED: Comprehensive distance-based fallback with larger search area
    const maxSearchDistance = Math.max(bufferedRenderDistance, 1000); // At least 1000 units
    const maxCheckRing = Math.ceil(maxSearchDistance / 50); // Check more rings
    
    for (let r = 0; r <= maxCheckRing; r++) {
      for (let q = 0; q < 4; q++) {
        const regionCoords: RegionCoordinates = { ringIndex: r, quadrant: q };
        const regionKey = this.getRegionKey(regionCoords);
        
        // Skip if already added
        if (activeRegionKeys.has(regionKey)) continue;
        
        const regionCenter = this.getRegionCenter(regionCoords);
        const distanceToRegion = regionCenter.distanceTo(playerPosition);
        
        // Load if within buffered render distance
        if (distanceToRegion <= bufferedRenderDistance) {
          activeRegions.push(regionCoords);
          activeRegionKeys.add(regionKey);
          console.log(`🔄 [RingSystem] Fallback loading region ${regionKey} - Distance: ${distanceToRegion.toFixed(1)}`);
        }
      }
    }
    
    // ENHANCED: Ensure continuity by loading intermediate rings
    // This prevents gaps when jumping between distant rings
    const minRing = Math.min(...activeRegions.map(r => r.ringIndex));
    const maxRing = Math.max(...activeRegions.map(r => r.ringIndex));
    
    for (let r = minRing; r <= maxRing; r++) {
      for (let q = 0; q < 4; q++) {
        const regionCoords: RegionCoordinates = { ringIndex: r, quadrant: q };
        const regionKey = this.getRegionKey(regionCoords);
        
        if (!activeRegionKeys.has(regionKey)) {
          activeRegions.push(regionCoords);
          activeRegionKeys.add(regionKey);
          console.log(`🔗 [RingSystem] Continuity loading region ${regionKey}`);
        }
      }
    }
    
    console.log(`🗺️ [RingSystem] FINAL - Active regions: ${activeRegions.length} (Rings ${minRing}-${maxRing}, Player in Ring ${playerRegion.ringIndex})`);
    return activeRegions;
  }
  
  // Get ring definition for a region (infinite procedural)
  public getRingDefinition(ringIndex: number): RingDefinition {
    return this.generateProceduralRingDefinition(ringIndex);
  }
  
  // Calculate ring index from distance
  private calculateRingIndex(distance: number): number {
    if (distance < 0) return -1;
    
    // Use templates for first few rings
    for (let i = 0; i < this.ringTemplates.length; i++) {
      if (distance >= this.ringTemplates[i].innerRadius && distance < this.ringTemplates[i].outerRadius) {
        return i;
      }
    }
    
    // Beyond templates, calculate procedurally
    let currentDistance = this.ringTemplates[this.ringTemplates.length - 1].outerRadius;
    let ringIndex = this.ringTemplates.length;
    let ringSize = RingQuadrantSystem.BASE_RING_SIZE * Math.pow(RingQuadrantSystem.RING_SIZE_MULTIPLIER, ringIndex);
    
    while (distance >= currentDistance) {
      const nextDistance = currentDistance + ringSize;
      if (distance < nextDistance) {
        return ringIndex;
      }
      currentDistance = nextDistance;
      ringIndex++;
      ringSize = RingQuadrantSystem.BASE_RING_SIZE * Math.pow(RingQuadrantSystem.RING_SIZE_MULTIPLIER, ringIndex);
    }
    
    return ringIndex;
  }
  
  // Generate procedural ring definition
  private generateProceduralRingDefinition(ringIndex: number): RingDefinition {
    // Use predefined templates for first few rings
    if (ringIndex < this.ringTemplates.length) {
      return this.ringTemplates[ringIndex];
    }
    
    // Generate procedural ring beyond templates
    const baseTemplate = this.ringTemplates[this.ringTemplates.length - 1];
    const distanceFromSpawn = ringIndex;
    
    // Calculate ring boundaries
    let innerRadius = this.ringTemplates[this.ringTemplates.length - 1].outerRadius;
    let ringSize = RingQuadrantSystem.BASE_RING_SIZE;
    
    for (let i = this.ringTemplates.length; i < ringIndex; i++) {
      const currentRingSize = ringSize * Math.pow(RingQuadrantSystem.RING_SIZE_MULTIPLIER, i);
      innerRadius += currentRingSize;
    }
    
    const currentRingSize = ringSize * Math.pow(RingQuadrantSystem.RING_SIZE_MULTIPLIER, ringIndex);
    const outerRadius = innerRadius + currentRingSize;
    
    // Progressive difficulty and terrain changes
    const difficulty = Math.min(10, 1 + Math.floor(ringIndex / 2));
    
    // Terrain color progression (getting darker/more hostile)
    const colorProgression = Math.min(1, ringIndex / 20);
    const baseColor = 0x5FAD5F;
    const darkColor = 0x1A2A1A;
    const terrainColor = this.interpolateColor(baseColor, darkColor, colorProgression);
    
    // Enemy progression
    const enemyTypes = this.generateEnemyTypesForRing(ringIndex);
    
    // Structure types based on biome
    const structureTypes = this.generateStructureTypesForRing(ringIndex);
    
    return {
      innerRadius,
      outerRadius,
      difficulty,
      terrainColor,
      enemyTypes,
      structureTypes,
      eventChance: Math.min(0.8, 0.1 + (ringIndex * 0.05))
    };
  }
  
  // Helper to interpolate between colors
  private interpolateColor(color1: number, color2: number, factor: number): number {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return (r << 16) | (g << 8) | b;
  }
  
  // Generate enemy types for distant rings
  private generateEnemyTypesForRing(ringIndex: number): string[] {
    const baseEnemies = ['goblin', 'wolf'];
    const progressiveEnemies = ['orc', 'bandit', 'troll', 'warlord', 'witch', 'dragon', 'demon'];
    
    const result = [...baseEnemies];
    const enemiesToAdd = Math.min(progressiveEnemies.length, Math.floor(ringIndex / 2));
    
    for (let i = 0; i < enemiesToAdd; i++) {
      result.push(progressiveEnemies[i]);
    }
    
    return result;
  }
  
  // Generate structure types for distant rings
  private generateStructureTypesForRing(ringIndex: number): string[] {
    const baseStructures = ['ruins'];
    if (ringIndex < 5) return [...baseStructures, 'cabin'];
    if (ringIndex < 10) return [...baseStructures, 'tower', 'castle'];
    if (ringIndex < 15) return [...baseStructures, 'temple', 'fortress'];
    return [...baseStructures, 'fortress', 'citadel', 'ancient_ruins'];
  }
  
  // Helper to get difficulty for a region (infinite)
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
    
    // Check ring boundaries for transition zones (infinite)
    const currentRingIndex = this.calculateRingIndex(distance);
    if (currentRingIndex >= 0) {
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
    
    // Create debug rings for first few rings only
    this.ringTemplates.forEach((ring) => {
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
