import * as THREE from 'three';
import { BUSH_CONFIG, BushArchetype } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { RealisticMaterialGenerator } from './RealisticMaterialGenerator';

export class BushGenerator {
  private bushModels: THREE.Object3D[] = [];

  constructor() {
    this.loadBushModels();
  }

  private loadBushModels(): void {
    // Create variations for each archetype
    BUSH_CONFIG.archetypes.forEach((archetype, archetypeIndex) => {
      for (let i = 0; i < 3; i++) { // 3 variations per archetype
        const bush = this.createArchetypeBush(archetype, archetypeIndex * 3 + i);
        this.bushModels.push(bush);
      }
    });
    
    console.log(`🌿 Created ${this.bushModels.length} realistic bush variations across ${BUSH_CONFIG.archetypes.length} archetypes`);
  }

  private createArchetypeBush(archetype: BushArchetype, bushIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    bushGroup.userData = { archetype: archetype.name };
    
    // Determine bush characteristics based on archetype
    const baseRadius = archetype.sizeRange[0] + 
      Math.random() * (archetype.sizeRange[1] - archetype.sizeRange[0]);
    
    const height = archetype.heightRange[0] + 
      Math.random() * (archetype.heightRange[1] - archetype.heightRange[0]);
    
    const layerCount = archetype.layerCountRange[0] + 
      Math.floor(Math.random() * (archetype.layerCountRange[1] - archetype.layerCountRange[0] + 1));

    // Determine age and health for realism
    const ageCategory = this.determineAge(height, archetype);
    const healthLevel = this.determineHealth();

    // Create organic layers based on archetype
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      const layer = this.createArchetypeLayer(
        archetype, bushIndex, layerIndex, layerCount, 
        baseRadius, height, ageCategory, healthLevel
      );
      bushGroup.add(layer);
    }

    // Add stems with archetype-specific behavior
    if (Math.random() < BUSH_CONFIG.stemChance * archetype.density) {
      this.addArchetypeStems(bushGroup, archetype, baseRadius, height);
    }

    // Add berries/flowers with natural placement
    if (Math.random() < BUSH_CONFIG.berryChance && ageCategory !== 'young') {
      this.addNaturalBerries(bushGroup, baseRadius, height);
    }

    // Apply archetype-specific transformations
    this.applyArchetypeTransformations(bushGroup, archetype);

    return bushGroup;
  }

  private createArchetypeLayer(
    archetype: BushArchetype,
    bushIndex: number, 
    layerIndex: number, 
    totalLayers: number, 
    baseRadius: number, 
    maxHeight: number,
    ageCategory: 'young' | 'mature' | 'old',
    healthLevel: 'vibrant' | 'healthy' | 'stressed'
  ): THREE.Mesh {
    // Layer size based on archetype growth pattern
    const layerProgress = layerIndex / (totalLayers - 1);
    let layerRadius = baseRadius;
    
    switch (archetype.growthPattern) {
      case 'compact':
        layerRadius *= (1.1 - layerProgress * 0.3); // Gradual taper
        break;
      case 'sprawling':
        layerRadius *= (1.3 - layerProgress * 0.4); // Wide base, narrow top
        break;
      case 'upright':
        layerRadius *= (1.0 - layerProgress * 0.2); // Consistent width
        break;
      case 'wild':
        layerRadius *= (1.2 - layerProgress * 0.5 + (Math.random() - 0.5) * 0.3); // Random
        break;
    }
    
    // Enhanced segments for better organic shapes
    const segments = BUSH_CONFIG.segmentRange[0] + 
      Math.floor(Math.random() * (BUSH_CONFIG.segmentRange[1] - BUSH_CONFIG.segmentRange[0] + 1));
    
    // Archetype-influenced noise intensity
    const baseNoiseIntensity = BUSH_CONFIG.noiseIntensityRange[0] + 
      Math.random() * (BUSH_CONFIG.noiseIntensityRange[1] - BUSH_CONFIG.noiseIntensityRange[0]);
    const noiseIntensity = baseNoiseIntensity * archetype.density;
    
    // Create enhanced organic geometry
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius, 
      segments, 
      noiseIntensity,
      4.0 + layerIndex * 0.5,
      archetype.growthPattern
    );

    // Apply pattern-based droop effect
    const droopIntensity = BUSH_CONFIG.droopIntensity * (1 - layerProgress * 0.5);
    OrganicShapeGenerator.applyPatternBasedDroop(geometry, droopIntensity, archetype.growthPattern);

    // Create advanced realistic material
    const material = RealisticMaterialGenerator.createAdvancedFoliageMaterial(
      bushIndex, layerIndex, ageCategory, healthLevel
    );

    const mesh = new THREE.Mesh(geometry, material);

    // Position layer based on archetype growth pattern
    const layerHeight = this.calculateLayerHeight(layerIndex, totalLayers, maxHeight, archetype.growthPattern);
    const horizontalOffset = this.calculateHorizontalOffset(baseRadius, archetype.growthPattern);
    
    mesh.position.set(
      horizontalOffset.x,
      layerHeight,
      horizontalOffset.z
    );

    // Apply pattern-based scaling
    const scale = OrganicShapeGenerator.createPatternBasedScale(archetype.growthPattern);
    mesh.scale.copy(scale);

    // Natural rotation with archetype influence
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private calculateLayerHeight(
    layerIndex: number, 
    totalLayers: number, 
    maxHeight: number, 
    growthPattern: string
  ): number {
    const baseHeight = (layerIndex / totalLayers) * maxHeight;
    
    switch (growthPattern) {
      case 'compact':
        return baseHeight * 0.8; // Lower growth
      case 'sprawling':
        return baseHeight * 0.6; // Very low growth
      case 'upright':
        return baseHeight * 1.2; // Taller growth
      case 'wild':
      default:
        return baseHeight + (Math.random() - 0.5) * maxHeight * 0.1;
    }
  }

  private calculateHorizontalOffset(baseRadius: number, growthPattern: string): THREE.Vector3 {
    const offsetMagnitude = baseRadius * 0.3;
    
    switch (growthPattern) {
      case 'compact':
        return new THREE.Vector3(
          (Math.random() - 0.5) * offsetMagnitude * 0.5,
          0,
          (Math.random() - 0.5) * offsetMagnitude * 0.5
        );
      case 'sprawling':
        return new THREE.Vector3(
          (Math.random() - 0.5) * offsetMagnitude * 1.5,
          0,
          (Math.random() - 0.5) * offsetMagnitude * 1.5
        );
      case 'upright':
        return new THREE.Vector3(
          (Math.random() - 0.5) * offsetMagnitude * 0.3,
          0,
          (Math.random() - 0.5) * offsetMagnitude * 0.3
        );
      case 'wild':
      default:
        return new THREE.Vector3(
          (Math.random() - 0.5) * offsetMagnitude,
          0,
          (Math.random() - 0.5) * offsetMagnitude
        );
    }
  }

  private determineAge(height: number, archetype: BushArchetype): 'young' | 'mature' | 'old' {
    const heightRatio = (height - archetype.heightRange[0]) / 
                       (archetype.heightRange[1] - archetype.heightRange[0]);
    
    if (heightRatio < 0.3) return 'young';
    if (heightRatio > 0.8) return 'old';
    return 'mature';
  }

  private determineHealth(): 'vibrant' | 'healthy' | 'stressed' {
    const rand = Math.random();
    if (rand < 0.15) return 'vibrant';
    if (rand < 0.85) return 'healthy';
    return 'stressed';
  }

  private addArchetypeStems(
    bushGroup: THREE.Group, 
    archetype: BushArchetype,
    baseRadius: number, 
    height: number
  ): void {
    const stemCount = archetype.growthPattern === 'compact' ? 1 : 
                     archetype.growthPattern === 'sprawling' ? 2 + Math.floor(Math.random() * 2) :
                     1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < stemCount; i++) {
      const stemHeight = height * (0.5 + Math.random() * 0.4);
      const stemRadius = 0.01 + Math.random() * 0.01;
      
      const stemGeometry = new THREE.CylinderGeometry(
        stemRadius,
        stemRadius * 1.3,
        stemHeight,
        6
      );
      
      const stemMaterial = RealisticMaterialGenerator.createStemMaterial();
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      
      // Position stems based on archetype
      const angle = (i / stemCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = baseRadius * (archetype.growthPattern === 'compact' ? 0.2 : 0.4);
      
      stem.position.set(
        Math.cos(angle) * distance,
        stemHeight / 2,
        Math.sin(angle) * distance
      );
      
      stem.rotation.z = (Math.random() - 0.5) * 0.3;
      stem.castShadow = true;
      stem.receiveShadow = true;
      bushGroup.add(stem);
    }
  }

  private applyArchetypeTransformations(bushGroup: THREE.Group, archetype: BushArchetype): void {
    // Apply natural lean based on growth pattern
    switch (archetype.growthPattern) {
      case 'sprawling':
        bushGroup.rotation.z += (Math.random() - 0.5) * 0.2;
        break;
      case 'upright':
        bushGroup.rotation.x += (Math.random() - 0.5) * 0.05;
        bushGroup.rotation.z += (Math.random() - 0.5) * 0.05;
        break;
      case 'wild':
        bushGroup.rotation.z += (Math.random() - 0.5) * 0.15;
        bushGroup.rotation.x += (Math.random() - 0.5) * 0.1;
        break;
    }
  }

  public getBushModels(): THREE.Object3D[] {
    return this.bushModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    if (this.bushModels.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * this.bushModels.length);
    const model = this.bushModels[modelIndex].clone();
    
    // Apply environmental adaptations
    OrganicShapeGenerator.applyEnvironmentalLean(model, position);
    
    // Apply final random variations with archetype respect
    model.rotation.y = Math.random() * Math.PI * 2;
    const archetype = model.userData.archetype;
    
    let scaleVariation = 0.8 + Math.random() * 0.4;
    if (archetype === 'ground-hugger') {
      scaleVariation *= 0.9; // Slightly smaller
    } else if (archetype === 'tall-bush') {
      scaleVariation *= 1.1; // Slightly larger
    }
    
    model.scale.set(
      scaleVariation, 
      scaleVariation * (0.9 + Math.random() * 0.2), 
      scaleVariation
    );
    
    model.position.copy(position);
    
    return model;
  }

  public dispose(): void {
    this.bushModels.forEach(bush => {
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
    this.bushModels.length = 0;
  }
}
