import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';

export class RealisticTreeGenerator {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private debugMode: boolean = false;

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

    const height = TreeSpeciesManager.getRandomHeight(species);
    const baseRadius = TreeSpeciesManager.getRandomTrunkRadius(species);

    console.log(`🌲 Creating ${species} tree: height=${height.toFixed(2)}, radius=${baseRadius.toFixed(2)}`);

    // Create trunk with bottom at Y=0, top at Y=height
    const trunk = this.createRealisticTrunk(species, height, baseRadius);
    tree.add(trunk);

    // Create branch system based on species
    if (species === TreeSpeciesType.OAK) {
      const branches = this.createOakBranchSystem(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
    } else if (species === TreeSpeciesType.PINE) {
      const foliage = this.createRealisticPineCones(species, height);
      foliage.forEach(cone => tree.add(cone));
    } else if (species === TreeSpeciesType.BIRCH) {
      const branches = this.createBirchBranchSystem(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
    } else if (species === TreeSpeciesType.WILLOW) {
      const branches = this.createWillowBranchSystem(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
    } else if (species === TreeSpeciesType.DEAD) {
      const branches = this.createDeadTreeBranches(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
    }

    // Position tree
    tree.position.copy(position);
    const scale = 0.7 + Math.random() * 0.6;
    tree.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createRealisticTrunk(species: TreeSpeciesType, height: number, baseRadius: number): THREE.Mesh {
    const segments = 16;
    const heightSegments = 12;
    
    const geometry = new THREE.CylinderGeometry(
      baseRadius * 0.3, // Top radius
      baseRadius,       // Bottom radius
      height,
      segments,
      heightSegments
    );

    this.applyOrganicDeformation(geometry, species, height);
    const material = this.createAdvancedTrunkMaterial(species);

    const trunk = new THREE.Mesh(geometry, material);
    // Position trunk so bottom is at Y=0 and top is at Y=height
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

  private createOakBranchSystem(treeHeight: number, trunkBaseRadius: number): THREE.Object3D[] {
    const allBranches: THREE.Object3D[] = [];
    const mainBranchCount = 4 + Math.floor(Math.random() * 3);
    
    console.log(`🌳 Creating ${mainBranchCount} main oak branches`);
    
    for (let i = 0; i < mainBranchCount; i++) {
      // Calculate attachment point
      const attachmentHeight = treeHeight * (0.4 + Math.random() * 0.3); // 40-70% up the trunk
      const angle = (i / mainBranchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      
      // Calculate trunk radius at attachment height
      const heightRatio = attachmentHeight / treeHeight;
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.7); // Trunk tapers
      
      // Create main branch
      const branchLength = 4 + Math.random() * 3;
      const branchThickness = trunkRadiusAtHeight * (0.15 + Math.random() * 0.1);
      
      const branch = this.createProperBranch({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint: new THREE.Vector3(
          Math.cos(angle) * trunkRadiusAtHeight,
          attachmentHeight,
          Math.sin(angle) * trunkRadiusAtHeight
        ),
        direction: new THREE.Vector3(Math.cos(angle), 0.3 + Math.random() * 0.2, Math.sin(angle)).normalize(),
        species: TreeSpeciesType.OAK
      });
      
      allBranches.push(branch);
      
      // Create secondary branches from this main branch
      const secondaryCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < secondaryCount; j++) {
        const secondary = this.createSecondaryBranch(branch, j, secondaryCount, branchLength, branchThickness);
        if (secondary) {
          allBranches.push(secondary);
        }
      }
    }
    
    return allBranches;
  }

  private createProperBranch(config: {
    length: number;
    thickness: number;
    attachmentPoint: THREE.Vector3;
    direction: THREE.Vector3;
    species: TreeSpeciesType;
  }): THREE.Group {
    const branchGroup = new THREE.Group();
    
    // Create branch geometry
    const geometry = new THREE.CylinderGeometry(
      config.thickness * 0.3, // Tip radius
      config.thickness,       // Base radius
      config.length,
      8,
      1
    );
    
    // Create material
    const texture = this.textureCache.get('bark');
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      map: texture,
      roughness: 0.9,
      metalness: 0.0
    });
    
    const branchMesh = new THREE.Mesh(geometry, material);
    
    // Position branch mesh at origin in local space
    branchMesh.position.set(0, config.length / 2, 0);
    
    // Calculate branch endpoint for foliage
    const branchEnd = new THREE.Vector3(0, config.length, 0);
    
    // Create foliage at branch end
    const foliage = this.createBranchFoliage(config.species, config.thickness);
    foliage.position.copy(branchEnd);
    
    branchGroup.add(branchMesh);
    branchGroup.add(foliage);
    
    // Position the entire group at attachment point
    branchGroup.position.copy(config.attachmentPoint);
    
    // Orient the branch in the correct direction
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, config.direction);
    branchGroup.setRotationFromQuaternion(quaternion);
    
    branchGroup.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    // Store branch data for secondary branch calculations
    (branchGroup as any).branchData = {
      length: config.length,
      thickness: config.thickness,
      direction: config.direction.clone()
    };
    
    if (this.debugMode) {
      console.log(`  Branch: pos=${config.attachmentPoint.x.toFixed(2)},${config.attachmentPoint.y.toFixed(2)},${config.attachmentPoint.z.toFixed(2)} len=${config.length.toFixed(2)}`);
    }
    
    return branchGroup;
  }

  private createSecondaryBranch(
    parentBranch: THREE.Group,
    index: number,
    totalCount: number,
    parentLength: number,
    parentThickness: number
  ): THREE.Group | null {
    const branchData = (parentBranch as any).branchData;
    if (!branchData) return null;
    
    // Position along parent branch (40-90% along its length)
    const positionRatio = 0.4 + (index / totalCount) * 0.5;
    const localPosition = new THREE.Vector3(0, parentLength * positionRatio, 0);
    
    // Transform to world space
    const worldPosition = localPosition.clone();
    worldPosition.applyQuaternion(parentBranch.quaternion);
    worldPosition.add(parentBranch.position);
    
    // Calculate secondary branch direction (branch off at angle)
    const baseDirection = branchData.direction.clone();
    const sideVector = new THREE.Vector3(-baseDirection.z, 0, baseDirection.x).normalize();
    const randomAngle = (Math.random() - 0.5) * Math.PI * 0.8;
    const upwardBias = 0.1 + Math.random() * 0.2;
    
    const secondaryDirection = baseDirection.clone()
      .multiplyScalar(0.6)
      .add(sideVector.clone().multiplyScalar(Math.sin(randomAngle) * 0.8))
      .add(new THREE.Vector3(0, upwardBias, 0))
      .normalize();
    
    const secondaryLength = parentLength * (0.4 + Math.random() * 0.3);
    const secondaryThickness = parentThickness * (0.4 + Math.random() * 0.2);
    
    return this.createProperBranch({
      length: secondaryLength,
      thickness: secondaryThickness,
      attachmentPoint: worldPosition,
      direction: secondaryDirection,
      species: TreeSpeciesType.OAK
    });
  }

  private createBranchFoliage(species: TreeSpeciesType, branchThickness: number): THREE.Mesh {
    const foliageSize = Math.max(0.8, branchThickness * 8);
    const geometry = new THREE.SphereGeometry(foliageSize, 8, 6);
    
    // Add organic variation
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const variation = (Math.random() - 0.5) * 0.3;
      positions.setX(i, positions.getX(i) * (1 + variation));
      positions.setY(i, positions.getY(i) * (1 + variation));
      positions.setZ(i, positions.getZ(i) * (1 + variation));
    }
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.08, 0.7, 0.35 + Math.random() * 0.15),
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85 + Math.random() * 0.1,
      side: THREE.DoubleSide
    });
    
    const foliage = new THREE.Mesh(geometry, material);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    
    return foliage;
  }

  private createBirchBranchSystem(treeHeight: number, trunkBaseRadius: number): THREE.Object3D[] {
    const branches: THREE.Object3D[] = [];
    const branchCount = 3 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < branchCount; i++) {
      const attachmentHeight = treeHeight * (0.6 + Math.random() * 0.2);
      const angle = (i / branchCount) * Math.PI * 2;
      const heightRatio = attachmentHeight / treeHeight;
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.7);
      
      const branch = this.createProperBranch({
        length: 3 + Math.random() * 1.5,
        thickness: trunkRadiusAtHeight * 0.12,
        attachmentPoint: new THREE.Vector3(
          Math.cos(angle) * trunkRadiusAtHeight,
          attachmentHeight,
          Math.sin(angle) * trunkRadiusAtHeight
        ),
        direction: new THREE.Vector3(Math.cos(angle), -0.1 + Math.random() * 0.2, Math.sin(angle)).normalize(),
        species: TreeSpeciesType.BIRCH
      });
      
      branches.push(branch);
    }
    
    return branches;
  }

  private createWillowBranchSystem(treeHeight: number, trunkBaseRadius: number): THREE.Object3D[] {
    const branches: THREE.Object3D[] = [];
    const branchCount = 6 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
      const attachmentHeight = treeHeight * (0.7 + Math.random() * 0.2);
      const angle = (i / branchCount) * Math.PI * 2;
      const heightRatio = attachmentHeight / treeHeight;
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.7);
      
      const branch = this.createProperBranch({
        length: 5 + Math.random() * 2,
        thickness: trunkRadiusAtHeight * 0.15,
        attachmentPoint: new THREE.Vector3(
          Math.cos(angle) * trunkRadiusAtHeight,
          attachmentHeight,
          Math.sin(angle) * trunkRadiusAtHeight
        ),
        direction: new THREE.Vector3(Math.cos(angle), -0.4 - Math.random() * 0.3, Math.sin(angle)).normalize(),
        species: TreeSpeciesType.WILLOW
      });
      
      branches.push(branch);
    }
    
    return branches;
  }

  private createDeadTreeBranches(treeHeight: number, trunkBaseRadius: number): THREE.Object3D[] {
    const branches: THREE.Object3D[] = [];
    const branchCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const attachmentHeight = treeHeight * (0.4 + Math.random() * 0.4);
      const angle = (i / branchCount) * Math.PI * 2 + Math.random();
      const heightRatio = attachmentHeight / treeHeight;
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.7);
      
      const branchGroup = new THREE.Group();
      
      const geometry = new THREE.CylinderGeometry(
        trunkRadiusAtHeight * 0.04,
        trunkRadiusAtHeight * 0.12,
        2.5 + Math.random() * 1.5,
        6,
        1
      );
      
      const texture = this.textureCache.get('weathered');
      const material = new THREE.MeshStandardMaterial({
        color: 0x2F1B14,
        map: texture,
        roughness: 1.0,
        metalness: 0.0
      });
      
      const branchMesh = new THREE.Mesh(geometry, material);
      branchMesh.position.y = geometry.parameters.height / 2;
      branchGroup.add(branchMesh);
      
      branchGroup.position.set(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      const direction = new THREE.Vector3(Math.cos(angle), Math.random() - 0.2, Math.sin(angle)).normalize();
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      branchGroup.setRotationFromQuaternion(quaternion);
      
      branchGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      branches.push(branchGroup);
    }

    return branches;
  }

  private createRealisticPineCones(species: TreeSpeciesType, height: number): THREE.Mesh[] {
    const cones: THREE.Mesh[] = [];
    
    const totalConeCount = Math.floor(height / 4) + 2;
    const coneCount = totalConeCount - 1;
    
    const startHeight = height * 0.35;
    const endHeight = height * 0.95;
    const coverageHeight = endHeight - startHeight;
    
    const bottomConeRadius = height * 0.25;
    const topConeRadius = height * 0.05;
    const coneHeight = height * 0.25;
    
    const coneSpacing = coverageHeight / (coneCount - 1);
    
    for (let i = 0; i < coneCount; i++) {
      const heightRatio = i / (coneCount - 1);
      const coneRadius = bottomConeRadius * (1 - heightRatio) + topConeRadius * heightRatio;
      
      const geometry = new THREE.ConeGeometry(
        coneRadius,
        coneHeight,
        Math.max(12, Math.floor(coneRadius * 3)),
        1
      );
      
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
      
      const coneY = startHeight + (i * coneSpacing);
      
      if (i === coneCount - 1) {
        cone.position.set(0, height - (coneHeight * 0.4), 0);
      } else {
        cone.position.set(0, coneY + (coneHeight * 0.4), 0);
      }
      
      cone.rotation.y = Math.random() * Math.PI * 0.1;
      cone.castShadow = true;
      cone.receiveShadow = true;
      cones.push(cone);
    }
    
    return cones;
  }

  public dispose(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}
