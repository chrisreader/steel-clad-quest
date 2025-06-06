import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { TextureGenerator } from '../utils';
import { ROCK_VARIATIONS, RockVariation } from './rocks/config/RockVariationConfig';
import { ROCK_SHAPES, RockShape } from './rocks/config/RockShapeConfig';
import { RockMaterialGenerator } from './rocks/materials/RockMaterialGenerator';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeModels: THREE.Object3D[] = [];
  private rockModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];
  
  // Use imported configurations
  private rockVariations: RockVariation[] = ROCK_VARIATIONS;
  private rockShapes: RockShape[] = ROCK_SHAPES;
  
  // Rock cluster generator
  private rockClusterGenerator: RockClusterGenerator = new RockClusterGenerator();
  
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
    
    // ENHANCED: Rock generation with size-aware quality control
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
  
  // ENHANCED: Create rock variations with size-aware quality control
  private createEnhancedRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 6 : 4;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          // Use existing cluster generation for medium, large, massive
          this.createClusterRockWrapper(rockGroup, variation, i);
        } else {
          // Enhanced individual rock generation with size-aware quality
          this.createSizeAwareCharacterRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} enhanced rock variations with size-aware quality control`);
  }
  
  // NEW: Wrapper for cluster generation to maintain compatibility
  private createClusterRockWrapper(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    // For medium, large, massive rocks - keep existing cluster logic
    const [minSize, maxSize] = variation.sizeRange;
    const clusterSize = variation.clusterSize || [3, 5];
    const numberOfRocks = clusterSize[0] + Math.floor(Math.random() * (clusterSize[1] - clusterSize[0] + 1));
    
    for (let i = 0; i < numberOfRocks; i++) {
      const rockSize = minSize + Math.random() * (maxSize - minSize);
      const rockShape = this.rockShapes[index % this.rockShapes.length];
      
      // Use existing geometry creation for medium+ rocks
      let rockGeometry = this.createCharacterBaseGeometry(rockShape, rockSize);
      this.applyShapeModifications(rockGeometry, rockShape, rockSize);
      
      // Apply normal deformation intensity for medium+ rocks
      const deformationIntensity = rockShape.deformationIntensity;
      this.applyCharacterDeformation(rockGeometry, deformationIntensity, rockSize, rockShape);
      this.validateAndEnhanceGeometry(rockGeometry);
      
      const rockMaterial = RockMaterialGenerator.createEnhancedRockMaterial(variation.category, rockShape, index);
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      // Position rocks in cluster
      const angle = (i / numberOfRocks) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.random() * rockSize * 1.5;
      rock.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      rockGroup.add(rock);
    }
  }
  
  // NEW: Size-aware rock creation with enhanced quality for small/tiny rocks
  private createSizeAwareCharacterRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    const rockShape = this.rockShapes[index % this.rockShapes.length];
    
    // Size-aware geometry creation
    let rockGeometry = this.createSizeAwareBaseGeometry(rockShape, rockSize, variation.category);
    
    // Apply size-appropriate modifications
    this.applySizeAwareShapeModifications(rockGeometry, rockShape, rockSize, variation.category);
    
    // Size-aware deformation with reduced intensity for small/tiny rocks
    const deformationIntensity = this.calculateSizeAwareDeformation(rockShape.deformationIntensity, variation.category);
    this.applySizeAwareCharacterDeformation(rockGeometry, deformationIntensity, rockSize, rockShape, variation.category);
    
    // Enhanced validation for small rocks
    this.validateAndEnhanceGeometry(rockGeometry);
    if (variation.category === 'tiny' || variation.category === 'small') {
      this.applySmoothingForSmallRocks(rockGeometry);
    }
    
    const rockMaterial = RockMaterialGenerator.createEnhancedRockMaterial(variation.category, rockShape, index);
    
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
    
    // Add debris for tiny rocks or clustering for small rocks
    if (variation.category === 'tiny') {
      this.addSmallRockDebris(rockGroup, rockSize, rockMaterial);
    } else if (variation.category === 'small' && Math.random() < 0.3) {
      this.addSmallRockClustering(rockGroup, rockSize, rockMaterial, rockShape);
    }
    
    // Add surface features only for medium+ rocks (unchanged)
    if (variation.category === 'medium' || variation.category === 'large') {
      this.addSurfaceFeatures(rockGroup, rockSize, rockShape, rockMaterial);
    }
    
    console.log(`🏔️ Created size-aware ${variation.category} ${rockShape.type} rock with optimized quality`);
  }
  
  // NEW: Size-aware base geometry with appropriate subdivision
  private createSizeAwareBaseGeometry(rockShape: RockShape, rockSize: number, category: string): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    // Reduce subdivision for tiny/small rocks to prevent over-tessellation
    const subdivisionLevel = (category === 'tiny') ? 1 : (category === 'small') ? 2 : 3;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(rockSize, subdivisionLevel);
        break;
        
      case 'sphere':
        // Reduce sphere resolution for small rocks
        const widthSegments = (category === 'tiny') ? 12 : (category === 'small') ? 16 : 24;
        const heightSegments = (category === 'tiny') ? 8 : (category === 'small') ? 12 : 18;
        geometry = new THREE.SphereGeometry(rockSize, widthSegments, heightSegments);
        break;
        
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(rockSize, Math.min(subdivisionLevel, 2));
        break;
        
      case 'custom':
        geometry = this.createSizeAwareOrganicGeometry(rockSize, category);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, subdivisionLevel);
    }
    
    return geometry;
  }
  
  // NEW: Size-aware organic geometry for custom rocks
  private createSizeAwareOrganicGeometry(rockSize: number, category: string): THREE.BufferGeometry {
    // Use simpler geometry for tiny/small rocks
    const segments = (category === 'tiny') ? 12 : (category === 'small') ? 16 : 20;
    const rings = (category === 'tiny') ? 8 : (category === 'small') ? 12 : 16;
    
    const geometry = new THREE.SphereGeometry(rockSize, segments, rings);
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Gentler organic variation for small rocks
    const variationIntensity = (category === 'tiny') ? 0.15 : (category === 'small') ? 0.20 : 0.25;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      // Gentler noise for small rocks
      const noise1 = Math.sin(x * 1.2) * Math.cos(y * 1.2) * Math.sin(z * 1.2);
      const noise2 = Math.sin(x * 2.5) * Math.cos(z * 2.5) * 0.3;
      
      const organicFactor = 1 + (noise1 * variationIntensity + noise2 * variationIntensity * 0.5);
      
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
  
  // NEW: Size-aware shape modifications
  private applySizeAwareShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number, category: string): void {
    // Skip aggressive modifiers for tiny/small rocks
    if (category === 'tiny' || category === 'small') {
      // Only apply gentle erosion for small rocks
      if (rockShape.shapeModifier === 'erode') {
        this.applyGentleErosionModification(geometry, rockSize, category);
      }
      return;
    }
    
    // Apply normal modifications for medium+ rocks
    this.applyShapeModifications(geometry, rockShape, rockSize);
  }
  
  // NEW: Gentle erosion for small rocks
  private applyGentleErosionModification(geometry: THREE.BufferGeometry, rockSize: number, category: string): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const intensity = (category === 'tiny') ? 0.05 : 0.08; // Much gentler than regular erosion
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Very gentle erosion patterns
      const erosion1 = Math.sin(x * 1.5) * Math.cos(y * 1.5) * intensity;
      const erosion2 = Math.sin(z * 2) * Math.cos(x * 1.2) * intensity * 0.5;
      
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
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Calculate size-aware deformation intensity
  private calculateSizeAwareDeformation(baseIntensity: number, category: string): number {
    switch (category) {
      case 'tiny':
        return baseIntensity * 0.2; // Drastically reduced for tiny rocks
      case 'small':
        return baseIntensity * 0.4; // Significantly reduced for small rocks
      case 'medium':
        return baseIntensity * 0.8; // Slightly reduced for medium rocks
      default:
        return baseIntensity; // Full intensity for large/massive rocks
    }
  }
  
  // NEW: Size-aware character deformation
  private applySizeAwareCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape,
    category: string
  ): void {
    // Apply different deformation strategies based on size
    if (category === 'tiny' || category === 'small') {
      // Gentle organic deformation for small rocks
      this.applyGentleOrganicDeformation(geometry, intensity, rockSize);
      
      // Skip detail and roughness deformation for small rocks to prevent spikes
    } else {
      // Use existing deformation for medium+ rocks (unchanged)
      this.applyOrganicNoiseDeformation(geometry, intensity, rockSize);
      this.applyDetailDeformation(geometry, intensity * 0.5, rockSize * 0.4);
      
      if (rockShape.weatheringLevel > 0.7) {
        this.applySurfaceRoughness(geometry, intensity * 0.3, rockSize * 0.2);
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Gentle organic deformation for small rocks
  private applyGentleOrganicDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const maxDisplacement = scale * 0.1; // Very limited displacement
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Single-octave gentle noise
      const noise = Math.sin(x / scale * 0.8) * Math.cos(y / scale * 0.8) * Math.sin(z / scale * 0.8);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = Math.min(Math.abs(noise * intensity), maxDisplacement) * Math.sign(noise);
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  // NEW: Smoothing specifically for small rocks
  private applySmoothingForSmallRocks(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const smoothedPositions = new Float32Array(positions.length);
    
    // Copy original positions
    for (let i = 0; i < positions.length; i++) {
      smoothedPositions[i] = positions[i];
    }
    
    // Apply Laplacian smoothing
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Find neighboring vertices (simplified neighbor detection)
      const neighbors: THREE.Vector3[] = [];
      const currentVertex = new THREE.Vector3(x, y, z);
      
      for (let j = 0; j < positions.length; j += 3) {
        if (j !== i) {
          const neighbor = new THREE.Vector3(positions[j], positions[j + 1], positions[j + 2]);
          const distance = currentVertex.distanceTo(neighbor);
          
          // Consider vertices within a small radius as neighbors
          if (distance < currentVertex.length() * 0.3) {
            neighbors.push(neighbor);
          }
        }
      }
      
      if (neighbors.length > 0) {
        // Calculate average position of neighbors
        const average = new THREE.Vector3();
        neighbors.forEach(neighbor => average.add(neighbor));
        average.divideScalar(neighbors.length);
        
        // Blend current position with neighbor average
        const smoothingFactor = 0.3; // Moderate smoothing
        smoothedPositions[i] = x * (1 - smoothingFactor) + average.x * smoothingFactor;
        smoothedPositions[i + 1] = y * (1 - smoothingFactor) + average.y * smoothingFactor;
        smoothedPositions[i + 2] = z * (1 - smoothingFactor) + average.z * smoothingFactor;
      }
    }
    
    // Apply smoothed positions
    for (let i = 0; i < positions.length; i++) {
      positions[i] = smoothedPositions[i];
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Add small rock debris for grounding effect
  private addSmallRockDebris(rockGroup: THREE.Group, rockSize: number, baseMaterial: THREE.MeshStandardMaterial): void {
    const debrisCount = 2 + Math.floor(Math.random() * 3); // Small amount of debris
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = rockSize * (0.15 + Math.random() * 0.25); // Small debris
      const debris = new THREE.Mesh(
        new THREE.SphereGeometry(debrisSize, 6, 4), // Simple sphere for debris
        baseMaterial.clone()
      );
      
      // Scatter close to the main rock
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (0.8 + Math.random() * 0.6);
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * 0.2,
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
  
  // NEW: Add clustering effect for small rocks
  private addSmallRockClustering(rockGroup: THREE.Group, rockSize: number, baseMaterial: THREE.MeshStandardMaterial, rockShape: RockShape): void {
    const clusterCount = 1 + Math.floor(Math.random() * 2); // 1-2 additional small rocks
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterRockSize = rockSize * (0.6 + Math.random() * 0.3);
      const clusterGeometry = new THREE.SphereGeometry(clusterRockSize, 8, 6);
      
      // Apply very gentle deformation to cluster rocks
      this.applyGentleOrganicDeformation(clusterGeometry, 0.05, clusterRockSize);
      
      const clusterRock = new THREE.Mesh(clusterGeometry, baseMaterial.clone());
      
      // Position cluster rocks nearby
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (1.2 + Math.random() * 0.8);
      clusterRock.position.set(
        Math.cos(angle) * distance,
        clusterRockSize * 0.2,
        Math.sin(angle) * distance
      );
      
      clusterRock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      clusterRock.castShadow = true;
      clusterRock.receiveShadow = true;
      rockGroup.add(clusterRock);
    }
  }
  
  // ... keep existing code (createCharacterBaseGeometry, applyShapeModifications, applyStretchModification, etc. - all the original methods for medium+ rocks remain unchanged)
  
  private createCharacterBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
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
        geometry = this.createOrganicBoulderGeometry(rockSize);
        break;
        
      default:
        geometry = new THREE.IcosahedronGeometry(rockSize, 3);
    }
    
    return geometry;
  }
  
  private createOrganicBoulderGeometry(rockSize: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(rockSize, 20, 16);
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      
      const noise1 = Math.sin(x * 1.5) * Math.cos(y * 1.5) * Math.sin(z * 1.5);
      const noise2 = Math.sin(x * 3) * Math.cos(z * 3) * 0.5;
      const noise3 = Math.cos(y * 4) * Math.sin(x * 2) * 0.3;
      const noise4 = Math.sin(x * 6) * Math.cos(y * 6) * Math.sin(z * 6) * 0.15;
      
      const organicFactor = 1 + (noise1 * 0.25 + noise2 * 0.15 + noise3 * 0.1 + noise4 * 0.05);
      
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
  
  private applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    switch (rockShape.shapeModifier) {
      case 'stretch':
        this.applyStretchModification(positions, rockSize);
        break;
        
      case 'flatten':
        this.applyFlattenModification(positions, rockSize);
        break;
        
      case 'fracture':
        this.applyFractureModification(positions, rockSize);
        break;
        
      case 'erode':
        this.applyErosionModification(positions, rockSize);
        break;
        
      default:
        break;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  private applyStretchModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      
      positions[i + 1] = y * (1.5 + Math.random() * 0.5);
      
      const height = Math.abs(positions[i + 1]);
      const taperFactor = Math.max(0.3, 1 - height / (rockSize * 2));
      positions[i] *= taperFactor;
      positions[i + 2] *= taperFactor;
    }
  }
  
  private applyFlattenModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] *= 0.3 + Math.random() * 0.2;
      positions[i] *= 1.3 + Math.random() * 0.4;
      positions[i + 2] *= 1.3 + Math.random() * 0.4;
    }
  }
  
  private applyFractureModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const facetNoise = Math.floor(x * 3) + Math.floor(y * 3) + Math.floor(z * 3);
      const facetIntensity = (facetNoise % 3) * 0.1;
      
      positions[i] += Math.sign(x) * facetIntensity;
      positions[i + 1] += Math.sign(y) * facetIntensity;
      positions[i + 2] += Math.sign(z) * facetIntensity;
    }
  }
  
  private applyErosionModification(positions: Float32Array, rockSize: number): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const erosion1 = Math.sin(x * 2) * Math.cos(y * 2) * 0.15;
      const erosion2 = Math.sin(z * 3) * Math.cos(x * 1.5) * 0.1;
      
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
  
  private applyCharacterDeformation(
    geometry: THREE.BufferGeometry, 
    intensity: number, 
    rockSize: number, 
    rockShape: RockShape
  ): void {
    this.applyOrganicNoiseDeformation(geometry, intensity, rockSize);
    this.applyDetailDeformation(geometry, intensity * 0.5, rockSize * 0.4);
    
    if (rockShape.weatheringLevel > 0.7) {
      this.applySurfaceRoughness(geometry, intensity * 0.3, rockSize * 0.2);
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
      
      const noise1 = Math.sin(x / scale) * Math.cos(y / scale) * Math.sin(z / scale);
      const noise2 = Math.sin(x / scale * 2) * Math.cos(z / scale * 2) * 0.5;
      const noise3 = Math.cos(y / scale * 3) * Math.sin(x / scale * 3) * 0.25;
      
      const combinedNoise = noise1 + noise2 + noise3;
      
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
  
  private applyDetailDeformation(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const detailNoise = Math.sin(x / scale * 8) * Math.cos(y / scale * 8) * Math.sin(z / scale * 8);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = detailNoise * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  private applySurfaceRoughness(geometry: THREE.BufferGeometry, intensity: number, scale: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const roughness = Math.sin(x / scale * 12) * Math.cos(y / scale * 12) * Math.sin(z / scale * 12);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = roughness * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
  }
  
  private validateAndEnhanceGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
        console.warn('🔧 Fixed invalid vertex position');
      }
    }
    
    this.smoothExtremeVertices(geometry);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  
  private smoothExtremeVertices(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const tempPositions = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length; i++) {
      tempPositions[i] = positions[i];
    }
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const currentLength = Math.sqrt(x * x + y * y + z * z);
      
      let avgLength = 0;
      let count = 0;
      
      for (let j = 0; j < positions.length; j += 3) {
        if (j !== i) {
          const dx = positions[j] - x;
          const dy = positions[j + 1] - y;
          const dz = positions[j + 2] - z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < currentLength * 0.5) {
            const neighborLength = Math.sqrt(
              positions[j] * positions[j] + 
              positions[j + 1] * positions[j + 1] + 
              positions[j + 2] * positions[j + 2]
            );
            avgLength += neighborLength;
            count++;
          }
        }
      }
      
      if (count > 0) {
        avgLength /= count;
        
        if (Math.abs(currentLength - avgLength) > avgLength * 0.3) {
          const smoothFactor = 0.7;
          const targetLength = currentLength * (1 - smoothFactor) + avgLength * smoothFactor;
          
          if (currentLength > 0) {
            const scale = targetLength / currentLength;
            tempPositions[i] = x * scale;
            tempPositions[i + 1] = y * scale;
            tempPositions[i + 2] = z * scale;
          }
        }
      }
    }
    
    for (let i = 0; i < positions.length; i++) {
      positions[i] = tempPositions[i];
    }
  }
  
  // ... keep existing code (all remaining methods - addSurfaceFeatures through dispose remain unchanged)
  
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
      
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.2) * rockSize * 0.6;
      lichen.position.set(
        Math.cos(angle) * rockSize * 0.85,
        height,
        Math.sin(angle) * rockSize * 0.85
      );
      
      lichen.lookAt(new THREE.Vector3(0, 0, 0));
      rockGroup.add(lichen);
    }
  }
  
  // ... keep existing code (all feature generation methods remain unchanged)
  
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
