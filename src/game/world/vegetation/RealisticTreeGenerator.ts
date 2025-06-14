import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';

export class RealisticTreeGenerator {
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor() {
    this.preloadTextures();
  }

  private preloadTextures(): void {
    // Create specialized bark textures with enhanced detail
    this.textureCache.set('bark', this.createOakBarkTexture());
    this.textureCache.set('birch', this.createBirchTexture());
    this.textureCache.set('weathered', this.createWeatheredTexture());
    this.textureCache.set('pine', this.createPineBarkTexture());
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

    // Create organic trunk
    const trunk = this.createOrganicTrunk(species);
    tree.add(trunk);

    // Add realistic branches
    const branches = this.createRealisticBranches(species);
    branches.forEach(branch => tree.add(branch));

    // Add advanced foliage
    if (TreeSpeciesManager.getSpeciesConfig(species).foliageType !== 'none') {
      const foliage = this.createAdvancedFoliage(species);
      foliage.forEach(leaf => tree.add(leaf));
    }

    // Position and add natural variation
    tree.position.copy(position);
    const scale = 0.7 + Math.random() * 0.6; // More size variation
    tree.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createOrganicTrunk(species: TreeSpeciesType): THREE.Mesh {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const height = TreeSpeciesManager.getRandomHeight(species);
    const baseRadius = TreeSpeciesManager.getRandomTrunkRadius(species);

    // Create organic trunk with proper tapering
    const segments = 16;
    const heightSegments = 12;
    
    const geometry = new THREE.CylinderGeometry(
      baseRadius * 0.3, // Top radius (heavy taper)
      baseRadius,       // Bottom radius
      height,
      segments,
      heightSegments
    );

    // Apply species-specific organic deformation
    this.applyOrganicDeformation(geometry, species, height);

    // Create advanced material
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
      
      // Species-specific deformations
      switch (species) {
        case TreeSpeciesType.OAK:
          // Gnarled, thick trunk with buttress base
          const buttressEffect = Math.max(0, 1 - heightFactor * 3) * 0.3;
          const gnarlNoise = Math.sin(heightFactor * 8 + Math.atan2(z, x) * 3) * 0.1;
          positions.setX(i, x * (1 + buttressEffect + gnarlNoise));
          positions.setZ(i, z * (1 + buttressEffect + gnarlNoise));
          break;
          
        case TreeSpeciesType.BIRCH:
          // Slight natural bend
          const bendCurve = Math.sin(heightFactor * Math.PI) * 0.2;
          positions.setX(i, x + bendCurve);
          break;
          
        case TreeSpeciesType.WILLOW:
          // Twisted, curved trunk
          const twist = heightFactor * Math.PI * 0.5;
          const newX = x * Math.cos(twist) - z * Math.sin(twist);
          const newZ = x * Math.sin(twist) + z * Math.cos(twist);
          positions.setX(i, newX);
          positions.setZ(i, newZ);
          break;
          
        case TreeSpeciesType.DEAD:
          // Weathered, irregular shape
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

  private createRealisticBranches(species: TreeSpeciesType): THREE.Mesh[] {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const branches: THREE.Mesh[] = [];
    const height = TreeSpeciesManager.getRandomHeight(species);

    switch (species) {
      case TreeSpeciesType.OAK:
        return this.createOakBranches(height);
      case TreeSpeciesType.PINE:
        return []; // Pine trees don't use branches, they use stacked cones
      case TreeSpeciesType.BIRCH:
        return this.createBirchBranches(height);
      case TreeSpeciesType.WILLOW:
        return this.createWillowBranches(height);
      case TreeSpeciesType.DEAD:
        return this.createDeadBranches(height);
      default:
        return branches;
    }
  }

  private createOakBranches(height: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const branchCount = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      // Main branch
      const branchGeometry = new THREE.CylinderGeometry(0.08, 0.25, 4, 8);
      const texture = this.textureCache.get('bark');
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        map: texture,
        roughness: 0.9,
        metalness: 0.0
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const branchHeight = height * 0.5 + Math.random() * height * 0.3;
      
      branch.position.set(
        Math.cos(angle) * 2,
        branchHeight,
        Math.sin(angle) * 2
      );
      
      branch.rotation.z = Math.PI / 4 + Math.random() * (Math.PI / 6);
      branch.rotation.y = angle;
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      branches.push(branch);

      // Add secondary branches
      const secondaryBranches = this.createSecondaryBranches(branch, 2, texture);
      branches.push(...secondaryBranches);
    }

    return branches;
  }

  private createPineBranches(height: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const whorls = 8; // Pine branch whorls

    for (let whorl = 0; whorl < whorls; whorl++) {
      const branchesPerWhorl = 4 + Math.floor(Math.random() * 3);
      const whorlHeight = height * 0.2 + (whorl / whorls) * height * 0.7;
      
      for (let i = 0; i < branchesPerWhorl; i++) {
        const branchGeometry = new THREE.CylinderGeometry(0.05, 0.15, 2.5, 6);
        const texture = this.textureCache.get('pine');
        const branchMaterial = new THREE.MeshStandardMaterial({
          color: 0x654321,
          map: texture,
          roughness: 0.9,
          metalness: 0.0
        });

        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        
        const angle = (i / branchesPerWhorl) * Math.PI * 2;
        branch.position.set(
          Math.cos(angle) * 1.5,
          whorlHeight,
          Math.sin(angle) * 1.5
        );
        
        branch.rotation.z = -Math.PI / 8;
        branch.rotation.y = angle;
        
        branch.castShadow = true;
        branch.receiveShadow = true;
        branches.push(branch);
      }
    }

    return branches;
  }

  private createBirchBranches(height: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const branchCount = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < branchCount; i++) {
      const branchGeometry = new THREE.CylinderGeometry(0.03, 0.12, 3, 6);
      const texture = this.textureCache.get('birch');
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0xF5F5DC,
        map: texture,
        roughness: 0.8,
        metalness: 0.0
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      const angle = (i / branchCount) * Math.PI * 2;
      const branchHeight = height * 0.6 + Math.random() * height * 0.2;
      
      branch.position.set(
        Math.cos(angle) * 1.2,
        branchHeight,
        Math.sin(angle) * 1.2
      );
      
      // Drooping characteristic of birch
      branch.rotation.z = Math.PI / 6 + Math.random() * (Math.PI / 12);
      branch.rotation.y = angle;
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      branches.push(branch);
    }

    return branches;
  }

  private createWillowBranches(height: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const branchCount = 6 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const branchGeometry = new THREE.CylinderGeometry(0.04, 0.18, 5, 8);
      const texture = this.textureCache.get('bark');
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        map: texture,
        roughness: 0.9,
        metalness: 0.0
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      const angle = (i / branchCount) * Math.PI * 2;
      const branchHeight = height * 0.7 + Math.random() * height * 0.2;
      
      branch.position.set(
        Math.cos(angle) * 1.8,
        branchHeight,
        Math.sin(angle) * 1.8
      );
      
      // Heavy drooping for willow
      branch.rotation.z = Math.PI / 3 + Math.random() * (Math.PI / 6);
      branch.rotation.y = angle;
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      branches.push(branch);
    }

    return branches;
  }

  private createDeadBranches(height: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const branchCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const branchGeometry = new THREE.CylinderGeometry(0.02, 0.15, 2.5, 6);
      const texture = this.textureCache.get('weathered');
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0x2F1B14,
        map: texture,
        roughness: 1.0,
        metalness: 0.0
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      const angle = (i / branchCount) * Math.PI * 2 + Math.random();
      const branchHeight = height * 0.4 + Math.random() * height * 0.4;
      
      branch.position.set(
        Math.cos(angle) * 1.5,
        branchHeight,
        Math.sin(angle) * 1.5
      );
      
      // Broken, jagged angles
      branch.rotation.z = Math.random() * Math.PI / 2;
      branch.rotation.y = angle;
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      branches.push(branch);
    }

    return branches;
  }

  private createSecondaryBranches(parentBranch: THREE.Mesh, count: number, texture: THREE.Texture | undefined): THREE.Mesh[] {
    const secondaryBranches: THREE.Mesh[] = [];
    
    for (let i = 0; i < count; i++) {
      const subBranchGeometry = new THREE.CylinderGeometry(0.03, 0.08, 1.5, 6);
      const subBranchMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        map: texture,
        roughness: 0.9,
        metalness: 0.0
      });

      const subBranch = new THREE.Mesh(subBranchGeometry, subBranchMaterial);
      
      subBranch.position.copy(parentBranch.position);
      subBranch.position.y += 1 + i * 0.5;
      subBranch.position.x += Math.cos(i * Math.PI) * 0.8;
      subBranch.position.z += Math.sin(i * Math.PI) * 0.8;
      
      subBranch.rotation.copy(parentBranch.rotation);
      subBranch.rotation.z += Math.random() * Math.PI / 4;
      
      subBranch.castShadow = true;
      subBranch.receiveShadow = true;
      secondaryBranches.push(subBranch);
    }
    
    return secondaryBranches;
  }

  private createAdvancedFoliage(species: TreeSpeciesType): THREE.Mesh[] {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const height = TreeSpeciesManager.getRandomHeight(species);

    switch (config.foliageType) {
      case 'spherical':
        return this.createRealisticSphericalFoliage(species, height);
      case 'conical':
        return this.createStackedPineCones(species, height);
      case 'drooping':
        return this.createRealisticDroopingFoliage(species, height);
      default:
        return [];
    }
  }

  private createStackedPineCones(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const cones: THREE.Mesh[] = [];
    const coneCount = 6 + Math.floor(Math.random() * 3); // 6-8 cones
    
    for (let i = 0; i < coneCount; i++) {
      const heightRatio = i / (coneCount - 1);
      
      // Cone size decreases from bottom to top
      const baseRadius = 3.5 - (heightRatio * 2.5); // 3.5 to 1.0
      const coneHeight = 2.5 - (heightRatio * 1.0); // 2.5 to 1.5
      
      // Create cone geometry
      const geometry = new THREE.ConeGeometry(
        Math.max(0.5, baseRadius + (Math.random() - 0.5) * 0.3),
        coneHeight + (Math.random() - 0.5) * 0.2,
        12,
        1
      );
      
      // Apply organic deformation to cones
      const positions = geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j);
        const y = positions.getY(j);
        const z = positions.getZ(j);
        
        // Add slight irregularity
        const noise = (Math.random() - 0.5) * 0.1;
        positions.setX(j, x + noise);
        positions.setZ(j, z + noise);
      }
      geometry.computeVertexNormals();
      
      // Varying green shades for each cone level
      const greenHue = 0.22 + (Math.random() - 0.5) * 0.02;
      const saturation = 0.8 - (heightRatio * 0.1); // Slightly less saturated at top
      const lightness = 0.15 + (Math.random() * 0.05); // Dark green variations
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(greenHue, saturation, lightness),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
      
      const cone = new THREE.Mesh(geometry, material);
      
      // Position cones vertically with slight overlap
      const coneY = height * 0.25 + (i * 2.8) - (coneHeight * 0.3); // Slight overlap
      cone.position.set(
        (Math.random() - 0.5) * 0.1, // Very slight horizontal offset
        coneY,
        (Math.random() - 0.5) * 0.1
      );
      
      // Slight rotation for natural variation
      cone.rotation.y = Math.random() * Math.PI * 0.2;
      
      cone.castShadow = true;
      cone.receiveShadow = true;
      cones.push(cone);
    }
    
    return cones;
  }

  private createRealisticSphericalFoliage(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const foliage: THREE.Mesh[] = [];
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    
    // Create multiple organic leaf clusters
    const clusterCount = species === TreeSpeciesType.OAK ? 6 : 4;
    
    for (let i = 0; i < clusterCount; i++) {
      // Irregular sphere for organic look
      const geometry = new THREE.SphereGeometry(1.5 + Math.random() * 1.5, 12, 8);
      
      // Apply organic deformation to foliage
      const positions = geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j);
        const y = positions.getY(j);
        const z = positions.getZ(j);
        
        const noise = (Math.random() - 0.5) * 0.3;
        positions.setX(j, x + noise);
        positions.setY(j, y + noise);
        positions.setZ(j, z + noise);
      }
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.6, 0.3 + Math.random() * 0.2),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85 + Math.random() * 0.1,
        side: THREE.DoubleSide
      });

      const cluster = new THREE.Mesh(geometry, material);
      
      // Organic positioning in crown
      const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 1.5 + Math.random() * 2;
      const crownHeight = height * 0.65 + Math.random() * height * 0.25;
      
      cluster.position.set(
        Math.cos(angle) * radius,
        crownHeight,
        Math.sin(angle) * radius
      );
      
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      foliage.push(cluster);
    }

    return foliage;
  }

  private createRealisticDroopingFoliage(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const foliage: THREE.Mesh[] = [];

    // Create flowing willow leaf curtains
    const curtainCount = 12;
    for (let i = 0; i < curtainCount; i++) {
      // Create elongated curtain geometry
      const geometry = new THREE.CylinderGeometry(0.1, 0.4, 6, 6, 4);
      
      // Deform for flowing effect
      const positions = geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j);
        const flowEffect = Math.sin((y + 3) / 6 * Math.PI) * 0.3;
        positions.setX(j, positions.getX(j) + flowEffect);
      }
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.25, 0.7, 0.4 + Math.random() * 0.2),
        roughness: 0.8,
        metalness: 0.0,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.2,
        side: THREE.DoubleSide
      });

      const curtain = new THREE.Mesh(geometry, material);
      
      const angle = (i / curtainCount) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 1.5;
      
      curtain.position.set(
        Math.cos(angle) * radius,
        height * 0.7,
        Math.sin(angle) * radius
      );
      
      // Heavy droop angle
      curtain.rotation.z = Math.PI / 4 + Math.random() * (Math.PI / 8);
      curtain.rotation.y = angle + Math.random() * 0.5;
      
      curtain.castShadow = true;
      curtain.receiveShadow = true;
      foliage.push(curtain);
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
