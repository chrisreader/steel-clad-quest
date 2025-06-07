
import * as THREE from 'three';
import { BUSH_CONFIG, BUSH_SPECIES, BushSpecies, BushType, GrowthPattern } from './VegetationConfig';
import { logger } from '../../core/Logger';
import { LOGGING_CONSTANTS } from '../../core/GameConstants';

export class BushGenerator {
  private bushModels: Map<BushType, THREE.Object3D[]> = new Map();
  private speciesWeights: Map<BushType, number> = new Map();

  constructor() {
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
      
      // Create 3-4 variations per species
      for (let i = 0; i < 4; i++) {
        const bushGroup = this.createBushVariation(species, i);
        variations.push(bushGroup);
      }
      
      this.bushModels.set(species.type, variations);
      logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, `Created ${variations.length} variations for ${species.type}`);
    }
    
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, `🌿 Enhanced bush system initialized with ${BUSH_SPECIES.length} species`);
  }

  private createBushVariation(species: BushSpecies, variationIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    // Generate realistic size based on species
    const height = species.heightRange[0] + Math.random() * (species.heightRange[1] - species.heightRange[0]);
    const width = species.widthRange[0] + Math.random() * (species.widthRange[1] - species.widthRange[0]);
    
    // Adjust cluster count based on bush size and species
    const baseClusterCount = species.clusterCountRange[0] + 
      Math.floor(Math.random() * (species.clusterCountRange[1] - species.clusterCountRange[0] + 1));
    
    // Create material with species-appropriate properties
    const bushMaterial = this.createSpeciesMaterial(species, variationIndex);
    
    // Generate clusters based on growth pattern
    this.createClustersForPattern(bushGroup, species, height, width, baseClusterCount, bushMaterial);
    
    // Add stems based on species characteristics
    if (Math.random() < species.stemChance) {
      this.addRealisticStem(bushGroup, species, height);
    }
    
    // Add berries with higher probability for berry bushes
    if (Math.random() < species.berryChance) {
      this.addBerries(bushGroup, species, width);
    }
    
    // Add flowers for flowering species
    if (Math.random() < species.flowerChance) {
      this.addFlowers(bushGroup, species, width);
    }
    
    return bushGroup;
  }

  private createSpeciesMaterial(species: BushSpecies, variationIndex: number): THREE.MeshStandardMaterial {
    const colorIndex = variationIndex % species.colors.length;
    const baseColor = species.colors[colorIndex].clone();
    
    // Add slight color variation
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.h += (Math.random() - 0.5) * 0.02; // Slight hue variation
    hsl.s += (Math.random() - 0.5) * 0.1;  // Saturation variation
    hsl.l += (Math.random() - 0.5) * 0.1;  // Lightness variation
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.9 - (species.foliageDensity * 0.1),
      metalness: 0.0,
      transparent: true,
      opacity: 0.92 + (species.foliageDensity * 0.08)
    });
  }

  private createClustersForPattern(
    bushGroup: THREE.Group, 
    species: BushSpecies, 
    height: number, 
    width: number, 
    clusterCount: number, 
    material: THREE.MeshStandardMaterial
  ): void {
    for (let i = 0; i < clusterCount; i++) {
      const cluster = this.createCluster(species, height, width, i, clusterCount, material);
      bushGroup.add(cluster);
    }
  }

  private createCluster(
    species: BushSpecies, 
    height: number, 
    width: number, 
    index: number, 
    totalClusters: number, 
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    // Calculate cluster size based on species foliage density
    const baseClusterSize = (height + width) / 4 * species.foliageDensity;
    const clusterSize = baseClusterSize * (0.6 + Math.random() * 0.6);
    
    // Create cluster geometry with appropriate complexity
    const geometry = new THREE.SphereGeometry(
      clusterSize, 
      Math.max(6, Math.min(12, Math.floor(species.foliageDensity * 10))), 
      Math.max(4, Math.min(8, Math.floor(species.foliageDensity * 8)))
    );
    
    const cluster = new THREE.Mesh(geometry, material.clone());
    
    // Position clusters according to growth pattern
    const position = this.calculateClusterPosition(species.growthPattern, height, width, index, totalClusters);
    cluster.position.copy(position);
    
    // Deform clusters for organic look based on growth pattern
    const scale = this.calculateClusterScale(species.growthPattern, height, width);
    cluster.scale.copy(scale);
    
    cluster.castShadow = true;
    cluster.receiveShadow = true;
    
    return cluster;
  }

  private calculateClusterPosition(
    pattern: GrowthPattern, 
    height: number, 
    width: number, 
    index: number, 
    totalClusters: number
  ): THREE.Vector3 {
    const angle = (index / totalClusters) * Math.PI * 2 + Math.random() * 0.5;
    
    switch (pattern) {
      case GrowthPattern.COMPACT_ROUND:
        const compactDistance = width * (0.1 + Math.random() * 0.3);
        return new THREE.Vector3(
          Math.cos(angle) * compactDistance,
          0.2 + Math.random() * height * 0.8,
          Math.sin(angle) * compactDistance
        );
        
      case GrowthPattern.SPRAWLING_WIDE:
        const sprawlDistance = width * (0.3 + Math.random() * 0.4);
        return new THREE.Vector3(
          Math.cos(angle) * sprawlDistance,
          0.1 + Math.random() * height * 0.4,
          Math.sin(angle) * sprawlDistance
        );
        
      case GrowthPattern.UPRIGHT_OVAL:
        const uprightDistance = width * (0.1 + Math.random() * 0.2);
        return new THREE.Vector3(
          Math.cos(angle) * uprightDistance,
          0.3 + (index / totalClusters) * height * 0.7 + Math.random() * 0.2,
          Math.sin(angle) * uprightDistance
        );
        
      case GrowthPattern.IRREGULAR_CLUMPING:
      default:
        const irregularDistance = width * (0.2 + Math.random() * 0.3);
        return new THREE.Vector3(
          Math.cos(angle) * irregularDistance + (Math.random() - 0.5) * width * 0.2,
          0.2 + Math.random() * height * 0.6,
          Math.sin(angle) * irregularDistance + (Math.random() - 0.5) * width * 0.2
        );
    }
  }

  private calculateClusterScale(pattern: GrowthPattern, height: number, width: number): THREE.Vector3 {
    const baseScale = new THREE.Vector3(
      0.8 + Math.random() * 0.4,
      0.6 + Math.random() * 0.3,
      0.8 + Math.random() * 0.4
    );
    
    switch (pattern) {
      case GrowthPattern.COMPACT_ROUND:
        return baseScale;
        
      case GrowthPattern.SPRAWLING_WIDE:
        return new THREE.Vector3(
          baseScale.x * 1.3,
          baseScale.y * 0.7,
          baseScale.z * 1.3
        );
        
      case GrowthPattern.UPRIGHT_OVAL:
        return new THREE.Vector3(
          baseScale.x * 0.8,
          baseScale.y * 1.4,
          baseScale.z * 0.8
        );
        
      case GrowthPattern.IRREGULAR_CLUMPING:
      default:
        return new THREE.Vector3(
          baseScale.x * (0.6 + Math.random() * 0.8),
          baseScale.y * (0.7 + Math.random() * 0.6),
          baseScale.z * (0.6 + Math.random() * 0.8)
        );
    }
  }

  private addRealisticStem(bushGroup: THREE.Group, species: BushSpecies, height: number): void {
    const stemHeight = height * (0.6 + Math.random() * 0.3);
    const stemRadius = Math.max(0.02, height * 0.025);
    
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(stemRadius * 0.7, stemRadius, stemHeight, 6),
      new THREE.MeshStandardMaterial({
        color: species.type === BushType.EVERGREEN_SHRUB ? 0x3A2A1A : 0x4A4A2A,
        roughness: 0.95,
        metalness: 0.0
      })
    );
    
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
    
    // Add multiple smaller branches for larger bushes
    if (height > 1.5 && Math.random() < 0.7) {
      this.addBranches(bushGroup, species, height, stemRadius);
    }
  }

  private addBranches(bushGroup: THREE.Group, species: BushSpecies, height: number, baseRadius: number): void {
    const branchCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
      const branchHeight = height * (0.3 + Math.random() * 0.4);
      const branchRadius = baseRadius * (0.5 + Math.random() * 0.3);
      
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(branchRadius * 0.5, branchRadius, branchHeight, 4),
        new THREE.MeshStandardMaterial({
          color: 0x4A4A2A,
          roughness: 0.95,
          metalness: 0.0
        })
      );
      
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = height * 0.1;
      
      branch.position.set(
        Math.cos(angle) * distance,
        height * (0.4 + Math.random() * 0.3),
        Math.sin(angle) * distance
      );
      
      branch.rotation.z = (Math.random() - 0.5) * 0.4;
      branch.castShadow = true;
      branch.receiveShadow = true;
      bushGroup.add(branch);
    }
  }

  private addBerries(bushGroup: THREE.Group, species: BushSpecies, width: number): void {
    const berryCount = species.type === BushType.BERRY_BUSH ? 
      6 + Math.floor(Math.random() * 8) : 
      3 + Math.floor(Math.random() * 5);
    
    for (let k = 0; k < berryCount; k++) {
      const berrySize = species.type === BushType.BERRY_BUSH ? 
        0.04 + Math.random() * 0.03 : 
        0.02 + Math.random() * 0.02;
      
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(berrySize, 4, 3),
        new THREE.MeshStandardMaterial({
          color: this.getBerryColor(species.type),
          roughness: 0.3,
          metalness: 0.0
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = width * (0.6 + Math.random() * 0.3);
      berry.position.set(
        Math.cos(angle) * distance,
        0.3 + Math.random() * 0.4,
        Math.sin(angle) * distance
      );
      
      bushGroup.add(berry);
    }
  }

  private addFlowers(bushGroup: THREE.Group, species: BushSpecies, width: number): void {
    const flowerCount = species.type === BushType.FLOWERING_BUSH ? 
      8 + Math.floor(Math.random() * 12) : 
      3 + Math.floor(Math.random() * 6);
    
    for (let k = 0; k < flowerCount; k++) {
      const flowerSize = 0.03 + Math.random() * 0.02;
      
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(flowerSize, 5, 4),
        new THREE.MeshStandardMaterial({
          color: this.getFlowerColor(species.type),
          roughness: 0.2,
          metalness: 0.0,
          emissive: this.getFlowerColor(species.type),
          emissiveIntensity: 0.1
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = width * (0.7 + Math.random() * 0.2);
      flower.position.set(
        Math.cos(angle) * distance,
        0.4 + Math.random() * 0.5,
        Math.sin(angle) * distance
      );
      
      bushGroup.add(flower);
    }
  }

  private getBerryColor(bushType: BushType): number {
    switch (bushType) {
      case BushType.BERRY_BUSH:
        return Math.random() < 0.6 ? 0xFF4444 : 0x4444FF; // Red or blue berries
      case BushType.WILD_BRAMBLE:
        return Math.random() < 0.8 ? 0x330033 : 0xFF6B6B; // Dark purple or red
      default:
        return Math.random() < 0.5 ? 0xFF6B6B : 0x4ECDC4; // Red or teal
    }
  }

  private getFlowerColor(bushType: BushType): number {
    switch (bushType) {
      case BushType.FLOWERING_BUSH:
        const colors = [0xFF69B4, 0xFFD700, 0xFF6347, 0x9370DB, 0xFF1493];
        return colors[Math.floor(Math.random() * colors.length)];
      case BushType.WILD_BRAMBLE:
        return Math.random() < 0.7 ? 0xFFFFFF : 0xFFF8DC; // White or cream
      default:
        return Math.random() < 0.5 ? 0xFFFFFF : 0xFFD700; // White or yellow
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
    
    return BUSH_SPECIES[0]; // Fallback
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
    
    // Add realistic rotation and scale variation
    model.rotation.y = Math.random() * Math.PI * 2;
    
    // Species-appropriate scale variation
    const scaleVariation = species.type === BushType.TALL_SHRUB ? 
      0.9 + Math.random() * 0.2 :   // Less variation for tall shrubs
      0.8 + Math.random() * 0.4;    // More variation for smaller bushes
    
    model.scale.set(scaleVariation, scaleVariation, scaleVariation);
    model.position.copy(position);
    
    logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, `Created ${species.type} bush at height ${species.heightRange[1] * scaleVariation}m`);
    
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
    
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, '🌿 Enhanced bush system disposed');
  }
}
