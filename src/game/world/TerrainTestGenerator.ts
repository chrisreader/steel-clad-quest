
import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export interface TestTerrain {
  mesh: THREE.Object3D;
  name: string;
  expectedAngle: number;
  shouldBeWalkable: boolean;
}

export class TerrainTestGenerator {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private testTerrains: TestTerrain[] = [];
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
  }
  
  public generateTestRegion(centerX: number = 50, centerZ: number = 50): void {
    console.log(`🏔️ [TerrainTestGenerator] Creating test terrain at (${centerX}, ${centerZ})`);
    
    // Clear any existing test terrains
    this.clearTestTerrains();
    
    // 1. Gentle Hill (20° slope) - Should be walkable
    this.createGentleHill(centerX - 30, centerZ);
    
    // 2. Medium Slope (35° slope) - Should be walkable
    this.createMediumSlope(centerX - 10, centerZ);
    
    // 3. Steep Cliff (60° slope) - Should block movement
    this.createSteepCliff(centerX + 10, centerZ);
    
    // 4. Staircase - Should be walkable
    this.createStaircase(centerX + 30, centerZ);
    
    console.log(`🏔️ [TerrainTestGenerator] Created ${this.testTerrains.length} test terrains`);
  }
  
  private createGentleHill(x: number, z: number): void {
    const hillWidth = 20;
    const hillHeight = 7; // tan(20°) ≈ 0.36, so 20 * 0.36 ≈ 7
    
    // Create hill geometry using PlaneGeometry and modify vertices
    const geometry = new THREE.PlaneGeometry(hillWidth, hillWidth, 32, 32);
    geometry.rotateX(-Math.PI / 2); // Make it horizontal
    
    // Modify vertices to create hill shape
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x_local = position.getX(i);
      const z_local = position.getZ(i);
      
      // Create gentle hill slope (quadratic falloff from center)
      const distanceFromCenter = Math.sqrt(x_local * x_local + z_local * z_local);
      const maxDistance = hillWidth / 2;
      const heightFactor = Math.max(0, 1 - (distanceFromCenter / maxDistance));
      const height = heightFactor * heightFactor * hillHeight;
      
      position.setY(i, height);
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x4a7c3a,
      wireframe: false
    });
    
    const hill = new THREE.Mesh(geometry, material);
    hill.position.set(x, 0, z);
    hill.receiveShadow = true;
    
    this.scene.add(hill);
    this.physicsManager.addCollisionObject(hill, 'environment', 'stone', `gentle_hill_${Date.now()}`);
    
    this.testTerrains.push({
      mesh: hill,
      name: 'Gentle Hill (20°)',
      expectedAngle: 20,
      shouldBeWalkable: true
    });
    
    console.log(`🏔️ [TerrainTestGenerator] Created gentle hill at (${x}, ${z})`);
  }
  
  private createMediumSlope(x: number, z: number): void {
    const slopeWidth = 15;
    const slopeLength = 20;
    const slopeHeight = 14; // tan(35°) ≈ 0.7, so 20 * 0.7 ≈ 14
    
    // Create ramp geometry
    const geometry = new THREE.PlaneGeometry(slopeWidth, slopeLength, 16, 16);
    geometry.rotateX(-Math.PI / 2);
    
    // Modify vertices to create linear slope
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const z_local = position.getZ(i);
      
      // Linear height increase from -slopeLength/2 to +slopeLength/2
      const heightFactor = (z_local + slopeLength/2) / slopeLength;
      const height = heightFactor * slopeHeight;
      
      position.setY(i, height);
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x8b6914,
      wireframe: false
    });
    
    const slope = new THREE.Mesh(geometry, material);
    slope.position.set(x, 0, z);
    slope.receiveShadow = true;
    
    this.scene.add(slope);
    this.physicsManager.addCollisionObject(slope, 'environment', 'stone', `medium_slope_${Date.now()}`);
    
    this.testTerrains.push({
      mesh: slope,
      name: 'Medium Slope (35°)',
      expectedAngle: 35,
      shouldBeWalkable: true
    });
    
    console.log(`🏔️ [TerrainTestGenerator] Created medium slope at (${x}, ${z})`);
  }
  
  private createSteepCliff(x: number, z: number): void {
    const cliffWidth = 15;
    const cliffLength = 10;
    const cliffHeight = 18; // tan(60°) ≈ 1.73, so 10 * 1.73 ≈ 17.3
    
    // Create steep cliff geometry
    const geometry = new THREE.PlaneGeometry(cliffWidth, cliffLength, 16, 16);
    geometry.rotateX(-Math.PI / 2);
    
    // Modify vertices to create steep slope
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const z_local = position.getZ(i);
      
      // Steep linear height increase
      const heightFactor = (z_local + cliffLength/2) / cliffLength;
      const height = heightFactor * cliffHeight;
      
      position.setY(i, height);
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x696969,
      wireframe: false
    });
    
    const cliff = new THREE.Mesh(geometry, material);
    cliff.position.set(x, 0, z);
    cliff.receiveShadow = true;
    
    this.scene.add(cliff);
    this.physicsManager.addCollisionObject(cliff, 'environment', 'stone', `steep_cliff_${Date.now()}`);
    
    this.testTerrains.push({
      mesh: cliff,
      name: 'Steep Cliff (60°)',
      expectedAngle: 60,
      shouldBeWalkable: false
    });
    
    console.log(`🏔️ [TerrainTestGenerator] Created steep cliff at (${x}, ${z})`);
  }
  
  private createStaircase(x: number, z: number): void {
    const stepWidth = 10;
    const stepDepth = 3;
    const stepHeight = 0.25; // Within 0.3 unit step limit
    const numSteps = 12;
    
    for (let i = 0; i < numSteps; i++) {
      const stepGeometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
      const stepMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8b7355
      });
      
      const step = new THREE.Mesh(stepGeometry, stepMaterial);
      step.position.set(
        x,
        (i + 0.5) * stepHeight, // Stack steps
        z + i * stepDepth - (numSteps * stepDepth) / 2
      );
      step.receiveShadow = true;
      step.castShadow = true;
      
      this.scene.add(step);
      this.physicsManager.addCollisionObject(step, 'environment', 'stone', `stair_step_${i}_${Date.now()}`);
    }
    
    // Create a grouped representation for tracking
    const staircaseGroup = new THREE.Group();
    staircaseGroup.position.set(x, 0, z);
    
    this.testTerrains.push({
      mesh: staircaseGroup,
      name: `Staircase (${numSteps} steps)`,
      expectedAngle: Math.atan(stepHeight / stepDepth) * 180 / Math.PI,
      shouldBeWalkable: true
    });
    
    console.log(`🏔️ [TerrainTestGenerator] Created staircase with ${numSteps} steps at (${x}, ${z})`);
  }
  
  public getTestTerrains(): TestTerrain[] {
    return this.testTerrains;
  }
  
  private clearTestTerrains(): void {
    this.testTerrains.forEach(terrain => {
      this.scene.remove(terrain.mesh);
      
      // Dispose geometry and materials
      if (terrain.mesh instanceof THREE.Mesh) {
        if (terrain.mesh.geometry) terrain.mesh.geometry.dispose();
        if (terrain.mesh.material) {
          if (Array.isArray(terrain.mesh.material)) {
            terrain.mesh.material.forEach(m => m.dispose());
          } else {
            terrain.mesh.material.dispose();
          }
        }
      }
    });
    
    this.testTerrains = [];
  }
  
  public dispose(): void {
    this.clearTestTerrains();
  }
}
