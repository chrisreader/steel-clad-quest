import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { PhysicsManager } from '../engine/PhysicsManager';
import { BuildingManager } from '../buildings/BuildingManager';

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
  
  // Place structures in regions based on ring definitions
  public generateStructuresForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.structures.has(regionKey)) return;
    
    // Initialize structures array
    const structures: Structure[] = [];
    this.structures.set(regionKey, structures);
    
    // Get region properties
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Check if this region should have structures
    const structureTypes = ringDef.structureTypes;
    if (!structureTypes || structureTypes.length === 0) return;
    
    // For ring 0 (center), quadrant 0 (NE), place enhanced staircase and test hill
    if (region.ringIndex === 0 && region.quadrant === 0) {
      // Enhanced staircase at (50, 0, 50)
      const staircase = this.createStaircase(50, 0, 50, 8, 3, 0.6, 1.2);
      structures.push({
        type: 'staircase',
        position: new THREE.Vector3(50, 0, 50),
        rotation: 0,
        model: staircase
      });
      
      this.scene.add(staircase);
      console.log(`🪜 Placed enhanced staircase at (50, 0, 50) in Ring 0, Quadrant 0`);
      
      // Test hill with realistic curved shape at (20, 0, 30)
      const testHill = this.createTestHill(20, 0, 30, 12, 6);
      structures.push({
        type: 'test_hill',
        position: new THREE.Vector3(20, 0, 30),
        rotation: 0,
        model: testHill
      });
      
      console.log(`🏔️ Placed realistic curved hill at (20, 0, 30) in Ring 0, Quadrant 0 for slope testing`);
    }
    
    // For ring 1, quadrant 2 (SW), place a ruined castle using BuildingManager
    if (region.ringIndex === 1 && region.quadrant === 2) {
      // Place castle in the middle of the region
      const position = this.ringSystem.getRegionCenter(region);
      
      // Adjust position to be somewhere in the quadrant, not exactly at center
      position.x += (Math.random() * 30) - 15;
      position.z += (Math.random() * 30) - 15;
      
      // NEW: Use BuildingManager to create castle
      if (this.buildingManager) {
        const castle = this.buildingManager.createBuilding({
          type: 'castle',
          position: position,
          options: {
            wallLength: 36,
            wallHeight: 8,
            towerHeight: 12,
            keepWidth: 15,
            keepHeight: 15
          }
        });
        
        structures.push({
          type: 'castle',
          position: position,
          rotation: Math.random() * Math.PI * 2,
          model: castle.getBuildingGroup()
        });
        
        console.log(`🏰 Placed ruined castle using BuildingManager at ${position.x.toFixed(2)}, ${position.z.toFixed(2)} in Ring 1, Quadrant 2`);
      } else {
        console.warn('🏰 BuildingManager not available, skipping castle creation');
      }
    }
    
    // Add more structure placement logic for other rings/quadrants here
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
