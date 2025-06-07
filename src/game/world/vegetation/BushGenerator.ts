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
  private leafInstancedMesh: THREE.InstancedMesh | null = null;
  private readonly MAX_LEAF_INSTANCES = 1000;

  constructor() {
    this.initializeLeafInstancing();
    this.loadBushModels();
  }

  private initializeLeafInstancing(): void {
    // Create instanced geometry for leaves to handle high leaf counts efficiently
    const leafGeometry = new THREE.PlaneGeometry(0.1, 0.12);
    const leafMaterial = LeafTextureGenerator.getLeafMaterial();
    
    this.leafInstancedMesh = new THREE.InstancedMesh(
      leafGeometry, 
      leafMaterial, 
      this.MAX_LEAF_INSTANCES
    );
    this.leafInstancedMesh.castShadow = true;
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
    
    console.log(`🌿 Created ${allSpecies.length} optimized bush species with comprehensive leaf coverage`);
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

    // Add comprehensive leaf coverage
    this.addComprehensiveLeafCoverage(bushGroup, species, baseRadius, height);

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

  private addComprehensiveLeafCoverage(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    // Calculate total leaf count based on bush size and species density
    const baseDensity = this.performanceMode ? 30 : 50;
    const sizeMultiplier = (baseRadius + height) / 2; // Scale with bush size
    const totalLeafCount = Math.floor(baseDensity * species.leafDensity * sizeMultiplier);
    
    console.log(`🍃 Adding ${totalLeafCount} leaves to ${species.name}`);

    // Create multiple layers of leaves for complete coverage
    this.addLeafLayer(bushGroup, species, baseRadius, height, totalLeafCount * 0.4, 1.0, 'outer');
    this.addLeafLayer(bushGroup, species, baseRadius, height, totalLeafCount * 0.3, 0.8, 'middle');
    this.addLeafLayer(bushGroup, species, baseRadius, height, totalLeafCount * 0.2, 0.6, 'inner');
    this.addLeafLayer(bushGroup, species, baseRadius, height, totalLeafCount * 0.1, 1.2, 'extending');
  }

  private addLeafLayer(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number,
    leafCount: number,
    radiusMultiplier: number,
    layerType: 'outer' | 'middle' | 'inner' | 'extending'
  ): void {
    const layerRadius = baseRadius * radiusMultiplier;
    
    // Define leaf sizes based on layer
    let leafSizeRange: [number, number];
    switch (layerType) {
      case 'outer':
        leafSizeRange = [0.15, 0.25]; // Large, prominent leaves
        break;
      case 'middle':
        leafSizeRange = [0.10, 0.15]; // Medium leaves
        break;
      case 'inner':
        leafSizeRange = [0.06, 0.10]; // Small detail leaves
        break;
      case 'extending':
        leafSizeRange = [0.12, 0.20]; // Medium-large extending leaves
        break;
    }

    for (let i = 0; i < leafCount; i++) {
      // Use spherical distribution for natural coverage
      const phi = Math.random() * Math.PI * 2; // Azimuth angle
      const cosTheta = Math.random() * 2 - 1; // Cosine of polar angle
      const theta = Math.acos(cosTheta);
      
      // Add some randomness to radius for natural variation
      const radiusVariation = layerRadius * (0.8 + Math.random() * 0.4);
      
      // Convert spherical to cartesian coordinates
      const x = radiusVariation * Math.sin(theta) * Math.cos(phi);
      const z = radiusVariation * Math.sin(theta) * Math.sin(phi);
      
      // Scale Y to fit bush height and add natural clustering
      let y = (cosTheta + 1) * 0.5 * height; // Map from [-1,1] to [0,height]
      
      // Add vertical clustering for natural branch patterns
      if (Math.random() < 0.3) {
        const clusterHeight = Math.random() * height;
        y = clusterHeight + (Math.random() - 0.5) * height * 0.2;
      }
      
      // Clamp Y to bush bounds
      y = Math.max(0, Math.min(height, y));

      // Create leaf with varied size
      const leafSize = leafSizeRange[0] + Math.random() * (leafSizeRange[1] - leafSizeRange[0]);
      const leafGeometry = new THREE.PlaneGeometry(leafSize, leafSize * 1.2);
      const leafMaterial = LeafTextureGenerator.getLeafMaterial();
      
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      
      leaf.position.set(x, y, z);
      
      // Orient leaf to face outward from bush center with natural variation
      const outwardDirection = new THREE.Vector3(x, 0, z).normalize();
      if (outwardDirection.length() > 0) {
        leaf.lookAt(leaf.position.clone().add(outwardDirection));
      }
      
      // Add natural rotation variation
      leaf.rotation.x += (Math.random() - 0.5) * 0.4;
      leaf.rotation.y += (Math.random() - 0.5) * 0.4;
      leaf.rotation.z += (Math.random() - 0.5) * 0.4;
      
      // Add slight random tilt for natural droop
      leaf.rotation.x += Math.random() * 0.2;
      
      bushGroup.add(leaf);
    }
  }

  public setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
    if (enabled) {
      console.log("🌿 Bush performance mode enabled - reduced leaf density");
    } else {
      console.log("🌿 Bush performance mode disabled - full leaf density");
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
