import * as THREE from 'three';
import { BUSH_CONFIG } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { OptimizedMaterialGenerator } from './OptimizedMaterialGenerator';
import { LeafTextureGenerator } from './LeafTextureGenerator';
import { 
  BushSpeciesType, 
  BushSpeciesConfig, 
  BushSpeciesManager 
} from './BushSpecies';

export class BushGenerator {
  private bushModels: Map<BushSpeciesType, THREE.Object3D[]> = new Map();
  private readonly MODELS_PER_SPECIES = 3;
  private performanceMode: boolean = false;

  constructor() {
    this.loadBushModels();
  }

  private loadBushModels(): void {
    const allSpecies = BushSpeciesManager.getAllSpecies();
    
    allSpecies.forEach(species => {
      const models: THREE.Object3D[] = [];
      
      for (let i = 0; i < this.MODELS_PER_SPECIES; i++) {
        const bush = this.createRealisticBush(species, i);
        models.push(bush);
      }
      
      this.bushModels.set(species.type, models);
    });
    
    console.log(`🌿 Created ${allSpecies.length} realistic bush species with ${this.MODELS_PER_SPECIES} variations each`);
  }

  private createRealisticBush(species: BushSpeciesConfig, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    bushGroup.userData = { species: species.type, variation: variationIndex };
    
    // Calculate bush dimensions with enhanced variation
    const baseRadius = species.sizeRange[0] + 
      Math.random() * (species.sizeRange[1] - species.sizeRange[0]);
    
    const height = species.heightRange[0] + 
      Math.random() * (species.heightRange[1] - species.heightRange[0]);
    
    // Create more layers for denser, more realistic bushes
    const layerCount = species.layerCountRange[0] + 
      Math.floor(Math.random() * (species.layerCountRange[1] - species.layerCountRange[0] + 1));

    // Create realistic foliage layers
    this.createRealisticLayers(bushGroup, species, layerCount, baseRadius, height, variationIndex);

    // Add natural bush features
    this.addNaturalFeatures(bushGroup, species, baseRadius, height);

    // Add abundant realistic leaves
    this.addAbundantLeaves(bushGroup, species, baseRadius, height);

    // Add branch structure
    this.addBranchStructure(bushGroup, species, baseRadius, height);

    return bushGroup;
  }

  private createRealisticLayers(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    layerCount: number,
    baseRadius: number,
    maxHeight: number,
    variationIndex: number
  ): void {
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      const layer = this.createRealisticBushLayer(
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

  private createRealisticBushLayer(
    species: BushSpeciesConfig,
    layerIndex: number,
    totalLayers: number,
    baseRadius: number,
    maxHeight: number,
    variationIndex: number
  ): THREE.Mesh {
    const layerProgress = layerIndex / Math.max(1, totalLayers - 1);
    
    // Enhanced layer progression based on growth pattern
    let layerRadius: number;
    let layerHeight: number;
    
    switch (species.growthPattern) {
      case 'compact':
        layerRadius = baseRadius * (1.3 - layerProgress * 0.5); // More pronounced size variation
        layerHeight = layerProgress * maxHeight;
        break;
      case 'spreading':
        layerRadius = baseRadius * (1.0 + layerProgress * 0.4); // Wider spreading
        layerHeight = maxHeight * 0.3 + layerProgress * 0.4;
        break;
      case 'upright':
        layerRadius = baseRadius * (1.2 - layerProgress * 0.4);
        layerHeight = layerProgress * maxHeight * 1.2; // Taller growth
        break;
      case 'cascading':
        layerRadius = baseRadius * (1.1 + Math.sin(layerProgress * Math.PI) * 0.3);
        layerHeight = layerProgress * maxHeight * 0.9;
        break;
      default:
        layerRadius = baseRadius * (1.2 - layerProgress * 0.4);
        layerHeight = layerProgress * maxHeight;
    }

    // Enhanced organic deformation
    const segments = 12 + layerIndex * 2; // 12-18 segments for good detail
    const noiseIntensity = 0.15 + (species.leafDensity * 0.1); // Much higher noise
    const noiseFrequency = 3.0 + layerIndex * 0.5;

    // Create highly organic geometry
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius,
      segments,
      noiseIntensity,
      noiseFrequency
    );

    // Use enhanced material system
    const material = OptimizedMaterialGenerator.createOptimizedFoliageMaterial(species, layerIndex);

    const mesh = new THREE.Mesh(geometry, material);

    // Natural positioning with more variation
    const horizontalOffset = (Math.random() - 0.5) * baseRadius * 0.2;
    const depthOffset = (Math.random() - 0.5) * baseRadius * 0.2;
    const heightVariation = (Math.random() - 0.5) * maxHeight * 0.1;
    
    mesh.position.set(horizontalOffset, layerHeight + heightVariation, depthOffset);

    // Natural rotation and slight tilt
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.rotation.x = (Math.random() - 0.5) * 0.1;
    mesh.rotation.z = (Math.random() - 0.5) * 0.1;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private addNaturalFeatures(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Enhanced stems - more visible and varied
    if (Math.random() < species.stemVisibility) {
      const stemCount = 1 + Math.floor(species.stemVisibility * 3);
      for (let i = 0; i < stemCount; i++) {
        this.addRealisticStem(bushGroup, baseRadius, height, i, stemCount);
      }
    }

    // Enhanced berries with clusters
    if (Math.random() < species.berryChance) {
      this.addBerryCluster(bushGroup, species, baseRadius, height);
    }

    // Add flowers for flowering species
    if (Math.random() < species.flowerChance) {
      this.addFlowerCluster(bushGroup, species, baseRadius, height);
    }
  }

  private addRealisticStem(
    bushGroup: THREE.Group,
    baseRadius: number,
    height: number,
    stemIndex: number,
    totalStems: number
  ): void {
    const stemHeight = height * (0.5 + Math.random() * 0.4); // 0.5-0.9 of bush height
    const stemRadius = 0.015 + Math.random() * 0.015; // 0.015-0.03
    
    // Create slightly curved stem
    const segments = 6;
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.7, // Thinner at top
      stemRadius * 1.3, // Thicker at base
      stemHeight,
      segments
    );
    
    // Apply slight curve to stem
    const positions = stemGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const curve = (y / stemHeight) * 0.1 * Math.sin(stemIndex * 2);
      positions.setX(i, positions.getX(i) + curve);
    }
    positions.needsUpdate = true;
    
    const stemMaterial = OptimizedMaterialGenerator.createEnhancedStemMaterial();
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    // Position stems around the bush base
    const angle = (stemIndex / totalStems) * Math.PI * 2 + Math.random() * 0.5;
    const distance = baseRadius * (0.2 + Math.random() * 0.4);
    
    stem.position.set(
      Math.cos(angle) * distance,
      stemHeight / 2,
      Math.sin(angle) * distance
    );
    
    // Slight random tilt
    stem.rotation.z = (Math.random() - 0.5) * 0.2;
    stem.rotation.x = (Math.random() - 0.5) * 0.2;
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
  }

  private addBerryCluster(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    const clusterCount = species.type === BushSpeciesType.WILD_BERRY ? 
      2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
    
    for (let cluster = 0; cluster < clusterCount; cluster++) {
      const berriesInCluster = 3 + Math.floor(Math.random() * 5); // 3-7 berries per cluster
      const clusterCenter = new THREE.Vector3(
        (Math.random() - 0.5) * baseRadius * 1.4,
        height * (0.3 + Math.random() * 0.5),
        (Math.random() - 0.5) * baseRadius * 1.4
      );
      
      for (let i = 0; i < berriesInCluster; i++) {
        const berrySize = 0.02 + Math.random() * 0.015; // 0.02-0.035
        const berryGeometry = new THREE.SphereGeometry(berrySize, 6, 4);
        const berryMaterial = OptimizedMaterialGenerator.createEnhancedBerryMaterial();
        
        const berry = new THREE.Mesh(berryGeometry, berryMaterial);
        
        // Position around cluster center
        const localOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        );
        
        berry.position.copy(clusterCenter).add(localOffset);
        berry.castShadow = true;
        bushGroup.add(berry);
      }
    }
  }

  private addFlowerCluster(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    const clusterCount = 1 + Math.floor(Math.random() * 3);
    
    for (let cluster = 0; cluster < clusterCount; cluster++) {
      const flowersInCluster = 2 + Math.floor(Math.random() * 4); // 2-5 flowers per cluster
      const clusterCenter = new THREE.Vector3(
        (Math.random() - 0.5) * baseRadius * 1.2,
        height * (0.4 + Math.random() * 0.4),
        (Math.random() - 0.5) * baseRadius * 1.2
      );
      
      for (let i = 0; i < flowersInCluster; i++) {
        const flowerSize = 0.03 + Math.random() * 0.02; // 0.03-0.05
        const flowerGeometry = new THREE.SphereGeometry(flowerSize, 8, 6);
        const flowerMaterial = OptimizedMaterialGenerator.createFlowerMaterial();
        
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        
        // Position around cluster center
        const localOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        );
        
        flower.position.copy(clusterCenter).add(localOffset);
        flower.castShadow = true;
        bushGroup.add(flower);
      }
    }
  }

  private addAbundantLeaves(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Dramatically increased leaf count for realistic density
    const baseLeafCount = 60; // Base count
    const densityMultiplier = species.leafDensity;
    const totalLeaves = Math.floor(baseLeafCount * densityMultiplier * (0.8 + Math.random() * 0.4));
    
    console.log(`Adding ${totalLeaves} leaves to ${species.type} bush`);
    
    for (let i = 0; i < totalLeaves; i++) {
      this.addRealisticLeaf(bushGroup, species, baseRadius, height, i, totalLeaves);
    }
  }

  private addRealisticLeaf(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number,
    leafIndex: number,
    totalLeaves: number
  ): void {
    // Varied leaf sizes for realism
    const leafSizeVariation = Math.random();
    let leafSize: number;
    
    if (leafSizeVariation < 0.6) {
      leafSize = 0.08 + Math.random() * 0.04; // Small leaves (60%)
    } else if (leafSizeVariation < 0.9) {
      leafSize = 0.12 + Math.random() * 0.06; // Medium leaves (30%)
    } else {
      leafSize = 0.18 + Math.random() * 0.08; // Large leaves (10%)
    }
    
    const leafGeometry = LeafTextureGenerator.getLeafGeometry(leafSize);
    const leafMaterial = LeafTextureGenerator.createVariedLeafMaterial(Math.random());
    
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    
    // Natural distribution - more leaves on exterior
    const distributionRadius = baseRadius * (0.7 + Math.random() * 0.6); // 0.7-1.3 of base radius
    const angle = Math.random() * Math.PI * 2;
    const leafHeight = Math.random() * height * 0.9 + height * 0.05; // Avoid very bottom
    
    // Add some clustering by using sine waves
    const clusterInfluence = Math.sin(angle * 3) * Math.cos(leafHeight / height * Math.PI * 2) * 0.2;
    const finalRadius = distributionRadius + clusterInfluence * baseRadius;
    
    leaf.position.set(
      Math.cos(angle) * finalRadius,
      leafHeight,
      Math.sin(angle) * finalRadius
    );
    
    // Natural leaf orientation - face somewhat outward
    const outwardDirection = new THREE.Vector3(leaf.position.x, 0, leaf.position.z).normalize();
    const upDirection = new THREE.Vector3(0, 1, 0);
    const leafNormal = outwardDirection.clone().lerp(upDirection, 0.3 + Math.random() * 0.4).normalize();
    
    leaf.lookAt(leaf.position.clone().add(leafNormal));
    
    // Add natural rotation variation
    leaf.rotation.x += (Math.random() - 0.5) * 0.6;
    leaf.rotation.y += (Math.random() - 0.5) * 0.6;
    leaf.rotation.z += (Math.random() - 0.5) * 0.6;
    
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    bushGroup.add(leaf);
  }

  private addBranchStructure(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Add some visible branch structure for realism
    if (species.stemVisibility > 0.3) {
      const branchCount = 2 + Math.floor(Math.random() * 4); // 2-5 branches
      
      for (let i = 0; i < branchCount; i++) {
        const branchLength = baseRadius * (0.5 + Math.random() * 0.7);
        const branchRadius = 0.008 + Math.random() * 0.006; // 0.008-0.014
        
        const branchGeometry = new THREE.CylinderGeometry(
          branchRadius * 0.5, // Thin at tip
          branchRadius, // Thicker at base
          branchLength,
          4 // Low poly for performance
        );
        
        const branchMaterial = OptimizedMaterialGenerator.createEnhancedStemMaterial();
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        
        // Position and orient branch
        const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
        const branchHeight = height * (0.2 + Math.random() * 0.6);
        const startRadius = baseRadius * (0.3 + Math.random() * 0.4);
        
        branch.position.set(
          Math.cos(angle) * startRadius,
          branchHeight,
          Math.sin(angle) * startRadius
        );
        
        // Point branch outward and slightly up
        const outward = new THREE.Vector3(Math.cos(angle), 0.3, Math.sin(angle));
        branch.lookAt(branch.position.clone().add(outward));
        
        branch.castShadow = true;
        branch.receiveShadow = true;
        bushGroup.add(branch);
      }
    }
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

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    const species = BushSpeciesManager.getRandomSpecies();
    const models = this.bushModels.get(species.type);
    
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    const model = models[modelIndex].clone();
    
    // Natural scaling and rotation
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.7 + Math.random() * 0.6; // 0.7-1.3 scale range
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
            // Don't dispose shared materials here
          }
        });
      });
    });
    this.bushModels.clear();
    
    // Dispose shared resources
    OptimizedMaterialGenerator.dispose();
    LeafTextureGenerator.dispose();
  }
}
