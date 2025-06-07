import * as THREE from 'three';
import { BUSH_CONFIG } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { OptimizedMaterialGenerator } from './OptimizedMaterialGenerator';
import { 
  BushSpeciesType, 
  BushSpeciesConfig, 
  BushSpeciesManager 
} from './BushSpecies';
import { 
  SmallBushSpeciesConfig, 
  SmallBushSpeciesManager 
} from './SmallBushSpecies';
import { 
  BushClusterGenerator, 
  BushCluster 
} from './BushClusterGenerator';

export class BushGenerator {
  private bushModels: Map<BushSpeciesType, THREE.Object3D[]> = new Map();
  private smallBushModels: Map<string, THREE.Object3D[]> = new Map();
  private readonly MODELS_PER_SPECIES = 3;
  private performanceMode: boolean = false;

  constructor() {
    this.loadBushModels();
    this.loadSmallBushModels();
  }

  private loadBushModels(): void {
    const allSpecies = BushSpeciesManager.getAllSpecies();
    
    allSpecies.forEach(species => {
      const models: THREE.Object3D[] = [];
      
      for (let i = 0; i < this.MODELS_PER_SPECIES; i++) {
        const bush = this.createEnhancedBush(species, i);
        models.push(bush);
      }
      
      this.bushModels.set(species.type, models);
    });
    
    console.log(`🌿 Created ${allSpecies.length} enhanced bush species with ${this.MODELS_PER_SPECIES} variations each`);
  }

  private loadSmallBushModels(): void {
    const allSmallSpecies = SmallBushSpeciesManager.getAllSmallSpecies();
    
    allSmallSpecies.forEach(species => {
      const models: THREE.Object3D[] = [];
      
      for (let i = 0; i < this.MODELS_PER_SPECIES; i++) {
        const bush = this.createSmallBushFromConfig(species, i);
        models.push(bush);
      }
      
      this.smallBushModels.set(species.type as string, models);
    });
    
    console.log(`🌿 Created ${allSmallSpecies.length} small bush species with ${this.MODELS_PER_SPECIES} variations each`);
  }

  private createSmallBushFromConfig(species: SmallBushSpeciesConfig, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    bushGroup.userData = { species: species.type, variation: variationIndex };
    
    // Calculate bush dimensions with more realistic variation
    const baseRadius = species.sizeRange[0] + 
      Math.random() * (species.sizeRange[1] - species.sizeRange[0]);
    
    const height = species.heightRange[0] + 
      Math.random() * (species.heightRange[1] - species.heightRange[0]);
    
    // Create more layers for denser, more realistic bushes
    const layerCount = species.layerCountRange[0] + 
      Math.floor(Math.random() * (species.layerCountRange[1] - species.layerCountRange[0] + 1));

    // Create enhanced foliage layers only
    this.createEnhancedFoliageLayers(bushGroup, species as any, layerCount, baseRadius, height, variationIndex);

    return bushGroup;
  }

  private createEnhancedBush(species: BushSpeciesConfig, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    bushGroup.userData = { species: species.type, variation: variationIndex };
    
    // Calculate bush dimensions with smaller, more realistic variation
    const baseRadius = species.sizeRange[0] + 
      Math.random() * (species.sizeRange[1] - species.sizeRange[0]);
    
    const height = species.heightRange[0] + 
      Math.random() * (species.heightRange[1] - species.heightRange[0]);
    
    // Reduce layer count for smaller bushes
    const layerCount = species.layerCountRange[0] + 
      Math.floor(Math.random() * (species.layerCountRange[1] - species.layerCountRange[0] + 1));

    // Create enhanced foliage layers only
    this.createEnhancedFoliageLayers(bushGroup, species, layerCount, baseRadius, height, variationIndex);

    return bushGroup;
  }

  private createEnhancedFoliageLayers(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    layerCount: number,
    baseRadius: number,
    maxHeight: number,
    variationIndex: number
  ): void {
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      const layer = this.createEnhancedFoliageLayer(
        species,
        layerIndex,
        layerCount,
        baseRadius,
        maxHeight,
        variationIndex
      );
      bushGroup.add(layer);
    }
  }

  private createEnhancedFoliageLayer(
    species: BushSpeciesConfig,
    layerIndex: number,
    totalLayers: number,
    baseRadius: number,
    maxHeight: number,
    variationIndex: number
  ): THREE.Mesh {
    const layerProgress = layerIndex / Math.max(1, totalLayers - 1);
    
    // Enhanced layer progression based on growth pattern with more variation
    let layerRadius: number;
    let layerHeight: number;
    
    switch (species.growthPattern) {
      case 'compact':
        layerRadius = baseRadius * (1.4 - layerProgress * 0.6); // Increased variation
        layerHeight = layerProgress * maxHeight;
        break;
      case 'spreading':
        layerRadius = baseRadius * (1.0 + layerProgress * 0.5); // Increased spread
        layerHeight = maxHeight * 0.3 + layerProgress * 0.4;
        break;
      case 'upright':
        layerRadius = baseRadius * (1.3 - layerProgress * 0.5); // More natural taper
        layerHeight = layerProgress * maxHeight * 1.3;
        break;
      case 'cascading':
        layerRadius = baseRadius * (1.2 + Math.sin(layerProgress * Math.PI) * 0.4); // More cascading effect
        layerHeight = layerProgress * maxHeight * 0.9;
        break;
      default:
        layerRadius = baseRadius * (1.3 - layerProgress * 0.5);
        layerHeight = layerProgress * maxHeight;
    }

    // Balanced organic deformation - midpoint between smooth and spiky
    const segments = 16 + layerIndex * 2; // More segments for better detail
    const noiseIntensity = 0.12 + (species.leafDensity * 0.08); // Increased from 0.08+0.05
    const noiseFrequency = 2.5 + layerIndex * 0.8; // More frequency variation

    // Create balanced organic geometry
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius,
      segments,
      noiseIntensity,
      noiseFrequency
    );

    // Use enhanced vibrant material system
    const material = OptimizedMaterialGenerator.createOptimizedFoliageMaterial(species, layerIndex);

    const mesh = new THREE.Mesh(geometry, material);

    // More natural positioning with increased variation
    const horizontalOffset = (Math.random() - 0.5) * baseRadius * 0.3; // Increased from 0.2
    const depthOffset = (Math.random() - 0.5) * baseRadius * 0.3; // Increased from 0.2
    const heightVariation = (Math.random() - 0.5) * maxHeight * 0.15; // Increased from 0.1
    
    mesh.position.set(horizontalOffset, layerHeight + heightVariation, depthOffset);

    // More natural rotation and tilt
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.rotation.x = (Math.random() - 0.5) * 0.15; // Increased from 0.1
    mesh.rotation.z = (Math.random() - 0.5) * 0.15; // Increased from 0.1

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  public setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
    if (enabled) {
      console.log("🌿 Bush performance mode enabled - using simplified generation");
    }
  }

  public getBushModels(): THREE.Object3D[] {
    const allModels: THREE.Object3D[] = [];
    this.bushModels.forEach(models => allModels.push(...models));
    return allModels;
  }

  /**
   * Creates a cluster of bushes around a center position
   */
  public createBushCluster(
    centerPosition: THREE.Vector3,
    clusterType: 'family' | 'mixed' | 'tree_base' | 'rock_side' = 'mixed',
    maxRadius: number = 3.0
  ): THREE.Group {
    const clusterGroup = new THREE.Group();
    const cluster = BushClusterGenerator.createBushCluster(centerPosition, clusterType, maxRadius);
    
    // Apply environmental effects
    BushClusterGenerator.applyEnvironmentalEffects(cluster);
    
    cluster.bushes.forEach((bushData, index) => {
      const bush = bushData.isSmall ? 
        this.createSmallBushFromSpecies(bushData.species as SmallBushSpeciesConfig) :
        this.createBushFromSpecies(bushData.species as BushSpeciesConfig);
      
      if (bush) {
        bush.position.copy(bushData.position);
        bush.scale.setScalar(bushData.scale);
        bush.rotation.y = Math.random() * Math.PI * 2;
        clusterGroup.add(bush);
      }
    });
    
    clusterGroup.userData = { isCluster: true, clusterType };
    return clusterGroup;
  }

  /**
   * Creates small bushes specifically for tree bases
   */
  public createTreeBaseBushes(treePosition: THREE.Vector3, treeRadius: number = 2.5): THREE.Group[] {
    const bushGroups: THREE.Group[] = [];
    
    // 70% chance to spawn bushes around tree base
    if (Math.random() < 0.7) {
      const cluster = this.createBushCluster(treePosition, 'tree_base', treeRadius);
      if (cluster.children.length > 0) {
        bushGroups.push(cluster);
      }
    }
    
    return bushGroups;
  }

  /**
   * Creates a single bush from a specific species config
   */
  private createBushFromSpecies(species: BushSpeciesConfig): THREE.Object3D | null {
    const models = this.bushModels.get(species.type);
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    return models[modelIndex].clone();
  }

  /**
   * Creates a single small bush from a specific species config
   */
  private createSmallBushFromSpecies(species: SmallBushSpeciesConfig): THREE.Object3D | null {
    const models = this.smallBushModels.get(species.type as string);
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    return models[modelIndex].clone();
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    const species = BushSpeciesManager.getRandomSpecies();
    const models = this.bushModels.get(species.type);
    
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    const model = models[modelIndex].clone();
    
    // Smaller scaling range for more realistic bushes
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.7 + Math.random() * 0.4; // Reduced from 0.85-1.15 to 0.7-1.1
    model.scale.setScalar(scale);
    
    model.position.copy(position);
    
    return model;
  }

  public createSmallBush(position: THREE.Vector3, preferredLocation?: string): THREE.Object3D | null {
    const species = SmallBushSpeciesManager.getRandomSmallSpecies(preferredLocation);
    const models = this.smallBushModels.get(species.type as string);
    
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    const model = models[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.6 + Math.random() * 0.5; // Reduced from 0.8-1.2 to 0.6-1.1
    model.scale.setScalar(scale);
    
    model.position.copy(position);
    
    return model;
  }

  public dispose(): void {
    this.bushModels.forEach(models => {
      models.forEach(bush => {
        bush.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
          }
        });
      });
    });
    this.bushModels.clear();
    
    this.smallBushModels.forEach(models => {
      models.forEach(bush => {
        bush.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
          }
        });
      });
    });
    this.smallBushModels.clear();
    
    OptimizedMaterialGenerator.dispose();
  }
}
