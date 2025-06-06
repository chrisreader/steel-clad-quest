import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from '../../RingQuadrantSystem';
import { ROCK_VARIATIONS, ROCK_SHAPES, RockVariation, RockShape, RockCategory, RockGenerationOptions, ClusterGenerationOptions } from '../';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { RockShapeFactory } from './RockShapeFactory';
import { RockClusterGenerator } from './RockClusterGenerator';
import { RockGenerationUtils } from '../utils/RockGenerationUtils';

/**
 * Unified rock generation module with standardized pipeline
 */
export class RockGenerationModule {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  
  private rockModels: THREE.Object3D[] = [];
  private clusterGenerator: RockClusterGenerator;
  
  // Use imported configurations
  private rockVariations: RockVariation[] = ROCK_VARIATIONS;
  private rockShapes: RockShape[] = ROCK_SHAPES;
  
  // Track spawned rocks by region for cleanup
  private spawnedRocks: Map<string, THREE.Object3D[]> = new Map();
  
  // Track large rock formations to maintain distance
  private largeRockFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 70;
  
  // Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;
  
  constructor(scene: THREE.Scene, ringSystem: RingQuadrantSystem) {
    this.scene = scene;
    this.ringSystem = ringSystem;
    this.clusterGenerator = new RockClusterGenerator();
    
    this.loadRockModels();
  }
  
  /**
   * UNIFIED ROCK GENERATION PIPELINE
   * Main entry point for generating rocks by category
   */
  public generateRockByCategory(category: RockCategory, options: RockGenerationOptions = {}): THREE.Object3D | null {
    const variation = this.getVariationByCategory(category, options.forceCategory);
    if (!variation) return null;
    
    const finalOptions: RockGenerationOptions = {
      size: this.calculateRockSize(variation),
      shape: options.shape || this.selectRockShape(options.index || 0),
      enableEnvironmentalDetails: options.enableEnvironmentalDetails !== false,
      ...options
    };
    
    if (variation.isCluster) {
      return this.generateClusterRock(variation, finalOptions);
    } else {
      return this.generateIndividualRock(variation, finalOptions);
    }
  }

  /**
   * Generate individual rock using unified pipeline
   */
  private generateIndividualRock(variation: RockVariation, options: RockGenerationOptions): THREE.Object3D {
    const rockGroup = new THREE.Group();
    
    // Create base geometry using standardized flow
    const geometry = this.createStandardizedGeometry(
      options.shape!,
      options.size!,
      variation.category
    );
    
    // Apply standardized material
    const material = RockMaterialGenerator.createEnhancedRockMaterial(
      variation.category,
      options.shape!,
      options.index || 0
    );
    
    // Create mesh and apply standard properties
    const rock = new THREE.Mesh(geometry, material);
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, options.role);
    RockGenerationUtils.randomizeRotation(rock, options.role);
    
    if (options.position) {
      rock.position.copy(options.position);
    }
    
    rockGroup.add(rock);
    
    // Add environmental details for larger rocks
    if (options.enableEnvironmentalDetails && (variation.category === 'small' || variation.category === 'medium')) {
      this.addEnvironmentalDetails(rockGroup, variation, options.size!);
    }
    
    return rockGroup;
  }

  /**
   * Generate cluster rock using unified pipeline
   */
  private generateClusterRock(variation: RockVariation, options: RockGenerationOptions): THREE.Object3D {
    const rockGroup = new THREE.Group();
    
    const clusterOptions: ClusterGenerationOptions = {
      ...options,
      variation,
      enableEnvironmentalDetails: options.enableEnvironmentalDetails !== false
    };
    
    // Use existing cluster generator with enhanced options
    this.clusterGenerator.createVariedRockCluster(
      rockGroup,
      variation,
      options.index || 0,
      {
        createCharacterBaseGeometry: (shape, size) => this.createStandardizedGeometry(shape, size, variation.category),
        applyShapeModifications: (geom, shape, size) => this.applyStandardizedShapeModifications(geom, shape, size, variation.category),
        applyCharacterDeformation: (geom, intensity, size, shape) => this.applyStandardizedDeformation(geom, intensity, size, shape, variation.category),
        validateAndEnhanceGeometry: (geom) => RockGenerationUtils.validateGeometry(geom)
      }
    );
    
    if (options.position) {
      rockGroup.position.copy(options.position);
    }
    
    return rockGroup;
  }

  /**
   * Create standardized geometry with unified flow
   */
  private createStandardizedGeometry(shape: RockShape, size: number, category: RockCategory): THREE.BufferGeometry {
    // Use size-aware geometry creation
    const subdivisionLevel = this.getSubdivisionLevel(category);
    let geometry: THREE.BufferGeometry;
    
    switch (shape.baseGeometry) {
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(size, subdivisionLevel);
        break;
      case 'sphere':
        const segments = this.getSphereSegments(category);
        geometry = new THREE.SphereGeometry(size, segments.width, segments.height);
        break;
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(size, Math.min(subdivisionLevel, 2));
        break;
      case 'custom':
        geometry = this.createOrganicGeometry(size, category);
        break;
      default:
        geometry = new THREE.IcosahedronGeometry(size, subdivisionLevel);
    }
    
    return geometry;
  }

  /**
   * Apply standardized shape modifications
   */
  private applyStandardizedShapeModifications(
    geometry: THREE.BufferGeometry, 
    shape: RockShape, 
    size: number, 
    category: RockCategory
  ): void {
    // Skip aggressive modifiers for tiny/small rocks
    if (category === 'tiny' || category === 'small') {
      if (shape.shapeModifier === 'erode') {
        this.applyGentleErosion(geometry, size, category);
      }
      return;
    }
    
    // Apply full modifications for medium+ rocks
    RockShapeFactory.applyShapeModifications(geometry, shape, size);
  }

  /**
   * Apply standardized deformation
   */
  private applyStandardizedDeformation(
    geometry: THREE.BufferGeometry,
    intensity: number,
    size: number,
    shape: RockShape,
    category: RockCategory
  ): void {
    RockGenerationUtils.applyDeformation(geometry, {
      intensity,
      category,
      weatheringLevel: shape.weatheringLevel
    });
    
    // Apply smoothing for small rocks
    if (category === 'tiny' || category === 'small') {
      RockGenerationUtils.smoothGeometry(geometry, 1);
    }
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
    
    let forcedLargeCount = 0;
    if (region.ringIndex >= 1) {
      forcedLargeCount = Math.floor(count * 0.15);
      console.log(`🪨 Forcing ${forcedLargeCount} large rocks in Ring ${region.ringIndex}`);
    }
    
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      let category: RockCategory;
      if (i < forcedLargeCount) {
        category = Math.random() < 0.5 ? 'large' : 'massive';
        console.log(`🪨 FORCING large rock: ${category}`);
      } else {
        const variation = this.selectRockVariation();
        category = variation.category;
      }
      
      if ((category === 'large' || category === 'massive') && 
          this.isTooCloseToLargeFormation(position)) {
        console.log(`🪨 Skipping ${category} rock - too close to existing formation`);
        continue;
      }
      
      // Use new unified pipeline
      const rock = this.generateRockByCategory(category, {
        position,
        index: i,
        collisionCallback: this.collisionRegistrationCallback
      });
      
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        
        if (category === 'large' || category === 'massive') {
          this.largeRockFormations.push(position.clone());
          console.log(`🪨 Added ${category} rock formation at:`, position);
        }
        
        if (this.collisionRegistrationCallback && category !== 'tiny') {
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
    
    let rocks = this.spawnedRocks.get(regionKey);
    if (!rocks) {
      rocks = [];
      this.spawnedRocks.set(regionKey, rocks);
    }
    
    const targetCategory = (category as RockCategory) || this.selectRockVariation().category;
    
    // Use new unified pipeline
    const rock = this.generateRockByCategory(targetCategory, {
      position,
      forceCategory: category as RockCategory,
      collisionCallback: this.collisionRegistrationCallback
    });
    
    if (rock) {
      rocks.push(rock);
      this.scene.add(rock);
      
      if (targetCategory === 'large' || targetCategory === 'massive') {
        this.largeRockFormations.push(position.clone());
        console.log(`🪨 Added clustered ${targetCategory} rock formation`);
      }
      
      if (this.collisionRegistrationCallback && targetCategory !== 'tiny') {
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
        const rock = this.generateRockByCategory(variation.category, {
          index: i,
          enableEnvironmentalDetails: variation.isCluster
        });
        
        if (rock) {
          this.rockModels.push(rock);
        }
      }
    });
    
    console.log(`🪨 Created ${this.rockModels.length} enhanced rock variations with standardized pipeline`);
  }
  
  /**
   * Select a rock variation based on weights
   */
  private selectRockVariation(): RockVariation {
    const totalWeight = this.rockVariations.reduce((sum, variation) => sum + variation.weight, 0);
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
   * Get variation by category
   */
  private getVariationByCategory(category: RockCategory, forceCategory?: RockCategory): RockVariation | null {
    const targetCategory = forceCategory || category;
    return this.rockVariations.find(v => v.category === targetCategory) || null;
  }
  
  /**
   * Calculate rock size
   */
  private calculateRockSize(variation: RockVariation): number {
    const [minSize, maxSize] = variation.sizeRange;
    return minSize + Math.random() * (maxSize - minSize);
  }
  
  /**
   * Select rock shape
   */
  private selectRockShape(index: number): RockShape {
    return this.rockShapes[index % this.rockShapes.length];
  }
  
  /**
   * Get subdivision level
   */
  private getSubdivisionLevel(category: RockCategory): number {
    switch (category) {
      case 'tiny': return 1;
      case 'small': return 2;
      default: return 3;
    }
  }
  
  /**
   * Get sphere segments
   */
  private getSphereSegments(category: RockCategory): { width: number; height: number } {
    switch (category) {
      case 'tiny': return { width: 12, height: 8 };
      case 'small': return { width: 16, height: 12 };
      default: return { width: 24, height: 18 };
    }
  }
  
  /**
   * Create organic geometry
   */
  private createOrganicGeometry(size: number, category: RockCategory): THREE.BufferGeometry {
    const segments = this.getSphereSegments(category);
    const geometry = new THREE.SphereGeometry(size, segments.width, segments.height);
    
    const variationIntensity = category === 'tiny' ? 0.15 : category === 'small' ? 0.20 : 0.25;
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
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
   * Apply gentle erosion
   */
  private applyGentleErosion(geometry: THREE.BufferGeometry, size: number, category: RockCategory): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const intensity = category === 'tiny' ? 0.05 : 0.08;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
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
   * Add environmental details
   */
  private addEnvironmentalDetails(rockGroup: THREE.Group, variation: RockVariation, size: number): void {
    if (variation.category === 'small' && Math.random() < 0.3) {
      this.addSmallRockClustering(rockGroup, size);
    } else if (variation.category === 'tiny') {
      this.addSmallRockDebris(rockGroup, size);
    }
  }
  
  /**
   * Add small rock clustering
   */
  private addSmallRockClustering(rockGroup: THREE.Group, rockSize: number): void {
    const clusterCount = 1 + Math.floor(Math.random() * 2);
    const mainRock = rockGroup.children[0] as THREE.Mesh;
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterRockSize = rockSize * (0.6 + Math.random() * 0.3);
      const clusterGeometry = new THREE.SphereGeometry(clusterRockSize, 8, 6);
      
      RockGenerationUtils.applyDeformation(clusterGeometry, {
        intensity: 0.05,
        category: 'small'
      });
      
      const clusterRock = new THREE.Mesh(clusterGeometry, mainRock.material);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (1.2 + Math.random() * 0.8);
      clusterRock.position.set(
        Math.cos(angle) * distance,
        clusterRockSize * 0.2,
        Math.sin(angle) * distance
      );
      
      RockGenerationUtils.applyStandardRockProperties(clusterRock, 'small');
      RockGenerationUtils.randomizeRotation(clusterRock);
      
      rockGroup.add(clusterRock);
    }
  }
  
  /**
   * Add small rock debris
   */
  private addSmallRockDebris(rockGroup: THREE.Group, rockSize: number): void {
    const debrisCount = 2 + Math.floor(Math.random() * 3);
    const mainRock = rockGroup.children[0] as THREE.Mesh;
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = rockSize * (0.15 + Math.random() * 0.25);
      const debris = new THREE.Mesh(
        new THREE.SphereGeometry(debrisSize, 6, 4),
        mainRock.material
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * (0.8 + Math.random() * 0.6);
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * 0.2,
        Math.sin(angle) * distance
      );
      
      RockGenerationUtils.applyStandardRockProperties(debris, 'tiny');
      RockGenerationUtils.randomizeRotation(debris);
      
      rockGroup.add(debris);
    }
  }
}
