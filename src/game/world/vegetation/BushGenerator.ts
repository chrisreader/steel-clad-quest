import * as THREE from 'three';
import { BUSH_CONFIG } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { AdvancedMaterialGenerator } from './AdvancedMaterialGenerator';
import { 
  BushSpeciesType, 
  BushSpeciesConfig, 
  BushSpeciesManager 
} from './BushSpecies';
import { 
  NaturalGrowthSimulator, 
  GrowthEnvironment, 
  GrowthModifiers 
} from './NaturalGrowthSimulator';

export class BushGenerator {
  private bushModels: Map<BushSpeciesType, THREE.Object3D[]> = new Map();
  private readonly MODELS_PER_SPECIES = 4;

  constructor() {
    this.loadBushModels();
  }

  private loadBushModels(): void {
    const allSpecies = BushSpeciesManager.getAllSpecies();
    
    allSpecies.forEach(species => {
      const models: THREE.Object3D[] = [];
      
      for (let i = 0; i < this.MODELS_PER_SPECIES; i++) {
        const bush = this.createSpeciesBush(species, i);
        models.push(bush);
      }
      
      this.bushModels.set(species.type, models);
    });
    
    console.log(`🌿 Created ${allSpecies.length} realistic bush species with ${this.MODELS_PER_SPECIES} variations each`);
  }

  private createSpeciesBush(species: BushSpeciesConfig, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    bushGroup.userData = { species: species.type, variation: variationIndex };
    
    // Generate environmental simulation for natural growth
    const mockPosition = new THREE.Vector3(0, 0, 0);
    const environment = NaturalGrowthSimulator.generateEnvironment(mockPosition);
    const growthModifiers = NaturalGrowthSimulator.simulateGrowth(species, mockPosition, environment);
    
    // Calculate bush dimensions with growth modifiers
    const baseRadius = (species.sizeRange[0] + 
      Math.random() * (species.sizeRange[1] - species.sizeRange[0])) * growthModifiers.sizeMultiplier;
    
    const height = (species.heightRange[0] + 
      Math.random() * (species.heightRange[1] - species.heightRange[0])) * growthModifiers.heightMultiplier;
    
    const layerCount = species.layerCountRange[0] + 
      Math.floor(Math.random() * (species.layerCountRange[1] - species.layerCountRange[0] + 1));

    // Create advanced layering system
    this.createAdvancedLayers(bushGroup, species, layerCount, baseRadius, height, growthModifiers, variationIndex);

    // Add species-specific features
    this.addSpeciesFeatures(bushGroup, species, baseRadius, height, growthModifiers);

    // Apply natural settling and environmental adaptation
    this.applyEnvironmentalAdaptation(bushGroup, growthModifiers);

    return bushGroup;
  }

  private createAdvancedLayers(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    layerCount: number,
    baseRadius: number,
    maxHeight: number,
    growthModifiers: GrowthModifiers,
    variationIndex: number
  ): void {
    const layersPerRing = Math.ceil(layerCount / 3); // Distribute layers in growth rings
    
    for (let ringIndex = 0; ringIndex < 3; ringIndex++) {
      const ringLayers = Math.min(layersPerRing, layerCount - ringIndex * layersPerRing);
      
      for (let layerInRing = 0; layerInRing < ringLayers; layerInRing++) {
        const globalLayerIndex = ringIndex * layersPerRing + layerInRing;
        const layer = this.createAdvancedBushLayer(
          species,
          globalLayerIndex,
          layerCount,
          baseRadius,
          maxHeight,
          growthModifiers,
          variationIndex,
          ringIndex
        );
        bushGroup.add(layer);
      }
    }
  }

  private createAdvancedBushLayer(
    species: BushSpeciesConfig,
    layerIndex: number,
    totalLayers: number,
    baseRadius: number,
    maxHeight: number,
    growthModifiers: GrowthModifiers,
    variationIndex: number,
    ringIndex: number
  ): THREE.Mesh {
    // Advanced layer progression based on species growth pattern
    const layerProgress = layerIndex / (totalLayers - 1);
    
    let layerRadius: number;
    let layerHeight: number;
    
    switch (species.growthPattern) {
      case 'compact':
        layerRadius = baseRadius * (1.3 - layerProgress * 0.6); // 1.3 to 0.7
        layerHeight = (layerProgress * maxHeight) + (Math.random() - 0.5) * 0.1;
        break;
      case 'spreading':
        layerRadius = baseRadius * (1.0 + layerProgress * 0.3); // Spreading outward
        layerHeight = maxHeight * 0.3 + layerProgress * 0.4; // Low and wide
        break;
      case 'upright':
        layerRadius = baseRadius * (1.1 - layerProgress * 0.3); // 1.1 to 0.8
        layerHeight = layerProgress * maxHeight * 1.2; // Tall growth
        break;
      case 'cascading':
        layerRadius = baseRadius * (1.2 - layerProgress * 0.2); // 1.2 to 1.0
        layerHeight = maxHeight * 0.8 + layerProgress * 0.3; // Drooping effect
        break;
      default:
        layerRadius = baseRadius * (1.2 - layerProgress * 0.5);
        layerHeight = layerProgress * maxHeight;
    }

    // Apply asymmetry from growth modifiers
    const asymmetryScale = OrganicShapeGenerator.createAsymmetricScale();
    asymmetryScale.multiplyScalar(1 + growthModifiers.asymmetryFactor * 0.2);

    // Determine segments for this layer (higher for outer layers)
    const segments = 16 + layerIndex * 2; // More detail on outer layers
    
    // Noise intensity varies by species and layer
    const baseNoiseIntensity = 0.04 + (species.leafDensity * 0.02);
    const noiseIntensity = baseNoiseIntensity * (1 + layerIndex * 0.01);

    // Create organic geometry with dual-pass noise
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius,
      segments,
      noiseIntensity,
      4.0 + layerIndex * 0.3 + ringIndex * 0.5
    );

    // Apply secondary noise pass for fine detail
    OrganicShapeGenerator.applyBushNoise(
      geometry,
      noiseIntensity * 0.5,
      8.0 + layerIndex * 0.5
    );

    // Create advanced material with species and layer variation
    const materialVariation = layerIndex % species.textureVariations;
    const material = AdvancedMaterialGenerator.createAdvancedFoliageMaterial(
      species,
      layerIndex,
      materialVariation + variationIndex
    );

    const mesh = new THREE.Mesh(geometry, material);

    // Position layer with natural variation
    const horizontalOffset = (Math.random() - 0.5) * baseRadius * 0.2 * growthModifiers.asymmetryFactor;
    const depthOffset = (Math.random() - 0.5) * baseRadius * 0.15 * growthModifiers.asymmetryFactor;
    
    mesh.position.set(horizontalOffset, layerHeight, depthOffset);
    mesh.scale.copy(asymmetryScale);

    // Natural rotation with growth bias
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.2,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.2
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private addSpeciesFeatures(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number,
    growthModifiers: GrowthModifiers
  ): void {
    // Add stems based on species visibility
    if (Math.random() < species.stemVisibility) {
      this.addAdvancedStems(bushGroup, species, baseRadius, height, growthModifiers);
    }

    // Add flowers based on species chance
    if (Math.random() < species.flowerChance) {
      this.addRealisticFlowers(bushGroup, species, baseRadius, height);
    }

    // Add berries based on species chance
    if (Math.random() < species.berryChance) {
      this.addNaturalBerries(bushGroup, species, baseRadius, height);
    }

    // Add leaf overlay for fine detail
    this.addLeafOverlay(bushGroup, species, baseRadius, height, growthModifiers);
  }

  private addAdvancedStems(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number,
    growthModifiers: GrowthModifiers
  ): void {
    const stemCount = species.growthPattern === 'upright' ? 
      2 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < stemCount; i++) {
      const stemHeight = height * (0.4 + Math.random() * 0.5) * growthModifiers.heightMultiplier;
      const stemRadius = 0.01 + Math.random() * 0.015;
      
      // Create branching stem geometry
      const stemGeometry = new THREE.CylinderGeometry(
        stemRadius * 0.8,
        stemRadius * 1.3,
        stemHeight,
        8
      );
      
      const stemMaterial = AdvancedMaterialGenerator.createStemMaterial(species, Math.random());
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      
      // Position stems naturally with growth pattern consideration
      const angle = (i / stemCount) * Math.PI * 2 + Math.random() * 0.7;
      const distance = baseRadius * (0.2 + Math.random() * 0.5) * growthModifiers.sizeMultiplier;
      
      stem.position.set(
        Math.cos(angle) * distance,
        stemHeight / 2,
        Math.sin(angle) * distance
      );
      
      // Apply growth lean
      stem.rotation.z = growthModifiers.leanAngle * 0.5 + (Math.random() - 0.5) * 0.1;
      
      stem.castShadow = true;
      stem.receiveShadow = true;
      bushGroup.add(stem);
    }
  }

  private addRealisticFlowers(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    const flowerCount = 5 + Math.floor(Math.random() * 10); // 5-14 flowers
    
    for (let i = 0; i < flowerCount; i++) {
      const flowerSize = 0.015 + Math.random() * 0.02;
      const flowerGeometry = new THREE.SphereGeometry(flowerSize, 8, 6);
      const flowerMaterial = AdvancedMaterialGenerator.createFlowerMaterial(species);
      
      const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
      
      // Position flowers on outer edges
      const angle = Math.random() * Math.PI * 2;
      const distance = baseRadius * (0.7 + Math.random() * 0.4);
      const flowerHeight = height * (0.4 + Math.random() * 0.5);
      
      flower.position.set(
        Math.cos(angle) * distance,
        flowerHeight,
        Math.sin(angle) * distance
      );
      
      flower.castShadow = true;
      bushGroup.add(flower);
    }
  }

  private addNaturalBerries(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number
  ): void {
    const berryCount = species.type === BushSpeciesType.WILD_BERRY ? 
      8 + Math.floor(Math.random() * 12) : 3 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < berryCount; i++) {
      const berrySize = 0.015 + Math.random() * 0.025;
      const berryGeometry = new THREE.SphereGeometry(berrySize, 8, 6);
      const berryMaterial = AdvancedMaterialGenerator.createBerryMaterial(species);
      
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Cluster berries naturally
      const angle = Math.random() * Math.PI * 2;
      const distance = baseRadius * (0.6 + Math.random() * 0.5);
      const berryHeight = height * (0.2 + Math.random() * 0.6);
      
      berry.position.set(
        Math.cos(angle) * distance,
        berryHeight,
        Math.sin(angle) * distance
      );
      
      berry.castShadow = true;
      bushGroup.add(berry);
    }
  }

  private addLeafOverlay(
    bushGroup: THREE.Group,
    species: BushSpeciesConfig,
    baseRadius: number,
    height: number,
    growthModifiers: GrowthModifiers
  ): void {
    const leafCount = Math.floor(40 * species.leafDensity * growthModifiers.leafDensityModifier);
    
    for (let i = 0; i < leafCount; i++) {
      const leafSize = 0.05 + Math.random() * 0.03;
      const leafGeometry = new THREE.PlaneGeometry(leafSize, leafSize * 1.2);
      
      // Create leaf material with alpha for realistic edges
      const leafMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.6, 0.4),
        transparent: true,
        opacity: 0.8 + Math.random() * 0.2,
        alphaTest: 0.3,
        side: THREE.DoubleSide,
        transmission: 0.1,
        thickness: 0.1,
      });
      
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      
      // Position leaves scattered throughout bush
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * baseRadius * 1.2;
      const leafHeight = Math.random() * height;
      
      leaf.position.set(
        Math.cos(angle) * distance,
        leafHeight,
        Math.sin(angle) * distance
      );
      
      // Align leaves roughly outward from center
      const outwardDirection = new THREE.Vector3(
        leaf.position.x,
        0,
        leaf.position.z
      ).normalize();
      
      leaf.lookAt(leaf.position.clone().add(outwardDirection));
      leaf.rotation.x += (Math.random() - 0.5) * 0.5;
      leaf.rotation.y += (Math.random() - 0.5) * 0.5;
      
      bushGroup.add(leaf);
    }
  }

  private applyEnvironmentalAdaptation(bushGroup: THREE.Group, growthModifiers: GrowthModifiers): void {
    // Apply lean from environmental factors
    if (growthModifiers.leanAngle > 0) {
      const leanAxis = new THREE.Vector3()
        .crossVectors(growthModifiers.leanDirection, new THREE.Vector3(0, 1, 0))
        .normalize();
      
      bushGroup.rotateOnAxis(leanAxis, growthModifiers.leanAngle);
    }
    
    // Apply overall scale from environmental stress
    const environmentalScale = growthModifiers.sizeMultiplier * growthModifiers.heightMultiplier;
    bushGroup.scale.multiplyScalar(Math.max(0.5, environmentalScale));
  }

  public getBushModels(): THREE.Object3D[] {
    const allModels: THREE.Object3D[] = [];
    this.bushModels.forEach(models => allModels.push(...models));
    return allModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    // Select random species
    const species = BushSpeciesManager.getRandomSpecies();
    const models = this.bushModels.get(species.type);
    
    if (!models || models.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * models.length);
    const model = models[modelIndex].clone();
    
    // Apply environmental adaptation for this specific position
    const environment = NaturalGrowthSimulator.generateEnvironment(position);
    const growthModifiers = NaturalGrowthSimulator.simulateGrowth(species, position, environment);
    
    // Apply final positioning variations
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(
      scale * growthModifiers.sizeMultiplier,
      scale * growthModifiers.heightMultiplier,
      scale * growthModifiers.sizeMultiplier
    );
    
    model.position.copy(position);
    
    return model;
  }

  public dispose(): void {
    this.bushModels.forEach(models => {
      models.forEach(bush => {
        bush.traverse(child => {
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
    });
    this.bushModels.clear();
  }
}
