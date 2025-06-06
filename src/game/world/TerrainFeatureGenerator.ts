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
  
  // UPDATED: Reduced deformation intensities to prevent gaps
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false, shapePersonality: 'character' },
    { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false, shapePersonality: 'character' },
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false, shapePersonality: 'basic' },
    { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' },
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' }
  ];
  
  // UPDATED: Further reduced deformation intensities to max 0.1
  private rockShapes: RockShape[] = [
    { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.08, weatheringLevel: 0.6, shapeModifier: 'erode' },
    { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.1, weatheringLevel: 0.3, shapeModifier: 'stretch' },
    { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.06, weatheringLevel: 0.8, shapeModifier: 'flatten' },
    { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.1, weatheringLevel: 0.4, shapeModifier: 'fracture' },
    { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.08, weatheringLevel: 0.9, shapeModifier: 'erode' },
    { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.06, weatheringLevel: 0.7, shapeModifier: 'flatten' },
    { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.1, weatheringLevel: 0.5, shapeModifier: 'fracture' },
    { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.08, weatheringLevel: 0.6, shapeModifier: 'none' }
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
    
    // COMPLETELY REWRITTEN: Enhanced rock generation with gap-free topology
    this.createTopologyAwareRockVariations();
    
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
  
  // COMPLETELY REWRITTEN: Topology-aware rock generation to prevent gaps
  private createTopologyAwareRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          this.createTopologyAwareRockCluster(rockGroup, variation, i);
        } else {
          this.createTopologyAwareCharacterRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} topology-aware rock variations without gaps`);
  }
  
  // NEW: Create topology-aware character rocks
  private createTopologyAwareCharacterRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    // Select rock shape
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Create base geometry with higher subdivision for better topology
    let rockGeometry = this.createTopologyAwareBaseGeometry(rockShape, rockSize);
    
    // Build neighbor map for topology-aware deformation
    const neighbors = this.buildNeighborMap(rockGeometry);
    
    // Apply topology-aware shape modifications
    this.applyTopologyAwareShapeModifications(rockGeometry, rockShape, rockSize, neighbors);
    
    // Apply controlled deformation with neighbor constraints
    const deformationIntensity = variation.shapePersonality === 'character' ? 
      rockShape.deformationIntensity * 0.6 : rockShape.deformationIntensity * 0.4; // Reduced further
    this.applyTopologyAwareDeformation(rockGeometry, deformationIntensity, rockSize, rockShape, neighbors);
    
    // Validate and repair geometry
    this.validateAndRepairTopology(rockGeometry);
    
    // Apply smoothing to prevent artifacts
    this.applyTopologyAwareSmoothing(rockGeometry, neighbors, rockShape.type);
    
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
    
    rockGroup.add(mainRock);
    
    // Add surface features for medium+ rocks
    if (variation.category === 'medium' || variation.category === 'large') {
      this.addSurfaceFeatures(rockGroup, rockSize, rockShape, rockMaterial);
    }
    
    console.log(`🏔️ Created topology-aware ${variation.category} ${rockShape.type} rock without gaps`);
  }
  
  // NEW: Build neighbor map for topology awareness
  private buildNeighborMap(geometry: THREE.BufferGeometry): number[][] {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    const neighbors: number[][] = Array.from({ length: positions.count }, () => []);
    
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        // Add neighbors for each vertex in the triangle
        if (!neighbors[a].includes(b)) neighbors[a].push(b);
        if (!neighbors[a].includes(c)) neighbors[a].push(c);
        if (!neighbors[b].includes(a)) neighbors[b].push(a);
        if (!neighbors[b].includes(c)) neighbors[b].push(c);
        if (!neighbors[c].includes(a)) neighbors[c].push(a);
        if (!neighbors[c].includes(b)) neighbors[c].push(b);
      }
    }
    
    return neighbors;
  }
  
  // NEW: Calculate maximum safe displacement to prevent gaps
  private calculateMaxSafeDisplacement(vertex: THREE.Vector3, neighbors: THREE.Vector3[]): number {
    if (neighbors.length === 0) return 0.05;
    
    let minDistance = Infinity;
    for (const neighbor of neighbors) {
      const distance = vertex.distanceTo(neighbor);
      minDistance = Math.min(minDistance, distance);
    }
    
    // Limit displacement to 20% of minimum neighbor distance to prevent gaps
    return minDistance * 0.2;
  }
  
  // NEW: Create topology-aware base geometry
  private createTopologyAwareBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        // Higher subdivision for better topology
        geometry = new THREE.IcosahedronGeometry(rockSize, 2); // Reduced from 3 to 2 for performance
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(rockSize, 20, 16); // Reduced resolution slightly
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, 1); // Reduced from 2 to 1
        break;
        
      case 'custom':
        geometry = this.createTopologyAwareOrganicGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 2);
    }
    
    return geometry;
  }
  
  // NEW: Create organic geometry with topology awareness
  private createTopologyAwareOrganicGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 16, 12); // Reduced resolution
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Apply gentle organic variation
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      const distance = vertex.length();
      
      // Gentle multi-layer noise
      const noise1 = Math.sin(vertex.x * 1.2) * Math.cos(vertex.y * 1.2) * Math.sin(vertex.z * 1.2);
      const noise2 = Math.sin(vertex.x * 2.4) * Math.cos(vertex.z * 2.4) * 0.5;
      const noise3 = Math.cos(vertex.y * 3.6) * Math.sin(vertex.x * 1.8) * 0.3;
      
      // Combine noise layers with reduced intensity
      const organicFactor = 1 + (noise1 * 0.15 + noise2 * 0.08 + noise3 * 0.05); // Reduced from original
      
      if (distance > 0) {
        const newDistance = distance * organicFactor;
        vertex.normalize().multiplyScalar(newDistance);
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  // NEW: Apply topology-aware shape modifications
  private applyTopologyAwareShapeModifications(
    geometry: THREE.BufferGeometry, 
    rockShape: RockShape, 
    rockSize: number, 
    neighbors: number[][]
  ): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Get neighbor constraints
      const neighborPositions = neighbors[i].map(idx => {
        const neighbor = new THREE.Vector3();
        neighbor.fromBufferAttribute(positions, idx);
        return neighbor;
      });
      
      const maxDisplacement = this.calculateMaxSafeDisplacement(vertex, neighborPositions);
      
      switch (rockShape.shapeModifier) {
        case 'stretch':
          this.applyConstrainedStretch(vertex, maxDisplacement);
          break;
          
        case 'flatten':
          this.applyConstrainedFlatten(vertex, maxDisplacement);
          break;
          
        case 'fracture':
          this.applyConstrainedFracture(vertex, maxDisplacement);
          break;
          
        case 'erode':
          this.applyConstrainedErosion(vertex, maxDisplacement);
          break;
          
        default:
          break;
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Constrained stretch modification
  private applyConstrainedStretch(vertex: THREE.Vector3, maxDisplacement: number): void {
    const originalY = vertex.y;
    
    // Gentle vertical stretching
    const stretchFactor = 1.2 + Math.random() * 0.3; // Reduced from 1.5 + 0.5
    vertex.y = originalY * stretchFactor;
    
    // Constrain the change
    const yChange = Math.abs(vertex.y - originalY);
    if (yChange > maxDisplacement) {
      vertex.y = originalY + Math.sign(vertex.y - originalY) * maxDisplacement;
    }
    
    // Gentle tapering
    const height = Math.abs(vertex.y);
    const taperFactor = Math.max(0.5, 1 - height / 4); // Less aggressive tapering
    vertex.x *= taperFactor;
    vertex.z *= taperFactor;
  }
  
  // NEW: Constrained flatten modification
  private applyConstrainedFlatten(vertex: THREE.Vector3, maxDisplacement: number): void {
    const originalY = vertex.y;
    
    // Gentle flattening
    vertex.y *= 0.4 + Math.random() * 0.2; // Less aggressive: 0.4-0.6 instead of 0.3-0.5
    
    // Constrain the change
    const yChange = Math.abs(vertex.y - originalY);
    if (yChange > maxDisplacement) {
      vertex.y = originalY + Math.sign(vertex.y - originalY) * maxDisplacement;
    }
    
    // Gentle widening
    const wideningFactor = 1.1 + Math.random() * 0.2; // Reduced from 1.3 + 0.4
    vertex.x *= wideningFactor;
    vertex.z *= wideningFactor;
  }
  
  // NEW: Constrained fracture modification
  private applyConstrainedFracture(vertex: THREE.Vector3, maxDisplacement: number): void {
    // Smooth angular modifications instead of sharp Math.sign
    const facetNoise = Math.sin(vertex.x * 2) + Math.cos(vertex.y * 2) + Math.sin(vertex.z * 2);
    const facetIntensity = (facetNoise % 1) * 0.05; // Reduced intensity
    
    // Apply constrained angular modifications
    const deltaX = Math.tanh(vertex.x) * facetIntensity; // Smooth instead of Math.sign
    const deltaY = Math.tanh(vertex.y) * facetIntensity;
    const deltaZ = Math.tanh(vertex.z) * facetIntensity;
    
    // Constrain displacement
    const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    if (totalDelta > maxDisplacement) {
      const scale = maxDisplacement / totalDelta;
      vertex.x += deltaX * scale;
      vertex.y += deltaY * scale;
      vertex.z += deltaZ * scale;
    } else {
      vertex.x += deltaX;
      vertex.y += deltaY;
      vertex.z += deltaZ;
    }
  }
  
  // NEW: Constrained erosion modification
  private applyConstrainedErosion(vertex: THREE.Vector3, maxDisplacement: number): void {
    // Smooth erosion patterns
    const erosion1 = Math.sin(vertex.x * 1.5) * Math.cos(vertex.y * 1.5) * 0.08; // Reduced intensity
    const erosion2 = Math.sin(vertex.z * 2) * Math.cos(vertex.x * 1.2) * 0.05;
    
    const totalErosion = erosion1 + erosion2;
    
    // Constrain erosion displacement
    const constrainedErosion = Math.max(-maxDisplacement, Math.min(maxDisplacement, totalErosion));
    
    // Apply erosion along surface normal
    const length = vertex.length();
    if (length > 0) {
      const normal = vertex.clone().normalize();
      vertex.add(normal.multiplyScalar(constrainedErosion));
    }
  }
  
  // NEW: Apply topology-aware deformation
  private applyTopologyAwareDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape,
    neighbors: number[][]
  ): void {
    // Apply gentle organic noise deformation
    this.applyConstrainedOrganicDeformation(geometry, intensity * 0.7, rockSize, neighbors);
    
    // Apply detail deformation with constraints
    this.applyConstrainedDetailDeformation(geometry, intensity * 0.3, rockSize * 0.3, neighbors);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Constrained organic deformation
  private applyConstrainedOrganicDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    scale: number, 
    neighbors: number[][]
  ): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Get neighbor constraints
      const neighborPositions = neighbors[i].map(idx => {
        const neighbor = new THREE.Vector3();
        neighbor.fromBufferAttribute(positions, idx);
        return neighbor;
      });
      
      const maxDisplacement = this.calculateMaxSafeDisplacement(vertex, neighborPositions);
      
      // Multi-octave organic noise with reduced intensity
      const noise1 = Math.sin(vertex.x / scale * 0.8) * Math.cos(vertex.y / scale * 0.8) * Math.sin(vertex.z / scale * 0.8);
      const noise2 = Math.sin(vertex.x / scale * 1.6) * Math.cos(vertex.z / scale * 1.6) * 0.5;
      const noise3 = Math.cos(vertex.y / scale * 2.4) * Math.sin(vertex.x / scale * 2.4) * 0.25;
      
      const combinedNoise = noise1 + noise2 + noise3;
      
      // Constrain displacement
      const displacement = Math.max(-maxDisplacement, Math.min(maxDisplacement, combinedNoise * intensity));
      
      // Apply along surface normal
      const length = vertex.length();
      if (length > 0) {
        const normal = vertex.clone().normalize();
        vertex.add(normal.multiplyScalar(displacement));
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  
  // NEW: Constrained detail deformation
  private applyConstrainedDetailDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    scale: number, 
    neighbors: number[][]
  ): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Get neighbor constraints
      const neighborPositions = neighbors[i].map(idx => {
        const neighbor = new THREE.Vector3();
        neighbor.fromBufferAttribute(positions, idx);
        return neighbor;
      });
      
      const maxDisplacement = this.calculateMaxSafeDisplacement(vertex, neighborPositions) * 0.5; // Even more constrained for details
      
      // High-frequency detail noise
      const detailNoise = Math.sin(vertex.x / scale * 6) * Math.cos(vertex.y / scale * 6) * Math.sin(vertex.z / scale * 6);
      
      // Constrain displacement
      const displacement = Math.max(-maxDisplacement, Math.min(maxDisplacement, detailNoise * intensity));
      
      const length = vertex.length();
      if (length > 0) {
        const normal = vertex.clone().normalize();
        vertex.add(normal.multiplyScalar(displacement));
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  
  // NEW: Validate and repair topology
  private validateAndRepairTopology(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    
    if (!indices) return;
    
    // Fix invalid values
    const positionsArray = positions.array as Float32Array;
    for (let i = 0; i < positionsArray.length; i++) {
      if (!isFinite(positionsArray[i])) {
        positionsArray[i] = 0;
        console.warn('🔧 Fixed invalid vertex position');
      }
    }
    
    // Check for degenerate triangles and collect valid ones
    const validTriangles: number[] = [];
    const vertex1 = new THREE.Vector3();
    const vertex2 = new THREE.Vector3();
    const vertex3 = new THREE.Vector3();
    
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i);
      const b = indices.getX(i + 1);
      const c = indices.getX(i + 2);
      
      vertex1.fromBufferAttribute(positions, a);
      vertex2.fromBufferAttribute(positions, b);
      vertex3.fromBufferAttribute(positions, c);
      
      // Calculate triangle area to detect degenerate triangles
      const edge1 = vertex2.clone().sub(vertex1);
      const edge2 = vertex3.clone().sub(vertex1);
      const area = edge1.cross(edge2).length() * 0.5;
      
      // Only keep triangles with reasonable area
      if (area > 0.0001) { // Slightly stricter threshold
        validTriangles.push(a, b, c);
      }
    }
    
    // Update indices with valid triangles only
    geometry.setIndex(validTriangles);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    console.log(`🔧 Validated geometry: ${validTriangles.length / 3} valid triangles`);
  }
  
  // NEW: Apply topology-aware smoothing
  private applyTopologyAwareSmoothing(
    geometry: THREE.BufferGeometry, 
    neighbors: number[][], 
    rockType: string
  ): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const smoothedPositions: THREE.Vector3[] = [];
    
    // Determine smoothing intensity based on rock type
    const smoothingIntensity = rockType === 'angular' ? 0.05 : 0.15; // Reduced intensity
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      if (neighbors[i].length > 0) {
        // Calculate Laplacian smoothing
        const centroid = new THREE.Vector3();
        for (const neighborIdx of neighbors[i]) {
          const neighbor = new THREE.Vector3();
          neighbor.fromBufferAttribute(positions, neighborIdx);
          centroid.add(neighbor);
        }
        centroid.divideScalar(neighbors[i].length);
        
        // Apply smoothing with intensity control
        const smoothed = vertex.clone().lerp(centroid, smoothingIntensity);
        smoothedPositions.push(smoothed);
      } else {
        smoothedPositions.push(vertex.clone());
      }
    }
    
    // Update geometry with smoothed positions
    for (let i = 0; i < smoothedPositions.length; i++) {
      const pos = smoothedPositions[i];
      positions.setXYZ(i, pos.x, pos.y, pos.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // ENHANCED: Rock material with better weathering and variety
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
      const weatheringIntensity = rockShape.weatheringLevel * 0.4;
      const weatheringColor = new THREE.Color(0x4A4A2A);
      baseColor.lerp(weatheringColor, weatheringIntensity);
    }
    
    // Age-based weathering for larger rocks
    if (category === 'large' || category === 'massive') {
      const ageColor = new THREE.Color(0x3A3A2A);
      baseColor.lerp(ageColor, 0.15);
    }
    
    // Position-based moss for bottom rocks (simulated)
    if (rockShape.type === 'weathered' && Math.random() < 0.6) {
      const mossColor = new THREE.Color(0x2F5F2F);
      baseColor.lerp(mossColor, 0.25);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: TextureGenerator.createStoneTexture(),
      roughness: rockType.roughness + (rockShape.weatheringLevel * 0.1),
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(1.0, 1.0)
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
  
  // UPDATED: Enhanced cluster generation with topology awareness
  private createTopologyAwareRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Create foundation rocks (largest, most stable)
    const foundationCount = Math.min(2, Math.floor(clusterCount * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createTopologyAwareClusterRock(rockSize, variation, i, 'foundation');
      
      // Position foundation rocks
      const angle = (i / foundationCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = rockSize * 0.3;
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.15,
        Math.sin(angle) * distance
      );
      
      foundationRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create supporting rocks (medium size)
    const supportCount = Math.floor(clusterCount * 0.4);
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createTopologyAwareClusterRock(rockSize, variation, i + foundationCount, 'support');
      
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
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createTopologyAwareClusterRock(rockSize, variation, i + foundationCount + supportCount, 'accent');
      
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
    
    console.log(`🏔️ Created topology-aware cluster with ${clusterCount} rocks: ${foundationCount} foundation, ${supportCount} support, ${accentCount} accent`);
  }
  
  // NEW: Create topology-aware cluster rock
  private createTopologyAwareClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: 'foundation' | 'support' | 'accent'
  ): THREE.Object3D {
    // Select shape based on role
    let rockShape: RockShape;
    
    switch (role) {
      case 'foundation':
        const foundationShapes = this.rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        rockShape = foundationShapes[index % foundationShapes.length];
        break;
        
      case 'support':
        const supportShapes = this.rockShapes.filter(s => 
          s.type !== 'spire'
        );
        rockShape = supportShapes[index % supportShapes.length];
        break;
        
      case 'accent':
        rockShape = this.rockShapes[index % this.rockShapes.length];
        break;
        
      default:
        rockShape = this.rockShapes[index % this.rockShapes.length];
    }
    
    // Create base geometry with topology awareness
    let geometry = this.createTopologyAwareBaseGeometry(rockShape, rockSize);
    
    // Build neighbor map
    const neighbors = this.buildNeighborMap(geometry);
    
    // Apply role-specific modifications with topology awareness
    this.applyTopologyAwareShapeModifications(geometry, rockShape, rockSize, neighbors);
    
    // Apply deformation based on role with topology constraints
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity * 0.5 : rockShape.deformationIntensity * 0.3; // Further reduced
    this.applyTopologyAwareDeformation(geometry, deformationIntensity, rockSize, rockShape, neighbors);
    
    // Validate and repair geometry
    this.validateAndRepairTopology(geometry);
    
    // Apply smoothing
    this.applyTopologyAwareSmoothing(geometry, neighbors, rockShape.type);
    
    // Create material
    const material = this.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply role-specific rotation
    if (role === 'foundation') {
      rock.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
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
        material.roughness = Math.min(1.0, material.roughness + 0.1);
        if (Math.random() < 0.7) {
          // Add moisture weathering tint
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x2A2A1A);
          currentColor.lerp(weatheringColor, 0.2);
        }
        break;
        
      case 'support':
        // Support rocks have moderate weathering
        if (Math.random() < 0.4) {
          const currentColor = material.color;
          const weatheringColor = new THREE.Color(0x3A3A2A);
          currentColor.lerp(weatheringColor, 0.1);
        }
        break;
        
      case 'accent':
        // Accent rocks can be fresher (less weathered)
        material.roughness = Math.max(0.6, material.roughness - 0.1);
        break;
    }
    
    return material;
  }
  
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
