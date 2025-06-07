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
    
    // Determine bush dimensions with better constraints
    const height = bushType.heightRange[0] + Math.random() * (bushType.heightRange[1] - bushType.heightRange[0]);
    const baseSize = bushType.baseSize[0] + Math.random() * (bushType.baseSize[1] - bushType.baseSize[0]);
    
    // Create main solid foliage mesh using improved geometry
    this.createSolidFoliageMesh(bushGroup, bushType, baseSize, height, variation);
    
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

  private createSolidFoliageMesh(
    bushGroup: THREE.Group, 
    bushType: BushType, 
    baseSize: number, 
    height: number,
    variation: number
  ): void {
    const baseColor = BUSH_CONFIG.colors[variation % BUSH_CONFIG.colors.length];
    
    // Create solid bush geometry using icosphere approach
    const geometry = OrganicShapeGenerator.createDenseBushGeometry(
      baseSize,
      height,
      bushType.name,
      variation
    );
    
    // Create enhanced material for solid appearance
    const material = BushMaterialGenerator.createDenseFoliageMaterial(
      baseColor,
      bushType.name,
      variation / 5 // Reduced variation for consistency
    );
    
    const foliageMesh = new THREE.Mesh(geometry, material);
    
    // Apply natural positioning with constraints
    let position = new THREE.Vector3(0, height * 0.35, 0);
    position = OrganicShapeGenerator.applyGroundHugging(position, bushType.name);
    foliageMesh.position.copy(position);
    
    // Apply controlled asymmetric scaling
    const scale = OrganicShapeGenerator.createAsymmetricScale(
      bushType.asymmetryFactor * 0.8, // Reduced for better appearance
      bushType.name
    );
    foliageMesh.scale.copy(scale);
    
    // Controlled rotation for natural variation
    foliageMesh.rotation.set(
      Math.random() * 0.15, // Reduced rotation
      Math.random() * Math.PI * 2,
      Math.random() * 0.15
    );
    
    // Enhanced shadow properties
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    
    // Set render order to ensure proper depth sorting
    foliageMesh.renderOrder = 1;
    
    bushGroup.add(foliageMesh);
  }

  private addStructuralStem(bushGroup: THREE.Group, bushType: BushType, height: number, baseSize: number): void {
    const stemHeight = height * 0.3; // Shorter stems
    const stemRadius = Math.max(0.015, baseSize * 0.03);
    
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.7, // Thinner at top
      stemRadius * 1.0, // Base thickness
      stemHeight,
      8
    );
    
    const stemMaterial = BushMaterialGenerator.createStemMaterial();
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    // Position stem with minimal offset to maintain bush integrity
    stem.position.set(
      (Math.random() - 0.5) * baseSize * 0.2,
      stemHeight / 2,
      (Math.random() - 0.5) * baseSize * 0.2
    );
    
    // Minimal rotation
    stem.rotation.set(
      (Math.random() - 0.5) * 0.1,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.1
    );
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    stem.renderOrder = 0; // Render stems before foliage
    bushGroup.add(stem);
  }

  private addSurfaceBerries(bushGroup: THREE.Group, baseSize: number): void {
    const berryCount = Math.floor(1 + Math.random() * 3); // Fewer berries
    const berryType: 'red' | 'blue' = Math.random() < 0.6 ? 'red' : 'blue';
    
    for (let k = 0; k < berryCount; k++) {
      const berryGeometry = new THREE.SphereGeometry(
        0.015 + Math.random() * 0.01, // Slightly smaller berries
        6,
        4
      );
      
      const berryMaterial = BushMaterialGenerator.createBerryMaterial(berryType);
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Position berries more naturally on the surface
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.8 + Math.random() * 0.15);
      const heightPos = 0.3 + Math.random() * 0.3;
      
      berry.position.set(
        Math.cos(angle) * distance,
        heightPos,
        Math.sin(angle) * distance
      );
      
      berry.castShadow = true;
      berry.renderOrder = 2; // Render berries last
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
    
    // Apply conservative final transformations
    model.rotation.y = Math.random() * Math.PI * 2;
    const globalScale = 0.95 + Math.random() * 0.1; // More consistent scaling
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
