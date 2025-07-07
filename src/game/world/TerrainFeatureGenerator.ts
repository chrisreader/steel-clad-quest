import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { ROCK_VARIATIONS, RockVariation } from './rocks/config/RockVariationConfig';
import { ROCK_SHAPES, RockShape } from './rocks/config/RockShapeConfig';
import { RockMaterialGenerator } from './rocks/materials/RockMaterialGenerator';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { TreeGenerator, BushGenerator } from './vegetation';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';
import { GlobalFeatureManager } from '../systems/GlobalFeatureManager';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  
  // Vegetation generators
  private treeGenerator: TreeGenerator;
  private bushGenerator: BushGenerator;
  
  private rockModels: THREE.Object3D[] = [];
  
  // Use imported configurations
  private rockVariations: RockVariation[] = ROCK_VARIATIONS;
  private rockShapes: RockShape[] = ROCK_SHAPES;
  
  // Rock cluster generator
  private rockClusterGenerator: RockClusterGenerator = new RockClusterGenerator();
  
  // DEPRECATED: Legacy region-based feature tracking - being phased out
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // REMOVED: Local feature tracking - now handled by GlobalFeatureManager only
  
  // Track large rock formations to maintain distance
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 150;
  
  // Tavern exclusion zone
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15;
  
  // NEW: Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  // Player position for accurate distance calculations
  private currentPlayerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Global feature manager for persistent world features
  private globalFeatureManager: GlobalFeatureManager;
  
  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    
    // Initialize vegetation generators
    this.treeGenerator = new TreeGenerator();
    this.bushGenerator = new BushGenerator();
    
    // Initialize global feature manager
    this.globalFeatureManager = GlobalFeatureManager.getInstance(scene);
    
    this.loadRockModels();
    
    console.log('TerrainFeatureGenerator initialized with global feature tracking');
  }
  
  // NEW: Set collision registration callback
  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
    console.log('🔧 TerrainFeatureGenerator collision registration callback set');
  }
  
  // NEW: Update current player position for accurate distance calculations
  public updatePlayerPosition(playerPosition: THREE.Vector3): void {
    this.currentPlayerPosition.copy(playerPosition);
  }
  
  // NEW: Get current player position for feature registration
  private getCurrentPlayerPosition(): THREE.Vector3 {
    return this.currentPlayerPosition.clone();
  }
  
  // REMOVED: Local feature visibility - now handled by GlobalFeatureManager only
  
  // Register a feature in the global system only (like tree foliage)
  private registerFeature(object: THREE.Object3D, position: THREE.Vector3): void {
    const featureId = `feature_${Date.now()}_${Math.random()}`;
    
    // Only register with global feature manager - no local tracking
    const featureType = this.getFeatureType(object);
    
    // FIXED: Use actual current player position from SceneManager
    const currentPlayerPosition = this.getCurrentPlayerPosition();
    this.globalFeatureManager.registerFeature(
      featureId,
      object,
      position,
      featureType,
      currentPlayerPosition
    );
    
    // Register for collision detection
    if (this.collisionRegistrationCallback) {
      this.collisionRegistrationCallback(object);
    }
    
    console.log(`🌍 [TerrainFeatureGenerator] Registered ${featureType} feature: ${featureId} globally`);
  }
  
  // Helper to determine feature type more accurately
  private getFeatureType(object: THREE.Object3D): 'tree' | 'rock' | 'bush' {
    if (object.children.length > 8) return 'tree';  // Trees have many parts
    if (object.children.length > 2) return 'bush';  // Bushes have several parts  
    return 'rock'; // Rocks are simple
  }
  
  // NEW: Dispose a single feature properly
  private disposeFeature(feature: THREE.Object3D): void {
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
  }
  
  // NEW: Get spawned features for a region (for manual collision registration)
  public getSpawnedFeaturesForRegion(regionKey: string): THREE.Object3D[] | undefined {
    return this.spawnedFeatures.get(regionKey);
  }
  
  private loadRockModels(): void {
    // ENHANCED: Create rock variations with size-aware quality control
    this.createEnhancedRockVariations();
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
    
    // NEW: Add environmental details for medium and large clusters
    if (variation.category === 'medium' || variation.category === 'large' || variation.category === 'massive') {
      this.addClusterEnvironmentalDetails(rockGroup, variation, maxSize);
    }
  }
  
  // NEW: Add environmental details specifically for larger rock clusters
  private addClusterEnvironmentalDetails(rockGroup: THREE.Group, variation: RockVariation, clusterSize: number): void {
    // Add sediment accumulation in low spots
    this.addSedimentAccumulation(rockGroup, variation.category, clusterSize);
    
    // Add debris field around cluster base
    this.addDebrisField(rockGroup, variation.category, clusterSize);
    
    console.log(`🌫️ Added environmental details to ${variation.category} rock cluster (sediment + debris)`);
  }
  
  // NEW: Add sediment accumulation around larger formations
  private addSedimentAccumulation(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    const sedimentCount = category === 'massive' ? 12 + Math.floor(Math.random() * 3) : // 12-14 particles
                         category === 'large' ? 8 + Math.floor(Math.random() * 4) :     // 8-11 particles  
                         6 + Math.floor(Math.random() * 3);                            // 6-8 particles for medium
    
    // Create realistic sediment materials (beige/tan weathered colors) - FULLY OPAQUE
    const sedimentMaterials = [
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C4A484'), // Light beige
        roughness: 0.95,
        metalness: 0.0
        // Removed transparent and opacity for full opacity
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B8956A'), // Medium tan
        roughness: 0.95,
        metalness: 0.0
        // Removed transparent and opacity for full opacity
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#A0855B'), // Dark tan
        roughness: 0.95,
        metalness: 0.0
        // Removed transparent and opacity for full opacity
      })
    ];
    
    for (let i = 0; i < sedimentCount; i++) {
      const sedimentType = Math.floor(Math.random() * 3);
      let sedimentGeometry: THREE.BufferGeometry;
      let sediment: THREE.Mesh;
      
      // Create varied sediment geometries
      switch (sedimentType) {
        case 0: // Flat sediment patches
          const patchSize = clusterSize * (0.08 + Math.random() * 0.06);
          sedimentGeometry = new THREE.PlaneGeometry(patchSize, patchSize * (0.6 + Math.random() * 0.8));
          sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterials[Math.floor(Math.random() * 3)].clone());
          sediment.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; // Mostly flat with slight variation
          break;
          
        case 1: // Flattened cylinder sediment
          const cylinderRadius = clusterSize * (0.03 + Math.random() * 0.04);
          sedimentGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderRadius * 0.2, 8);
          sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterials[Math.floor(Math.random() * 3)].clone());
          break;
          
        default: // Small spherical particles
          const sphereSize = clusterSize * (0.02 + Math.random() * 0.03);
          sedimentGeometry = new THREE.SphereGeometry(sphereSize, 6, 4);
          sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterials[Math.floor(Math.random() * 3)].clone());
          // Flatten spheres to simulate accumulated sediment
          sediment.scale.set(
            1 + Math.random() * 0.3,
            0.3 + Math.random() * 0.2, // Flattened Y
            1 + Math.random() * 0.3
          );
          break;
      }
      
      // Position sediment in "low spots" with clustering
      const angle = Math.random() * Math.PI * 2;
      const distance = clusterSize * (0.9 + Math.random() * 0.8); // Closer to cluster base
      const heightVariation = -sediment.scale.y * 0.3; // Slightly sunken for realism
      
      // Add clustering effect - group some sediment together
      const clusterOffset = (Math.random() < 0.4) ? {
        x: (Math.random() - 0.5) * clusterSize * 0.2,
        z: (Math.random() - 0.5) * clusterSize * 0.2
      } : { x: 0, z: 0 };
      
      sediment.position.set(
        Math.cos(angle) * distance + clusterOffset.x,
        heightVariation,
        Math.sin(angle) * distance + clusterOffset.z
      );
      
      sediment.rotation.y = Math.random() * Math.PI * 2;
      sediment.castShadow = true;
      sediment.receiveShadow = true;
      rockGroup.add(sediment);
    }
  }
  
  // NEW: Add debris field around cluster base
  private addDebrisField(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    const debrisCount = category === 'massive' ? 16 + Math.floor(Math.random() * 5) : // 16-20 fragments
                       category === 'large' ? 12 + Math.floor(Math.random() * 5) :     // 12-16 fragments
                       8 + Math.floor(Math.random() * 5);                             // 8-12 fragments for medium
    
    // Create realistic beige sediment materials - FULLY OPAQUE
    const sedimentMaterials = [
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C4A484'), // Light beige
        roughness: 0.95,
        metalness: 0.0
        // Removed transparent and opacity for full opacity
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B8956A'), // Medium tan
        roughness: 0.95,
        metalness: 0.0
        // Removed transparent and opacity for full opacity
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#A0855B'), // Dark tan
        roughness: 0.95,
        metalness: 0.0
        // Removed transparent and opacity for full opacity
      })
    ];

    // Create base debris material (similar to main rock but weathered)
    const baseRockMaterial = RockMaterialGenerator.createEnhancedRockMaterial(category, this.rockShapes[0], 0);

    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = clusterSize * (0.04 + Math.random() * 0.08); // Small to medium fragments
      let debrisGeometry: THREE.BufferGeometry;
      let debrisMaterial: THREE.MeshStandardMaterial;
      
      // 60% chance for sediment (beige pebbles), 40% chance for rock fragments
      const isSediment = Math.random() < 0.6;
      
      if (isSediment) {
        // Create oval/pebble sediment shapes with beige colors
        const pebbleType = Math.floor(Math.random() * 4);
        
        switch (pebbleType) {
          case 0: // Flattened oval pebbles
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            // Apply oval scaling (wider and flatter)
            const ovalScale = new THREE.Vector3(
              1.2 + Math.random() * 0.8, // Width variation
              0.3 + Math.random() * 0.2,  // Flattened height
              0.8 + Math.random() * 0.6   // Depth variation
            );
            debrisGeometry.scale(ovalScale.x, ovalScale.y, ovalScale.z);
            break;
            
          case 1: // Organic diamond-like elongated pebbles (FIXED - no more perfect pills)
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            // Create organic diamond-like proportions
            const diamondScale = new THREE.Vector3(
              0.4 + Math.random() * 0.3,  // Narrow width
              0.3 + Math.random() * 0.2,  // Squashed height
              1.8 + Math.random() * 0.8   // Elongated depth for diamond shape
            );
            debrisGeometry.scale(diamondScale.x, diamondScale.y, diamondScale.z);
            
            // Apply organic deformation to break perfect shape
            const positions = debrisGeometry.attributes.position.array as Float32Array;
            for (let j = 0; j < positions.length; j += 3) {
              const x = positions[j];
              const y = positions[j + 1];
              const z = positions[j + 2];
              
              // Create organic diamond-like deformation
              const length = Math.sqrt(x * x + y * y + z * z);
              if (length > 0) {
                // Add gentle irregularity to create organic diamond shape
                const organicNoise = Math.sin(x * 8) * Math.cos(z * 6) * 0.15;
                const edgeVariation = Math.sin(y * 10) * Math.cos(x * 8) * 0.1;
                
                const totalDeformation = organicNoise + edgeVariation;
                const normalX = x / length;
                const normalY = y / length;
                const normalZ = z / length;
                
                positions[j] += normalX * totalDeformation * debrisSize;
                positions[j + 1] += normalY * totalDeformation * debrisSize;
                positions[j + 2] += normalZ * totalDeformation * debrisSize;
              }
            }
            debrisGeometry.attributes.position.needsUpdate = true;
            debrisGeometry.computeVertexNormals();
            break;
            
          case 2: // Round flat pebbles
            debrisGeometry = new THREE.CylinderGeometry(
              debrisSize * (0.8 + Math.random() * 0.4),
              debrisSize * (0.6 + Math.random() * 0.4),
              debrisSize * (0.2 + Math.random() * 0.15), // Very flat
              12
            );
            break;
            
          default: // Smooth rounded pebbles
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            // Apply gentle oval scaling
            const smoothScale = new THREE.Vector3(
              0.9 + Math.random() * 0.4,
              0.6 + Math.random() * 0.3,
              0.8 + Math.random() * 0.5
            );
            debrisGeometry.scale(smoothScale.x, smoothScale.y, smoothScale.z);
            break;
        }
        
        // Use beige sediment material
        debrisMaterial = sedimentMaterials[Math.floor(Math.random() * 3)].clone();
        
      } else {
        // Create angular rock fragments
        const fragmentType = Math.floor(Math.random() * 4);
        
        switch (fragmentType) {
          case 0: // Angular flat rock slabs
            debrisGeometry = new THREE.BoxGeometry(
              debrisSize * (1.5 + Math.random() * 1.0),
              debrisSize * (0.2 + Math.random() * 0.3), // Very flat
              debrisSize * (0.8 + Math.random() * 0.6)
            );
            // Add slight organic deformation to avoid perfect rectangles
            this.applyGentleOrganicDeformation(debrisGeometry, 0.1, debrisSize);
            break;
            
          case 1: // Angular chunks
            debrisGeometry = new THREE.DodecahedronGeometry(debrisSize, 0);
            break;
            
          case 2: // Irregular fragments
            debrisGeometry = new THREE.IcosahedronGeometry(debrisSize, 0);
            break;
            
          default: // Weathered rock pieces
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
            // Apply rough organic deformation for weathered look
            this.applyGentleOrganicDeformation(debrisGeometry, 0.15, debrisSize);
            break;
        }
        
        // Use weathered rock material
        debrisMaterial = baseRockMaterial.clone();
        debrisMaterial.color.multiplyScalar(0.7 + Math.random() * 0.5); // Darker, weathered look
        debrisMaterial.roughness = Math.min(1.0, debrisMaterial.roughness + 0.1 + Math.random() * 0.2);
      }

      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Create clustered distribution pattern
      const isInCluster = Math.random() < 0.6; // 60% chance of being in a cluster
      let angle, distance;
      
      if (isInCluster && i > 0) {
        // Position near previous debris for clustering effect
        const previousDebris = rockGroup.children[rockGroup.children.length - 1];
        if (previousDebris instanceof THREE.Mesh) {
          angle = Math.atan2(previousDebris.position.z, previousDebris.position.x) + (Math.random() - 0.5) * 0.8;
          distance = previousDebris.position.length() + debrisSize * (1 + Math.random() * 2);
        } else {
          angle = Math.random() * Math.PI * 2;
          distance = clusterSize * (1.3 + Math.random() * 1.2);
        }
      } else {
        // Scatter debris around cluster base in realistic pattern
        angle = Math.random() * Math.PI * 2;
        distance = clusterSize * (1.2 + Math.random() * 1.3); // Spread around cluster
      }
      
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * (0.1 + Math.random() * 0.2), // Slightly embedded/resting
        Math.sin(angle) * distance
      );
      
      // Natural but not extreme orientation
      debris.rotation.set(
        Math.random() * Math.PI * 0.3, // Limit extreme rotations for realism
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      );
      
      // Size variation for natural look
      const scaleVariation = 0.6 + Math.random() * 0.8;
      debris.scale.set(scaleVariation, scaleVariation, scaleVariation);
      
      debris.castShadow = true;
      debris.receiveShadow = true;
      rockGroup.add(debris);
    }
    
    // Add clustered tiny pebbles for micro-detail
    this.addClusteredTinyPebbles(rockGroup, category, clusterSize, sedimentMaterials);
  }
  
  // NEW: Add clustered tiny pebbles for enhanced realism
  private addClusteredTinyPebbles(rockGroup: THREE.Group, category: string, clusterSize: number, sedimentMaterials: THREE.MeshStandardMaterial[]): void {
    const clusterCount = category === 'massive' ? 3 + Math.floor(Math.random() * 3) : // 3-5 clusters
                        category === 'large' ? 2 + Math.floor(Math.random() * 3) :     // 2-4 clusters
                        1 + Math.floor(Math.random() * 2);                            // 1-2 clusters for medium

    for (let cluster = 0; cluster < clusterCount; cluster++) {
      // Position cluster randomly around formation
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = clusterSize * (1.4 + Math.random() * 0.8);
      const clusterCenter = new THREE.Vector3(
        Math.cos(clusterAngle) * clusterDistance,
        0,
        Math.sin(clusterAngle) * clusterDistance
      );
      
      // Create 6-12 tiny pebbles per cluster
      const pebbleCount = 6 + Math.floor(Math.random() * 7);
      
      for (let i = 0; i < pebbleCount; i++) {
        const tinySize = clusterSize * (0.008 + Math.random() * 0.015); // Very small pebbles
        
        // Create small oval pebbles
        const pebbleGeometry = new THREE.SphereGeometry(tinySize, 6, 4);
        
        // Apply oval scaling for natural pebble shape
        const ovalScale = new THREE.Vector3(
          0.8 + Math.random() * 0.5, // Width
          0.4 + Math.random() * 0.3, // Flattened height
          0.7 + Math.random() * 0.4  // Depth
        );
        pebbleGeometry.scale(ovalScale.x, ovalScale.y, ovalScale.z);
        
        const pebbleMaterial = sedimentMaterials[Math.floor(Math.random() * 3)].clone();
        pebbleMaterial.color.multiplyScalar(0.8 + Math.random() * 0.4); // Color variation
        
        const tinyPebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
        
        // Position within cluster with natural spacing
        const localAngle = Math.random() * Math.PI * 2;
        const localDistance = tinySize * (3 + Math.random() * 10); // Natural spacing
        
        tinyPebble.position.set(
          clusterCenter.x + Math.cos(localAngle) * localDistance,
          tinySize * 0.2, // Slightly embedded in ground
          clusterCenter.z + Math.sin(localAngle) * localDistance
        );
        
        tinyPebble.rotation.set(
          Math.random() * Math.PI * 0.2, // Gentle rotation
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 0.2
        );
        
        // Slight size variation
        const scale = 0.7 + Math.random() * 0.6;
        tinyPebble.scale.set(scale, scale, scale);
        
        tinyPebble.castShadow = true;
        tinyPebble.receiveShadow = true;
        rockGroup.add(tinyPebble);
      }
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
        // NEW: Detect spire rock type and apply controlled stretching
        if (rockShape.type === 'spire') {
          this.applySpireSpecificStretching(geometry, rockSize, rockShape);
        } else {
          this.applyStretchModification(positions, rockSize);
        }
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
  
  // NEW: Spire-specific controlled stretching to prevent wireframe distortion
  private applySpireSpecificStretching(geometry: THREE.BufferGeometry, rockSize: number, rockShape: RockShape): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertex = new THREE.Vector3();
    
    console.log(`🏔️ Applying spire-specific stretching for rock size ${rockSize}`);
    
    // Calculate maximum safe displacement to prevent mesh gaps
    const maxVerticalStretch = rockSize * 2.0; // More conservative than original
    const maxRadialTaper = 0.4; // Limit radial scaling to prevent extreme thinning
    
    for (let i = 0; i < positions.length; i += 3) {
      vertex.set(positions[i], positions[i + 1], positions[i + 2]);
      const originalY = vertex.y;
      const originalRadius = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      
      // Apply controlled vertical stretching with limits
      const stretchFactor = Math.min(1.8, 1.0 + Math.abs(originalY) / rockSize);
      vertex.y = Math.sign(originalY) * Math.min(Math.abs(originalY * stretchFactor), maxVerticalStretch);
      
      // Apply gradual tapering based on height to create cone effect
      const heightRatio = Math.abs(vertex.y) / maxVerticalStretch;
      const taperFactor = Math.max(maxRadialTaper, 1.0 - heightRatio * 0.6);
      
      // Ensure we don't taper too aggressively near the tip
      const safeTaperFactor = Math.max(0.3, taperFactor);
      
      if (originalRadius > 0) {
        vertex.x *= safeTaperFactor;
        vertex.z *= safeTaperFactor;
      }
      
      positions[i] = vertex.x;
      positions[i + 1] = vertex.y;
      positions[i + 2] = vertex.z;
    }
    
    // Apply spire-specific geometry validation
    this.validateSpireGeometry(geometry, rockSize);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    console.log(`🏔️ Spire-specific stretching complete with controlled deformation`);
  }
  
  // NEW: Validation specifically for spire geometry to detect and fix mesh issues
  private validateSpireGeometry(geometry: THREE.BufferGeometry, rockSize: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const indices = geometry.index;
    
    if (!indices) return;
    
    let repairedVertices = 0;
    const vertex1 = new THREE.Vector3();
    const vertex2 = new THREE.Vector3();
    const vertex3 = new THREE.Vector3();
    
    // Check each triangle for degenerate cases
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i) * 3;
      const b = indices.getX(i + 1) * 3;
      const c = indices.getX(i + 2) * 3;
      
      vertex1.set(positions[a], positions[a + 1], positions[a + 2]);
      vertex2.set(positions[b], positions[b + 1], positions[b + 2]);
      vertex3.set(positions[c], positions[c + 1], positions[c + 2]);
      
      // Calculate triangle area
      const edge1 = vertex2.clone().sub(vertex1);
      const edge2 = vertex3.clone().sub(vertex1);
      const area = edge1.cross(edge2).length() * 0.5;
      
      // If triangle is too small (degenerate), repair vertices
      if (area < 0.001) {
        // Move vertices slightly apart to create valid triangle
        const center = vertex1.clone().add(vertex2).add(vertex3).divideScalar(3);
        const offset = rockSize * 0.01;
        
        vertex1.lerp(center, 0.1).add(new THREE.Vector3(offset, 0, 0));
        vertex2.lerp(center, 0.1).add(new THREE.Vector3(0, offset, 0));
        vertex3.lerp(center, 0.1).add(new THREE.Vector3(0, 0, offset));
        
        positions[a] = vertex1.x;
        positions[a + 1] = vertex1.y;
        positions[a + 2] = vertex1.z;
        
        positions[b] = vertex2.x;
        positions[b + 1] = vertex2.y;
        positions[b + 2] = vertex2.z;
        
        positions[c] = vertex3.x;
        positions[c + 1] = vertex3.y;
        positions[c + 2] = vertex3.z;
        
        repairedVertices += 3;
      }
    }
    
    if (repairedVertices > 0) {
      console.log(`🔧 Repaired ${repairedVertices} vertices in spire geometry to prevent wireframe distortion`);
    }
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
  
  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    console.log(`🌍 [TerrainFeatureGenerator] generateFeaturesForRegion called for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    if (this.spawnedFeatures.has(regionKey)) {
      console.log(`🌍 [TerrainFeatureGenerator] Region ${regionKey} already has features, skipping`);
      return;
    }
    
    console.log(`🌍 [TerrainFeatureGenerator] Generating features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant} - using player-distance management`);
    
    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);
    
    // INFINITE DENSE BIOME-AWARE FEATURE GENERATION
    this.generateDenseBiomeFeatures(region, features);
  }
  
  // DENSE BIOME-AWARE FEATURE GENERATION - Infinite world support
  private generateDenseBiomeFeatures(region: RegionCoordinates, features: THREE.Object3D[]): void {
    const biomeType = this.getBiomeType(region);
    const density = this.getFeatureDensity(region);
    
    console.log(`🌍 Generating DENSE ${biomeType} biome features for Ring ${region.ringIndex}, Quadrant ${region.quadrant} (density: ${density.toFixed(2)})`);
    
    // DRAMATICALLY INCREASED FEATURE COUNTS for realistic environments
    const baseCounts = this.getBaseFeatureCounts(region, biomeType);
    const scaledCounts = {
      trees: Math.floor(baseCounts.trees * density),
      rocks: Math.floor(baseCounts.rocks * density), 
      bushes: Math.floor(baseCounts.bushes * density)
    };
    
    console.log(`🌲 Spawning ${scaledCounts.trees} trees, 🪨 ${scaledCounts.rocks} rocks, 🌿 ${scaledCounts.bushes} bushes`);
    
    // Generate biome-specific features
    this.generateBiomeSpecificFeatures(region, biomeType, scaledCounts, features);
    
    // Add procedural landmarks and adventure content
    this.generateProceduralLandmarks(region, biomeType, features);
    
    // Create micro-biomes within the region
    this.generateMicroBiomes(region, biomeType, features);
  }
  
  // BIOME TYPE DETERMINATION - Ring-Quadrant based biomes
  private getBiomeType(region: RegionCoordinates): string {
    if (region.ringIndex <= 1) {
      return 'grassland'; // Safe starting area
    }
    
    // Ring 2+: Quadrant-specific biomes
    switch (region.quadrant) {
      case 0: return 'desert';    // Northeast: Desert canyons and oases
      case 1: return 'forest';    // Southeast: Dense woodlands 
      case 2: return 'swamp';     // Southwest: Wetlands and marshes
      case 3: return 'mountain';  // Northwest: Rocky highlands
      default: return 'grassland';
    }
  }
  
  // FEATURE DENSITY CALCULATION - More features at higher rings
  private getFeatureDensity(region: RegionCoordinates): number {
    // Base density increases with ring index (more content further out)
    const baseDensity = 1.0 + (region.ringIndex * 0.3); // 1.0, 1.3, 1.6, 1.9...
    
    // Random variation to prevent predictability
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    
    return Math.min(3.0, baseDensity * randomFactor); // Cap at 3x density
  }
  
  // BASE FEATURE COUNTS - DRAMATICALLY INCREASED for realistic worlds
  private getBaseFeatureCounts(region: RegionCoordinates, biomeType: string): {
    trees: number;
    rocks: number; 
    bushes: number;
  } {
    // Base counts are now 3-5x higher than before
    const baseMultiplier = 1.0 + (region.ringIndex * 0.2); // Slight increase with distance
    
    switch (biomeType) {
      case 'grassland':
        return {
          trees: Math.floor((40 + Math.random() * 20) * baseMultiplier),    // 40-60 trees
          rocks: Math.floor((60 + Math.random() * 40) * baseMultiplier),    // 60-100 rocks
          bushes: Math.floor((50 + Math.random() * 30) * baseMultiplier)    // 50-80 bushes
        };
        
      case 'desert':
        return {
          trees: Math.floor((15 + Math.random() * 10) * baseMultiplier),    // 15-25 cacti/dead trees
          rocks: Math.floor((80 + Math.random() * 60) * baseMultiplier),    // 80-140 rock formations
          bushes: Math.floor((25 + Math.random() * 15) * baseMultiplier)    // 25-40 desert bushes
        };
        
      case 'forest':
        return {
          trees: Math.floor((70 + Math.random() * 50) * baseMultiplier),    // 70-120 trees (dense forest)
          rocks: Math.floor((40 + Math.random() * 30) * baseMultiplier),    // 40-70 rocks
          bushes: Math.floor((80 + Math.random() * 40) * baseMultiplier)    // 80-120 bushes
        };
        
      case 'swamp':
        return {
          trees: Math.floor((50 + Math.random() * 30) * baseMultiplier),    // 50-80 swamp trees
          rocks: Math.floor((30 + Math.random() * 20) * baseMultiplier),    // 30-50 moss-covered rocks
          bushes: Math.floor((90 + Math.random() * 50) * baseMultiplier)    // 90-140 wetland bushes
        };
        
      case 'mountain':
        return {
          trees: Math.floor((20 + Math.random() * 15) * baseMultiplier),    // 20-35 hardy pines
          rocks: Math.floor((100 + Math.random() * 80) * baseMultiplier),   // 100-180 rock formations
          bushes: Math.floor((30 + Math.random() * 20) * baseMultiplier)    // 30-50 mountain bushes
        };
        
      default:
        return {
          trees: Math.floor((45 + Math.random() * 25) * baseMultiplier),
          rocks: Math.floor((65 + Math.random() * 45) * baseMultiplier),
          bushes: Math.floor((55 + Math.random() * 35) * baseMultiplier)
        };
    }
  }
  
  // BIOME-SPECIFIC FEATURE GENERATION - Dense, realistic environments
  private generateBiomeSpecificFeatures(region: RegionCoordinates, biomeType: string, counts: {trees: number, rocks: number, bushes: number}, features: THREE.Object3D[]): void {
    // Generate trees based on biome type
    for (let i = 0; i < counts.trees; i++) {
      const position = this.getRandomPositionInRegion(region);
      if (!this.isPositionNearTavern(position)) {
        const tree = this.createBiomeSpecificTree(biomeType, position);
        if (tree) {
          features.push(tree);
          this.scene.add(tree);
          this.registerFeature(tree, position);
        }
      }
    }
    
    // Generate enhanced rocks
    this.spawnEnhancedRocks(region, counts.rocks, features);
    
    // Generate biome-specific bushes
    for (let i = 0; i < counts.bushes; i++) {
      const position = this.getRandomPositionInRegion(region);
      if (!this.isPositionNearTavern(position)) {
        const bush = this.createBiomeSpecificBush(biomeType, position);
        if (bush) {
          features.push(bush);
          this.scene.add(bush);
          this.registerFeature(bush, position);
        }
      }
    }
  }
  
  // PROCEDURAL LANDMARKS - Adventure content generation
  private generateProceduralLandmarks(region: RegionCoordinates, biomeType: string, features: THREE.Object3D[]): void {
    // Generate 1-3 landmarks per region based on ring distance
    const landmarkCount = Math.min(3, 1 + Math.floor(region.ringIndex / 3));
    
    for (let i = 0; i < landmarkCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      if (!this.isPositionNearTavern(position)) {
        const landmark = this.createLandmark(biomeType, position, region.ringIndex);
        if (landmark) {
          features.push(landmark);
          this.scene.add(landmark);
          this.registerFeature(landmark, position);
        }
      }
    }
  }
  
  // MICRO-BIOMES - Small environmental details
  private generateMicroBiomes(region: RegionCoordinates, biomeType: string, features: THREE.Object3D[]): void {
    // Generate 2-5 micro-biomes per region
    const microBiomeCount = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < microBiomeCount; i++) {
      const position = this.getRandomPositionInRegion(region);
      this.createMicroBiome(biomeType, position, features);
    }
  }
  
  // Helper methods for biome-specific generation
  private createBiomeSpecificTree(biomeType: string, position: THREE.Vector3): THREE.Object3D | null {
    return this.treeGenerator.createTree(position);
  }
  
  private createBiomeSpecificBush(biomeType: string, position: THREE.Vector3): THREE.Object3D | null {
    return this.bushGenerator.createBush(position);
  }
  
  private createLandmark(biomeType: string, position: THREE.Vector3, ringIndex: number): THREE.Object3D | null {
    // Create larger rock formations as landmarks
    if (this.rockModels.length > 0) {
      const rock = this.rockModels[Math.floor(Math.random() * this.rockModels.length)].clone();
      rock.position.copy(position);
      rock.scale.multiplyScalar(2 + Math.random()); // Make landmarks larger
      return rock;
    }
    return null;
  }
  
  private createMicroBiome(biomeType: string, position: THREE.Vector3, features: THREE.Object3D[]): void {
    // Create small clusters of features
    const clusterRadius = 10 + Math.random() * 10;
    const featureCount = 3 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < featureCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * clusterRadius;
      const clusterPos = new THREE.Vector3(
        position.x + Math.cos(angle) * distance,
        position.y,
        position.z + Math.sin(angle) * distance
      );
      
      if (Math.random() < 0.6) {
        const bush = this.bushGenerator.createBush(clusterPos);
        if (bush) {
          features.push(bush);
          this.scene.add(bush);
          this.registerFeature(bush, clusterPos);
        }
      }
    }
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
          
          // Register feature in both systems
          this.registerFeature(feature, position);
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
          
          // Register feature in both systems
          this.registerFeature(feature, position);
        }
      }
    }
  }
  
  private spawnFeature(
    type: 'forest' | 'rocks' | 'bushes',
    position: THREE.Vector3
  ): THREE.Object3D | null {
    switch(type) {
      case 'forest':
        return this.treeGenerator.createTree(position);
      case 'rocks':
        if (this.rockModels.length === 0) return null;
        const modelIndex = Math.floor(Math.random() * this.rockModels.length);
        const model = this.rockModels[modelIndex].clone();
        model.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.8 + Math.random() * 0.4;
        model.scale.set(scale, scale, scale);
        model.position.copy(position);
        return model;
      case 'bushes':
        return this.bushGenerator.createBush(position);
      default:
        return null;
    }
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
  
  // DEPRECATED: Legacy region-based cleanup - now handled by player-distance system
  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    console.log(`🗑️ [DEPRECATED] Region-based cleanup called for Ring ${region.ringIndex}, Quadrant ${region.quadrant} - ignoring (features managed by player distance)`);
    // Features are now managed by the player-distance system in updateFeatureVisibility()
    // This method is kept for compatibility but does nothing
  }
  
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    return Math.min(Math.max((num + 3) / 6, 0), 1);
  }
  
  public dispose(): void {
    // Feature cleanup handled by GlobalFeatureManager.dispose()
    
    // Original region-based cleanup for compatibility
    for (const [regionKey, features] of this.spawnedFeatures.entries()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        this.disposeFeature(feature);
      });
    }
    
    this.spawnedFeatures.clear();
    this.largeRockFormations.length = 0;
    
    // Dispose vegetation generators
    this.treeGenerator.dispose();
    this.bushGenerator.dispose();
  }

  /**
   * Update tree foliage materials for day/night lighting
   */
  public updateTreeDayNightLighting(dayFactor: number, nightFactor: number): void {
    if (this.treeGenerator) {
      this.treeGenerator.updateDayNightLighting(dayFactor, nightFactor);
    }
  }
}
