
import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from '../RingQuadrantSystem';
import { ClusterGenerator } from './generators/ClusterGenerator';
import { RockShapeFactory } from './generators/RockShapeFactory';
import { ClusterConfiguration } from './types/ClusterTypes';
import { RockShapeType } from './types/RockTypes';

export class RockSystem {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private clusterGenerator: ClusterGenerator;
  private shapeFactory: RockShapeFactory;
  
  // Track spawned rocks by region for cleanup
  private spawnedRocks: Map<string, THREE.Object3D[]> = new Map();
  
  // Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.clusterGenerator = new ClusterGenerator();
    this.shapeFactory = new RockShapeFactory();
  }
  
  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
    console.log('🔧 RockSystem collision registration callback set');
  }
  
  public generateRocksForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.spawnedRocks.has(regionKey)) return;
    
    console.log(`Generating rocks for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const rocks: THREE.Object3D[] = [];
    this.spawnedRocks.set(regionKey, rocks);
    
    // Ring-specific rock generation
    switch(region.ringIndex) {
      case 0: // First ring - moderate rocks
        this.generateModerateRocks(region, rocks);
        break;
      case 1: // Second ring - clustered formations
        this.generateClusteredRocks(region, rocks);
        break;
      case 2: // Third ring - sparse, larger rocks
        this.generateSparseRocks(region, rocks);
        break;
      case 3: // Fourth ring - wasteland rocks
        this.generateWastelandRocks(region, rocks);
        break;
    }
  }
  
  private generateModerateRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    // Generate individual rocks evenly distributed
    const rockCount = 15 + Math.floor(Math.random() * 10); // 15-25 rocks
    
    for (let i = 0; i < rockCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['boulder', 'angular', 'weathered', 'flattened']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.3, max: 0.8 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private generateClusteredRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    // Generate 2-4 clusters per region
    const clusterCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterCenter = this.getRandomPositionInRegion(region);
      const clusterRadius = 15 + Math.random() * 20; // 15-35 units
      
      const config: ClusterConfiguration = {
        centerPosition: clusterCenter,
        radius: clusterRadius,
        foundationCount: 2 + Math.floor(Math.random() * 2), // 2-3 foundation rocks
        supportCount: 3 + Math.floor(Math.random() * 3),    // 3-5 support rocks
        accentCount: 2 + Math.floor(Math.random() * 4),     // 2-5 accent rocks
        environmentalDetails: Math.random() < 0.7 // 70% chance for environmental details
      };
      
      const cluster = this.clusterGenerator.generateCluster(config);
      
      // Add cluster rocks to scene
      cluster.rocks.forEach(clusterRock => {
        clusterRock.instance.mesh.position.copy(clusterRock.position);
        rocks.push(clusterRock.instance.mesh);
        this.scene.add(clusterRock.instance.mesh);
        this.registerCollision(clusterRock.instance.mesh);
      });
      
      // Add environmental details
      cluster.environmentalDetails.forEach(detail => {
        detail.mesh.position.copy(detail.position);
        rocks.push(detail.mesh);
        this.scene.add(detail.mesh);
      });
    }
    
    // Add some individual rocks as well
    const individualCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < individualCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['spire', 'jagged', 'angular']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.4, max: 1.2 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private generateSparseRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    // Fewer, larger rocks
    const rockCount = 8 + Math.floor(Math.random() * 7); // 8-15 rocks
    
    for (let i = 0; i < rockCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['boulder', 'spire', 'angular', 'weathered']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.8, max: 1.5 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private generateWastelandRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    // Mostly large, weathered rocks
    const rockCount = 20 + Math.floor(Math.random() * 15); // 20-35 rocks
    
    for (let i = 0; i < rockCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['weathered', 'angular', 'jagged', 'flattened']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.5, max: 1.8 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private createSingleRock(
    shapeType: RockShapeType,
    position: THREE.Vector3,
    sizeRange: { min: number; max: number }
  ): THREE.Object3D | null {
    try {
      const rockInstance = this.shapeFactory.createRock(shapeType, {
        shapeType,
        sizeRange,
        materialVariation: 0.3,
        weatheringRange: { min: 0.1, max: 0.5 }
      });
      
      rockInstance.mesh.position.copy(position);
      
      // Add random rotation
      rockInstance.mesh.rotation.y = Math.random() * Math.PI * 2;
      
      return rockInstance.mesh;
    } catch (error) {
      console.warn('Failed to create rock:', error);
      return null;
    }
  }
  
  private getRandomShapeType(allowedTypes: RockShapeType[]): RockShapeType {
    return allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
  }
  
  private getRandomPositionInRegion(region: RegionCoordinates): THREE.Vector3 {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    const innerRadius = ringDef.innerRadius;
    const outerRadius = ringDef.outerRadius;
    
    const quadrantStartAngle = region.quadrant * (Math.PI / 2);
    const quadrantEndAngle = quadrantStartAngle + (Math.PI / 2);
    
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const angle = quadrantStartAngle + Math.random() * (quadrantEndAngle - quadrantStartAngle);
    
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
  }
  
  private registerCollision(rock: THREE.Object3D): void {
    if (this.collisionRegistrationCallback) {
      this.collisionRegistrationCallback(rock);
      console.log(`🔧 Registered collision for rock at (${rock.position.x.toFixed(2)}, ${rock.position.z.toFixed(2)})`);
    }
  }
  
  public cleanupRocksForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const rocks = this.spawnedRocks.get(regionKey);
    
    if (!rocks) return;
    
    console.log(`Cleaning up rocks for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    rocks.forEach(rock => {
      this.scene.remove(rock);
      
      if (rock instanceof THREE.Mesh) {
        if (rock.geometry) rock.geometry.dispose();
        if (rock.material) {
          if (Array.isArray(rock.material)) {
            rock.material.forEach(m => m.dispose());
          } else {
            rock.material.dispose();
          }
        }
      }
    });
    
    this.spawnedRocks.delete(regionKey);
  }
  
  public getSpawnedRocksForRegion(regionKey: string): THREE.Object3D[] | undefined {
    return this.spawnedRocks.get(regionKey);
  }
  
  public dispose(): void {
    for (const [regionKey, rocks] of this.spawnedRocks.entries()) {
      rocks.forEach(rock => {
        this.scene.remove(rock);
        
        if (rock instanceof THREE.Mesh) {
          if (rock.geometry) rock.geometry.dispose();
          if (rock.material) {
            if (Array.isArray(rock.material)) {
              rock.material.forEach(m => m.dispose());
            } else {
              rock.material.dispose();
            }
          }
        }
      });
    }
    
    this.spawnedRocks.clear();
  }
}
