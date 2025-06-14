
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';

export class RealisticTreeGenerator {
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor() {
    this.preloadTextures();
  }

  private preloadTextures(): void {
    // Create specialized bark textures
    this.textureCache.set('bark', TextureGenerator.createWoodTexture());
    this.textureCache.set('birch', this.createBirchTexture());
    this.textureCache.set('weathered', this.createWeatheredTexture());
  }

  private createBirchTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // White birch base
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(0, 0, 256, 256);

    // Black horizontal markings
    ctx.fillStyle = '#2F2F2F';
    for (let i = 0; i < 8; i++) {
      const y = Math.random() * 256;
      const height = 3 + Math.random() * 8;
      ctx.fillRect(0, y, 256, height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createWeatheredTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Dark weathered base
    ctx.fillStyle = '#3C2415';
    ctx.fillRect(0, 0, 256, 256);

    // Add cracks and weathering
    ctx.strokeStyle = '#1C1209';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public createTree(species: TreeSpeciesType, position: THREE.Vector3): THREE.Object3D {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const tree = new THREE.Group();

    // Create trunk
    const trunk = this.createTrunk(species);
    tree.add(trunk);

    // Add branches for species that have them
    if (config.branchCount > 0 && species !== TreeSpeciesType.PINE) {
      const branches = this.createBranches(species);
      branches.forEach(branch => tree.add(branch));
    }

    // Add foliage based on species
    if (config.foliageType !== 'none') {
      const foliage = this.createFoliage(species);
      foliage.forEach(leaf => tree.add(leaf));
    }

    // Position and scale
    tree.position.copy(position);
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createTrunk(species: TreeSpeciesType): THREE.Mesh {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const height = TreeSpeciesManager.getRandomHeight(species);
    const radius = TreeSpeciesManager.getRandomTrunkRadius(species);

    // Create organic trunk geometry
    const geometry = new THREE.CylinderGeometry(
      radius * 0.7, // Top radius (tapered)
      radius,        // Bottom radius
      height,
      12,
      4
    );

    // Add organic deformation
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const heightFactor = (y + height / 2) / height;
      
      // Add slight curve and irregularity
      const noise = (Math.random() - 0.5) * 0.1;
      const curve = species === TreeSpeciesType.WILLOW ? Math.sin(heightFactor * Math.PI) * 0.3 : 0;
      
      positions.setX(i, positions.getX(i) + noise + curve);
      positions.setZ(i, positions.getZ(i) + noise);
    }
    geometry.computeVertexNormals();

    // Create material with appropriate texture
    const texture = this.textureCache.get(config.textureType);
    const material = new THREE.MeshLambertMaterial({
      color: config.trunkColor,
      map: texture
    });

    const trunk = new THREE.Mesh(geometry, material);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    return trunk;
  }

  private createBranches(species: TreeSpeciesType): THREE.Mesh[] {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const branches: THREE.Mesh[] = [];
    const height = TreeSpeciesManager.getRandomHeight(species);

    for (let i = 0; i < config.branchCount; i++) {
      const branchGeometry = new THREE.CylinderGeometry(0.1, 0.2, 3, 6);
      const texture = this.textureCache.get(config.textureType);
      const branchMaterial = new THREE.MeshLambertMaterial({
        color: config.trunkColor,
        map: texture
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      // Position branches around trunk
      const angle = (i / config.branchCount) * Math.PI * 2;
      const branchHeight = height * 0.6 + Math.random() * height * 0.3;
      
      branch.position.set(
        Math.cos(angle) * 1.5,
        branchHeight,
        Math.sin(angle) * 1.5
      );
      
      // Angle branches outward and slightly upward
      branch.rotation.z = (Math.PI / 6) + Math.random() * (Math.PI / 12);
      branch.rotation.y = angle;
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      branches.push(branch);
    }

    return branches;
  }

  private createFoliage(species: TreeSpeciesType): THREE.Mesh[] {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const foliage: THREE.Mesh[] = [];
    const height = TreeSpeciesManager.getRandomHeight(species);

    switch (config.foliageType) {
      case 'spherical':
        foliage.push(...this.createSphericalFoliage(species, height));
        break;
      case 'conical':
        foliage.push(...this.createConicalFoliage(species, height));
        break;
      case 'drooping':
        foliage.push(...this.createDroopingFoliage(species, height));
        break;
    }

    return foliage;
  }

  private createSphericalFoliage(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const foliage: THREE.Mesh[] = [];

    // Create multiple leaf clusters for realistic look
    const clusterCount = species === TreeSpeciesType.OAK ? 4 : 3;
    
    for (let i = 0; i < clusterCount; i++) {
      const geometry = new THREE.SphereGeometry(2 + Math.random(), 8, 6);
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.3, 0.7, 0.4 + Math.random() * 0.2),
        transparent: true,
        opacity: 0.9
      });

      const cluster = new THREE.Mesh(geometry, material);
      
      // Position clusters in crown area
      const angle = (i / clusterCount) * Math.PI * 2;
      const radius = species === TreeSpeciesType.OAK ? 2.5 : 1.5;
      
      cluster.position.set(
        Math.cos(angle) * radius * Math.random(),
        height * 0.7 + Math.random() * height * 0.2,
        Math.sin(angle) * radius * Math.random()
      );
      
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      foliage.push(cluster);
    }

    return foliage;
  }

  private createConicalFoliage(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const foliage: THREE.Mesh[] = [];

    // Create layered conical sections for pine trees
    const layerCount = 5;
    for (let layer = 0; layer < layerCount; layer++) {
      const layerRadius = 3 - layer * 0.4;
      const layerHeight = 3;
      
      const geometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
      const material = new THREE.MeshLambertMaterial({
        color: TreeSpeciesManager.getSpeciesConfig(species).foliageColor,
        transparent: true,
        opacity: 0.95
      });

      const needleLayer = new THREE.Mesh(geometry, material);
      needleLayer.position.y = height * 0.3 + layer * 2.5;
      
      needleLayer.castShadow = true;
      needleLayer.receiveShadow = true;
      foliage.push(needleLayer);
    }

    return foliage;
  }

  private createDroopingFoliage(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const foliage: THREE.Mesh[] = [];

    // Create drooping willow branches
    const drapeCount = 8;
    for (let i = 0; i < drapeCount; i++) {
      const geometry = new THREE.CylinderGeometry(0.1, 0.3, 4, 6);
      const material = new THREE.MeshLambertMaterial({
        color: TreeSpeciesManager.getSpeciesConfig(species).foliageColor,
        transparent: true,
        opacity: 0.8
      });

      const drape = new THREE.Mesh(geometry, material);
      
      const angle = (i / drapeCount) * Math.PI * 2;
      const radius = 2 + Math.random();
      
      drape.position.set(
        Math.cos(angle) * radius,
        height * 0.6,
        Math.sin(angle) * radius
      );
      
      // Angle downward for drooping effect
      drape.rotation.z = Math.PI / 8 + Math.random() * (Math.PI / 8);
      drape.rotation.y = angle;
      
      drape.castShadow = true;
      drape.receiveShadow = true;
      foliage.push(drape);
    }

    return foliage;
  }

  public dispose(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}
