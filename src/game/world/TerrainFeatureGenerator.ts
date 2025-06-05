import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TextureGenerator } from '../utils';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

// UPDATED: Enhanced rock variations with shape personality
export interface RockVariation {
  category: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  sizeRange: [number, number];
  weight: number;
  isCluster: boolean;
  clusterSize?: [number, number];
  shapePersonality: 'character' | 'basic'; // NEW: determines deformation intensity
}

// ENHANCED: Rock shape types with specific characteristics
interface RockShape {
  type: 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered' | 'angular' | 'flattened' | 'jagged';
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron' | 'custom';
  deformationIntensity: number;
  weatheringLevel: number;
  shapeModifier: 'none' | 'stretch' | 'flatten' | 'fracture' | 'erode'; // NEW: specific shape modifications
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeModels: THREE.Object3D[] = [];
  private rockModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];
  
  // UPDATED: Enhanced rock variations with shape personality system
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false, shapePersonality: 'character' },
    { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false, shapePersonality: 'character' },
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false, shapePersonality: 'basic' },
    { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' },
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' }
  ];
  
  // ENHANCED: Expanded rock shapes with specific modifiers
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.3, weatheringLevel: 0.6, shapeModifier: 'erode' },
    { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.35, weatheringLevel: 0.3, shapeModifier: 'stretch' },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.8, shapeModifier: 'flatten' },
    { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.4, weatheringLevel: 0.4, shapeModifier: 'fracture' },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.35, weatheringLevel: 0.9, shapeModifier: 'erode' },
    { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.3, weatheringLevel: 0.7, shapeModifier: 'flatten' },
    { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.4, weatheringLevel: 0.5, shapeModifier: 'fracture' },
    { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.3, weatheringLevel: 0.6, shapeModifier: 'none' }
  ];
  
  // Track spawned objects by region for cleanup
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Track large rock formations to maintain distance
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 150;
  
  // Tavern exclusion zone
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15;
  
  // NEW: Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  // Debug mode for wireframe visualization
  private debugMode: boolean = false;
  
  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.loadModels();
  }
  
  // NEW: Set collision registration callback
  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
    console.log('🔧 TerrainFeatureGenerator collision registration callback set');
  }
  
  // Enable/disable debug wireframe mode
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`🔧 Rock debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // NEW: Get spawned features for a region (for manual collision registration)
  public getSpawnedFeaturesForRegion(regionKey: string): THREE.Object3D[] | undefined {
    return this.spawnedFeatures.get(regionKey);
  }
  
  private loadModels(): void {
    // Tree models (3 variations) - Keep existing tree graphics
    for (let i = 0; i < 3; i++) {
      const treeHeight = 8; // Fixed height for consistency
      const treeWidth = 0.3 + Math.random() * 0.3; // 0.3-0.6 radius
      
      // Tree trunk (larger than before)
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
      
      // Tree leaves (3 layers like original)
      for (let layer = 0; layer < 3; layer++) {
        const leavesGeometry = new THREE.ConeGeometry(2.5 - layer * 0.3, 4, 8);
        const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.5 + Math.random() * 0.3);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
          color: leavesColor,
          transparent: true,
          opacity: 0.9
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 7 + layer * 1.5; // Heights: 7, 8.5, 10
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);
      }
      
      this.treeModels.push(tree);
    }
    
    // ENHANCED: Rock generation with improved quality
    this.createEnhancedRockVariations();
    
    // IMPROVED Bush models (4 variations with organic shapes and better materials)
    for (let i = 0; i < 4; i++) {
      const bushGroup = new THREE.Group();
      const bushType = i % 2;
      
      // Create bush with multiple organic clusters
      const mainBushSize = 0.5 + Math.random() * 0.4; // 0.5-0.9 range
      const clusterCount = 3 + Math.floor(Math.random() * 4); // 3-6 clusters
      
      // Different bush color variations
      const bushColors = [
        new THREE.Color().setHSL(0.25, 0.6, 0.4), // Dark green
        new THREE.Color().setHSL(0.3, 0.7, 0.5),  // Bright green
        new THREE.Color().setHSL(0.2, 0.5, 0.45), // Olive green
        new THREE.Color().setHSL(0.28, 0.8, 0.4)  // Forest green
      ];
      
      const bushMaterial = new THREE.MeshStandardMaterial({
        color: bushColors[i % bushColors.length],
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
      
      // Create organic bush shape with multiple spheres
      for (let j = 0; j < clusterCount; j++) {
        const clusterSize = mainBushSize * (0.6 + Math.random() * 0.6);
        const cluster = new THREE.Mesh(
          new THREE.SphereGeometry(clusterSize, 8, 6),
          bushMaterial.clone()
        );
        
        // Position clusters organically
        const angle = (j / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = mainBushSize * (0.2 + Math.random() * 0.3);
        cluster.position.set(
          Math.cos(angle) * distance,
          0.3 + Math.random() * 0.2,
          Math.sin(angle) * distance
        );
        
        // Deform clusters for organic look
        cluster.scale.set(
          0.8 + Math.random() * 0.4,
          0.6 + Math.random() * 0.3,
          0.8 + Math.random() * 0.4
        );
        
        cluster.castShadow = true;
        cluster.receiveShadow = true;
        bushGroup.add(cluster);
      }
      
      // Add simple stem/branch structure (30% chance)
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
      
      // Add berries or flowers (15% chance)
      if (Math.random() < 0.15) {
        const berryCount = 3 + Math.floor(Math.random() * 5);
        for (let k = 0; k < berryCount; k++) {
          const berry = new THREE.Mesh(
            new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 4, 3),
            new THREE.MeshStandardMaterial({
              color: Math.random() < 0.5 ? 0xFF6B6B : 0x4ECDC4, // Red berries or blue flowers
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
  
  // ENHANCED: Create rock variations with improved quality
  private createEnhancedRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createVariedRockCluster(rockGroup, variation, i);
        } else {
          this.createOrganicRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} enhanced organic rock variations`);
  }
  
  // ENHANCED: Create organic rocks with improved geometry and smoothing
  private createOrganicRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create high-resolution base geometry
    let rockGeometry = this.createHighResolutionBaseGeometry(rockShape, rockSize);
    
    // Apply shape modifications with reduced intensity
    this.applyControlledShapeModifications(rockGeometry, rockShape, rockSize);
    
    // Apply organic deformation with smoothing
    const deformationIntensity = variation.shapePersonality === 'character' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.5;
    this.applyOrganicDeformation(rockGeometry, deformationIntensity, rockSize, rockShape);
    
    // Apply advanced geometry processing for quality
    this.enhanceGeometryQuality(rockGeometry);
    
    // Create enhanced material
    const rockMaterial = this.createEnhancedRockMaterial(variation.category, rockShape, index);
    
    const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
    mainRock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mainRock.position.y = rockSize * 0.1;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    
    // Add debug wireframe if enabled
    if (this.debugMode) {
      this.debugRockGeometry(mainRock);
    }
    
    rockGroup.add(mainRock);
    
    // Add surface features for medium+ rocks
    if (variation.category === 'medium' || variation.category === 'large') {
      this.addSurfaceFeatures(rockGroup, rockSize, rockShape, rockMaterial);
    }
    
    console.log(`🏔️ Created organic ${variation.category} ${rockShape.type} rock with improved quality`);
  }
  
  // NEW: Create high-resolution base geometry for smooth shapes
  private createHighResolutionBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        // High detail for smooth curves
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
        break;
        
      case 'sphere':
        // High segment count for organic shapes
        geometry = new THREE.SphereGeometry(rockSize, 32, 32);
        break;
        
      case 'dodecahedron':
        // Increased detail level
        geometry = new THREE.DodecahedronGeometry(rockSize, 2);
        break;
        
      case 'custom':
        geometry = this.createOrganicBoulderGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
    }
    
    return geometry;
  }
  
  // ENHANCED: Organic boulder geometry with better resolution
  private createOrganicBoulderGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 24, 18);
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Create organic variation with multiple noise layers
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // Reduced noise intensity for smoother results
      const noise1 = Math.sin(x * 1.5) * Math.cos(y * 1.5) * Math.sin(z * 1.5);
      const noise2 = Math.sin(x * 3) * Math.cos(z * 3) * 0.3; // Reduced from 0.5
      const noise3 = Math.cos(y * 4) * Math.sin(x * 2) * 0.2; // Reduced from 0.3
      const noise4 = Math.sin(x * 6) * Math.cos(y * 6) * Math.sin(z * 6) * 0.1; // Reduced from 0.15
      
      // Gentler organic variation
      const organicFactor = 1 + (noise1 * 0.15 + noise2 * 0.1 + noise3 * 0.08 + noise4 * 0.03);
      
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
  
  // NEW: Controlled shape modifications with reduced intensity
  private applyControlledShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    switch (rockShape.shapeModifier) {
      case 'stretch':
        this.applyGentleStretchModification(positions, rockSize);
        break;
        
      case 'flatten':
        this.applyGentleFlattenModification(positions, rockSize);
        break;
        
      case 'fracture':
        this.applyControlledFractureModification(positions, rockSize);
        break;
        
      case 'erode':
        this.applyEnhancedErosionModification(positions, rockSize);
        break;
        
      default:
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Gentle stretch for spires
  private applyGentleStretchModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      
      // Gentler vertical stretching
      positions[i + 1] = y * (1.2 + Math.random() * 0.3); // Reduced from 1.5 + 0.5
      
      // Smoother tapering
      const height = Math.abs(positions[i + 1]);
      const taperFactor = Math.max(0.5, 1 - height / (rockSize * 2.5)); // More gradual taper
      positions[i] *= taperFactor;
      positions[i + 2] *= taperFactor;
    }
  }
  
  // NEW: Gentle flatten for slabs
  private applyGentleFlattenModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      // Gentler flattening
      positions[i + 1] *= 0.4 + Math.random() * 0.2; // Less extreme than 0.3
      positions[i] *= 1.2 + Math.random() * 0.3; // More controlled widening
      positions[i + 2] *= 1.2 + Math.random() * 0.3;
    }
  }
  
  // NEW: Controlled fracture for angular rocks
  private applyControlledFractureModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Gentler angular facets
      const facetNoise = Math.floor(x * 2) + Math.floor(y * 2) + Math.floor(z * 2);
      const facetIntensity = (facetNoise % 3) * 0.05; // Reduced from 0.1
      
      positions[i] += Math.sign(x) * facetIntensity;
      positions[i + 1] += Math.sign(y) * facetIntensity;
      positions[i + 2] += Math.sign(z) * facetIntensity;
    }
  }
  
  // ENHANCED: Improved erosion with iterative relaxation
  private applyEnhancedErosionModification(positions: Float32Array, rockSize: number): void {
    // Multi-pass erosion for natural weathering
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Reduced erosion intensity
        const erosion1 = Math.sin(x * 1.5) * Math.cos(y * 1.5) * 0.08; // Reduced from 0.15
        const erosion2 = Math.sin(z * 2) * Math.cos(x * 1.2) * 0.05; // Reduced from 0.1
        
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
    
    // Apply vertical lowering for realistic weathering
    for (let i = 0; i < positions.length; i += 3) {
      const height = positions[i + 2];
      positions[i + 2] -= 0.05 * height * Math.abs(height); // Gradual lowering
    }
  }
  
  // NEW: Organic deformation with improved smoothing
  private applyOrganicDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape
  ): void {
    // Reduced intensity organic noise
    this.applyReducedOrganicNoise(geometry, intensity * 0.7, rockSize);
    
    // Gentle detail deformation
    this.applyGentleDetailDeformation(geometry, intensity * 0.4, rockSize * 0.5);
    
    // Surface smoothing for weathered rocks
    if (rockShape.weatheringLevel > 0.7) {
      this.applySurfaceSmoothing(geometry, intensity * 0.2);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Reduced organic noise deformation
  private applyReducedOrganicNoise(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Reduced noise amplitude
      const noise1 = Math.sin(x / scale) * Math.cos(y / scale) * Math.sin(z / scale);
      const noise2 = Math.sin(x / scale * 2) * Math.cos(z / scale * 2) * 0.3; // Reduced from 0.5
      const noise3 = Math.cos(y / scale * 3) * Math.sin(x / scale * 3) * 0.15; // Reduced from 0.25
      
      const combinedNoise = noise1 + noise2 + noise3;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = combinedNoise * intensity * 0.5; // Reduced overall impact
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  // NEW: Gentle detail deformation
  private applyGentleDetailDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Reduced high-frequency detail
      const detailNoise = Math.sin(x / scale * 6) * Math.cos(y / scale * 6) * Math.sin(z / scale * 6);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = detailNoise * intensity * 0.3; // Reduced impact
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  // NEW: Surface smoothing for natural appearance
  private applySurfaceSmoothing(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Very gentle surface variation
      const smoothness = Math.sin(x * 8) * Math.cos(y * 8) * Math.sin(z * 8) * 0.02;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = smoothness * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  // ENHANCED: Advanced geometry quality enhancement
  private enhanceGeometryQuality(geometry: THREE.BufferGeometry): void {
    // Fix invalid values
    this.fixInvalidVertices(geometry);
    
    // Weld nearby vertices to close gaps
    this.weldVertices(geometry, 0.01);
    
    // Apply Laplacian smoothing
    this.smoothGeometry(geometry, 2);
    
    // Final validation and normal computation
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    console.log('🔧 Enhanced rock geometry quality with welding and smoothing');
  }
  
  // NEW: Fix invalid vertices
  private fixInvalidVertices(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
        console.warn('🔧 Fixed invalid vertex position');
      }
    }
  }
  
  // NEW: Vertex welding to close gaps and fix unconnected edges
  private weldVertices(geometry: THREE.BufferGeometry, threshold: number = 0.01): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const mergeMap: number[] = new Array(vertexCount).fill(0).map((_, i) => i);
    
    // Find vertices to merge
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
    
    // Create merged vertex array
    const newPositions: number[] = [];
    const remap: number[] = [];
    
    for (let i = 0; i < vertexCount; i++) {
      if (mergeMap[i] === i) {
        remap[i] = newPositions.length / 3;
        newPositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      } else {
        remap[i] = remap[mergeMap[i]];
      }
    }
    
    // Update geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    // Update indices if present
    const indices = geometry.index ? geometry.index.array as Uint16Array : null;
    if (indices) {
      const newIndices: number[] = [];
      for (let i = 0; i < indices.length; i++) {
        newIndices.push(remap[indices[i]]);
      }
      geometry.setIndex(newIndices);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    console.log(`🔧 Welded vertices: ${vertexCount} -> ${newPositions.length / 3}`);
  }
  
  // NEW: Laplacian smoothing for organic shapes
  private smoothGeometry(geometry: THREE.BufferGeometry, iterations: number = 2): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const newPositions = new Float32Array(positions.length);
    
    for (let iter = 0; iter < iterations; iter++) {
      // Copy current positions
      for (let i = 0; i < positions.length; i++) {
        newPositions[i] = positions[i];
      }
      
      // Apply smoothing
      for (let i = 0; i < vertexCount; i++) {
        let sumX = 0, sumY = 0, sumZ = 0, count = 0;
        const index = i * 3;
        
        // Find neighboring vertices within threshold
        for (let j = 0; j < vertexCount; j++) {
          if (i !== j) {
            const dist = Math.sqrt(
              Math.pow(positions[index] - positions[j * 3], 2) +
              Math.pow(positions[index + 1] - positions[j * 3 + 1], 2) +
              Math.pow(positions[index + 2] - positions[j * 3 + 2], 2)
            );
            if (dist < 0.15) { // Neighbor threshold
              sumX += positions[j * 3];
              sumY += positions[j * 3 + 1];
              sumZ += positions[j * 3 + 2];
              count++;
            }
          }
        }
        
        // Apply weighted smoothing
        if (count > 0) {
          const smoothingFactor = 0.3; // Conservative smoothing
          newPositions[index] = positions[index] * (1 - smoothingFactor) + (sumX / count) * smoothingFactor;
          newPositions[index + 1] = positions[index + 1] * (1 - smoothingFactor) + (sumY / count) * smoothingFactor;
          newPositions[index + 2] = positions[index + 2] * (1 - smoothingFactor) + (sumZ / count) * smoothingFactor;
        }
      }
      
      // Update positions
      for (let i = 0; i < positions.length; i++) {
        positions[i] = newPositions[i];
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    console.log(`🔧 Applied ${iterations} iterations of Laplacian smoothing`);
  }
  
  // NEW: Debug wireframe visualization
  private debugRockGeometry(rock: THREE.Mesh): void {
    const wireframe = new THREE.WireframeGeometry(rock.geometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.5
    }));
    rock.add(line);
    
    // Remove wireframe after 10 seconds
    setTimeout(() => {
      if (rock.parent) {
        rock.remove(line);
      }
    }, 10000);
    
    console.log('🔧 Added debug wireframe to rock');
  }
  
  // ENHANCED: Create rock material with better variation
  private createEnhancedRockMaterial(category: string, rockShape: RockShape, index: number): THREE.MeshStandardMaterial {
    const rockTypes = [
      { color: 0x8B7355, roughness: 0.9, metalness: 0.1, name: 'granite' },
      { color: 0x696969, roughness: 0.85, metalness: 0.05, name: 'basalt' },
      { color: 0xA0A0A0, roughness: 0.8, metalness: 0.15, name: 'limestone' },
      { color: 0x8B7D6B, roughness: 0.95, metalness: 0.0, name: 'sandstone' },
      { color: 0x556B2F, roughness: 0.9, metalness: 0.05, name: 'moss_covered' },
      { color: 0x2F4F4F, roughness: 0.9, metalness: 0.2, name: 'slate' },
      { color: 0x8B4513, roughness: 0.85, metalness: 0.0, name: 'ironstone' }
    ];
    
    const rockType = rockTypes[index % rockTypes.length];
    const baseColor = new THREE.Color(rockType.color);
    
    // Enhanced weathering based on shape and category
    if (rockShape.weatheringLevel > 0.5) {
      const weatheringIntensity = rockShape.weatheringLevel * 0.3; // Reduced for subtlety
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, weatheringIntensity);
    }
    
    // Age-based weathering for larger rocks
    if (category === 'large' || category === 'massive') {
      const ageColor = new THREE.Color(0x3A3A2A);
      baseColor.lerp(ageColor, 0.1); // Reduced from 0.15
    }
    
    // Position-based moss for bottom rocks (simulated)
    if (rockShape.type === 'weathered' && Math.random() < 0.6) {
      const mossColor = new THREE.Color(0x2F5F2F);
      baseColor.lerp(mossColor, 0.25);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness + (rockShape.weatheringLevel * 0.05), // Reduced impact
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(0.8, 0.8) // Slightly reduced normal intensity
    });
    
    return material;
  }
  
  private addSurfaceFeatures(
    rockGroup: THREE.Group, 
    rockSize: number, 
    rockShape: RockShape, 
    baseMaterial: THREE.MeshStandardMaterial
  ): void {
    if (Math.random() < 0.3) {
      this.addRockCracks(rockGroup, rockSize);
    }
    
    if (rockShape.weatheringLevel > 0.6 && Math.random() < 0.4) {
      this.addMossPatches(rockGroup, rockSize);
    }
    
    if (Math.random() < 0.25) {
      this.addRockDebris(rockGroup, rockSize, baseMaterial);
    }
    
    if (rockSize > 1.0 && Math.random() < 0.2) {
      this.addLichenGrowth(rockGroup, rockSize);
    }
  }
  
  private addRockCracks(rockGroup: THREE.Group, rockSize: number): void {
    const crackCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < crackCount; i++) {
      const crackGeometry = new THREE.PlaneGeometry(rockSize * 0.8, rockSize * 0.1);
      const crackMaterial = new THREE.MeshStandardMaterial({
        color: 0x2A2A2A,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      
      const crack = new THREE.Mesh(crackGeometry, crackMaterial);
      
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * rockSize;
      crack.position.set(
        Math.cos(angle) * rockSize * 0.7,
        height,
        Math.sin(angle) * rockSize * 0.7
      );
      
      crack.rotation.y = angle;
      crack.rotation.x = (Math.random() - 0.5) * 0.5;
      
      rockGroup.add(crack);
    }
  }
  
  private addMossPatches(rockGroup: THREE.Group, rockSize: number): void {
    const mossCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < mossCount; i++) {
      const mossSize = rockSize * (0.15 + Math.random() * 0.25);
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(mossSize, 6, 4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.6, 0.3),
          roughness: 0.95,
          metalness: 0.0,
          transparent: true,
          opacity: 0.8
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.3) * rockSize * 0.8;
      moss.position.set(
        Math.cos(angle) * rockSize * 0.8,
        height,
        Math.sin(angle) * rockSize * 0.8
      );
      
      moss.scale.set(1, 0.3, 1);
      rockGroup.add(moss);
    }
  }
  
  private addRockDebris(rockGroup: THREE.Group, rockSize: number, baseMaterial: THREE.MeshStandardMaterial): void {
    const debrisCount = 3 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = rockSize * (0.05 + Math.random() * 0.15);
      const debris = new THREE.Mesh(
        new THREE.DodecahedronGeometry(debrisSize, 0),
        baseMaterial.clone()
      );
      
      // Scatter around base of rock
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (1.2 + Math.random() * 0.8);
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * 0.3,
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
  
  private addLichenGrowth(rockGroup: THREE.Group, rockSize: number): void {
    const lichenCount = 4 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < lichenCount; i++) {
      const lichenSize = rockSize * (0.08 + Math.random() * 0.12);
      const lichen = new THREE.Mesh(
        new THREE.CircleGeometry(lichenSize, 8),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.15 + Math.random() * 0.1, 0.4, 0.5),
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        })
      );
      
      // Position lichen on rock surface
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.2) * rockSize * 0.6;
      lichen.position.set(
        Math.cos(angle) * rockSize * 0.85,
        height,
        Math.sin(angle) * rockSize * 0.85
      );
      
      lichen.lookAt(new THREE.Vector3(0, 0, 0)); // Face outward from rock
      rockGroup.add(lichen);
    }
  }
  
  // ENHANCED: Varied rock cluster creation with improved quality
  private createVariedRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Create foundation rocks (largest, most stable)
    const foundationCount = Math.min(2, Math.floor(clusterCount * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2); // 80-100% of max size
      const rock = this.createClusterRock(rockSize, variation, i, 'foundation');
      
      // Position foundation rocks
      const angle = (i / foundationCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = rockSize * 0.3;
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.15, // Slight embedding
        Math.sin(angle) * distance
      );
      
      foundationRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create supporting rocks (medium size)
    const supportCount = Math.floor(clusterCount * 0.4);
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3); // 50-80% of max size
      const rock = this.createClusterRock(rockSize, variation, i + foundationCount, 'support');
      
      // Position against foundation rocks with realistic stacking
      const foundationRock = foundationRocks[i % foundationRocks.length];
      const stackPosition = this.calculateRealisticStackingPosition(
        foundationRock.position, 
        rockSize, 
        maxSize * 0.9,
        'support'
      );
      rock.position.copy(stackPosition);
      
      supportRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create accent rocks (smallest, most varied shapes)
    const accentCount = clusterCount - foundationCount - supportCount;
    
    for (let i = 0; i < accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3); // 20-50% of max size
      const rock = this.createClusterRock(rockSize, variation, i + foundationCount + supportCount, 'accent');
      
      // Position accent rocks in gaps or on top
      const baseRocks = [...foundationRocks, ...supportRocks];
      const baseRock = baseRocks[Math.floor(Math.random() * baseRocks.length)];
      const stackPosition = this.calculateRealisticStackingPosition(
        baseRock.position,
        rockSize,
        maxSize * 0.6,
        'accent'
      );
      rock.position.copy(stackPosition);
      
      rockGroup.add(rock);
    }
    
    // Add cluster-wide features
    this.addEnhancedClusterFeatures(rockGroup, maxSize, variation);
    
    console.log(`🏔️ Created varied cluster with ${clusterCount} rocks: ${foundationCount} foundation, ${supportCount} support, ${accentCount} accent`);
  }
  
  // ENHANCED: Create cluster rock with role-specific characteristics
  private createClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.Object3D {
    // Select shape based on role
    let rockShape: RockShape;
    
    switch (role) {
      case 'foundation':
        // Foundation rocks are more stable shapes
        const foundationShapes = this.rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        rockShape = foundationShapes[index % foundationShapes.length];
        break;
        
      case 'support':
        // Support rocks can be more varied
        const supportShapes = this.rockShapes.filter(s => 
          s.type !== 'spire' // Avoid unstable shapes for support
        );
        rockShape = supportShapes[index % supportShapes.length];
        break;
        
      case 'accent':
        // Accent rocks can be any shape for visual interest
        rockShape = this.rockShapes[index % this.rockShapes.length];
        break;
        
      default:
        rockShape = this.rockShapes[index % this.rockShapes.length];
    }
    
    // Create high-resolution base geometry
    let geometry = this.createHighResolutionBaseGeometry(rockShape, rockSize);
    
    // Apply controlled modifications
    this.applyControlledShapeModifications(geometry, rockShape, rockSize);
    
    // Apply deformation based on role
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    this.applyOrganicDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    // Enhance geometry quality
    this.enhanceGeometryQuality(geometry);
    
    // Create role-based material
    const material = this.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply role-specific rotation
    if (role === 'foundation') {
      // Foundation rocks are more stable, less rotation
      rock.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
    } else {
      // Other rocks can rotate more
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
    }
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Add debug wireframe if enabled
    if (this.debugMode) {
      this.debugRockGeometry(rock);
    }
    
    return rock;
  }
  
  // NEW: Role-based material creation
  private createRoleBasedMaterial(
    category: string, 
    rockShape: RockShape, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.MeshStandardMaterial {
    const material = this.createEnhancedRockMaterial(category, rockShape, index);
    
    // Role-specific weathering adjustments
    switch (role) {
      case 'foundation':
        // Foundation rocks are more weathered (bottom of formation)
        material.roughness = Math.min(1.0, material.roughness + 0.05); // Reduced from 0.1
        if (Math.random() < 0.5) { // Reduced probability
          // Add moisture weathering tint
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x2A2A1A);
          currentColor.lerp(weatheringColor, 0.1); // Reduced from 0.2
        }
        break;
        
      case 'support':
        // Support rocks have moderate weathering
        if (Math.random() < 0.3) { // Reduced from 0.4
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x3A3A2A);
          currentColor.lerp(weatheringColor, 0.05); // Reduced from 0.1
        }
        break;
        
      case 'accent':
        // Accent rocks can be fresher (less weathered)
        material.roughness = Math.max(0.6, material.roughness - 0.05);
        break;
    }
    
    return material;
  }
  
  // NEW: Realistic stacking position calculation
  private calculateRealisticStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: 'support' | 'accent'
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (role === 'support') {
      // Support rocks lean against base rocks
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize + rockSize) * 0.4; // Closer contact
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.3 + Math.random() * baseSize * 0.2, // Realistic height
        basePosition.z + Math.sin(angle) * distance
      );
    } else {
      // Accent rocks can be on top or in gaps
      if (Math.random() < 0.6) {
        // On top
        const offsetX = (Math.random() - 0.5) * baseSize * 0.3;
        const offsetZ = (Math.random() - 0.5) * baseSize * 0.3;
        
        position.set(
          basePosition.x + offsetX,
          basePosition.y + baseSize * 0.6 + rockSize * 0.3,
          basePosition.z + offsetZ
        );
      } else {
        // In gaps around base
        const angle = Math.random() * Math.PI * 2;
        const distance = baseSize * (0.8 + Math.random() * 0.4);
        
        position.set(
          basePosition.x + Math.cos(angle) * distance,
          basePosition.y + rockSize * 0.2,
          basePosition.z + Math.sin(angle) * distance
        );
      }
    }
    
    return position;
  }
  
  // ENHANCED: Advanced cluster features
  private addEnhancedClusterFeatures(rockGroup: THREE.Group, maxSize: number, variation: RockVariation): void {
    // Add sediment accumulation with better placement
    if (Math.random() < 0.6) {
      this.addRealisticSediment(rockGroup, maxSize);
    }
    
    // Add vegetation growing in realistic spots
    if (Math.random() < 0.5) {
      this.addRealisticVegetation(rockGroup, maxSize);
    }
    
    // Add weathering stains based on formation
    if (variation.category === 'large' || variation.category === 'massive') {
      if (Math.random() < 0.7) {
        this.addFormationWeathering(rockGroup, maxSize);
      }
    }
    
    // Add fallen debris around cluster base
    if (Math.random() < 0.4) {
      this.addClusterDebris(rockGroup, maxSize);
    }
  }
  
  // NEW: Realistic sediment placement
  private addRealisticSediment(rockGroup: THREE.Group, maxSize: number): void {
    const sedimentCount = 6 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < sedimentCount; i++) {
      const sediment = new THREE.Mesh(
        new THREE.SphereGeometry(maxSize * (0.05 + Math.random() * 0.08), 6, 4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.1, 0.3, 0.4 + Math.random() * 0.2),
          roughness: 0.95,
          metalness: 0.0
        })
      );
      
      // Place sediment in low spots and gaps
      const angle = Math.random() * Math.PI * 2;
      const distance = maxSize * (0.6 + Math.random() * 0.8);
      
      sediment.position.set(
        Math.cos(angle) * distance,
        0.02 + Math.random() * 0.05, // Very low to ground
        Math.sin(angle) * distance
      );
      
      sediment.scale.set(1, 0.2 + Math.random() * 0.2, 1); // Flattened
      rockGroup.add(sediment);
    }
  }
  
  // NEW: Realistic vegetation placement
  private addRealisticVegetation(rockGroup: THREE.Group, maxSize: number): void {
    const plantCount = 2 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < plantCount; i++) {
      const plantHeight = 0.2 + Math.random() * 0.6;
      const plant = new THREE.Mesh(
        new THREE.ConeGeometry(0.03 + Math.random() * 0.04, plantHeight, 6),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3, 0.7, 0.3 + Math.random() * 0.3),
          roughness: 0.9
        })
      );
      
      // Place vegetation in protected spots (north side, gaps)
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI; // Mostly north side
      const distance = maxSize * (0.7 + Math.random() * 0.5);
      
      plant.position.set(
        Math.cos(angle) * distance,
        plantHeight * 0.5,
        Math.sin(angle) * distance
      );
      
      // Add slight tilt for naturalism
      plant.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3
      );
      
      rockGroup.add(plant);
    }
  }
  
  // NEW: Formation weathering stains
  private addFormationWeathering(rockGroup: THREE.Group, maxSize: number): void {
    const stainCount = 4 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < stainCount; i++) {
      const stain = new THREE.Mesh(
        new THREE.PlaneGeometry(maxSize * (0.2 + Math.random() * 0.3), maxSize * (0.4 + Math.random() * 0.4)),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.1, 0.2, 0.15 + Math.random() * 0.1),
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide
        })
      );
      
      // Place weathering stains on rock faces
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * maxSize * 0.8;
      
      stain.position.set(
        Math.cos(angle) * maxSize * (0.5 + Math.random() * 0.3),
        height,
        Math.sin(angle) * maxSize * (0.5 + Math.random() * 0.3)
      );
      
      stain.rotation.y = angle + Math.PI / 2;
      stain.rotation.x = (Math.random() - 0.5) * 0.5;
      
      rockGroup.add(stain);
    }
  }
  
  // NEW: Cluster debris
  private addClusterDebris(rockGroup: THREE.Group, maxSize: number): void {
    const debrisCount = 8 + Math.floor(Math.random() * 12);
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = maxSize * (0.03 + Math.random() * 0.08);
      const debris = new THREE.Mesh(
        Math.random() < 0.5 ? 
          new THREE.DodecahedronGeometry(debrisSize, 0) :
          new THREE.IcosahedronGeometry(debrisSize, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.05, 0.2, 0.3 + Math.random() * 0.3),
          roughness: 0.9,
          metalness: 0.0
        })
      );
      
      // Scatter debris around cluster base
      const angle = Math.random() * Math.PI * 2;
      const distance = maxSize * (1.0 + Math.random() * 0.8);
      
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * 0.4,
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
  
  // Generate feature clusters for a specific region
  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.spawnedFeatures.has(regionKey)) return;
    
    console.log(`Generating features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Initialize spawned features array
    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);
    
    // Ring-specific feature generation with reduced rock spawning
    switch(region.ringIndex) {
      case 0: // First ring (starter area - evenly distributed forest)
        this.generateEvenlyDistributedFeatures(region, features);
        break;
      case 1: // Second ring (clustered forests, varied density)
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
  
  // UPDATED: Generate evenly distributed features with reduced rock density
  private generateEvenlyDistributedFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Generate trees (10-15)
    this.spawnRandomFeatures(region, 'forest', 12, features);
    
    // Generate reduced rock count (was 30, now 20)
    this.spawnEnhancedRocks(region, 20, features);
    
    // Generate bushes (15-20)
    this.spawnRandomFeatures(region, 'bushes', 18, features);
  }
  
  // UPDATED: Generate clustered features with reduced large rocks
  private generateClusteredFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Generate 3-5 clusters of different types
    const clusterCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < clusterCount; i++) {
      // Create a random position within the region
      const position = this.getRandomPositionInRegion(region);
      
      // Create a cluster with random properties
      const cluster: FeatureCluster = {
        position: position,
        radius: 20 + Math.random() * 30, // 20-50 units radius
        density: 0.3 + Math.random() * 0.7, // 0.3-1.0 density
        type: this.getRandomClusterType()
      };
      
      // Generate features for this cluster
      this.generateFeaturesForCluster(region, cluster, features);
    }
    
    // Add some scattered individual features outside clusters (reduced rock count: was 40, now 25)
    this.spawnRandomFeatures(region, 'forest', 5, features);
    this.spawnEnhancedRocks(region, 25, features);
    this.spawnRandomFeatures(region, 'bushes', 10, features);
  }
  
  // UPDATED: Generate sparse features with reduced large rock formations
  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Fewer trees, moderate rocks (was 50, now 30)
    this.spawnRandomFeatures(region, 'forest', 8, features);
    this.spawnEnhancedRocks(region, 30, features);
    this.spawnRandomFeatures(region, 'bushes', 5, features);
  }
  
  // UPDATED: Generate wasteland features with controlled massive formations
  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Mostly rocks, very few plants (was 60, now 35 max)
    this.spawnRandomFeatures(region, 'forest', 2, features);
    this.spawnEnhancedRocks(region, 35, features);
    this.spawnRandomFeatures(region, 'bushes', 3, features);
  }
  
  // NEW: Get random cluster type with weighted selection
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
    
    return 'mixed'; // Fallback
  }
  
  // NEW: Enhanced rock spawning with weighted size distribution
  private spawnEnhancedRocks(region: RegionCoordinates, totalRocks: number, features: THREE.Object3D[]): void {
    const totalWeight = this.rockVariations.reduce((sum, variation) => sum + variation.weight, 0);
    
    for (let i = 0; i < totalRocks; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      // Check if position is not near tavern
      if (!this.isPositionNearTavern(position)) {
        // Select rock variation based on weights
        const variation = this.selectRockVariation(totalWeight);
        
        // For large/massive rocks, check distance from other large formations
        if ((variation.category === 'large' || variation.category === 'massive') && 
            this.isTooCloseToLargeFormation(position)) {
          continue; // Skip this position if too close to another large formation
        }
        
        // Spawn the rock
        const rock = this.spawnRockByVariation(variation, position);
        if (rock) {
          features.push(rock);
          this.scene.add(rock);
          
          // Track large formations
          if (variation.category === 'large' || variation.category === 'massive') {
            this.largeRockFormations.push(position.clone());
          }
          
          // Register for collision immediately after spawning (except tiny rocks)
          if (this.collisionRegistrationCallback && variation.category !== 'tiny') {
            this.collisionRegistrationCallback(rock);
            console.log(`🔧 Registered enhanced ${variation.category} rock collision at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
          }
        }
      }
    }
  }
  
  // NEW: Select rock variation based on weighted probabilities
  private selectRockVariation(totalWeight: number): RockVariation {
    let random = Math.random() * totalWeight;
    
    for (const variation of this.rockVariations) {
      if (random < variation.weight) {
        return variation;
      }
      random -= variation.weight;
    }
    
    return this.rockVariations[2]; // Default to medium if something goes wrong
  }
  
  // NEW: Check if position is too close to existing large formations
  private isTooCloseToLargeFormation(position: THREE.Vector3): boolean {
    return this.largeRockFormations.some(formation => 
      formation.distanceTo(position) < this.minimumLargeRockDistance
    );
  }
  
  // NEW: Spawn rock based on variation category
  private spawnRockByVariation(variation: RockVariation, position: THREE.Vector3): THREE.Object3D | null {
    // Find appropriate rock models for this variation
    const categoryStartIndex = this.getCategoryStartIndex(variation.category);
    const categoryModels = this.getCategoryModels(variation.category);
    
    if (categoryModels.length === 0) return null;
    
    // Pick a random model
    const modelIndex = Math.floor(Math.random() * categoryModels.length);
    const model = categoryModels[modelIndex].clone();
    
    // Randomize rotation and scale
    model.rotation.y = Math.random() * Math.PI * 2;
    
    // Scale variation based on category
    const scaleVariation = variation.category === 'tiny' ? 0.15 : // Reduced variation
                          variation.category === 'small' ? 0.2 : 
                          variation.category === 'medium' ? 0.25 : 0.2;
    const scale = 1.0 + (Math.random() - 0.5) * scaleVariation;
    model.scale.set(scale, scale, scale);
    
    // Set position
    model.position.copy(position);
    
    return model;
  }
  
  // NEW: Get starting index for rock category in models array
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
  
  // NEW: Get rock models for specific category
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
  
  // Generate features within a cluster
  private generateFeaturesForCluster(
    region: RegionCoordinates, 
    cluster: FeatureCluster, 
    features: THREE.Object3D[]
  ): void {
    // Calculate number of features based on cluster area and density
    const clusterArea = Math.PI * cluster.radius * cluster.radius;
    let featureCount: number;
    
    switch(cluster.type) {
      case 'forest':
        featureCount = Math.floor(clusterArea * 0.015 * cluster.density);
        this.spawnClusteredFeatures(region, 'forest', featureCount, cluster, features);
        // Add some bushes under trees
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
        // Trees
        featureCount = Math.floor(clusterArea * 0.008 * cluster.density);
        this.spawnClusteredFeatures(region, 'forest', featureCount, cluster, features);
        
        // Rocks
        featureCount = Math.floor(clusterArea * 0.006 * cluster.density);
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features);
        
        // Bushes
        featureCount = Math.floor(clusterArea * 0.015 * cluster.density);
        this.spawnClusteredFeatures(region, 'bushes', featureCount, cluster, features);
        break;
    }
  }
  
  // Spawn features in a cluster
  private spawnClusteredFeatures(
    region: RegionCoordinates,
    type: 'forest' | 'rocks' | 'bushes',
    count: number,
    cluster: FeatureCluster,
    features: THREE.Object3D[]
  ): void {
    for (let i = 0; i < count; i++) {
      // Generate random position within cluster using gaussian distribution
      const angle = Math.random() * Math.PI * 2;
      const distance = this.gaussianRandom() * cluster.radius;
      
      const position = new THREE.Vector3(
        cluster.position.x + Math.cos(angle) * distance,
        0, // Y will be set based on terrain height
        cluster.position.z + Math.sin(angle) * distance
      );
      
      // Check if position is within the region boundaries AND not near tavern
      if (this.isPositionInRegion(position, region) && !this.isPositionNearTavern(position)) {
        // Spawn feature
        const feature = this.spawnFeature(type, position);
        if (feature) {
          features.push(feature);
          this.scene.add(feature);
          
          // NEW: Register for collision immediately after spawning
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(feature);
            console.log(`🔧 Callback registered collision for dynamically spawned ${type} at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
          }
        }
      }
    }
  }
  
  // Spawn random features throughout a region
  private spawnRandomFeatures(
    region: RegionCoordinates,
    type: 'forest' | 'rocks' | 'bushes',
    count: number,
    features: THREE.Object3D[]
  ): void {
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      // Check if position is not near tavern
      if (!this.isPositionNearTavern(position)) {
        // Spawn feature
        const feature = this.spawnFeature(type, position);
        if (feature) {
          features.push(feature);
          this.scene.add(feature);
          
          // NEW: Register for collision immediately after spawning
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(feature);
            console.log(`🔧 Callback registered collision for dynamically spawned ${type} at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
          }
        }
      }
    }
  }
  
  // Spawn a single feature at position
  private spawnFeature(
    type: 'forest' | 'rocks' | 'bushes',
    position: THREE.Vector3
  ): THREE.Object3D | null {
    let modelArray: THREE.Object3D[];
    
    // Select appropriate model array
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
    
    // Pick a random model
    const modelIndex = Math.floor(Math.random() * modelArray.length);
    const model = modelArray[modelIndex].clone();
    
    // Randomize rotation and scale
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(scale, scale, scale);
    
    // Set position
    model.position.copy(position);
    
    return model;
  }
  
  // Get a random position within a region
  private getRandomPositionInRegion(region: RegionCoordinates): THREE.Vector3 {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const worldCenter = new THREE.Vector3(0, 0, 0);
    
    // Calculate min/max radius
    const innerRadius = ringDef.innerRadius;
    const outerRadius = ringDef.outerRadius;
    
    // Calculate min/max angle for the quadrant
    const quadrantStartAngle = region.quadrant * (Math.PI / 2);
    const quadrantEndAngle = quadrantStartAngle + (Math.PI / 2);
    
    // Generate random radius and angle
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const angle = quadrantStartAngle + Math.random() * (quadrantEndAngle - quadrantStartAngle);
    
    // Convert to cartesian coordinates
    return new THREE.Vector3(
      worldCenter.x + Math.cos(angle) * radius,
      0, // Y will be set based on terrain height
      worldCenter.z + Math.sin(angle) * radius
    );
  }
  
  // Check if position is within a region
  private isPositionInRegion(position: THREE.Vector3, region: RegionCoordinates): boolean {
    const positionRegion = this.ringSystem.getRegionForPosition(position);
    if (!positionRegion) return false;
    
    return positionRegion.ringIndex === region.ringIndex && 
           positionRegion.quadrant === region.quadrant;
  }
  
  // Check if position is too close to tavern/spawn building
  private isPositionNearTavern(position: THREE.Vector3): boolean {
    const distance = position.distanceTo(this.tavernPosition);
    return distance < this.tavernExclusionRadius;
  }
  
  // Cleanup features for a region
  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.spawnedFeatures.get(regionKey);
    
    if (!features) return;
    
    console.log(`Cleaning up features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Remove all features from scene
    features.forEach(feature => {
      this.scene.remove(feature);
      
      // Dispose geometries and materials
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
    
    // Clear the array
    this.spawnedFeatures.delete(regionKey);
  }
  
  // Helper method: Gaussian random for natural-looking clusters
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    // Box-Muller transform
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    // Convert from normal distribution to 0-1 range
    return Math.min(Math.max((num + 3) / 6, 0), 1);
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
    this.largeRockFormations.length = 0; // Clear large formation tracking
  }
  
  // NEW: Create test rock cluster for debugging
  public createTestRockCluster(x: number, y: number, z: number): THREE.Group {
    console.log(`🪨 Creating test rock cluster at (${x}, ${y}, ${z})`);
    
    const testCluster = new THREE.Group();
    
    // Create one rock of each category for testing
    this.rockVariations.forEach((variation, index) => {
      const rockGroup = new THREE.Group();
      
      if (variation.isCluster) {
        this.createVariedRockCluster(rockGroup, variation, index);
      } else {
        this.createOrganicRock(rockGroup, variation, index);
      }
      
      // Position rocks in a line for easy inspection
      rockGroup.position.set(index * 10, 0, 0);
      testCluster.add(rockGroup);
    });
    
    testCluster.position.set(x, y, z);
    this.scene.add(testCluster);
    
    console.log(`🪨 Created test cluster with ${this.rockVariations.length} rock categories`);
    return testCluster;
  }
}
