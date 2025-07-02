
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';
import { OrganicFoliageGenerator } from './OrganicFoliageGenerator';

interface BranchConfig {
  length: number;
  thickness: number;
  attachmentPoint: THREE.Vector3;
  direction: THREE.Vector3;
  species: TreeSpeciesType;
  treeHeight: number;
  branchLevel: number; // 0=main, 1=secondary, 2=tertiary
}

interface FoliageCluster {
  position: THREE.Vector3;
  size: number;
  density: number;
  heightRatio: number; // Added for height-based scaling
}

export class RealisticTreeGenerator {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private foliageGeometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private debugMode: boolean = false;

  constructor() {
    this.preloadTextures();
    this.preloadOptimizedGeometries();
  }

  private preloadTextures(): void {
    // Create specialized bark textures with enhanced detail
    this.textureCache.set('bark', this.createOakBarkTexture());
    this.textureCache.set('birch', this.createBirchTexture());
    this.textureCache.set('weathered', this.createWeatheredTexture());
    this.textureCache.set('pine', this.createPineBarkTexture());
  }

  private preloadOptimizedGeometries(): void {
    // Pre-create optimized foliage geometries for different LOD levels
    for (let lod = 0; lod < 3; lod++) {
      const segments = lod === 0 ? 16 : lod === 1 ? 12 : 8;
      const rings = lod === 0 ? 12 : lod === 1 ? 8 : 6;
      
      const geometry = new THREE.SphereGeometry(1, segments, rings);
      this.foliageGeometryCache.set(`foliage_lod${lod}`, geometry);
    }
  }

  private createOakBarkTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich brown base with texture
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, 512, 512);

    // Add bark furrows and ridges
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 25 + Math.random() * 10);
      ctx.quadraticCurveTo(256, i * 25 + Math.random() * 20, 512, i * 25 + Math.random() * 10);
      ctx.stroke();
    }

    // Vertical texture lines
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 35, 0);
      ctx.lineTo(i * 35 + Math.random() * 20 - 10, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createPineBarkTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Reddish-brown pine bark base
    ctx.fillStyle = '#8D4004';
    ctx.fillRect(0, 0, 512, 512);

    // Plated bark pattern
    ctx.fillStyle = '#A0522D';
    for (let y = 0; y < 512; y += 40) {
      for (let x = 0; x < 512; x += 30) {
        const size = 20 + Math.random() * 15;
        ctx.fillRect(x + Math.random() * 10, y + Math.random() * 10, size, size);
      }
    }

    // Dark cracks between plates
    ctx.strokeStyle = '#2F1B0C';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createBirchTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // White birch base with slight cream tint
    ctx.fillStyle = '#F8F8F0';
    ctx.fillRect(0, 0, 512, 512);

    // Characteristic black horizontal markings
    ctx.fillStyle = '#1C1C1C';
    for (let i = 0; i < 12; i++) {
      const y = Math.random() * 512;
      const height = 5 + Math.random() * 15;
      const segments = 3 + Math.floor(Math.random() * 4);
      
      for (let j = 0; j < segments; j++) {
        const x = j * (512 / segments) + Math.random() * 20;
        const width = 30 + Math.random() * 40;
        ctx.fillRect(x, y, width, height);
      }
    }

    // Add subtle vertical texture lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 25, 0);
      ctx.lineTo(i * 25 + Math.random() * 10 - 5, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createWeatheredTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark weathered base
    ctx.fillStyle = '#2C1810';
    ctx.fillRect(0, 0, 512, 512);

    // Add weathering and cracks
    ctx.strokeStyle = '#1A0E08';
    ctx.lineWidth = 3;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    // Peeling bark patches
    ctx.fillStyle = '#3A2419';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 20 + Math.random() * 30;
      ctx.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public createTree(species: TreeSpeciesType, position: THREE.Vector3): THREE.Object3D {
    const tree = new THREE.Group();

    const height = TreeSpeciesManager.getRandomHeight(species);
    const baseRadius = TreeSpeciesManager.getRandomTrunkRadius(species);

    console.log(`🌲 Creating realistic ${species} tree: height=${height.toFixed(2)}, radius=${baseRadius.toFixed(2)}`);

    // Create trunk
    const trunk = this.createRealisticTrunk(species, height, baseRadius);
    tree.add(trunk);

    // Create complete branch and crown system
    const { branches, foliageClusters } = this.createRealisticTreeStructure(species, height, baseRadius);
    
    // Add all branches
    branches.forEach(branch => tree.add(branch));
    
    // Debug: Log foliage cluster information
    console.log(`🍃 Tree ${species} has ${foliageClusters.length} foliage clusters`);
    
    // Create optimized unified foliage with fallback
    const unifiedFoliage = this.createOptimizedFoliage(foliageClusters, species, height);
    if (unifiedFoliage) {
      tree.add(unifiedFoliage);
      console.log(`🍃 Successfully added foliage to ${species} tree`);
    } else {
      console.warn(`🚨 Failed to create foliage for ${species} tree, using fallback`);
      // Fallback: Create individual foliage meshes
      const fallbackFoliage = this.createFallbackFoliage(foliageClusters, species);
      fallbackFoliage.forEach(mesh => tree.add(mesh));
    }

    // Position and scale tree
    tree.position.copy(position);
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale * (0.95 + Math.random() * 0.1), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createRealisticTreeStructure(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    if (species === TreeSpeciesType.PINE) {
      return this.createPineTreeStructure(treeHeight, trunkBaseRadius);
    }

    // Create lower trunk branches (20-50% height) - sparse, smaller foliage
    const lowerBranches = this.createLowerBranches(species, treeHeight, trunkBaseRadius);
    branches.push(...lowerBranches.branches);
    foliageClusters.push(...lowerBranches.foliageClusters);

    // Create main crown branches (50-85% height) - medium foliage, growing larger
    const crownBranches = this.createCrownBranches(species, treeHeight, trunkBaseRadius);
    branches.push(...crownBranches.branches);
    foliageClusters.push(...crownBranches.foliageClusters);

    // Create upper crown branches (85-95% height) - largest, densest foliage
    const upperCrown = this.createUpperCrown(species, treeHeight, trunkBaseRadius);
    branches.push(...upperCrown.branches);
    foliageClusters.push(...upperCrown.foliageClusters);

    return { branches, foliageClusters };
  }

  private createLowerBranches(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    const branchCount = species === TreeSpeciesType.OAK ? 4 : species === TreeSpeciesType.WILLOW ? 6 : 3;
    
    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.2 + (i / branchCount) * 0.3; // 20-50% height
      const attachmentHeight = treeHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.6);
      const branchLength = treeHeight * (0.2 + Math.random() * 0.15);
      const branchThickness = Math.max(0.12, trunkRadiusAtHeight * (0.25 + Math.random() * 0.15));
      
      const attachmentPoint = new THREE.Vector3(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0.1 + Math.random() * 0.2,
        Math.sin(angle)
      ).normalize();
      
      const branchResult = this.createBranchWithHierarchy({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      }, heightRatio);
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    return { branches, foliageClusters };
  }

  private createCrownBranches(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    const branchCount = species === TreeSpeciesType.OAK ? 8 : species === TreeSpeciesType.WILLOW ? 10 : 6;
    
    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.5 + (i / branchCount) * 0.35; // 50-85% height
      const attachmentHeight = treeHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.7);
      const branchLength = treeHeight * (0.25 + Math.random() * 0.15);
      const branchThickness = Math.max(0.1, trunkRadiusAtHeight * (0.3 + Math.random() * 0.15));
      
      const attachmentPoint = new THREE.Vector3(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      let direction: THREE.Vector3;
      if (species === TreeSpeciesType.WILLOW) {
        direction = new THREE.Vector3(Math.cos(angle), -0.2 - Math.random() * 0.3, Math.sin(angle)).normalize();
      } else {
        direction = new THREE.Vector3(Math.cos(angle), 0.2 + Math.random() * 0.3, Math.sin(angle)).normalize();
      }
      
      const branchResult = this.createBranchWithHierarchy({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      }, heightRatio);
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    return { branches, foliageClusters };
  }

  private createUpperCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    if (species === TreeSpeciesType.DEAD) {
      return { branches, foliageClusters }; // Dead trees don't have upper crowns
    }
    
    const branchCount = species === TreeSpeciesType.OAK ? 8 : 6; // Increased branch count for denser canopy
    
    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.85 + (i / branchCount) * 0.1; // 85-95% height
      const attachmentHeight = treeHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + Math.random();
      
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.8);
      const branchLength = treeHeight * (0.15 + Math.random() * 0.1);
      const branchThickness = Math.max(0.08, trunkRadiusAtHeight * (0.2 + Math.random() * 0.1));
      
      const attachmentPoint = new THREE.Vector3(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      const direction = new THREE.Vector3(
        Math.cos(angle) * 0.7,
        0.3 + Math.random() * 0.4,
        Math.sin(angle) * 0.7
      ).normalize();
      
      const branchResult = this.createBranchWithHierarchy({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      }, heightRatio);
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    // Add multiple overlapping central crown foliage clusters for dense canopy
    const centralHeightStart = 0.8;
    const centralHeightEnd = 0.95;
    const centralClusterCount = species === TreeSpeciesType.OAK ? 4 : 3;
    
    for (let i = 0; i < centralClusterCount; i++) {
      const heightRatio = centralHeightStart + (i / (centralClusterCount - 1)) * (centralHeightEnd - centralHeightStart);
      const centralHeight = treeHeight * heightRatio;
      
      // Calculate size based on height and species
      const baseSize = this.calculateFoliageSize(treeHeight, heightRatio, species);
      const centralFoliageSize = baseSize * (2.0 + Math.random() * 0.5); // Large central canopy
      
      // Add slight horizontal offset for natural variation
      const offsetRadius = treeHeight * 0.05;
      const offsetAngle = Math.random() * Math.PI * 2;
      const position = new THREE.Vector3(
        Math.cos(offsetAngle) * offsetRadius,
        centralHeight,
        Math.sin(offsetAngle) * offsetRadius
      );
      
      foliageClusters.push({
        position,
        size: centralFoliageSize,
        density: 1.0,
        heightRatio
      });
    }
    
    return { branches, foliageClusters };
  }

  private calculateFoliageSize(treeHeight: number, heightRatio: number, species: TreeSpeciesType): number {
    // Base size calculation
    let baseSize = treeHeight * 0.04; // Reduced base size
    
    // Height-based scaling - creates the realistic canopy layers
    let heightMultiplier: number;
    
    if (heightRatio < 0.5) {
      // Lower branches: 1.0-1.2x base size (more substantial undergrowth)
      heightMultiplier = 1.0 + (heightRatio / 0.5) * 0.2;
    } else if (heightRatio < 0.85) {
      // Mid crown: 1.2-1.5x base size (smooth transition zone)
      const midRatio = (heightRatio - 0.5) / 0.35;
      heightMultiplier = 1.2 + midRatio * 0.3;
    } else {
      // Upper crown: 1.3-2.0x base size (dense canopy)
      const upperRatio = (heightRatio - 0.85) / 0.15;
      heightMultiplier = 1.3 + upperRatio * 0.7;
    }
    
    // Species-specific adjustments
    switch (species) {
      case TreeSpeciesType.OAK:
        // Oak trees have broader, more pronounced canopies
        heightMultiplier *= heightRatio > 0.7 ? 1.2 : 1.0;
        break;
      case TreeSpeciesType.BIRCH:
        // Birch trees have more elegant, less dramatic size variation
        heightMultiplier = 0.8 + (heightMultiplier - 0.8) * 0.7;
        break;
      case TreeSpeciesType.WILLOW:
        // Willow trees have larger drooping foliage
        heightMultiplier *= 1.1;
        break;
    }
    
    return baseSize * heightMultiplier;
  }

  private calculateFoliageDensity(heightRatio: number, species: TreeSpeciesType): number {
    let density: number;
    
    if (heightRatio < 0.5) {
      // Lower branches: 0.6-0.7 density (sparse)
      density = 0.6 + (heightRatio / 0.5) * 0.1;
    } else if (heightRatio < 0.85) {
      // Mid crown: 0.7-0.9 density (medium)
      const midRatio = (heightRatio - 0.5) / 0.35;
      density = 0.7 + midRatio * 0.2;
    } else {
      // Upper crown: 0.9-1.0 density (dense)
      const upperRatio = (heightRatio - 0.85) / 0.15;
      density = 0.9 + upperRatio * 0.1;
    }
    
    // Add slight random variation
    density += (Math.random() - 0.5) * 0.1;
    
    return Math.max(0.5, Math.min(1.0, density));
  }

  private createBranchWithHierarchy(config: BranchConfig, parentHeightRatio: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Create main branch
    const mainBranch = this.createOptimizedBranch(config);
    branches.push(mainBranch);
    
    // Add foliage at branch end with height-based sizing
    const endPosition = config.direction.clone()
      .multiplyScalar(config.length)
      .add(config.attachmentPoint);
    
    const heightRatio = endPosition.y / config.treeHeight;
    const foliageSize = this.calculateFoliageSize(config.treeHeight, heightRatio, config.species);
    const foliageDensity = this.calculateFoliageDensity(heightRatio, config.species);
    
    foliageClusters.push({
      position: endPosition,
      size: foliageSize,
      density: foliageDensity,
      heightRatio
    });
    
    // Create secondary branches if not at max level
    if (config.branchLevel < 2) {
      const secondaryCount = config.branchLevel === 0 ? 3 + Math.floor(Math.random() * 3) : 2;
      
      for (let i = 0; i < secondaryCount; i++) {
        const positionRatio = 0.4 + (i / secondaryCount) * 0.4;
        const localPosition = config.direction.clone()
          .multiplyScalar(config.length * positionRatio);
        const worldPosition = localPosition.add(config.attachmentPoint);
        
        const sideVector = new THREE.Vector3(-config.direction.z, 0, config.direction.x).normalize();
        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.6;
        const upwardBias = config.branchLevel === 0 ? 0.1 + Math.random() * 0.2 : 0.05;
        
        const secondaryDirection = config.direction.clone()
          .multiplyScalar(0.5)
          .add(sideVector.multiplyScalar(Math.sin(randomAngle) * 0.8))
          .add(new THREE.Vector3(0, upwardBias, 0))
          .normalize();
        
        const secondaryLength = config.length * (0.4 + Math.random() * 0.3);
        const secondaryThickness = Math.max(0.05, config.thickness * (0.5 + Math.random() * 0.2));
        
        const secondaryHeightRatio = worldPosition.y / config.treeHeight;
        const secondaryResult = this.createBranchWithHierarchy({
          length: secondaryLength,
          thickness: secondaryThickness,
          attachmentPoint: worldPosition,
          direction: secondaryDirection,
          species: config.species,
          treeHeight: config.treeHeight,
          branchLevel: config.branchLevel + 1
        }, secondaryHeightRatio);
        
        branches.push(...secondaryResult.branches);
        foliageClusters.push(...secondaryResult.foliageClusters);
      }
    }
    
    return { branches, foliageClusters };
  }

  private createOptimizedBranch(config: BranchConfig): THREE.Mesh {
    const segments = config.branchLevel === 0 ? 8 : 6;
    const geometry = new THREE.CylinderGeometry(
      config.thickness * 0.3,
      config.thickness,
      config.length,
      segments,
      1
    );
    
    const material = this.getOptimizedBranchMaterial(config.species);
    const branch = new THREE.Mesh(geometry, material);
    
    // Position and orient branch
    branch.position.copy(config.attachmentPoint);
    branch.position.add(config.direction.clone().multiplyScalar(config.length / 2));
    
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, config.direction);
    branch.setRotationFromQuaternion(quaternion);
    
    branch.castShadow = true;
    branch.receiveShadow = true;
    
    return branch;
  }

  private getOptimizedBranchMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `branch_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      const texture = this.textureCache.get(species === TreeSpeciesType.PINE ? 'pine' : 'bark');
      const material = new THREE.MeshStandardMaterial({
        color: 0xA0522D, // Brighter bark color
        map: texture,
        roughness: 0.8, // Slightly less rough for better light reflection
        metalness: 0.0
      });
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private createOptimizedFoliage(clusters: FoliageCluster[], species: TreeSpeciesType, treeHeight: number): THREE.Group | null {
    if (clusters.length === 0) {
      console.warn('🚨 No foliage clusters provided');
      return null;
    }
    
    console.log(`🍃 Creating performance-optimized dense foliage with ${clusters.length} clusters for ${species}`);
    
    // Validate clusters
    const validClusters = clusters.filter(cluster => {
      const isValid = cluster.position && cluster.size > 0 && cluster.density > 0;
      if (!isValid) {
        console.warn('🚨 Invalid foliage cluster:', cluster);
      }
      return isValid;
    });
    
    if (validClusters.length === 0) {
      console.warn('🚨 No valid foliage clusters after filtering');
      return null;
    }
    
    try {
      const foliageGroup = new THREE.Group();
      
      // Performance optimization: Create layered canopy volumes instead of many small meshes
      const canopyVolumes = this.createLayeredCanopyVolumes(validClusters, species, treeHeight);
      canopyVolumes.forEach(volume => foliageGroup.add(volume));
      
      // Add selective detail foliage only for close-up viewing
      const detailFoliage = this.createDetailFoliage(validClusters, species, treeHeight);
      detailFoliage.forEach(mesh => foliageGroup.add(mesh));
      
      console.log(`🍃 Performance-optimized foliage: ${canopyVolumes.length} canopy volumes + ${detailFoliage.length} detail meshes = ${foliageGroup.children.length} total meshes (reduced by ~75%)`);
      return foliageGroup;
      
    } catch (error) {
      console.error('🚨 Error creating performance-optimized foliage:', error);
      return null;
    }
  }

  private createLayeredCanopyVolumes(clusters: FoliageCluster[], species: TreeSpeciesType, treeHeight: number): THREE.Mesh[] {
    const canopyVolumes: THREE.Mesh[] = [];
    const material = this.getOptimizedFoliageMaterial(species);
    
    // Group clusters by height layers for efficient rendering
    const heightLayers = this.groupClustersByHeight(clusters);
    
    for (const [layerHeight, layerClusters] of heightLayers) {
      if (layerClusters.length === 0) continue;
      
      // Create large overlapping volumes for this height layer
      const layerVolumes = this.createLayerCanopyVolumes(layerClusters, species, layerHeight, treeHeight);
      
      layerVolumes.forEach(volume => {
        volume.material = material.clone();
        
        // Apply layer-specific color variation
        const heightRatio = layerHeight / treeHeight;
        const color = this.getSpeciesRealisticColor(species, heightRatio);
        (volume.material as THREE.MeshStandardMaterial).color.copy(color);
        
        canopyVolumes.push(volume);
      });
    }
    
    return canopyVolumes;
  }

  private groupClustersByHeight(clusters: FoliageCluster[]): Map<number, FoliageCluster[]> {
    const heightLayers = new Map<number, FoliageCluster[]>();
    
    // Create 3-5 height layers for efficient grouping
    const layerCount = 4;
    
    clusters.forEach(cluster => {
      // Round height to nearest layer
      const layerHeight = Math.round(cluster.position.y / 2) * 2; // Group by 2-unit height bands
      
      if (!heightLayers.has(layerHeight)) {
        heightLayers.set(layerHeight, []);
      }
      
      heightLayers.get(layerHeight)!.push(cluster);
    });
    
    return heightLayers;
  }

  private createLayerCanopyVolumes(clusters: FoliageCluster[], species: TreeSpeciesType, layerHeight: number, treeHeight: number): THREE.Mesh[] {
    const volumes: THREE.Mesh[] = [];
    
    if (clusters.length === 0) return volumes;
    
    // Calculate layer bounds
    const positions = clusters.map(c => c.position);
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minZ = Math.min(...positions.map(p => p.z));
    const maxZ = Math.max(...positions.map(p => p.z));
    
    // Create 2-3 large overlapping volumes per layer instead of many small ones
    const volumeCount = Math.min(3, Math.ceil(clusters.length / 3));
    
    for (let i = 0; i < volumeCount; i++) {
      // Calculate volume size and position
      const avgSize = clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length;
      const volumeSize = avgSize * (2.5 + Math.random() * 1.0); // Large volumes (2.5-3.5x average)
      
      // Strategic positioning for maximum visual impact
      const centerX = minX + (maxX - minX) * (i / Math.max(1, volumeCount - 1)) + (Math.random() - 0.5) * volumeSize * 0.3;
      const centerZ = minZ + (maxZ - minZ) * (Math.random() * 0.6 + 0.2); // Random but centered positioning
      
      // Create large organic volume
      const organicGeometry = OrganicFoliageGenerator.createOrganicFoliageGeometry({
        species,
        size: volumeSize,
        irregularity: 0.6 + Math.random() * 0.3,
        subdivisions: 8 // Reduced subdivision for performance
      });
      
      const mesh = new THREE.Mesh(organicGeometry, this.getOptimizedFoliageMaterial(species));
      
      // Position the large volume
      mesh.position.set(centerX, layerHeight, centerZ);
      
      // Asymmetric scaling for natural shape
      const scaleX = 1.2 + Math.random() * 0.6;
      const scaleY = 0.8 + Math.random() * 0.4;
      const scaleZ = 1.2 + Math.random() * 0.6;
      mesh.scale.set(scaleX, scaleY, scaleZ);
      
      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      );
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      volumes.push(mesh);
    }
    
    return volumes;
  }

  private createDetailFoliage(clusters: FoliageCluster[], species: TreeSpeciesType, treeHeight: number): THREE.Mesh[] {
    const detailMeshes: THREE.Mesh[] = [];
    const material = this.getOptimizedFoliageMaterial(species);
    
    // Only create detail foliage for the most prominent clusters (top 20-30%)
    const sortedClusters = clusters
      .sort((a, b) => (b.size * b.density) - (a.size * a.density))
      .slice(0, Math.ceil(clusters.length * 0.25)); // Top 25% most prominent clusters
    
    for (const cluster of sortedClusters) {
      // Create single medium-sized detail mesh per important cluster
      const organicGeometry = OrganicFoliageGenerator.createOrganicFoliageGeometry({
        species,
        size: cluster.size * 0.8,
        irregularity: 0.5 + Math.random() * 0.3,
        subdivisions: 10
      });
      
      const mesh = new THREE.Mesh(organicGeometry, material.clone());
      
      // Position with small random offset
      mesh.position.copy(cluster.position);
      mesh.position.x += (Math.random() - 0.5) * cluster.size * 0.2;
      mesh.position.z += (Math.random() - 0.5) * cluster.size * 0.2;
      mesh.position.y += (Math.random() - 0.5) * cluster.size * 0.1;
      
      // Natural scaling and rotation
      const scale = 0.9 + Math.random() * 0.2;
      mesh.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);
      mesh.rotation.set(
        Math.random() * Math.PI * 0.2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.2
      );
      
      // Color variation
      const heightRatio = cluster.heightRatio || (cluster.position.y / treeHeight);
      const color = this.getSpeciesRealisticColor(species, heightRatio);
      (mesh.material as THREE.MeshStandardMaterial).color.copy(color);
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      detailMeshes.push(mesh);
    }
    
    return detailMeshes;
  }

  private createFallbackFoliage(clusters: FoliageCluster[], species: TreeSpeciesType): THREE.Mesh[] {
    console.log(`🍃 Creating fallback foliage with ${clusters.length} individual meshes for ${species}`);
    
    const foliageMeshes: THREE.Mesh[] = [];
    const material = this.getOptimizedFoliageMaterial(species);
    
    for (const cluster of clusters) {
      if (cluster.size <= 0) continue;
      
      // Use organic geometry instead of sphere
      const organicGeometry = OrganicFoliageGenerator.createOrganicFoliageGeometry({
        species,
        size: cluster.size,
        irregularity: 0.5,
        subdivisions: 10
      });
      
      const mesh = new THREE.Mesh(organicGeometry, material.clone());
      mesh.position.copy(cluster.position);
      
      // Asymmetric scaling for natural look
      const scaleX = 0.8 + Math.random() * 0.4;
      const scaleY = 0.8 + Math.random() * 0.4;  
      const scaleZ = 0.8 + Math.random() * 0.4;
      mesh.scale.set(scaleX, scaleY, scaleZ);
      
      mesh.rotation.set(
        Math.random() * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      );
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      foliageMeshes.push(mesh);
    }
    
    return foliageMeshes;
  }

  private getOptimizedFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `foliage_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      const baseColor = this.getSpeciesRealisticColor(species, 0.7); // Mid-height base color
      
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85 + Math.random() * 0.1, // 0.85-0.95 for matte, realistic foliage
        metalness: 0.0,
        transparent: false,
        side: THREE.DoubleSide,
        // Removed emissive for natural appearance
      });
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private getSpeciesRealisticColor(species: TreeSpeciesType, heightRatio: number): THREE.Color {
    let baseHue: number;
    let saturation: number;
    let lightness: number;

    switch (species) {
      case TreeSpeciesType.OAK:
        // Oak: Rich, deep greens with slight brown undertones
        baseHue = 0.25 + (Math.random() - 0.5) * 0.05; // Green with variation
        saturation = 0.4 + Math.random() * 0.3; // 0.4-0.7
        lightness = 0.3 + heightRatio * 0.2 + Math.random() * 0.1; // 0.3-0.6
        break;
        
      case TreeSpeciesType.BIRCH:
        // Birch: Lighter, more yellow-green, delicate
        baseHue = 0.27 + (Math.random() - 0.5) * 0.03; // Slightly more yellow
        saturation = 0.3 + Math.random() * 0.2; // 0.3-0.5, less saturated
        lightness = 0.4 + heightRatio * 0.15 + Math.random() * 0.1; // 0.4-0.65, lighter
        break;
        
      case TreeSpeciesType.WILLOW:
        // Willow: Soft, muted greens with slight gray tones
        baseHue = 0.26 + (Math.random() - 0.5) * 0.04;
        saturation = 0.35 + Math.random() * 0.25; // 0.35-0.6
        lightness = 0.35 + heightRatio * 0.15 + Math.random() * 0.1; // 0.35-0.6
        break;
        
      case TreeSpeciesType.DEAD:
        // Dead: Browns, grays, muted colors
        baseHue = 0.1 + (Math.random() - 0.5) * 0.15; // Brown/tan range
        saturation = 0.1 + Math.random() * 0.2; // 0.1-0.3, very muted
        lightness = 0.25 + Math.random() * 0.2; // 0.25-0.45, darker
        break;
        
      default:
        // Generic natural green
        baseHue = 0.25 + (Math.random() - 0.5) * 0.04;
        saturation = 0.4 + Math.random() * 0.3;
        lightness = 0.3 + heightRatio * 0.2 + Math.random() * 0.1;
    }

    return new THREE.Color().setHSL(baseHue, saturation, lightness);
  }

  private createPineTreeStructure(treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Formula-based cone generation - create actual cone geometries
    const coneCount = Math.floor(treeHeight / 4) + 2; // Gives 4-8 cones for 15-25 unit trees
    const startHeight = treeHeight * 0.15; // Start at 15% of trunk height
    const endHeight = treeHeight * 0.95; // End at 95% of trunk height
    const coverageHeight = endHeight - startHeight;
    
    // Proper cone sizing with linear taper
    const bottomConeRadius = treeHeight * 0.3; // Bottom cone = 30% of height radius
    const topConeRadius = treeHeight * 0.05; // Top cone = 5% of height radius
    const coneGeometryHeight = treeHeight * 0.35; // Cone geometry height for overlap
    
    // Even vertical spacing with 50% overlap
    const verticalSpacing = coverageHeight / (coneCount - 1);
    
    console.log(`🌲 Creating pine tree with ${coneCount} cone geometries, height=${treeHeight.toFixed(2)}`);
    
    for (let i = 0; i < coneCount; i++) {
      const heightRatio = i / (coneCount - 1);
      
      // Linear taper from bottom to top
      const coneRadius = bottomConeRadius * (1 - heightRatio) + topConeRadius * heightRatio;
      
      // Even distribution with proper spacing
      const coneY = startHeight + (i * verticalSpacing);
      
      // Create actual cone geometry
      const coneGeometry = new THREE.ConeGeometry(coneRadius, coneGeometryHeight, 8);
      const coneMaterial = this.getOptimizedFoliageMaterial(TreeSpeciesType.PINE);
      const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
      
      // Position cone properly
      coneMesh.position.set(0, coneY + (coneGeometryHeight / 2), 0);
      coneMesh.castShadow = true;
      coneMesh.receiveShadow = true;
      
      // Add slight rotation for natural look
      coneMesh.rotation.y = Math.random() * Math.PI * 2;
      
      // Add cone mesh as a branch (since we return it in branches array)
      branches.push(coneMesh);
    }
    
    console.log(`🌲 Created pine tree with ${branches.length} cone geometries`);
    
    // No foliage clusters needed - we're using direct cone geometries
    // No branches needed - pine trees have cones directly attached to trunk
    
    return { branches, foliageClusters };
  }

  private createRealisticTrunk(species: TreeSpeciesType, height: number, baseRadius: number): THREE.Mesh {
    const segments = 16;
    const heightSegments = 12;
    
    const geometry = new THREE.CylinderGeometry(
      baseRadius * 0.3,
      baseRadius,
      height,
      segments,
      heightSegments
    );

    this.applyOrganicDeformation(geometry, species, height);
    const material = this.createAdvancedTrunkMaterial(species);

    const trunk = new THREE.Mesh(geometry, material);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    return trunk;
  }

  private applyOrganicDeformation(geometry: THREE.BufferGeometry, species: TreeSpeciesType, height: number): void {
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const heightFactor = (y + height / 2) / height;
      
      switch (species) {
        case TreeSpeciesType.OAK:
          const buttressEffect = Math.max(0, 1 - heightFactor * 3) * 0.3;
          const gnarlNoise = Math.sin(heightFactor * 8 + Math.atan2(z, x) * 3) * 0.1;
          positions.setX(i, x * (1 + buttressEffect + gnarlNoise));
          positions.setZ(i, z * (1 + buttressEffect + gnarlNoise));
          break;
          
        case TreeSpeciesType.BIRCH:
          const bendCurve = Math.sin(heightFactor * Math.PI) * 0.2;
          positions.setX(i, x + bendCurve);
          break;
          
        case TreeSpeciesType.WILLOW:
          const twist = heightFactor * Math.PI * 0.5;
          const newX = x * Math.cos(twist) - z * Math.sin(twist);
          const newZ = x * Math.sin(twist) + z * Math.cos(twist);
          positions.setX(i, newX);
          positions.setZ(i, newZ);
          break;
          
        case TreeSpeciesType.DEAD:
          const weathering = (Math.random() - 0.5) * 0.2 * heightFactor;
          positions.setX(i, x + weathering);
          positions.setZ(i, z + weathering);
          break;
      }
    }
    
    geometry.computeVertexNormals();
  }

  private createAdvancedTrunkMaterial(species: TreeSpeciesType): THREE.MeshStandardMaterial {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const textureType = species === TreeSpeciesType.PINE ? 'pine' : config.textureType;
    const texture = this.textureCache.get(textureType);

    // Brighter trunk colors that respond better to lighting
    let trunkColor = config.trunkColor;
    
    // Brighten the trunk color by increasing lightness
    const color = new THREE.Color(trunkColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(hsl.h, hsl.s, Math.min(1.0, hsl.l * 1.4)); // Increase lightness by 40%

    return new THREE.MeshStandardMaterial({
      color: color,
      map: texture,
      roughness: 0.8, // Slightly less rough for better light reflection
      metalness: 0.0,
      bumpMap: texture,
      bumpScale: 0.2 // Reduced bump scale for more even lighting
    });
  }

  public dispose(): void {
    // Dispose textures
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
    
    // Dispose geometries
    for (const geometry of this.foliageGeometryCache.values()) {
      geometry.dispose();
    }
    this.foliageGeometryCache.clear();
    
    // Dispose materials
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
  }
}
