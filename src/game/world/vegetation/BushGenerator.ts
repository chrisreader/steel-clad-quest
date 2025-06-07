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
  private sharedLeafGeometry: THREE.PlaneGeometry;
  private sharedLeafMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.initializeSharedLeafResources();
    this.loadBushModels();
  }

  private initializeSharedLeafResources(): void {
    // Create shared resources for all leaves
    this.sharedLeafGeometry = new THREE.PlaneGeometry(0.3, 0.36); // Larger, more visible leaves
    this.sharedLeafMaterial = LeafTextureGenerator.getLeafMaterial();
  }

  private loadBushModels(): void {
    const allSpecies = BushSpeciesManager.getAllSpecies();
    
    allSpecies.forEach(species => {
      const models: THREE.Object3D[] = [];
      
      for (let i = 0; i < this.MODELS_PER_SPECIES; i++) {
        const bush = this.createOptimizedBush(species, i);
        models.push(bush);
      }
      
      this.bushModels.set(species.type, models);
    });
    
    console.log(`🌿 Created ${allSpecies.length} optimized bush species with simplified leaf system`);
  }

  private createOptimizedBush(species: BushSpeciesConfig, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    bushGroup.userData = { species: species.type, variation: variationIndex };
    
    // Calculate bush dimensions
    const baseRadius = species.sizeRange[0] + 
      Math.random() * (species.sizeRange[1] - species.sizeRange[0]);
    
    const height = species.heightRange[0] + 
      Math.random() * (species.heightRange[1] - species.heightRange[0]);
    
    const layerCount = Math.min(3, species.layerCountRange[0] + 
      Math.floor(Math.random() * (species.layerCountRange[1] - species.layerCountRange[0] + 1)));

    // Create optimized layers
    this.createOptimizedLayers(bushGroup, species, layerCount, baseRadius, height, variationIndex);

    // Add simplified features
    this.addSimplifiedFeatures(bushGroup, species, baseRadius, height);

    // Add simplified leaf coverage
    this.addSimplifiedLeafCoverage(bushGroup, species, baseRadius, height);

    return bushGroup;
  }

  private createOptimizedLayers(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    layerCount: number,
    baseRadius: number,
    maxHeight: number,
    variationIndex: number
  ): void {
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      const layer = this.createOptimizedBushLayer(
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

  private createOptimizedBushLayer(
    species: BushSpeciesConfig,
    layerIndex: number,
    totalLayers: number,
    baseRadius: number,
    maxHeight: number,
    variationIndex: number
  ): THREE.Mesh {
    const layerProgress = layerIndex / (totalLayers - 1);
    
    // Simplified layer progression
    let layerRadius: number;
    let layerHeight: number;
    
    switch (species.growthPattern) {
      case 'compact':
        layerRadius = baseRadius * (1.2 - layerProgress * 0.4);
        layerHeight = layerProgress * maxHeight;
        break;
      case 'spreading':
        layerRadius = baseRadius * (1.0 + layerProgress * 0.2);
        layerHeight = maxHeight * 0.4 + layerProgress * 0.3;
        break;
      case 'upright':
        layerRadius = baseRadius * (1.1 - layerProgress * 0.2);
        layerHeight = layerProgress * maxHeight * 1.1;
        break;
      default:
        layerRadius = baseRadius * (1.1 - layerProgress * 0.3);
        layerHeight = layerProgress * maxHeight;
    }

    // Reduced segments for performance
    const segments = 8 + layerIndex; // 8-10 segments instead of 16-24
    
    // Reduced noise intensity
    const noiseIntensity = 0.03 + (species.leafDensity * 0.01);

    // Create simplified organic geometry
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius,
      segments,
      noiseIntensity,
      3.0 + layerIndex * 0.2
    );

    // Use optimized material
    const material = OptimizedMaterialGenerator.createOptimizedFoliageMaterial(species, layerIndex);

    const mesh = new THREE.Mesh(geometry, material);

    // Simplified positioning
    const horizontalOffset = (Math.random() - 0.5) * baseRadius * 0.1;
    const depthOffset = (Math.random() - 0.5) * baseRadius * 0.1;
    
    mesh.position.set(horizontalOffset, layerHeight, depthOffset);

    // Simple rotation
    mesh.rotation.y = Math.random() * Math.PI * 2;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private addSimplifiedFeatures(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Simplified stems - only add if highly visible
    if (Math.random() < species.stemVisibility && species.stemVisibility > 0.5) {
      this.addSimpleStem(bushGroup, baseRadius, height);
    }

    // Simplified berries - fewer, larger
    if (Math.random() < species.berryChance) {
      this.addSimpleBerries(bushGroup, species, baseRadius, height);
    }
  }

  private addSimpleStem(
    bushGroup: THREE.Group,
    baseRadius: number,
    height: number
  ): void {
    const stemHeight = height * 0.6;
    const stemRadius = 0.02;
    
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.8,
      stemRadius * 1.2,
      stemHeight,
      6 // Reduced segments
    );
    
    const stemMaterial = OptimizedMaterialGenerator.createSimpleStemMaterial();
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    stem.position.set(
      (Math.random() - 0.5) * baseRadius * 0.4,
      stemHeight / 2,
      (Math.random() - 0.5) * baseRadius * 0.4
    );
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
  }

  private addSimpleBerries(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Fewer berries but more visible
    const berryCount = species.type === BushSpeciesType.WILD_BERRY ? 
      4 + Math.floor(Math.random() * 6) : 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < berryCount; i++) {
      const berrySize = 0.025 + Math.random() * 0.015; // Slightly larger
      const berryGeometry = new THREE.SphereGeometry(berrySize, 6, 4); // Reduced segments
      const berryMaterial = OptimizedMaterialGenerator.createSimpleBerryMaterial();
      
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = baseRadius * (0.7 + Math.random() * 0.3);
      const berryHeight = height * (0.3 + Math.random() * 0.5);
      
      berry.position.set(
        Math.cos(angle) * distance,
        berryHeight,
        Math.sin(angle) * distance
      );
      
      berry.castShadow = true;
      bushGroup.add(berry);
    }
  }

  private addSimplifiedLeafCoverage(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Calculate simplified leaf count - much fewer leaves
    const baseLeafCount = this.performanceMode ? 6 : 10;
    const speciesMultiplier = species.leafDensity;
    const totalLeafCount = Math.floor(baseLeafCount * speciesMultiplier);
    
    console.log(`🍃 Adding ${totalLeafCount} simplified leaves to ${species.name}`);

    // Single layer of strategically placed leaves
    for (let i = 0; i < totalLeafCount; i++) {
      this.addVisibleLeaf(bushGroup, species, baseRadius, height, i, totalLeafCount);
    }
  }

  private addVisibleLeaf(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number,
    leafIndex: number,
    totalLeaves: number
  ): void {
    // Use shared geometry and material for performance
    const leaf = new THREE.Mesh(this.sharedLeafGeometry, this.sharedLeafMaterial);
    
    // Distribute leaves evenly around the bush perimeter for maximum visibility
    const angle = (leafIndex / totalLeaves) * Math.PI * 2;
    const radiusVariation = baseRadius * (0.8 + Math.random() * 0.4); // 0.8-1.2x radius
    
    // Position on the outer edge where leaves are most visible
    const x = Math.cos(angle) * radiusVariation;
    const z = Math.sin(angle) * radiusVariation;
    
    // Distribute vertically across bush height with some clustering
    let y = Math.random() * height;
    
    // Add natural height clustering for realistic branch patterns
    if (Math.random() < 0.4) {
      const clusterHeight = height * (0.3 + Math.random() * 0.4); // Cluster in middle-upper area
      y = clusterHeight + (Math.random() - 0.5) * height * 0.3;
    }
    
    // Clamp to bush bounds
    y = Math.max(0.1, Math.min(height * 0.9, y));
    
    leaf.position.set(x, y, z);
    
    // Simple outward-facing orientation for better visibility
    const outwardDirection = new THREE.Vector3(x, 0, z).normalize();
    if (outwardDirection.length() > 0) {
      leaf.lookAt(leaf.position.clone().add(outwardDirection));
    }
    
    // Add minimal natural variation
    leaf.rotation.x += (Math.random() - 0.5) * 0.2;
    leaf.rotation.z += (Math.random() - 0.5) * 0.2;
    
    // Slight random scale for variety
    const scale = 0.8 + Math.random() * 0.4; // 0.8-1.2x
    leaf.scale.setScalar(scale);
    
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    
    bushGroup.add(leaf);
  }

  public setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
    if (enabled) {
      console.log("🌿 Bush performance mode enabled - minimal leaf count");
    } else {
      console.log("🌿 Bush performance mode disabled - normal leaf count");
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
    
    // Simplified scaling
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.setScalar(scale);
    
    model.position.copy(position);
    
    return model;
  }

  public dispose(): void {
    // Dispose shared resources
    if (this.sharedLeafGeometry) {
      this.sharedLeafGeometry.dispose();
    }
    
    this.bushModels.forEach(models => {
      models.forEach(bush => {
        bush.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry && child.geometry !== this.sharedLeafGeometry) {
              child.geometry.dispose();
            }
            // Don't dispose shared materials here
          }
        });
      });
    });
    this.bushModels.clear();
    
    // Dispose other shared resources
    OptimizedMaterialGenerator.dispose();
    LeafTextureGenerator.dispose();
  }
}
