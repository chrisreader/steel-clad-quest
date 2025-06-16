
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

    // Get tree properties
    const height = TreeSpeciesManager.getRandomHeight(species);
    const baseRadius = TreeSpeciesManager.getRandomTrunkRadius(species);

    // Create trunk first
    const trunk = this.createRealisticTrunk(species, height, baseRadius);
    tree.add(trunk);

    // Create branch system based on species
    if (species === TreeSpeciesType.OAK) {
      const { branches, foliage } = this.createOakTreeSystem(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
      foliage.forEach(leaf => tree.add(leaf));
    } else if (species === TreeSpeciesType.PINE) {
      const foliage = this.createRealisticPineCones(species, height);
      foliage.forEach(cone => tree.add(cone));
    } else if (species === TreeSpeciesType.BIRCH) {
      const { branches, foliage } = this.createBirchTreeSystem(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
      foliage.forEach(leaf => tree.add(leaf));
    } else if (species === TreeSpeciesType.WILLOW) {
      const { branches, foliage } = this.createWillowTreeSystem(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
      foliage.forEach(leaf => tree.add(leaf));
    } else if (species === TreeSpeciesType.DEAD) {
      const branches = this.createDeadTreeBranches(height, baseRadius);
      branches.forEach(branch => tree.add(branch));
    }

    // Position and add natural variation
    tree.position.copy(position);
    const scale = 0.7 + Math.random() * 0.6;
    tree.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createRealisticTrunk(species: TreeSpeciesType, height: number, baseRadius: number): THREE.Mesh {
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

  private createOakTreeSystem(height: number, trunkRadius: number): { branches: THREE.Mesh[], foliage: THREE.Mesh[] } {
    const branches: THREE.Mesh[] = [];
    const foliage: THREE.Mesh[] = [];
    
    // Create 4-6 main branches
    const mainBranchCount = 4 + Math.floor(Math.random() * 3);
    const branchStartHeight = height * 0.4; // Start branches at 40% of tree height
    const branchSpread = height * 0.3; // Branches spread over 30% of height
    
    for (let i = 0; i < mainBranchCount; i++) {
      // Calculate branch properties
      const angle = (i / mainBranchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const branchHeight = branchStartHeight + Math.random() * branchSpread;
      const branchLength = 4 + Math.random() * 3; // 4-7 units long
      const branchThickness = trunkRadius * (0.15 + Math.random() * 0.1); // 15-25% of trunk thickness
      
      // Calculate trunk radius at this height (linear taper)
      const heightRatio = branchHeight / height;
      const trunkRadiusAtHeight = trunkRadius * (1 - heightRatio * 0.7); // 70% taper
      
      // Create main branch
      const mainBranch = this.createRealisticBranch(
        branchLength, 
        branchThickness, 
        trunkRadiusAtHeight,
        branchHeight,
        angle,
        Math.PI / 6 + Math.random() * (Math.PI / 12) // 30-45 degrees upward
      );
      
      branches.push(mainBranch);
      
      // Create 2-4 secondary branches per main branch
      const secondaryCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < secondaryCount; j++) {
        const secondaryBranch = this.createSecondaryBranch(mainBranch, j, secondaryCount, branchLength, branchThickness);
        branches.push(secondaryBranch);
      }
      
      // Create foliage clusters at branch endpoints
      const mainFoliage = this.createBranchEndFoliage(mainBranch, branchLength, 1.5 + Math.random() * 0.8);
      foliage.push(mainFoliage);
      
      // Add foliage to secondary branches
      for (let j = 0; j < secondaryCount; j++) {
        const secFoliage = this.createBranchEndFoliage(branches[branches.length - secondaryCount + j], branchLength * 0.6, 1.0 + Math.random() * 0.5);
        foliage.push(secFoliage);
      }
    }
    
    return { branches, foliage };
  }

  private createRealisticBranch(
    length: number, 
    baseThickness: number, 
    trunkRadiusAtHeight: number,
    attachmentHeight: number,
    horizontalAngle: number,
    upwardAngle: number
  ): THREE.Mesh {
    // Create properly tapered branch
    const geometry = new THREE.CylinderGeometry(
      baseThickness * 0.3, // Tip radius
      baseThickness,       // Base radius
      length,
      8
    );
    
    const texture = this.textureCache.get('bark');
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      map: texture,
      roughness: 0.9,
      metalness: 0.0
    });

    const branch = new THREE.Mesh(geometry, material);
    
    // Position branch at trunk surface
    const trunkSurfaceX = Math.cos(horizontalAngle) * trunkRadiusAtHeight;
    const trunkSurfaceZ = Math.sin(horizontalAngle) * trunkRadiusAtHeight;
    
    // Set initial position at trunk surface
    branch.position.set(trunkSurfaceX, attachmentHeight, trunkSurfaceZ);
    
    // Rotate branch to point outward and upward
    branch.rotation.y = horizontalAngle;
    branch.rotation.z = -upwardAngle; // Negative for upward angle
    
    // Move branch so its base is at the trunk surface and it extends outward
    const offsetDistance = length / 2;
    const offsetX = Math.cos(horizontalAngle) * Math.cos(upwardAngle) * offsetDistance;
    const offsetZ = Math.sin(horizontalAngle) * Math.cos(upwardAngle) * offsetDistance;
    const offsetY = Math.sin(upwardAngle) * offsetDistance;
    
    branch.position.x += offsetX;
    branch.position.z += offsetZ;
    branch.position.y += offsetY;
    
    branch.castShadow = true;
    branch.receiveShadow = true;
    
    return branch;
  }

  private createSecondaryBranch(
    parentBranch: THREE.Mesh, 
    index: number, 
    totalCount: number, 
    parentLength: number, 
    parentThickness: number
  ): THREE.Mesh {
    const secondaryLength = parentLength * (0.4 + Math.random() * 0.3); // 40-70% of parent length
    const secondaryThickness = parentThickness * (0.4 + Math.random() * 0.2); // 40-60% of parent thickness
    
    const geometry = new THREE.CylinderGeometry(
      secondaryThickness * 0.3,
      secondaryThickness,
      secondaryLength,
      6
    );
    
    const texture = this.textureCache.get('bark');
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      map: texture,
      roughness: 0.9,
      metalness: 0.0
    });

    const secondaryBranch = new THREE.Mesh(geometry, material);
    
    // Position along parent branch (50-90% along its length)
    const positionRatio = 0.5 + (index / totalCount) * 0.4;
    
    // Calculate position in parent's local space
    const parentLocalY = (positionRatio - 0.5) * parentLength;
    
    // Transform to world space
    const worldPosition = new THREE.Vector3(0, parentLocalY, 0);
    worldPosition.applyQuaternion(parentBranch.quaternion);
    worldPosition.add(parentBranch.position);
    
    secondaryBranch.position.copy(worldPosition);
    
    // Rotate secondary branch
    const branchAngle = parentBranch.rotation.y + (Math.random() - 0.5) * Math.PI / 2;
    const upwardAngle = parentBranch.rotation.z - (Math.PI / 8 + Math.random() * (Math.PI / 8));
    
    secondaryBranch.rotation.y = branchAngle;
    secondaryBranch.rotation.z = upwardAngle;
    
    // Offset to extend from attachment point
    const offsetDistance = secondaryLength / 2;
    const offsetX = Math.cos(branchAngle) * Math.cos(-upwardAngle) * offsetDistance;
    const offsetZ = Math.sin(branchAngle) * Math.cos(-upwardAngle) * offsetDistance;
    const offsetY = Math.sin(-upwardAngle) * offsetDistance;
    
    secondaryBranch.position.x += offsetX;
    secondaryBranch.position.z += offsetZ;
    secondaryBranch.position.y += offsetY;
    
    secondaryBranch.castShadow = true;
    secondaryBranch.receiveShadow = true;
    
    return secondaryBranch;
  }

  private createBranchEndFoliage(branch: THREE.Mesh, branchLength: number, foliageSize: number): THREE.Mesh {
    // Create organic foliage cluster
    const geometry = new THREE.SphereGeometry(foliageSize, 12, 8);
    
    // Apply organic deformation
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const noise = (Math.random() - 0.5) * 0.4;
      positions.setX(i, x + noise);
      positions.setY(i, y + noise);
      positions.setZ(i, z + noise);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.08, 0.7, 0.35 + Math.random() * 0.15),
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88 + Math.random() * 0.1,
      side: THREE.DoubleSide
    });

    const foliage = new THREE.Mesh(geometry, material);
    
    // Position at branch end
    const branchEndOffset = branchLength / 2;
    const endX = Math.cos(branch.rotation.y) * Math.cos(-branch.rotation.z) * branchEndOffset;
    const endZ = Math.sin(branch.rotation.y) * Math.cos(-branch.rotation.z) * branchEndOffset;
    const endY = Math.sin(-branch.rotation.z) * branchEndOffset;
    
    foliage.position.set(
      branch.position.x + endX,
      branch.position.y + endY,
      branch.position.z + endZ
    );
    
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    
    return foliage;
  }

  private createBirchTreeSystem(height: number, trunkRadius: number): { branches: THREE.Mesh[], foliage: THREE.Mesh[] } {
    const branches: THREE.Mesh[] = [];
    const foliage: THREE.Mesh[] = [];
    
    const branchCount = 3 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2;
      const branchHeight = height * (0.6 + Math.random() * 0.2);
      const branchLength = 3 + Math.random() * 1.5;
      const branchThickness = trunkRadius * 0.12;
      
      const heightRatio = branchHeight / height;
      const trunkRadiusAtHeight = trunkRadius * (1 - heightRatio * 0.7);
      
      const branch = this.createRealisticBranch(
        branchLength,
        branchThickness,
        trunkRadiusAtHeight,
        branchHeight,
        angle,
        Math.PI / 8 + Math.random() * (Math.PI / 12) // Drooping characteristic
      );
      
      branches.push(branch);
      
      const branchFoliage = this.createBranchEndFoliage(branch, branchLength, 1.2 + Math.random() * 0.5);
      foliage.push(branchFoliage);
    }
    
    return { branches, foliage };
  }

  private createWillowTreeSystem(height: number, trunkRadius: number): { branches: THREE.Mesh[], foliage: THREE.Mesh[] } {
    const branches: THREE.Mesh[] = [];
    const foliage: THREE.Mesh[] = [];
    
    const branchCount = 6 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2;
      const branchHeight = height * (0.7 + Math.random() * 0.2);
      const branchLength = 5 + Math.random() * 2;
      const branchThickness = trunkRadius * 0.15;
      
      const heightRatio = branchHeight / height;
      const trunkRadiusAtHeight = trunkRadius * (1 - heightRatio * 0.7);
      
      const branch = this.createRealisticBranch(
        branchLength,
        branchThickness,
        trunkRadiusAtHeight,
        branchHeight,
        angle,
        Math.PI / 3 + Math.random() * (Math.PI / 6) // Heavy drooping
      );
      
      branches.push(branch);
      
      // Create flowing foliage for willow
      const willowFoliage = this.createWillowFoliage(branch, branchLength);
      foliage.push(willowFoliage);
    }
    
    return { branches, foliage };
  }

  private createWillowFoliage(branch: THREE.Mesh, branchLength: number): THREE.Mesh {
    // Create elongated curtain geometry
    const geometry = new THREE.CylinderGeometry(0.1, 0.4, 6, 6, 4);
    
    // Deform for flowing effect
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const flowEffect = Math.sin((y + 3) / 6 * Math.PI) * 0.3;
      positions.setX(i, positions.getX(i) + flowEffect);
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

    const foliage = new THREE.Mesh(geometry, material);
    
    // Position at branch end
    const branchEndOffset = branchLength / 2;
    const endX = Math.cos(branch.rotation.y) * Math.cos(-branch.rotation.z) * branchEndOffset;
    const endZ = Math.sin(branch.rotation.y) * Math.cos(-branch.rotation.z) * branchEndOffset;
    const endY = Math.sin(-branch.rotation.z) * branchEndOffset;
    
    foliage.position.set(
      branch.position.x + endX,
      branch.position.y + endY - 3, // Offset down for hanging effect
      branch.position.z + endZ
    );
    
    foliage.rotation.copy(branch.rotation);
    
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    
    return foliage;
  }

  private createDeadTreeBranches(height: number, trunkRadius: number): THREE.Mesh[] {
    const branches: THREE.Mesh[] = [];
    const branchCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random();
      const branchHeight = height * (0.4 + Math.random() * 0.4);
      const branchLength = 2.5 + Math.random() * 1.5;
      const branchThickness = trunkRadius * 0.12;
      
      const heightRatio = branchHeight / height;
      const trunkRadiusAtHeight = trunkRadius * (1 - heightRatio * 0.7);
      
      const branch = this.createRealisticBranch(
        branchLength,
        branchThickness,
        trunkRadiusAtHeight,
        branchHeight,
        angle,
        Math.random() * Math.PI / 2 // Broken, jagged angles
      );
      
      // Apply weathered material
      const texture = this.textureCache.get('weathered');
      branch.material = new THREE.MeshStandardMaterial({
        color: 0x2F1B14,
        map: texture,
        roughness: 1.0,
        metalness: 0.0
      });
      
      branches.push(branch);
    }

    return branches;
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

  public dispose(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}
