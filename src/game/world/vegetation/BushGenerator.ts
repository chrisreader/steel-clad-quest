
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
        const bushGroup = this.createRealisticBush(bushType, i);
        variations.push(bushGroup);
      }
      
      this.bushModels.set(bushType.name, variations);
    }
    
    console.log(`🌿 Created realistic bush variations:`, 
      Array.from(this.bushModels.keys()).map(type => 
        `${type}: ${this.bushModels.get(type)?.length || 0} variations`
      ).join(', ')
    );
  }

  private createRealisticBush(bushType: BushType, variation: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    // Determine bush dimensions
    const height = bushType.heightRange[0] + Math.random() * (bushType.heightRange[1] - bushType.heightRange[0]);
    const baseSize = bushType.baseSize[0] + Math.random() * (bushType.baseSize[1] - bushType.baseSize[0]);
    const clusterCount = bushType.clusterCount[0] + Math.floor(Math.random() * (bushType.clusterCount[1] - bushType.clusterCount[0] + 1));
    
    // Create main clusters with organic merging
    this.createMainClusters(bushGroup, bushType, baseSize, height, clusterCount, variation);
    
    // Add filler clusters for natural merging
    if (BUSH_CONFIG.naturalMerging.fillerClusters) {
      this.addFillerClusters(bushGroup, bushType, baseSize, clusterCount, variation);
    }
    
    // Add stem structure
    if (Math.random() < BUSH_CONFIG.stemChance) {
      this.addRealisticStem(bushGroup, bushType, height, baseSize);
    }
    
    // Add berries or flowers
    if (Math.random() < BUSH_CONFIG.berryChance) {
      this.addBerries(bushGroup, baseSize, clusterCount);
    }
    
    return bushGroup;
  }

  private createMainClusters(
    bushGroup: THREE.Group, 
    bushType: BushType, 
    baseSize: number, 
    height: number,
    clusterCount: number,
    variation: number
  ): void {
    const baseColor = BUSH_CONFIG.colors[variation % BUSH_CONFIG.colors.length];
    
    for (let i = 0; i < clusterCount; i++) {
      // Create organic geometry
      const clusterRadius = baseSize * (0.5 + Math.random() * 0.5) * bushType.density;
      const geometry = OrganicShapeGenerator.createOrganicGeometry(
        clusterRadius,
        BUSH_CONFIG.organicDeformation.intensity,
        BUSH_CONFIG.organicDeformation.scale
      );
      
      // Create realistic material
      const material = BushMaterialGenerator.createRealisticBushMaterial(
        baseColor,
        bushType.name,
        variation / 3
      );
      
      const cluster = new THREE.Mesh(geometry, material);
      
      // Position clusters for natural merging
      const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 1.0; // More random positioning
      const distance = baseSize * (0.1 + Math.random() * BUSH_CONFIG.naturalMerging.overlapFactor);
      
      let position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0.2 + (Math.random() * height * 0.6), // Varied height positioning
        Math.sin(angle) * distance
      );
      
      // Apply droop effect for realism
      position = OrganicShapeGenerator.applyDroopEffect(position, bushType.droopFactor, i);
      cluster.position.copy(position);
      
      // Apply asymmetric scaling
      const scale = OrganicShapeGenerator.createAsymmetricScale(bushType.asymmetryFactor);
      cluster.scale.copy(scale);
      
      // Random rotation for natural look
      cluster.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      bushGroup.add(cluster);
    }
  }

  private addFillerClusters(
    bushGroup: THREE.Group,
    bushType: BushType,
    baseSize: number,
    mainClusterCount: number,
    variation: number
  ): void {
    const fillerCount = Math.floor(mainClusterCount * 0.5); // Half as many fillers
    const baseColor = BUSH_CONFIG.colors[variation % BUSH_CONFIG.colors.length];
    
    for (let i = 0; i < fillerCount; i++) {
      const fillerRadius = baseSize * (0.2 + Math.random() * 0.3); // Smaller filler clusters
      const geometry = OrganicShapeGenerator.createOrganicGeometry(
        fillerRadius,
        BUSH_CONFIG.organicDeformation.intensity * 0.8,
        BUSH_CONFIG.organicDeformation.scale
      );
      
      const material = BushMaterialGenerator.createRealisticBushMaterial(
        baseColor,
        bushType.name,
        variation / 3
      );
      
      const filler = new THREE.Mesh(geometry, material);
      
      // Position fillers between main clusters
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.3 + Math.random() * 0.4);
      
      filler.position.set(
        Math.cos(angle) * distance,
        0.1 + Math.random() * 0.3,
        Math.sin(angle) * distance
      );
      
      // Smaller, more varied scaling for fillers
      const scale = OrganicShapeGenerator.createAsymmetricScale(bushType.asymmetryFactor * 1.2);
      scale.multiplyScalar(0.6 + Math.random() * 0.4); // Make fillers smaller
      filler.scale.copy(scale);
      
      filler.castShadow = true;
      filler.receiveShadow = true;
      bushGroup.add(filler);
    }
  }

  private addRealisticStem(bushGroup: THREE.Group, bushType: BushType, height: number, baseSize: number): void {
    const stemHeight = height * 0.6; // Stems don't go full height
    const stemRadius = Math.max(0.02, baseSize * 0.05);
    
    // Create slightly curved stem
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.7, // Thinner at top
      stemRadius * 1.2, // Thicker at bottom
      stemHeight,
      8
    );
    
    const stemMaterial = BushMaterialGenerator.createStemMaterial();
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    // Position stem with slight random offset
    stem.position.set(
      (Math.random() - 0.5) * baseSize * 0.2,
      stemHeight / 2,
      (Math.random() - 0.5) * baseSize * 0.2
    );
    
    // Add slight rotation for natural look
    stem.rotation.set(
      (Math.random() - 0.5) * 0.2,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.2
    );
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
  }

  private addBerries(bushGroup: THREE.Group, baseSize: number, clusterCount: number): void {
    const berryCount = Math.floor(2 + Math.random() * Math.min(6, clusterCount * 1.5));
    const berryType: 'red' | 'blue' = Math.random() < 0.6 ? 'red' : 'blue';
    
    for (let k = 0; k < berryCount; k++) {
      const berryGeometry = new THREE.SphereGeometry(
        0.025 + Math.random() * 0.02, // Slightly varied berry sizes
        6,
        4
      );
      
      const berryMaterial = BushMaterialGenerator.createBerryMaterial(berryType);
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Position berries naturally on the bush
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.5 + Math.random() * 0.4);
      const heightPos = 0.3 + Math.random() * 0.5;
      
      berry.position.set(
        Math.cos(angle) * distance,
        heightPos,
        Math.sin(angle) * distance
      );
      
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
    const globalScale = 0.8 + Math.random() * 0.4;
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
