import * as THREE from 'three';
import { BUSH_CONFIG, BUSH_SPECIES, BushSpecies, BushType, GrowthPattern } from './VegetationConfig';
import { OrganicBushGeometry } from './OrganicBushGeometry';
import { OrganicBushMaterials } from './OrganicBushMaterials';
import { logger } from '../../core/Logger';
import { LOGGING_CONSTANTS } from '../../core/GameConstants';

export class BushGenerator {
  private bushModels: Map<BushType, THREE.Object3D[]> = new Map();
  private speciesWeights: Map<BushType, number> = new Map();
  private geometryGenerator: OrganicBushGeometry;
  private materialGenerator: OrganicBushMaterials;

  constructor() {
    this.geometryGenerator = new OrganicBushGeometry();
    this.materialGenerator = new OrganicBushMaterials();
    this.initializeSpeciesWeights();
    this.loadBushModels();
  }

  private initializeSpeciesWeights(): void {
    // Set probability weights for different bush types
    this.speciesWeights.set(BushType.SMALL_SHRUB, 0.25);
    this.speciesWeights.set(BushType.MEDIUM_BUSH, 0.35);
    this.speciesWeights.set(BushType.LARGE_BUSH, 0.15);
    this.speciesWeights.set(BushType.TALL_SHRUB, 0.08);
    this.speciesWeights.set(BushType.BERRY_BUSH, 0.07);
    this.speciesWeights.set(BushType.FLOWERING_BUSH, 0.05);
    this.speciesWeights.set(BushType.EVERGREEN_SHRUB, 0.03);
    this.speciesWeights.set(BushType.WILD_BRAMBLE, 0.02);
  }

  private loadBushModels(): void {
    // Create multiple variations for each bush species
    for (const species of BUSH_SPECIES) {
      const variations: THREE.Object3D[] = [];
      
      // Create 4-5 variations per species for diversity
      for (let i = 0; i < 5; i++) {
        const bushGroup = this.createOrganicBushVariation(species, i);
        variations.push(bushGroup);
      }
      
      this.bushModels.set(species.type, variations);
      logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, `Created ${variations.length} organic variations for ${species.type}`);
    }
    
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, `🌿 Organic bush system initialized with ${BUSH_SPECIES.length} species`);
  }

  private createOrganicBushVariation(species: BushSpecies, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    // Generate realistic size based on species
    const height = species.heightRange[0] + Math.random() * (species.heightRange[1] - species.heightRange[0]);
    const width = species.widthRange[0] + Math.random() * (species.widthRange[1] - species.widthRange[0]);
    
    // Create base material
    const baseMaterial = this.materialGenerator.createFoliageMaterial(species, variationIndex);
    
    // Generate organic foliage clusters
    this.createOrganicFoliageClusters(bushGroup, species, height, width, baseMaterial);
    
    // Add organic stems and branches
    if (Math.random() < species.stemChance) {
      this.addOrganicBranches(bushGroup, species, height, width);
    }
    
    // Add berries with organic placement
    if (Math.random() < species.berryChance) {
      this.addOrganicBerries(bushGroup, species, width);
    }
    
    // Add flowers with natural distribution
    if (Math.random() < species.flowerChance) {
      this.addOrganicFlowers(bushGroup, species, width, height);
    }
    
    return bushGroup;
  }

  private createOrganicFoliageClusters(
    bushGroup: THREE.Group,
    species: BushSpecies,
    height: number,
    width: number,
    baseMaterial: THREE.MeshStandardMaterial
  ): void {
    const clusterCount = species.clusterCountRange[0] + 
      Math.floor(Math.random() * (species.clusterCountRange[1] - species.clusterCountRange[0] + 1));
    
    // Create main foliage mass with organic distribution
    for (let i = 0; i < clusterCount; i++) {
      const clusterSize = this.calculateOrganicClusterSize(species, height, width, i, clusterCount);
      const position = this.calculateOrganicClusterPosition(species.growthPattern, height, width, i, clusterCount);
      
      // Create organic foliage geometry
      const geometry = this.geometryGenerator.createFoliageCluster(
        clusterSize,
        0.2 + Math.random() * 0.4, // asymmetry
        0.1 + Math.random() * 0.3   // bumpiness
      );
      
      // Create material variation for this cluster
      const material = this.materialGenerator.createVariationMaterial(baseMaterial, Math.random());
      
      const cluster = new THREE.Mesh(geometry, material);
      cluster.position.copy(position);
      
      // Add organic rotation and scaling
      cluster.rotation.set(
        (Math.random() - 0.5) * 0.4,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.4
      );
      
      const scale = this.calculateOrganicScale(species.growthPattern, i, clusterCount);
      cluster.scale.copy(scale);
      
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      
      bushGroup.add(cluster);
    }
    
    // Add transitional clusters for smooth blending
    this.addTransitionalClusters(bushGroup, species, height, width, baseMaterial, clusterCount);
  }

  private addTransitionalClusters(
    bushGroup: THREE.Group,
    species: BushSpecies,
    height: number,
    width: number,
    baseMaterial: THREE.MeshStandardMaterial,
    mainClusterCount: number
  ): void {
    const transitionCount = Math.floor(mainClusterCount * 0.6);
    
    for (let i = 0; i < transitionCount; i++) {
      const smallSize = (height + width) / 8 * (0.3 + Math.random() * 0.4);
      
      // Position between existing clusters for smooth transitions
      const angle = Math.random() * Math.PI * 2;
      const distance = width * (0.4 + Math.random() * 0.3);
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0.1 + Math.random() * height * 0.7,
        Math.sin(angle) * distance
      );
      
      const geometry = this.geometryGenerator.createFoliageCluster(smallSize, 0.6, 0.4);
      const material = this.materialGenerator.createVariationMaterial(baseMaterial, Math.random());
      material.opacity *= 0.7; // Make transitional clusters more transparent
      
      const cluster = new THREE.Mesh(geometry, material);
      cluster.position.copy(position);
      cluster.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      
      cluster.scale.setScalar(0.6 + Math.random() * 0.4);
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      
      bushGroup.add(cluster);
    }
  }

  private calculateOrganicClusterSize(
    species: BushSpecies,
    height: number,
    width: number,
    index: number,
    totalClusters: number
  ): number {
    const baseSize = (height + width) / 6 * species.foliageDensity;
    const sizeVariation = 0.5 + Math.random() * 0.8;
    
    // Make some clusters larger for natural variation
    const majorCluster = index < totalClusters * 0.4 ? 1.2 : 0.8;
    
    return baseSize * sizeVariation * majorCluster;
  }

  private calculateOrganicClusterPosition(
    pattern: GrowthPattern,
    height: number,
    width: number,
    index: number,
    totalClusters: number
  ): THREE.Vector3 {
    const angle = (index / totalClusters) * Math.PI * 2 + (Math.random() - 0.5) * 1.0;
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * width * 0.3,
      (Math.random() - 0.5) * height * 0.2,
      (Math.random() - 0.5) * width * 0.3
    );
    
    let basePosition: THREE.Vector3;
    
    switch (pattern) {
      case GrowthPattern.COMPACT_ROUND:
        const compactDistance = width * (0.05 + Math.random() * 0.25);
        basePosition = new THREE.Vector3(
          Math.cos(angle) * compactDistance,
          0.2 + Math.random() * height * 0.6,
          Math.sin(angle) * compactDistance
        );
        break;
        
      case GrowthPattern.SPRAWLING_WIDE:
        const sprawlDistance = width * (0.3 + Math.random() * 0.4);
        basePosition = new THREE.Vector3(
          Math.cos(angle) * sprawlDistance,
          0.1 + Math.random() * height * 0.3,
          Math.sin(angle) * sprawlDistance
        );
        break;
        
      case GrowthPattern.UPRIGHT_OVAL:
        const uprightDistance = width * (0.1 + Math.random() * 0.15);
        basePosition = new THREE.Vector3(
          Math.cos(angle) * uprightDistance,
          0.3 + (index / totalClusters) * height * 0.6 + Math.random() * 0.3,
          Math.sin(angle) * uprightDistance
        );
        break;
        
      case GrowthPattern.IRREGULAR_CLUMPING:
      default:
        const irregularDistance = width * (0.1 + Math.random() * 0.35);
        basePosition = new THREE.Vector3(
          Math.cos(angle) * irregularDistance,
          0.2 + Math.random() * height * 0.5,
          Math.sin(angle) * irregularDistance
        );
        break;
    }
    
    return basePosition.add(randomOffset);
  }

  private calculateOrganicScale(pattern: GrowthPattern, index: number, totalClusters: number): THREE.Vector3 {
    const baseScale = new THREE.Vector3(
      0.7 + Math.random() * 0.6,
      0.6 + Math.random() * 0.5,
      0.7 + Math.random() * 0.6
    );
    
    // Add natural asymmetry
    const asymmetry = 0.8 + Math.random() * 0.4;
    
    switch (pattern) {
      case GrowthPattern.COMPACT_ROUND:
        return baseScale.multiplyScalar(asymmetry);
        
      case GrowthPattern.SPRAWLING_WIDE:
        return new THREE.Vector3(
          baseScale.x * 1.4 * asymmetry,
          baseScale.y * 0.6,
          baseScale.z * 1.4 * asymmetry
        );
        
      case GrowthPattern.UPRIGHT_OVAL:
        return new THREE.Vector3(
          baseScale.x * 0.7,
          baseScale.y * 1.5 * asymmetry,
          baseScale.z * 0.7
        );
        
      case GrowthPattern.IRREGULAR_CLUMPING:
      default:
        return new THREE.Vector3(
          baseScale.x * (0.5 + Math.random() * 1.0),
          baseScale.y * (0.6 + Math.random() * 0.8),
          baseScale.z * (0.5 + Math.random() * 1.0)
        );
    }
  }

  private addOrganicBranches(bushGroup: THREE.Group, species: BushSpecies, height: number, width: number): void {
    const branchCount = 1 + Math.floor(Math.random() * 3);
    const branchMaterial = this.materialGenerator.createBranchMaterial(species);
    
    for (let i = 0; i < branchCount; i++) {
      const branchHeight = height * (0.4 + Math.random() * 0.5);
      const startRadius = Math.max(0.02, height * 0.015);
      const endRadius = startRadius * (0.3 + Math.random() * 0.4);
      
      const geometry = this.geometryGenerator.createBranchGeometry(
        startRadius,
        endRadius,
        branchHeight
      );
      
      const branch = new THREE.Mesh(geometry, branchMaterial.clone());
      
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.8;
      const distance = width * (0.1 + Math.random() * 0.2);
      
      branch.position.set(
        Math.cos(angle) * distance,
        branchHeight / 2,
        Math.sin(angle) * distance
      );
      
      // Add natural curvature
      branch.rotation.set(
        (Math.random() - 0.5) * 0.3,
        angle,
        (Math.random() - 0.5) * 0.4
      );
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      bushGroup.add(branch);
    }
  }

  private addOrganicBerries(bushGroup: THREE.Group, species: BushSpecies, width: number): void {
    const berryCount = species.type === BushType.BERRY_BUSH ? 
      4 + Math.floor(Math.random() * 6) : 
      2 + Math.floor(Math.random() * 4);
    
    for (let k = 0; k < berryCount; k++) {
      const berrySize = species.type === BushType.BERRY_BUSH ? 
        0.03 + Math.random() * 0.02 : 
        0.015 + Math.random() * 0.015;
      
      // Create slightly organic berry shape
      const geometry = this.geometryGenerator.createFoliageCluster(berrySize, 0.1, 0.2);
      
      const berry = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: this.getBerryColor(species.type),
          roughness: 0.2,
          metalness: 0.0,
          emissive: this.getBerryColor(species.type),
          emissiveIntensity: 0.05
        })
      );
      
      // Natural berry placement
      const angle = Math.random() * Math.PI * 2;
      const distance = width * (0.5 + Math.random() * 0.3);
      berry.position.set(
        Math.cos(angle) * distance + (Math.random() - 0.5) * 0.1,
        0.2 + Math.random() * 0.4,
        Math.sin(angle) * distance + (Math.random() - 0.5) * 0.1
      );
      
      bushGroup.add(berry);
    }
  }

  private addOrganicFlowers(bushGroup: THREE.Group, species: BushSpecies, width: number, height: number): void {
    const flowerCount = species.type === BushType.FLOWERING_BUSH ? 
      6 + Math.floor(Math.random() * 8) : 
      2 + Math.floor(Math.random() * 4);
    
    for (let k = 0; k < flowerCount; k++) {
      const flowerSize = 0.02 + Math.random() * 0.015;
      
      // Create small organic flower clusters
      const geometry = this.geometryGenerator.createFoliageCluster(flowerSize, 0.3, 0.4);
      
      const flower = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: this.getFlowerColor(species.type),
          roughness: 0.1,
          metalness: 0.0,
          emissive: this.getFlowerColor(species.type),
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.9
        })
      );
      
      // Natural flower distribution
      const angle = Math.random() * Math.PI * 2;
      const distance = width * (0.6 + Math.random() * 0.2);
      flower.position.set(
        Math.cos(angle) * distance,
        height * (0.3 + Math.random() * 0.5),
        Math.sin(angle) * distance
      );
      
      bushGroup.add(flower);
    }
  }

  private getBerryColor(bushType: BushType): number {
    switch (bushType) {
      case BushType.BERRY_BUSH:
        return Math.random() < 0.6 ? 0xFF4444 : 0x4444FF;
      case BushType.WILD_BRAMBLE:
        return Math.random() < 0.8 ? 0x330033 : 0xFF6B6B;
      default:
        return Math.random() < 0.5 ? 0xFF6B6B : 0x4ECDC4;
    }
  }

  private getFlowerColor(bushType: BushType): number {
    switch (bushType) {
      case BushType.FLOWERING_BUSH:
        const colors = [0xFF69B4, 0xFFD700, 0xFF6347, 0x9370DB, 0xFF1493];
        return colors[Math.floor(Math.random() * colors.length)];
      case BushType.WILD_BRAMBLE:
        return Math.random() < 0.7 ? 0xFFFFFF : 0xFFF8DC;
      default:
        return Math.random() < 0.5 ? 0xFFFFFF : 0xFFD700;
    }
  }

  private selectRandomSpecies(): BushSpecies {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const [bushType, weight] of this.speciesWeights.entries()) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        return BUSH_SPECIES.find(s => s.type === bushType) || BUSH_SPECIES[0];
      }
    }
    
    return BUSH_SPECIES[0];
  }

  public getBushModels(): THREE.Object3D[] {
    const allModels: THREE.Object3D[] = [];
    for (const models of this.bushModels.values()) {
      allModels.push(...models);
    }
    return allModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    const species = this.selectRandomSpecies();
    const variations = this.bushModels.get(species.type);
    
    if (!variations || variations.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * variations.length);
    const model = variations[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    
    const scaleVariation = species.type === BushType.TALL_SHRUB ? 
      0.9 + Math.random() * 0.2 :
      0.8 + Math.random() * 0.4;
    
    model.scale.set(scaleVariation, scaleVariation, scaleVariation);
    model.position.copy(position);
    
    logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, `Created organic ${species.type} bush`);
    
    return model;
  }

  public dispose(): void {
    for (const [bushType, models] of this.bushModels.entries()) {
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
    }
    this.bushModels.clear();
    this.speciesWeights.clear();
    
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, '🌿 Organic bush system disposed');
  }
}
