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
  
  // Tavern exclusion properties
  private tavernPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private tavernExclusionRadius: number = 15;
  
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
    
    // FIXED: Force cluster generation for medium, large, and massive rocks
    const shouldGenerateCluster = variation.isCluster || 
      ['medium', 'large', 'massive'].includes(variation.category);
    
    console.log(`🪨 Generating ${variation.category} rock - Cluster: ${shouldGenerateCluster}`);
    
    if (shouldGenerateCluster) {
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
    
    console.log(`🪨 Creating cluster for ${variation.category} rock`);
    
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
    
    // FIXED: Force environmental details for medium+ clusters with proper size scaling
    if (['medium', 'large', 'massive'].includes(variation.category)) {
      console.log(`🪨 FORCING environmental details for ${variation.category} cluster`);
      const clusterSize = options.size || this.calculateRockSize(variation);
      
      // FIXED: Add sediment accumulation (was missing)
      this.addSedimentAccumulation(rockGroup, variation.category, clusterSize);
      
      // FIXED: Improved debris field with proper sizing
      this.addDebrisField(rockGroup, variation.category, clusterSize);
      
      // FIXED: Improved tiny pebbles with proper sizing
      this.addClusteredTinyPebbles(rockGroup, variation.category, clusterSize);
    }
    
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
    // CRITICAL FIX: Drastically reduce or skip modifications for tiny/small rocks
    if (category === 'tiny') {
      // Skip all modifications for tiny rocks to prevent spiking
      return;
    }
    
    if (category === 'small') {
      // Only apply very gentle erosion for small rocks
      if (shape.shapeModifier === 'erode') {
        this.applyGentleErosion(geometry, size, category);
      }
      return;
    }
    
    // Apply full modifications for medium+ rocks only
    RockShapeFactory.applyShapeModifications(geometry, shape, size);
  }

  /**
   * Apply standardized deformation with scale-aware intensity
   */
  private applyStandardizedDeformation(
    geometry: THREE.BufferGeometry,
    intensity: number,
    size: number,
    shape: RockShape,
    category: RockCategory
  ): void {
    // CRITICAL FIX: Dramatically reduce deformation intensity for small rocks
    let adjustedIntensity = intensity;
    
    switch (category) {
      case 'tiny':
        adjustedIntensity = intensity * 0.1; // Reduce to 10% for tiny rocks
        break;
      case 'small':
        adjustedIntensity = intensity * 0.2; // Reduce to 20% for small rocks
        break;
      case 'medium':
        adjustedIntensity = intensity * 0.6; // Moderate reduction for medium
        break;
      default:
        adjustedIntensity = intensity; // Full intensity for large/massive
    }
    
    RockGenerationUtils.applyDeformation(geometry, {
      intensity: adjustedIntensity,
      category,
      weatheringLevel: shape.weatheringLevel
    });
    
    // Apply extra smoothing for small rocks to prevent spikes
    if (category === 'tiny' || category === 'small') {
      RockGenerationUtils.smoothGeometry(geometry, 2);
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
    
    // FIXED: Increase forced large rock count for better environmental detail testing
    let forcedLargeCount = 0;
    if (region.ringIndex >= 1) {
      forcedLargeCount = Math.floor(count * 0.25); // Increased from 0.15 to 0.25
      console.log(`🪨 Forcing ${forcedLargeCount} large/massive rocks in Ring ${region.ringIndex}`);
    }
    
    for (let i = 0; i < count; i++) {
      const position = this.getRandomPositionInRegion(region);
      
      let category: RockCategory;
      if (i < forcedLargeCount) {
        // FIXED: Better distribution of large/massive rocks
        if (Math.random() < 0.4) {
          category = 'massive';
        } else if (Math.random() < 0.6) {
          category = 'large';
        } else {
          category = 'medium';
        }
        console.log(`🪨 FORCING ${category} rock for environmental detail testing`);
      } else {
        const variation = this.selectRockVariation();
        category = variation.category;
      }
      
      // Check tavern exclusion before other checks
      if (this.isPositionNearTavern(position, category)) {
        console.log(`🏰 Skipping ${category} rock - too close to tavern`);
        continue;
      }
      
      if ((category === 'large' || category === 'massive') && 
          this.isTooCloseToLargeFormation(position)) {
        console.log(`🪨 Skipping ${category} rock - too close to existing formation`);
        continue;
      }
      
      // Use new unified pipeline with forced environmental details
      const rock = this.generateRockByCategory(category, {
        position,
        index: i,
        enableEnvironmentalDetails: true, // FIXED: Always enable for testing
        collisionCallback: this.collisionRegistrationCallback
      });
      
      if (rock) {
        rocks.push(rock);
        this.scene.add(rock);
        
        if (category === 'large' || category === 'massive') {
          this.largeRockFormations.push(position.clone());
          console.log(`🪨 Added ${category} rock formation with environmental details at:`, position);
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
    
    // Check tavern exclusion
    if (this.isPositionNearTavern(position, targetCategory)) {
      console.log(`🏰 Skipping ${targetCategory} rock creation - too close to tavern`);
      return null;
    }
    
    // Use new unified pipeline with environmental details enabled
    const rock = this.generateRockByCategory(targetCategory, {
      position,
      forceCategory: category as RockCategory,
      enableEnvironmentalDetails: true, // FIXED: Always enable
      collisionCallback: this.collisionRegistrationCallback
    });
    
    if (rock) {
      rocks.push(rock);
      this.scene.add(rock);
      
      if (targetCategory === 'large' || targetCategory === 'massive') {
        this.largeRockFormations.push(position.clone());
        console.log(`🪨 Added clustered ${targetCategory} rock formation with environmental details`);
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
    
    // CRITICAL FIX: Drastically reduce variation for tiny/small rocks
    let variationIntensity: number;
    switch (category) {
      case 'tiny':
        variationIntensity = 0.05; // Minimal variation
        break;
      case 'small':
        variationIntensity = 0.10; // Light variation
        break;
      default:
        variationIntensity = 0.25; // Full variation for larger rocks
    }
    
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
    const intensity = category === 'tiny' ? 0.02 : 0.05; // Even gentler for tiny rocks
    
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
  
  /**
   * Set tavern position for exclusion zone
   */
  public setTavernPosition(position: THREE.Vector3): void {
    this.tavernPosition = position.clone();
    console.log(`🏰 RockGenerationModule tavern position set to: ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
  }
  
  /**
   * Check if position is too close to tavern (category-aware)
   */
  private isPositionNearTavern(position: THREE.Vector3, category?: RockCategory): boolean {
    let exclusionRadius = this.tavernExclusionRadius;
    
    // Category-aware exclusion radii
    switch (category) {
      case 'tiny':
      case 'small':
        exclusionRadius = 15;
        break;
      case 'medium':
        exclusionRadius = 20;
        break;
      case 'large':
        exclusionRadius = 25;
        break;
      case 'massive':
        exclusionRadius = 30;
        break;
      default:
        exclusionRadius = this.tavernExclusionRadius;
    }
    
    const distance = position.distanceTo(this.tavernPosition);
    const isNear = distance < exclusionRadius;
    
    if (isNear) {
      console.log(`🏰 Rock ${category || 'unknown'} too close to tavern: ${distance.toFixed(1)} < ${exclusionRadius}`);
    }
    
    return isNear;
  }
  
  /**
   * Add sediment accumulation system - ENHANCED REALISTIC SIZES
   */
  private addSedimentAccumulation(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    let sedimentCount: number;
    
    switch (category) {
      case 'massive':
        sedimentCount = 12 + Math.floor(Math.random() * 3); // 12-14
        break;
      case 'large':
        sedimentCount = 8 + Math.floor(Math.random() * 4); // 8-11
        break;
      case 'medium':
        sedimentCount = 6 + Math.floor(Math.random() * 3); // 6-8
        break;
      default:
        return;
    }
    
    console.log(`🪨 Adding ${sedimentCount} realistic sediment particles to ${category} cluster`);
    
    const sedimentColors = [0xC4A484, 0xB8956A, 0xA0855B]; // realistic dirt/sand colors
    
    for (let i = 0; i < sedimentCount; i++) {
      // ENHANCED: Restored realistic sediment size (8-15% of cluster size for visible accumulation)
      const sedimentSize = clusterSize * (0.08 + Math.random() * 0.07);
      let geometry: THREE.BufferGeometry;
      
      const sedimentType = Math.floor(Math.random() * 3);
      
      switch (sedimentType) {
        case 0: // Flat sediment patch - realistic proportions
          geometry = new THREE.PlaneGeometry(sedimentSize * 2.5, sedimentSize * 2.0);
          geometry.rotateX(-Math.PI / 2); // Lay flat
          this.applyOrganicNoise(geometry, 0.12);
          break;
        case 1: // Flattened cylinder - dirt accumulation
          geometry = new THREE.CylinderGeometry(sedimentSize, sedimentSize * 0.8, sedimentSize * 0.3, 10);
          this.applyOrganicNoise(geometry, 0.15);
          break;
        case 2: // Flattened sphere - natural sediment mound
          geometry = new THREE.SphereGeometry(sedimentSize, 10, 8);
          geometry.scale(1.4, 0.4, 1.2); // More pronounced flattening
          this.applyOrganicNoise(geometry, 0.10);
          break;
        default:
          geometry = new THREE.SphereGeometry(sedimentSize, 8, 6);
          geometry.scale(1.3, 0.5, 1.1);
      }
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sedimentColors[i % sedimentColors.length]),
        roughness: 0.95,
        metalness: 0.0
      });
      
      const sediment = new THREE.Mesh(geometry, material);
      
      // ENHANCED: Better "low spot" positioning around cluster base with more variation
      const baseAngle = Math.random() * Math.PI * 2;
      const angleVariation = (Math.random() - 0.5) * 0.6; // Increased randomness
      const angle = baseAngle + angleVariation;
      
      // ENHANCED: Ensure sediment is clearly outside rocks at proper distance
      const distance = clusterSize * (1.2 + Math.random() * 0.6); // Proper distance for visibility
      
      sediment.position.set(
        Math.cos(angle) * distance,
        sedimentSize * 0.08, // ENHANCED: Slightly higher for better visibility
        Math.sin(angle) * distance
      );
      
      sediment.rotation.set(
        Math.random() * 0.2,
        Math.random() * Math.PI * 2,
        Math.random() * 0.2
      );
      
      sediment.castShadow = true;
      sediment.receiveShadow = true;
      
      rockGroup.add(sediment);
    }
  }
  
  /**
   * Add comprehensive debris field around rock cluster - ENHANCED REALISTIC SIZES
   */
  private addDebrisField(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    let debrisCount: number;
    
    switch (category) {
      case 'massive':
        debrisCount = 16 + Math.floor(Math.random() * 5); // 16-20
        break;
      case 'large':
        debrisCount = 12 + Math.floor(Math.random() * 5); // 12-16
        break;
      case 'medium':
        debrisCount = 8 + Math.floor(Math.random() * 5); // 8-12
        break;
      default:
        return;
    }
    
    console.log(`🪨 Adding ${debrisCount} realistic debris pieces to ${category} cluster`);
    
    const rockColors = [0x696969, 0x708090, 0x778899, 0x8B7355]; // expanded realistic rock fragment colors
    let previousDebrisPosition: { angle: number; distance: number } | null = null;
    
    for (let i = 0; i < debrisCount; i++) {
      // ENHANCED: Restored realistic debris size (10-25% of cluster size for visible rock fragments)
      const debrisSize = clusterSize * (0.10 + Math.random() * 0.15);
      let geometry: THREE.BufferGeometry;
      let material: THREE.MeshStandardMaterial;
      
      const isPebble = Math.random() < 0.4; // 40% pebbles, 60% angular fragments for more realism
      
      if (isPebble) {
        // Create organic pebble geometries - enhanced realism
        const pebbleType = Math.floor(Math.random() * 3);
        
        switch (pebbleType) {
          case 0: // Organic flattened sphere
            geometry = new THREE.SphereGeometry(debrisSize, 10, 8);
            geometry.scale(1.2 + Math.random() * 0.4, 0.4 + Math.random() * 0.2, 1.0 + Math.random() * 0.4);
            break;
          case 1: // Flat disc pebble
            const radius = debrisSize * 0.9;
            geometry = new THREE.CylinderGeometry(radius, radius * 0.6, debrisSize * 0.2, 12);
            break;
          case 2: // Elongated pebble
            geometry = new THREE.SphereGeometry(debrisSize, 10, 8);
            geometry.scale(0.6 + Math.random() * 0.3, 0.4 + Math.random() * 0.2, 1.5 + Math.random() * 0.4);
            break;
          default:
            geometry = new THREE.SphereGeometry(debrisSize, 8, 6);
        }
        
        // ENHANCED: Better parent rock material matching
        const mainRock = rockGroup.children[0] as THREE.Mesh;
        const parentColor = mainRock?.material ? (mainRock.material as THREE.MeshStandardMaterial).color : new THREE.Color(0x696969);
        
        material = new THREE.MeshStandardMaterial({
          color: parentColor.clone().multiplyScalar(0.8 + Math.random() * 0.4),
          roughness: 0.88 + Math.random() * 0.12,
          metalness: 0.05
        });
      } else {
        // Create angular rock fragments - enhanced realism with better variety
        const fragmentType = Math.floor(Math.random() * 5);
        
        switch (fragmentType) {
          case 0: // Angular slab
            geometry = new THREE.BoxGeometry(debrisSize * 1.4, debrisSize * 0.3, debrisSize * 0.8);
            this.applyOrganicNoise(geometry, 0.15);
            break;
          case 1: // Rock chunk
            geometry = new THREE.DodecahedronGeometry(debrisSize, 0);
            this.applyOrganicNoise(geometry, 0.12);
            break;
          case 2: // Rough polygon
            geometry = new THREE.IcosahedronGeometry(debrisSize, 0);
            this.applyOrganicNoise(geometry, 0.18);
            break;
          case 3: // Cracked sphere fragment
            geometry = new THREE.SphereGeometry(debrisSize, 8, 6);
            this.applyOrganicNoise(geometry, 0.22);
            break;
          case 4: // Flat broken piece
            geometry = new THREE.CylinderGeometry(debrisSize * 0.8, debrisSize * 0.6, debrisSize * 0.25, 8);
            this.applyOrganicNoise(geometry, 0.16);
            break;
          default:
            geometry = new THREE.BoxGeometry(debrisSize, debrisSize * 0.8, debrisSize);
        }
        
        // ENHANCED: Better material matching with parent rock and weathering
        const mainRock = rockGroup.children[0] as THREE.Mesh;
        const parentColor = mainRock?.material ? (mainRock.material as THREE.MeshStandardMaterial).color : new THREE.Color(0x696969);
        
        material = new THREE.MeshStandardMaterial({
          color: parentColor.clone().multiplyScalar(0.7 + Math.random() * 0.5),
          roughness: 0.85 + Math.random() * 0.15,
          metalness: 0.05,
          // Add slight weathering tint
        });
        
        // Add weathering effect to fragments
        if (Math.random() < 0.3) {
          const weatheringColor = new THREE.Color(0x4A4A2A);
          material.color.lerp(weatheringColor, 0.15);
        }
      }
      
      const debris = new THREE.Mesh(geometry, material);
      
      // ENHANCED: Better clustering and positioning logic
      let angle: number, distance: number;
      
      if (Math.random() < 0.7 && previousDebrisPosition) {
        // Enhanced clustering near previous debris
        angle = previousDebrisPosition.angle + (Math.random() - 0.5) * 0.8;
        distance = previousDebrisPosition.distance + debrisSize * (1.2 + Math.random() * 0.6);
      } else {
        // Scatter randomly around cluster base
        angle = Math.random() * Math.PI * 2;
        distance = clusterSize * (1.4 + Math.random() * 1.2); // Ensured outside cluster with good spacing
      }
      
      debris.position.set(
        Math.cos(angle) * distance,
        debrisSize * (0.2 + Math.random() * 0.2), // Better base-level positioning
        Math.sin(angle) * distance
      );
      
      debris.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      
      // ENHANCED: Better scaling for natural size variation
      debris.scale.setScalar(0.9 + Math.random() * 0.2);
      debris.castShadow = true;
      debris.receiveShadow = true;
      
      rockGroup.add(debris);
      previousDebrisPosition = { angle, distance };
    }
  }
  
  /**
   * Add clustered tiny pebbles for extra detail - ENHANCED REALISTIC SIZES
   */
  private addClusteredTinyPebbles(rockGroup: THREE.Group, category: string, clusterSize: number): void {
    let clusterCount: number;
    
    switch (category) {
      case 'massive':
        clusterCount = 3 + Math.floor(Math.random() * 3); // 3-5
        break;
      case 'large':
        clusterCount = 2 + Math.floor(Math.random() * 3); // 2-4
        break;
      case 'medium':
        clusterCount = 1 + Math.floor(Math.random() * 2); // 1-2
        break;
      default:
        return;
    }
    
    console.log(`🪨 Adding ${clusterCount} enhanced micro-pebble clusters to ${category} cluster`);
    
    const pebbleColors = [0xC4A484, 0xB8956A, 0xA0855B, 0x8B7355, 0x696969]; // expanded natural colors
    
    for (let c = 0; c < clusterCount; c++) {
      const pebbleCount = 5 + Math.floor(Math.random() * 6); // 5-10 per cluster
      
      // ENHANCED: Better cluster center positioning
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = clusterSize * (0.9 + Math.random() * 0.9); // Closer to main cluster
      const clusterCenter = new THREE.Vector3(
        Math.cos(clusterAngle) * clusterDistance,
        0,
        Math.sin(clusterAngle) * clusterDistance
      );
      
      for (let p = 0; p < pebbleCount; p++) {
        // ENHANCED: Restored realistic pebble size (3-8% of cluster size for visible micro-detail)
        const pebbleSize = clusterSize * (0.03 + Math.random() * 0.05);
        const geometry = new THREE.SphereGeometry(pebbleSize, 8, 6);
        
        // ENHANCED: More natural pebble shape variation
        geometry.scale(
          0.8 + Math.random() * 0.6,
          0.4 + Math.random() * 0.4,
          0.7 + Math.random() * 0.6
        );
        
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(pebbleColors[p % pebbleColors.length]),
          roughness: 0.92,
          metalness: 0.02
        });
        
        const pebble = new THREE.Mesh(geometry, material);
        
        // ENHANCED: Better clustering around cluster center
        const pebbleAngle = Math.random() * Math.PI * 2;
        const pebbleDistance = pebbleSize * (2.0 + Math.random() * 5); // Better spacing for visibility
        
        pebble.position.copy(clusterCenter).add(new THREE.Vector3(
          Math.cos(pebbleAngle) * pebbleDistance,
          pebbleSize * 0.3, // ENHANCED: Better height for visibility
          Math.sin(pebbleAngle) * pebbleDistance
        ));
        
        pebble.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI
        );
        
        pebble.castShadow = true;
        pebble.receiveShadow = true;
        
        rockGroup.add(pebble);
      }
    }
  }
  
  /**
   * Apply organic noise for natural rock fragmentation
   */
  private applyOrganicNoise(geometry: THREE.BufferGeometry, intensity: number = 0.1): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalizedX = x / length;
        const normalizedY = y / length;
        const normalizedZ = z / length;
        
        const offset = Math.sin(x * 8) * Math.cos(z * 6) * intensity;
        
        positions[i] += normalizedX * offset;
        positions[i + 1] += normalizedY * offset;
        positions[i + 2] += normalizedZ * offset;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
