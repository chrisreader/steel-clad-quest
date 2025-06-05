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

// UPDATED: Rock shape types with minimal deformation for smooth surfaces
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
  
  // UPDATED: Rock variations with even more reduced deformation
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false, shapePersonality: 'character' },
    { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false, shapePersonality: 'character' },
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false, shapePersonality: 'basic' },
    { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' },
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' }
  ];
  
  // UPDATED: Extremely reduced deformation and weathering levels (max 0.15 deformation, 0.4 weathering)
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.12, weatheringLevel: 0.3, shapeModifier: 'erode' },
    { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.15, weatheringLevel: 0.2, shapeModifier: 'stretch' },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.08, weatheringLevel: 0.4, shapeModifier: 'flatten' },
    { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.10, weatheringLevel: 0.25, shapeModifier: 'fracture' },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.10, weatheringLevel: 0.4, shapeModifier: 'erode' },
    { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.08, weatheringLevel: 0.35, shapeModifier: 'flatten' },
    { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.12, weatheringLevel: 0.3, shapeModifier: 'fracture' },
    { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.10, weatheringLevel: 0.35, shapeModifier: 'none' }
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
    
    // COMPLETELY REWRITTEN: Ultra-smooth rock generation eliminating all geometric patterns
    this.createUltraSmoothRockVariations();
    
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
  
  // COMPLETELY REWRITTEN: Ultra-smooth rock generation eliminating geometric patterns
  private createUltraSmoothRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createUltraSmoothRockCluster(rockGroup, variation, i);
        } else {
          this.createUltraSmoothCharacterRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} ultra-smooth rock variations with eliminated geometric patterns`);
  }
  
  // NEW: Create ultra-smooth character rocks with organic noise only
  private createUltraSmoothCharacterRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    // Select rock shape
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create ultra high-resolution base geometry
    let rockGeometry = this.createUltraHighResGeometry(rockShape, rockSize);
    
    // Apply SINGLE gentle organic deformation pass only
    this.applySingleOrganicDeformation(rockGeometry, rockShape, rockSize, variation.shapePersonality);
    
    // Apply intensive smoothing to eliminate ALL geometric artifacts
    this.applyIntensiveSmoothing(rockGeometry, 4); // 4 smoothing passes
    
    // Final ultra-smooth pass
    this.applyUltraSmoothFinishing(rockGeometry);
    
    // Create ultra-smooth material
    const rockMaterial = this.createUltraSmoothRockMaterial(variation.category, rockShape, index);
    
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
    
    // NO surface features for smooth appearance
    
    console.log(`🏔️ Created ultra-smooth ${variation.category} ${rockShape.type} rock with eliminated geometric patterns`);
  }
  
  // NEW: Create ultra high-resolution smooth base geometry
  private createUltraHighResGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        // Maximum subdivision for ultra-smooth surfaces
        geometry = new THREE.IcosahedronGeometry(rockSize, 5); // Increased from 4 to 5
        break;
        
      case 'sphere':
        // Ultra high resolution spheres
        geometry = new THREE.SphereGeometry(rockSize, 48, 36); // Increased from 32, 24
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, 4); // Increased from 3 to 4
        break;
        
      case 'custom':
        geometry = this.createUltraSmoothOrganicGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 5);
    }
    
    return geometry;
  }
  
  // NEW: Ultra-smooth organic geometry with organic noise
  private createUltraSmoothOrganicGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 48, 36);
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Ultra-gentle organic variation using Perlin-like noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // Organic noise using multiple octaves (Perlin-like)
      const organicFactor = this.generateOrganicNoise(x, y, z, rockSize);
      
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
  
  // NEW: Generate organic noise using multiple octaves (Perlin-like approach)
  private generateOrganicNoise(x: number, y: number, z: number, scale: number): number {
    // Scale coordinates
    const scaledX = x / scale;
    const scaledY = y / scale;
    const scaledZ = z / scale;
    
    // Multiple octaves of organic noise
    let noise = 0;
    let amplitude = 1;
    let frequency = 0.5; // Very low frequency for smoothness
    let maxAmplitude = 0;
    
    // 3 octaves only for smooth variation
    for (let octave = 0; octave < 3; octave++) {
      // Organic noise using gradients (simplified Perlin approach)
      const octaveNoise = this.organicNoiseFunction(
        scaledX * frequency,
        scaledY * frequency,
        scaledZ * frequency
      );
      
      noise += octaveNoise * amplitude;
      maxAmplitude += amplitude;
      
      amplitude *= 0.5; // Reduce amplitude for each octave
      frequency *= 2.0;  // Double frequency for each octave
    }
    
    // Normalize and apply very gentle variation
    const normalizedNoise = noise / maxAmplitude;
    return 1.0 + normalizedNoise * 0.08; // Maximum 8% variation for ultra-smooth appearance
  }
  
  // NEW: Organic noise function (simplified Perlin-like)
  private organicNoiseFunction(x: number, y: number, z: number): number {
    // Smooth interpolation functions
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    
    // Get integer coordinates
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    
    // Get fractional coordinates
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    
    // Apply fade curves
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    
    // Generate pseudo-random gradients using simple hash
    const hash = (ix: number, iy: number, iz: number) => {
      let h = ix + iy * 374761393 + iz * 668265263;
      h = (h ^ (h >> 13)) * 1274126177;
      return (h ^ (h >> 16)) & 0x7fffffff;
    };
    
    // Get gradient values at cube corners
    const aaa = hash(xi, yi, zi);
    const aba = hash(xi, yi + 1, zi);
    const aab = hash(xi, yi, zi + 1);
    const abb = hash(xi, yi + 1, zi + 1);
    const baa = hash(xi + 1, yi, zi);
    const bba = hash(xi + 1, yi + 1, zi);
    const bab = hash(xi + 1, yi, zi + 1);
    const bbb = hash(xi + 1, yi + 1, zi + 1);
    
    // Convert to normalized values
    const normalize = (val: number) => (val / 0x7fffffff) * 2 - 1;
    
    // Interpolate
    const x1 = lerp(normalize(aaa), normalize(baa), u);
    const x2 = lerp(normalize(aba), normalize(bba), u);
    const x3 = lerp(normalize(aab), normalize(bab), u);
    const x4 = lerp(normalize(abb), normalize(bbb), u);
    
    const y1 = lerp(x1, x2, v);
    const y2 = lerp(x3, x4, v);
    
    return lerp(y1, y2, w);
  }
  
  // NEW: Single organic deformation pass only
  private applySingleOrganicDeformation(
    geometry: THREE.BufferGeometry, 
    rockShape: RockShape, 
    rockSize: number,
    shapePersonality: 'character' | 'basic'
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Apply basic shape modification first (if any)
    this.applyBasicShapeModification(positions, rockShape, rockSize);
    
    // Apply single organic deformation pass
    const intensity = shapePersonality === 'character' ? 
      rockShape.deformationIntensity * 0.4 : rockShape.deformationIntensity * 0.2; // Further reduced
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Single organic noise application
      const organicVariation = this.generateOrganicNoise(x, y, z, rockSize);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        // Very gentle displacement
        const displacement = (organicVariation - 1.0) * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Basic shape modification (very gentle)
  private applyBasicShapeModification(positions: Float32Array, rockShape: RockShape, rockSize: number): void {
    switch (rockShape.shapeModifier) {
      case 'stretch':
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] *= 1.15; // Very gentle stretch
        }
        break;
        
      case 'flatten':
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] *= 0.7; // Gentle flatten
          positions[i] *= 1.1;
          positions[i + 2] *= 1.1;
        }
        break;
        
      case 'fracture':
        // Minimal angular variation
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];
          
          const facetVariation = (Math.floor(x * 1.5) + Math.floor(y * 1.5) + Math.floor(z * 1.5)) % 3;
          const facetIntensity = facetVariation * 0.02; // Very minimal
          
          positions[i] += Math.sign(x) * facetIntensity;
          positions[i + 1] += Math.sign(y) * facetIntensity;
          positions[i + 2] += Math.sign(z) * facetIntensity;
        }
        break;
        
      case 'erode':
        // Very gentle erosion using organic noise
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];
          
          const erosionNoise = this.generateOrganicNoise(x, y, z, rockSize * 0.5);
          const erosionAmount = (erosionNoise - 1.0) * 0.03; // Very gentle
          
          const length = Math.sqrt(x * x + y * y + z * z);
          if (length > 0) {
            positions[i] += (x / length) * erosionAmount;
            positions[i + 1] += (y / length) * erosionAmount;
            positions[i + 2] += (z / length) * erosionAmount;
          }
        }
        break;
        
      default:
        break;
    }
  }
  
  // NEW: Intensive smoothing to eliminate all geometric artifacts
  private applyIntensiveSmoothing(geometry: THREE.BufferGeometry, passes: number): void {
    for (let pass = 0; pass < passes; pass++) {
      this.applyVertexAveraging(geometry);
    }
  }
  
  // NEW: Proper vertex averaging smoothing
  private applyVertexAveraging(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const smoothedPositions = new Float32Array(positions.length);
    
    // Build vertex connectivity map
    const vertexMap = new Map<string, number[]>();
    
    // Process triangles to build connectivity
    if (geometry.index) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;
        
        this.addVertexConnection(vertexMap, i1, i2);
        this.addVertexConnection(vertexMap, i1, i3);
        this.addVertexConnection(vertexMap, i2, i1);
        this.addVertexConnection(vertexMap, i2, i3);
        this.addVertexConnection(vertexMap, i3, i1);
        this.addVertexConnection(vertexMap, i3, i2);
      }
    }
    
    // Apply smoothing with proper vertex averaging
    for (let i = 0; i < positions.length; i += 3) {
      const key = `${i}`;
      const neighbors = vertexMap.get(key) || [];
      
      if (neighbors.length > 0) {
        let avgX = positions[i];
        let avgY = positions[i + 1];
        let avgZ = positions[i + 2];
        
        for (const neighborIndex of neighbors) {
          avgX += positions[neighborIndex];
          avgY += positions[neighborIndex + 1];
          avgZ += positions[neighborIndex + 2];
        }
        
        const count = neighbors.length + 1;
        const smoothingFactor = 0.4; // 40% smoothing
        
        smoothedPositions[i] = positions[i] * (1 - smoothingFactor) + (avgX / count) * smoothingFactor;
        smoothedPositions[i + 1] = positions[i + 1] * (1 - smoothingFactor) + (avgY / count) * smoothingFactor;
        smoothedPositions[i + 2] = positions[i + 2] * (1 - smoothingFactor) + (avgZ / count) * smoothingFactor;
      } else {
        smoothedPositions[i] = positions[i];
        smoothedPositions[i + 1] = positions[i + 1];
        smoothedPositions[i + 2] = positions[i + 2];
      }
    }
    
    // Apply smoothed positions
    for (let i = 0; i < positions.length; i++) {
      positions[i] = smoothedPositions[i];
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Add vertex connection to connectivity map
  private addVertexConnection(vertexMap: Map<string, number[]>, vertex: number, neighbor: number): void {
    const key = `${vertex}`;
    if (!vertexMap.has(key)) {
      vertexMap.set(key, []);
    }
    const connections = vertexMap.get(key)!;
    if (!connections.includes(neighbor)) {
      connections.push(neighbor);
    }
  }
  
  // NEW: Ultra-smooth finishing pass
  private applyUltraSmoothFinishing(geometry: THREE.BufferGeometry): void {
    // Final normal smoothing
    geometry.computeVertexNormals();
    
    // Apply one more gentle smoothing pass
    this.applyVertexAveraging(geometry);
    
    // Final geometry validation
    this.validateGeometry(geometry);
    
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  
  // NEW: Geometry validation
  private validateGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Fix any invalid values
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
        console.warn('🔧 Fixed invalid vertex position in ultra-smooth rock');
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }
  
  // NEW: Ultra-smooth rock material
  private createUltraSmoothRockMaterial(category: string, rockShape: RockShape, index: number): THREE.MeshStandardMaterial {
    const rockTypes = [
      { color: 0x8B7355, roughness: 0.6, metalness: 0.02, name: 'granite' },
      { color: 0x696969, roughness: 0.65, metalness: 0.01, name: 'basalt' },
      { color: 0xA0A0A0, roughness: 0.55, metalness: 0.03, name: 'limestone' },
      { color: 0x8B7D6B, roughness: 0.7, metalness: 0.0, name: 'sandstone' },
      { color: 0x556B2F, roughness: 0.65, metalness: 0.01, name: 'moss_covered' },
      { color: 0x2F4F4F, roughness: 0.6, metalness: 0.05, name: 'slate' },
      { color: 0x8B4513, roughness: 0.6, metalness: 0.0, name: 'ironstone' }
    ];
    
    const rockType = rockTypes[index % rockTypes.length];
    const baseColor = new THREE.Color(rockType.color);
    
    // Minimal weathering for smooth appearance
    if (rockShape.weatheringLevel > 0.3) {
      const weatheringIntensity = Math.min(rockShape.weatheringLevel * 0.15, 0.2); // Reduced
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, weatheringIntensity);
    }
    
    // Minimal moss for larger rocks
    if (rockShape.type === 'weathered' && Math.random() < 0.2) {
      const mossColor = new THREE.Color(0x2F5F2F);
      baseColor.lerp(mossColor, 0.08); // Reduced moss intensity
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness,
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(0.5, 0.5) // Reduced normal intensity for smoother appearance
    });
    
    return material;
  }
  
  // UPDATED: Ultra-smooth cluster generation
  private createUltraSmoothRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Create foundation rocks with ultra-smooth geometry
    const foundationCount = Math.min(2, Math.floor(clusterCount * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createUltraSmoothClusterRock(rockSize, variation, i, 'foundation');
      
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
    
    // Create supporting rocks
    const supportCount = Math.floor(clusterCount * 0.4);
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createUltraSmoothClusterRock(rockSize, variation, i + foundationCount, 'support');
      
      const foundationRock = foundationRocks[i % foundationRocks.length];
      const stackPosition = this.calculateSmoothStackingPosition(
        foundationRock.position, 
        rockSize, 
        maxSize * 0.9,
        'support'
      );
      rock.position.copy(stackPosition);
      
      supportRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create accent rocks
    const accentCount = clusterCount - foundationCount - supportCount;
    
    for (let i = 0; i < accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createUltraSmoothClusterRock(rockSize, variation, i + foundationCount + supportCount, 'accent');
      
      const baseRocks = [...foundationRocks, ...supportRocks];
      const baseRock = baseRocks[Math.floor(Math.random() * baseRocks.length)];
      const stackPosition = this.calculateSmoothStackingPosition(
        baseRock.position,
        rockSize,
        maxSize * 0.6,
        'accent'
      );
      rock.position.copy(stackPosition);
      
      rockGroup.add(rock);
    }
    
    // Minimal cluster features for smooth appearance
    if (Math.random() < 0.2) {
      this.addMinimalClusterFeatures(rockGroup, maxSize);
    }
    
    console.log(`🏔️ Created ultra-smooth cluster with ${clusterCount} rocks`);
  }
  
  // NEW: Create ultra-smooth cluster rock
  private createUltraSmoothClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.Object3D {
    // Select appropriate smooth shape for role
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
    
    // Create ultra-smooth geometry
    let geometry = this.createUltraHighResGeometry(rockShape, rockSize);
    
    // Apply single organic deformation
    const personality = role === 'foundation' ? 'basic' : 'character';
    this.applySingleOrganicDeformation(geometry, rockShape, rockSize, personality);
    
    // Apply intensive smoothing
    this.applyIntensiveSmoothing(geometry, 3); // 3 passes for clusters
    this.applyUltraSmoothFinishing(geometry);
    
    // Create smooth material
    const material = this.createUltraSmoothRockMaterial(variation.category, rockShape, index);
    const rock = new THREE.Mesh(geometry, material);
    
    // Gentle rotation for natural placement
    rock.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI * 2,
      Math.random() * 0.3
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
  
  // NEW: Calculate smooth stacking position
  private calculateSmoothStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: 'support' | 'accent'
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (role === 'support') {
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize + rockSize) * 0.35;
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.25 + Math.random() * baseSize * 0.15,
        basePosition.z + Math.sin(angle) * distance
      );
    } else {
      if (Math.random() < 0.6) {
        const offsetX = (Math.random() - 0.5) * baseSize * 0.25;
        const offsetZ = (Math.random() - 0.5) * baseSize * 0.25;
        
        position.set(
          basePosition.x + offsetX,
          basePosition.y + baseSize * 0.5 + rockSize * 0.25,
          basePosition.z + offsetZ
        );
      } else {
        const angle = Math.random() * Math.PI * 2;
        const distance = baseSize * (0.7 + Math.random() * 0.3);
        
        position.set(
          basePosition.x + Math.cos(angle) * distance,
          basePosition.y + rockSize * 0.15,
          basePosition.z + Math.sin(angle) * distance
        );
      }
    }
    
    return position;
  }
  
  // NEW: Minimal cluster features for smooth appearance
  private addMinimalClusterFeatures(rockGroup: THREE.Group, maxSize: number): void {
    // Only add very minimal sediment
    const sedimentCount = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < sedimentCount; i++) {
      const sediment = new THREE.Mesh(
        new THREE.SphereGeometry(maxSize * (0.02 + Math.random() * 0.03), 12, 8),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.1, 0.15, 0.45 + Math.random() * 0.1),
          roughness: 0.8,
          metalness: 0.0
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = maxSize * (0.6 + Math.random() * 0.5);
      
      sediment.position.set(
        Math.cos(angle) * distance,
        0.005 + Math.random() * 0.01,
        Math.sin(angle) * distance
      );
      
      sediment.scale.set(1, 0.1, 1);
      rockGroup.add(sediment);
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
    
    // Pick a random model
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
}
