import * as THREE from 'three';
import { RegionCoordinates } from './RingQuadrantSystem';
import { InfiniteWorldSystem, ContentDistribution } from './InfiniteWorldSystem';
import { TerrainFeatureGenerator } from './TerrainFeatureGenerator';

export interface ProceduralContentConfig {
  rockClusterStyles: string[];
  vegetationDensityMultiplier: number;
  landmarkTypes: string[];
  biomeSpecificContent: boolean;
}

export interface LandmarkDefinition {
  type: string;
  size: { min: number; max: number };
  rarity: number;
  biomePreference: string[];
  heightRequirement?: { min: number; max: number };
}

export class ProceduralContentManager {
  private infiniteWorldSystem: InfiniteWorldSystem;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private scene: THREE.Scene;
  
  // Content variation patterns
  private rockClusterVariations: Map<string, any[]> = new Map();
  private landmarkDefinitions: Map<string, LandmarkDefinition> = new Map();
  
  constructor(
    infiniteWorldSystem: InfiniteWorldSystem, 
    terrainFeatureGenerator: TerrainFeatureGenerator,
    scene: THREE.Scene
  ) {
    this.infiniteWorldSystem = infiniteWorldSystem;
    this.terrainFeatureGenerator = terrainFeatureGenerator;
    this.scene = scene;
    
    this.initializeContentVariations();
    this.initializeLandmarkDefinitions();
  }

  private initializeContentVariations(): void {
    // Rock cluster style variations per ring style
    this.rockClusterVariations.set('temperate', [
      { style: 'meadow_stones', scale: { min: 0.8, max: 1.2 }, weathering: 0.3 },
      { style: 'forest_boulders', scale: { min: 1.0, max: 1.5 }, weathering: 0.5 },
      { style: 'stream_rocks', scale: { min: 0.6, max: 1.0 }, weathering: 0.7 }
    ]);
    
    this.rockClusterVariations.set('wilderness', [
      { style: 'wild_outcrops', scale: { min: 1.2, max: 2.0 }, weathering: 0.4 },
      { style: 'cliff_fragments', scale: { min: 1.5, max: 2.5 }, weathering: 0.3 },
      { style: 'ancient_stones', scale: { min: 1.0, max: 1.8 }, weathering: 0.8 }
    ]);
    
    this.rockClusterVariations.set('ancient', [
      { style: 'weathered_monoliths', scale: { min: 2.0, max: 3.5 }, weathering: 0.9 },
      { style: 'carved_remnants', scale: { min: 1.5, max: 2.8 }, weathering: 0.7 },
      { style: 'time_worn_spires', scale: { min: 2.5, max: 4.0 }, weathering: 0.8 }
    ]);
    
    this.rockClusterVariations.set('mystical', [
      { style: 'crystal_formations', scale: { min: 1.8, max: 3.2 }, weathering: 0.2 },
      { style: 'floating_stones', scale: { min: 1.0, max: 2.0 }, weathering: 0.1 },
      { style: 'energy_crystals', scale: { min: 0.8, max: 1.6 }, weathering: 0.0 }
    ]);
    
    this.rockClusterVariations.set('primordial', [
      { style: 'titan_bones', scale: { min: 3.0, max: 5.0 }, weathering: 1.0 },
      { style: 'world_shards', scale: { min: 2.5, max: 4.5 }, weathering: 0.6 },
      { style: 'creation_stones', scale: { min: 2.0, max: 3.8 }, weathering: 0.4 }
    ]);
    
    console.log('🎨 [ProceduralContentManager] Initialized rock cluster variations for all ring styles');
  }

  private initializeLandmarkDefinitions(): void {
    this.landmarkDefinitions.set('ancient_ruin', {
      type: 'ancient_ruin',
      size: { min: 15, max: 35 },
      rarity: 0.1,
      biomePreference: ['ancient', 'mystical'],
      heightRequirement: { min: 5, max: 50 }
    });
    
    this.landmarkDefinitions.set('crystal_spire', {
      type: 'crystal_spire',
      size: { min: 20, max: 60 },
      rarity: 0.05,
      biomePreference: ['mystical', 'primordial'],
      heightRequirement: { min: 10, max: 100 }
    });
    
    this.landmarkDefinitions.set('titan_skeleton', {
      type: 'titan_skeleton',
      size: { min: 50, max: 120 },
      rarity: 0.02,
      biomePreference: ['primordial'],
      heightRequirement: { min: 0, max: 30 }
    });
    
    this.landmarkDefinitions.set('stone_circle', {
      type: 'stone_circle',
      size: { min: 12, max: 25 },
      rarity: 0.15,
      biomePreference: ['wilderness', 'ancient'],
      heightRequirement: { min: 0, max: 20 }
    });
    
    this.landmarkDefinitions.set('natural_arch', {
      type: 'natural_arch',
      size: { min: 18, max: 40 },
      rarity: 0.08,
      biomePreference: ['wilderness', 'ancient'],
      heightRequirement: { min: 8, max: 60 }
    });
    
    console.log('🏛️ [ProceduralContentManager] Initialized landmark definitions');
  }

  public generateProceduralContentForRegion(region: RegionCoordinates): void {
    console.log(`🎨 [ProceduralContentManager] Generating procedural content for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const contentDistribution = this.infiniteWorldSystem.getContentDistributionForRegion(region);
    const ringStyle = this.infiniteWorldSystem.getRingVarietyStyle(region.ringIndex);
    const regionCenter = this.getRegionCenter(region);
    
    // Generate rock clusters with style variation
    this.generateStyledRockClusters(region, contentDistribution, ringStyle, regionCenter);
    
    // Generate tree groves with biome variation
    this.generateBiomeSpecificTreeGroves(region, contentDistribution, ringStyle, regionCenter);
    
    // Generate bush clusters with environmental variation
    this.generateEnvironmentalBushClusters(region, contentDistribution, ringStyle, regionCenter);
    
    // Generate landmarks for exploration rewards
    this.generateLandmarks(region, contentDistribution, ringStyle, regionCenter);
    
    // Mark region as generated
    this.infiniteWorldSystem.markRegionGenerated(region);
    
    console.log(`✅ [ProceduralContentManager] Completed procedural generation for Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
  }

  private generateStyledRockClusters(
    region: RegionCoordinates, 
    distribution: ContentDistribution, 
    ringStyle: string,
    regionCenter: THREE.Vector3
  ): void {
    const clusterCount = this.randomBetween(
      distribution.rockClustersPerQuadrant.min, 
      distribution.rockClustersPerQuadrant.max
    );
    
    const variations = this.rockClusterVariations.get(ringStyle) || this.rockClusterVariations.get('temperate')!;
    
    for (let i = 0; i < clusterCount; i++) {
      const variation = variations[Math.floor(Math.random() * variations.length)];
      const clusterPosition = this.generateClusterPosition(regionCenter, region.ringIndex);
      
      // Create rock cluster with style-specific parameters
      this.createStyledRockCluster(clusterPosition, variation, ringStyle, region.ringIndex);
    }
    
    console.log(`🪨 [ProceduralContentManager] Generated ${clusterCount} ${ringStyle} style rock clusters`);
  }

  private createStyledRockCluster(
    position: THREE.Vector3, 
    variation: any, 
    ringStyle: string, 
    ringIndex: number
  ): void {
    // Enhanced rock cluster creation with style-specific properties
    const clusterSize = this.randomBetween(variation.scale.min, variation.scale.max) * (1 + ringIndex * 0.1);
    
    // Create cluster based on style
    const rockCluster = new THREE.Group();
    rockCluster.position.copy(position);
    
    const rockCount = Math.floor(3 + Math.random() * 4 * clusterSize);
    
    for (let i = 0; i < rockCount; i++) {
      const rock = this.createStyledRock(variation, ringStyle, clusterSize);
      
      // Position rocks in cluster formation
      const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.random() * clusterSize * 2;
      
      rock.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      rockCluster.add(rock);
    }
    
    this.scene.add(rockCluster);
    
      // Register with terrain system
      this.terrainFeatureGenerator.registerFeature(rockCluster, position);
  }

  private createStyledRock(variation: any, ringStyle: string, clusterSize: number): THREE.Mesh {
    // Create basic rock geometry
    const rockSize = clusterSize * (0.5 + Math.random() * 0.8);
    const geometry = new THREE.SphereGeometry(rockSize, 8, 6);
    
    // Apply style-specific deformation
    this.applyStyleDeformation(geometry, ringStyle, variation.weathering);
    
    // Create style-specific material
    const material = this.createStyledRockMaterial(ringStyle, variation.weathering);
    
    const rock = new THREE.Mesh(geometry, material);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Random rotation
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    
    return rock;
  }

  private applyStyleDeformation(geometry: THREE.BufferGeometry, ringStyle: string, weathering: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      let deformation = 0;
      
      switch (ringStyle) {
        case 'temperate':
          deformation = Math.sin(x * 4) * Math.cos(z * 4) * weathering * 0.1;
          break;
        case 'wilderness':
          deformation = Math.sin(x * 6) * Math.cos(y * 6) * weathering * 0.15;
          break;
        case 'ancient':
          deformation = Math.sin(x * 2) * Math.cos(z * 2) * weathering * 0.2;
          break;
        case 'mystical':
          deformation = Math.sin(x * 8) * Math.cos(z * 8) * (1 - weathering) * 0.25;
          break;
        case 'primordial':
          deformation = Math.sin(x * 3) * Math.cos(y * 3) * Math.sin(z * 3) * weathering * 0.3;
          break;
      }
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        positions[i] += normalX * deformation;
        positions[i + 1] += normalY * deformation;
        positions[i + 2] += normalZ * deformation;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private createStyledRockMaterial(ringStyle: string, weathering: number): THREE.MeshStandardMaterial {
    const baseColors: Record<string, number> = {
      temperate: 0x6B5B73,
      wilderness: 0x5C4A42,
      ancient: 0x4A4A4A,
      mystical: 0x7B6BA8,
      primordial: 0x3A2A1A
    };
    
    const color = baseColors[ringStyle] || baseColors.temperate;
    
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8 + weathering * 0.2,
      metalness: ringStyle === 'mystical' ? 0.1 : 0.0
    });
  }

  private generateBiomeSpecificTreeGroves(
    region: RegionCoordinates, 
    distribution: ContentDistribution, 
    ringStyle: string,
    regionCenter: THREE.Vector3
  ): void {
    const groveCount = this.randomBetween(
      distribution.treeGrovesPerQuadrant.min, 
      distribution.treeGrovesPerQuadrant.max
    );
    
    for (let i = 0; i < groveCount; i++) {
      const grovePosition = this.generateClusterPosition(regionCenter, region.ringIndex);
      this.createBiomeSpecificTreeGrove(grovePosition, ringStyle, region.ringIndex);
    }
    
    console.log(`🌲 [ProceduralContentManager] Generated ${groveCount} ${ringStyle} tree groves`);
  }

  private createBiomeSpecificTreeGrove(position: THREE.Vector3, ringStyle: string, ringIndex: number): void {
    const groveSize = 8 + ringIndex * 2;
    const treeDensity = 0.3 + Math.random() * 0.4;
    const treeCount = Math.floor(groveSize * treeDensity);
    
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * groveSize;
      
      const treePosition = new THREE.Vector3(
        position.x + Math.cos(angle) * distance,
        position.y,
        position.z + Math.sin(angle) * distance
      );
      
      // Use existing tree generator but with biome-specific parameters
      const tree = this.terrainFeatureGenerator.createTree(treePosition);
      if (tree) {
        // Apply ring-style specific modifications
        this.applyRingStyleToTree(tree, ringStyle, ringIndex);
      }
    }
  }

  private applyRingStyleToTree(tree: THREE.Object3D, ringStyle: string, ringIndex: number): void {
    const scaleMultiplier = 1 + ringIndex * 0.1;
    const styleMultipliers: Record<string, number> = {
      temperate: 1.0,
      wilderness: 1.2,
      ancient: 1.5,
      mystical: 1.1,
      primordial: 1.8
    };
    
    const finalScale = scaleMultiplier * (styleMultipliers[ringStyle] || 1.0);
    tree.scale.multiplyScalar(finalScale);
  }

  private generateEnvironmentalBushClusters(
    region: RegionCoordinates, 
    distribution: ContentDistribution, 
    ringStyle: string,
    regionCenter: THREE.Vector3
  ): void {
    const clusterCount = this.randomBetween(
      distribution.bushClustersPerQuadrant.min, 
      distribution.bushClustersPerQuadrant.max
    );
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterPosition = this.generateClusterPosition(regionCenter, region.ringIndex);
      this.createEnvironmentalBushCluster(clusterPosition, ringStyle, region.ringIndex);
    }
    
    console.log(`🌿 [ProceduralContentManager] Generated ${clusterCount} ${ringStyle} bush clusters`);
  }

  private createEnvironmentalBushCluster(position: THREE.Vector3, ringStyle: string, ringIndex: number): void {
    const clusterSize = 6 + ringIndex;
    const bushDensity = 0.4 + Math.random() * 0.3;
    const bushCount = Math.floor(clusterSize * bushDensity);
    
    for (let i = 0; i < bushCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * clusterSize;
      
      const bushPosition = new THREE.Vector3(
        position.x + Math.cos(angle) * distance,
        position.y,
        position.z + Math.sin(angle) * distance
      );
      
      // Use existing bush generator
      const bush = this.terrainFeatureGenerator.createBush(bushPosition);
      if (bush) {
        // Apply style-specific modifications
        this.applyRingStyleToBush(bush, ringStyle, ringIndex);
      }
    }
  }

  private applyRingStyleToBush(bush: THREE.Object3D, ringStyle: string, ringIndex: number): void {
    const scaleMultiplier = 0.8 + ringIndex * 0.05;
    bush.scale.multiplyScalar(scaleMultiplier);
  }

  private generateLandmarks(
    region: RegionCoordinates, 
    distribution: ContentDistribution, 
    ringStyle: string,
    regionCenter: THREE.Vector3
  ): void {
    if (distribution.landmarksPerQuadrant.max === 0) return;
    
    const shouldCreateLandmark = Math.random() < 0.5;
    if (!shouldCreateLandmark) return;
    
    const suitableLandmarks = Array.from(this.landmarkDefinitions.values())
      .filter(landmark => landmark.biomePreference.includes(ringStyle));
    
    if (suitableLandmarks.length === 0) return;
    
    const landmarkDef = suitableLandmarks[Math.floor(Math.random() * suitableLandmarks.length)];
    const landmarkPosition = this.generateLandmarkPosition(regionCenter, region.ringIndex);
    
    this.createLandmark(landmarkPosition, landmarkDef, ringStyle);
    
    console.log(`🏛️ [ProceduralContentManager] Generated ${landmarkDef.type} landmark in ${ringStyle} region`);
  }

  private createLandmark(position: THREE.Vector3, definition: LandmarkDefinition, ringStyle: string): void {
    // Create a simple landmark placeholder - can be expanded with specific landmark types
    const landmarkSize = this.randomBetween(definition.size.min, definition.size.max);
    
    const landmarkGroup = new THREE.Group();
    landmarkGroup.position.copy(position);
    
    // Create landmark geometry based on type
    let landmarkMesh: THREE.Mesh;
    
    switch (definition.type) {
      case 'stone_circle':
        landmarkMesh = this.createStoneCircle(landmarkSize);
        break;
      case 'crystal_spire':
        landmarkMesh = this.createCrystalSpire(landmarkSize);
        break;
      case 'ancient_ruin':
        landmarkMesh = this.createAncientRuin(landmarkSize);
        break;
      default:
        landmarkMesh = this.createGenericLandmark(landmarkSize);
    }
    
    landmarkGroup.add(landmarkMesh);
    this.scene.add(landmarkGroup);
    
      // Register with terrain system
      this.terrainFeatureGenerator.registerFeature(landmarkGroup, position);
  }

  private createStoneCircle(size: number): THREE.Mesh {
    const circleGroup = new THREE.Group();
    const stoneCount = 8 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const stoneHeight = size * (0.8 + Math.random() * 0.4);
      const stoneWidth = size * 0.15;
      
      const stoneGeometry = new THREE.BoxGeometry(stoneWidth, stoneHeight, stoneWidth);
      const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A });
      const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
      
      stone.position.set(
        Math.cos(angle) * size,
        stoneHeight / 2,
        Math.sin(angle) * size
      );
      
      stone.castShadow = true;
      stone.receiveShadow = true;
      circleGroup.add(stone);
    }
    
    return circleGroup as unknown as THREE.Mesh;
  }

  private createCrystalSpire(size: number): THREE.Mesh {
    const spireGeometry = new THREE.ConeGeometry(size * 0.3, size, 6);
    const spireMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7B6BA8, 
      transparent: true, 
      opacity: 0.8,
      metalness: 0.2
    });
    
    const spire = new THREE.Mesh(spireGeometry, spireMaterial);
    spire.position.y = size / 2;
    spire.castShadow = true;
    spire.receiveShadow = true;
    
    return spire;
  }

  private createAncientRuin(size: number): THREE.Mesh {
    const ruinGroup = new THREE.Group();
    
    // Create broken columns
    const columnCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < columnCount; i++) {
      const columnHeight = size * (0.4 + Math.random() * 0.4);
      const columnRadius = size * 0.08;
      
      const columnGeometry = new THREE.CylinderGeometry(columnRadius, columnRadius, columnHeight, 8);
      const columnMaterial = new THREE.MeshStandardMaterial({ color: 0x6B5B73 });
      const column = new THREE.Mesh(columnGeometry, columnMaterial);
      
      const angle = (i / columnCount) * Math.PI * 2;
      column.position.set(
        Math.cos(angle) * size * 0.5,
        columnHeight / 2,
        Math.sin(angle) * size * 0.5
      );
      
      // Add weathering rotation
      column.rotation.z = (Math.random() - 0.5) * 0.3;
      
      column.castShadow = true;
      column.receiveShadow = true;
      ruinGroup.add(column);
    }
    
    return ruinGroup as unknown as THREE.Mesh;
  }

  private createGenericLandmark(size: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(size, 16, 12);
    const material = new THREE.MeshStandardMaterial({ color: 0x5C4A42 });
    
    const landmark = new THREE.Mesh(geometry, material);
    landmark.position.y = size;
    landmark.castShadow = true;
    landmark.receiveShadow = true;
    
    return landmark;
  }

  private generateClusterPosition(regionCenter: THREE.Vector3, ringIndex: number): THREE.Vector3 {
    const spreadRadius = 20 + ringIndex * 10;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spreadRadius;
    
    return new THREE.Vector3(
      regionCenter.x + Math.cos(angle) * distance,
      regionCenter.y,
      regionCenter.z + Math.sin(angle) * distance
    );
  }

  private generateLandmarkPosition(regionCenter: THREE.Vector3, ringIndex: number): THREE.Vector3 {
    const spreadRadius = 30 + ringIndex * 15;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spreadRadius;
    
    return new THREE.Vector3(
      regionCenter.x + Math.cos(angle) * distance,
      regionCenter.y,
      regionCenter.z + Math.sin(angle) * distance
    );
  }

  private getRegionCenter(region: RegionCoordinates): THREE.Vector3 {
    // This should use the ring system to get the actual region center
    // For now, create a simplified version
    const ringRadius = region.ringIndex * 100 + 50;
    const quadrantAngle = region.quadrant * Math.PI / 2;
    
    return new THREE.Vector3(
      Math.cos(quadrantAngle) * ringRadius,
      0,
      Math.sin(quadrantAngle) * ringRadius
    );
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}