import * as THREE from 'three';
import { BUSH_CONFIG, BushType } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { BushMaterialGenerator } from './BushMaterialGenerator';

export class BushGenerator {
  private bushModels: Map<string, THREE.Object3D[]> = new Map();

  constructor() {
    this.loadBushModels();
  }

  private loadBushModels(): void {
    // Create multiple variations for each bush type
    for (const bushType of BUSH_CONFIG.types) {
      const variations: THREE.Object3D[] = [];
      
      // Create 6 variations per bush type for better diversity
      for (let i = 0; i < 6; i++) {
        const bushGroup = this.createSolidBush(bushType, i);
        variations.push(bushGroup);
      }
      
      this.bushModels.set(bushType.name, variations);
    }
    
    console.log(`🌿 Created solid bush variations:`, 
      Array.from(this.bushModels.keys()).map(type => 
        `${type}: ${this.bushModels.get(type)?.length || 0} variations`
      ).join(', ')
    );
  }

  private createSolidBush(bushType: BushType, variation: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    const height = bushType.heightRange[0] + Math.random() * (bushType.heightRange[1] - bushType.heightRange[0]);
    const baseSize = bushType.baseSize[0] + Math.random() * (bushType.baseSize[1] - bushType.baseSize[0]);
    
    // Create dual-layer bush system: solid core + detailed foliage
    this.createDualLayerBush(bushGroup, bushType, baseSize, height, variation);
    
    // Add stems for structure (less frequently to maintain solid appearance)
    if (bushType.name !== 'low_shrub' && Math.random() < BUSH_CONFIG.stemChance * 0.6) {
      this.addStructuralStem(bushGroup, bushType, height, baseSize);
    }
    
    // Add berries or flowers (reduced frequency)
    if (Math.random() < BUSH_CONFIG.berryChance * 0.8) {
      this.addSurfaceBerries(bushGroup, baseSize);
    }
    
    return bushGroup;
  }

  private createDualLayerBush(
    bushGroup: THREE.Group, 
    bushType: BushType, 
    baseSize: number, 
    height: number,
    variation: number
  ): void {
    const baseColor = BUSH_CONFIG.colors[variation % BUSH_CONFIG.colors.length];
    
    // 1. Create solid core sphere (fills all gaps)
    this.createSolidCore(bushGroup, bushType, baseSize, height, baseColor, variation);
    
    // 2. Create detailed foliage mesh (adds visual detail)
    this.createDetailedFoliage(bushGroup, bushType, baseSize, height, baseColor, variation);
  }

  private createSolidCore(
    bushGroup: THREE.Group,
    bushType: BushType,
    baseSize: number,
    height: number,
    baseColor: THREE.Color,
    variation: number
  ): void {
    // Create smooth, high-resolution sphere for the core
    const coreRadius = baseSize * 0.88; // Slightly smaller than foliage to avoid z-fighting
    const coreGeometry = new THREE.SphereGeometry(coreRadius, 64, 32); // High resolution for smoothness
    
    // Apply same transformations as foliage mesh
    const positions = coreGeometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Apply vertical stretching to match foliage
    let verticalStretch = 1.0;
    switch (bushType.name) {
      case 'low_shrub':
        verticalStretch = 0.6;
        break;
      case 'medium_bush':
        verticalStretch = 1.0;
        break;
      case 'tall_bush':
        verticalStretch = 1.4;
        break;
    }
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      vertex.y *= verticalStretch;
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    coreGeometry.computeVertexNormals();
    
    // Create core material
    const coreMaterial = BushMaterialGenerator.createSolidCoreMaterial(
      baseColor,
      bushType.name,
      variation / 5
    );
    
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    
    // Apply same positioning and scaling as foliage
    let position = new THREE.Vector3(0, height * 0.35, 0);
    position = OrganicShapeGenerator.applyGroundHugging(position, bushType.name);
    coreMesh.position.copy(position);
    
    const scale = OrganicShapeGenerator.createAsymmetricScale(
      bushType.asymmetryFactor * 0.8,
      bushType.name
    );
    coreMesh.scale.copy(scale);
    
    coreMesh.rotation.set(
      Math.random() * 0.15,
      Math.random() * Math.PI * 2,
      Math.random() * 0.15
    );
    
    // Set render order to render first (fills gaps)
    coreMesh.renderOrder = 0;
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    
    bushGroup.add(coreMesh);
  }

  private createDetailedFoliage(
    bushGroup: THREE.Group,
    bushType: BushType,
    baseSize: number,
    height: number,
    baseColor: THREE.Color,
    variation: number
  ): void {
    // Create detailed foliage geometry
    const geometry = OrganicShapeGenerator.createDenseBushGeometry(
      baseSize,
      height,
      bushType.name,
      variation
    );
    
    // Create enhanced material for foliage detail
    const material = BushMaterialGenerator.createDenseFoliageMaterial(
      baseColor,
      bushType.name,
      variation / 5
    );
    
    const foliageMesh = new THREE.Mesh(geometry, material);
    
    // Apply natural positioning with constraints
    let position = new THREE.Vector3(0, height * 0.35, 0);
    position = OrganicShapeGenerator.applyGroundHugging(position, bushType.name);
    foliageMesh.position.copy(position);
    
    // Apply controlled asymmetric scaling
    const scale = OrganicShapeGenerator.createAsymmetricScale(
      bushType.asymmetryFactor * 0.8,
      bushType.name
    );
    foliageMesh.scale.copy(scale);
    
    // Controlled rotation for natural variation
    foliageMesh.rotation.set(
      Math.random() * 0.15,
      Math.random() * Math.PI * 2,
      Math.random() * 0.15
    );
    
    // Set render order to render after core (adds detail)
    foliageMesh.renderOrder = 1;
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    
    bushGroup.add(foliageMesh);
  }

  private addStructuralStem(bushGroup: THREE.Group, bushType: BushType, height: number, baseSize: number): void {
    const stemHeight = height * 0.3;
    const stemRadius = Math.max(0.015, baseSize * 0.03);
    
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.7,
      stemRadius * 1.0,
      stemHeight,
      8
    );
    
    const stemMaterial = BushMaterialGenerator.createStemMaterial();
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    stem.position.set(
      (Math.random() - 0.5) * baseSize * 0.2,
      stemHeight / 2,
      (Math.random() - 0.5) * baseSize * 0.2
    );
    
    stem.rotation.set(
      (Math.random() - 0.5) * 0.1,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.1
    );
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    stem.renderOrder = 0;
    bushGroup.add(stem);
  }

  private addSurfaceBerries(bushGroup: THREE.Group, baseSize: number): void {
    const berryCount = Math.floor(1 + Math.random() * 3);
    const berryType: 'red' | 'blue' = Math.random() < 0.6 ? 'red' : 'blue';
    
    for (let k = 0; k < berryCount; k++) {
      const berryGeometry = new THREE.SphereGeometry(
        0.015 + Math.random() * 0.01,
        6,
        4
      );
      
      const berryMaterial = BushMaterialGenerator.createBerryMaterial(berryType);
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.8 + Math.random() * 0.15);
      const heightPos = 0.3 + Math.random() * 0.3;
      
      berry.position.set(
        Math.cos(angle) * distance,
        heightPos,
        Math.sin(angle) * distance
      );
      
      berry.castShadow = true;
      berry.renderOrder = 2;
      bushGroup.add(berry);
    }
  }

  public getBushModels(): THREE.Object3D[] {
    const allModels: THREE.Object3D[] = [];
    for (const variations of this.bushModels.values()) {
      allModels.push(...variations);
    }
    return allModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    const selectedType = this.selectBushTypeByWeight();
    const variations = this.bushModels.get(selectedType.name);
    
    if (!variations || variations.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * variations.length);
    const model = variations[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    const globalScale = 0.95 + Math.random() * 0.1;
    model.scale.setScalar(globalScale);
    
    model.position.copy(position);
    
    return model;
  }

  private selectBushTypeByWeight(): BushType {
    const random = Math.random();
    let weightSum = 0;
    
    for (const bushType of BUSH_CONFIG.types) {
      weightSum += bushType.spawnWeight;
      if (random <= weightSum) {
        return bushType;
      }
    }
    
    return BUSH_CONFIG.types[0];
  }

  public dispose(): void {
    for (const variations of this.bushModels.values()) {
      variations.forEach(bush => {
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
    }
    this.bushModels.clear();
  }
}
