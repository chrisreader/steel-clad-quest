import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TextureGenerator } from '../utils';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

export interface RockVariation {
  category: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  sizeRange: [number, number];
  weight: number;
  isCluster: boolean;
  clusterSize?: [number, number];
  shapePersonality: 'character' | 'basic';
}

// UPDATED: Rock shapes with REDUCED deformation intensities
interface RockShape {
  type: 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered' | 'angular' | 'flattened' | 'jagged';
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron' | 'custom';
  deformationIntensity: number;
  weatheringLevel: number;
  shapeModifier: 'none' | 'stretch' | 'flatten' | 'fracture' | 'erode';
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeModels: THREE.Object3D[] = [];
  private rockModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];
  
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false, shapePersonality: 'character' },
    { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false, shapePersonality: 'character' },
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false, shapePersonality: 'basic' },
    { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' },
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' }
  ];
  
  // FIXED: Dramatically reduced deformation intensities
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.15, weatheringLevel: 0.6, shapeModifier: 'erode' },
    { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.2, weatheringLevel: 0.3, shapeModifier: 'stretch' },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.1, weatheringLevel: 0.8, shapeModifier: 'flatten' },
    { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.25, weatheringLevel: 0.4, shapeModifier: 'fracture' },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.9, shapeModifier: 'erode' },
    { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.12, weatheringLevel: 0.7, shapeModifier: 'flatten' },
    { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.25, weatheringLevel: 0.5, shapeModifier: 'fracture' },
    { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.15, weatheringLevel: 0.6, shapeModifier: 'none' }
  ];
  
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 150;
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15;
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.loadModels();
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  private loadModels(): void {
    for (let i = 0; i < 3; i++) {
      const treeHeight = 8;
      const treeWidth = 0.3 + Math.random() * 0.3;
      
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(treeWidth, treeWidth * 1.2, treeHeight, 12),
        new THREE.MeshLambertMaterial({ 
          color: 0x8B7355,
          map: TextureGenerator.createWoodTexture()
        })
      );
      trunk.position.y = treeHeight/2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      const tree = new THREE.Group();
      tree.add(trunk);
      
      for (let layer = 0; layer < 3; layer++) {
        const leavesGeometry = new THREE.ConeGeometry(2.5 - layer * 0.3, 4, 8);
        const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.5 + Math.random() * 0.3);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
          color: leavesColor,
          transparent: true,
          opacity: 0.9
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 7 + layer * 1.5;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);
      }
      
      this.treeModels.push(tree);
    }
    
    // FIXED: Create smooth rocks with proper geometry validation
    this.createSmoothRockVariations();
    
    for (let i = 0; i < 4; i++) {
      const bushGroup = new THREE.Group();
      const bushType = i % 2;
      
      const mainBushSize = 0.5 + Math.random() * 0.4;
      const clusterCount = 3 + Math.floor(Math.random() * 4);
      
      const bushColors = [
        new THREE.Color().setHSL(0.25, 0.6, 0.4),
        new THREE.Color().setHSL(0.3, 0.7, 0.5),
        new THREE.Color().setHSL(0.2, 0.5, 0.45),
        new THREE.Color().setHSL(0.28, 0.8, 0.4)
      ];
      
      const bushMaterial = new THREE.MeshStandardMaterial({
        color: bushColors[i % bushColors.length],
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
      
      for (let j = 0; j < clusterCount; j++) {
        const clusterSize = mainBushSize * (0.6 + Math.random() * 0.6);
        const cluster = new THREE.Mesh(
          new THREE.SphereGeometry(clusterSize, 8, 6),
          bushMaterial.clone()
        );
        
        const angle = (j / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = mainBushSize * (0.2 + Math.random() * 0.3);
        cluster.position.set(
          Math.cos(angle) * distance,
          0.3 + Math.random() * 0.2,
          Math.sin(angle) * distance
        );
        
        cluster.scale.set(
          0.8 + Math.random() * 0.4,
          0.6 + Math.random() * 0.3,
          0.8 + Math.random() * 0.4
        );
        
        cluster.castShadow = true;
        cluster.receiveShadow = true;
        bushGroup.add(cluster);
      }
      
      this.bushModels.push(bushGroup);
    }
  }
  
  private createSmoothRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createSmoothRockCluster(rockGroup, variation, i);
        } else {
          this.createSmoothSingleRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} smooth rock variations with validation`);
  }
  
  private createSmoothSingleRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create high-res base geometry
    let rockGeometry = this.createBaseGeometry(rockShape, rockSize);
    
    // Apply MINIMAL deformation - especially for tiny rocks
    const sizeFactor = variation.category === 'tiny' ? 0.3 : variation.category === 'small' ? 0.5 : 1.0;
    const adjustedIntensity = rockShape.deformationIntensity * sizeFactor * 0.5; // Additional 50% reduction
    
    this.applyMinimalDeformation(rockGeometry, adjustedIntensity, rockSize);
    
    // CRITICAL: Apply smoothing after deformation
    this.applySmoothingToGeometry(rockGeometry);
    
    const rockMaterial = this.createRockMaterial(variation.category, rockShape, index);
    
    const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
    mainRock.rotation.set(
      Math.random() * Math.PI * 0.5, // Reduced rotation range
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 0.5
    );
    mainRock.position.y = rockSize * 0.1;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    
    rockGroup.add(mainRock);
    
    console.log(`🏔️ Created smooth ${variation.category} ${rockShape.type} rock (intensity: ${adjustedIntensity.toFixed(3)})`);
  }
  
  private createBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(rockSize, 2); // Moderate detail
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(rockSize, 16, 12); // Moderate segments
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, 1); // Lower detail
        break;
        
      case 'custom':
        geometry = this.createOrganicGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 1);
    }
    
    return geometry;
  }
  
  private createOrganicGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 16, 12);
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // MINIMAL organic variation - single low-frequency noise
      const organicNoise = Math.sin(x * 0.8) * Math.cos(y * 0.8) * Math.sin(z * 0.8) * 0.05; // Very small
      
      const organicFactor = 1 + organicNoise;
      
      if (distance > 0) {
        const normalizedX = x / distance;
        const normalizedY = y / distance;
        const normalizedZ = z / distance;
        
        const newDistance = distance * organicFactor;
        positions[i] = normalizedX * newDistance;
        positions[i + 1] = normalizedY * newDistance;
        positions[i + 2] = normalizedZ * newDistance;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  private applyMinimalDeformation(geometry: THREE.BufferGeometry, intensity: number, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Single pass of very gentle deformation
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // SINGLE low-frequency noise only
      const noise = Math.sin(x / rockSize * 1.5) * Math.cos(y / rockSize * 1.5) * Math.sin(z / rockSize * 1.5) * 0.3;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = noise * intensity * 0.3; // Very conservative
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }
  
  private applySmoothingToGeometry(geometry: THREE.BufferGeometry): void {
    this.validateGeometry(geometry);
    this.applyLaplacianSmoothing(geometry, 2); // 2 iterations
    this.smoothExtremeVertices(geometry);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    console.log('🔧 Applied smoothing to rock geometry');
  }
  
  private validateGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    let fixedCount = 0;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i]) || isNaN(positions[i])) {
        positions[i] = 0;
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.warn(`🔧 Fixed ${fixedCount} invalid vertex positions`);
    }
  }
  
  private applyLaplacianSmoothing(geometry: THREE.BufferGeometry, iterations: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    
    for (let iter = 0; iter < iterations; iter++) {
      const newPositions = new Float32Array(positions.length);
      
      for (let i = 0; i < vertexCount; i++) {
        const index = i * 3;
        let neighborSum = new THREE.Vector3(0, 0, 0);
        let neighborCount = 0;
        
        const currentVertex = new THREE.Vector3(
          positions[index],
          positions[index + 1],
          positions[index + 2]
        );
        
        // Find neighbors within threshold
        for (let j = 0; j < vertexCount; j++) {
          if (i !== j) {
            const neighborVertex = new THREE.Vector3(
              positions[j * 3],
              positions[j * 3 + 1],
              positions[j * 3 + 2]
            );
            
            const distance = currentVertex.distanceTo(neighborVertex);
            if (distance < 0.2) { // Neighborhood threshold
              neighborSum.add(neighborVertex);
              neighborCount++;
            }
          }
        }
        
        if (neighborCount > 0) {
          neighborSum.divideScalar(neighborCount);
          
          // Blend with neighbors (conservative smoothing)
          const blendFactor = 0.2;
          newPositions[index] = currentVertex.x * (1 - blendFactor) + neighborSum.x * blendFactor;
          newPositions[index + 1] = currentVertex.y * (1 - blendFactor) + neighborSum.y * blendFactor;
          newPositions[index + 2] = currentVertex.z * (1 - blendFactor) + neighborSum.z * blendFactor;
        } else {
          newPositions[index] = positions[index];
          newPositions[index + 1] = positions[index + 1];
          newPositions[index + 2] = positions[index + 2];
        }
      }
      
      // Apply smoothed positions
      for (let i = 0; i < positions.length; i++) {
        positions[i] = newPositions[i];
      }
    }
  }
  
  private smoothExtremeVertices(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    
    // Calculate average distance from origin
    let avgDistance = 0;
    for (let i = 0; i < vertexCount; i++) {
      const index = i * 3;
      const distance = Math.sqrt(
        positions[index] * positions[index] +
        positions[index + 1] * positions[index + 1] +
        positions[index + 2] * positions[index + 2]
      );
      avgDistance += distance;
    }
    avgDistance /= vertexCount;
    
    // Smooth vertices that are too far from average
    for (let i = 0; i < vertexCount; i++) {
      const index = i * 3;
      const distance = Math.sqrt(
        positions[index] * positions[index] +
        positions[index + 1] * positions[index + 1] +
        positions[index + 2] * positions[index + 2]
      );
      
      // If vertex is extreme outlier, smooth it
      if (Math.abs(distance - avgDistance) > avgDistance * 0.3) {
        const smoothFactor = 0.5;
        const targetDistance = distance * (1 - smoothFactor) + avgDistance * smoothFactor;
        
        if (distance > 0) {
          const scale = targetDistance / distance;
          positions[index] *= scale;
          positions[index + 1] *= scale;
          positions[index + 2] *= scale;
        }
      }
    }
  }
  
  private createSmoothRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    for (let i = 0; i < clusterCount; i++) {
      const rockSize = minSize + Math.random() * (maxSize - minSize);
      const rockShape = this.rockShapes[(index + i) % this.rockShapes.length];
      
      let geometry = this.createBaseGeometry(rockShape, rockSize);
      
      // Even more reduced deformation for clusters
      const clusterIntensity = rockShape.deformationIntensity * 0.3;
      this.applyMinimalDeformation(geometry, clusterIntensity, rockSize);
      this.applySmoothingToGeometry(geometry);
      
      const material = this.createRockMaterial(variation.category, rockShape, index + i);
      const rock = new THREE.Mesh(geometry, material);
      
      // Position rocks in cluster
      const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = maxSize * (0.3 + Math.random() * 0.4);
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.1,
        Math.sin(angle) * distance
      );
      
      rock.rotation.set(
        Math.random() * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      );
      
      rock.castShadow = true;
      rock.receiveShadow = true;
      rockGroup.add(rock);
    }
    
    console.log(`🏔️ Created smooth cluster with ${clusterCount} rocks`);
  }
  
  private createRockMaterial(category: string, rockShape: RockShape, index: number): THREE.MeshStandardMaterial {
    const rockTypes = [
      { color: 0x8B7355, roughness: 0.9, metalness: 0.1 },
      { color: 0x696969, roughness: 0.85, metalness: 0.05 },
      { color: 0xA0A0A0, roughness: 0.8, metalness: 0.15 },
      { color: 0x8B7D6B, roughness: 0.95, metalness: 0.0 },
      { color: 0x556B2F, roughness: 0.9, metalness: 0.05 },
      { color: 0x2F4F4F, roughness: 0.9, metalness: 0.2 }
    ];
    
    const rockType = rockTypes[index % rockTypes.length];
    const baseColor = new THREE.Color(rockType.color);
    
    // Subtle weathering
    if (rockShape.weatheringLevel > 0.6) {
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, rockShape.weatheringLevel * 0.2);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness,
      metalness: rockType.metalness
    });
    
    return material;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.spawnedFeatures.has(regionKey)) return;
    
    console.log(`Generating features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);
    
    switch(region.ringIndex) {
      case 0:
        this.generateEvenlyDistributedFeatures(region, features);
        break;
      case 1:
        this.generateClusteredFeatures(region, features);
        break;
      case 2:
        this.generateSparseFeatures(region, features);
        break;
      case 3:
        this.generateWastelandFeatures(region, features);
        break;
    }
  }

  private generateEvenlyDistributedFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Implementation of evenly distributed features generation
    // For example, place trees and bushes evenly spaced
    // This method should add created features to the features array and scene
    // ...
  }

  private generateClusteredFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Implementation of clustered features generation
    // For example, create clusters of rocks or bushes
    // This method should add created features to the features array and scene
    // ...
  }

  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Implementation of sparse features generation
    // For example, few scattered rocks or bushes
    // This method should add created features to the features array and scene
    // ...
  }

  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Implementation of wasteland features generation
    // For example, sparse dead bushes or rocks
    // This method should add created features to the features array and scene
    // ...
  }

  public dispose(): void {
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
    this.largeRockFormations.length = 0;
  }
}
