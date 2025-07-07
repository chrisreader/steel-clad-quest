import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { RealisticTreeGenerator } from './vegetation/RealisticTreeGenerator';
import { BushClusterGenerator } from './vegetation/BushClusterGenerator';
import { TreeSpeciesType } from './vegetation/TreeSpecies';

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
    
    console.log('🌲 TerrainFeatureGenerator initialized for infinite world generation');
  }

  // Main method to generate features for a region - INFINITE VERSION
  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already generated
    if (this.spawnedFeatures.has(regionKey)) {
      return;
    }

    console.log(`🌲 Generating infinite features for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);

    const features: THREE.Object3D[] = [];
    this.spawnedFeatures.set(regionKey, features);

    // Get ring definition for this region
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Calculate base density based on distance (decreases with distance but never reaches zero)
    const baseDensity = Math.max(0.3, 1.0 - (region.ringIndex * 0.1));
    
    // Generate feature clusters for this region
    const clusters = this.generateFeatureClusters(region, baseDensity);
    
    // Generate features for each cluster
    clusters.forEach((cluster, index) => {
      const clusterId = `${regionKey}_cluster_${index}`;
      const clusterFeatures = this.generateClusterFeatures(cluster, clusterId);
      features.push(...clusterFeatures);
    });

    console.log(`🌲 Generated ${features.length} features for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
  }

  // Generate feature clusters for infinite world
  private generateFeatureClusters(region: RegionCoordinates, density: number): FeatureCluster[] {
    const clusters: FeatureCluster[] = [];
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Calculate cluster count based on ring size and density
    const ringSize = ringDef.outerRadius - ringDef.innerRadius;
    const baseClusterCount = Math.max(2, Math.floor(ringSize / 80)); // At least 2 clusters per region
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
      const clusterRadius = 15 + (Math.random() * 25); // 15-40 unit radius
      const clusterDensity = 0.4 + (Math.random() * 0.6); // 40-100% density
      
      clusters.push({
        position: clusterPosition,
        radius: clusterRadius,
        density: clusterDensity,
        type: clusterType
      });
    }
    
    return clusters;
  }

  // Determine cluster type based on biome and location - INFINITE VERSION
  private determineClusterType(region: RegionCoordinates, position: THREE.Vector3): 'forest' | 'rocks' | 'bushes' | 'mixed' {
    const distance = position.length();
    
    // Biome-based cluster determination for infinite world
    if (distance < 150) {
      // Near spawn: mixed vegetation
      return Math.random() < 0.6 ? 'mixed' : 'forest';
    } else if (distance < 500) {
      // Mid-range: balanced distribution
      const rand = Math.random();
      if (rand < 0.4) return 'forest';
      else if (rand < 0.7) return 'mixed';
      else return 'rocks';
    } else {
      // Far regions: more rocky and sparse
      const rand = Math.random();
      if (rand < 0.25) return 'forest';
      else if (rand < 0.5) return 'rocks';
      else if (rand < 0.8) return 'bushes';
      else return 'mixed';
    }
  }

  // Generate features for a specific cluster
  private generateClusterFeatures(cluster: FeatureCluster, clusterId: string): THREE.Object3D[] {
    const features: THREE.Object3D[] = [];
    
    // Calculate number of features based on cluster size and density
    const baseFeatureCount = Math.floor((cluster.radius * cluster.radius * Math.PI) / 120);
    const actualFeatureCount = Math.max(1, Math.floor(baseFeatureCount * cluster.density));
    
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

  // Generate tree feature
  private generateTreeFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    try {
      const tree = this.treeGenerator.createTree(TreeSpeciesType.OAK, position);
      tree.name = id;
      return tree;
    } catch (error) {
      console.warn(`Failed to generate tree at ${position.x}, ${position.z}:`, error);
      return null;
    }
  }

  // Generate rock feature
  private generateRockFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    try {
      const rock = this.createSimpleRock();
      rock.position.copy(position);
      rock.name = id;
      return rock;
    } catch (error) {
      console.warn(`Failed to generate rock at ${position.x}, ${position.z}:`, error);
      return null;
    }
  }

  // Generate bush feature
  private generateBushFeature(position: THREE.Vector3, id: string): THREE.Object3D | null {
    try {
      const bushCluster = BushClusterGenerator.createBushCluster(position, 'mixed', 2.0);
      const bushGroup = this.createBushGroupFromCluster(bushCluster);
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
    
    if (featureType < 0.5) {
      return this.generateTreeFeature(position, id);
    } else if (featureType < 0.8) {
      return this.generateBushFeature(position, id);
    } else {
      return this.generateRockFeature(position, id);
    }
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

  // Create simple rock geometry
  private createSimpleRock(): THREE.Object3D {
    const rockGroup = new THREE.Group();
    
    // Create random rock shape
    const size = 0.8 + Math.random() * 1.2;
    const segments = 6 + Math.floor(Math.random() * 4);
    
    const geometry = new THREE.SphereGeometry(size, segments, segments);
    
    // Deform the geometry for more natural look
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
    
    rockGroup.add(rock);
    return rockGroup;
  }

  // Create bush group from cluster data
  private createBushGroupFromCluster(cluster: any): THREE.Object3D {
    const group = new THREE.Group();
    
    // Create a simple bush geometry since we don't have access to the full bush generator
    const bushGeometry = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 8, 6);
    const bushMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c4a,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const bush = new THREE.Mesh(bushGeometry, bushMaterial);
    bush.scale.y = 0.6 + Math.random() * 0.4;
    bush.castShadow = true;
    bush.receiveShadow = true;
    
    group.add(bush);
    return group;
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