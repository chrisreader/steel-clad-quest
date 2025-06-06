import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from '../../RingQuadrantSystem';
import { ROCK_VARIATIONS, ROCK_SHAPES, RockVariation, RockShape } from '../';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { RockShapeFactory } from './RockShapeFactory';

/**
 * Specialized module for rock generation functionality
 * Extracts rock-specific generation logic from TerrainFeatureGenerator
 */
export class RockGenerationModule {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  
  private rockModels: THREE.Object3D[] = [];
  
  // Use imported configurations
  private rockVariations: RockVariation[] = ROCK_VARIATIONS;
  private rockShapes: RockShape[] = ROCK_SHAPES;
  
  // Track spawned rocks by region for cleanup
  private spawnedRocks: Map<string, THREE.Object3D[]> = new Map();
  
  // Track large rock formations to maintain distance
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 150;
  
  // Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  constructor(scene: THREE.Scene, ringSystem: RingQuadrantSystem) {
    this.scene = scene;
    this.ringSystem = ringSystem;
    
    this.loadRockModels();
  }
  
  /**
   * Set collision registration callback for registering colliders
   */
  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
    console.log('🔧 RockGenerationModule collision registration callback set');
  }
  
  /**
   * Get rocks spawned for a specific region
   */
  public getSpawnedRocksForRegion(regionKey: string): THREE.Object3D[] | undefined {
    return this.spawnedRocks.get(regionKey);
  }
  
  /**
   * Generate rocks for a specific region (bulk generation)
   */
  public generateRocksForRegion(region: RegionCoordinates, count: number): THREE.Object3D[] {
    const regionKey = this.ringSystem.getRegionKey(region);
    let rocks: THREE.Object3D[] = [];
    
    // Check if rocks already exist for this region
    if (this.spawnedRocks.has(regionKey)) {
      return this.spawnedRocks.get(regionKey) || [];
    }
    
    console.log(`🪨 Generating ${count} rocks for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const totalWeight = this.rockVariations.reduce((sum, variation) => sum + variation.weight, 0);
    
    // Create specified number of rocks
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPositionInRegion(region);
      const variation = this.selectRockVariation(totalWeight);
      
      if ((variation.category === 'large' || variation.category === 'massive') && 
          this.isTooCloseToLargeFormation(position)) {
        continue;
      }
      
      const rock = this.spawnRockByVariation(variation, position);
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        
        if (variation.category === 'large' || variation.category === 'massive') {
          this.largeRockFormations.push(position.clone());
        }
        
        if (this.collisionRegistrationCallback && variation.category !== 'tiny') {
          this.collisionRegistrationCallback(rock);
        }
      }
    }
    
    // Store rocks for this region
    this.spawnedRocks.set(regionKey, rocks);
    return rocks;
  }
  
  /**
   * Create a single rock at a specific position (for clusters and individual placement)
   */
  public createRockAtPosition(position: THREE.Vector3, region: RegionCoordinates, category?: string): THREE.Object3D | null {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Get or create rocks array for this region
    let rocks = this.spawnedRocks.get(regionKey);
    if (!rocks) {
      rocks = [];
      this.spawnedRocks.set(regionKey, rocks);
    }
    
    const totalWeight = this.rockVariations.reduce((sum, variation) => sum + variation.weight, 0);
    
    // Select variation based on category if specified, otherwise random
    let variation: RockVariation;
    if (category) {
      const categoryVariations = this.rockVariations.filter(v => v.category === category);
      if (categoryVariations.length > 0) {
        variation = categoryVariations[Math.floor(Math.random() * categoryVariations.length)];
      } else {
        variation = this.selectRockVariation(totalWeight);
      }
    } else {
      variation = this.selectRockVariation(totalWeight);
    }
    
    // Check for large formation conflicts
    if ((variation.category === 'large' || variation.category === 'massive') && 
        this.isTooCloseToLargeFormation(position)) {
      return null;
    }
    
    const rock = this.spawnRockByVariation(variation, position);
    if (rock) {
      rocks.push(rock);
      this.scene.add(rock);
      
      if (variation.category === 'large' || variation.category === 'massive') {
        this.largeRockFormations.push(position.clone());
      }
      
      if (this.collisionRegistrationCallback && variation.category !== 'tiny') {
        this.collisionRegistrationCallback(rock);
      }
    }
    
    return rock;
  }
  
  /**
   * Clean up rocks for a specific region
   */
  public cleanupRocksForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const rocks = this.spawnedRocks.get(regionKey);
    
    if (!rocks) return;
    
    console.log(`🧹 Cleaning up rocks for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    rocks.forEach(rock => {
      this.scene.remove(rock);
      
      if (rock instanceof THREE.Mesh) {
        if (rock.geometry) rock.geometry.dispose();
        if (rock.material) {
          if (Array.isArray(rock.material)) {
            rock.material.forEach(m => m.dispose());
          } else {
            rock.material.dispose();
          }
        }
      } else if (rock instanceof THREE.Group) {
        rock.traverse(child => {
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
    
    this.spawnedRocks.delete(regionKey);
  }
  
  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Clean up all regions
    for (const [regionKey, rocks] of this.spawnedRocks.entries()) {
      rocks.forEach(rock => {
        this.scene.remove(rock);
        
        if (rock instanceof THREE.Mesh) {
          if (rock.geometry) rock.geometry.dispose();
          if (rock.material) {
            if (Array.isArray(rock.material)) {
              rock.material.forEach(m => m.dispose());
            } else {
              rock.material.dispose();
            }
          }
        } else if (rock instanceof THREE.Group) {
          rock.traverse(child => {
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
    
    // Clear collections
    this.spawnedRocks.clear();
    this.largeRockFormations.length = 0;
    this.rockModels = [];
  }
  
  /**
   * Load rock model templates
   */
  private loadRockModels(): void {
    // ENHANCED: Create rock variations with size-aware quality control
    this.createEnhancedRockVariations();
  }
  
  /**
   * Create enhanced rock variations with size-aware quality control
   */
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
  
  /**
   * Create a cluster rock wrapper
   */
  private createClusterRockWrapper(rockGroup: THREE.Group, variation: RockVariation, index: number): void {
    // For medium, large, massive rocks - keep existing cluster logic
    const [minSize, maxSize] = variation.sizeRange;
    const clusterSize = variation.clusterSize || [3, 5];
    const numberOfRocks = clusterSize[0] + Math.floor(Math.random() * (clusterSize[1] - clusterSize[0] + 1));
    
    for (let i = 0; i < numberOfRocks; i++) {
      const rockSize = minSize + Math.random() * (maxSize - minSize);
      const rockShape = this.rockShapes[index % this.rockShapes.length];
      
      // Create base geometry
      let rockGeometry = RockShapeFactory.createCharacterBaseGeometry(rockShape, rockSize);
      RockShapeFactory.applyShapeModifications(rockGeometry, rockShape, rockSize);
      
      // Apply normal deformation intensity for medium+ rocks
      const deformationIntensity = rockShape.deformationIntensity;
      RockShapeFactory.applyCharacterDeformation(rockGeometry, deformationIntensity, rockSize, rockShape);
      RockShapeFactory.validateAndEnhanceGeometry(rockGeometry);
      
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
    
    // Add environmental details for medium and larger clusters
    if (variation.category === 'medium' || variation.category === 'large' || variation.category === 'massive') {
      this.addClusterEnvironmentalDetails(rockGroup, variation, maxSize);
    }
  }
  
  /**
   * Add environmental details to a rock cluster
   */
  private addClusterEnvironmentalDetails(rockGroup: THREE.Group, variation: RockVariation, clusterSize: number): void {
    // Add sediment accumulation in low spots
    this.addSedimentAccumulation(rockGroup, variation.category, clusterSize);
    
    // Add debris field around cluster base
    this.addDebrisField(rockGroup, variation.category, clusterSize);
  }
  
  /**
   * Add sediment accumulation around rock formations
   */
  private addSedimentAccumulation(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    const sedimentCount = category === 'massive' ? 12 + Math.floor(Math.random() * 3) : 
                         category === 'large' ? 8 + Math.floor(Math.random() * 4) :     
                         6 + Math.floor(Math.random() * 3);
    
    // Create realistic sediment materials (beige/tan weathered colors)
    const sedimentMaterials = [
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C4A484'), // Light beige
        roughness: 0.95,
        metalness: 0.0
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B8956A'), // Medium tan
        roughness: 0.95,
        metalness: 0.0
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#A0855B'), // Dark tan
        roughness: 0.95,
        metalness: 0.0
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
      const distance = clusterSize * (0.9 + Math.random() * 0.8);
      const heightVariation = -sediment.scale.y * 0.3;
      
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
  
  /**
   * Add debris field around cluster base
   */
  private addDebrisField(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    const debrisCount = category === 'massive' ? 16 + Math.floor(Math.random() * 5) :
                       category === 'large' ? 12 + Math.floor(Math.random() * 5) :
                       8 + Math.floor(Math.random() * 5);
    
    // Create realistic beige sediment materials
    const sedimentMaterials = [
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C4A484'),
        roughness: 0.95,
        metalness: 0.0
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B8956A'),
        roughness: 0.95,
        metalness: 0.0
      }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#A0855B'),
        roughness: 0.95,
        metalness: 0.0
      })
    ];

    // Create base debris material (similar to main rock but weathered)
    const baseRockMaterial = RockMaterialGenerator.createEnhancedRockMaterial(category, this.rockShapes[0], 0);

    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = clusterSize * (0.04 + Math.random() * 0.08);
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
              1.2 + Math.random() * 0.8,
              0.3 + Math.random() * 0.2,
              0.8 + Math.random() * 0.6
            );
            debrisGeometry.scale(ovalScale.x, ovalScale.y, ovalScale.z);
            break;
            
          case 1: // Organic diamond-like elongated pebbles
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            // Create organic diamond-like proportions
            const diamondScale = new THREE.Vector3(
              0.4 + Math.random() * 0.3,
              0.3 + Math.random() * 0.2,
              1.8 + Math.random() * 0.8
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
              debrisSize * (0.2 + Math.random() * 0.3),
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
        debrisSize * (0.1 + Math.random() * 0.2),
        Math.sin(angle) * distance
      );
      
      // Natural but not extreme orientation
      debris.rotation.set(
        Math.random() * Math.PI * 0.3,
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
  }
  
  /**
   * Apply gentle organic deformation to a geometry
   */
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
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Create a size-aware character rock
   */
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
    RockShapeFactory.validateAndEnhanceGeometry(rockGeometry);
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
  }
  
  /**
   * Create a size-aware base geometry
   */
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
  
  /**
   * Create a size-aware organic geometry
   */
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
  
  /**
   * Apply size-aware shape modifications
   */
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
    RockShapeFactory.applyShapeModifications(geometry, rockShape, rockSize);
  }
  
  /**
   * Apply gentle erosion modification for small rocks
   */
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
  
  /**
   * Calculate size-aware deformation intensity
   */
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
  
  /**
   * Apply size-aware character deformation
   */
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
    } else {
      // Use RockShapeFactory for medium+ rocks
      RockShapeFactory.applyOrganicNoiseDeformation(geometry, intensity, rockSize);
      RockShapeFactory.applyDetailDeformation(geometry, intensity * 0.5, rockSize * 0.4);
      
      if (rockShape.weatheringLevel > 0.7) {
        RockShapeFactory.applySurfaceRoughness(geometry, intensity * 0.3, rockSize * 0.2);
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Apply smoothing for small rocks
   */
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
  
  /**
   * Add small rock debris
   */
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
  
  /**
   * Add clustering effect for small rocks
   */
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
  
  /**
   * Select a rock variation based on weights
   */
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
  
  /**
   * Check if position is too close to large formation
   */
  private isTooCloseToLargeFormation(position: THREE.Vector3): boolean {
    return this.largeRockFormations.some(formation => 
      formation.distanceTo(position) < this.minimumLargeRockDistance
    );
  }
  
  /**
   * Spawn a rock by variation
   */
  private spawnRockByVariation(variation: RockVariation, position: THREE.Vector3): THREE.Object3D | null {
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
  
  /**
   * Get category start index
   */
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
  
  /**
   * Get category models
   */
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
  
  /**
   * Get random position in region
   */
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
}
