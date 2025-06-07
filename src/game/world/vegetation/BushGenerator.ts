
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
      
      // Create 4 variations per bush type
      for (let i = 0; i < 4; i++) {
        const bushGroup = this.createDenseBush(bushType, i);
        variations.push(bushGroup);
      }
      
      this.bushModels.set(bushType.name, variations);
    }
    
    console.log(`🌿 Created dense bush variations:`, 
      Array.from(this.bushModels.keys()).map(type => 
        `${type}: ${this.bushModels.get(type)?.length || 0} variations`
      ).join(', ')
    );
  }

  private createDenseBush(bushType: BushType, variation: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    // Determine bush dimensions
    const height = bushType.heightRange[0] + Math.random() * (bushType.heightRange[1] - bushType.heightRange[0]);
    const baseSize = bushType.baseSize[0] + Math.random() * (bushType.baseSize[1] - bushType.baseSize[0]);
    
    // Create main dense foliage mesh
    this.createMainFoliageMesh(bushGroup, bushType, baseSize, height, variation);
    
    // Add occasional stems for larger bushes
    if (bushType.name !== 'low_shrub' && Math.random() < BUSH_CONFIG.stemChance) {
      this.addRealisticStem(bushGroup, bushType, height, baseSize);
    }
    
    // Add berries or flowers
    if (Math.random() < BUSH_CONFIG.berryChance) {
      this.addBerries(bushGroup, baseSize);
    }
    
    return bushGroup;
  }

  private createMainFoliageMesh(
    bushGroup: THREE.Group, 
    bushType: BushType, 
    baseSize: number, 
    height: number,
    variation: number
  ): void {
    const baseColor = BUSH_CONFIG.colors[variation % BUSH_CONFIG.colors.length];
    
    // Create dense bush geometry
    const geometry = OrganicShapeGenerator.createDenseBushGeometry(
      baseSize,
      height,
      bushType.name,
      variation
    );
    
    // Create dense foliage material
    const material = BushMaterialGenerator.createDenseFoliageMaterial(
      baseColor,
      bushType.name,
      variation / 3
    );
    
    const foliageMesh = new THREE.Mesh(geometry, material);
    
    // Apply natural positioning
    let position = new THREE.Vector3(0, height * 0.3, 0);
    position = OrganicShapeGenerator.applyGroundHugging(position, bushType.name);
    foliageMesh.position.copy(position);
    
    // Apply asymmetric scaling for natural look
    const scale = OrganicShapeGenerator.createAsymmetricScale(bushType.asymmetryFactor, bushType.name);
    foliageMesh.scale.copy(scale);
    
    // Random rotation for natural variation
    foliageMesh.rotation.set(
      Math.random() * 0.2,
      Math.random() * Math.PI * 2,
      Math.random() * 0.2
    );
    
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    bushGroup.add(foliageMesh);
  }

  private addRealisticStem(bushGroup: THREE.Group, bushType: BushType, height: number, baseSize: number): void {
    const stemHeight = height * 0.4; // Shorter stems for dense bushes
    const stemRadius = Math.max(0.02, baseSize * 0.04);
    
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.6, // Thinner at top
      stemRadius * 1.1, // Thicker at bottom
      stemHeight,
      8
    );
    
    const stemMaterial = BushMaterialGenerator.createStemMaterial();
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    // Position stem with slight offset
    stem.position.set(
      (Math.random() - 0.5) * baseSize * 0.3,
      stemHeight / 2,
      (Math.random() - 0.5) * baseSize * 0.3
    );
    
    // Add slight rotation
    stem.rotation.set(
      (Math.random() - 0.5) * 0.15,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.15
    );
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
  }

  private addBerries(bushGroup: THREE.Group, baseSize: number): void {
    const berryCount = Math.floor(2 + Math.random() * 4);
    const berryType: 'red' | 'blue' = Math.random() < 0.6 ? 'red' : 'blue';
    
    for (let k = 0; k < berryCount; k++) {
      const berryGeometry = new THREE.SphereGeometry(
        0.02 + Math.random() * 0.015, // Small berries
        8,
        6
      );
      
      const berryMaterial = BushMaterialGenerator.createBerryMaterial(berryType);
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Position berries on the surface
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.7 + Math.random() * 0.2);
      const heightPos = 0.2 + Math.random() * 0.4;
      
      berry.position.set(
        Math.cos(angle) * distance,
        heightPos,
        Math.sin(angle) * distance
      );
      
      berry.castShadow = true;
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
    // Select bush type based on spawn weights
    const selectedType = this.selectBushTypeByWeight();
    const variations = this.bushModels.get(selectedType.name);
    
    if (!variations || variations.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * variations.length);
    const model = variations[modelIndex].clone();
    
    // Apply final transformations
    model.rotation.y = Math.random() * Math.PI * 2;
    const globalScale = 0.9 + Math.random() * 0.2;
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
    
    // Fallback to first type
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
