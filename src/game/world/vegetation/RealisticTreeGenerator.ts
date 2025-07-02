
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';

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
    // Pre-create organic foliage geometries for different LOD levels and species
    for (let lod = 0; lod < 3; lod++) {
      const segments = lod === 0 ? 16 : lod === 1 ? 12 : 8;
      const rings = lod === 0 ? 12 : lod === 1 ? 8 : 6;
      
      // Create multiple organic shape variations
      for (let variant = 0; variant < 4; variant++) {
        const geometry = this.createOrganicFoliageGeometry(segments, rings, variant);
        this.foliageGeometryCache.set(`foliage_lod${lod}_v${variant}`, geometry);
      }
    }
  }

  private createOrganicFoliageGeometry(segments: number, rings: number, variant: number): THREE.BufferGeometry {
    const baseGeometry = new THREE.SphereGeometry(1, segments, rings);
    
    // Apply organic deformation based on variant
    const positions = baseGeometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Different organic deformation patterns per variant
      switch (variant) {
        case 0: // Slightly flattened, natural
          vertex.y *= 0.85;
          vertex.x += Math.sin(vertex.y * 3 + vertex.z * 2) * 0.1;
          vertex.z += Math.cos(vertex.y * 2 + vertex.x * 3) * 0.1;
          break;
        case 1: // Asymmetric, drooping
          vertex.y *= 0.9;
          vertex.x *= 1.1;
          vertex.z += Math.sin(vertex.x * 4) * 0.08;
          break;
        case 2: // Compact, dense
          const length = vertex.length();
          vertex.normalize().multiplyScalar(length * (0.9 + Math.sin(length * 8) * 0.1));
          break;
        case 3: // Irregular, natural variation
          vertex.x += (Math.random() - 0.5) * 0.15;
          vertex.y += (Math.random() - 0.5) * 0.1;
          vertex.z += (Math.random() - 0.5) * 0.15;
          break;
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    baseGeometry.computeVertexNormals();
    return baseGeometry;
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

  private createOptimizedFoliage(clusters: FoliageCluster[], species: TreeSpeciesType, treeHeight: number): THREE.Mesh | null {
    if (clusters.length === 0) {
      console.warn('🚨 No foliage clusters provided');
      return null;
    }
    
    console.log(`🍃 Creating instanced foliage with ${clusters.length} clusters for ${species}`);
    
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
      // Select organic geometry variant based on species
      const variantIndex = this.getSpeciesGeometryVariant(species);
      const baseGeometry = this.foliageGeometryCache.get(`foliage_lod0_v${variantIndex}`)!;
      
      // Create instanced mesh with organic geometry
      const material = this.getRealisticFoliageMaterial(species);
      const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, validClusters.length);
      
      // Create transformation matrices for each foliage cluster
      for (let i = 0; i < validClusters.length; i++) {
        const cluster = validClusters[i];
        const matrix = new THREE.Matrix4();
        
        // Create proper transformation matrix using compose
        const position = cluster.position.clone();
        const rotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
        );
        
        // Apply asymmetric scaling based on species for organic appearance
        const asymmetricScale = this.getSpeciesAsymmetricScale(species, cluster.size);
        
        matrix.compose(position, rotation, asymmetricScale);
        instancedMesh.setMatrixAt(i, matrix);
        
        // Set natural instance color with height-based variation
        const heightRatio = cluster.heightRatio || (cluster.position.y / treeHeight);
        
        // Natural foliage colors based on species
        const baseColor = new THREE.Color(this.getSpeciesNaturalColor(species));
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);
        
        // Subtle height-based variation for natural light distribution
        const lightnessMod = (heightRatio - 0.5) * 0.15; // ±7.5% lightness variation based on height
        const randomMod = (Math.random() - 0.5) * 0.1; // ±5% random variation
        
        hsl.h += (Math.random() - 0.5) * 0.03; // ±1.5% hue variation
        hsl.s = Math.max(0.3, Math.min(0.8, hsl.s + (Math.random() - 0.5) * 0.1)); // Natural saturation range
        hsl.l = Math.max(0.2, Math.min(0.6, hsl.l + lightnessMod + randomMod)); // Natural lightness range
        
        const color = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
        instancedMesh.setColorAt(i, color);
      }
      
      // Update instance matrices and colors
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
      
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      
      console.log(`🍃 Successfully created instanced foliage with ${validClusters.length} clusters for ${species}`);
      return instancedMesh;
      
    } catch (error) {
      console.error('🚨 Error creating instanced foliage:', error);
      return null;
    }
  }

  private createFallbackFoliage(clusters: FoliageCluster[], species: TreeSpeciesType): THREE.Mesh[] {
    console.log(`🍃 Creating fallback foliage with ${clusters.length} individual meshes for ${species}`);
    
    const foliageMeshes: THREE.Mesh[] = [];
    const variantIndex = this.getSpeciesGeometryVariant(species);
    const baseGeometry = this.foliageGeometryCache.get(`foliage_lod0_v${variantIndex}`)!;
    const material = this.getRealisticFoliageMaterial(species);
    
    for (const cluster of clusters) {
      if (cluster.size <= 0) continue;
      
      // Create organic scaling based on species
      const asymmetricScale = this.getSpeciesAsymmetricScale(species, cluster.size);
      
      const mesh = new THREE.Mesh(baseGeometry.clone(), material.clone());
      mesh.position.copy(cluster.position);
      mesh.scale.copy(asymmetricScale);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      foliageMeshes.push(mesh);
    }
    
    return foliageMeshes;
  }

  private getSpeciesAsymmetricScale(species: TreeSpeciesType, baseSize: number): THREE.Vector3 {
    // Create species-specific scaling to break perfect spheres
    switch (species) {
      case TreeSpeciesType.OAK:
        // Broad, flattened canopy
        return new THREE.Vector3(
          baseSize * (1.1 + Math.random() * 0.3),
          baseSize * (0.8 + Math.random() * 0.2),
          baseSize * (1.0 + Math.random() * 0.3)
        );
      case TreeSpeciesType.WILLOW:
        // Drooping, asymmetric foliage
        return new THREE.Vector3(
          baseSize * (0.9 + Math.random() * 0.2),
          baseSize * (1.2 + Math.random() * 0.3),
          baseSize * (0.8 + Math.random() * 0.2)
        );
      case TreeSpeciesType.BIRCH:
        // Delicate, compact foliage
        return new THREE.Vector3(
          baseSize * (0.9 + Math.random() * 0.1),
          baseSize * (0.95 + Math.random() * 0.1),
          baseSize * (0.9 + Math.random() * 0.1)
        );
      case TreeSpeciesType.DEAD:
        // Irregular, sparse foliage
        return new THREE.Vector3(
          baseSize * (0.7 + Math.random() * 0.4),
          baseSize * (0.6 + Math.random() * 0.3),
          baseSize * (0.8 + Math.random() * 0.4)
        );
      default:
        return new THREE.Vector3(baseSize, baseSize, baseSize);
    }
  }

  private getSpeciesGeometryVariant(species: TreeSpeciesType): number {
    // Select geometry variant based on species characteristics
    switch (species) {
      case TreeSpeciesType.OAK:
        return 0; // Natural, slightly flattened
      case TreeSpeciesType.WILLOW:
        return 1; // Asymmetric, drooping
      case TreeSpeciesType.BIRCH:
        return 2; // Compact, dense
      case TreeSpeciesType.DEAD:
        return 3; // Irregular, natural variation
      default:
        return 0;
    }
  }

  private getRealisticFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `realistic_foliage_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      // Get natural colors per species
      const baseColor = this.getSpeciesNaturalColor(species);
      
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85 + Math.random() * 0.1, // High roughness for matte foliage (0.85-0.95)
        metalness: 0.0,
        transparent: false,
        side: THREE.DoubleSide,
        vertexColors: true, // Enable per-instance colors
        // Remove emissive for natural appearance
      });
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private getSpeciesNaturalColor(species: TreeSpeciesType): number {
    // Natural, realistic foliage colors
    switch (species) {
      case TreeSpeciesType.OAK:
        return 0x4A6741; // Deep forest green
      case TreeSpeciesType.BIRCH:
        return 0x5C7A4A; // Light forest green  
      case TreeSpeciesType.WILLOW:
        return 0x7A8B4C; // Sage green
      case TreeSpeciesType.DEAD:
        return 0x8B7355; // Brown/dead foliage
      default:
        return 0x4A6741; // Default deep green
    }
  }

  private getOptimizedFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    // For backward compatibility - redirect to realistic material
    return this.getRealisticFoliageMaterial(species);
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
