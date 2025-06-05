import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TextureGenerator } from '../utils';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

// ENHANCED: Rock variations with shape personality system
export interface RockVariation {
  category: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  sizeRange: [number, number];
  weight: number;
  isCluster: boolean;
  clusterSize?: [number, number];
  shapePersonality: 'character' | 'basic'; // Controls deformation intensity
}

// ENHANCED: Rock shape types with specific characteristics
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
  
  // UPDATED: Enhanced rock variations with shape personality system
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 50, isCluster: false, shapePersonality: 'character' }, // Reduced from 70
    { category: 'small', sizeRange: [0.15, 0.4], weight: 25, isCluster: false, shapePersonality: 'character' }, // Reduced from 20
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 15, isCluster: false, shapePersonality: 'basic' }, // Increased from 8
    { category: 'large', sizeRange: [2.0, 4.0], weight: 8, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' }, // Increased from 0.8
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 2, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' } // Increased from 0.1
  ];
  
  // ENHANCED: Expanded rock shapes with specific modifiers
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.3, weatheringLevel: 0.6, shapeModifier: 'erode' },
    { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.4, weatheringLevel: 0.3, shapeModifier: 'stretch' },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.8, shapeModifier: 'flatten' },
    { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.5, weatheringLevel: 0.4, shapeModifier: 'fracture' },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.6, weatheringLevel: 0.9, shapeModifier: 'erode' },
    { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.3, weatheringLevel: 0.7, shapeModifier: 'flatten' },
    { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.7, weatheringLevel: 0.5, shapeModifier: 'fracture' },
    { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.4, weatheringLevel: 0.6, shapeModifier: 'none' }
  ];
  
  // Track spawned objects by region for cleanup
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Track large rock formations to maintain distance
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 150;
  
  // NEW: Minimum distance between individual rocks
  private minimumRockDistance: number = 8; // Prevents clustering
  private spawnedRockPositions: THREE.Vector3[] = [];
  
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
    
    // ENHANCED: Create realistic rock variations with shape personality
    this.createRealisticRockVariations();
    
    // Bush models (4 variations with organic shapes and better materials)
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
  
  // ENHANCED: Create realistic rock variations with shape personality system
  private createRealisticRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createRealisticRockCluster(rockGroup, variation, i);
        } else {
          this.createPersonalityRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} realistic rock variations with shape personality`);
  }
  
  // ENHANCED: Create rocks with shape personality system
  private createPersonalityRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create enhanced geometry based on personality
    let rockGeometry = this.createEnhancedGeometry(rockShape, rockSize, variation.shapePersonality);
    
    // Apply personality-based deformation
    this.applyPersonalityDeformation(rockGeometry, rockShape, rockSize, variation.shapePersonality);
    
    // Validate and smooth geometry
    this.validateAndSmoothGeometry(rockGeometry);
    
    const rockMaterial = this.createRealisticRockMaterial(variation.category, rockShape, index);
    
    const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
    
    // Realistic rotation based on personality
    if (variation.shapePersonality === 'character') {
      mainRock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
    } else {
      // Basic rocks have more stable orientations
      mainRock.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
    }
    
    // Slight embedding into terrain
    mainRock.position.y = rockSize * 0.05;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    
    rockGroup.add(mainRock);
    
    console.log(`🏔️ Created ${variation.shapePersonality} ${variation.category} ${rockShape.type} rock`);
  }
  
  // ENHANCED: Create enhanced geometry based on personality
  private createEnhancedGeometry(rockShape: RockShape, rockSize: number, personality: 'character' | 'basic'): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    // Determine detail level based on personality
    const detailLevel = personality === 'character' ? 2 : 1;
    const segments = personality === 'character' ? 24 : 16;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(rockSize, detailLevel);
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(rockSize, segments, Math.floor(segments * 0.75));
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, detailLevel);
        break;
        
      case 'custom':
        geometry = this.createOrganicBoulderGeometry(rockSize, personality);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, detailLevel);
    }
    
    return geometry;
  }
  
  // ENHANCED: Create organic boulder with personality-based complexity
  private createOrganicBoulderGeometry(rockSize: number, personality: 'character' | 'basic'): THREE.BufferGeometry {
    const segments = personality === 'character' ? 24 : 16;
    const geometry = new THREE.SphereGeometry(rockSize, segments, Math.floor(segments * 0.75));
    const positions = geometry.attributes.position.array as Float32Array;
    
    const noiseOctaves = personality === 'character' ? 3 : 2;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      if (distance > 0) {
        let totalNoise = 0;
        let amplitude = 0.2;
        let frequency = 1;
        
        // Multi-octave noise for personality
        for (let octave = 0; octave < noiseOctaves; octave++) {
          const noise = Math.sin(x * frequency) * Math.cos(y * frequency) * Math.sin(z * frequency);
          totalNoise += noise * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        const organicFactor = 1 + totalNoise;
        
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
  
  // ENHANCED: Apply personality-based deformation
  private applyPersonalityDeformation(
    geometry: THREE.BufferGeometry, 
    rockShape: RockShape, 
    rockSize: number, 
    personality: 'character' | 'basic'
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const intensity = personality === 'character' ? rockShape.deformationIntensity : rockShape.deformationIntensity * 0.5;
    
    switch (rockShape.shapeModifier) {
      case 'stretch':
        this.applyStretchDeformation(positions, rockSize, intensity);
        break;
        
      case 'flatten':
        this.applyFlattenDeformation(positions, rockSize, intensity);
        break;
        
      case 'fracture':
        if (personality === 'character') {
          this.applyFractureDeformation(positions, rockSize, intensity);
        }
        break;
        
      case 'erode':
        this.applyErosionDeformation(positions, rockSize, intensity, personality);
        break;
        
      default:
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // ENHANCED: Stretch deformation with tapering
  private applyStretchDeformation(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      
      // Vertical stretching
      positions[i + 1] = y * (1.5 + intensity);
      
      // Tapering effect
      const height = Math.abs(positions[i + 1]);
      const taperFactor = Math.max(0.3, 1 - (height / (rockSize * 4)) * intensity);
      positions[i] *= taperFactor;
      positions[i + 2] *= taperFactor;
    }
  }
  
  // ENHANCED: Flatten deformation with edge rounding
  private applyFlattenDeformation(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Flatten vertically
      positions[i + 1] = y * (0.3 + intensity * 0.2);
      
      // Widen horizontally
      const horizontalScale = 1.2 + intensity * 0.3;
      positions[i] *= horizontalScale;
      positions[i + 2] *= horizontalScale;
      
      // Edge rounding
      const edgeDistance = Math.sqrt(x * x + z * z);
      if (edgeDistance > rockSize * 0.8) {
        const roundingFactor = 1 - intensity * 0.3;
        positions[i + 1] *= roundingFactor;
      }
    }
  }
  
  // ENHANCED: Fracture deformation for angular rocks
  private applyFractureDeformation(positions: Float32Array, rockSize: number, intensity: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Create angular facets
      const facetX = Math.sign(x) * Math.pow(Math.abs(x), 0.8 + intensity * 0.4);
      const facetY = Math.sign(y) * Math.pow(Math.abs(y), 0.8 + intensity * 0.4);
      const facetZ = Math.sign(z) * Math.pow(Math.abs(z), 0.8 + intensity * 0.4);
      
      positions[i] = facetX;
      positions[i + 1] = facetY;
      positions[i + 2] = facetZ;
    }
  }
  
  // ENHANCED: Erosion deformation for weathered rocks
  private applyErosionDeformation(
    positions: Float32Array, 
    rockSize: number, 
    intensity: number, 
    personality: 'character' | 'basic'
  ): void {
    const erosionLayers = personality === 'character' ? 2 : 1;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      let erosionFactor = 1;
      
      for (let layer = 0; layer < erosionLayers; layer++) {
        const frequency = 2 + layer * 2;
        const amplitude = intensity * 0.1 / (layer + 1);
        
        const erosion = Math.sin(x * frequency) * Math.cos(y * frequency) * Math.sin(z * frequency);
        erosionFactor += erosion * amplitude;
      }
      
      // Apply gentle erosion smoothing
      erosionFactor = Math.max(0.7, erosionFactor);
      
      positions[i] *= erosionFactor;
      positions[i + 1] *= erosionFactor;
      positions[i + 2] *= erosionFactor;
    }
  }
  
  // ENHANCED: Validate and smooth geometry
  private validateAndSmoothGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Fix invalid values
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
        console.warn('🔧 Fixed invalid vertex position');
      }
    }
    
    // Apply subtle smoothing to character rocks
    this.applyGeometrySmoothing(positions);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  
  // NEW: Apply subtle geometry smoothing
  private applyGeometrySmoothing(positions: Float32Array): void {
    const smoothed = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length; i += 3) {
      // Simple averaging with neighbors (basic Laplacian smoothing)
      const neighbors = 3; // Number of neighboring vertices to consider
      let avgX = positions[i];
      let avgY = positions[i + 1];
      let avgZ = positions[i + 2];
      let count = 1;
      
      // Find nearby vertices and average
      for (let j = 0; j < positions.length; j += 3) {
        if (i !== j && count < neighbors) {
          const dx = positions[i] - positions[j];
          const dy = positions[i + 1] - positions[j + 1];
          const dz = positions[i + 2] - positions[j + 2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < 0.3) { // Close enough to be a neighbor
            avgX += positions[j];
            avgY += positions[j + 1];
            avgZ += positions[j + 2];
            count++;
          }
        }
      }
      
      // Apply subtle smoothing (only 10% influence)
      const smoothingFactor = 0.1;
      smoothed[i] = positions[i] * (1 - smoothingFactor) + (avgX / count) * smoothingFactor;
      smoothed[i + 1] = positions[i + 1] * (1 - smoothingFactor) + (avgY / count) * smoothingFactor;
      smoothed[i + 2] = positions[i + 2] * (1 - smoothingFactor) + (avgZ / count) * smoothingFactor;
    }
    
    // Copy smoothed positions back
    for (let i = 0; i < positions.length; i++) {
      positions[i] = smoothed[i];
    }
  }
  
  // ENHANCED: Create realistic rock material
  private createRealisticRockMaterial(category: string, rockShape: RockShape, index: number): THREE.MeshStandardMaterial {
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
    
    // Apply realistic weathering
    if (rockShape.weatheringLevel > 0.7) {
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, rockShape.weatheringLevel * 0.3);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness + rockShape.weatheringLevel * 0.1,
      metalness: Math.max(0, rockType.metalness - rockShape.weatheringLevel * 0.05),
      normalScale: new THREE.Vector2(1.0, 1.0)
    });
    
    return material;
  }
  
  // ENHANCED: Create realistic rock clusters with physics
  private createRealisticRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Foundation rocks (40% of cluster, largest and most stable)
    const foundationCount = Math.max(1, Math.floor(clusterCount * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createClusterRock(rockSize, variation, i, 'foundation');
      
      const angle = (i / foundationCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = rockSize * 0.2;
      rock.position.set(
        Math.cos(angle) * distance,
        -rockSize * 0.1, // Slightly embedded
        Math.sin(angle) * distance
      );
      
      foundationRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Support rocks (40% of cluster, medium size, lean against foundation)
    const supportCount = Math.floor(clusterCount * 0.4);
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createClusterRock(rockSize, variation, i + foundationCount, 'support');
      
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
    
    // Accent rocks (20% of cluster, smallest and most varied)
    const accentCount = clusterCount - foundationCount - supportCount;
    
    for (let i = 0; i < accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createClusterRock(rockSize, variation, i + foundationCount + supportCount, 'accent');
      
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
    
    // Add environmental details
    this.addClusterEnvironmentalDetails(rockGroup, maxSize);
    
    console.log(`🏔️ Created realistic cluster with ${clusterCount} rocks: ${foundationCount} foundation, ${supportCount} support, ${accentCount} accent`);
  }
  
  // ENHANCED: Create cluster rock with role-specific characteristics
  private createClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.Object3D {
    let rockShape: RockShape;
    
    switch (role) {
      case 'foundation':
        // Stable shapes only
        const foundationShapes = this.rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        rockShape = foundationShapes[index % foundationShapes.length];
        break;
        
      case 'support':
        // Exclude unstable shapes
        const supportShapes = this.rockShapes.filter(s => 
          s.type !== 'spire'
        );
        rockShape = supportShapes[index % supportShapes.length];
        break;
        
      case 'accent':
        // All shapes allowed for variety
        rockShape = this.rockShapes[index % this.rockShapes.length];
        break;
        
      default:
        rockShape = this.rockShapes[index % this.rockShapes.length];
    }
    
    // Create geometry with character personality for clusters
    let geometry = this.createEnhancedGeometry(rockShape, rockSize, 'character');
    
    this.applyPersonalityDeformation(geometry, rockShape, rockSize, 'character');
    this.validateAndSmoothGeometry(geometry);
    
    const material = this.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Role-specific rotations
    if (role === 'foundation') {
      rock.rotation.set(
        Math.random() * 0.2,
        Math.random() * Math.PI * 2,
        Math.random() * 0.2
      );
    } else {
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
    }
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
  
  // ENHANCED: Role-based material with weathering gradients
  private createRoleBasedMaterial(
    category: string, 
    rockShape: RockShape, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.MeshStandardMaterial {
    const material = this.createRealisticRockMaterial(category, rockShape, index);
    
    switch (role) {
      case 'foundation':
        // Maximum weathering from ground moisture
        material.roughness = Math.min(1.0, material.roughness + 0.1);
        const currentColor = material.color;
        const weatheringColor = new THREE.Color(0x2A2A1A);
        currentColor.lerp(weatheringColor, 0.2);
        break;
        
      case 'support':
        // Moderate weathering
        if (Math.random() < 0.4) {
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x3A3A2A);
          currentColor.lerp(weatheringColor, 0.1);
        }
        break;
        
      case 'accent':
        // Fresh appearance, minimal weathering
        material.roughness = Math.max(0.7, material.roughness - 0.05);
        break;
    }
    
    return material;
  }
  
  // ENHANCED: Calculate realistic stacking positions with physics
  private calculateRealisticStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: 'support' | 'accent'
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (role === 'support') {
      // Support rocks lean against foundation rocks
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize + rockSize) * 0.3;
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.2 + Math.random() * baseSize * 0.15,
        basePosition.z + Math.sin(angle) * distance
      );
    } else {
      // Accent rocks: 60% stacked on top, 40% scattered around
      if (Math.random() < 0.6) {
        // Stacked on top
        const offsetX = (Math.random() - 0.5) * baseSize * 0.2;
        const offsetZ = (Math.random() - 0.5) * baseSize * 0.2;
        
        position.set(
          basePosition.x + offsetX,
          basePosition.y + baseSize * 0.5 + rockSize * 0.2,
          basePosition.z + offsetZ
        );
      } else {
        // Scattered around base
        const angle = Math.random() * Math.PI * 2;
        const distance = baseSize * (0.6 + Math.random() * 0.4);
        
        position.set(
          basePosition.x + Math.cos(angle) * distance,
          basePosition.y + rockSize * 0.1,
          basePosition.z + Math.sin(angle) * distance
        );
      }
    }
    
    return position;
  }
  
  // NEW: Add environmental details to clusters
  private addClusterEnvironmentalDetails(rockGroup: THREE.Group, maxSize: number): void {
    // Add cluster debris
    const debrisCount = 8 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = maxSize * (0.02 + Math.random() * 0.05);
      const debris = new THREE.Mesh(
        new THREE.SphereGeometry(debrisSize, 6, 4),
        new THREE.MeshStandardMaterial({
          color: 0x6B6B6B,
          roughness: 0.9,
          metalness: 0.0
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = maxSize * (1.2 + Math.random() * 0.8);
      
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * 0.5,
        Math.sin(angle) * distance
      );
      
      debris.castShadow = true;
      debris.receiveShadow = true;
      rockGroup.add(debris);
    }
    
    // Add sediment accumulation
    const sedimentCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < sedimentCount; i++) {
      const sedimentSize = maxSize * (0.03 + Math.random() * 0.04);
      const sediment = new THREE.Mesh(
        new THREE.SphereGeometry(sedimentSize, 8, 6),
        new THREE.MeshStandardMaterial({
          color: 0x4A4A2A,
          roughness: 1.0,
          metalness: 0.0
        })
      );
      
      // Flatten sediment
      sediment.scale.set(1, 0.3, 1);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = maxSize * (0.3 + Math.random() * 0.5);
      
      sediment.position.set(
        Math.cos(angle) * distance,
        sedimentSize * 0.1,
        Math.sin(angle) * distance
      );
      
      sediment.receiveShadow = true;
      rockGroup.add(sediment);
    }
  }
  
  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.spawnedFeatures.has(regionKey)) return;
    
    console.log(`Generating features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);
    
    // Clear region-specific rock positions
    this.spawnedRockPositions = this.spawnedRockPositions.filter(pos => {
      const posRegion = this.ringSystem.getRegionForPosition(pos);
      return !posRegion || !(posRegion.ringIndex === region.ringIndex && posRegion.quadrant === region.quadrant);
    });
    
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
    this.spawnRealisticRocks(region, 12, features); // Reduced from 20
    this.spawnRandomFeatures(region, 'bushes', 18, features);
  }
  
  private generateClusteredFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    const clusterCount = 2 + Math.floor(Math.random() * 2); // Reduced from 3-5
    
    for (let i = 0; i < clusterCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      const cluster: FeatureCluster = {
        position: position,
        radius: 20 + Math.random() * 30,
        density: 0.2 + Math.random() * 0.4, // Reduced density
        type: this.getRandomClusterType()
      };
      
      this.generateFeaturesForCluster(region, cluster, features);
    }
    
    this.spawnRandomFeatures(region, 'forest', 5, features);
    this.spawnRealisticRocks(region, 15, features); // Reduced from 25
    this.spawnRandomFeatures(region, 'bushes', 10, features);
  }
  
  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 8, features);
    this.spawnRealisticRocks(region, 18, features); // Reduced from 30
    this.spawnRandomFeatures(region, 'bushes', 5, features);
  }
  
  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    this.spawnRandomFeatures(region, 'forest', 2, features);
    this.spawnRealisticRocks(region, 20, features); // Reduced from 35
    this.spawnRandomFeatures(region, 'bushes', 3, features);
  }
  
  private getRandomClusterType(): 'forest' | 'rocks' | 'bushes' | 'mixed' {
    const clusterTypes = [
      { type: 'forest' as const, weight: 35 },
      { type: 'rocks' as const, weight: 15 }, // Reduced from 25
      { type: 'bushes' as const, weight: 35 }, // Increased from 25
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
  
  // ENHANCED: Spawn realistic rocks with improved distribution
  private spawnRealisticRocks(region: RegionCoordinates, totalRocks: number, features: THREE.Object3D[]): void {
    const totalWeight = this.rockVariations.reduce((sum, variation) => sum + variation.weight, 0);
    let spawnedCount = 0;
    
    for (let i = 0; i < totalRocks && spawnedCount < totalRocks; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      if (!this.isPositionNearTavern(position) && this.isValidRockPosition(position)) {
        const variation = this.selectRockVariation(totalWeight);
        
        if ((variation.category === 'large' || variation.category === 'massive') && 
            this.isTooCloseToLargeFormation(position)) {
          continue;
        }
        
        const rock = this.spawnRockByVariation(variation, position);
        if (rock) {
          features.push(rock);
          this.scene.add(rock);
          this.spawnedRockPositions.push(position.clone());
          spawnedCount++;
          
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
    
    console.log(`🪨 Spawned ${spawnedCount}/${totalRocks} realistic rocks in region Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
  }
  
  // NEW: Check if rock position is valid (minimum distance from other rocks)
  private isValidRockPosition(position: THREE.Vector3): boolean {
    return !this.spawnedRockPositions.some(rockPos => 
      rockPos.distanceTo(position) < this.minimumRockDistance
    );
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
        featureCount = Math.floor(clusterArea * 0.005 * cluster.density); // Reduced from 0.01
        this.spawnClusteredFeatures(region, 'rocks', featureCount, cluster, features);
        break;
        
      case 'bushes':
        featureCount = Math.floor(clusterArea * 0.025 * cluster.density);
        this.spawnClusteredFeatures(region, 'bushes', featureCount, cluster, features);
        break;
        
      case 'mixed':
        featureCount = Math.floor(clusterArea * 0.008 * cluster.density);
        this.spawnClusteredFeatures(region, 'forest', featureCount, cluster, features);
        
        featureCount = Math.floor(clusterArea * 0.003 * cluster.density); // Reduced from 0.006
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
        // Check rock spacing for clustered rocks
        if (type === 'rocks' && !this.isValidRockPosition(position)) {
          continue;
        }
        
        const feature = this.spawnFeature(type, position);
        if (feature) {
          features.push(feature);
          this.scene.add(feature);
          
          if (type === 'rocks') {
            this.spawnedRockPositions.push(position.clone());
          }
          
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
        // Check rock spacing
        if (type === 'rocks' && !this.isValidRockPosition(position)) {
          continue;
        }
        
        const feature = this.spawnFeature(type, position);
        if (feature) {
          features.push(feature);
          this.scene.add(feature);
          
          if (type === 'rocks') {
            this.spawnedRockPositions.push(position.clone());
          }
          
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
    
    // Clean up region-specific rock positions
    this.spawnedRockPositions = this.spawnedRockPositions.filter(pos => {
      const posRegion = this.ringSystem.getRegionForPosition(pos);
      return !posRegion || !(posRegion.ringIndex === region.ringIndex && posRegion.quadrant === region.quadrant);
    });
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
    this.spawnedRockPositions.length = 0;
  }
}
