import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { PhysicsManager } from '../engine/PhysicsManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { ForestBiomeManager } from './vegetation/ForestBiomeManager';

export interface Structure {
  type: string;
  position: THREE.Vector3;
  rotation: number;
  model: THREE.Object3D;
}

export class StructureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private structures: Map<string, Structure[]> = new Map();
  private buildingManager: BuildingManager | null = null;
  
  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    // CRITICAL DEBUG: Verify PhysicsManager
    console.log(`🏗️ StructureGenerator constructor:`);
    console.log(`  - PhysicsManager provided: ${!!physicsManager}`);
    console.log(`  - PhysicsManager type: ${typeof physicsManager}`);
    console.log(`  - Has addTerrainCollision method: ${!!(physicsManager?.addTerrainCollision)}`);
  }
  
  // NEW: Set building manager reference
  public setBuildingManager(buildingManager: BuildingManager): void {
    this.buildingManager = buildingManager;
    console.log('🏗️ StructureGenerator: BuildingManager reference set');
  }
  
  // Enhanced staircase creation with proper step naming and metadata
  public createStaircase(x: number, y: number, z: number, steps: number = 5, stepWidth: number = 2, stepHeight: number = 0.5, stepDepth: number = 1): THREE.Group {
    const staircase = new THREE.Group();
    
    for (let i = 0; i < steps; i++) {
      const geometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.1
      });
      const step = new THREE.Mesh(geometry, material);
      
      // Position each step higher and forward
      step.position.set(0, i * stepHeight + stepHeight / 2, i * stepDepth);
      step.castShadow = true;
      step.receiveShadow = true;
      
      // Enhanced step naming and metadata for collision detection
      step.name = 'staircase_step';
      step.userData = { 
        stepIndex: i,
        stepHeight: stepHeight,
        stepDepth: stepDepth,
        stepWidth: stepWidth
      };
      
      staircase.add(step);
    }
    
    staircase.position.set(x, y, z);
    staircase.name = 'staircase';
    
    console.log(`🪜 Created staircase with ${steps} steps at position (${x}, ${y}, ${z})`);
    console.log(`🪜 Each step: width=${stepWidth}, height=${stepHeight}, depth=${stepDepth}`);
    return staircase;
  }
  
  // ENHANCED: Create realistic hill with smooth curved edges
  public createTestHill(x: number, y: number, z: number, radius: number = 15, maxHeight: number = 8): THREE.Mesh {
    console.log(`\n🏔️ === CREATING REALISTIC CURVED HILL ===`);
    console.log(`🏔️ Position: (${x}, ${y}, ${z}), Radius: ${radius}, MaxHeight: ${maxHeight}`);
    
    // Create high-resolution plane geometry for smooth curves
    const segments = 64;
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
    
    // Create height data for physics
    const heightMapSize = 64;
    const heightData: number[][] = [];
    
    console.log(`🏔️ Generating smooth curved height data (${heightMapSize}x${heightMapSize})...`);
    
    // Generate height data with smooth curves
    for (let i = 0; i <= heightMapSize; i++) {
      heightData[i] = [];
      for (let j = 0; j <= heightMapSize; j++) {
        const worldX = x + (i / heightMapSize - 0.5) * radius * 2;
        const worldZ = z + (j / heightMapSize - 0.5) * radius * 2;
        const distanceFromCenter = Math.sqrt((worldX - x) ** 2 + (worldZ - z) ** 2);
        const normalizedDistance = distanceFromCenter / radius;
        
        let height = 0;
        if (normalizedDistance <= 1.0) {
          // Apply smooth curve using smoothstep for natural falloff
          const smoothFactor = this.smoothstep(0, 1, 1 - normalizedDistance);
          // Add additional curvature with a power function for more realistic shape
          const curveFactor = Math.pow(smoothFactor, 1.5);
          height = maxHeight * curveFactor;
        }
        
        heightData[i][j] = height + y;
      }
    }
    
    // Apply height data to geometry vertices
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = (segments + 1) * (segments + 1);
    
    console.log(`🏔️ Applying curved heights to ${vertexCount} vertices...`);
    
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const vertexIndex = i * (segments + 1) + j;
        const arrayIndex = vertexIndex * 3;
        
        // Get world position of this vertex
        const vertexX = positions[arrayIndex] + x;
        const vertexZ = positions[arrayIndex + 1] + z;
        
        // Calculate distance and apply smooth curve
        const distanceFromCenter = Math.sqrt((vertexX - x) ** 2 + (vertexZ - z) ** 2);
        const normalizedDistance = distanceFromCenter / radius;
        
        let height = 0;
        if (normalizedDistance <= 1.0) {
          // Apply smooth curve using smoothstep for natural falloff
          const smoothFactor = this.smoothstep(0, 1, 1 - normalizedDistance);
          // Add additional curvature with a power function for more realistic shape
          const curveFactor = Math.pow(smoothFactor, 1.5);
          height = maxHeight * curveFactor;
        }
        
        // Set the Y coordinate (height) of the vertex
        positions[arrayIndex + 2] = height;
      }
    }
    
    // Update geometry with new positions
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // Compute smooth normals for natural lighting
    
    // Create material
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4a5d3a,
      roughness: 0.9,
      metalness: 0.0
    });
    
    const hill = new THREE.Mesh(geometry, material);
    hill.position.set(x, y, z);
    hill.rotation.x = -Math.PI / 2; // Rotate to horizontal
    hill.castShadow = true;
    hill.receiveShadow = true;
    hill.name = 'test_hill';
    
    console.log(`🏔️ Curved hill mesh created at position: (${hill.position.x}, ${hill.position.y}, ${hill.position.z})`);
    console.log(`🏔️ Height data generated. Sample heights:`);
    console.log(`  - Center [${heightMapSize/2}][${heightMapSize/2}]: ${heightData[heightMapSize/2][heightMapSize/2]}`);
    console.log(`  - Edge [0][0]: ${heightData[0][0]}`);
    console.log(`  - Edge [${heightMapSize}][${heightMapSize}]: ${heightData[heightMapSize][heightMapSize]}`);
    
    // Add to visual scene
    this.scene.add(hill);
    console.log(`🏔️ Curved hill added to visual scene`);
    
    // CRITICAL: Check PhysicsManager before registration
    console.log(`🏔️ PhysicsManager check before registration:`);
    console.log(`  - Exists: ${!!this.physicsManager}`);
    console.log(`  - Type: ${typeof this.physicsManager}`);
    console.log(`  - Has addTerrainCollision: ${!!(this.physicsManager?.addTerrainCollision)}`);
    
    if (this.physicsManager && this.physicsManager.addTerrainCollision) {
      try {
        console.log(`🏔️ Attempting terrain registration...`);
        const terrainId = this.physicsManager.addTerrainCollision(hill, heightData, radius * 2, `test_hill_${x}_${z}`);
        console.log(`🏔️ ✅ Terrain registration SUCCESS: ${terrainId}`);
        
        // Verify registration immediately
        const collisionObjects = this.physicsManager.getCollisionObjects();
        const registeredTerrain = collisionObjects.get(terrainId);
        console.log(`🏔️ Verification - Terrain found in registry: ${!!registeredTerrain}`);
        if (registeredTerrain) {
          console.log(`  - Type: ${registeredTerrain.type}`);
          console.log(`  - Has heightData: ${!!registeredTerrain.heightData}`);
          console.log(`  - HeightData size: ${registeredTerrain.heightData?.length}x${registeredTerrain.heightData?.[0]?.length}`);
        }
        
      } catch (error) {
        console.error(`🏔️ ❌ Terrain registration FAILED:`, error);
      }
    } else {
      console.error(`🏔️ ❌ CRITICAL ERROR: PhysicsManager or addTerrainCollision method missing!`);
      console.log(`  - this.physicsManager: ${this.physicsManager}`);
      console.log(`  - addTerrainCollision method: ${this.physicsManager?.addTerrainCollision}`);
    }
    
    console.log(`🏔️ === CURVED HILL CREATION COMPLETE ===\n`);
    return hill;
  }
  
  // Helper function for smooth interpolation
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  
  // NEW: Create specific test camp near spawn
  private createTestCamp(): void {
    console.log('🏕️ [StructureGenerator] Creating TEST CAMP near spawn');
    
    if (!this.buildingManager) {
      console.warn('🏕️ [StructureGenerator] BuildingManager not available for test camp');
      return;
    }
    
    const testCampPosition = new THREE.Vector3(40, 0, 30);
    const testCamp = this.buildingManager.createBuilding({
      type: 'human_camp',
      position: testCampPosition,
      id: 'test_camp_spawn',
      campConfig: { 
        size: 'medium',
        npcCount: 1,
        hasRareChest: true,
        tentCount: 2
      }
    });
    
    if (testCamp) {
      console.log(`🏕️ ✅ TEST CAMP placed at (${testCampPosition.x}, ${testCampPosition.z}) with NPC`);
    } else {
      console.error(`🏕️ ❌ TEST CAMP creation failed`);
    }
  }
  
  // NEW: Create guaranteed camps at specific locations
  private createGuaranteedCamp(type: string, position: THREE.Vector3): void {
    console.log(`🏕️ [StructureGenerator] Creating GUARANTEED ${type} camp at`, position);
    
    if (!this.buildingManager) {
      console.warn(`🏕️ [StructureGenerator] BuildingManager not available for ${type} camp`);
      return;
    }
    
    const campConfig = {
      size: Math.random() < 0.5 ? 'medium' : 'large' as 'medium' | 'large',
      npcCount: 1,
      hasRareChest: true,
      tentCount: type === 'forest' ? 3 : 2
    };
    
    const camp = this.buildingManager.createBuilding({
      type: 'human_camp',
      position: position,
      id: `guaranteed_${type}_camp`,
      campConfig: campConfig
    });
    
    if (camp) {
      console.log(`🏕️ ✅ GUARANTEED ${type.toUpperCase()} CAMP placed at (${position.x}, ${position.z}) with NPC`);
    } else {
      console.error(`🏕️ ❌ GUARANTEED ${type.toUpperCase()} CAMP creation failed`);
    }
  }
  
  // NEW: Create random camps in appropriate locations
  private createRandomCamp(region: RegionCoordinates): void {
    console.log(`🏕️ [StructureGenerator] Creating RANDOM camp in Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    if (!this.buildingManager) {
      console.warn(`🏕️ [StructureGenerator] BuildingManager not available for random camp`);
      return;
    }
    
    const regionCenter = this.ringSystem.getRegionCenter(region);
    const testPosition = regionCenter.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        0,
        (Math.random() - 0.5) * 50
      )
    );
    
    const forestDensity = this.getForestDensityAtPosition(testPosition);
    const rockFormationNearby = this.hasLargeRockFormationNearby(testPosition);
    
    // Only spawn if near forests OR rocks
    if (forestDensity > 0.5 || rockFormationNearby) {
      const campPosition = this.findOptimalCampPosition(testPosition);
      const campSize = Math.random() < 0.6 ? 'small' : Math.random() < 0.8 ? 'medium' : 'large';
      
      const randomCamp = this.buildingManager.createBuilding({
        type: 'human_camp',
        position: campPosition,
        id: `random_camp_${region.ringIndex}_${region.quadrant}`,
        campConfig: { 
          size: campSize as 'small' | 'medium' | 'large',
          npcCount: 1,
          hasRareChest: Math.random() < 0.3,
          tentCount: campSize === 'small' ? 1 : campSize === 'medium' ? 2 : 3
        }
      });
      
      if (randomCamp) {
        const placementReason = forestDensity > 0.5 ? 'dense forest' : 'rock formation';
        console.log(`🏕️ ✅ RANDOM ${campSize.toUpperCase()} CAMP placed at (${campPosition.x.toFixed(2)}, ${campPosition.z.toFixed(2)}) near ${placementReason}`);
      } else {
        console.error(`🏕️ ❌ RANDOM CAMP creation failed`);
      }
    } else {
      console.log(`🏕️ [StructureGenerator] Random camp rejected - not near suitable terrain`);
    }
  }

  // Place structures in regions based on ring definitions
  public generateStructuresForRegion(region: RegionCoordinates): void {
    console.log(`🏗️ [StructureGenerator] Generating structures for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.structures.has(regionKey)) {
      console.log(`🏗️ [StructureGenerator] Region ${regionKey} already generated, skipping`);
      return;
    }
    
    // Initialize structures array
    const structures: Structure[] = [];
    this.structures.set(regionKey, structures);
    
    // Get region properties
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // GUARANTEED TEST CAMP - Ring 0, Quadrant 0 ONLY
    if (region.ringIndex === 0 && region.quadrant === 0) {
      console.log('🏕️ [StructureGenerator] Creating GUARANTEED test camp in Ring 0, Quadrant 0');
      this.createTestCamp();
      
      // Also create original structures (staircase, hill)
      const staircase = this.createStaircase(50, 0, 50, 8, 3, 0.6, 1.2);
      structures.push({
        type: 'staircase',
        position: new THREE.Vector3(50, 0, 50),
        rotation: 0,
        model: staircase
      });
      this.scene.add(staircase);
      
      const testHill = this.createTestHill(20, 0, 30, 12, 6);
      structures.push({
        type: 'test_hill',
        position: new THREE.Vector3(20, 0, 30),
        rotation: 0,
        model: testHill
      });
    }
    
    // ADDITIONAL CAMPS - More regions for better coverage
    if (region.ringIndex === 1 && region.quadrant === 0) {
      console.log('🏕️ [StructureGenerator] Creating camp in Ring 1, Quadrant 0');
      this.createGuaranteedCamp('forest', new THREE.Vector3(60, 0, 20));
    }
    
    if (region.ringIndex === 1 && region.quadrant === 2) {
      console.log('🏕️ [StructureGenerator] Creating camp in Ring 1, Quadrant 2');
      this.createGuaranteedCamp('plains', new THREE.Vector3(-40, 0, -30));
    }
    
    // Original guaranteed camps in ring 2
    if (region.ringIndex === 2 && region.quadrant === 1) {
      console.log('🏕️ [StructureGenerator] Creating GUARANTEED forest camp in Ring 2, Quadrant 1');
      this.createGuaranteedCamp('forest', new THREE.Vector3(-80, 0, 60));
    }
    
    if (region.ringIndex === 2 && region.quadrant === 3) {
      console.log('🏕️ [StructureGenerator] Creating GUARANTEED rock camp in Ring 2, Quadrant 3');
      this.createGuaranteedCamp('rock', new THREE.Vector3(70, 0, -85));
    }
    
    // Random camps in outer rings - INCREASED SPAWN CHANCE
    if (region.ringIndex >= 2 && region.ringIndex <= 4) {
      // Increased spawn chance from 0.3 to 0.6 for more camps
      if (Math.random() < 0.6) {
        console.log(`🏕️ [StructureGenerator] Creating RANDOM camp in Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
        this.createRandomCamp(region);
      } else {
        console.log(`🏕️ [StructureGenerator] Skipped random camp creation in Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
      }
    }
    
    // Handle other structures (castle, etc.)
    if (region.ringIndex === 1 && region.quadrant === 2) {
      const position = this.ringSystem.getRegionCenter(region);
      position.x += (Math.random() * 30) - 15;
      position.z += (Math.random() * 30) - 15;

      if (this.buildingManager) {
        const castle = this.buildingManager.createBuilding({
          type: 'castle',
          position: position,
          id: `castle_${region.ringIndex}_${region.quadrant}`
        });
        
        if (castle) {
          structures.push({
            type: 'castle',
            position: position,
            rotation: Math.random() * Math.PI * 2,
            model: castle.getBuildingGroup()
          });
          console.log(`🏰 Placed ruined castle using BuildingManager at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
        }
      }
    }
    
    console.log(`🏗️ [StructureGenerator] Structure generation complete for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
  }
  // GUARANTEED CAMPS: Ensure at least 2 camps always exist in the world
  private createGuaranteedCamps(region: RegionCoordinates, structures: Structure[]): void {
    // Only place guaranteed camps in specific regions to avoid duplicates
    
    // Guaranteed Forest Camp - Ring 2, Quadrant 1 (SE)
    if (region.ringIndex === 2 && region.quadrant === 1) {
      const forestCampPosition = new THREE.Vector3(120, 0, 80); // Known dense forest area
      
      console.log(`🏕️ [GUARANTEED] Creating forest camp at (${forestCampPosition.x}, ${forestCampPosition.z})`);
      
      if (this.buildingManager) {
        const forestCamp = this.buildingManager.createBuilding({
          type: 'human_camp',
          position: forestCampPosition,
          id: `guaranteed_forest_camp`,
          campConfig: { 
            size: Math.random() < 0.5 ? 'medium' : 'large',
            npcCount: 2,
            hasRareChest: true
          }
        });
        
        if (forestCamp) {
          structures.push({
            type: 'human_camp',
            position: forestCampPosition,
            rotation: 0,
            model: forestCamp.getBuildingGroup()
          });
          
          console.log(`🏕️ ✅ GUARANTEED FOREST CAMP placed at (${forestCampPosition.x}, ${forestCampPosition.z})`);
        }
      }
    }
    
    // Guaranteed Rock Camp - Ring 2, Quadrant 3 (NW)  
    if (region.ringIndex === 2 && region.quadrant === 3) {
      const rockCampPosition = new THREE.Vector3(-90, 0, 110); // Known rock formation area
      
      console.log(`🏕️ [GUARANTEED] Creating rock camp at (${rockCampPosition.x}, ${rockCampPosition.z})`);
      
      if (this.buildingManager) {
        const rockCamp = this.buildingManager.createBuilding({
          type: 'human_camp',
          position: rockCampPosition,
          id: `guaranteed_rock_camp`,
          campConfig: { 
            size: Math.random() < 0.5 ? 'medium' : 'large',
            npcCount: 2,
            hasRareChest: true
          }
        });
        
        if (rockCamp) {
          structures.push({
            type: 'human_camp',
            position: rockCampPosition,
            rotation: 0,
            model: rockCamp.getBuildingGroup()
          });
          
          console.log(`🏕️ ✅ GUARANTEED ROCK CAMP placed at (${rockCampPosition.x}, ${rockCampPosition.z})`);
        }
      }
    }
  }

  // Helper method to get biome info for camp placement
  private getBiomeInfoForPosition(position: THREE.Vector3): { type: string } {
    // Simple forest detection - you can integrate with your biome system
    const forestNoise = Math.sin(position.x * 0.01) * Math.cos(position.z * 0.01);
    return { type: forestNoise > 0.3 ? 'meadow' : 'normal' };
  }

  // NEW: Detect forest density using ForestBiomeManager
  private getForestDensityAtPosition(position: THREE.Vector3): number {
    const forestBiome = ForestBiomeManager.getForestBiomeAtPosition(position);
    if (!forestBiome) {
      console.log(`🌲 [DEBUG] No forest biome at position (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
      return 0;
    }
    
    const config = ForestBiomeManager.getForestConfig(forestBiome);
    // Add noise-based density variation
    const densityNoise = Math.sin(position.x * 0.005) * Math.cos(position.z * 0.005);
    const finalDensity = config.density * (0.8 + densityNoise * 0.4); // Vary density by ±40%
    
    console.log(`🌲 [DEBUG] Forest density at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}): biome=${forestBiome}, base=${config.density}, final=${finalDensity.toFixed(2)}`);
    return finalDensity;
  }

  // NEW: Detect large rock formations nearby
  private hasLargeRockFormationNearby(position: THREE.Vector3): boolean {
    // Use noise to simulate rock formation detection
    const rockNoise1 = Math.sin(position.x * 0.003) * Math.cos(position.z * 0.003);
    const rockNoise2 = Math.sin(position.x * 0.007) * Math.cos(position.z * 0.007);
    
    // Large rock formations have both low-frequency and high-frequency components
    const rockFormationStrength = Math.abs(rockNoise1) + Math.abs(rockNoise2) * 0.5;
    const hasRocks = rockFormationStrength > 0.8; // Threshold for "large" formations
    
    console.log(`🪨 [DEBUG] Rock formation at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}): strength=${rockFormationStrength.toFixed(2)}, hasRocks=${hasRocks}`);
    return hasRocks;
  }

  // NEW: Find optimal camp position near but not inside obstacles
  private findOptimalCampPosition(basePosition: THREE.Vector3): THREE.Vector3 {
    const searchRadius = 15;
    let bestPosition = basePosition.clone();
    let bestScore = this.evaluateCampPositionScore(basePosition);
    
    // Try several positions around the base position
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const testPosition = basePosition.clone().add(
        new THREE.Vector3(
          Math.cos(angle) * searchRadius,
          0,
          Math.sin(angle) * searchRadius
        )
      );
      
      const score = this.evaluateCampPositionScore(testPosition);
      if (score > bestScore) {
        bestScore = score;
        bestPosition = testPosition;
      }
    }
    
    return bestPosition;
  }

  // Helper to evaluate how good a position is for a camp
  private evaluateCampPositionScore(position: THREE.Vector3): number {
    let score = 0;
    
    // Higher score near forests
    const forestDensity = this.getForestDensityAtPosition(position);
    score += forestDensity * 30;
    
    // Higher score near (but not too close to) rock formations
    const hasRocks = this.hasLargeRockFormationNearby(position);
    if (hasRocks) score += 40;
    
    // Prefer flatter areas (simulated)
    const terrainFlatness = 1 - Math.abs(Math.sin(position.x * 0.01) * Math.cos(position.z * 0.01)) * 0.5;
    score += terrainFlatness * 20;
    
    // Add some randomness for natural variation
    score += (Math.random() - 0.5) * 10;
    
    return score;
  }
  
  // Cleanup structures for a region
  public cleanupStructuresForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const structures = this.structures.get(regionKey);
    
    if (!structures) return;
    
    console.log(`Cleaning up structures for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Remove all structures from scene
    structures.forEach(structure => {
      this.scene.remove(structure.model);
      
      // Dispose geometries and materials
      structure.model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    
    // Clear the array
    this.structures.delete(regionKey);
  }
  
  public dispose(): void {
    // Clean up all structures
    for (const [regionKey, structures] of this.structures.entries()) {
      structures.forEach(structure => {
        this.scene.remove(structure.model);
        
        // Dispose geometries and materials
        structure.model.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      });
    }
    
    this.structures.clear();
  }
}
