
import * as THREE from 'three';
import { BUSH_CONFIG } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { OptimizedMaterialGenerator } from './OptimizedMaterialGenerator';
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
        const bush = this.createEnhancedBush(species, i);
        models.push(bush);
      }
      
      this.bushModels.set(species.type, models);
    });
    
    console.log(`🌿 Created ${allSpecies.length} enhanced bush species with ${this.MODELS_PER_SPECIES} variations each`);
  }

  private createEnhancedBush(species: BushSpeciesConfig, variationIndex: number): THREE.Group {
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
    
    // Enhanced layer progression based on growth pattern
    let layerRadius: number;
    let layerHeight: number;
    
    switch (species.growthPattern) {
      case 'compact':
        layerRadius = baseRadius * (1.4 - layerProgress * 0.6); // More pronounced size variation
        layerHeight = layerProgress * maxHeight;
        break;
      case 'spreading':
        layerRadius = baseRadius * (1.0 + layerProgress * 0.6); // Wider spreading
        layerHeight = maxHeight * 0.3 + layerProgress * 0.4;
        break;
      case 'upright':
        layerRadius = baseRadius * (1.3 - layerProgress * 0.5);
        layerHeight = layerProgress * maxHeight * 1.3; // Taller growth
        break;
      case 'cascading':
        layerRadius = baseRadius * (1.2 + Math.sin(layerProgress * Math.PI) * 0.4);
        layerHeight = layerProgress * maxHeight * 0.9;
        break;
      default:
        layerRadius = baseRadius * (1.3 - layerProgress * 0.5);
        layerHeight = layerProgress * maxHeight;
    }

    // Much more enhanced organic deformation
    const segments = 16 + layerIndex * 2; // 16-22 segments for excellent detail
    const noiseIntensity = 0.25 + (species.leafDensity * 0.15); // Much higher noise intensity
    const noiseFrequency = 2.5 + layerIndex * 0.8;

    // Create highly organic geometry
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius,
      segments,
      noiseIntensity,
      noiseFrequency
    );

    // Use enhanced vibrant material system
    const material = OptimizedMaterialGenerator.createOptimizedFoliageMaterial(species, layerIndex);

    const mesh = new THREE.Mesh(geometry, material);

    // Enhanced natural positioning with more variation
    const horizontalOffset = (Math.random() - 0.5) * baseRadius * 0.3;
    const depthOffset = (Math.random() - 0.5) * baseRadius * 0.3;
    const heightVariation = (Math.random() - 0.5) * maxHeight * 0.15;
    
    mesh.position.set(horizontalOffset, layerHeight + heightVariation, depthOffset);

    // Enhanced natural rotation and tilt
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.rotation.x = (Math.random() - 0.5) * 0.15;
    mesh.rotation.z = (Math.random() - 0.5) * 0.15;

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

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    const species = BushSpeciesManager.getRandomSpecies();
    const models = this.bushModels.get(species.type);
    
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    const model = models[modelIndex].clone();
    
    // Natural scaling and rotation
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.6; // 0.8-1.4 scale range
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
    
    OptimizedMaterialGenerator.dispose();
  }
}
