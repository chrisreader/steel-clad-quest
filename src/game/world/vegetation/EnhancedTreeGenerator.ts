
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { BiomeType } from '../../vegetation/core/GrassConfig';

export type TreeSpecies = 'oak' | 'pine' | 'birch' | 'willow' | 'dead';

export interface TreeConfig {
  species: TreeSpecies;
  height: number;
  trunkRadius: number;
  crownRadius: number;
  branchCount: number;
  leafDensity: number;
  barkColor: number;
  leafColor: number;
  seasonalVariation: boolean;
}

export interface ProceduralTreeOptions {
  species: TreeSpecies;
  scale?: number;
  age?: number; // 0-1, affects size and shape
  health?: number; // 0-1, affects foliage density
  windExposure?: number; // 0-1, affects lean and asymmetry
  biome?: BiomeType;
}

export class EnhancedTreeGenerator {
  private treeModels: Map<TreeSpecies, THREE.Group[]> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private geometries: Map<string, THREE.BufferGeometry> = new Map();

  constructor() {
    this.initializeTreeSpecies();
  }

  private initializeTreeSpecies(): void {
    // Create 3 variations for each species
    const species: TreeSpecies[] = ['oak', 'pine', 'birch', 'willow', 'dead'];
    
    species.forEach(type => {
      const variations: THREE.Group[] = [];
      for (let i = 0; i < 3; i++) {
        const tree = this.generateProceduralTree({
          species: type,
          scale: 0.8 + Math.random() * 0.4,
          age: 0.3 + Math.random() * 0.7,
          health: type === 'dead' ? 0.1 + Math.random() * 0.2 : 0.7 + Math.random() * 0.3,
          windExposure: Math.random() * 0.5
        });
        variations.push(tree);
      }
      this.treeModels.set(type, variations);
    });

    console.log(`🌳 Enhanced TreeGenerator: Created ${species.length} tree species with 3 variations each`);
  }

  private generateProceduralTree(options: ProceduralTreeOptions): THREE.Group {
    const tree = new THREE.Group();
    
    // Generate trunk with organic shape
    const trunk = this.createOrganicTrunk(options);
    tree.add(trunk);

    // Generate species-specific crown/branches
    switch (options.species) {
      case 'oak':
        this.addOakCrown(tree, options);
        break;
      case 'pine':
        this.addPineCrown(tree, options);
        break;
      case 'birch':
        this.addBirchCrown(tree, options);
        break;
      case 'willow':
        this.addWillowCrown(tree, options);
        break;
      case 'dead':
        this.addDeadBranches(tree, options);
        break;
    }

    return tree;
  }

  private createOrganicTrunk(options: ProceduralTreeOptions): THREE.Mesh {
    const scale = options.scale || 1.0;
    const age = options.age || 0.5;
    const windExposure = options.windExposure || 0.0;

    // Base dimensions
    const baseHeight = this.getSpeciesHeight(options.species) * scale;
    const baseRadius = this.getSpeciesRadius(options.species) * scale;
    
    // Create tapered trunk geometry
    const segments = 12;
    const heightSegments = 8;
    const geometry = new THREE.CylinderGeometry(
      baseRadius * 0.3, // top radius (tapered)
      baseRadius * (1.0 + age * 0.3), // bottom radius (root flare)
      baseHeight,
      segments,
      heightSegments
    );

    // Add organic deformation
    this.deformTrunkGeometry(geometry, options);

    // Create species-specific bark material
    const material = this.getBarkMaterial(options.species);
    
    const trunk = new THREE.Mesh(geometry, material);
    trunk.position.y = baseHeight / 2;
    
    // Add wind lean
    if (windExposure > 0.3) {
      trunk.rotation.z = (Math.random() - 0.5) * windExposure * 0.2;
    }

    trunk.castShadow = true;
    trunk.receiveShadow = true;

    return trunk;
  }

  private deformTrunkGeometry(geometry: THREE.CylinderGeometry, options: ProceduralTreeOptions): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Add bark texture bumps
      const angle = Math.atan2(vertex.z, vertex.x);
      const heightRatio = (vertex.y + geometry.parameters.height / 2) / geometry.parameters.height;
      
      // Bark roughness based on species
      let roughness = 0.02;
      switch (options.species) {
        case 'oak': roughness = 0.05; break;
        case 'pine': roughness = 0.03; break;
        case 'birch': roughness = 0.01; break;
        case 'willow': roughness = 0.03; break;
        case 'dead': roughness = 0.04; break;
      }

      const noise = Math.sin(angle * 8) * Math.sin(heightRatio * 10) * roughness;
      const radialDistance = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      
      vertex.x *= (1 + noise);
      vertex.z *= (1 + noise);
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private addOakCrown(tree: THREE.Group, options: ProceduralTreeOptions): void {
    const scale = options.scale || 1.0;
    const health = options.health || 1.0;
    const baseHeight = this.getSpeciesHeight('oak') * scale;

    // Create main branches (3-5 major branches)
    const branchCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const branchHeight = baseHeight * 0.6 + Math.random() * baseHeight * 0.3;
      const branchLength = scale * (2 + Math.random() * 2);
      
      // Main branch
      const branchGeometry = new THREE.CylinderGeometry(0.1 * scale, 0.3 * scale, branchLength, 6);
      const branchMaterial = this.getBarkMaterial('oak');
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      branch.position.set(
        Math.cos(angle) * 0.5 * scale,
        branchHeight,
        Math.sin(angle) * 0.5 * scale
      );
      branch.rotation.z = angle + Math.PI / 2;
      branch.rotation.x = -Math.PI / 6 + Math.random() * Math.PI / 12;
      
      branch.castShadow = true;
      tree.add(branch);

      // Add leaf clusters along branch
      this.addOakLeafClusters(tree, branch, options, angle, branchHeight, branchLength);
    }

    // Central crown cluster
    const crownGeometry = new THREE.SphereGeometry(scale * (2 + Math.random()), 12, 8);
    const leafMaterial = this.getLeafMaterial('oak', health);
    const crown = new THREE.Mesh(crownGeometry, leafMaterial);
    crown.position.y = baseHeight * 0.85;
    crown.scale.y = 0.8 + Math.random() * 0.4; // Flatten slightly
    crown.castShadow = true;
    tree.add(crown);
  }

  private addOakLeafClusters(tree: THREE.Group, branch: THREE.Mesh, options: ProceduralTreeOptions, angle: number, branchHeight: number, branchLength: number): void {
    const scale = options.scale || 1.0;
    const health = options.health || 1.0;
    const clusterCount = 2 + Math.floor(Math.random() * 3);

    for (let j = 0; j < clusterCount; j++) {
      const t = 0.3 + (j / clusterCount) * 0.7; // Along branch
      const clusterSize = scale * (0.8 + Math.random() * 0.6) * health;
      
      const leafCluster = new THREE.Mesh(
        new THREE.SphereGeometry(clusterSize, 8, 6),
        this.getLeafMaterial('oak', health)
      );
      
      leafCluster.position.set(
        Math.cos(angle) * branchLength * t * 0.3,
        branchHeight + Math.sin(-Math.PI / 6) * branchLength * t,
        Math.sin(angle) * branchLength * t * 0.3
      );
      
      leafCluster.castShadow = true;
      tree.add(leafCluster);
    }
  }

  private addPineCrown(tree: THREE.Group, options: ProceduralTreeOptions): void {
    const scale = options.scale || 1.0;
    const health = options.health || 1.0;
    const baseHeight = this.getSpeciesHeight('pine') * scale;

    // Create layered cone structure (5-8 layers)
    const layerCount = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < layerCount; i++) {
      const layerHeight = baseHeight * 0.4 + (i / layerCount) * baseHeight * 0.5;
      const layerRadius = scale * (2.5 - (i / layerCount) * 2) * health;
      
      // Create needle cluster layer
      const needleGeometry = new THREE.ConeGeometry(layerRadius, layerRadius * 0.8, 12);
      const needleMaterial = this.getLeafMaterial('pine', health);
      const needleLayer = new THREE.Mesh(needleGeometry, needleMaterial);
      
      needleLayer.position.y = layerHeight;
      needleLayer.castShadow = true;
      needleLayer.receiveShadow = true;
      
      // Add slight rotation for natural look
      needleLayer.rotation.y = Math.random() * Math.PI * 2;
      
      tree.add(needleLayer);
    }
  }

  private addBirchCrown(tree: THREE.Group, options: ProceduralTreeOptions): void {
    const scale = options.scale || 1.0;
    const health = options.health || 1.0;
    const baseHeight = this.getSpeciesHeight('birch') * scale;

    // Delicate branching pattern
    const mainBranchCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < mainBranchCount; i++) {
      const angle = (i / mainBranchCount) * Math.PI * 2;
      const branchHeight = baseHeight * (0.5 + Math.random() * 0.3);
      
      // Thin, delicate branches
      this.createDelicateBranch(tree, angle, branchHeight, scale, health, 'birch');
    }

    // Light, airy crown
    const crownGeometry = new THREE.SphereGeometry(scale * (1.5 + Math.random() * 0.5), 10, 8);
    const leafMaterial = this.getLeafMaterial('birch', health);
    leafMaterial.transparent = true;
    (leafMaterial as THREE.MeshLambertMaterial).opacity = 0.7 + health * 0.3;
    
    const crown = new THREE.Mesh(crownGeometry, leafMaterial);
    crown.position.y = baseHeight * 0.8;
    crown.scale.set(1, 1.2, 1); // Slightly elongated
    crown.castShadow = true;
    tree.add(crown);
  }

  private addWillowCrown(tree: THREE.Group, options: ProceduralTreeOptions): void {
    const scale = options.scale || 1.0;
    const health = options.health || 1.0;
    const baseHeight = this.getSpeciesHeight('willow') * scale;

    // Drooping branch structure
    const droopBranchCount = 6 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < droopBranchCount; i++) {
      const angle = (i / droopBranchCount) * Math.PI * 2;
      const startHeight = baseHeight * (0.6 + Math.random() * 0.2);
      const droopLength = scale * (3 + Math.random() * 2);
      
      // Create drooping branch with curve
      this.createDroopingBranch(tree, angle, startHeight, droopLength, scale, health);
    }

    // Central canopy
    const canopyGeometry = new THREE.SphereGeometry(scale * 2, 12, 8);
    const leafMaterial = this.getLeafMaterial('willow', health);
    const canopy = new THREE.Mesh(canopyGeometry, leafMaterial);
    canopy.position.y = baseHeight * 0.7;
    canopy.scale.y = 0.6; // Flattened dome
    canopy.castShadow = true;
    tree.add(canopy);
  }

  private createDroopingBranch(tree: THREE.Group, angle: number, startHeight: number, length: number, scale: number, health: number): void {
    const segments = 8;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, startHeight, 0),
      new THREE.Vector3(Math.cos(angle) * length * 0.3, startHeight - length * 0.1, Math.sin(angle) * length * 0.3),
      new THREE.Vector3(Math.cos(angle) * length * 0.7, startHeight - length * 0.4, Math.sin(angle) * length * 0.7),
      new THREE.Vector3(Math.cos(angle) * length, startHeight - length * 0.8, Math.sin(angle) * length)
    ]);

    const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.05 * scale, 4, false);
    const branchMaterial = this.getBarkMaterial('willow');
    const droopBranch = new THREE.Mesh(tubeGeometry, branchMaterial);
    droopBranch.castShadow = true;
    tree.add(droopBranch);

    // Add hanging leaf clusters
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPoint(t);
      
      const leafCluster = new THREE.Mesh(
        new THREE.SphereGeometry(scale * (0.3 + Math.random() * 0.2) * health, 6, 4),
        this.getLeafMaterial('willow', health)
      );
      leafCluster.position.copy(point);
      leafCluster.castShadow = true;
      tree.add(leafCluster);
    }
  }

  private createDelicateBranch(tree: THREE.Group, angle: number, height: number, scale: number, health: number, species: TreeSpecies): void {
    const branchLength = scale * (1 + Math.random());
    const branchGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.08 * scale, branchLength, 4);
    const branchMaterial = this.getBarkMaterial(species);
    const branch = new THREE.Mesh(branchGeometry, branchMaterial);
    
    branch.position.set(
      Math.cos(angle) * 0.3 * scale,
      height,
      Math.sin(angle) * 0.3 * scale
    );
    branch.rotation.z = angle + Math.PI / 2;
    branch.rotation.x = -Math.PI / 8 + Math.random() * Math.PI / 16;
    
    branch.castShadow = true;
    tree.add(branch);

    // Add small leaf clusters
    const clusterCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < clusterCount; i++) {
      const t = 0.5 + (i / clusterCount) * 0.5;
      const clusterSize = scale * (0.2 + Math.random() * 0.2) * health;
      
      const leafCluster = new THREE.Mesh(
        new THREE.SphereGeometry(clusterSize, 6, 4),
        this.getLeafMaterial(species, health)
      );
      
      leafCluster.position.set(
        Math.cos(angle) * branchLength * t * 0.2,
        height + Math.sin(-Math.PI / 8) * branchLength * t,
        Math.sin(angle) * branchLength * t * 0.2
      );
      
      leafCluster.castShadow = true;
      tree.add(leafCluster);
    }
  }

  private addDeadBranches(tree: THREE.Group, options: ProceduralTreeOptions): void {
    const scale = options.scale || 1.0;
    const baseHeight = this.getSpeciesHeight('dead') * scale;

    // Bare, twisted branches
    const branchCount = 4 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.8;
      const branchHeight = baseHeight * (0.4 + Math.random() * 0.4);
      const branchLength = scale * (1.5 + Math.random() * 1.5);
      
      // Main dead branch
      const branchGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.2 * scale, branchLength, 6);
      const deadMaterial = this.getBarkMaterial('dead');
      const branch = new THREE.Mesh(branchGeometry, deadMaterial);
      
      branch.position.set(
        Math.cos(angle) * 0.4 * scale,
        branchHeight,
        Math.sin(angle) * 0.4 * scale
      );
      branch.rotation.z = angle + Math.PI / 2;
      branch.rotation.x = -Math.PI / 4 + Math.random() * Math.PI / 6;
      
      branch.castShadow = true;
      tree.add(branch);

      // Add smaller dead twigs
      this.addDeadTwigs(tree, branch, angle, branchHeight, branchLength, scale);
    }
  }

  private addDeadTwigs(tree: THREE.Group, branch: THREE.Mesh, angle: number, branchHeight: number, branchLength: number, scale: number): void {
    const twigCount = 2 + Math.floor(Math.random() * 3);
    
    for (let j = 0; j < twigCount; j++) {
      const t = 0.3 + (j / twigCount) * 0.7;
      const twigLength = scale * (0.3 + Math.random() * 0.5);
      const twigAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
      
      const twigGeometry = new THREE.CylinderGeometry(0.01 * scale, 0.03 * scale, twigLength, 3);
      const deadMaterial = this.getBarkMaterial('dead');
      const twig = new THREE.Mesh(twigGeometry, deadMaterial);
      
      twig.position.set(
        Math.cos(angle) * branchLength * t * 0.3 + Math.cos(twigAngle) * twigLength * 0.3,
        branchHeight + Math.sin(-Math.PI / 4) * branchLength * t,
        Math.sin(angle) * branchLength * t * 0.3 + Math.sin(twigAngle) * twigLength * 0.3
      );
      twig.rotation.z = twigAngle + Math.PI / 2;
      twig.rotation.x = -Math.PI / 6 + Math.random() * Math.PI / 6;
      
      twig.castShadow = true;
      tree.add(twig);
    }
  }

  private getSpeciesHeight(species: TreeSpecies): number {
    switch (species) {
      case 'oak': return 8;
      case 'pine': return 12;
      case 'birch': return 10;
      case 'willow': return 7;
      case 'dead': return 6;
      default: return 8;
    }
  }

  private getSpeciesRadius(species: TreeSpecies): number {
    switch (species) {
      case 'oak': return 0.4;
      case 'pine': return 0.25;
      case 'birch': return 0.15;
      case 'willow': return 0.3;
      case 'dead': return 0.2;
      default: return 0.3;
    }
  }

  private getBarkMaterial(species: TreeSpecies): THREE.Material {
    const materialKey = `bark_${species}`;
    
    if (this.materials.has(materialKey)) {
      return this.materials.get(materialKey)!;
    }

    let color: number;
    let roughness: number;
    
    switch (species) {
      case 'oak':
        color = 0x8B4513; // Saddle brown
        roughness = 0.9;
        break;
      case 'pine':
        color = 0x654321; // Dark brown
        roughness = 0.8;
        break;
      case 'birch':
        color = 0xF5F5DC; // Beige with black marks
        roughness = 0.3;
        break;
      case 'willow':
        color = 0x696969; // Dim gray
        roughness = 0.7;
        break;
      case 'dead':
        color = 0x2F2F2F; // Dark gray
        roughness = 1.0;
        break;
      default:
        color = 0x8B4513;
        roughness = 0.8;
    }

    const material = new THREE.MeshLambertMaterial({ 
      color,
      map: TextureGenerator.createWoodTexture()
    });

    // Add species-specific texture modifications
    if (species === 'birch') {
      // Create birch-specific texture with black markings
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      
      // White base
      ctx.fillStyle = '#F5F5DC';
      ctx.fillRect(0, 0, 128, 128);
      
      // Add black horizontal marks
      ctx.fillStyle = '#000000';
      for (let i = 0; i < 10; i++) {
        const y = Math.random() * 128;
        const width = 20 + Math.random() * 60;
        const height = 2 + Math.random() * 4;
        ctx.fillRect((128 - width) / 2, y, width, height);
      }
      
      const birchTexture = new THREE.CanvasTexture(canvas);
      birchTexture.wrapS = THREE.RepeatWrapping;
      birchTexture.wrapT = THREE.RepeatWrapping;
      birchTexture.repeat.set(1, 4);
      
      material.map = birchTexture;
    }

    this.materials.set(materialKey, material);
    return material;
  }

  private getLeafMaterial(species: TreeSpecies, health: number = 1.0): THREE.Material {
    const materialKey = `leaves_${species}_${Math.floor(health * 10)}`;
    
    if (this.materials.has(materialKey)) {
      return this.materials.get(materialKey)!;
    }

    let color: number;
    let opacity = 0.8 + health * 0.2;
    
    switch (species) {
      case 'oak':
        color = 0x228B22; // Forest green
        break;
      case 'pine':
        color = 0x006400; // Dark green
        opacity = 0.9; // Denser needles
        break;
      case 'birch':
        color = 0x90EE90; // Light green
        opacity = 0.6 + health * 0.3; // More transparent
        break;
      case 'willow':
        color = 0x9ACD32; // Yellow green
        break;
      default:
        color = 0x228B22;
    }

    // Adjust color based on health
    const healthColor = new THREE.Color(color);
    if (health < 0.7) {
      healthColor.multiplyScalar(0.8 + health * 0.2);
    }

    const material = new THREE.MeshLambertMaterial({ 
      color: healthColor,
      transparent: true,
      opacity
    });

    this.materials.set(materialKey, material);
    return material;
  }

  // Public methods for integration
  public createTree(position: THREE.Vector3, biomeType?: BiomeType): THREE.Object3D | null {
    const species = this.selectSpeciesForBiome(biomeType);
    const variations = this.treeModels.get(species);
    
    if (!variations || variations.length === 0) return null;
    
    const variationIndex = Math.floor(Math.random() * variations.length);
    const model = variations[variationIndex].clone();
    
    // Add variation
    const scale = 0.7 + Math.random() * 0.6;
    model.scale.set(scale, scale, scale);
    model.rotation.y = Math.random() * Math.PI * 2;
    
    // Add slight random lean for natural look
    model.rotation.z = (Math.random() - 0.5) * 0.1;
    
    model.position.copy(position);
    
    return model;
  }

  private selectSpeciesForBiome(biomeType?: BiomeType): TreeSpecies {
    if (!biomeType) return 'oak'; // Default
    
    const distributions = {
      normal: { oak: 0.4, birch: 0.3, willow: 0.2, dead: 0.05, pine: 0.05 },
      meadow: { oak: 0.3, birch: 0.4, willow: 0.25, pine: 0.05, dead: 0.0 },
      prairie: { oak: 0.2, dead: 0.3, willow: 0.3, birch: 0.1, pine: 0.1 }
    };
    
    const dist = distributions[biomeType] || distributions.normal;
    const random = Math.random();
    let cumulative = 0;
    
    for (const [species, probability] of Object.entries(dist)) {
      cumulative += probability;
      if (random <= cumulative) {
        return species as TreeSpecies;
      }
    }
    
    return 'oak';
  }

  public getTreeModels(): THREE.Object3D[] {
    const allModels: THREE.Object3D[] = [];
    for (const variations of this.treeModels.values()) {
      allModels.push(...variations);
    }
    return allModels;
  }

  public dispose(): void {
    // Dispose materials
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();

    // Dispose geometries
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }
    this.geometries.clear();

    // Clear tree models
    for (const variations of this.treeModels.values()) {
      variations.forEach(tree => {
        tree.traverse(child => {
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
    this.treeModels.clear();

    console.log('🌳 Enhanced TreeGenerator disposed');
  }
}
