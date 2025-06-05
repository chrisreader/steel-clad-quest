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

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private treeModels: THREE.Object3D[] = [];
  private rockModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];
  
  // NEW: Enhanced rock variation system
  private rockVariations: RockVariation[] = [
    { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false },
    { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false },
    { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false },
    { category: 'large', sizeRange: [2.0, 4.0], weight: 1.8, isCluster: true, clusterSize: [3, 6] },
    { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.2, isCluster: true, clusterSize: [5, 8] }
  ];
  
  // Track spawned objects by region for cleanup
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Track large rock formations to maintain distance
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 100; // Minimum distance between large formations
  
  // Tavern exclusion zone
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15; // Keep clear area around tavern
  
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
    
    // ENHANCED Rock models with 5 size categories (15 total variations)
    this.createRockVariations();
    
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
  
  // NEW: Create enhanced rock variations across all size categories
  private createRockVariations(): void {
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = variation.category === 'tiny' || variation.category === 'small' ? 4 : 3;
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        if (variation.isCluster) {
          // Create multi-rock cluster for large/massive categories
          this.createRockCluster(rockGroup, variation, i);
        } else {
          // Create single rock for tiny/small/medium categories
          this.createSingleRock(rockGroup, variation, i);
        }
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} rock variations across 5 size categories`);
  }
  
  // NEW: Create single rock with enhanced geometry and materials
  private createSingleRock(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    // Enhanced rock geometry with more variation
    let rockGeometry: THREE.BufferGeometry;
    const rockType = index % 4; // 4 different base shapes per category
    
    switch (rockType) {
      case 0: // Irregular boulder with light deformation
        rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
        this.deformGeometry(rockGeometry, 0.05 + Math.random() * 0.1);
        break;
        
      case 1: // Flattened sedimentary rock
        rockGeometry = new THREE.SphereGeometry(rockSize, 8, 6);
        rockGeometry.scale(1, 0.4 + Math.random() * 0.4, 1);
        this.deformGeometry(rockGeometry, 0.03 + Math.random() * 0.05);
        break;
        
      case 2: // Angular volcanic rock
        rockGeometry = new THREE.OctahedronGeometry(rockSize, 1);
        this.deformGeometry(rockGeometry, 0.06 + Math.random() * 0.08);
        break;
        
      default: // Rounded river rock
        rockGeometry = new THREE.SphereGeometry(rockSize, 12, 8);
        this.deformGeometry(rockGeometry, 0.02 + Math.random() * 0.04);
        break;
    }
    
    // Enhanced material based on size and type
    const rockMaterial = this.createRockMaterial(variation.category, index);
    
    const mainRock = new THREE.Mesh(rockGeometry, rockMaterial);
    mainRock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mainRock.position.y = rockSize * 0.3;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    
    // Add some weathering details for larger rocks
    if (variation.category === 'medium') {
      this.addRockDetails(rockGroup, rockSize, rockMaterial);
    }
    
    rockGroup.add(mainRock);
  }
  
  // NEW: Create multi-rock cluster formation
  private createRockCluster(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 6];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Different cluster arrangements
    const patterns = ['circular', 'linear', 'scattered', 'pyramid'];
    const pattern = patterns[index % patterns.length];
    
    for (let i = 0; i < clusterCount; i++) {
      const rockSize = (minSize + Math.random() * (maxSize - minSize)) * (0.7 + Math.random() * 0.6);
      
      // Create individual rock in cluster
      const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
      this.deformGeometry(rockGeometry, 0.05 + Math.random() * 0.1);
      
      const rockMaterial = this.createRockMaterial(variation.category, i);
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      // Position based on cluster pattern
      const position = this.getClusterPosition(i, clusterCount, pattern, maxSize);
      rock.position.copy(position);
      rock.position.y = rockSize * 0.3 + Math.random() * 0.5; // Slight height variation
      
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      rock.castShadow = true;
      rock.receiveShadow = true;
      rockGroup.add(rock);
    }
    
    // Add cluster details for massive formations
    if (variation.category === 'massive') {
      this.addMassiveFormationDetails(rockGroup, maxSize);
    }
    
    console.log(`🏔️ Created ${variation.category} rock cluster with ${clusterCount} rocks in ${pattern} pattern`);
  }
  
  // NEW: Get position for rock in cluster based on pattern
  private getClusterPosition(index: number, total: number, pattern: string, maxSize: number): THREE.Vector3 {
    const baseRadius = maxSize * 0.8;
    
    switch (pattern) {
      case 'circular':
        const circleAngle = (index / total) * Math.PI * 2;
        const circleRadius = baseRadius * (0.5 + Math.random() * 0.5);
        return new THREE.Vector3(
          Math.cos(circleAngle) * circleRadius,
          0,
          Math.sin(circleAngle) * circleRadius
        );
        
      case 'linear':
        const linePosition = (index / (total - 1)) * baseRadius * 2 - baseRadius;
        return new THREE.Vector3(
          linePosition + (Math.random() - 0.5) * baseRadius * 0.3,
          0,
          (Math.random() - 0.5) * baseRadius * 0.5
        );
        
      case 'pyramid':
        if (index === 0) {
          return new THREE.Vector3(0, baseRadius * 0.5, 0); // Top rock
        }
        const pyramidAngle = ((index - 1) / (total - 1)) * Math.PI * 2;
        const pyramidRadius = baseRadius * 0.7;
        return new THREE.Vector3(
          Math.cos(pyramidAngle) * pyramidRadius,
          0,
          Math.sin(pyramidAngle) * pyramidRadius
        );
        
      default: // scattered
        return new THREE.Vector3(
          (Math.random() - 0.5) * baseRadius * 1.5,
          0,
          (Math.random() - 0.5) * baseRadius * 1.5
        );
    }
  }
  
  // NEW: Enhanced rock material creation
  private createRockMaterial(category: string, index: number): THREE.MeshStandardMaterial {
    // Different rock types with enhanced properties
    const rockTypes = [
      { color: 0x8B7355, roughness: 0.9, metalness: 0.1, name: 'granite' },
      { color: 0x696969, roughness: 0.85, metalness: 0.05, name: 'basalt' },
      { color: 0xA0A0A0, roughness: 0.8, metalness: 0.15, name: 'limestone' },
      { color: 0x8B7D6B, roughness: 0.95, metalness: 0.0, name: 'sandstone' },
      { color: 0x556B2F, roughness: 0.9, metalness: 0.05, name: 'moss_covered' }
    ];
    
    const rockType = rockTypes[index % rockTypes.length];
    
    // Size-based material adjustments
    let roughnessMultiplier = 1.0;
    let weatheringFactor = 0.0;
    
    switch (category) {
      case 'tiny':
      case 'small':
        roughnessMultiplier = 1.1; // Smoother small rocks
        break;
      case 'large':
      case 'massive':
        weatheringFactor = 0.3; // Add weathering to large rocks
        break;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rockType.color),
      map: TextureGenerator.createStoneTexture(),
      roughness: Math.min(1.0, rockType.roughness * roughnessMultiplier),
      metalness: rockType.metalness,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });
    
    // Add weathering tint for large formations
    if (weatheringFactor > 0) {
      const weatherColor = new THREE.Color(rockType.color);
      weatherColor.lerp(new THREE.Color(0x4A4A2A), weatheringFactor);
      material.color.copy(weatherColor);
    }
    
    return material;
  }
  
  // FIXED: Improved geometry deformation for more natural rocks
  private deformGeometry(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Use vertex position to create consistent noise-based deformation
      const noiseX = Math.sin(x * 10) * Math.cos(y * 10);
      const noiseY = Math.sin(y * 10) * Math.cos(z * 10);
      const noiseZ = Math.sin(z * 10) * Math.cos(x * 10);
      
      // Apply subtle deformation based on noise
      positions[i] += noiseX * intensity;
      positions[i + 1] += noiseY * intensity;
      positions[i + 2] += noiseZ * intensity;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  // NEW: Add details to medium rocks
  private addRockDetails(rockGroup: THREE.Group, rockSize: number, baseMaterial: THREE.MeshStandardMaterial): void {
    // 25% chance to add small debris around medium rocks
    if (Math.random() < 0.25) {
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        const debrisSize = rockSize * (0.1 + Math.random() * 0.2);
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
        debris.rotation.set(Math.random(), Math.random(), Math.random());
        debris.castShadow = true;
        debris.receiveShadow = true;
        rockGroup.add(debris);
      }
    }
  }
  
  // NEW: Add details to massive formations
  private addMassiveFormationDetails(rockGroup: THREE.Group, maxSize: number): void {
    // Add moss patches (40% chance)
    if (Math.random() < 0.4) {
      for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
        const mossSize = maxSize * (0.15 + Math.random() * 0.25);
        const moss = new THREE.Mesh(
          new THREE.SphereGeometry(mossSize, 6, 4),
          new THREE.MeshStandardMaterial({
            color: 0x2F4F2F,
            roughness: 0.95,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
          })
        );
        
        moss.position.set(
          (Math.random() - 0.5) * maxSize * 1.5,
          Math.random() * maxSize * 0.5,
          (Math.random() - 0.5) * maxSize * 1.5
        );
        moss.scale.set(1, 0.3, 1); // Flatten moss
        rockGroup.add(moss);
      }
    }
    
    // Add small vegetation growing in cracks (20% chance)
    if (Math.random() < 0.2) {
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        const plant = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.5, 6),
          new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9
          })
        );
        
        plant.position.set(
          (Math.random() - 0.5) * maxSize,
          0.25,
          (Math.random() - 0.5) * maxSize
        );
        rockGroup.add(plant);
      }
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
    
    // Ring-specific feature generation with enhanced rock spawning
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
  
  // Generate evenly distributed features (for ring 0) with enhanced rock diversity
  private generateEvenlyDistributedFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Generate trees (10-15)
    this.spawnRandomFeatures(region, 'forest', 12, features);
    
    // Generate enhanced rock variations (25-35 total rocks across all sizes)
    this.spawnEnhancedRocks(region, 30, features);
    
    // Generate bushes (15-20)
    this.spawnRandomFeatures(region, 'bushes', 18, features);
  }
  
  // Generate clustered features (for ring 1) with more large rocks
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
    this.spawnEnhancedRocks(region, 40, features); // More rocks in ring 1
    this.spawnRandomFeatures(region, 'bushes', 10, features);
  }
  
  // Generate sparse features (for ring 2) with more large rock formations
  private generateSparseFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Fewer trees, more rocks with larger formations
    this.spawnRandomFeatures(region, 'forest', 8, features);
    this.spawnEnhancedRocks(region, 50, features); // Many more rocks
    this.spawnRandomFeatures(region, 'bushes', 5, features);
  }
  
  // Generate wasteland features (for ring 3) with massive rock formations
  private generateWastelandFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    // Mostly rocks, very few plants, focus on large formations
    this.spawnRandomFeatures(region, 'forest', 2, features);
    this.spawnEnhancedRocks(region, 60, features); // Maximum rock density
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
