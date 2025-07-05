import * as THREE from 'three';
import { TreeSpeciesType } from '../world/vegetation/TreeSpecies';

interface BillboardTexture {
  texture: THREE.Texture;
  width: number;
  height: number;
  species: TreeSpeciesType;
  scale: number;
}

interface BillboardObject {
  id: string;
  billboard: THREE.Mesh;
  originalMesh: THREE.Object3D;
  position: THREE.Vector3;
  species: TreeSpeciesType;
  scale: number;
  isVisible: boolean;
  isBillboard: boolean;
  lastStateChange: number; // Track last state change for cooldown
}

export class BillboardSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  // Billboard management
  private billboardObjects: Map<string, BillboardObject> = new Map();
  private billboardTextures: Map<TreeSpeciesType, BillboardTexture[]> = new Map();
  private billboardAtlas: THREE.Texture | null = null;
  
  // Distance thresholds with hysteresis
  private readonly BILLBOARD_START_DISTANCE = 80;
  private readonly BILLBOARD_RETURN_DISTANCE = 75; // Hysteresis to prevent rapid switching
  private readonly BILLBOARD_FADE_RANGE = 20; // 70-90 units for smooth transition
  private readonly MAX_RENDER_DISTANCE = 200;
  
  // Performance tracking
  private lastUpdateTime = 0;
  private readonly UPDATE_INTERVAL = 16; // Update at ~60fps for smooth transitions
  
  // State change cooldown to prevent flickering
  private readonly STATE_CHANGE_COOLDOWN = 500; // 500ms minimum between state changes
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.initializeBillboardTextures();
    console.log('🖼️ [BillboardSystem] Initialized with distance-based LOD (80+ units → billboards)');
  }
  
  private initializeBillboardTextures(): void {
    // Pre-generate high-quality billboard textures for each tree species
    const species = [TreeSpeciesType.OAK, TreeSpeciesType.BIRCH, TreeSpeciesType.WILLOW, TreeSpeciesType.DEAD, TreeSpeciesType.PINE];
    
    species.forEach(speciesType => {
      const textures: BillboardTexture[] = [];
      
      // Create 8 directional views for each species (45° intervals)
      for (let angle = 0; angle < 8; angle++) {
        const texture = this.generateBillboardTexture(speciesType, angle * (Math.PI / 4));
        textures.push({
          texture,
          width: 512,
          height: 512,
          species: speciesType,
          scale: 1.0
        });
      }
      
      this.billboardTextures.set(speciesType, textures);
    });
    
    console.log(`🖼️ [BillboardSystem] Generated ${species.length * 8} high-quality billboard textures`);
  }
  
  private generateBillboardTexture(species: TreeSpeciesType, viewAngle: number): THREE.Texture {
    // Create high-resolution canvas for billboard texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Clear with transparency
    ctx.clearRect(0, 0, 512, 512);
    
    // Generate species-specific tree silhouette
    this.drawTreeSilhouette(ctx, species, viewAngle);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    
    return texture;
  }
  
  private drawTreeSilhouette(ctx: CanvasRenderingContext2D, species: TreeSpeciesType, viewAngle: number): void {
    const centerX = 256;
    const centerY = 400; // Ground level
    
    // Species-specific colors and shapes
    let trunkColor = '#4A4A4A';
    let foliageColor = '#228B22';
    let treeHeight = 200;
    let trunkWidth = 20;
    let crownWidth = 120;
    
    switch (species) {
      case TreeSpeciesType.OAK:
        foliageColor = '#2E8B57';
        crownWidth = 140;
        treeHeight = 220;
        break;
      case TreeSpeciesType.BIRCH:
        trunkColor = '#F8F8F0';
        foliageColor = '#90EE90';
        crownWidth = 80;
        treeHeight = 200;
        trunkWidth = 15;
        break;
      case TreeSpeciesType.WILLOW:
        foliageColor = '#ADFF2F';
        crownWidth = 160;
        treeHeight = 180;
        break;
      case TreeSpeciesType.DEAD:
        foliageColor = '#8B4513';
        crownWidth = 60;
        treeHeight = 160;
        break;
      case TreeSpeciesType.PINE:
        foliageColor = '#006400';
        crownWidth = 60;
        treeHeight = 240;
        break;
    }
    
    // Draw trunk
    ctx.fillStyle = trunkColor;
    const trunkHeight = treeHeight * 0.3;
    ctx.fillRect(centerX - trunkWidth/2, centerY - trunkHeight, trunkWidth, trunkHeight);
    
    // Add trunk texture for birch
    if (species === TreeSpeciesType.BIRCH) {
      ctx.fillStyle = '#1C1C1C';
      for (let i = 0; i < 3; i++) {
        const y = centerY - trunkHeight + (i * trunkHeight / 4);
        ctx.fillRect(centerX - trunkWidth/2, y, trunkWidth, 3);
      }
    }
    
    // Draw crown based on species
    ctx.fillStyle = foliageColor;
    
    if (species === TreeSpeciesType.PINE) {
      // Pine tree - triangular shape with layers
      for (let layer = 0; layer < 4; layer++) {
        const layerY = centerY - trunkHeight - (layer * 30);
        const layerWidth = crownWidth - (layer * 15);
        
        ctx.beginPath();
        ctx.moveTo(centerX, layerY - 40);
        ctx.lineTo(centerX - layerWidth/2, layerY);
        ctx.lineTo(centerX + layerWidth/2, layerY);
        ctx.closePath();
        ctx.fill();
      }
    } else if (species === TreeSpeciesType.WILLOW) {
      // Willow - drooping branches
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - trunkHeight - 40, crownWidth/2, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Drooping branches
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const startX = centerX + Math.cos(angle) * (crownWidth/3);
        const startY = centerY - trunkHeight - 20;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
          startX + Math.cos(angle) * 20,
          startY + 40,
          startX + Math.cos(angle) * 10,
          centerY - 20
        );
        ctx.lineWidth = 3;
        ctx.strokeStyle = foliageColor;
        ctx.stroke();
      }
    } else {
      // Standard tree crown - organic irregular shape
      const crownY = centerY - trunkHeight - 60;
      
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
        const noise = (Math.sin(angle * 4) * 0.3 + Math.cos(angle * 6) * 0.2) * 20;
        const radius = (crownWidth/2) + noise;
        const x = centerX + Math.cos(angle) * radius;
        const y = crownY + Math.sin(angle) * (radius * 0.7);
        
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }
    
    // Add subtle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 5, trunkWidth + 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  public registerTree(id: string, treeMesh: THREE.Object3D, species: TreeSpeciesType): void {
    if (this.billboardObjects.has(id)) return;
    
    // Create billboard mesh
    const billboardGeometry = new THREE.PlaneGeometry(1, 1);
    const billboardMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });
    
    const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
    billboard.position.copy(treeMesh.position);
    billboard.visible = false; // Start invisible
    billboard.userData.isBillboard = true; // Mark as billboard for exclusion from frustum culling
    
    const billboardObject: BillboardObject = {
      id,
      billboard,
      originalMesh: treeMesh,
      position: treeMesh.position.clone(),
      species,
      scale: treeMesh.scale.x,
      isVisible: true,
      isBillboard: false,
      lastStateChange: 0
    };
    
    this.billboardObjects.set(id, billboardObject);
    this.scene.add(billboard);
  }
  
  public update(playerPosition: THREE.Vector3): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) return;
    
    this.lastUpdateTime = now;
    
    this.billboardObjects.forEach((obj, id) => {
      const distance = playerPosition.distanceTo(obj.position);
      
      // Check if enough time has passed since last state change (cooldown)
      const timeSinceLastChange = now - obj.lastStateChange;
      const canChangeState = timeSinceLastChange >= this.STATE_CHANGE_COOLDOWN;
      
      // Use hysteresis to prevent rapid switching
      const shouldUseBillboard = obj.isBillboard 
        ? distance >= this.BILLBOARD_RETURN_DISTANCE // Use lower threshold to return to 3D
        : distance >= this.BILLBOARD_START_DISTANCE; // Use higher threshold to switch to billboard
      
      // Only change state if cooldown has passed and distance threshold is crossed
      if (canChangeState) {
        if (shouldUseBillboard && !obj.isBillboard) {
          // Switch to billboard
          this.switchToBillboard(obj, playerPosition, now);
        } else if (!shouldUseBillboard && obj.isBillboard) {
          // Switch back to 3D
          this.switchTo3D(obj, now);
        }
      }
      
      // Update billboard orientation if using billboard (but don't change texture constantly)
      if (obj.isBillboard && obj.billboard.visible) {
        this.updateBillboardOrientation(obj, playerPosition);
      }
      
      // Handle smooth fade transitions with easing
      this.handleSmoothFadeTransition(obj, distance);
      
      // Cull distant objects
      if (distance > this.MAX_RENDER_DISTANCE) {
        obj.originalMesh.visible = false;
        obj.billboard.visible = false;
        obj.isVisible = false;
      } else if (!obj.isVisible) {
        obj.isVisible = true;
      }
    });
  }
  
  private switchToBillboard(obj: BillboardObject, playerPosition: THREE.Vector3, now: number): void {
    obj.originalMesh.visible = false;
    obj.billboard.visible = true;
    obj.isBillboard = true;
    obj.lastStateChange = now;
    
    // Set appropriate scale for billboard
    const distance = playerPosition.distanceTo(obj.position);
    const scale = obj.scale * Math.min(2.5, distance / 50); // Scale with distance
    obj.billboard.scale.set(scale, scale, scale);
    
    // Set initial billboard texture (use first texture to avoid switching)
    const textures = this.billboardTextures.get(obj.species);
    if (textures && textures.length > 0) {
      const material = obj.billboard.material as THREE.MeshBasicMaterial;
      material.map = textures[0].texture; // Use first texture only to prevent switching
      material.needsUpdate = true;
    }
  }
  
  private switchTo3D(obj: BillboardObject, now: number): void {
    obj.billboard.visible = false;
    obj.originalMesh.visible = true;
    obj.isBillboard = false;
    obj.lastStateChange = now;
  }
  
  private updateBillboardOrientation(obj: BillboardObject, playerPosition: THREE.Vector3): void {
    // Make billboard face the camera
    obj.billboard.lookAt(playerPosition);
    obj.billboard.rotateY(Math.PI); // Flip to face correctly
  }
  
  private updateBillboardTexture(obj: BillboardObject, playerPosition: THREE.Vector3): void {
    const textures = this.billboardTextures.get(obj.species);
    if (!textures || textures.length === 0) return;
    
    // Calculate viewing angle to select appropriate texture
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, obj.position)
      .normalize();
    
    const angle = Math.atan2(direction.x, direction.z);
    const normalizedAngle = ((angle + Math.PI) / (Math.PI * 2)) * 8; // 0-8 range
    const textureIndex = Math.floor(normalizedAngle) % 8;
    
    const material = obj.billboard.material as THREE.MeshBasicMaterial;
    material.map = textures[textureIndex].texture;
    material.needsUpdate = true;
  }
  
  private handleSmoothFadeTransition(obj: BillboardObject, distance: number): void {
    const material = obj.billboard.material as THREE.MeshBasicMaterial;
    
    // Calculate fade range based on new larger transition zone (70-90 units)
    const fadeStart = this.BILLBOARD_START_DISTANCE - this.BILLBOARD_FADE_RANGE / 2; // 70 units
    const fadeEnd = this.BILLBOARD_START_DISTANCE + this.BILLBOARD_FADE_RANGE / 2;   // 90 units
    
    if (distance >= fadeStart && distance <= fadeEnd) {
      // Smooth fade transition with easing
      const normalizedDistance = (distance - fadeStart) / this.BILLBOARD_FADE_RANGE;
      
      // Use ease-in-out cubic easing for smooth transitions
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      
      const fadeProgress = easeInOutCubic(normalizedDistance);
      
      // Fade out 3D mesh
      if (obj.originalMesh.traverse) {
        obj.originalMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const childMaterial = child.material as THREE.Material;
            if ('opacity' in childMaterial) {
              (childMaterial as any).transparent = true;
              (childMaterial as any).opacity = Math.max(0.0, 1.0 - fadeProgress);
            }
          }
        });
      }
      
      // Fade in billboard
      material.transparent = true;
      material.opacity = Math.max(0.0, fadeProgress);
      
    } else if (distance < fadeStart) {
      // Full 3D visibility - ensure billboard is hidden
      material.opacity = 0.0;
      if (obj.originalMesh.traverse) {
        obj.originalMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const childMaterial = child.material as THREE.Material;
            if ('opacity' in childMaterial) {
              (childMaterial as any).opacity = 1.0;
              (childMaterial as any).transparent = false;
            }
          }
        });
      }
    } else {
      // Full billboard visibility - ensure 3D mesh is hidden
      material.opacity = 1.0;
      if (obj.originalMesh.traverse) {
        obj.originalMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const childMaterial = child.material as THREE.Material;
            if ('opacity' in childMaterial) {
              (childMaterial as any).opacity = 0.0;
              (childMaterial as any).transparent = true;
            }
          }
        });
      }
    }
  }
  
  public unregisterTree(id: string): void {
    const obj = this.billboardObjects.get(id);
    if (obj) {
      this.scene.remove(obj.billboard);
      obj.billboard.geometry.dispose();
      (obj.billboard.material as THREE.Material).dispose();
      this.billboardObjects.delete(id);
    }
  }
  
  public getBillboardCount(): number {
    let count = 0;
    this.billboardObjects.forEach(obj => {
      if (obj.isBillboard && obj.billboard.visible) count++;
    });
    return count;
  }
  
  public get3DTreeCount(): number {
    let count = 0;
    this.billboardObjects.forEach(obj => {
      if (!obj.isBillboard && obj.originalMesh.visible) count++;
    });
    return count;
  }
  
  public dispose(): void {
    this.billboardObjects.forEach((obj, id) => {
      this.unregisterTree(id);
    });
    
    // Dispose billboard textures
    this.billboardTextures.forEach(textures => {
      textures.forEach(textureData => {
        textureData.texture.dispose();
      });
    });
    
    console.log('🖼️ [BillboardSystem] Disposed all billboard resources');
  }
}