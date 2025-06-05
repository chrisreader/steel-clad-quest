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

interface RockShape {
  type: 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered' | 'angular' | 'flattened' | 'jagged';
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron' | 'custom' | 'cylinder';
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
  
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.25, weatheringLevel: 0.6, shapeModifier: 'erode' },
    { type: 'spire', baseGeometry: 'cylinder', deformationIntensity: 0.15, weatheringLevel: 0.3, shapeModifier: 'stretch' },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.15, weatheringLevel: 0.7, shapeModifier: 'flatten' },
    { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.3, weatheringLevel: 0.4, shapeModifier: 'fracture' },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.25, weatheringLevel: 0.7, shapeModifier: 'erode' },
    { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.7, shapeModifier: 'flatten' },
    { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.3, weatheringLevel: 0.5, shapeModifier: 'fracture' },
    { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.25, weatheringLevel: 0.6, shapeModifier: 'none' }
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
    console.log('🔧 TerrainFeatureGenerator collision registration callback set');
  }
  
  public getSpawnedFeaturesForRegion(regionKey: string): THREE.Object3D[] | undefined {
    return this.spawnedFeatures.get(regionKey);
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
    
    this.createImprovedRockVariations();
    
    for (let i = 0; i < 4; i++) {
      const bushGroup = new THREE.Group();
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
      
      if (Math.random() < 0.3) {
        const stemHeight = mainBushSize * 0.8;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.04, stemHeight, 6),
          new THREE.MeshStandardMaterial({
            color: 0x4A4A2A,
            roughness: 0.9,
            metalness: 0.0
          })
        );
        stem.position.y = stemHeight / 2;
        stem.castShadow = true;
        stem.receiveShadow = true;
        bushGroup.add(stem);
      }
      
      if (Math.random() < 0.15) {
        const berryCount = 3 + Math.floor(Math.random() * 5);
        for (let k = 0; k < berryCount; k++) {
          const berry = new THREE.Mesh(
            new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 4, 3),
            new THREE.MeshStandardMaterial({
              color: Math.random() < 0.5 ? 0xFF6B6B : 0x4ECDC4,
              roughness: 0.3,
              metalness: 0.0
            })
          );
          
          const angle = Math.random() * Math.PI * 2;
          const distance = mainBushSize * (0.7 + Math.random() * 0.3);
          berry.position.set(
            Math.cos(angle) * distance,
            0.5 + Math.random() * 0.3,
            Math.sin(angle) * distance
          );
          bushGroup.add(berry);
        }
      }
      
      this.bushModels.push(bushGroup);
    }
  }
  
  private validateGeometryIntegrity(geometry: THREE.BufferGeometry): boolean {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i]) || isNaN(positions[i])) {
        return false;
      }
    }
    
    if (geometry.index) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3;
        const b = indices[i + 1] * 3;
        const c = indices[i + 2] * 3;
        
        if (a === b || b === c || a === c) {
          return false;
        }
        
        const v1 = new THREE.Vector3(positions[a], positions[a + 1], positions[a + 2]);
        const v2 = new THREE.Vector3(positions[b], positions[b + 1], positions[b + 2]);
        const v3 = new THREE.Vector3(positions[c], positions[c + 1], positions[c + 2]);
        
        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const cross = new THREE.Vector3().crossVectors(edge1, edge2);
        
        if (cross.length() < 0.0001) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  private createImprovedRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createImprovedRockCluster(rockGroup, variation, i);
        } else {
          this.createImprovedCharacterRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} improved rock variations with fixed spire geometry`);
  }
  
  private createImprovedCharacterRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    let rockGeometry = this.createImprovedBaseGeometry(rockShape, rockSize);
    
    if (!this.validateGeometryIntegrity(rockGeometry)) {
      console.warn('🔧 Initial geometry failed validation, using fallback');
      rockGeometry = new THREE.SphereGeometry(rockSize, 16, 12);
    }
    
    this.applyCarefulShapeModifications(rockGeometry, rockShape, rockSize);
    
    const deformationIntensity = variation.shapePersonality === 'character' ? 
      rockShape.deformationIntensity * 0.6 : rockShape.deformationIntensity * 0.4;
    this.applyTopologyAwareDeformation(rockGeometry, deformationIntensity, rockSize, rockShape);
    
    this.applyIntensiveSmoothing(rockGeometry, 3);
    this.weldVertices(rockGeometry);
    this.validateAndRepairGeometry(rockGeometry);
    
    const rockMaterial = this.createImprovedRockMaterial(variation.category, rockShape, index);
    
    const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
    mainRock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mainRock.position.y = rockSize * 0.1;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    
    rockGroup.add(mainRock);
    
    if (variation.category === 'medium' || variation.category === 'large') {
      this.addCarefulSurfaceFeatures(rockGroup, rockSize, rockShape, rockMaterial);
    }
    
    console.log(`🏔️ Created improved ${variation.category} ${rockShape.type} rock`);
  }
  
  private createImprovedBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'cylinder':
        geometry = this.createSpireGeometry(rockSize);
        break;
        
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(rockSize, 24, 18);
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, 2);
        break;
        
      case 'custom':
        geometry = this.createImprovedOrganicGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
    }
    
    return geometry;
  }
  
  private createSpireGeometry(rockSize: number): THREE.BufferGeometry {
    const radiusTop = rockSize * 0.2;
    const radiusBottom = rockSize * 0.6;
    const height = rockSize * 2.5;
    const radialSegments = 16;
    const heightSegments = 12;
    
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      heightSegments
    );
    
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const heightFactor = (y + height / 2) / height;
      
      const organicFactor = 1 + Math.sin(heightFactor * Math.PI * 2) * 0.05;
      const radius = Math.sqrt(x * x + z * z);
      
      if (radius > 0) {
        const newRadius = radius * organicFactor;
        positions[i] = (x / radius) * newRadius;
        positions[i + 2] = (z / radius) * newRadius;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  private applyCarefulShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    const intensity = rockShape.type === 'spire' ? 0.5 : 1.0;
    
    switch (rockShape.shapeModifier) {
      case 'stretch':
        this.applyCarefulStretch(positions, rockSize, intensity);
        break;
        
      case 'flatten':
        this.applyCarefulFlatten(positions, rockSize, intensity);
        break;
        
      case 'fracture':
        if (rockShape.type !== 'spire') {
          this.applyCarefulFracture(positions, rockSize, intensity);
        }
        break;
        
      case 'erode':
        this.applyCarefulErosion(positions, rockSize, intensity);
        break;
        
      default:
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyCarefulStretch(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      
      const stretchFactor = 1.0 + (Math.random() * 0.2 * intensity);
      positions[i + 1] = y * stretchFactor;
      
      const height = Math.abs(positions[i + 1]);
      const maxHeight = rockSize * 2;
      const taperFactor = Math.max(0.3, 1 - (height / maxHeight) * 0.7);
      
      positions[i] *= taperFactor;
      positions[i + 2] *= taperFactor;
    }
  }
  
  private applyCarefulFlatten(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] *= 0.5 + Math.random() * 0.1 * intensity;
      positions[i] *= 1.1 + Math.random() * 0.1 * intensity;
      positions[i + 2] *= 1.1 + Math.random() * 0.1 * intensity;
    }
  }
  
  private applyCarefulFracture(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const facetNoise = Math.floor(x * 1.5) + Math.floor(y * 1.5) + Math.floor(z * 1.5);
      const facetIntensity = (facetNoise % 3) * 0.02 * intensity;
      
      positions[i] += Math.sign(x) * facetIntensity;
      positions[i + 1] += Math.sign(y) * facetIntensity;
      positions[i + 2] += Math.sign(z) * facetIntensity;
    }
  }
  
  private applyCarefulErosion(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const erosion1 = Math.sin(x * 1.2) * Math.cos(y * 1.2) * 0.04 * intensity;
      const erosion2 = Math.sin(z * 1.8) * Math.cos(x * 1.0) * 0.025 * intensity;
      
      const totalErosion = erosion1 + erosion2;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        positions[i] += normalX * totalErosion;
        positions[i + 1] += normalY * totalErosion;
        positions[i + 2] += normalZ * totalErosion;
      }
    }
  }
  
  private applyTopologyAwareDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape
  ): void {
    const adjustedIntensity = rockShape.type === 'spire' ? intensity * 0.3 : intensity * 0.5;
    
    this.applyOrganicNoiseDeformation(geometry, adjustedIntensity, rockSize);
    
    if (rockShape.type !== 'spire' && rockShape.weatheringLevel > 0.6) {
      this.applySubtleSurfaceDetail(geometry, adjustedIntensity * 0.3, rockSize * 0.5);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyOrganicNoiseDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const noise1 = Math.sin(x / scale * 0.5) * Math.cos(y / scale * 0.5) * Math.sin(z / scale * 0.5);
      const noise2 = Math.sin(x / scale * 0.8) * Math.cos(z / scale * 0.8) * 0.2;
      
      const combinedNoise = noise1 + noise2;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = combinedNoise * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  private applySubtleSurfaceDetail(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const detail = Math.sin(x / scale * 6) * Math.cos(y / scale * 6) * Math.sin(z / scale * 6);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = detail * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  private applyIntensiveSmoothing(geometry: THREE.BufferGeometry, passes: number): void {
    for (let pass = 0; pass < passes; pass++) {
      this.applyLaplacianSmoothing(geometry, 0.4);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyLaplacianSmoothing(geometry: THREE.BufferGeometry, factor: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const smoothedPositions = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length; i++) {
      smoothedPositions[i] = positions[i];
    }
    
    const adjacency: Map<number, number[]> = new Map();
    
    if (geometry.index) {
      const indices = geometry.index.array;
      
      for (let i = 0; i < vertexCount; i++) {
        adjacency.set(i, []);
      }
      
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];
        
        adjacency.get(a)?.push(b, c);
        adjacency.get(b)?.push(a, c);
        adjacency.get(c)?.push(a, b);
      }
      
      for (const [vertex, neighbors] of adjacency) {
        adjacency.set(vertex, [...new Set(neighbors)]);
      }
    }
    
    for (let i = 0; i < vertexCount; i++) {
      const neighbors = adjacency.get(i) || [];
      
      if (neighbors.length > 0) {
        let avgX = 0, avgY = 0, avgZ = 0;
        
        for (const neighbor of neighbors) {
          avgX += positions[neighbor * 3];
          avgY += positions[neighbor * 3 + 1];
          avgZ += positions[neighbor * 3 + 2];
        }
        
        avgX /= neighbors.length;
        avgY /= neighbors.length;
        avgZ /= neighbors.length;
        
        smoothedPositions[i * 3] = positions[i * 3] * (1 - factor) + avgX * factor;
        smoothedPositions[i * 3 + 1] = positions[i * 3 + 1] * (1 - factor) + avgY * factor;
        smoothedPositions[i * 3 + 2] = positions[i * 3 + 2] * (1 - factor) + avgZ * factor;
      }
    }
    
    for (let i = 0; i < positions.length; i++) {
      positions[i] = smoothedPositions[i];
    }
  }
  
  private weldVertices(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingBox();
    if (!geometry.boundingBox) {
      console.warn('🔧 Cannot compute bounding box for vertex welding');
      return;
    }
    
    const size = geometry.boundingBox.getSize(new THREE.Vector3()).length();
    const threshold = size * 0.002;
    
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    
    const mergeMap: number[] = new Array(vertexCount).fill(0).map((_, i) => i);
    
    for (let i = 0; i < vertexCount; i++) {
      for (let j = i + 1; j < vertexCount; j++) {
        const dist = Math.sqrt(
          Math.pow(positions[i * 3] - positions[j * 3], 2) +
          Math.pow(positions[i * 3 + 1] - positions[j * 3 + 1], 2) +
          Math.pow(positions[i * 3 + 2] - positions[j * 3 + 2], 2)
        );
        
        if (dist < threshold) {
          mergeMap[j] = i;
        }
      }
    }
    
    const newPositions: number[] = [];
    const remap: number[] = [];
    
    for (let i = 0; i < vertexCount; i++) {
      if (mergeMap[i] === i) {
        remap[i] = newPositions.length / 3;
        newPositions.push(
          positions[i * 3], 
          positions[i * 3 + 1], 
          positions[i * 3 + 2]
        );
      } else {
        remap[i] = remap[mergeMap[i]];
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    if (geometry.index) {
      const indices = geometry.index.array;
      const newIndices: number[] = [];
      
      for (let i = 0; i < indices.length; i++) {
        newIndices.push(remap[indices[i]]);
      }
      
      geometry.setIndex(newIndices);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    console.log(`🔧 Welded vertices: ${vertexCount} -> ${newPositions.length / 3} (threshold: ${threshold.toFixed(6)})`);
  }
  
  private validateAndRepairGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i]) || isNaN(positions[i])) {
        positions[i] = 0;
        console.warn('🔧 Repaired invalid vertex position');
      }
    }
    
    if (!this.validateGeometryIntegrity(geometry)) {
      console.warn('🔧 Geometry still has issues after repair');
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  
  private createImprovedOrganicGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 24, 18);
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      const noise1 = Math.sin(x * 1.0) * Math.cos(y * 1.0) * Math.sin(z * 1.0);
      const noise2 = Math.sin(x * 2.0) * Math.cos(z * 2.0) * 0.2;
      
      const organicFactor = 1 + (noise1 * 0.1 + noise2 * 0.05);
      
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
  
  private createImprovedRockMaterial(category: string, rockShape: RockShape, index: number): THREE.MeshStandardMaterial {
    const rockTypes = [
      { color: 0x8B7355, roughness: 0.8, metalness: 0.05, name: 'granite' },
      { color: 0x696969, roughness: 0.75, metalness: 0.02, name: 'basalt' },
      { color: 0xA0A0A0, roughness: 0.7, metalness: 0.08, name: 'limestone' },
      { color: 0x8B7D6B, roughness: 0.85, metalness: 0.0, name: 'sandstone' },
      { color: 0x556B2F, roughness: 0.8, metalness: 0.02, name: 'moss_covered' },
      { color: 0x2F4F4F, roughness: 0.8, metalness: 0.1, name: 'slate' },
      { color: 0x8B4513, roughness: 0.75, metalness: 0.0, name: 'ironstone' }
    ];
    
    const rockType = rockTypes[index % rockTypes.length];
    const baseColor = new THREE.Color(rockType.color);
    
    if (rockShape.weatheringLevel > 0.5) {
      const weatheringIntensity = Math.min(rockShape.weatheringLevel * 0.2, 0.25);
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, weatheringIntensity);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness + (rockShape.weatheringLevel * 0.03),
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(0.6, 0.6)
    });
    
    return material;
  }
  
  private addCarefulSurfaceFeatures(
    rockGroup: THREE.Group, 
    rockSize: number, 
    rockShape: RockShape, 
    baseMaterial: THREE.MeshStandardMaterial
  ): void {
    const featureProbability = rockShape.type === 'spire' ? 0.1 : 0.2;
    
    if (Math.random() < featureProbability) {
      this.addSubtleRockCracks(rockGroup, rockSize);
    }
    
    if (rockShape.weatheringLevel > 0.6 && Math.random() < 0.2) {
      this.addSubtleMossPatches(rockGroup, rockSize);
    }
    
    if (Math.random() < 0.1) {
      this.addSubtleRockDebris(rockGroup, rockSize, baseMaterial);
    }
  }
  
  private createImprovedRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    const foundationCount = Math.min(2, Math.floor(clusterCount * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createImprovedClusterRock(rockSize, variation, i, 'foundation');
      
      const angle = (i / foundationCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = rockSize * 0.25;
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.1,
        Math.sin(angle) * distance
      );
      
      foundationRocks.push(rock);
      rockGroup.add(rock);
    }
    
    const supportCount = Math.floor(clusterCount * 0.4);
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createImprovedClusterRock(rockSize, variation, i + foundationCount, 'support');
      
      const foundationRock = foundationRocks[i % foundationRocks.length];
      const stackPosition = this.calculateImprovedStackingPosition(
        foundationRock.position, 
        rockSize, 
        maxSize * 0.9,
        'support'
      );
      rock.position.copy(stackPosition);
      
      supportRocks.push(rock);
      rockGroup.add(rock);
    }
    
    const accentCount = clusterCount - foundationCount - supportCount;
    
    for (let i = 0; i < accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createImprovedClusterRock(rockSize, variation, i + foundationCount + supportCount, 'accent');
      
      const baseRocks = [...foundationRocks, ...supportRocks];
      const baseRock = baseRocks[Math.floor(Math.random() * baseRocks.length)];
      const stackPosition = this.calculateImprovedStackingPosition(
        baseRock.position,
        rockSize,
        maxSize * 0.6,
        'accent'
      );
      rock.position.copy(stackPosition);
      
      rockGroup.add(rock);
    }
    
    console.log(`🏔️ Created improved cluster with ${clusterCount} rocks`);
  }
  
  private createImprovedClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.Object3D {
    let rockShape: RockShape;
    
    switch (role) {
      case 'foundation':
        const foundationShapes = this.rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        rockShape = foundationShapes[index % foundationShapes.length];
        break;
      case 'support':
        const supportShapes = this.rockShapes.filter(s => s.type !== 'spire');
        rockShape = supportShapes[index % supportShapes.length];
        break;
      case 'accent':
        rockShape = this.rockShapes[index % this.rockShapes.length];
        break;
      default:
        rockShape = this.rockShapes[index % this.rockShapes.length];
    }
    
    let geometry = this.createImprovedBaseGeometry(rockShape, rockSize);
    
    if (!this.validateGeometryIntegrity(geometry)) {
      geometry = new THREE.SphereGeometry(rockSize, 16, 12);
    }
    
    this.applyCarefulShapeModifications(geometry, rockShape, rockSize);
    
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity * 0.4 : rockShape.deformationIntensity * 0.3;
    this.applyTopologyAwareDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    this.applyIntensiveSmoothing(geometry, 2);
    this.weldVertices(geometry);
    this.validateAndRepairGeometry(geometry);
    
    const material = this.createImprovedRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    if (role === 'foundation') {
      rock.rotation.set(
        Math.random() * 0.2,
        Math.random() * Math.PI * 2,
        Math.random() * 0.2
      );
    } else {
      rock.rotation.set(
        Math.random() * 0.5,
        Math.random() * Math.PI * 2,
        Math.random() * 0.5
      );
    }
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
  
  private createImprovedRoleBasedMaterial(
    category: string, 
    rockShape: RockShape, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.MeshStandardMaterial {
    const material = this.createImprovedRockMaterial(category, rockShape, index);
    
    switch (role) {
      case 'foundation':
        material.roughness = Math.min(1.0, material.roughness + 0.03);
        if (Math.random() < 0.4) {
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x2A2A1A);
          currentColor.lerp(weatheringColor, 0.08);
        }
        break;
      case 'support':
        if (Math.random() < 0.25) {
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x3A3A2A);
          currentColor.lerp(weatheringColor, 0.04);
        }
        break;
      case 'accent':
        material.roughness = Math.max(0.6, material.roughness - 0.03);
        break;
    }
    
    return material;
  }
  
  private calculateImprovedStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: 'support' | 'accent'
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (role === 'support') {
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize + rockSize) * 0.3;
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.2 + Math.random() * baseSize * 0.1,
        basePosition.z + Math.sin(angle) * distance
      );
    } else {
      if (Math.random() < 0.6) {
        const offsetX = (Math.random() - 0.5) * baseSize * 0.2;
        const offsetZ = (Math.random() - 0.5) * baseSize * 0.2;
        
        position.set(
          basePosition.x + offsetX,
          basePosition.y + baseSize * 0.4 + rockSize * 0.2,
          basePosition.z + offsetZ
        );
      } else {
        const angle = Math.random() * Math.PI * 2;
        const distance = baseSize * (0.6 + Math.random() * 0.2);
        
        position.set(
          basePosition.x + Math.cos(angle) * distance,
          basePosition.y + rockSize * 0.1,
          basePosition.z + Math.sin(angle) * distance
        );
      }
    }
    
    return position;
  }
  
  private addSubtleRockCracks(rockGroup: THREE.Group, rockSize: number): void {
    const crackCount = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < crackCount; i++) {
      const crackGeometry = new THREE.PlaneGeometry(rockSize * 0.5, rockSize * 0.06);
      const crackMaterial = new THREE.MeshStandardMaterial({
        color: 0x2A2A2A,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const crack = new THREE.Mesh(crackGeometry, crackMaterial);
      
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * rockSize * 0.6;
      crack.position.set(
        Math.cos(angle) * rockSize * 0.5,
        height,
        Math.sin(angle) * rockSize * 0.5
      );
      
      crack.rotation.y = angle;
      crack.rotation.x = (Math.random() - 0.5) * 0.2;
      
      rockGroup.add(crack);
    }
  }
  
  private addSubtleMossPatches(rockGroup: THREE.Group, rockSize: number): void {
    const mossCount = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < mossCount; i++) {
      const mossSize = rockSize * (0.08 + Math.random() * 0.1);
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(mossSize, 6, 4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3 + Math.random() * 0.06, 0.4, 0.2),
          roughness: 0.95,
          metalness: 0.0,
          transparent: true,
          opacity: 0.6
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.3) * rockSize * 0.5;
      moss.position.set(
        Math.cos(angle) * rockSize * 0.6,
        height,
        Math.sin(angle) * rockSize * 0.6
      );
      
      moss.scale.set(1, 0.2, 1);
      rockGroup.add(moss);
    }
  }
  
  private addSubtleRockDebris(rockGroup: THREE.Group, rockSize: number, baseMaterial: THREE.MeshStandardMaterial): void {
    const debrisCount = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = rockSize * (0.02 + Math.random() * 0.05);
      const debris = new THREE.Mesh(
        new THREE.IcosahedronGeometry(debrisSize, 1),
        baseMaterial.clone()
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (1.0 + Math.random() * 0.3);
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * 0.1,
        Math.sin(angle) * distance
      );
      
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      debris.castShadow = true;
      debris.receiveShadow = true;
      rockGroup.add(debris);
    }
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
    this.spawnRandomFeatures(region, 'forest', 12, features);
    this.spawnEnhancedRocks(region, 20, features);
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
    this.spawnEnhancedRocks(region, 25, features);
    this.spawnRandomFeatures(region, 'bushes', 10, features);
  }
  
  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 8, features);
    this.spawnEnhancedRocks(region, 30, features);
    this.spawnRandomFeatures(region, 'bushes', 5, features);
  }
  
  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 2, features);
    this.spawnEnhancedRocks(region, 35, features);
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
  
  private spawnEnhancedRocks(region: RegionCoordinates, totalRocks: number, features: THREE.Object3D[]): void {
    const totalWeight = this.rockVariations.reduce((sum, variation) => sum + variation.weight, 0);
    
    for (let i = 0; i < totalRocks; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      if (!this.isPositionNearTavern(position)) {
        const variation = this.selectRockVariation(totalWeight);
        
        if ((variation.category === 'large' || variation.category === 'massive') && 
            this.isTooCloseToLargeFormation(position)) {
          continue;
        }
        
        const rock = this.spawnRockByVariation(variation, position);
        if (rock) {
          features.push(rock);
          this.scene.add(rock);
          
          if (variation.category === 'large' || variation.category === 'massive') {
            this.largeRockFormations.push(position.clone());
          }
          
          if (this.collisionRegistrationCallback && variation.category !== 'tiny') {
            this.collisionRegistrationCallback(rock);
            console.log(`🔧 Callback registered collision for ${variation.category} rock at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
          }
        }
      }
    }
  }
  
  private selectRockVariation(totalWeight: number): RockVariation {
    let random = Math.random() * totalWeight;
    
    for (const variation of this.rockVariations) {
      if (random < variation.weight) {
        return variation;
      }
      random -= variation.weight;
    }
    
    return this.rockVariations[2];
  }
  
  private isTooCloseToLargeFormation(position: THREE.Vector3): boolean {
    return this.largeRockFormations.some(formation => 
      formation.distanceTo(position) < this.minimumLargeRockDistance
    );
  }
  
  private spawnRockByVariation(variation: RockVariation, position: THREE.Vector3): THREE.Object3D | null {
    const categoryStartIndex = this.getCategoryStartIndex(variation.category);
    const categoryModels = this.getCategoryModels(variation.category);
    
    if (categoryModels.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * categoryModels.length);
    const model = categoryModels[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    
    const scaleVariation = variation.category === 'tiny' ? 0.2 : 
                          variation.category === 'small' ? 0.3 : 
                          variation.category === 'medium' ? 0.4 : 0.3;
    const scale = 1.0 + (Math.random() - 0.5) * scaleVariation;
    model.scale.set(scale, scale, scale);
    
    model.position.copy(position);
    
    return model;
  }
  
  private getCategoryStartIndex(category: string): number {
    switch (category) {
      case 'tiny': return 0;
      case 'small': return 6;
      case 'medium': return 12;
      case 'large': return 16;
      case 'massive': return 20;
      default: return 12;
    }
  }
  
  private getCategoryModels(category: string): THREE.Object3D[] {
    const startIndex = this.getCategoryStartIndex(category);
    let count: number;
    
    switch (category) {
      case 'tiny':
      case 'small':
        count = 6;
        break;
      case 'medium':
      case 'large':
      case 'massive':
        count = 4;
        break;
      default:
        count = 4;
    }
    
    return this.rockModels.slice(startIndex, startIndex + count);
  }
  
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
        featureCount = Math.floor(clusterArea * 0.01 * cluster.density);
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features);
        break;
        
      case 'bushes':
        featureCount = Math.floor(clusterArea * 0.025 * cluster.density);
        this.spawnClusteredFeatures(region, 'bushes', featureCount, cluster, features);
        break;
        
      case 'mixed':
        featureCount = Math.floor(clusterArea * 0.008 * cluster.density);
        this.spawnClusteredFeatures(region, 'forest', featureCount, cluster, features);
        
        featureCount = Math.floor(clusterArea * 0.006 * cluster.density);
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features);
        
        featureCount = Math.floor(clusterArea * 0.015 * cluster.density);
        this.spawnClusteredFeatures(region, 'bushes', featureCount, cluster, features);
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
            console.log(`🔧 Callback registered collision for dynamically spawned ${type} at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
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
            console.log(`🔧 Callback registered collision for dynamically spawned ${type} at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
          }
        }
      }
    }
  }
  
  private spawnFeature(
    type: 'forest' | 'rocks' | 'bushes',
    position: THREE.Vector3
  ): THREE.Object3D | null {
    let modelArray: THREE.Object3D[];
    
    switch(type) {
      case 'forest':
        modelArray = this.treeModels;
        break;
      case 'rocks':
        modelArray = this.rockModels;
        break;
      case 'bushes':
        modelArray = this.bushModels;
        break;
      default:
        return null;
    }
    
    const modelIndex = Math.floor(Math.random() * modelArray.length);
    const model = modelArray[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(scale, scale, scale);
    
    model.position.copy(position);
    
    return model;
  }
  
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
  
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    return Math.min(Math.max((num + 3) / 6, 0), 1);
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
