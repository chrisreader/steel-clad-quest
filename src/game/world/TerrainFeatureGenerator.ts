import * as THREE from 'three';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';

export interface TerrainFeature {
  type: 'rock' | 'tree' | 'bush';
  position: THREE.Vector3;
  scale: number;
  rotation: THREE.Euler;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
}

export class TerrainFeatureGenerator {
  private static readonly ROCK_TYPES = ['boulder', 'weathered', 'slab', 'angular', 'flattened', 'spire', 'jagged'] as const;
  private static readonly ROCK_PERSONALITIES = ['basic', 'character', 'dramatic'] as const;
  private static readonly ROCK_MODIFIERS = ['none', 'erode', 'fracture', 'weather'] as const;
  
  private static readonly CLUSTER_CONFIGS = {
    tiny: { minRocks: 2, maxRocks: 4, baseSize: 0.15, sizeVariation: 0.1, spread: 1.5 },
    small: { minRocks: 3, maxRocks: 6, baseSize: 0.25, sizeVariation: 0.15, spread: 2.5 },
    medium: { minRocks: 4, maxRocks: 8, baseSize: 0.4, sizeVariation: 0.3, spread: 4.0 },
    large: { minRocks: 6, maxRocks: 12, baseSize: 0.6, sizeVariation: 0.4, spread: 6.0 },
    massive: { minRocks: 8, maxRocks: 15, baseSize: 0.8, sizeVariation: 0.6, spread: 8.0 }
  };

  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  private generatedFeatures: Map<string, THREE.Object3D[]> = new Map();

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.generatedFeatures.has(regionKey)) return;
    
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const features: THREE.Object3D[] = [];
    
    // Generate some rock clusters for this region
    const numClusters = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numClusters; i++) {
      const clusterPosition = new THREE.Vector3(
        centerPosition.x + (Math.random() - 0.5) * 50,
        centerPosition.y,
        centerPosition.z + (Math.random() - 0.5) * 50
      );
      
      const clusterSize = ['tiny', 'small', 'medium', 'large'][Math.floor(Math.random() * 4)] as 'tiny' | 'small' | 'medium' | 'large';
      const clusterFeatures = this.generateRockCluster(clusterPosition, clusterSize);
      
      // Convert terrain features to 3D objects and add to scene
      for (const feature of clusterFeatures) {
        if (feature.geometry) {
          const rockMesh = new THREE.Mesh(
            feature.geometry,
            new THREE.MeshStandardMaterial({ color: 0x8B7355 })
          );
          
          rockMesh.position.copy(feature.position);
          rockMesh.rotation.copy(feature.rotation);
          rockMesh.scale.setScalar(feature.scale);
          rockMesh.castShadow = true;
          rockMesh.receiveShadow = true;
          
          this.scene.add(rockMesh);
          features.push(rockMesh);
          
          // Register for collision if callback is set
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(rockMesh);
          }
        }
      }
    }
    
    this.generatedFeatures.set(regionKey, features);
    console.log(`Generated ${features.length} terrain features for region ${regionKey}`);
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.generatedFeatures.get(regionKey);
    
    if (features) {
      for (const feature of features) {
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
        }
      }
      
      this.generatedFeatures.delete(regionKey);
      console.log(`Cleaned up terrain features for region ${regionKey}`);
    }
  }

  public dispose(): void {
    for (const [regionKey, features] of this.generatedFeatures.entries()) {
      for (const feature of features) {
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
        }
      }
    }
    
    this.generatedFeatures.clear();
    console.log("TerrainFeatureGenerator disposed");
  }

  public generateRockCluster(
    centerPosition: THREE.Vector3,
    clusterSize: 'tiny' | 'small' | 'medium' | 'large' | 'massive' = 'medium'
  ): TerrainFeature[] {
    const config = TerrainFeatureGenerator.CLUSTER_CONFIGS[clusterSize];
    const numRocks = Math.floor(Math.random() * (config.maxRocks - config.minRocks + 1)) + config.minRocks;
    const features: TerrainFeature[] = [];
    
    // Generate cluster shape variety - ensure good mix of types
    const clusterShapes = TerrainFeatureGenerator.generateClusterShapeVariety(numRocks);
    
    for (let i = 0; i < numRocks; i++) {
      const role = TerrainFeatureGenerator.determineRockRole(i, numRocks);
      const rockSize = TerrainFeatureGenerator.calculateRockSize(role, config, i, numRocks);
      const position = TerrainFeatureGenerator.calculateRockPosition(centerPosition, config.spread, i, numRocks);
      
      // Use pre-determined shape for variety with proper type casting
      const shape = clusterShapes[i] as typeof TerrainFeatureGenerator.ROCK_TYPES[number];
      
      // Size-based deformation control instead of role-based
      const deformationIntensity = TerrainFeatureGenerator.calculateSizeBasedDeformation(rockSize);
      const personality = TerrainFeatureGenerator.selectPersonalityForSize(rockSize);
      const modifier = TerrainFeatureGenerator.selectModifierForSize(rockSize, shape);
      
      console.log(`Generating rock ${i}: shape=${shape}, size=${rockSize.toFixed(2)}, deformation=${deformationIntensity.toFixed(2)}, role=${role}`);
      
      const rockShape = RockShapeFactory.generateRock(shape, rockSize, deformationIntensity);
      
      features.push({
        type: 'rock',
        position,
        scale: rockShape.scale,
        rotation: rockShape.rotation,
        geometry: rockShape.geometry
      });
    }
    
    return features;
  }

  private static generateClusterShapeVariety(numRocks: number): string[] {
    const shapes: string[] = [];
    
    // Ensure every cluster has at least one stable base shape
    const stableShapes = ['boulder', 'slab', 'weathered'];
    shapes.push(stableShapes[Math.floor(Math.random() * stableShapes.length)]);
    
    // Add transitional shapes for medium+ clusters
    if (numRocks > 3) {
      const transitionalShapes = ['angular', 'weathered', 'flattened'];
      shapes.push(transitionalShapes[Math.floor(Math.random() * transitionalShapes.length)]);
    }
    
    // Add accent shapes for larger clusters
    if (numRocks > 5) {
      const accentShapes = ['spire', 'jagged', 'angular'];
      shapes.push(accentShapes[Math.floor(Math.random() * accentShapes.length)]);
    }
    
    // Fill remaining with weighted random selection
    const weightedShapes = [
      ...Array(3).fill('boulder'),      // Higher weight for stability
      ...Array(3).fill('weathered'),    // Higher weight for realism
      ...Array(2).fill('angular'),      // Medium weight
      ...Array(2).fill('slab'),         // Medium weight
      ...Array(1).fill('flattened'),    // Lower weight
      ...Array(1).fill('spire'),        // Lower weight
      ...Array(1).fill('jagged')        // Lower weight
    ];
    
    while (shapes.length < numRocks) {
      const randomShape = weightedShapes[Math.floor(Math.random() * weightedShapes.length)];
      shapes.push(randomShape);
    }
    
    // Shuffle to distribute variety throughout cluster
    return this.shuffleArray(shapes);
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private static calculateSizeBasedDeformation(rockSize: number): number {
    if (rockSize < 0.4) {
      // Small rocks: cap deformation to prevent spikes
      return Math.min(0.08, rockSize * 0.2);
    } else if (rockSize < 1.2) {
      // Medium rocks: moderate deformation
      return Math.min(0.12, rockSize * 0.15);
    } else {
      // Large rocks: allow full deformation for character
      return Math.min(0.18, rockSize * 0.12);
    }
  }

  private static selectPersonalityForSize(rockSize: number): string {
    if (rockSize < 0.3) {
      return 'basic';  // Keep tiny rocks simple
    } else if (rockSize < 0.8) {
      return Math.random() < 0.7 ? 'basic' : 'character';
    } else {
      return Math.random() < 0.4 ? 'basic' : (Math.random() < 0.7 ? 'character' : 'dramatic');
    }
  }

  private static selectModifierForSize(rockSize: number, shape: string): string {
    if (rockSize < 0.4) {
      // Small rocks: only gentle modifiers
      return Math.random() < 0.6 ? 'none' : 'erode';
    } else if (rockSize < 1.0) {
      // Medium rocks: moderate modifiers
      const modifiers = ['none', 'erode', 'weather'];
      if (shape === 'angular' || shape === 'jagged') {
        modifiers.push('fracture'); // Allow some fracture on appropriate shapes
      }
      return modifiers[Math.floor(Math.random() * modifiers.length)];
    } else {
      // Large rocks: all modifiers available
      return this.ROCK_MODIFIERS[Math.floor(Math.random() * this.ROCK_MODIFIERS.length)];
    }
  }

  private static determineRockRole(index: number, totalRocks: number): 'foundation' | 'support' | 'accent' {
    if (index === 0 || (index === 1 && totalRocks > 4)) {
      return 'foundation';
    } else if (index < totalRocks * 0.7) {
      return 'support';
    } else {
      return 'accent';
    }
  }

  private static calculateRockSize(
    role: 'foundation' | 'support' | 'accent',
    config: typeof TerrainFeatureGenerator.CLUSTER_CONFIGS[keyof typeof TerrainFeatureGenerator.CLUSTER_CONFIGS],
    index: number,
    totalRocks: number
  ): number {
    let baseMultiplier: number;
    
    switch (role) {
      case 'foundation':
        baseMultiplier = 1.2 + Math.random() * 0.3; // Larger foundation rocks
        break;
      case 'support':
        baseMultiplier = 0.8 + Math.random() * 0.4; // Medium support rocks
        break;
      case 'accent':
        baseMultiplier = 0.5 + Math.random() * 0.5; // Varied accent rocks
        break;
    }
    
    return config.baseSize * baseMultiplier + (Math.random() - 0.5) * config.sizeVariation;
  }

  private static calculateRockPosition(
    centerPosition: THREE.Vector3,
    spread: number,
    index: number,
    totalRocks: number
  ): THREE.Vector3 {
    if (index === 0) {
      // First rock at center with small offset
      return new THREE.Vector3(
        centerPosition.x + (Math.random() - 0.5) * spread * 0.2,
        centerPosition.y,
        centerPosition.z + (Math.random() - 0.5) * spread * 0.2
      );
    }
    
    // Create organic cluster arrangement
    const angle = (Math.random() * Math.PI * 2);
    const distance = Math.random() * spread * 0.8;
    const heightVariation = (Math.random() - 0.5) * spread * 0.1;
    
    return new THREE.Vector3(
      centerPosition.x + Math.cos(angle) * distance,
      centerPosition.y + heightVariation,
      centerPosition.z + Math.sin(angle) * distance
    );
  }

  public static generateSingleRock(position: THREE.Vector3, size: number = 1): TerrainFeature {
    // Use size-based deformation for single rocks too
    const deformationIntensity = this.calculateSizeBasedDeformation(size);
    const personality = this.selectPersonalityForSize(size);
    
    // Allow more variety in single rocks
    const shape = this.ROCK_TYPES[Math.floor(Math.random() * this.ROCK_TYPES.length)];
    const modifier = this.selectModifierForSize(size, shape);
    
    console.log(`Generating single rock: shape=${shape}, size=${size.toFixed(2)}, deformation=${deformationIntensity.toFixed(2)}`);
    
    const rockShape = RockShapeFactory.generateRock(shape, size, deformationIntensity);
    
    return {
      type: 'rock',
      position,
      scale: rockShape.scale,
      rotation: rockShape.rotation,
      geometry: rockShape.geometry
    };
  }
}
