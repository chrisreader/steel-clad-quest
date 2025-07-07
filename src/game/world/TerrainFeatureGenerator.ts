import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RealisticTreeGenerator } from './vegetation/RealisticTreeGenerator';
import { BushClusterGenerator } from './vegetation/BushClusterGenerator';
import { TreeSpeciesType, TreeSpeciesManager } from './vegetation/TreeSpecies';
import { BushSpeciesType, BushSpeciesManager } from './vegetation/BushSpecies';
import { SmallBushSpeciesManager } from './vegetation/SmallBushSpecies';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { RockVariation, ROCK_VARIATIONS } from './rocks/config/RockVariationConfig';
import { RockShape, ROCK_SHAPES } from './rocks/config/RockShapeConfig';
import { RockMaterialGenerator } from './rocks/materials/RockMaterialGenerator';

export interface FeatureCluster {
  position: THREE.Vector3;
  radius: number;
  density: number;
  type: 'forest' | 'rocks' | 'bushes' | 'mixed';
}

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  private treeGenerator: RealisticTreeGenerator;
  private rockClusterGenerator: RockClusterGenerator;
  
  // Feature tracking for cleanup
  private spawnedFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Tavern exclusion zone
  private tavernPosition = new THREE.Vector3(50, 0, 50);
  private tavernExclusionRadius = 25;
  
  // Collision registration callback
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;

  constructor(
    scene: THREE.Scene, 
    ringSystem: RingQuadrantSystem,
    collisionRegistrationCallback?: (object: THREE.Object3D) => void
  ) {
    this.scene = scene;
    this.ringSystem = ringSystem;
    this.collisionRegistrationCallback = collisionRegistrationCallback;
    
    // Initialize tree generator
    this.treeGenerator = new RealisticTreeGenerator();
    
    // Initialize rock cluster generator
    this.rockClusterGenerator = new RockClusterGenerator();
    
    console.log('🌲 TerrainFeatureGenerator initialized for infinite world generation with complex features');
  }

  // Main method to generate features for a region - INFINITE VERSION
  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.spawnedFeatures.has(regionKey)) {
      return;
    }

    console.log(`🌲 Generating rich features for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);

    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);

    // Get ring definition for this region
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // IMPROVED: Maintain consistent density with slight variation by biome type
    const baseDensity = this.calculateImprovedDensity(region);
    
    // Generate feature clusters for this region
    const clusters = this.generateFeatureClusters(region, baseDensity);
    
    // Generate features for each cluster
    clusters.forEach((cluster, index) => {
      const clusterId = `${regionKey}_cluster_${index}`;
      const clusterFeatures = this.generateClusterFeatures(cluster, clusterId);
      features.push(...clusterFeatures);
    });

    console.log(`🌲 Generated ${features.length} rich features for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
  }

  // Generate feature clusters for infinite world
  private generateFeatureClusters(region: RegionCoordinates, density: number): FeatureCluster[] {
    const clusters: FeatureCluster[] = [];
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Calculate cluster count based on ring size and density
    const ringSize = ringDef.outerRadius - ringDef.innerRadius;
    const baseClusterCount = Math.max(3, Math.floor(ringSize / 60)); // More clusters for richer world
    const actualClusterCount = Math.floor(baseClusterCount * density);
    
    for (let i = 0; i < actualClusterCount; i++) {
      // Generate cluster position within region bounds
      const clusterPosition = this.getRandomPositionInRegion(region);
      
      // Skip if too close to tavern
      if (clusterPosition.distanceTo(this.tavernPosition) < this.tavernExclusionRadius) {
        continue;
      }
      
      // Determine cluster type based on biome and position
      const clusterType = this.determineClusterType(region, clusterPosition);
      const clusterRadius = 12 + (Math.random() * 20); // 12-32 unit radius for bigger clusters
      const clusterDensity = 0.6 + (Math.random() * 0.4); // 60-100% density
      
      clusters.push({
        position: clusterPosition,
        radius: clusterRadius,
        density: clusterDensity,
        type: clusterType
      });
    }
    
    return clusters;
  }

  // Determine cluster type based on biome and location - IMPROVED VERSION
  private determineClusterType(region: RegionCoordinates, position: THREE.Vector3): 'forest' | 'rocks' | 'bushes' | 'mixed' {
    const distance = position.length();
    
    // Improved biome-based cluster determination for infinite world
    if (distance < 150) {
      // Near spawn: lush mixed vegetation
      const rand = Math.random();
      if (rand < 0.5) return 'forest';
      else if (rand < 0.8) return 'mixed';
      else return 'bushes';
    } else if (distance < 400) {
      // Mid-range: balanced distribution with more forests
      const rand = Math.random();
      if (rand < 0.4) return 'forest';
      else if (rand < 0.7) return 'mixed';
      else if (rand < 0.85) return 'rocks';
      else return 'bushes';
    } else if (distance < 800) {
      // Far regions: more dramatic features
      const rand = Math.random();
      if (rand < 0.3) return 'forest';
      else if (rand < 0.6) return 'rocks';
      else if (rand < 0.8) return 'mixed';
      else return 'bushes';
    } else {
      // Very far regions: harsh but still varied landscape
      const rand = Math.random();
      if (rand < 0.2) return 'forest';
      else if (rand < 0.5) return 'rocks';
      else if (rand < 0.8) return 'bushes';
      else return 'mixed';
    }
  }

  // Generate features for a specific cluster
  private generateClusterFeatures(cluster: FeatureCluster, clusterId: string): THREE.Object3D[] {
    const features: THREE.Object3D[] = [];
    
    // Calculate number of features based on cluster size and density
    const baseFeatureCount = Math.floor((cluster.radius * cluster.radius * Math.PI) / 80); // More features
    const actualFeatureCount = Math.max(2, Math.floor(baseFeatureCount * cluster.density));
    
    for (let i = 0; i < actualFeatureCount; i++) {
      const featurePosition = this.generateFeaturePosition(cluster);
      
      // Skip if too close to tavern
      if (featurePosition.distanceTo(this.tavernPosition) < this.tavernExclusionRadius) {
        continue;
      }
      
      let feature: THREE.Object3D | null = null;
      
      // Generate feature based on cluster type
      switch (cluster.type) {
        case 'forest':
          feature = this.generateTreeFeature(featurePosition, `${clusterId}_tree_${i}`);
          break;
        case 'rocks':
          feature = this.generateRockFeature(featurePosition, `${clusterId}_rock_${i}`);
          break;
        case 'bushes':
          feature = this.generateBushFeature(featurePosition, `${clusterId}_bush_${i}`);
          break;
        case 'mixed':
          feature = this.generateMixedFeature(featurePosition, `${clusterId}_mixed_${i}`);
          break;
      }
      
      if (feature) {
        features.push(feature);
        this.scene.add(feature);
        
        // Register collision if callback is available
        if (this.collisionRegistrationCallback) {
          this.collisionRegistrationCallback(feature);
        }
      }
    }
    
    return features;
  }

  // Generate position within cluster bounds
  private generateFeaturePosition(cluster: FeatureCluster): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * cluster.radius;
    
    return new THREE.Vector3(
      cluster.position.x + Math.cos(angle) * distance,
      0,
      cluster.position.z + Math.sin(angle) * distance
    );
  }

  // Generate random position within region - INFINITE VERSION
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

  // Generate tree feature with species variety
  private generateTreeFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    try {
      // Select tree species based on distance and biome
      const species = this.selectTreeSpecies(position);
      const tree = this.treeGenerator.createTree(species, position);
      tree.name = id;
      
      // Add natural variation
      const scale = 0.8 + Math.random() * 0.4;
      tree.scale.set(scale, scale, scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      
      return tree;
    } catch (error) {
      console.warn(`Failed to generate tree at ${position.x}, ${position.z}:`, error);
      return null;
    }
  }

  // Generate rock feature with complex formations
  private generateRockFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    try {
      const rockFormation = this.createComplexRockFormation(position);
      rockFormation.name = id;
      return rockFormation;
    } catch (error) {
      console.warn(`Failed to generate rock at ${position.x}, ${position.z}:`, error);
      return null;
    }
  }

  // Generate bush feature with proper species variety
  private generateBushFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    try {
      const clusterType = this.selectBushClusterType(position);
      const maxRadius = 2.0 + Math.random() * 2.0; // 2-4 unit radius
      const bushCluster = BushClusterGenerator.createBushCluster(position, clusterType, maxRadius);
      const bushGroup = this.createRealisticBushGroup(bushCluster);
      bushGroup.name = id;
      return bushGroup;
    } catch (error) {
      console.warn(`Failed to generate bush at ${position.x}, ${position.z}:`, error);
      return null;
    }
  }

  // Generate mixed feature (random selection)
  private generateMixedFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    const featureType = Math.random();
    
    if (featureType < 0.4) {
      return this.generateTreeFeature(position, id);
    } else if (featureType < 0.7) {
      return this.generateBushFeature(position, id);
    } else {
      return this.generateRockFeature(position, id);
    }
  }

  // NEW: Calculate improved density that maintains variety across distance
  private calculateImprovedDensity(region: RegionCoordinates): number {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const distance = (ringDef.innerRadius + ringDef.outerRadius) / 2;
    
    // Base density remains high across all distances
    let baseDensity = 0.8;
    
    // Biome-based density variation instead of distance-based reduction
    if (distance < 150) {
      baseDensity = 0.9; // Spawn area - slightly higher
    } else if (distance < 500) {
      baseDensity = 0.85; // Mid-range - normal density
    } else if (distance < 1000) {
      baseDensity = 0.8; // Far areas - slightly lower but still rich
    } else {
      baseDensity = 0.75; // Very far - still plenty of features
    }
    
    return baseDensity;
  }

  // NEW: Select tree species based on distance and biome simulation
  private selectTreeSpecies(position: THREE.Vector3): TreeSpeciesType {
    const distance = position.length();
    const allSpecies = TreeSpeciesManager.getAllSpecies();
    
    // Biome-based species selection
    if (distance < 100) {
      // Spawn area: mixed forest
      const spawnSpecies = [TreeSpeciesType.OAK, TreeSpeciesType.BIRCH, TreeSpeciesType.WILLOW];
      return spawnSpecies[Math.floor(Math.random() * spawnSpecies.length)];
    } else if (distance < 300) {
      // Near areas: oak and pine dominant
      const nearSpecies = [TreeSpeciesType.OAK, TreeSpeciesType.PINE, TreeSpeciesType.BIRCH, TreeSpeciesType.DEAD];
      const weights = [0.4, 0.3, 0.2, 0.1];
      return this.weightedRandomChoice(nearSpecies, weights);
    } else if (distance < 600) {
      // Mid areas: pine and birch forests
      const midSpecies = [TreeSpeciesType.PINE, TreeSpeciesType.BIRCH, TreeSpeciesType.OAK, TreeSpeciesType.DEAD];
      const weights = [0.4, 0.3, 0.2, 0.1];
      return this.weightedRandomChoice(midSpecies, weights);
    } else {
      // Far areas: more dead trees and hardy species
      const farSpecies = [TreeSpeciesType.PINE, TreeSpeciesType.DEAD, TreeSpeciesType.BIRCH, TreeSpeciesType.OAK];
      const weights = [0.3, 0.3, 0.2, 0.2];
      return this.weightedRandomChoice(farSpecies, weights);
    }
  }

  // NEW: Select bush cluster type based on environment
  private selectBushClusterType(position: THREE.Vector3): 'family' | 'mixed' | 'tree_base' | 'rock_side' {
    const distance = position.length();
    
    if (distance < 100) {
      // Near spawn: mixed variety
      const types: ('family' | 'mixed' | 'tree_base')[] = ['family', 'mixed', 'tree_base'];
      return types[Math.floor(Math.random() * types.length)];
    } else if (distance < 400) {
      // Mid range: family clusters common
      return Math.random() < 0.5 ? 'family' : 'mixed';
    } else {
      // Far areas: more rock-side clusters (harsh environment)
      const types: ('mixed' | 'rock_side')[] = ['mixed', 'rock_side'];
      return types[Math.floor(Math.random() * types.length)];
    }
  }

  // NEW: Weighted random choice helper
  private weightedRandomChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1]; // fallback
  }

  // NEW: Create complex rock formations using proper systems
  private createComplexRockFormation(position: THREE.Vector3): THREE.Object3D {
    const rockGroup = new THREE.Group();
    rockGroup.position.copy(position);
    
    // Select rock variation based on distance for variety
    const distance = position.length();
    let selectedVariation: RockVariation;
    
    if (distance < 200) {
      // Near spawn: medium rocks
      selectedVariation = ROCK_VARIATIONS.find(v => v.category === 'medium') || ROCK_VARIATIONS[2];
    } else if (distance < 500) {
      // Mid range: large formations
      selectedVariation = ROCK_VARIATIONS.find(v => v.category === 'large') || ROCK_VARIATIONS[3];
    } else {
      // Far areas: massive formations for dramatic landscape
      selectedVariation = ROCK_VARIATIONS.find(v => v.category === 'massive') || ROCK_VARIATIONS[4];
    }
    
    // Use the sophisticated rock cluster generator
    try {
      this.rockClusterGenerator.createVariedRockCluster(
        rockGroup,
        selectedVariation,
        Math.floor(Math.random() * 1000),
        this.createCharacterBaseGeometry.bind(this),
        this.applyShapeModifications.bind(this),
        this.applyCharacterDeformation.bind(this),
        this.validateAndEnhanceGeometry.bind(this)
      );
    } catch (error) {
      console.warn('Failed to create complex rock formation, falling back to simple rock');
      // Fallback to a simple rock if complex generation fails
      const fallbackRock = this.createFallbackRock();
      rockGroup.add(fallbackRock);
    }
    
    return rockGroup;
  }

  // NEW: Create realistic bush group from cluster data
  private createRealisticBushGroup(cluster: any): THREE.Object3D {
    const group = new THREE.Group();
    group.position.copy(cluster.centerPosition);
    
    // Generate bushes for each bush in the cluster
    for (const bushData of cluster.bushes) {
      const bush = this.createRealisticBush(bushData);
      group.add(bush);
    }
    
    return group;
  }

  // NEW: Create individual realistic bush
  private createRealisticBush(bushData: any): THREE.Object3D {
    const species = bushData.species;
    const scale = bushData.scale;
    
    // Create bush based on species type
    let bushGeometry: THREE.BufferGeometry;
    let bushMaterial: THREE.MeshStandardMaterial;
    
    if (bushData.isSmall) {
      // Small bush - more compact
      bushGeometry = new THREE.SphereGeometry(
        species.sizeRange[0] * scale,
        8,
        6
      );
      bushMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a6b3a,
        roughness: 0.9,
        metalness: 0.05
      });
    } else {
      // Regular bush - larger and more varied
      const baseSize = species.sizeRange[0] + Math.random() * (species.sizeRange[1] - species.sizeRange[0]);
      bushGeometry = new THREE.SphereGeometry(baseSize * scale, 10, 8);
      
      // Color variation based on species
      let color = 0x4a7c4a; // default green
      switch (species.type) {
        case 'dense_round':
          color = 0x2d5a2d;
          break;
        case 'wild_berry':
          color = 0x4a6b2f;
          break;
        case 'flowering_ornamental':
          color = 0x5a7c3a;
          break;
      }
      
      bushMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8,
        metalness: 0.1
      });
    }
    
    // Apply some deformation for natural look
    const positions = bushGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const noise = (Math.random() - 0.5) * 0.2;
      positions[i] *= 1 + noise;
      positions[i + 1] *= 1 + noise * 0.8; // Less vertical deformation
      positions[i + 2] *= 1 + noise;
    }
    bushGeometry.attributes.position.needsUpdate = true;
    bushGeometry.computeVertexNormals();
    
    const bush = new THREE.Mesh(bushGeometry, bushMaterial);
    bush.position.copy(bushData.position);
    bush.castShadow = true;
    bush.receiveShadow = true;
    
    return bush;
  }

  // NEW: Rock generation helper methods for complex formations
  private createCharacterBaseGeometry(rockShape: RockShape, rockSize: number): THREE.BufferGeometry {
    return RockShapeFactory.generateRock(rockShape.type as any, rockSize, 0.6).geometry;
  }

  private applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number): void {
    // Apply shape-specific modifications using safe property access
    const generatedRock = RockShapeFactory.generateRock(rockShape.type as any, rockSize, 0.6);
    geometry.scale(generatedRock.scale, generatedRock.scale, generatedRock.scale);
    geometry.rotateX(generatedRock.rotation.x);
    geometry.rotateY(generatedRock.rotation.y);
    geometry.rotateZ(generatedRock.rotation.z);
  }

  private applyCharacterDeformation(geometry: THREE.BufferGeometry, intensity: number, rockSize: number, rockShape: RockShape): void {
    // Apply organic deformation to make rocks look more natural
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const noise = (Math.random() - 0.5) * intensity * 0.3;
      positions[i] *= 1 + noise;
      positions[i + 1] *= 1 + noise;
      positions[i + 2] *= 1 + noise;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private validateAndEnhanceGeometry(geometry: THREE.BufferGeometry): void {
    // Ensure geometry is valid
    if (!geometry.attributes.position) {
      console.warn('Invalid geometry detected, skipping validation');
      return;
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  // NEW: Fallback rock creation for when complex generation fails
  private createFallbackRock(): THREE.Object3D {
    const size = 1.0 + Math.random() * 2.0;
    const geometry = new THREE.SphereGeometry(size, 12, 8);
    
    // Apply basic deformation
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const noise = (Math.random() - 0.5) * 0.3;
      positions[i] *= 1 + noise;
      positions[i + 1] *= 1 + noise;
      positions[i + 2] *= 1 + noise;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const rock = new THREE.Mesh(geometry, material);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  // Cleanup features for a region
  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.spawnedFeatures.get(regionKey);
    
    if (!features) return;
    
    console.log(`🌲 Cleaning up features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    features.forEach(feature => {
      this.scene.remove(feature);
      
      // Dispose materials and geometries
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
    });
    
    this.spawnedFeatures.delete(regionKey);
  }

  // Update tree foliage materials for day/night lighting
  public updateTreeDayNightLighting(dayFactor: number, nightFactor: number): void {
    if (this.treeGenerator && this.treeGenerator.updateDayNightLighting) {
      this.treeGenerator.updateDayNightLighting(dayFactor, nightFactor);
    }
  }

  // Dispose all resources
  public dispose(): void {
    // Clean up all features
    for (const [regionKey, features] of this.spawnedFeatures.entries()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
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
      });
    }
    
    this.spawnedFeatures.clear();
    
    // Dispose generators
    if (this.treeGenerator && this.treeGenerator.dispose) {
      this.treeGenerator.dispose();
    }
  }
}