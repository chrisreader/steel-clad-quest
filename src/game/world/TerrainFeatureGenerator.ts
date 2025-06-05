import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TextureGenerator } from '../utils';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

// NEW: Rock variation system with realistic size distribution
export interface RockVariation {
  name: string;
  probability: number;
  sizeRange: { min: number; max: number };
  clusterSize?: { min: number; max: number }; // For large/massive rocks
  isFormation: boolean; // True for large/massive rocks that form clusters
}

// NEW: Rock shape types with specific characteristics
export interface RockShape {
  name: 'boulder' | 'spire' | 'slab' | 'angular' | 'weathered' | 'flattened' | 'jagged' | 'cluster';
  baseGeometry: () => THREE.BufferGeometry;
  deformationIntensity: number;
  weatheringLevel: number;
  modifier: (geometry: THREE.BufferGeometry, size: number) => void;
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeModels: THREE.Object3D[] = [];
  private rockModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];
  
  // Track spawned objects by region for cleanup
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Tavern exclusion zone
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15; // Keep clear area around tavern
  
  // Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  // NEW: Rock variation definitions with realistic distribution
  private rockVariations: RockVariation[] = [
    { name: 'tiny', probability: 0.70, sizeRange: { min: 0.05, max: 0.15 }, isFormation: false },
    { name: 'small', probability: 0.20, sizeRange: { min: 0.15, max: 0.4 }, isFormation: false },
    { name: 'medium', probability: 0.08, sizeRange: { min: 0.4, max: 1.2 }, isFormation: false },
    { name: 'large', probability: 0.008, sizeRange: { min: 2.0, max: 4.0 }, clusterSize: { min: 3, max: 5 }, isFormation: true },
    { name: 'massive', probability: 0.001, sizeRange: { min: 4.0, max: 8.0 }, clusterSize: { min: 4, max: 7 }, isFormation: true }
  ];
  
  // NEW: Rock shapes with specific modifiers
  private rockShapes: RockShape[] = [
    {
      name: 'boulder',
      baseGeometry: () => new THREE.SphereGeometry(1, 12, 8),
      deformationIntensity: 0.3,
      weatheringLevel: 0.4,
      modifier: (geometry, size) => this.applyBoulderModifier(geometry, size)
    },
    {
      name: 'spire',
      baseGeometry: () => new THREE.ConeGeometry(1, 2.5, 8),
      deformationIntensity: 0.2,
      weatheringLevel: 0.2,
      modifier: (geometry, size) => this.applySpireModifier(geometry, size)
    },
    {
      name: 'slab',
      baseGeometry: () => new THREE.BoxGeometry(2, 0.5, 1.5),
      deformationIntensity: 0.1,
      weatheringLevel: 0.6,
      modifier: (geometry, size) => this.applySlabModifier(geometry, size)
    },
    {
      name: 'angular',
      baseGeometry: () => new THREE.OctahedronGeometry(1, 1),
      deformationIntensity: 0.1,
      weatheringLevel: 0.1,
      modifier: (geometry, size) => this.applyAngularModifier(geometry, size)
    },
    {
      name: 'weathered',
      baseGeometry: () => new THREE.DodecahedronGeometry(1, 1),
      deformationIntensity: 0.4,
      weatheringLevel: 0.8,
      modifier: (geometry, size) => this.applyWeatheredModifier(geometry, size)
    },
    {
      name: 'flattened',
      baseGeometry: () => new THREE.SphereGeometry(1, 10, 6),
      deformationIntensity: 0.2,
      weatheringLevel: 0.5,
      modifier: (geometry, size) => this.applyFlattenedModifier(geometry, size)
    },
    {
      name: 'jagged',
      baseGeometry: () => new THREE.IcosahedronGeometry(1, 1),
      deformationIntensity: 0.5,
      weatheringLevel: 0.3,
      modifier: (geometry, size) => this.applyJaggedModifier(geometry, size)
    },
    {
      name: 'cluster',
      baseGeometry: () => new THREE.SphereGeometry(1, 8, 6),
      deformationIntensity: 0.6,
      weatheringLevel: 0.4,
      modifier: (geometry, size) => this.applyClusterModifier(geometry, size)
    }
  ];
  
  // NEW: Track large formations for minimum distance constraints
  private largeFormations: THREE.Vector3[] = [];
  private minimumFormationDistance: number = 150;
  
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
    
    // NEW: Generate sophisticated rock models using the new system
    this.generateAdvancedRockModels();
    
    // IMPROVED Bush models (4 variations with organic shapes and better materials)
    for (let i = 0; i < 4; i++) {
      const bushGroup = new THREE.Group();
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
  
  // NEW: Generate advanced rock models using the sophisticated system
  private generateAdvancedRockModels(): void {
    console.log('🪨 Generating advanced rock models with 8 distinct shapes...');
    
    // Generate models for each variation and shape combination
    for (const variation of this.rockVariations) {
      for (const shape of this.rockShapes) {
        // Create 2-3 models per combination for variety
        const modelCount = variation.isFormation ? 3 : 2;
        
        for (let i = 0; i < modelCount; i++) {
          const rockSize = variation.sizeRange.min + 
            Math.random() * (variation.sizeRange.max - variation.sizeRange.min);
          
          const rockModel = this.createAdvancedRock(shape, rockSize, variation);
          this.rockModels.push(rockModel);
        }
      }
    }
    
    console.log(`🪨 Generated ${this.rockModels.length} advanced rock models`);
  }
  
  // NEW: Create advanced rock with sophisticated shaping
  private createAdvancedRock(shape: RockShape, size: number, variation: RockVariation): THREE.Group {
    const rockGroup = new THREE.Group();
    
    // Create base geometry
    const baseGeometry = shape.baseGeometry();
    baseGeometry.scale(size, size, size);
    
    // Apply shape-specific modifier
    shape.modifier(baseGeometry, size);
    
    // Apply organic deformation
    this.applyOrganicDeformation(baseGeometry, shape.deformationIntensity, size);
    
    // Apply intensive smoothing
    this.applyIntensiveSmoothing(baseGeometry);
    
    // Create material with weathering effects
    const material = this.createWeatheredRockMaterial(shape, variation);
    
    // Create main rock mesh
    const rockMesh = new THREE.Mesh(baseGeometry, material);
    
    // Natural embedding - rocks sink into terrain slightly
    rockMesh.position.y = -0.2;
    
    // Add scale variation based on size category
    const scaleVariation = variation.name === 'tiny' || variation.name === 'small' ? 
      0.7 + Math.random() * 0.6 : // ±20-30% variation for tiny/small
      0.7 + Math.random() * 0.6;  // ±30% variation for others
    rockMesh.scale.multiplyScalar(scaleVariation);
    
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    rockGroup.add(rockMesh);
    
    // Add debris field for larger rocks (25% chance)
    if (variation.isFormation && Math.random() < 0.25) {
      this.addDebrisField(rockGroup, size);
    }
    
    return rockGroup;
  }
  
  // NEW: Shape modifier implementations
  private applyBoulderModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Natural boulder shape with irregular bulges
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const factor = 0.8 + Math.random() * 0.4;
      positions[i] *= factor;
      positions[i + 1] *= factor * 0.9; // Slightly flattened
      positions[i + 2] *= factor;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applySpireModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Vertical elongation with tapering
    geometry.scale(0.7, 1.8, 0.7);
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const taper = Math.max(0.3, 1 - Math.abs(y) * 0.3);
      positions[i] *= taper;
      positions[i + 2] *= taper;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applySlabModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Horizontal expansion with vertical compression
    geometry.scale(1.4, 0.3, 1.2);
    this.addLayeredStructure(geometry);
  }
  
  private applyAngularModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Sharp angular faceting
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      // Quantize positions to create sharp edges
      positions[i] = Math.round(positions[i] * 3) / 3;
      positions[i + 1] = Math.round(positions[i + 1] * 3) / 3;
      positions[i + 2] = Math.round(positions[i + 2] * 3) / 3;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyWeatheredModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Smooth weathering patterns
    this.applySmoothErosion(geometry, 0.4);
    this.addWeatheringGrooves(geometry);
  }
  
  private applyFlattenedModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Horizontal compression
    geometry.scale(1.3, 0.4, 1.3);
  }
  
  private applyJaggedModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Add sharp protrusions
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      if (Math.random() < 0.3) {
        const spike = 1 + Math.random() * 0.5;
        positions[i] *= spike;
        positions[i + 1] *= spike;
        positions[i + 2] *= spike;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyClusterModifier(geometry: THREE.BufferGeometry, size: number): void {
    // Multiple connected bulges
    this.addConnectedBulges(geometry, 3 + Math.floor(Math.random() * 3));
  }
  
  // NEW: Advanced geometry processing methods
  private applyOrganicDeformation(geometry: THREE.BufferGeometry, intensity: number, size: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];
      
      // Multi-octave noise for organic variation
      const noise1 = this.simplex3D(x * 3, y * 3, z * 3) * 0.4;
      const noise2 = this.simplex3D(x * 7, y * 7, z * 7) * 0.2;
      const noise3 = this.simplex3D(x * 15, y * 15, z * 15) * 0.1;
      
      const totalNoise = (noise1 + noise2 + noise3) * intensity;
      
      positions[idx] += x * totalNoise;
      positions[idx + 1] += y * totalNoise;
      positions[idx + 2] += z * totalNoise;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyIntensiveSmoothing(geometry: THREE.BufferGeometry): void {
    // Multiple passes of smoothing to eliminate visual artifacts
    for (let pass = 0; pass < 3; pass++) {
      this.smoothGeometry(geometry, 0.3);
    }
  }
  
  private smoothGeometry(geometry: THREE.BufferGeometry, factor: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const smoothedPositions = new Float32Array(positions.length);
    
    // Copy original positions
    for (let i = 0; i < positions.length; i++) {
      smoothedPositions[i] = positions[i];
    }
    
    // Apply smoothing
    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      let avgX = 0, avgY = 0, avgZ = 0;
      let neighborCount = 0;
      
      // Find neighboring vertices within threshold
      for (let j = 0; j < vertexCount; j++) {
        if (i === j) continue;
        
        const jIdx = j * 3;
        const dist = Math.sqrt(
          Math.pow(positions[idx] - positions[jIdx], 2) +
          Math.pow(positions[idx + 1] - positions[jIdx + 1], 2) +
          Math.pow(positions[idx + 2] - positions[jIdx + 2], 2)
        );
        
        if (dist < 0.3) {
          avgX += positions[jIdx];
          avgY += positions[jIdx + 1];
          avgZ += positions[jIdx + 2];
          neighborCount++;
        }
      }
      
      if (neighborCount > 0) {
        avgX /= neighborCount;
        avgY /= neighborCount;
        avgZ /= neighborCount;
        
        smoothedPositions[idx] = positions[idx] * (1 - factor) + avgX * factor;
        smoothedPositions[idx + 1] = positions[idx + 1] * (1 - factor) + avgY * factor;
        smoothedPositions[idx + 2] = positions[idx + 2] * (1 - factor) + avgZ * factor;
      }
    }
    
    // Update geometry
    for (let i = 0; i < positions.length; i++) {
      positions[i] = smoothedPositions[i];
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Create weathered rock materials
  private createWeatheredRockMaterial(shape: RockShape, variation: RockVariation): THREE.MeshStandardMaterial {
    const baseColors = [
      new THREE.Color(0x8B7355), // Brown granite
      new THREE.Color(0x696969), // Dark gray
      new THREE.Color(0xA0A0A0), // Light gray
      new THREE.Color(0x8B7D6B)  // Sandstone
    ];
    
    let color = baseColors[Math.floor(Math.random() * baseColors.length)].clone();
    
    // Apply weathering effects
    if (shape.weatheringLevel > 0.5) {
      // High weathering - add dark brown blend
      const weatheringTint = new THREE.Color(0x4A3728);
      color.lerp(weatheringTint, shape.weatheringLevel * 0.3);
    }
    
    // Weathered rock type gets moss coloring (40% chance)
    if (shape.name === 'weathered' && Math.random() < 0.4) {
      const mossColor = new THREE.Color(0x2F4F2F);
      color.lerp(mossColor, 0.2);
    }
    
    return new THREE.MeshStandardMaterial({
      color: color,
      map: TextureGenerator.createStoneTexture(),
      roughness: 0.7 + shape.weatheringLevel * 0.3,
      metalness: 0.05,
      normalMap: this.generateRockNormalMap()
    });
  }
  
  // NEW: Generate rock normal maps for surface detail
  private generateRockNormalMap(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    
    const imageData = context.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        
        // Generate rock surface normals
        const noise = this.simplex2D(x * 0.02, y * 0.02) * 0.5 + 0.5;
        const normalX = (noise - 0.5) * 255 + 128;
        const normalY = 128; // Neutral Y
        const normalZ = 255; // Point up
        
        data[i] = normalX;     // R = normal X
        data[i + 1] = normalY; // G = normal Y
        data[i + 2] = normalZ; // B = normal Z
        data[i + 3] = 255;     // A = alpha
      }
    }
    
    context.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
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
    
    // Ring-specific feature generation
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
  
  // Generate evenly distributed features (for ring 0)
  private generateEvenlyDistributedFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Generate trees (10-15)
    this.spawnRandomFeatures(region, 'forest', 12, features);
    
    // Generate rocks (5-8) - NOW WITH ADVANCED SYSTEM
    this.spawnRandomFeatures(region, 'rocks', 6, features);
    
    // Generate bushes (15-20)
    this.spawnRandomFeatures(region, 'bushes', 18, features);
  }
  
  // Generate clustered features (for ring 1)
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
    
    // Add some scattered individual features outside clusters
    this.spawnRandomFeatures(region, 'forest', 5, features);
    this.spawnRandomFeatures(region, 'rocks', 8, features); // ADVANCED ROCKS
    this.spawnRandomFeatures(region, 'bushes', 10, features);
  }
  
  // Generate sparse features (for ring 2)
  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Fewer trees, more rocks
    this.spawnRandomFeatures(region, 'forest', 8, features);
    this.spawnRandomFeatures(region, 'rocks', 15, features); // ADVANCED ROCKS
    this.spawnRandomFeatures(region, 'bushes', 5, features);
  }
  
  // Generate wasteland features (for ring 3)
  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Mostly rocks, very few plants
    this.spawnRandomFeatures(region, 'forest', 2, features);
    this.spawnRandomFeatures(region, 'rocks', 20, features); // ADVANCED ROCKS
    this.spawnRandomFeatures(region, 'bushes', 3, features);
  }
  
  private getRandomClusterType(): 'forest' | 'rocks' | 'bushes' | 'mixed' {
    const types = ['forest', 'rocks', 'bushes', 'mixed'];
    const weights = [0.5, 0.2, 0.2, 0.1]; // Forest clusters most common
    
    // Weighted random selection
    const totalWeight = weights.reduce((a, b) => a + b);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < types.length; i++) {
      if (random < weights[i]) {
        return types[i] as any;
      }
      random -= weights[i];
    }
    
    return 'forest';
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
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features); // ADVANCED ROCKS
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
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features); // ADVANCED ROCKS
        
        // Bushes
        featureCount = Math.floor(clusterArea * 0.015 * cluster.density);
        this.spawnClusteredFeatures(region, 'bushes', featureCount, cluster, features);
        break;
    }
  }
  
  // NEW: Advanced rock spawning with realistic clustering
  private spawnRandomFeatures(
    region: RegionCoordinates,
    type: 'forest' | 'rocks' | 'bushes',
    count: number,
    features: THREE.Object3D[]
  ): void {
    if (type !== 'rocks') {
      // Keep existing logic for forest and bushes
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
      return;
    }
    
    // NEW: Advanced rock spawning system
    console.log(`🪨 Spawning ${count} advanced rocks for region...`);
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      if (!this.isPositionNearTavern(position)) {
        // Select rock variation based on probability
        const variation = this.selectRockVariation();
        
        if (variation.isFormation) {
          // Check minimum distance from other large formations
          if (this.canPlaceLargeFormation(position)) {
            console.log(`🏔️ Creating ${variation.name} rock formation at (${position.x.toFixed(2)}, ${position.z.toFixed(2)})`);
            const cluster = this.createRealisticRockCluster(position, variation);
            if (cluster) {
              features.push(cluster);
              this.scene.add(cluster);
              this.largeFormations.push(position);
              
              if (this.collisionRegistrationCallback) {
                this.collisionRegistrationCallback(cluster);
                console.log(`🔧 Callback registered collision for ${variation.name} formation`);
              }
            }
          }
        } else {
          // Individual rock placement
          const rock = this.spawnAdvancedRock(variation, position);
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
  }
  
  // NEW: Select rock variation based on probability weights
  private selectRockVariation(): RockVariation {
    const random = Math.random();
    let cumulative = 0;
    
    for (const variation of this.rockVariations) {
      cumulative += variation.probability;
      if (random <= cumulative) {
        return variation;
      }
    }
    
    return this.rockVariations[0]; // Fallback to tiny
  }
  
  // NEW: Check if large formation can be placed
  private canPlaceLargeFormation(position: THREE.Vector3): boolean {
    for (const existingFormation of this.largeFormations) {
      if (position.distanceTo(existingFormation) < this.minimumFormationDistance) {
        return false;
      }
    }
    return true;
  }
  
  // NEW: Create realistic rock cluster with 3-tier hierarchy
  private createRealisticRockCluster(position: THREE.Vector3, variation: RockVariation): THREE.Group | null {
    const clusterGroup = new THREE.Group();
    const clusterSize = variation.clusterSize!;
    const totalRocks = clusterSize.min + Math.floor(Math.random() * (clusterSize.max - clusterSize.min + 1));
    
    console.log(`🪨 Creating ${variation.name} cluster with ${totalRocks} rocks using 3-tier hierarchy`);
    
    // Foundation rocks (40% of cluster) - largest, most stable
    const foundationCount = Math.max(1, Math.floor(totalRocks * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = variation.sizeRange.min + 
        Math.random() * (variation.sizeRange.max - variation.sizeRange.min);
      const scaledSize = rockSize * (0.8 + Math.random() * 0.2); // 80-100% of max size
      
      // Prefer stable shapes for foundation
      const stableShapes = this.rockShapes.filter(s => 
        s.name === 'boulder' || s.name === 'weathered' || s.name === 'slab');
      const shape = stableShapes[Math.floor(Math.random() * stableShapes.length)];
      
      const rock = this.createAdvancedRock(shape, scaledSize, variation);
      
      // Position foundation rocks
      if (i === 0) {
        // Main foundation rock at cluster center
        rock.position.copy(position);
      } else {
        // Secondary foundation rocks nearby
        const angle = (i / foundationCount) * Math.PI * 2;
        const distance = scaledSize + Math.random() * scaledSize;
        rock.position.set(
          position.x + Math.cos(angle) * distance,
          position.y,
          position.z + Math.sin(angle) * distance
        );
      }
      
      // Natural embedding
      rock.position.y -= 0.2;
      
      foundationRocks.push(rock);
      clusterGroup.add(rock);
    }
    
    // Support rocks (40% of cluster) - medium-sized, positioned against foundation
    const supportCount = Math.floor(totalRocks * 0.4);
    for (let i = 0; i < supportCount; i++) {
      const rockSize = variation.sizeRange.min + 
        Math.random() * (variation.sizeRange.max - variation.sizeRange.min);
      const scaledSize = rockSize * (0.5 + Math.random() * 0.3); // 50-80% of max size
      
      const shape = this.rockShapes[Math.floor(Math.random() * this.rockShapes.length)];
      const rock = this.createAdvancedRock(shape, scaledSize, variation);
      
      // Position against foundation rocks with realistic contact physics
      const foundationRock = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
      const contactPosition = this.calculateStackingPosition(foundationRock, scaledSize, i, supportCount);
      rock.position.copy(contactPosition);
      
      clusterGroup.add(rock);
    }
    
    // Accent rocks (20% of cluster) - smallest, can be on top or in gaps
    const accentCount = Math.max(1, totalRocks - foundationCount - supportCount);
    for (let i = 0; i < accentCount; i++) {
      const rockSize = variation.sizeRange.min + 
        Math.random() * (variation.sizeRange.max - variation.sizeRange.min);
      const scaledSize = rockSize * (0.2 + Math.random() * 0.3); // 20-50% of max size
      
      const shape = this.rockShapes[Math.floor(Math.random() * this.rockShapes.length)];
      const rock = this.createAdvancedRock(shape, scaledSize, variation);
      
      // Position on top or in gaps
      const baseRock = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
      rock.position.set(
        baseRock.position.x + (Math.random() - 0.5) * scaledSize * 2,
        baseRock.position.y + scaledSize,
        baseRock.position.z + (Math.random() - 0.5) * scaledSize * 2
      );
      
      clusterGroup.add(rock);
    }
    
    // Add environmental details for large formations
    this.addEnvironmentalDetails(clusterGroup, variation, position);
    
    return clusterGroup;
  }
  
  // NEW: Calculate realistic stacking position
  private calculateStackingPosition(foundationRock: THREE.Object3D, rockSize: number, index: number, total: number): THREE.Vector3 {
    const foundationBox = new THREE.Box3().setFromObject(foundationRock);
    const foundationSize = foundationBox.getSize(new THREE.Vector3()).length() / 2;
    
    if (index === 0) {
      // First support rock leans against main rock at base radius
      const angle = Math.random() * Math.PI * 2;
      const distance = foundationSize * 0.8;
      return new THREE.Vector3(
        foundationRock.position.x + Math.cos(angle) * distance,
        foundationRock.position.y + rockSize * 0.3,
        foundationRock.position.z + Math.sin(angle) * distance
      );
    } else {
      // Additional rocks scattered naturally with physics-based positioning
      const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5;
      const distance = foundationSize + rockSize + Math.random() * rockSize;
      return new THREE.Vector3(
        foundationRock.position.x + Math.cos(angle) * distance,
        foundationRock.position.y + rockSize * (0.2 + Math.random() * 0.3),
        foundationRock.position.z + Math.sin(angle) * distance
      );
    }
  }
  
  // NEW: Add environmental details to formations
  private addEnvironmentalDetails(clusterGroup: THREE.Group, variation: RockVariation, position: THREE.Vector3): void {
    // Sediment accumulation (6-14 particles in low spots)
    const sedimentCount = 6 + Math.floor(Math.random() * 9);
    for (let i = 0; i < sedimentCount; i++) {
      const sediment = this.createSedimentParticle();
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * variation.sizeRange.max;
      sediment.position.set(
        position.x + Math.cos(angle) * distance,
        position.y - 0.1,
        position.z + Math.sin(angle) * distance
      );
      clusterGroup.add(sediment);
    }
    
    // Vegetation growth (2-7 plants in sheltered areas, north side preference)
    const vegCount = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < vegCount; i++) {
      const vegetation = this.createMiniVegetation();
      // Prefer north side (negative Z direction)
      const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI; // -π to 0 radians
      const distance = variation.sizeRange.min + Math.random() * variation.sizeRange.max * 0.5;
      vegetation.position.set(
        position.x + Math.cos(angle) * distance,
        position.y,
        position.z + Math.sin(angle) * distance
      );
      clusterGroup.add(vegetation);
    }
    
    // Debris field (8-20 small fragments around cluster base)
    const debrisCount = 8 + Math.floor(Math.random() * 13);
    for (let i = 0; i < debrisCount; i++) {
      const debris = this.createDebrisFragment();
      const angle = Math.random() * Math.PI * 2;
      const distance = variation.sizeRange.max * (0.5 + Math.random() * 1.5);
      debris.position.set(
        position.x + Math.cos(angle) * distance,
        position.y - 0.05,
        position.z + Math.sin(angle) * distance
      );
      clusterGroup.add(debris);
    }
  }
  
  // NEW: Spawn individual advanced rock
  private spawnAdvancedRock(variation: RockVariation, position: THREE.Vector3): THREE.Object3D | null {
    const rockSize = variation.sizeRange.min + 
      Math.random() * (variation.sizeRange.max - variation.sizeRange.min);
    
    const shape = this.rockShapes[Math.floor(Math.random() * this.rockShapes.length)];
    const rock = this.createAdvancedRock(shape, rockSize, variation);
    
    rock.position.copy(position);
    rock.rotation.y = Math.random() * Math.PI * 2;
    
    return rock;
  }
  
  // NEW: Environmental detail creation methods
  private createSedimentParticle(): THREE.Mesh {
    const size = 0.02 + Math.random() * 0.03;
    const geometry = new THREE.SphereGeometry(size, 6, 4);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x8B7D6B),
      roughness: 0.9
    });
    return new THREE.Mesh(geometry, material);
  }
  
  private createMiniVegetation(): THREE.Mesh {
    const height = 0.1 + Math.random() * 0.2;
    const geometry = new THREE.ConeGeometry(0.03, height, 4);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, 0.4)
    });
    const vegetation = new THREE.Mesh(geometry, material);
    vegetation.position.y = height / 2;
    return vegetation;
  }
  
  private createDebrisFragment(): THREE.Mesh {
    const size = 0.01 + Math.random() * 0.02;
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x696969),
      roughness: 0.8
    });
    return new THREE.Mesh(geometry, material);
  }
  
  private addDebrisField(rockGroup: THREE.Group, size: number): void {
    const debrisCount = 5 + Math.floor(Math.random() * 10);
    for (let i = 0; i < debrisCount; i++) {
      const debris = this.createDebrisFragment();
      const angle = Math.random() * Math.PI * 2;
      const distance = size + Math.random() * size;
      debris.position.set(
        Math.cos(angle) * distance,
        -0.05,
        Math.sin(angle) * distance
      );
      rockGroup.add(debris);
    }
  }
  
  // NEW: Advanced geometry helper methods
  private addLayeredStructure(geometry: THREE.BufferGeometry): void {
    // Add horizontal layering for sedimentary rock appearance
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const layer = Math.floor(y * 5) / 5; // Create 5 layers
      positions[i + 1] = layer + Math.sin(y * 10) * 0.02; // Add subtle wave pattern
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applySmoothErosion(geometry: THREE.BufferGeometry, intensity: number): void {
    // Apply multiple passes of erosion-like smoothing
    for (let pass = 0; pass < 2; pass++) {
      this.smoothGeometry(geometry, intensity);
    }
  }
  
  private addWeatheringGrooves(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Add vertical weathering grooves
      if (Math.abs(this.simplex3D(x * 10, y * 2, z * 10)) > 0.7) {
        positions[i + 1] -= 0.05; // Create groove
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private addConnectedBulges(geometry: THREE.BufferGeometry, count: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const bulgePositions: THREE.Vector3[] = [];
    
    // Create random bulge centers
    for (let i = 0; i < count; i++) {
      bulgePositions.push(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ));
    }
    
    // Apply bulges to geometry
    for (let i = 0; i < positions.length; i += 3) {
      const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      
      for (const bulgePos of bulgePositions) {
        const distance = vertex.distanceTo(bulgePos);
        if (distance < 0.8) {
          const influence = (0.8 - distance) / 0.8;
          const direction = vertex.clone().sub(bulgePos).normalize();
          direction.multiplyScalar(influence * 0.3);
          vertex.add(direction);
        }
      }
      
      positions[i] = vertex.x;
      positions[i + 1] = vertex.y;
      positions[i + 2] = vertex.z;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Noise functions for organic variation
  private simplex2D(x: number, y: number): number {
    // Simple 2D simplex noise implementation
    return Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
  }
  
  private simplex3D(x: number, y: number, z: number): number {
    // Simple 3D simplex noise implementation
    return (Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(z * 0.1)) * 0.5;
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
          
          // Register for collision immediately after spawning
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
        modelArray = this.rockModels; // NOW USES ADVANCED ROCK MODELS
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
    this.largeFormations.length = 0;
  }
}
