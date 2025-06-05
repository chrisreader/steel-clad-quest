import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TextureGenerator } from '../utils';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

// NEW: Rock size categories with spawn weights
export interface RockVariation {
  category: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  sizeRange: [number, number]; // min, max size
  weight: number; // spawn probability weight
  isCluster: boolean; // whether this spawns as multi-rock clusters
  clusterSize?: [number, number]; // min, max rocks in cluster
}

// NEW: Enhanced rock shape types for organic generation
interface RockShape {
  type: 'boulder' | 'spire' | 'slab' | 'cluster' | 'weathered';
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron' | 'custom';
  deformationIntensity: number;
  weatheringLevel: number;
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeModels: THREE.Object3D[] = [];
  private rockModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];
  
  // UPDATED: Enhanced rock variation system with reduced large rock spawning
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false },
    { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false },
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false },
    { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [2, 3] },
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [2, 3] }
  ];
  
  // NEW: Rock shape definitions for realistic generation
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.3, weatheringLevel: 0.6 },
    { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.4, weatheringLevel: 0.3 },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.5, weatheringLevel: 0.8 },
    { type: 'cluster', baseGeometry: 'dodecahedron', deformationIntensity: 0.6, weatheringLevel: 0.7 },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.8, weatheringLevel: 0.9 }
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
    
    // COMPLETELY REWRITTEN: Enhanced rock models with realistic organic shapes
    this.createRealisticRockVariations();
    
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
  
  // COMPLETELY NEW: Create realistic rock variations with organic shapes
  private createRealisticRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 4 : 3;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createRealisticRockCluster(rockGroup, variation, i);
        } else {
          this.createRealisticSingleRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} realistic rock variations across 5 size categories`);
  }
  
  // NEW: Create realistic single rock with organic shapes
  private createRealisticSingleRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    // Select random rock shape
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create organic base geometry
    let rockGeometry = this.createOrganicBaseGeometry(rockShape, rockSize);
    
    // Apply multiple deformation passes for realism
    this.applyAdvancedDeformation(rockGeometry, rockShape.deformationIntensity, rockSize);
    
    // Create enhanced material with weathering
    const rockMaterial = this.createEnhancedRockMaterial(variation.category, rockShape, index);
    
    const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
    mainRock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mainRock.position.y = rockSize * 0.2; // Slightly embed in ground
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    
    rockGroup.add(mainRock);
    
    // Add realistic surface features for medium+ rocks
    if (variation.category === 'medium' || variation.category === 'large') {
      this.addSurfaceFeatures(rockGroup, rockSize, rockShape, rockMaterial);
    }
    
    console.log(`🏔️ Created realistic ${variation.category} ${rockShape.type} rock`);
  }
  
  // NEW: Create organic base geometry based on rock shape
  private createOrganicBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        // Great for angular, crystalline rocks
        geometry = new THREE.IcosahedronGeometry(rockSize, 1);
        break;
        
      case 'sphere':
        // Good for weathered, rounded rocks
        geometry = new THREE.SphereGeometry(rockSize, 16, 12);
        break;
        
      case 'dodecahedron':
        // Interesting multi-faceted rocks
        geometry = new THREE.DodecahedronGeometry(rockSize, 1);
        break;
        
      case 'custom':
        // Create custom boulder shape
        geometry = this.createBoulderGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 1);
    }
    
    // Apply shape-specific modifications
    this.applyShapeModifications(geometry, rockShape, rockSize);
    
    return geometry;
  }
  
  // NEW: Create custom boulder geometry for more organic shapes
  private createBoulderGeometry(rockSize: number): THREE.BufferGeometry {
    // Start with sphere and create multiple bulges
    const geometry = new THREE.SphereGeometry(rockSize, 12, 8);
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Create organic bulges and indentations
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Calculate distance from center
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // Create organic variation using multiple noise functions
      const noise1 = Math.sin(x * 3) * Math.cos(y * 3) * Math.sin(z * 3);
      const noise2 = Math.sin(x * 7) * Math.cos(z * 7);
      const noise3 = Math.cos(y * 5) * Math.sin(x * 5);
      
      const organicFactor = 1 + (noise1 * 0.3 + noise2 * 0.2 + noise3 * 0.15);
      
      // Apply organic scaling
      positions[i] = x * organicFactor;
      positions[i + 1] = y * organicFactor;
      positions[i + 2] = z * organicFactor;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  // NEW: Apply shape-specific modifications
  private applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    switch (rockShape.type) {
      case 'spire':
        // Stretch vertically and taper
        for (let i = 0; i < positions.length; i += 3) {
          const y = positions[i + 1];
          positions[i + 1] = y * (1.5 + Math.random() * 0.5); // Stretch up
          
          // Taper based on height
          const taperFactor = Math.max(0.3, 1 - Math.abs(y) / rockSize);
          positions[i] *= taperFactor;
          positions[i + 2] *= taperFactor;
        }
        break;
        
      case 'slab':
        // Flatten and widen
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] *= 0.4; // Flatten
          positions[i] *= 1.3; // Widen X
          positions[i + 2] *= 1.3; // Widen Z
        }
        break;
        
      case 'weathered':
        // Create weathered, smooth surfaces
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];
          
          // Smooth weathering effect
          const weathering = Math.sin(x * 2) * Math.cos(y * 2) * Math.sin(z * 2) * 0.1;
          const factor = 1 + weathering;
          
          positions[i] *= factor;
          positions[i + 1] *= factor;
          positions[i + 2] *= factor;
        }
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Advanced deformation system with multiple passes
  private applyAdvancedDeformation(geometry: THREE.BufferGeometry, intensity: number, rockSize: number): void {
    // Pass 1: Large-scale Perlin-like noise
    this.applyPerlinDeformation(geometry, intensity * 0.6, rockSize * 0.5);
    
    // Pass 2: Medium-scale surface detail
    this.applyDetailDeformation(geometry, intensity * 0.3, rockSize * 0.2);
    
    // Pass 3: Fine surface texture
    this.applyTextureDeformation(geometry, intensity * 0.1, rockSize * 0.05);
    
    // Pass 4: Edge fracturing for angular faces
    this.applyEdgeFracturing(geometry, intensity * 0.4);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Perlin-like noise deformation
  private applyPerlinDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Multi-octave noise for natural randomness
      const noise1 = Math.sin(x / scale) * Math.cos(y / scale) * Math.sin(z / scale);
      const noise2 = Math.sin(x / scale * 2) * Math.cos(z / scale * 2) * 0.5;
      const noise3 = Math.cos(y / scale * 4) * Math.sin(x / scale * 4) * 0.25;
      
      const combinedNoise = noise1 + noise2 + noise3;
      
      // Apply noise in direction of vertex normal
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
  
  // NEW: Detail deformation for surface irregularities
  private applyDetailDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // High-frequency detail noise
      const detailNoise = Math.sin(x / scale * 8) * Math.cos(y / scale * 8) * Math.sin(z / scale * 8);
      
      // Random directional displacement for surface irregularities
      const randomDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      const displacement = detailNoise * intensity;
      positions[i] += randomDir.x * displacement;
      positions[i + 1] += randomDir.y * displacement;
      positions[i + 2] += randomDir.z * displacement;
    }
  }
  
  // NEW: Fine texture deformation
  private applyTextureDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Very fine surface texture
      const textureNoise = Math.sin(x / scale * 20) * Math.cos(y / scale * 20) * Math.sin(z / scale * 20);
      
      // Apply along surface normal
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = textureNoise * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  // NEW: Edge fracturing for angular rock faces
  private applyEdgeFracturing(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Create fracture patterns by identifying edge vertices
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Identify potential fracture points based on position
      const fractureProbability = Math.abs(Math.sin(x * 5) * Math.cos(y * 5) * Math.sin(z * 5));
      
      if (fractureProbability > 0.7) {
        // Create sharp angular displacement
        const fracture = (Math.random() - 0.5) * intensity;
        const direction = Math.random() < 0.33 ? 0 : Math.random() < 0.5 ? 1 : 2;
        
        positions[i + direction] += fracture;
      }
    }
  }
  
  // NEW: Enhanced rock material with weathering and surface details
  private createEnhancedRockMaterial(category: string, rockShape: RockShape, index: number): THREE.MeshStandardMaterial {
    const rockTypes = [
      { color: 0x8B7355, roughness: 0.9, metalness: 0.1, name: 'granite' },
      { color: 0x696969, roughness: 0.85, metalness: 0.05, name: 'basalt' },
      { color: 0xA0A0A0, roughness: 0.8, metalness: 0.15, name: 'limestone' },
      { color: 0x8B7D6B, roughness: 0.95, metalness: 0.0, name: 'sandstone' },
      { color: 0x556B2F, roughness: 0.9, metalness: 0.05, name: 'moss_covered' }
    ];
    
    const rockType = rockTypes[index % rockTypes.length];
    const baseColor = new THREE.Color(rockType.color);
    
    // Apply weathering based on rock shape
    if (rockShape.weatheringLevel > 0.5) {
      // Add weathering tint
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, rockShape.weatheringLevel * 0.3);
    }
    
    // Add moss for weathered rocks
    if (rockShape.type === 'weathered' && Math.random() < 0.4) {
      const mossColor = new THREE.Color(0x2F5F2F);
      baseColor.lerp(mossColor, 0.2);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness,
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(0.8, 0.8) // Enhanced surface detail
    });
    
    return material;
  }
  
  // NEW: Add surface features like cracks, moss, and debris
  private addSurfaceFeatures(
    rockGroup: THREE.Group, 
    rockSize: number, 
    rockShape: RockShape, 
    baseMaterial: THREE.MeshStandardMaterial
  ): void {
    // Add cracks and fissures (30% chance)
    if (Math.random() < 0.3) {
      this.addRockCracks(rockGroup, rockSize);
    }
    
    // Add moss patches for weathered rocks (40% chance)
    if (rockShape.weatheringLevel > 0.6 && Math.random() < 0.4) {
      this.addMossPatches(rockGroup, rockSize);
    }
    
    // Add small debris around medium+ rocks (25% chance)
    if (Math.random() < 0.25) {
      this.addRockDebris(rockGroup, rockSize, baseMaterial);
    }
    
    // Add lichen growth for large rocks (20% chance)
    if (rockSize > 1.0 && Math.random() < 0.2) {
      this.addLichenGrowth(rockGroup, rockSize);
    }
  }
  
  // NEW: Add realistic crack patterns
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
      
      // Position crack on rock surface
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
  
  // NEW: Add moss patches
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
      
      // Position moss on rock surface
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.3) * rockSize * 0.8;
      moss.position.set(
        Math.cos(angle) * rockSize * 0.8,
        height,
        Math.sin(angle) * rockSize * 0.8
      );
      
      moss.scale.set(1, 0.3, 1); // Flatten moss against surface
      rockGroup.add(moss);
    }
  }
  
  // NEW: Add small debris around rocks
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
  
  // NEW: Add lichen growth
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
  
  // UPDATED: Create realistic rock cluster with natural stacking
  private createRealisticRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [2, 3];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Create main supporting rock (largest)
    const mainRockSize = minSize + Math.random() * (maxSize - minSize);
    const mainRock = this.createClusterRock(mainRockSize, variation, 0, true);
    mainRock.position.set(0, mainRockSize * 0.2, 0);
    rockGroup.add(mainRock);
    
    // Create secondary rocks with natural stacking
    for (let i = 1; i < clusterCount; i++) {
      const sizeMultiplier = 0.4 + Math.random() * 0.3; // 40-70% of main size
      const rockSize = mainRockSize * sizeMultiplier;
      const rock = this.createClusterRock(rockSize, variation, i, false);
      
      // Position with natural stacking physics
      const stackingPosition = this.calculateStackingPosition(mainRockSize, rockSize, i, clusterCount);
      rock.position.copy(stackingPosition);
      
      rockGroup.add(rock);
    }
    
    // Add cluster-wide features
    this.addClusterFeatures(rockGroup, maxSize, variation);
    
    console.log(`🏔️ Created realistic ${variation.category} cluster with ${clusterCount} naturally stacked rocks`);
  }
  
  // NEW: Create individual rock in cluster with realistic features
  private createClusterRock(rockSize: number, variation: RockVariation, index: number, isMainRock: boolean): THREE.Object3D {
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create more varied shapes for cluster rocks
    let geometry = this.createOrganicBaseGeometry(rockShape, rockSize);
    
    // Apply enhanced deformation for cluster rocks
    const deformationIntensity = isMainRock ? rockShape.deformationIntensity : rockShape.deformationIntensity * 1.2;
    this.applyAdvancedDeformation(geometry, deformationIntensity, rockSize);
    
    const material = this.createEnhancedRockMaterial(variation.category, rockShape, index);
    const rock = new THREE.Mesh(geometry, material);
    
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
  
  // NEW: Calculate natural stacking position for rocks
  private calculateStackingPosition(mainRockSize: number, rockSize: number, index: number, total: number): THREE.Vector3 {
    const baseRadius = mainRockSize * 0.8;
    
    if (index === 1) {
      // First secondary rock: lean against main rock
      const angle = Math.random() * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * baseRadius,
        rockSize * 0.3 + Math.random() * mainRockSize * 0.2,
        Math.sin(angle) * baseRadius
      );
    } else {
      // Additional rocks: scatter with natural physics
      const angle = Math.random() * Math.PI * 2;
      const distance = baseRadius * (0.8 + Math.random() * 0.4);
      return new THREE.Vector3(
        Math.cos(angle) * distance,
        rockSize * 0.2,
        Math.sin(angle) * distance
      );
    }
  }
  
  // NEW: Add cluster-wide features
  private addClusterFeatures(rockGroup: THREE.Group, maxSize: number, variation: RockVariation): void {
    // Add sediment accumulation between rocks (40% chance)
    if (Math.random() < 0.4) {
      this.addSedimentAccumulation(rockGroup, maxSize);
    }
    
    // Add vegetation growing in cluster cracks (30% chance)
    if (Math.random() < 0.3) {
      this.addClusterVegetation(rockGroup, maxSize);
    }
    
    // Add weathering stains for large clusters (50% chance for massive)
    if (variation.category === 'massive' && Math.random() < 0.5) {
      this.addWeatheringStains(rockGroup, maxSize);
    }
  }
  
  // NEW: Add sediment accumulation
  private addSedimentAccumulation(rockGroup: THREE.Group, maxSize: number): void {
    const sedimentCount = 4 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < sedimentCount; i++) {
      const sediment = new THREE.Mesh(
        new THREE.SphereGeometry(maxSize * (0.1 + Math.random() * 0.1), 6, 4),
        new THREE.MeshStandardMaterial({
          color: 0x8B7D6B,
          roughness: 0.95,
          metalness: 0.0
        })
      );
      
      sediment.position.set(
        (Math.random() - 0.5) * maxSize * 1.5,
        0.05,
        (Math.random() - 0.5) * maxSize * 1.5
      );
      
      sediment.scale.set(1, 0.3, 1); // Flatten sediment
      rockGroup.add(sediment);
    }
  }
  
  // NEW: Add cluster vegetation
  private addClusterVegetation(rockGroup: THREE.Group, maxSize: number): void {
    const plantCount = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < plantCount; i++) {
      const plant = new THREE.Mesh(
        new THREE.ConeGeometry(0.05 + Math.random() * 0.05, 0.3 + Math.random() * 0.4, 6),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.3, 0.7, 0.4 + Math.random() * 0.2),
          roughness: 0.9
        })
      );
      
      plant.position.set(
        (Math.random() - 0.5) * maxSize,
        0.15,
        (Math.random() - 0.5) * maxSize
      );
      
      rockGroup.add(plant);
    }
  }
  
  // NEW: Add weathering stains
  private addWeatheringStains(rockGroup: THREE.Group, maxSize: number): void {
    const stainCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < stainCount; i++) {
      const stain = new THREE.Mesh(
        new THREE.PlaneGeometry(maxSize * 0.3, maxSize * 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x2A2A1A,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      stain.position.set(
        Math.cos(angle) * maxSize * 0.6,
        Math.random() * maxSize * 0.5,
        Math.sin(angle) * maxSize * 0.6
      );
      
      stain.rotation.y = angle + Math.PI / 2;
      rockGroup.add(stain);
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
            console.log(`🔧 Callback registered collision for ${variation.category} rock at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
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
    
    // Pick a random model from the category
    const modelIndex = Math.floor(Math.random() * categoryModels.length);
    const model = categoryModels[modelIndex].clone();
    
    // Randomize rotation and scale
    model.rotation.y = Math.random() * Math.PI * 2;
    
    // Scale variation based on category
    const scaleVariation = variation.category === 'tiny' ? 0.2 : 
                          variation.category === 'small' ? 0.3 : 
                          variation.category === 'medium' ? 0.4 : 0.3;
    const scale = 1.0 + (Math.random() - 0.5) * scaleVariation;
    model.scale.set(scale, scale, scale);
    
    // Set position
    model.position.copy(position);
    
    // Add some variation to Y position for natural embedding
    if (variation.category !== 'tiny') {
      model.position.y -= Math.random() * 0.2;
    }
    
    return model;
  }
  
  // NEW: Get starting index for rock category in models array
  private getCategoryStartIndex(category: string): number {
    switch (category) {
      case 'tiny': return 0;
      case 'small': return 4;
      case 'medium': return 8;
      case 'large': return 11;
      case 'massive': return 14;
      default: return 8;
    }
  }
  
  // NEW: Get rock models for specific category
  private getCategoryModels(category: string): THREE.Object3D[] {
    const startIndex = this.getCategoryStartIndex(category);
    let count: number;
    
    switch (category) {
      case 'tiny':
      case 'small':
        count = 4;
        break;
      case 'medium':
      case 'large':
      case 'massive':
        count = 3;
        break;
      default:
        count = 3;
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
}
