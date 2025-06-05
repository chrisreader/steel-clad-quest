import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RockGenerator } from './RockSystem/RockGenerator';
import { VegetationGenerator } from './TerrainFeatures/VegetationGenerator';
import { ROCK_VARIATIONS } from './RockSystem/RockVariations';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private rockGenerator: RockGenerator;
  private vegetationGenerator: VegetationGenerator;
  
  // Track spawned objects by region for cleanup
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Tavern exclusion zone
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15;
  
  // Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.rockGenerator = new RockGenerator();
    this.vegetationGenerator = new VegetationGenerator();
  }
  
  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
    console.log('🔧 TerrainFeatureGenerator collision registration callback set');
  }
  
  public getSpawnedFeaturesForRegion(regionKey: string): THREE.Object3D[] | undefined {
    return this.spawnedFeatures.get(regionKey);
  }
  
  // Generate feature clusters for a specific region
  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.spawnedFeatures.has(regionKey)) return;
    
    console.log(`Generating features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Initialize spawned features array
    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);
    
    // Ring-specific feature generation with optimized counts
    switch(region.ringIndex) {
      case 0: // First ring (starter area)
        this.generateEvenlyDistributedFeatures(region, features);
        break;
      case 1: // Second ring (clustered forests)
        this.generateClusteredFeatures(region, features);
        break;
      case 2: // Third ring (sparser, more rocks)
        this.generateSparseFeatures(region, features);
        break;
      case 3: // Fourth ring (dangerous wasteland)
        this.generateWastelandFeatures(region, features);
        break;
    }
  }
  
  private generateEvenlyDistributedFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 12, features);
    this.spawnOptimizedRocks(region, 15, features); // Reduced from 20
    this.spawnRandomFeatures(region, 'bushes', 18, features);
  }
  
  private generateClusteredFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    const clusterCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < clusterCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      const cluster: FeatureCluster = {
        position: position,
        radius: 20 + Math.random() * 30,
        density: 0.3 + Math.random() * 0.7,
        type: this.getRandomClusterType()
      };
      
      this.generateFeaturesForCluster(region, cluster, features);
    }
    
    this.spawnRandomFeatures(region, 'forest', 5, features);
    this.spawnOptimizedRocks(region, 18, features); // Reduced from 25
    this.spawnRandomFeatures(region, 'bushes', 10, features);
  }
  
  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 8, features);
    this.spawnOptimizedRocks(region, 22, features); // Reduced from 30
    this.spawnRandomFeatures(region, 'bushes', 5, features);
  }
  
  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 2, features);
    this.spawnOptimizedRocks(region, 25, features); // Reduced from 35
    this.spawnRandomFeatures(region, 'bushes', 3, features);
  }
  
  private getRandomClusterType(): 'forest' | 'rocks' | 'bushes' | 'mixed' {
    const clusterTypes = [
      { type: 'forest' as const, weight: 35 },
      { type: 'rocks' as const, weight: 25 },
      { type: 'bushes' as const, weight: 25 },
      { type: 'mixed' as const, weight: 15 }
    ];
    
    const totalWeight = clusterTypes.reduce((sum, cluster) => sum + cluster.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const cluster of clusterTypes) {
      if (random < cluster.weight) {
        return cluster.type;
      }
      random -= cluster.weight;
    }
    
    return 'mixed';
  }
  
  private spawnOptimizedRocks(region: RegionCoordinates, totalRocks: number, features: THREE.Object3D[]): void {
    for (let i = 0; i < totalRocks; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      if (!this.isPositionNearTavern(position)) {
        const rock = this.rockGenerator.generateRock(position);
        if (rock) {
          features.push(rock);
          this.scene.add(rock);
          
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(rock);
          }
        }
      }
    }
  }
  
  // Generate features within a cluster
  private generateFeaturesForCluster(
    region: RegionCoordinates, 
    cluster: FeatureCluster, 
    features: THREE.Object3D[]
  ): void {
    const clusterArea = Math.PI * cluster.radius * cluster.radius;
    let featureCount: number;
    
    switch(cluster.type) {
      case 'forest':
        featureCount = Math.floor(clusterArea * 0.015 * cluster.density);
        this.spawnClusteredFeatures(region, 'forest', featureCount, cluster, features);
        this.spawnClusteredFeatures(region, 'bushes', Math.floor(featureCount * 0.6), cluster, features);
        break;
      
      case 'rocks':
        featureCount = Math.floor(clusterArea * 0.008 * cluster.density); // Reduced density
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features);
        break;
        
      case 'bushes':
        featureCount = Math.floor(clusterArea * 0.025 * cluster.density);
        this.spawnClusteredFeatures(region, 'bushes', featureCount, cluster, features);
        break;
        
      case 'mixed':
        // Reduced counts for mixed clusters
        this.spawnClusteredFeatures(region, 'forest', Math.floor(clusterArea * 0.006 * cluster.density), cluster, features);
        this.spawnClusteredFeatures(region, 'rocks', Math.floor(clusterArea * 0.004 * cluster.density), cluster, features);
        this.spawnClusteredFeatures(region, 'bushes', Math.floor(clusterArea * 0.012 * cluster.density), cluster, features);
        break;
    }
  }
  
  private spawnClusteredFeatures(
    region: RegionCoordinates,
    type: 'forest' | 'rocks' | 'bushes',
    count: number,
    cluster: FeatureCluster,
    features: THREE.Object3D[]
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.gaussianRandom() * cluster.radius;
      
      const position = new THREE.Vector3(
        cluster.position.x + Math.cos(angle) * distance,
        0,
        cluster.position.z + Math.sin(angle) * distance
      );
      
      if (this.isPositionInRegion(position, region) && !this.isPositionNearTavern(position)) {
        const feature = this.spawnFeature(type, position);
        if (feature) {
          features.push(feature);
          this.scene.add(feature);
          
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(feature);
          }
        }
      }
    }
  }
  
  private spawnRandomFeatures(
    region: RegionCoordinates,
    type: 'forest' | 'rocks' | 'bushes',
    count: number,
    features: THREE.Object3D[]
  ): void {
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      if (!this.isPositionNearTavern(position)) {
        const feature = this.spawnFeature(type, position);
        if (feature) {
          features.push(feature);
          this.scene.add(feature);
          
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(feature);
          }
        }
      }
    }
  }
  
  private spawnFeature(type: 'forest' | 'rocks' | 'bushes', position: THREE.Vector3): THREE.Object3D | null {
    switch(type) {
      case 'forest':
        return this.vegetationGenerator.spawnTree(position);
      case 'rocks':
        return this.rockGenerator.generateRock(position);
      case 'bushes':
        return this.vegetationGenerator.spawnBush(position);
      default:
        return null;
    }
  }
  
  // Helper methods (unchanged)
  private getRandomPositionInRegion(region: RegionCoordinates): THREE.Vector3 {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const worldCenter = new THREE.Vector3(0, 0, 0);
    
    const innerRadius = ringDef.innerRadius;
    const outerRadius = ringDef.outerRadius;
    
    const quadrantStartAngle = region.quadrant * (Math.PI / 2);
    const quadrantEndAngle = quadrantStartAngle + (Math.PI / 2);
    
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const angle = quadrantStartAngle + Math.random() * (quadrantEndAngle - quadrantStartAngle);
    
    return new THREE.Vector3(
      worldCenter.x + Math.cos(angle) * radius,
      0,
      worldCenter.z + Math.sin(angle) * radius
    );
  }
  
  private isPositionInRegion(position: THREE.Vector3, region: RegionCoordinates): boolean {
    const positionRegion = this.ringSystem.getRegionForPosition(position);
    if (!positionRegion) return false;
    
    return positionRegion.ringIndex === region.ringIndex && 
           positionRegion.quadrant === region.quadrant;
  }
  
  private isPositionNearTavern(position: THREE.Vector3): boolean {
    const distance = position.distanceTo(this.tavernPosition);
    return distance < this.tavernExclusionRadius;
  }
  
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.min(Math.max((num + 3) / 6, 0), 1);
  }
  
  // Cleanup features for a region
  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.spawnedFeatures.get(regionKey);
    
    if (!features) return;
    
    console.log(`Cleaning up features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    features.forEach(feature => {
      this.scene.remove(feature);
      
      if (feature instanceof THREE.Mesh) {
        if (feature.geometry) feature.geometry.dispose();
        if (feature.material) {
          if (Array.isArray(feature.material)) {
            feature.material.forEach(m => m.dispose());
          } else {
            feature.material.dispose();
          }
        }
      } else if (feature instanceof THREE.Group) {
        feature.traverse(child => {
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
      }
    });
    
    this.spawnedFeatures.delete(regionKey);
  }
  
  public dispose(): void {
    // Clean up all spawned features
    for (const [regionKey, features] of this.spawnedFeatures.entries()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
        if (feature instanceof THREE.Mesh) {
          if (feature.geometry) feature.geometry.dispose();
          if (feature.material) {
            if (Array.isArray(feature.material)) {
              feature.material.forEach(m => m.dispose());
            } else {
              feature.material.dispose();
            }
          }
        } else if (feature instanceof THREE.Group) {
          feature.traverse(child => {
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
        }
      });
    }
    
    this.spawnedFeatures.clear();
    this.rockGenerator.dispose();
    this.vegetationGenerator.dispose();
  }
}
