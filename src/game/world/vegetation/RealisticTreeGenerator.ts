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
}

interface PineTreeConfig {
  height: number;
  trunkRadius: number;
  age: number; // 0-1 scale (0=young, 1=mature)
  health: number; // 0-1 scale (0=diseased, 1=healthy)
  coneSpacing: number; // Cone vertical spacing factor
  conesPerLevel: number; // Number of cones at each height level
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

    // Pre-create pine cone geometries with different segment counts for LOD
    for (let lod = 0; lod < 3; lod++) {
      const segments = lod === 0 ? 12 : lod === 1 ? 8 : 6;
      const geometry = new THREE.ConeGeometry(1, 1, segments);
      this.foliageGeometryCache.set(`pine_cone_lod${lod}`, geometry);
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

    if (species === TreeSpeciesType.PINE) {
      // Generate realistic pine tree configuration
      const pineConfig = this.generateRealisticPineConfig();
      
      console.log(`🌲 Creating realistic ${species} tree: height=${pineConfig.height.toFixed(2)}, age=${pineConfig.age.toFixed(2)}, health=${pineConfig.health.toFixed(2)}`);
      
      // Create trunk
      const trunk = this.createRealisticTrunk(species, pineConfig.height, pineConfig.trunkRadius);
      tree.add(trunk);
      
      // Create realistic pine structure
      const { branches } = this.createRealisticPineTreeStructure(pineConfig);
      branches.forEach(branch => tree.add(branch));
      
      console.log(`🌲 Created realistic pine with ${branches.length} cone layers`);
    } else {
      // Use existing logic for other tree species
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
    }

    // Position and scale tree
    tree.position.copy(position);
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale * (0.95 + Math.random() * 0.1), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private generateRealisticPineConfig(): PineTreeConfig {
    // Generate age (determines overall characteristics)
    const age = Math.random(); // 0 = young sapling, 1 = ancient tree
    
    // Generate health (affects appearance and fullness)
    const health = 0.6 + Math.random() * 0.4; // Most trees are reasonably healthy
    
    // Age-based height scaling
    let heightRange: { min: number; max: number };
    if (age < 0.3) {
      // Young trees (saplings to adolescent)
      heightRange = { min: 5, max: 12 };
    } else if (age < 0.7) {
      // Mature trees
      heightRange = { min: 12, max: 20 };
    } else {
      // Ancient/old growth trees
      heightRange = { min: 18, max: 28 };
    }
    
    const height = heightRange.min + Math.random() * (heightRange.max - heightRange.min);
    
    // Age and health-based trunk radius
    const baseRadius = age * 0.8 + 0.3; // Age contributes to thickness
    const healthRadius = baseRadius * (0.8 + health * 0.2); // Health affects final size
    const trunkRadius = Math.max(0.2, healthRadius * (0.8 + Math.random() * 0.4));
    
    // Age-based cone characteristics
    const coneSpacing = age < 0.4 ? 0.8 : 1.2; // Young trees have tighter spacing
    const conesPerLevel = Math.floor(1 + age * 2); // More cone layers for older trees
    
    return {
      height,
      trunkRadius,
      age,
      health,
      coneSpacing,
      conesPerLevel
    };
  }

  private createRealisticPineTreeStructure(config: PineTreeConfig): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Calculate cone distribution based on age and health
    const minConeCount = Math.max(3, Math.floor(config.height / 6));
    const maxConeCount = Math.floor(config.height / 3.5);
    const coneCount = Math.floor(minConeCount + config.age * (maxConeCount - minConeCount));
    
    // Vertical coverage area
    const startHeight = config.height * (config.age < 0.3 ? 0.2 : 0.15); // Young trees start higher
    const endHeight = config.height * 0.92;
    const coverageHeight = endHeight - startHeight;
    
    // Cone sizing with realistic proportions
    const bottomConeRadius = config.height * (0.25 + config.age * 0.1) * config.health;
    const topConeRadius = config.height * 0.04;
    
    // Cone height varies with age and position
    const baseConeHeight = config.height * 0.3;
    
    console.log(`🌲 Realistic pine: age=${config.age.toFixed(2)}, ${coneCount} cones, health=${config.health.toFixed(2)}`);
    
    for (let i = 0; i < coneCount; i++) {
      const heightRatio = i / (coneCount - 1);
      
      // Non-linear cone sizing for natural taper
      const sizeTransition = Math.pow(1 - heightRatio, 1.5); // Exponential taper
      const coneRadius = topConeRadius + (bottomConeRadius - topConeRadius) * sizeTransition;
      
      // Variable cone heights (larger at bottom, smaller at top)
      const coneHeight = baseConeHeight * (0.6 + sizeTransition * 0.4);
      
      // Age-based spacing with natural variation
      const baseSpacing = coverageHeight / Math.max(1, coneCount - 1);
      const spacingVariation = (Math.random() - 0.5) * baseSpacing * 0.3;
      const coneY = startHeight + (i * baseSpacing * config.coneSpacing) + spacingVariation;
      
      // Health affects cone fullness and shape
      const healthFactor = 0.7 + config.health * 0.3;
      const finalRadius = coneRadius * healthFactor;
      const finalHeight = coneHeight * healthFactor;
      
      // Create multiple cones per level for fuller appearance (age-dependent)
      const conesAtLevel = Math.max(1, Math.floor(config.conesPerLevel * (1 + sizeTransition * 0.5)));
      
      for (let j = 0; j < conesAtLevel; j++) {
        const angle = j * (Math.PI * 2 / conesAtLevel) + Math.random() * 0.3;
        const offsetRadius = j === 0 ? 0 : finalRadius * 0.2 * Math.random();
        
        const x = Math.cos(angle) * offsetRadius;
        const z = Math.sin(angle) * offsetRadius;
        
        // Create cone geometry with appropriate LOD
        const segments = finalRadius > config.height * 0.15 ? 12 : 8;
        const coneGeometry = new THREE.ConeGeometry(finalRadius, finalHeight, segments);
        const coneMaterial = this.getRealisticPineMaterial(config);
        const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
        
        // Position cone
        coneMesh.position.set(x, coneY + (finalHeight / 2), z);
        coneMesh.castShadow = true;
        coneMesh.receiveShadow = true;
        
        // Natural rotation
        coneMesh.rotation.y = angle + Math.random() * 0.5;
        coneMesh.rotation.x = (Math.random() - 0.5) * 0.1; // Slight tilt
        coneMesh.rotation.z = (Math.random() - 0.5) * 0.1;
        
        branches.push(coneMesh);
      }
    }
    
    console.log(`🌲 Created realistic pine with ${branches.length} cone meshes across ${coneCount} levels`);
    
    return { branches, foliageClusters };
  }

  private getRealisticPineMaterial(config: PineTreeConfig): THREE.Material {
    const materialKey = `pine_realistic_${Math.floor(config.age * 10)}_${Math.floor(config.health * 10)}`;
    
    if (!this.materialCache.has(materialKey)) {
      // Age and health affect color
      const baseHue = 0.25; // Green base
      const ageSaturation = 0.6 + config.age * 0.2; // Older trees more saturated
      const healthLightness = 0.15 + config.health * 0.15; // Healthier trees brighter
      
      const color = new THREE.Color().setHSL(baseHue, ageSaturation, healthLightness);
      
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.9,
        metalness: 0.0,
        transparent: false,
        side: THREE.FrontSide
      });
      
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private createRealisticTreeStructure(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    // Create lower trunk branches (20-50% height)
    const lowerBranches = this.createLowerBranches(species, treeHeight, trunkBaseRadius);
    branches.push(...lowerBranches.branches);
    foliageClusters.push(...lowerBranches.foliageClusters);

    // Create main crown branches (50-85% height)
    const crownBranches = this.createCrownBranches(species, treeHeight, trunkBaseRadius);
    branches.push(...crownBranches.branches);
    foliageClusters.push(...crownBranches.foliageClusters);

    // Create upper crown branches (85-95% height)
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
      });
      
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
      });
      
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
    
    const branchCount = species === TreeSpeciesType.OAK ? 6 : 4;
    
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
      });
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    // Add central crown foliage for fuller top - REDUCED SIZE
    const centralFoliageSize = treeHeight * 0.08; // Reduced from 0.2
    foliageClusters.push({
      position: new THREE.Vector3(0, treeHeight * 0.9, 0),
      size: centralFoliageSize,
      density: 1.0
    });
    
    return { branches, foliageClusters };
  }

  private createBranchWithHierarchy(config: BranchConfig): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Create main branch
    const mainBranch = this.createOptimizedBranch(config);
    branches.push(mainBranch);
    
    // Add foliage at branch end - REDUCED SIZE
    const endFoliageSize = config.treeHeight * (0.03 + config.thickness * 2); // Reduced from 0.08 and *5
    const endPosition = config.direction.clone()
      .multiplyScalar(config.length)
      .add(config.attachmentPoint);
    
    foliageClusters.push({
      position: endPosition,
      size: endFoliageSize,
      density: 0.9 + Math.random() * 0.1
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
        
        const secondaryResult = this.createBranchWithHierarchy({
          length: secondaryLength,
          thickness: secondaryThickness,
          attachmentPoint: worldPosition,
          direction: secondaryDirection,
          species: config.species,
          treeHeight: config.treeHeight,
          branchLevel: config.branchLevel + 1
        });
        
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
        color: 0x8B4513,
        map: texture,
        roughness: 0.9,
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
    
    // Validate and cap foliage sizes
    const validClusters = clusters.filter(cluster => {
      const isValid = cluster.position && cluster.size > 0 && cluster.density > 0;
      if (!isValid) {
        console.warn('🚨 Invalid foliage cluster:', cluster);
      }
      // Cap maximum foliage size to prevent oversized clusters
      cluster.size = Math.min(cluster.size, treeHeight * 0.12); // Cap at 12% of tree height
      return isValid;
    });
    
    if (validClusters.length === 0) {
      console.warn('🚨 No valid foliage clusters after filtering');
      return null;
    }
    
    try {
      // Get base geometry
      const baseGeometry = this.foliageGeometryCache.get('foliage_lod0')!;
      
      // Create instanced mesh directly with base geometry
      const material = this.getOptimizedFoliageMaterial(species);
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
        // Apply additional size reduction multiplier
        const finalSize = cluster.size * 0.6; // Additional 40% size reduction
        const scale = new THREE.Vector3(finalSize, finalSize, finalSize);
        
        matrix.compose(position, rotation, scale);
        instancedMesh.setMatrixAt(i, matrix);
        
        // Set instance color with variation
        const hue = 0.25 + (Math.random() - 0.5) * 0.05;
        const saturation = 0.6 + (Math.random() - 0.5) * 0.2;
        const lightness = 0.35 + (Math.random() - 0.5) * 0.1;
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        
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
    const baseGeometry = this.foliageGeometryCache.get('foliage_lod0')!;
    const material = this.getOptimizedFoliageMaterial(species);
    
    for (const cluster of clusters) {
      if (cluster.size <= 0) continue;
      
      const mesh = new THREE.Mesh(baseGeometry.clone(), material.clone());
      mesh.position.copy(cluster.position);
      mesh.scale.set(cluster.size, cluster.size, cluster.size);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      foliageMeshes.push(mesh);
    }
    
    return foliageMeshes;
  }

  private getOptimizedFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `foliage_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        vertexColors: true // Enable per-instance colors
      });
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
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

    return new THREE.MeshStandardMaterial({
      color: config.trunkColor,
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
      bumpMap: texture,
      bumpScale: 0.3
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
