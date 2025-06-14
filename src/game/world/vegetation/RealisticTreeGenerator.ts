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
    let baseRadius = TreeSpeciesManager.getRandomTrunkRadius(species);

    // Increase trunk thickness for pine trees and scale with height
    if (species === TreeSpeciesType.PINE) {
      baseRadius = baseRadius * 2.2 * (height / 20); // Thicker trunk that scales with tree size
    }

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
        return this.createImprovedOakBranches(height);
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

  private createImprovedOakBranches(height: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const branchCount = 4 + Math.floor(Math.random() * 2); // 4-5 main branches
    const trunkRadius = TreeSpeciesManager.getRandomTrunkRadius(TreeSpeciesType.OAK);
    
    // Create main branches
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const branchHeight = height * (0.4 + Math.random() * 0.3); // 40-70% up the trunk
      const branchLength = 3 + Math.random() * 2; // 3-5 units long
      
      // Create main branch with proper tapering
      const branchGeometry = new THREE.CylinderGeometry(
        0.08 + Math.random() * 0.04, // Tip radius: 0.08-0.12
        0.25 + Math.random() * 0.1,  // Base radius: 0.25-0.35
        branchLength,
        8
      );
      
      const texture = this.textureCache.get('bark');
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        map: texture,
        roughness: 0.9,
        metalness: 0.0
      });

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      // Position branch at trunk surface
      const trunkX = Math.cos(angle) * trunkRadius;
      const trunkZ = Math.sin(angle) * trunkRadius;
      
      branch.position.set(trunkX, branchHeight, trunkZ);
      
      // Rotate branch to extend outward and upward
      branch.rotation.y = angle; // Point outward
      branch.rotation.z = -(Math.PI / 6 + Math.random() * (Math.PI / 12)); // 30-45 degrees upward
      
      // Move branch to its center point so it extends from trunk
      branch.position.x += Math.cos(angle) * Math.cos(branch.rotation.z) * (branchLength / 2);
      branch.position.z += Math.sin(angle) * Math.cos(branch.rotation.z) * (branchLength / 2);
      branch.position.y += Math.sin(-branch.rotation.z) * (branchLength / 2);
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      branches.push(branch);

      // Add secondary branches
      const secondaryCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < secondaryCount; j++) {
        const secondaryBranch = this.createSecondaryOakBranch(branch, j, secondaryCount, texture);
        branches.push(secondaryBranch);
      }
    }

    return branches;
  }

  private createSecondaryOakBranch(parentBranch: THREE.Mesh, index: number, totalCount: number, texture: THREE.Texture | undefined): THREE.Mesh {
    const secondaryLength = 1.5 + Math.random() * 1; // 1.5-2.5 units
    
    const geometry = new THREE.CylinderGeometry(
      0.03 + Math.random() * 0.02, // Tip: 0.03-0.05
      0.08 + Math.random() * 0.04, // Base: 0.08-0.12
      secondaryLength,
      6
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      map: texture,
      roughness: 0.9,
      metalness: 0.0
    });

    const secondaryBranch = new THREE.Mesh(geometry, material);
    
    // Position along parent branch
    const parentLength = 3 + Math.random() * 2; // Same as main branch calculation
    const positionAlongBranch = 0.4 + (index / (totalCount - 1)) * 0.5; // 40-90% along branch
    
    // Calculate position on parent branch
    const localX = 0;
    const localY = (positionAlongBranch - 0.5) * parentLength;
    const localZ = 0;
    
    // Transform to world space using parent's rotation
    const worldPos = new THREE.Vector3(localX, localY, localZ);
    worldPos.applyEuler(new THREE.Euler(0, parentBranch.rotation.y, parentBranch.rotation.z));
    worldPos.add(parentBranch.position);
    
    secondaryBranch.position.copy(worldPos);
    
    // Rotate secondary branch
    const secondaryAngle = parentBranch.rotation.y + (Math.random() - 0.5) * Math.PI / 2;
    const secondaryUpward = parentBranch.rotation.z - (Math.PI / 8 + Math.random() * (Math.PI / 8));
    
    secondaryBranch.rotation.y = secondaryAngle;
    secondaryBranch.rotation.z = secondaryUpward;
    
    // Extend from attachment point
    secondaryBranch.position.x += Math.cos(secondaryAngle) * Math.cos(-secondaryUpward) * (secondaryLength / 2);
    secondaryBranch.position.z += Math.sin(secondaryAngle) * Math.cos(-secondaryUpward) * (secondaryLength / 2);
    secondaryBranch.position.y += Math.sin(-secondaryUpward) * (secondaryLength / 2);
    
    secondaryBranch.castShadow = true;
    secondaryBranch.receiveShadow = true;
    
    return secondaryBranch;
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
    // This method is now replaced by createSecondaryOakBranch for oak trees
    // Keep for other tree types that might use it
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
        return this.createRealisticPineCones(species, height);
      case 'drooping':
        return this.createRealisticDroopingFoliage(species, height);
      default:
        return [];
    }
  }

  private createRealisticPineCones(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const cones: THREE.Mesh[] = [];
    
    // Calculate cone count (4-8 cones total, but we'll skip the bottom one)
    const totalConeCount = Math.floor(height / 4) + 2;
    const coneCount = totalConeCount - 1; // Remove bottom cone
    
    // Define coverage area - start higher up the trunk since we removed bottom cone
    const startHeight = height * 0.35; // Start at 35% of trunk height (was 15%)
    const endHeight = height * 0.95;   // End near the top
    const coverageHeight = endHeight - startHeight;
    
    // Calculate cone dimensions
    const bottomConeRadius = height * 0.25;  // Slightly smaller since no bottom cone
    const topConeRadius = height * 0.05;     
    const coneHeight = height * 0.25;        
    
    // Calculate spacing
    const coneSpacing = coverageHeight / (coneCount - 1);
    
    for (let i = 0; i < coneCount; i++) {
      // Linear taper from what would be the second cone to top
      const heightRatio = i / (coneCount - 1);
      const coneRadius = bottomConeRadius * (1 - heightRatio) + topConeRadius * heightRatio;
      
      // Create cone geometry
      const geometry = new THREE.ConeGeometry(
        coneRadius,
        coneHeight,
        Math.max(12, Math.floor(coneRadius * 3)),
        1
      );
      
      // Create realistic pine needle material
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(
          0.21 + (Math.random() - 0.5) * 0.02,
          0.9 - heightRatio * 0.1,
          0.12 + heightRatio * 0.08 + Math.random() * 0.02
        ),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
      
      const cone = new THREE.Mesh(geometry, material);
      
      // Position cone at proper height
      const coneY = startHeight + (i * coneSpacing);
      
      // Ensure top cone sits exactly at trunk tip
      if (i === coneCount - 1) {
        cone.position.set(0, height - (coneHeight * 0.4), 0);
      } else {
        cone.position.set(0, coneY + (coneHeight * 0.4), 0);
      }
      
      // Slight natural variation in rotation
      cone.rotation.y = Math.random() * Math.PI * 0.1;
      
      cone.castShadow = true;
      cone.receiveShadow = true;
      cones.push(cone);
    }
    
    return cones;
  }

  private createRealisticSphericalFoliage(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const foliage: THREE.Mesh[] = [];
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    
    if (species === TreeSpeciesType.OAK) {
      return this.createOakFoliageOnBranches(height);
    }
    
    // Create multiple organic leaf clusters for other spherical trees
    const clusterCount = 4;
    
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

  private createOakFoliageOnBranches(height: number): THREE.Mesh[] {
    const foliage: THREE.Mesh[] = [];
    const branchCount = 4 + Math.floor(Math.random() * 2);
    const trunkRadius = TreeSpeciesManager.getRandomTrunkRadius(TreeSpeciesType.OAK);
    
    // Create foliage clusters that follow the branch structure
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const branchHeight = height * (0.4 + Math.random() * 0.3);
      const branchLength = 3 + Math.random() * 2;
      
      // Calculate branch end position
      const branchEndX = Math.cos(angle) * (trunkRadius + branchLength * 0.8);
      const branchEndZ = Math.sin(angle) * (trunkRadius + branchLength * 0.8);
      const branchEndY = branchHeight + Math.sin(Math.PI / 6) * branchLength * 0.8;
      
      // Main foliage cluster at branch end
      const mainClusterGeometry = new THREE.SphereGeometry(1.8 + Math.random() * 0.8, 12, 8);
      
      // Apply organic deformation
      const positions = mainClusterGeometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j);
        const y = positions.getY(j);
        const z = positions.getZ(j);
        
        const noise = (Math.random() - 0.5) * 0.4;
        positions.setX(j, x + noise);
        positions.setY(j, y + noise);
        positions.setZ(j, z + noise);
      }
      mainClusterGeometry.computeVertexNormals();

      const foliageMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.25 + Math.random() * 0.08, 0.7, 0.35 + Math.random() * 0.15),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.88 + Math.random() * 0.1,
        side: THREE.DoubleSide
      });

      const mainCluster = new THREE.Mesh(mainClusterGeometry, foliageMaterial);
      mainCluster.position.set(branchEndX, branchEndY, branchEndZ);
      
      mainCluster.castShadow = true;
      mainCluster.receiveShadow = true;
      foliage.push(mainCluster);
      
      // Add secondary foliage clusters along the branch
      const secondaryCount = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < secondaryCount; k++) {
        const positionRatio = 0.5 + (k / secondaryCount) * 0.4; // 50-90% along branch
        
        const secX = Math.cos(angle) * (trunkRadius + branchLength * positionRatio * 0.8);
        const secZ = Math.sin(angle) * (trunkRadius + branchLength * positionRatio * 0.8);
        const secY = branchHeight + Math.sin(Math.PI / 6) * branchLength * positionRatio * 0.8;
        
        const secGeometry = new THREE.SphereGeometry(1.2 + Math.random() * 0.6, 10, 6);
        const secCluster = new THREE.Mesh(secGeometry, foliageMaterial);
        
        // Add some offset for natural variation
        secCluster.position.set(
          secX + (Math.random() - 0.5) * 1.5,
          secY + (Math.random() - 0.5) * 1,
          secZ + (Math.random() - 0.5) * 1.5
        );
        
        secCluster.castShadow = true;
        secCluster.receiveShadow = true;
        foliage.push(secCluster);
      }
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
