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
    
    // Create optimized unified foliage
    const unifiedFoliage = this.createOptimizedFoliage(foliageClusters, species, height);
    if (unifiedFoliage) {
      tree.add(unifiedFoliage);
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
    
    // Add central crown foliage for fuller top
    const centralFoliageSize = treeHeight * 0.2;
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
    
    // Add foliage at branch end
    const endFoliageSize = config.treeHeight * (0.08 + config.thickness * 5);
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
    if (clusters.length === 0) return null;
    
    // Get base geometry and convert to InstancedBufferGeometry
    const baseGeometry = this.foliageGeometryCache.get('foliage_lod0')!;
    const instancedGeometry = new THREE.InstancedBufferGeometry();
    
    // Copy base geometry attributes to instanced geometry
    instancedGeometry.setIndex(baseGeometry.getIndex());
    instancedGeometry.setAttribute('position', baseGeometry.getAttribute('position'));
    instancedGeometry.setAttribute('normal', baseGeometry.getAttribute('normal'));
    instancedGeometry.setAttribute('uv', baseGeometry.getAttribute('uv'));
    
    // Set instance count
    instancedGeometry.instanceCount = clusters.length;
    
    // Create transformation matrices for each foliage cluster
    const matrices = new Float32Array(clusters.length * 16);
    const colors = new Float32Array(clusters.length * 3);
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const matrix = new THREE.Matrix4();
      
      // Apply position and scale
      matrix.makeScale(cluster.size, cluster.size, cluster.size);
      matrix.setPosition(cluster.position);
      
      // Add slight random rotation
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationY(Math.random() * Math.PI * 2);
      matrix.multiply(rotationMatrix);
      
      matrix.toArray(matrices, i * 16);
      
      // Generate foliage color variation
      const hue = 0.25 + (Math.random() - 0.5) * 0.05;
      const saturation = 0.6 + (Math.random() - 0.5) * 0.2;
      const lightness = 0.35 + (Math.random() - 0.5) * 0.1;
      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    instancedGeometry.setAttribute('instanceMatrix', new THREE.InstancedBufferAttribute(matrices, 16));
    instancedGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));
    
    const material = this.getOptimizedFoliageMaterial(species);
    const instancedMesh = new THREE.Mesh(instancedGeometry, material);
    
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    
    console.log(`🍃 Created instanced foliage with ${clusters.length} clusters for ${species}`);
    
    return instancedMesh;
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
        side: THREE.DoubleSide
      });
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private createPineTreeStructure(treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    const coneCount = Math.floor(treeHeight / 3) + 2;
    const startHeight = treeHeight * 0.25;
    const endHeight = treeHeight * 0.95;
    const coverageHeight = endHeight - startHeight;
    
    const bottomConeRadius = treeHeight * 0.35;
    const topConeRadius = treeHeight * 0.08;
    
    for (let i = 0; i < coneCount; i++) {
      const heightRatio = i / (coneCount - 1);
      const coneRadius = bottomConeRadius * (1 - heightRatio) + topConeRadius * heightRatio;
      const coneY = startHeight + (i * (coverageHeight / (coneCount - 1)));
      
      // Create foliage cluster for this cone level
      foliageClusters.push({
        position: new THREE.Vector3(0, coneY, 0),
        size: coneRadius * 0.8,
        density: 0.95
      });
      
      // Add smaller clusters around the main cone for natural variation
      const subClusterCount = Math.max(3, Math.floor(coneRadius * 1.5));
      for (let j = 0; j < subClusterCount; j++) {
        const angle = (j / subClusterCount) * Math.PI * 2;
        const distance = coneRadius * (0.6 + Math.random() * 0.3);
        
        foliageClusters.push({
          position: new THREE.Vector3(
            Math.cos(angle) * distance,
            coneY + (Math.random() - 0.5) * coneRadius * 0.2,
            Math.sin(angle) * distance
          ),
          size: coneRadius * (0.3 + Math.random() * 0.2),
          density: 0.8
        });
      }
    }
    
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
