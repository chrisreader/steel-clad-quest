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
  branchLevel: number;
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

    // Add cone geometry for pine trees
    const coneGeometry = new THREE.ConeGeometry(1, 2, 12, 1);
    this.foliageGeometryCache.set('pine_cone', coneGeometry);
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

    // Create species-specific crown architecture
    const { branches, foliageClusters } = this.createSpeciesCrown(species, height, baseRadius);
    
    // Add all branches
    branches.forEach(branch => tree.add(branch));
    
    // Create optimized foliage
    if (foliageClusters.length > 0) {
      const foliage = this.createOptimizedFoliage(foliageClusters, species, height);
      if (foliage) {
        tree.add(foliage);
        console.log(`🍃 Successfully added ${species} crown with ${foliageClusters.length} clusters`);
      }
    }

    // Position and scale tree
    tree.position.copy(position);
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale * (0.95 + Math.random() * 0.1), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createSpeciesCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    
    switch (config.foliageType) {
      case 'spherical':
        return this.createSphericalCrown(species, treeHeight, trunkBaseRadius);
      case 'conical':
        return this.createConicalCrown(species, treeHeight, trunkBaseRadius);
      case 'drooping':
        return this.createDroopingCrown(species, treeHeight, trunkBaseRadius);
      case 'none':
        return this.createBareCrown(species, treeHeight, trunkBaseRadius);
      default:
        return this.createSphericalCrown(species, treeHeight, trunkBaseRadius);
    }
  }

  private createSphericalCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    const crownStartHeight = treeHeight * 0.3;
    const crownHeight = treeHeight - crownStartHeight;
    const crownRadius = treeHeight * (species === TreeSpeciesType.OAK ? 0.6 : 0.4);

    // Create main branch structure
    const mainBranchCount = species === TreeSpeciesType.OAK ? 6 : 4;
    for (let i = 0; i < mainBranchCount; i++) {
      const angle = (i / mainBranchCount) * Math.PI * 2;
      const heightRatio = 0.4 + Math.random() * 0.4;
      const attachmentHeight = crownStartHeight + crownHeight * heightRatio;
      
      const branchLength = crownRadius * (0.7 + Math.random() * 0.3);
      const branchThickness = trunkBaseRadius * 0.3;
      
      const attachmentPoint = new THREE.Vector3(0, attachmentHeight, 0);
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0.1 + Math.random() * 0.2,
        Math.sin(angle)
      ).normalize();
      
      const branch = this.createOptimizedBranch({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      });
      branches.push(branch);
    }

    // Create dense spherical foliage volume
    const centerY = crownStartHeight + crownHeight * 0.7;
    const layerCount = 5;
    
    for (let layer = 0; layer < layerCount; layer++) {
      const layerRadius = crownRadius * (0.3 + (layer / layerCount) * 0.7);
      const layerY = centerY + (layer - layerCount/2) * (crownHeight * 0.1);
      const clustersInLayer = Math.floor(layerRadius * 4);
      
      for (let i = 0; i < clustersInLayer; i++) {
        const angle = (i / clustersInLayer) * Math.PI * 2 + Math.random() * 0.5;
        const distance = layerRadius * (0.6 + Math.random() * 0.4);
        
        foliageClusters.push({
          position: new THREE.Vector3(
            Math.cos(angle) * distance,
            layerY + (Math.random() - 0.5) * crownHeight * 0.1,
            Math.sin(angle) * distance
          ),
          size: treeHeight * (0.08 + Math.random() * 0.04),
          density: 0.8 + Math.random() * 0.2
        });
      }
    }

    // Add central crown cluster
    foliageClusters.push({
      position: new THREE.Vector3(0, centerY, 0),
      size: treeHeight * 0.12,
      density: 1.0
    });

    return { branches, foliageClusters };
  }

  private createConicalCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    const crownStartHeight = treeHeight * 0.2;
    const crownEndHeight = treeHeight * 0.95;
    const crownHeight = crownEndHeight - crownStartHeight;
    const baseRadius = treeHeight * 0.25;

    // Create solid cone structure with fewer, larger segments
    const coneSegments = 6; // Reduced from many small clusters
    
    for (let i = 0; i < coneSegments; i++) {
      const heightRatio = i / (coneSegments - 1);
      const segmentY = crownStartHeight + heightRatio * crownHeight;
      const segmentRadius = baseRadius * (1 - heightRatio * 0.9); // Taper to 10% at top
      
      // Create main cone segment
      foliageClusters.push({
        position: new THREE.Vector3(0, segmentY, 0),
        size: segmentRadius,
        density: 0.95
      });
      
      // Add variation around the cone perimeter
      const perimeterClusters = Math.max(2, Math.floor(segmentRadius * 3));
      for (let j = 0; j < perimeterClusters; j++) {
        const angle = (j / perimeterClusters) * Math.PI * 2;
        const distance = segmentRadius * (0.6 + Math.random() * 0.3);
        
        foliageClusters.push({
          position: new THREE.Vector3(
            Math.cos(angle) * distance,
            segmentY + (Math.random() - 0.5) * segmentRadius * 0.2,
            Math.sin(angle) * distance
          ),
          size: segmentRadius * (0.2 + Math.random() * 0.15),
          density: 0.8
        });
      }
    }

    return { branches, foliageClusters };
  }

  private createDroopingCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    const crownStartHeight = treeHeight * 0.4;
    const crownHeight = treeHeight - crownStartHeight;
    const crownRadius = treeHeight * 0.5;

    // Create drooping branches
    const mainBranchCount = 8;
    for (let i = 0; i < mainBranchCount; i++) {
      const angle = (i / mainBranchCount) * Math.PI * 2;
      const attachmentHeight = crownStartHeight + Math.random() * crownHeight * 0.5;
      
      const branchLength = crownRadius * (0.8 + Math.random() * 0.4);
      const branchThickness = trunkBaseRadius * 0.2;
      
      const attachmentPoint = new THREE.Vector3(0, attachmentHeight, 0);
      const direction = new THREE.Vector3(
        Math.cos(angle),
        -0.3 - Math.random() * 0.4, // Downward direction
        Math.sin(angle)
      ).normalize();
      
      const branch = this.createOptimizedBranch({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      });
      branches.push(branch);

      // Create drooping foliage along branch
      const segmentCount = 4;
      for (let j = 1; j <= segmentCount; j++) {
        const segmentRatio = j / segmentCount;
        const segmentPosition = attachmentPoint.clone()
          .add(direction.clone().multiplyScalar(branchLength * segmentRatio));
        
        foliageClusters.push({
          position: segmentPosition,
          size: treeHeight * (0.06 + Math.random() * 0.03),
          density: 0.8 + Math.random() * 0.2
        });
      }
    }

    // Add upper crown volume
    const centerY = crownStartHeight + crownHeight * 0.3;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = crownRadius * (0.3 + Math.random() * 0.3);
      
      foliageClusters.push({
        position: new THREE.Vector3(
          Math.cos(angle) * distance,
          centerY + (Math.random() - 0.5) * crownHeight * 0.2,
          Math.sin(angle) * distance
        ),
        size: treeHeight * (0.08 + Math.random() * 0.04),
        density: 0.9
      });
    }

    return { branches, foliageClusters };
  }

  private createBareCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    // Create bare, gnarled branches for dead trees
    const branchCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random();
      const heightRatio = 0.3 + Math.random() * 0.5;
      const attachmentHeight = treeHeight * heightRatio;
      
      const branchLength = treeHeight * (0.2 + Math.random() * 0.3);
      const branchThickness = trunkBaseRadius * (0.15 + Math.random() * 0.1);
      
      const attachmentPoint = new THREE.Vector3(0, attachmentHeight, 0);
      const direction = new THREE.Vector3(
        Math.cos(angle),
        -0.1 + Math.random() * 0.4,
        Math.sin(angle)
      ).normalize();
      
      const branch = this.createOptimizedBranch({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      });
      branches.push(branch);
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
    
    console.log(`🍃 Creating ${species} foliage with ${clusters.length} clusters`);
    
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
      // Use cone geometry for pine trees, sphere for others
      const baseGeometry = species === TreeSpeciesType.PINE ? 
        this.foliageGeometryCache.get('pine_cone')! : 
        this.foliageGeometryCache.get('foliage_lod0')!;
      
      const material = this.getOptimizedFoliageMaterial(species);
      const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, validClusters.length);
      
      // Create transformation matrices for each foliage cluster
      for (let i = 0; i < validClusters.length; i++) {
        const cluster = validClusters[i];
        const matrix = new THREE.Matrix4();
        
        const position = cluster.position.clone();
        const rotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
        );
        const scale = new THREE.Vector3(cluster.size, cluster.size, cluster.size);
        
        matrix.compose(position, rotation, scale);
        instancedMesh.setMatrixAt(i, matrix);
        
        // Set instance color with variation
        const baseHue = species === TreeSpeciesType.PINE ? 0.22 : 0.25;
        const hue = baseHue + (Math.random() - 0.5) * 0.05;
        const saturation = 0.6 + (Math.random() - 0.5) * 0.2;
        const lightness = 0.35 + (Math.random() - 0.5) * 0.1;
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        
        instancedMesh.setColorAt(i, color);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
      
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      
      console.log(`🍃 Successfully created ${species} foliage with ${validClusters.length} clusters`);
      return instancedMesh;
      
    } catch (error) {
      console.error('🚨 Error creating foliage:', error);
      return null;
    }
  }

  private getOptimizedFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `foliage_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      const baseColor = species === TreeSpeciesType.PINE ? 0x0F5132 : 0x2d5016;
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        vertexColors: true
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
