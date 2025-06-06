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
  
  // Track large rock formations to maintain distance (reduced from 150)
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 70;
  
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
      
      const rock = this.spawnComplexRockByVariation(variation, position);
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
   * Create a single rock at a specific position with forced category selection for clusters
   */
  public createRockAtPosition(position: THREE.Vector3, region: RegionCoordinates, forcedCategory?: string): THREE.Object3D | null {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Get or create rocks array for this region
    let rocks = this.spawnedRocks.get(regionKey);
    if (!rocks) {
      rocks = [];
      this.spawnedRocks.set(regionKey, rocks);
    }
    
    let variation: RockVariation;
    
    // Force category selection for clusters (prioritize large formations)
    if (forcedCategory) {
      const categoryVariations = this.rockVariations.filter(v => v.category === forcedCategory);
      if (categoryVariations.length > 0) {
        variation = categoryVariations[Math.floor(Math.random() * categoryVariations.length)];
      } else {
        variation = this.selectLargeRockVariation(); // Fallback to large rocks
      }
    } else {
      variation = this.selectLargeRockVariation(); // Default to large for clusters
    }
    
    // Check for large formation conflicts (with reduced distance)
    if ((variation.category === 'large' || variation.category === 'massive') && 
        this.isTooCloseToLargeFormation(position)) {
      // Try with medium rock instead
      const mediumVariations = this.rockVariations.filter(v => v.category === 'medium');
      if (mediumVariations.length > 0) {
        variation = mediumVariations[0];
      } else {
        return null;
      }
    }
    
    const rock = this.spawnComplexRockByVariation(variation, position);
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
   * Select large rock variation for clusters (prioritizes large/massive)
   */
  private selectLargeRockVariation(): RockVariation {
    const largeVariations = this.rockVariations.filter(v => 
      v.category === 'large' || v.category === 'massive'
    );
    
    if (largeVariations.length > 0 && Math.random() < 0.7) {
      return largeVariations[Math.floor(Math.random() * largeVariations.length)];
    }
    
    // Fallback to medium
    const mediumVariations = this.rockVariations.filter(v => v.category === 'medium');
    if (mediumVariations.length > 0) {
      return mediumVariations[0];
    }
    
    // Final fallback
    return this.rockVariations[2];
  }
  
  /**
   * Spawn a complex rock with full environmental details based on variation
   */
  private spawnComplexRockByVariation(variation: RockVariation, position: THREE.Vector3): THREE.Object3D | null {
    const rockGroup = new THREE.Group();
    const [minSize, maxSize] = variation.sizeRange;
    
    if (variation.isCluster || variation.category === 'large' || variation.category === 'massive') {
      // Create full cluster with environmental details
      this.createComplexCluster(rockGroup, variation, position);
    } else if (variation.category === 'medium') {
      // Medium rocks get some clustering
      this.createMediumRockFormation(rockGroup, variation, position);
    } else if (variation.category === 'small') {
      // Small rocks get minimal clustering
      this.createSmallRockFormation(rockGroup, variation, position);
    } else {
      // Tiny rocks are simple
      this.createSimpleRock(rockGroup, variation, position);
    }
    
    rockGroup.position.copy(position);
    rockGroup.userData = { type: 'rock', category: variation.category };
    
    return rockGroup;
  }
  
  /**
   * Create a complex cluster with full environmental details and original clustering logic
   */
  private createComplexCluster(rockGroup: THREE.Group, variation: RockVariation, position: THREE.Vector3): void {
    const [minSize, maxSize] = variation.sizeRange;
    const clusterSize = variation.clusterSize || [3, 5];
    const numberOfRocks = clusterSize[0] + Math.floor(Math.random() * (clusterSize[1] - clusterSize[0] + 1));
    
    console.log(`🪨 Creating complex ${variation.category} cluster with ${numberOfRocks} rocks`);
    
    // Create main rocks in cluster with original circular/organic positioning
    for (let i = 0; i < numberOfRocks; i++) {
      const rockSize = minSize + Math.random() * (maxSize - minSize);
      const rockShape = this.rockShapes[i % this.rockShapes.length];
      
      const rock = this.createSingleRock(rockSize, rockShape, variation.category, i);
      
      // Original positioning logic with Gaussian variation
      const angle = (i / numberOfRocks) * Math.PI * 2 + Math.random() * 0.8 - 0.4;
      const distance = this.gaussianRandom() * rockSize * 1.8;
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
      
      rockGroup.add(rock);
    }
    
    // Add environmental details for large formations
    if (variation.category === 'large' || variation.category === 'massive') {
      this.addSedimentAccumulation(rockGroup, variation.category, maxSize);
      this.addDebrisField(rockGroup, variation.category, maxSize);
      this.addClusteredTinyPebbles(rockGroup, variation.category, maxSize);
    }
  }
  
  /**
   * Add clustered tiny pebbles around large formations (restored original function)
   */
  private addClusteredTinyPebbles(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    const pebbleClusterCount = category === 'massive' ? 4 + Math.floor(Math.random() * 2) :
                              category === 'large' ? 2 + Math.floor(Math.random() * 3) : 1;
    
    for (let cluster = 0; cluster < pebbleClusterCount; cluster++) {
      const pebbleCount = 6 + Math.floor(Math.random() * 7);
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = clusterSize * (0.8 + Math.random() * 0.6);
      
      const clusterCenter = new THREE.Vector3(
        Math.cos(clusterAngle) * clusterDistance,
        0,
        Math.sin(clusterAngle) * clusterDistance
      );
      
      for (let i = 0; i < pebbleCount; i++) {
        const pebbleSize = clusterSize * (0.015 + Math.random() * 0.025);
        const pebbleGeometry = new THREE.SphereGeometry(pebbleSize, 4, 3);
        
        const pebbleMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#A0855B'),
          roughness: 0.9,
          metalness: 0.0
        });
        
        const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
        
        // Cluster pebbles around cluster center
        const pebbleAngle = Math.random() * Math.PI * 2;
        const pebbleDistance = this.gaussianRandom() * pebbleSize * 8;
        
        pebble.position.set(
          clusterCenter.x + Math.cos(pebbleAngle) * pebbleDistance,
          pebbleSize * 0.2,
          clusterCenter.z + Math.sin(pebbleAngle) * pebbleDistance
        );
        
        pebble.scale.set(
          0.8 + Math.random() * 0.4,
          0.3 + Math.random() * 0.4,
          0.8 + Math.random() * 0.4
        );
        
        pebble.castShadow = true;
        pebble.receiveShadow = true;
        rockGroup.add(pebble);
      }
    }
  }
  
  /**
   * Add sediment accumulation with original counts and logic
   */
  private addSedimentAccumulation(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    // Original counts: 6-14 based on size
    const sedimentCount = category === 'massive' ? 11 + Math.floor(Math.random() * 4) : 
                         category === 'large' ? 8 + Math.floor(Math.random() * 5) :     
                         6 + Math.floor(Math.random() * 3);
    
    // Create realistic sediment materials (beige/tan weathered colors)
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
    
    for (let i = 0; i < sedimentCount; i++) {
      const sedimentType = Math.floor(Math.random() * 3);
      let sedimentGeometry: THREE.BufferGeometry;
      let sediment: THREE.Mesh;
      
      switch (sedimentType) {
        case 0:
          const patchSize = clusterSize * (0.08 + Math.random() * 0.06);
          sedimentGeometry = new THREE.PlaneGeometry(patchSize, patchSize * (0.6 + Math.random() * 0.8));
          sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterials[Math.floor(Math.random() * 3)].clone());
          sediment.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
          break;
          
        case 1:
          const cylinderRadius = clusterSize * (0.03 + Math.random() * 0.04);
          sedimentGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderRadius * 0.2, 8);
          sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterials[Math.floor(Math.random() * 3)].clone());
          break;
          
        default:
          const sphereSize = clusterSize * (0.02 + Math.random() * 0.03);
          sedimentGeometry = new THREE.SphereGeometry(sphereSize, 6, 4);
          sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterials[Math.floor(Math.random() * 3)].clone());
          sediment.scale.set(
            1 + Math.random() * 0.3,
            0.3 + Math.random() * 0.2,
            1 + Math.random() * 0.3
          );
          break;
      }
      
      const angle = Math.random() * Math.PI * 2;
      const distance = clusterSize * (0.9 + Math.random() * 0.8);
      const heightVariation = -sediment.scale.y * 0.3;
      
      // Original clustering logic
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
   * Add debris field with original 60% clustering logic
   */
  private addDebrisField(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    // Original counts: 8-20 based on size
    const debrisCount = category === 'massive' ? 15 + Math.floor(Math.random() * 6) :
                       category === 'large' ? 11 + Math.floor(Math.random() * 6) :
                       8 + Math.floor(Math.random() * 5);
    
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

    const baseRockMaterial = RockMaterialGenerator.createEnhancedRockMaterial(category, this.rockShapes[0], 0);

    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = clusterSize * (0.04 + Math.random() * 0.08);
      let debrisGeometry: THREE.BufferGeometry;
      let debrisMaterial: THREE.MeshStandardMaterial;
      
      const isSediment = Math.random() < 0.6;
      
      if (isSediment) {
        const pebbleType = Math.floor(Math.random() * 4);
        
        switch (pebbleType) {
          case 0:
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            const ovalScale = new THREE.Vector3(
              1.2 + Math.random() * 0.8,
              0.3 + Math.random() * 0.2,
              0.8 + Math.random() * 0.6
            );
            debrisGeometry.scale(ovalScale.x, ovalScale.y, ovalScale.z);
            break;
            
          case 1:
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            const diamondScale = new THREE.Vector3(
              0.4 + Math.random() * 0.3,
              0.3 + Math.random() * 0.2,
              1.8 + Math.random() * 0.8
            );
            debrisGeometry.scale(diamondScale.x, diamondScale.y, diamondScale.z);
            break;
            
          case 2:
            debrisGeometry = new THREE.CylinderGeometry(
              debrisSize * (0.8 + Math.random() * 0.4),
              debrisSize * (0.6 + Math.random() * 0.4),
              debrisSize * (0.2 + Math.random() * 0.15),
              12
            );
            break;
            
          default:
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            const smoothScale = new THREE.Vector3(
              0.9 + Math.random() * 0.4,
              0.6 + Math.random() * 0.3,
              0.8 + Math.random() * 0.5
            );
            debrisGeometry.scale(smoothScale.x, smoothScale.y, smoothScale.z);
            break;
        }
        
        debrisMaterial = sedimentMaterials[Math.floor(Math.random() * 3)].clone();
        
      } else {
        const fragmentType = Math.floor(Math.random() * 4);
        
        switch (fragmentType) {
          case 0:
            debrisGeometry = new THREE.BoxGeometry(
              debrisSize * (1.5 + Math.random() * 1.0),
              debrisSize * (0.2 + Math.random() * 0.3),
              debrisSize * (0.8 + Math.random() * 0.6)
            );
            break;
            
          case 1:
            debrisGeometry = new THREE.DodecahedronGeometry(debrisSize, 0);
            break;
            
          case 2:
            debrisGeometry = new THREE.IcosahedronGeometry(debrisSize, 0);
            break;
            
          default:
            debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
            break;
        }
        
        debrisMaterial = baseRockMaterial.clone();
        debrisMaterial.color.multiplyScalar(0.7 + Math.random() * 0.5);
        debrisMaterial.roughness = Math.min(1.0, debrisMaterial.roughness + 0.1 + Math.random() * 0.2);
      }

      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Original 60% clustering logic for debris placement
      const isInCluster = Math.random() < 0.6;
      let angle, distance;
      
      if (isInCluster && i > 0) {
        // Find previous debris for clustering
        const rockChildren = rockGroup.children.filter(child => child instanceof THREE.Mesh);
        const previousDebris = rockChildren[rockChildren.length - 1];
        if (previousDebris instanceof THREE.Mesh) {
          angle = Math.atan2(previousDebris.position.z, previousDebris.position.x) + (Math.random() - 0.5) * 0.8;
          distance = previousDebris.position.length() + debrisSize * (1 + Math.random() * 2);
        } else {
          angle = Math.random() * Math.PI * 2;
          distance = clusterSize * (1.3 + Math.random() * 1.2);
        }
      } else {
        angle = Math.random() * Math.PI * 2;
        distance = clusterSize * (1.2 + Math.random() * 1.3);
      }
      
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * (0.1 + Math.random() * 0.2),
        Math.sin(angle) * distance
      );
      
      debris.rotation.set(
        Math.random() * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      );
      
      const scaleVariation = 0.6 + Math.random() * 0.8;
      debris.scale.set(scaleVariation, scaleVariation, scaleVariation);
      
      debris.castShadow = true;
      debris.receiveShadow = true;
      rockGroup.add(debris);
    }
  }
  
  /**
   * Add limited debris for medium rocks
   */
  private addLimitedDebris(rockGroup: THREE.Group, rockSize: number): void {
    const debrisCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = rockSize * (0.08 + Math.random() * 0.12);
      const debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
      
      const debrisMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B8956A'),
        roughness: 0.95,
        metalness: 0.0
      });
      
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (1.0 + Math.random() * 0.8);
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
  
  /**
   * Gaussian random for realistic clustering distribution
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    return Math.min(Math.max((num + 3) / 6, 0), 1);
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
   * Load rock model templates (simplified for performance)
   */
  private loadRockModels(): void {
    // Create simple templates - complex generation happens during spawning
    this.rockVariations.forEach((variation, categoryIndex) => {
      const rocksPerCategory = 4; // Reduced template count
      
      for (let i = 0; i < rocksPerCategory; i++) {
        const rockGroup = new THREE.Group();
        
        // Create simple template rock
        const [minSize, maxSize] = variation.sizeRange;
        const templateSize = (minSize + maxSize) / 2;
        const rockShape = this.rockShapes[i % this.rockShapes.length];
        
        const templateRock = this.createSingleRock(templateSize, rockShape, variation.category, i);
        rockGroup.add(templateRock);
        
        this.rockModels.push(rockGroup);
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} rock templates (complex generation happens during spawning)`);
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
    
    return this.rockVariations[2];
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
