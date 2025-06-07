
import * as THREE from 'three';
import { BUSH_CONFIG, BushType } from './VegetationConfig';
import { AdvancedOrganicShapeGenerator } from './AdvancedOrganicShapeGenerator';
import { RealisticBushMaterialGenerator } from './RealisticBushMaterialGenerator';

export class BushGenerator {
  private bushModels: Map<string, THREE.Object3D[]> = new Map();
  private speciesModels: Map<string, THREE.Object3D[]> = new Map();

  constructor() {
    this.loadBushModels();
    this.loadSpeciesModels();
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

  private loadSpeciesModels(): void {
    // Create realistic species-based models
    for (const species of BUSH_CONFIG.species) {
      const variations: THREE.Object3D[] = [];
      
      // Create multiple growth stages and variations
      const growthStages: ('juvenile' | 'mature' | 'old')[] = ['juvenile', 'mature', 'old'];
      
      for (const stage of growthStages) {
        for (let variation = 0; variation < 3; variation++) {
          const bushGroup = this.createSpeciesBush(species, stage, variation);
          variations.push(bushGroup);
        }
      }
      
      this.speciesModels.set(species.name, variations);
    }
    
    console.log(`🌿 Created realistic species variations:`, 
      Array.from(this.speciesModels.keys()).map(species => 
        `${species}: ${this.speciesModels.get(species)?.length || 0} variations`
      ).join(', ')
    );
  }

  private createSpeciesBush(
    species: any, 
    growthStage: 'juvenile' | 'mature' | 'old',
    variation: number
  ): THREE.Group {
    const bushGroup = new THREE.Group();
    
    // Determine realistic dimensions
    const heightBase = species.heightRange[0] + Math.random() * (species.heightRange[1] - species.heightRange[0]);
    const height = heightBase * species.growthStages[growthStage].scale;
    
    const widthRatio = species.widthRatio[0] + Math.random() * (species.widthRatio[1] - species.widthRatio[0]);
    const baseSize = height * widthRatio;
    
    const clusterCount = species.clusterCount[0] + Math.floor(Math.random() * (species.clusterCount[1] - species.clusterCount[0] + 1));
    
    // Create main foliage clusters with realistic distribution
    this.createRealisticFoliageClusters(bushGroup, species, growthStage, baseSize, height, clusterCount, variation);
    
    // Add natural branch structure
    if (BUSH_CONFIG.realism.naturalClustering) {
      AdvancedOrganicShapeGenerator.createBranchStructure(bushGroup, species, height, baseSize);
    }
    
    // Add stem structure with species characteristics
    if (Math.random() < BUSH_CONFIG.stemChance) {
      this.addSpeciesStem(bushGroup, species, height, baseSize);
    }
    
    // Add species-appropriate berries/flowers
    if (Math.random() < BUSH_CONFIG.berryChance) {
      this.addSeasonalBerries(bushGroup, species, baseSize, clusterCount);
    }
    
    return bushGroup;
  }

  private createRealisticFoliageClusters(
    bushGroup: THREE.Group,
    species: any,
    growthStage: 'juvenile' | 'mature' | 'old',
    baseSize: number,
    height: number,
    clusterCount: number,
    variation: number
  ): void {
    for (let i = 0; i < clusterCount; i++) {
      // Create realistic cluster size with natural variation
      const clusterRadius = baseSize * (0.4 + Math.random() * 0.4) * species.growthStages[growthStage].density;
      
      // Generate advanced organic geometry
      const geometry = AdvancedOrganicShapeGenerator.createRealisticBushGeometry(
        clusterRadius,
        height,
        species,
        growthStage,
        BUSH_CONFIG.organicDeformation.intensity,
        BUSH_CONFIG.organicDeformation.scale
      );
      
      // Create species-specific material
      const material = RealisticBushMaterialGenerator.createSpeciesMaterial(
        species,
        growthStage,
        variation / 2,
        BUSH_CONFIG.realism.weatherEffects
      );
      
      const cluster = new THREE.Mesh(geometry, material);
      
      // Natural cluster positioning with botanical accuracy
      const layerHeight = i / clusterCount; // 0 to 1
      const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.8;
      
      // Realistic radial distribution - denser toward center
      const distanceFactor = Math.pow(Math.random(), 0.7); // Bias toward center
      const distance = baseSize * distanceFactor * BUSH_CONFIG.naturalMerging.overlapFactor;
      
      let position = new THREE.Vector3(
        Math.cos(angle) * distance,
        layerHeight * height * (0.3 + Math.random() * 0.5), // Natural height distribution
        Math.sin(angle) * distance
      );
      
      // Apply natural drooping effects
      position = AdvancedOrganicShapeGenerator.applyNaturalDrooping(
        position, 
        species, 
        i, 
        clusterCount
      );
      
      cluster.position.copy(position);
      
      // Apply natural scaling
      const scale = AdvancedOrganicShapeGenerator.createNaturalScale(species, growthStage);
      cluster.scale.copy(scale);
      
      // Natural rotation with slight bias toward light
      cluster.rotation.set(
        Math.random() * 0.4 - 0.2,
        Math.random() * Math.PI * 2,
        Math.random() * 0.4 - 0.2
      );
      
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      bushGroup.add(cluster);
    }
    
    // Add filler clusters for natural density
    if (BUSH_CONFIG.naturalMerging.fillerClusters && clusterCount > 3) {
      this.addNaturalFillerClusters(bushGroup, species, growthStage, baseSize, height, clusterCount, variation);
    }
  }

  private addNaturalFillerClusters(
    bushGroup: THREE.Group,
    species: any,
    growthStage: 'juvenile' | 'mature' | 'old',
    baseSize: number,
    height: number,
    mainClusterCount: number,
    variation: number
  ): void {
    const fillerCount = Math.floor(mainClusterCount * 0.4); // Natural filler ratio
    
    for (let i = 0; i < fillerCount; i++) {
      const fillerRadius = baseSize * (0.15 + Math.random() * 0.25);
      
      const geometry = AdvancedOrganicShapeGenerator.createRealisticBushGeometry(
        fillerRadius,
        height * 0.6, // Fillers are shorter
        species,
        growthStage,
        BUSH_CONFIG.organicDeformation.intensity * 0.8,
        BUSH_CONFIG.organicDeformation.scale
      );
      
      const material = RealisticBushMaterialGenerator.createSpeciesMaterial(
        species,
        growthStage,
        variation / 2,
        BUSH_CONFIG.realism.weatherEffects
      );
      
      const filler = new THREE.Mesh(geometry, material);
      
      // Position fillers naturally between main clusters
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.2 + Math.random() * 0.5);
      
      filler.position.set(
        Math.cos(angle) * distance,
        Math.random() * height * 0.4,
        Math.sin(angle) * distance
      );
      
      // Smaller scale for filler clusters
      const scale = AdvancedOrganicShapeGenerator.createNaturalScale(species, growthStage);
      scale.multiplyScalar(0.5 + Math.random() * 0.3);
      filler.scale.copy(scale);
      
      filler.castShadow = true;
      filler.receiveShadow = true;
      bushGroup.add(filler);
    }
  }

  private addSpeciesStem(
    bushGroup: THREE.Group, 
    species: any, 
    height: number, 
    baseSize: number
  ): void {
    const stemHeight = height * (0.4 + Math.random() * 0.3);
    const stemRadius = Math.max(0.015, baseSize * (0.03 + Math.random() * 0.02));
    
    // Create realistic stem with species characteristics
    const stemGeometry = new THREE.CylinderGeometry(
      stemRadius * 0.6, // Tapered top
      stemRadius * 1.3, // Wider base
      stemHeight,
      8
    );
    
    const stemMaterial = RealisticBushMaterialGenerator.createRealisticStemMaterial(species);
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    // Natural stem positioning
    stem.position.set(
      (Math.random() - 0.5) * baseSize * 0.15,
      stemHeight / 2,
      (Math.random() - 0.5) * baseSize * 0.15
    );
    
    // Slight natural lean
    stem.rotation.set(
      (Math.random() - 0.5) * 0.15,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.15
    );
    
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
  }

  private addSeasonalBerries(
    bushGroup: THREE.Group, 
    species: any, 
    baseSize: number, 
    clusterCount: number
  ): void {
    // Species-specific berry characteristics
    const berryTypes: ('red' | 'blue' | 'purple' | 'white')[] = ['red', 'blue', 'purple', 'white'];
    const berryType = berryTypes[Math.floor(Math.random() * berryTypes.length)];
    
    const berryCount = Math.floor(1 + Math.random() * Math.min(8, clusterCount * 2));
    
    for (let k = 0; k < berryCount; k++) {
      const berrySize = 0.02 + Math.random() * 0.025;
      const ripeness = 0.6 + Math.random() * 0.4; // Variation in ripeness
      
      const berryGeometry = new THREE.SphereGeometry(berrySize, 8, 6);
      const berryMaterial = RealisticBushMaterialGenerator.createSeasonalBerryMaterial(berryType, ripeness);
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Natural berry positioning
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.4 + Math.random() * 0.5);
      const heightPos = 0.2 + Math.random() * 0.6;
      
      berry.position.set(
        Math.cos(angle) * distance,
        heightPos,
        Math.sin(angle) * distance
      );
      
      bushGroup.add(berry);
    }
  }

  private createRealisticBush(bushType: BushType, variation: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    const height = bushType.heightRange[0] + Math.random() * (bushType.heightRange[1] - bushType.heightRange[0]);
    const baseSize = bushType.baseSize[0] + Math.random() * (bushType.baseSize[1] - bushType.baseSize[0]);
    const clusterCount = bushType.clusterCount[0] + Math.floor(Math.random() * (bushType.clusterCount[1] - bushType.clusterCount[0] + 1));
    
    this.createMainClusters(bushGroup, bushType, baseSize, height, clusterCount, variation);
    
    if (BUSH_CONFIG.naturalMerging.fillerClusters) {
      this.addFillerClusters(bushGroup, bushType, baseSize, clusterCount, variation);
    }
    
    if (Math.random() < BUSH_CONFIG.stemChance) {
      this.addRealisticStem(bushGroup, bushType, height, baseSize);
    }
    
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
      const geometry = AdvancedOrganicShapeGenerator.createOrganicGeometry(
        clusterRadius,
        BUSH_CONFIG.organicDeformation.intensity,
        BUSH_CONFIG.organicDeformation.scale
      );
      
      // Create realistic material
      const material = RealisticBushMaterialGenerator.createRealisticBushMaterial(
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
      position = AdvancedOrganicShapeGenerator.applyDroopEffect(position, bushType.droopFactor, i);
      cluster.position.copy(position);
      
      // Apply asymmetric scaling
      const scale = AdvancedOrganicShapeGenerator.createAsymmetricScale(bushType.asymmetryFactor);
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
      const geometry = AdvancedOrganicShapeGenerator.createOrganicGeometry(
        fillerRadius,
        BUSH_CONFIG.organicDeformation.intensity * 0.8,
        BUSH_CONFIG.organicDeformation.scale
      );
      
      const material = RealisticBushMaterialGenerator.createRealisticBushMaterial(
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
      const scale = AdvancedOrganicShapeGenerator.createAsymmetricScale(bushType.asymmetryFactor * 1.2);
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
    
    const stemMaterial = RealisticBushMaterialGenerator.createStemMaterial();
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
      
      const berryMaterial = RealisticBushMaterialGenerator.createBerryMaterial(berryType);
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
    
    // Include both old and new models for variety
    for (const variations of this.bushModels.values()) {
      allModels.push(...variations);
    }
    
    for (const variations of this.speciesModels.values()) {
      allModels.push(...variations);
    }
    
    return allModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    // Prefer species-based models for higher realism
    if (Math.random() < 0.7 && this.speciesModels.size > 0) {
      return this.createSpeciesBasedBush(position);
    } else {
      return this.createTraditionalBush(position);
    }
  }

  private createSpeciesBasedBush(position: THREE.Vector3): THREE.Object3D | null {
    // Select species based on spawn weights
    const selectedSpecies = this.selectSpeciesByWeight();
    const variations = this.speciesModels.get(selectedSpecies.name);
    
    if (!variations || variations.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * variations.length);
    const model = variations[modelIndex].clone();
    
    // Apply environmental scaling and rotation
    model.rotation.y = Math.random() * Math.PI * 2;
    const globalScale = 0.7 + Math.random() * 0.6; // More size variation
    model.scale.setScalar(globalScale);
    
    model.position.copy(position);
    
    return model;
  }

  private createTraditionalBush(position: THREE.Vector3): THREE.Object3D | null {
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

  private selectSpeciesByWeight(): any {
    const random = Math.random();
    let weightSum = 0;
    
    for (const species of BUSH_CONFIG.species) {
      weightSum += species.spawnWeight;
      if (random <= weightSum) {
        return species;
      }
    }
    
    return BUSH_CONFIG.species[0];
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
    
    for (const variations of this.speciesModels.values()) {
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
    this.speciesModels.clear();
  }
}
