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
  
  private spawnedRocks: Map<string, THREE.Object3D[]> = new Map();
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
    
    if (this.spawnedRocks.has(regionKey)) return;
    
    console.log(`🏔️ Generating MASSIVE rock formations for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const rocks: THREE.Object3D[] = [];
    this.spawnedRocks.set(regionKey, rocks);
    
    // Enhanced ring-specific generation with massive clusters
    switch(region.ringIndex) {
      case 0: // First ring - moderate rocks with some clusters
        this.generateEnhancedModerateRocks(region, rocks);
        break;
      case 1: // Second ring - massive clustered formations
        this.generateMassiveClusteredRocks(region, rocks);
        break;
      case 2: // Third ring - sparse massive boulders and mega-clusters
        this.generateMegaClusterRocks(region, rocks);
        break;
      case 3: // Fourth ring - weathered massive formations
        this.generateWastelandMegaRocks(region, rocks);
        break;
    }
    
    console.log(`🏔️ Generated ${rocks.length} total rock objects for region ${regionKey}`);
  }
  
  private generateEnhancedModerateRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    // Enhanced individual rocks + small clusters
    const rockCount = 12 + Math.floor(Math.random() * 8); // 12-20 individual rocks
    
    for (let i = 0; i < rockCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['boulder', 'angular', 'weathered', 'flattened']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.4, max: 1.2 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
    
    // Add 1-2 small clusters
    const clusterCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < clusterCount; i++) {
      this.generateSmallCluster(region, rocks);
    }
  }
  
  private generateMassiveClusteredRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    console.log(`🏔️ Generating MASSIVE clusters for ring 1`);
    
    // Generate 2-4 MASSIVE clusters per region
    const clusterCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterCenter = this.getRandomPositionInRegion(region);
      const clusterRadius = 25 + Math.random() * 35; // 25-60 units - MASSIVE!
      
      const config: ClusterConfiguration = {
        centerPosition: clusterCenter,
        radius: clusterRadius,
        foundationCount: 4 + Math.floor(Math.random() * 5), // 4-8 massive foundation rocks
        supportCount: 6 + Math.floor(Math.random() * 7),    // 6-12 support rocks
        accentCount: 4 + Math.floor(Math.random() * 8),     // 4-11 accent rocks
        environmentalDetails: Math.random() < 0.9 // 90% chance for environmental details
      };
      
      console.log(`🏔️ Creating MASSIVE cluster ${i+1}: radius ${clusterRadius.toFixed(1)}, ${config.foundationCount}+${config.supportCount}+${config.accentCount} rocks`);
      
      const cluster = this.clusterGenerator.generateCluster(config);
      this.addClusterToScene(cluster, rocks);
    }
    
    // Add some scattered individual rocks
    const individualCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < individualCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['spire', 'jagged', 'angular']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.6, max: 1.8 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private generateMegaClusterRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    console.log(`🏔️ Generating MEGA-CLUSTERS for ring 2`);
    
    // Fewer but EVEN MORE MASSIVE clusters
    const clusterCount = 1 + Math.floor(Math.random() * 2); // 1-2 mega clusters
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterCenter = this.getRandomPositionInRegion(region);
      const clusterRadius = 40 + Math.random() * 50; // 40-90 units - MEGA!
      
      const config: ClusterConfiguration = {
        centerPosition: clusterCenter,
        radius: clusterRadius,
        foundationCount: 6 + Math.floor(Math.random() * 6), // 6-11 massive foundation rocks
        supportCount: 8 + Math.floor(Math.random() * 8),    // 8-15 support rocks
        accentCount: 6 + Math.floor(Math.random() * 10),    // 6-15 accent rocks
        environmentalDetails: true // Always include environmental details
      };
      
      console.log(`🏔️ Creating MEGA-CLUSTER ${i+1}: radius ${clusterRadius.toFixed(1)}, ${config.foundationCount}+${config.supportCount}+${config.accentCount} rocks`);
      
      const cluster = this.clusterGenerator.generateCluster(config);
      this.addClusterToScene(cluster, rocks);
    }
    
    // Large individual rocks
    const rockCount = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < rockCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['boulder', 'spire', 'angular', 'weathered']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 1.2, max: 2.5 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private generateWastelandMegaRocks(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    console.log(`🏔️ Generating WASTELAND mega-formations for ring 3`);
    
    // Weathered mega-clusters
    const clusterCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterCenter = this.getRandomPositionInRegion(region);
      const clusterRadius = 35 + Math.random() * 40; // 35-75 units
      
      const config: ClusterConfiguration = {
        centerPosition: clusterCenter,
        radius: clusterRadius,
        foundationCount: 5 + Math.floor(Math.random() * 4), // 5-8 weathered foundation rocks
        supportCount: 7 + Math.floor(Math.random() * 6),    // 7-12 support rocks
        accentCount: 8 + Math.floor(Math.random() * 12),    // 8-19 accent rocks
        environmentalDetails: Math.random() < 0.8 // 80% chance
      };
      
      const cluster = this.clusterGenerator.generateCluster(config);
      this.addClusterToScene(cluster, rocks);
    }
    
    // Many weathered individual rocks
    const rockCount = 25 + Math.floor(Math.random() * 20);
    for (let i = 0; i < rockCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const shapeType = this.getRandomShapeType(['weathered', 'angular', 'jagged', 'flattened']);
      
      const rock = this.createSingleRock(shapeType, position, { min: 0.8, max: 2.2 });
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        this.registerCollision(rock);
      }
    }
  }
  
  private generateSmallCluster(region: RegionCoordinates, rocks: THREE.Object3D[]): void {
    const clusterCenter = this.getRandomPositionInRegion(region);
    const clusterRadius = 12 + Math.random() * 15; // 12-27 units
    
    const config: ClusterConfiguration = {
      centerPosition: clusterCenter,
      radius: clusterRadius,
      foundationCount: 2 + Math.floor(Math.random() * 2), // 2-3 foundation rocks
      supportCount: 2 + Math.floor(Math.random() * 3),    // 2-4 support rocks
      accentCount: 1 + Math.floor(Math.random() * 3),     // 1-3 accent rocks
      environmentalDetails: Math.random() < 0.6
    };
    
    const cluster = this.clusterGenerator.generateCluster(config);
    this.addClusterToScene(cluster, rocks);
  }
  
  private addClusterToScene(cluster: { rocks: any[]; environmentalDetails: any[] }, rocks: THREE.Object3D[]): void {
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
      // Environmental details don't need collision registration
    });
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
