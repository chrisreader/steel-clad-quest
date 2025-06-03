import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { PhysicsManager } from '../engine/PhysicsManager';

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
  
  // Enhanced createTestHill with Step-by-Step Debugging
  public createTestHill(x: number, y: number, z: number, radius: number = 15, maxHeight: number = 8): THREE.Mesh {
    console.log(`\n🏔️ === CREATING TEST HILL ===`);
    console.log(`🏔️ Position: (${x}, ${y}, ${z}), Radius: ${radius}, MaxHeight: ${maxHeight}`);
    
    // Create geometry
    const segments = 32;
    const geometry = new THREE.ConeGeometry(radius, maxHeight, segments);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4a5d3a,
      roughness: 0.9,
      metalness: 0.0
    });
    
    const hill = new THREE.Mesh(geometry, material);
    hill.position.set(x, y + maxHeight / 2, z);
    hill.castShadow = true;
    hill.receiveShadow = true;
    hill.name = 'test_hill';
    
    console.log(`🏔️ Hill mesh created at position: (${hill.position.x}, ${hill.position.y}, ${hill.position.z})`);
    
    // Create height data
    const heightMapSize = 64;
    const heightData: number[][] = [];
    
    console.log(`🏔️ Generating height data (${heightMapSize}x${heightMapSize})...`);
    
    for (let i = 0; i <= heightMapSize; i++) {
      heightData[i] = [];
      for (let j = 0; j <= heightMapSize; j++) {
        const worldX = x + (i / heightMapSize - 0.5) * radius * 2;
        const worldZ = z + (j / heightMapSize - 0.5) * radius * 2;
        const distanceFromCenter = Math.sqrt((worldX - x) ** 2 + (worldZ - z) ** 2);
        const normalizedDistance = distanceFromCenter / radius;
        
        let height = 0;
        if (normalizedDistance <= 1.0) {
          height = maxHeight * (1 - normalizedDistance);
        }
        
        heightData[i][j] = height + y;
      }
    }
    
    console.log(`🏔️ Height data generated. Sample heights:`);
    console.log(`  - Center [${heightMapSize/2}][${heightMapSize/2}]: ${heightData[heightMapSize/2][heightMapSize/2]}`);
    console.log(`  - Edge [0][0]: ${heightData[0][0]}`);
    console.log(`  - Edge [${heightMapSize}][${heightMapSize}]: ${heightData[heightMapSize][heightMapSize]}`);
    
    // Add to visual scene
    this.scene.add(hill);
    console.log(`🏔️ Hill added to visual scene`);
    
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
    
    console.log(`🏔️ === HILL CREATION COMPLETE ===\n`);
    return hill;
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
      
      // ENHANCED: Test hill with proper terrain generation at (20, 0, 30)
      const testHill = this.createTestHill(20, 0, 30, 12, 6);
      structures.push({
        type: 'test_hill',
        position: new THREE.Vector3(20, 0, 30),
        rotation: 0,
        model: testHill
      });
      
      console.log(`🏔️ Placed test hill at (20, 0, 30) in Ring 0, Quadrant 0 for slope testing`);
    }
    
    // For ring 1, quadrant 2 (SW), place a ruined castle
    if (region.ringIndex === 1 && region.quadrant === 2) {
      // Place castle in the middle of the region
      const position = this.ringSystem.getRegionCenter(region);
      
      // Adjust position to be somewhere in the quadrant, not exactly at center
      position.x += (Math.random() * 30) - 15;
      position.z += (Math.random() * 30) - 15;
      
      const castle = this.createRuinedCastle(position);
      structures.push({
        type: 'castle',
        position: position,
        rotation: Math.random() * Math.PI * 2,
        model: castle
      });
      
      console.log(`Placed ruined castle at ${position.x}, ${position.z} in Ring 1, Quadrant 2`);
    }
    
    // Add more structure placement logic for other rings/quadrants here
  }
  
  // Create a ruined castle
  private createRuinedCastle(position: THREE.Vector3): THREE.Object3D {
    const castle = new THREE.Group();
    
    // Create base/foundation
    const baseGeometry = new THREE.BoxGeometry(40, 2, 40);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1;
    base.castShadow = true;
    base.receiveShadow = true;
    castle.add(base);
    
    // Create outer walls (partially ruined)
    this.createOuterWalls(castle);
    
    // Create towers (some broken)
    this.createTowers(castle);
    
    // Create central keep
    this.createKeep(castle);
    
    // Position the castle
    castle.position.copy(position);
    
    // Add to scene
    this.scene.add(castle);
    
    return castle;
  }
  
  private createOuterWalls(castle: THREE.Group): void {
    const wallHeight = 8;
    const wallThickness = 2;
    const wallLength = 36; // Slightly smaller than the base
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
    
    // North wall (partially broken)
    const northWallGeometry = new THREE.BoxGeometry(wallLength * 0.7, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight/2 + 1, -wallLength/2 + wallThickness/2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    castle.add(northWall);
    
    // East wall (intact)
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(wallLength/2 - wallThickness/2, wallHeight/2 + 1, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    castle.add(eastWall);
    
    // South wall (intact)
    const southWallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(0, wallHeight/2 + 1, wallLength/2 - wallThickness/2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    castle.add(southWall);
    
    // West wall (very broken - only partial)
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength * 0.3);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(-wallLength/2 + wallThickness/2, wallHeight/2 + 1, wallLength/3);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    castle.add(westWall);
    
    // Add some rubble where walls are broken
    this.createRubble(castle, -wallLength/4, 0, -wallLength/2); // North wall rubble
    this.createRubble(castle, -wallLength/2, 0, 0); // West wall rubble
  }
  
  private createTowers(castle: THREE.Group): void {
    const towerRadius = 4;
    const towerHeight = 12;
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const wallLength = 36;
    
    // Northeast tower (intact)
    const neTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius+1, towerHeight, 8),
      towerMaterial
    );
    neTower.position.set(wallLength/2 - 2, towerHeight/2 + 1, -wallLength/2 + 2);
    neTower.castShadow = true;
    neTower.receiveShadow = true;
    castle.add(neTower);
    
    // Southeast tower (intact)
    const seTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius+1, towerHeight, 8),
      towerMaterial
    );
    seTower.position.set(wallLength/2 - 2, towerHeight/2 + 1, wallLength/2 - 2);
    seTower.castShadow = true;
    seTower.receiveShadow = true;
    castle.add(seTower);
    
    // Southwest tower (broken - half height)
    const swTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius+1, towerHeight/2, 8),
      towerMaterial
    );
    swTower.position.set(-wallLength/2 + 2, towerHeight/4 + 1, wallLength/2 - 2);
    swTower.castShadow = true;
    swTower.receiveShadow = true;
    castle.add(swTower);
    
    // Northwest tower (very broken - just base)
    const nwTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius+1, towerRadius+2, 3, 8),
      towerMaterial
    );
    nwTower.position.set(-wallLength/2 + 2, 1.5, -wallLength/2 + 2);
    nwTower.castShadow = true;
    nwTower.receiveShadow = true;
    castle.add(nwTower);
    
    // Add rubble around broken towers
    this.createRubble(castle, -wallLength/2 + 2, 0, -wallLength/2 + 2); // NW tower rubble
    this.createRubble(castle, -wallLength/2 + 2, 0, wallLength/2 - 2); // SW tower rubble
  }
  
  private createKeep(castle: THREE.Group): void {
    const keepWidth = 15;
    const keepDepth = 20;
    const keepHeight = 15;
    const keepMaterial = new THREE.MeshLambertMaterial({ color: 0x777777 });
    
    // Main keep structure
    const keepGeometry = new THREE.BoxGeometry(keepWidth, keepHeight, keepDepth);
    const keep = new THREE.Mesh(keepGeometry, keepMaterial);
    keep.position.set(2, keepHeight/2 + 1, 0);
    keep.castShadow = true;
    keep.receiveShadow = true;
    castle.add(keep);
    
    // Keep roof (partially collapsed)
    const roofGeometry = new THREE.ConeGeometry(keepWidth/1.5, 8, 4);
    const roof = new THREE.Mesh(roofGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    roof.position.set(2, keepHeight + 5, -keepDepth/4);
    roof.rotation.x = Math.PI * 0.1; // Tilted, as if collapsing
    roof.castShadow = true;
    roof.receiveShadow = true;
    castle.add(roof);
    
    // Keep windows
    this.createWindows(castle, keep);
    
    // Keep entrance
    const doorGeometry = new THREE.BoxGeometry(4, 6, 1);
    const door = new THREE.Mesh(doorGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    door.position.set(2, 4, keepDepth/2 + 0.5);
    door.castShadow = true;
    door.receiveShadow = true;
    castle.add(door);
  }
  
  private createWindows(castle: THREE.Group, keep: THREE.Mesh): void {
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const keepWidth = 15;
    const keepDepth = 20;
    const keepHeight = 15;
    
    // Create windows on each side of the keep
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        // Front windows
        const frontWindow = new THREE.Mesh(
          new THREE.BoxGeometry(2, 3, 0.5),
          windowMaterial
        );
        frontWindow.position.set(
          keep.position.x - keepWidth/3 + i * keepWidth/3,
          keep.position.y - keepHeight/6 + j * keepHeight/3,
          keep.position.z + keepDepth/2 + 0.3
        );
        castle.add(frontWindow);
        
        // Back windows
        const backWindow = new THREE.Mesh(
          new THREE.BoxGeometry(2, 3, 0.5),
          windowMaterial
        );
        backWindow.position.set(
          keep.position.x - keepWidth/3 + i * keepWidth/3,
          keep.position.y - keepHeight/6 + j * keepHeight/3,
          keep.position.z - keepDepth/2 - 0.3
        );
        castle.add(backWindow);
      }
    }
    
    // Side windows
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        // Left windows
        const leftWindow = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 3, 2),
          windowMaterial
        );
        leftWindow.position.set(
          keep.position.x - keepWidth/2 - 0.3,
          keep.position.y - keepHeight/6 + j * keepHeight/3,
          keep.position.z - keepDepth/4 + i * keepDepth/2
        );
        castle.add(leftWindow);
        
        // Right windows
        const rightWindow = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 3, 2),
          windowMaterial
        );
        rightWindow.position.set(
          keep.position.x + keepWidth/2 + 0.3,
          keep.position.y - keepHeight/6 + j * keepHeight/3,
          keep.position.z - keepDepth/4 + i * keepDepth/2
        );
        castle.add(rightWindow);
      }
    }
  }
  
  private createRubble(castle: THREE.Group, x: number, y: number, z: number): void {
    const rubbleGroup = new THREE.Group();
    const rubbleMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
    
    // Create 10-15 random stone pieces
    const stoneCount = 10 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < stoneCount; i++) {
      // Random stone size
      const stoneSize = 0.5 + Math.random() * 1.5;
      
      // Random stone shape (box or icosahedron)
      let stoneGeometry;
      if (Math.random() > 0.5) {
        stoneGeometry = new THREE.BoxGeometry(
          stoneSize * (0.5 + Math.random() * 0.5),
          stoneSize * (0.5 + Math.random() * 0.5),
          stoneSize * (0.5 + Math.random() * 0.5)
        );
      } else {
        stoneGeometry = new THREE.IcosahedronGeometry(stoneSize * 0.5, 0);
      }
      
      const stone = new THREE.Mesh(stoneGeometry, rubbleMaterial);
      
      // Random position within rubble area
      stone.position.set(
        x + (Math.random() * 8) - 4,
        y + (Math.random() * stoneSize),
        z + (Math.random() * 8) - 4
      );
      
      // Random rotation
      stone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      stone.castShadow = true;
      stone.receiveShadow = true;
      rubbleGroup.add(stone);
    }
    
    castle.add(rubbleGroup);
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
