import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator';

interface LoadingProgress {
  stage: string;
  progress: number;
  total: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mountElement: HTMLDivElement;
  private loadingProgressCallback?: (progress: LoadingProgress) => void;
  private terrain: THREE.Mesh | null = null;
  
  constructor(mountElement: HTMLDivElement) {
    console.log('[SceneManager] Constructor called');
    
    this.mountElement = mountElement;
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      mountElement.clientWidth / mountElement.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(mountElement.clientWidth, mountElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    mountElement.appendChild(this.renderer.domElement);
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log('[SceneManager] SceneManager constructed successfully');
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public setLoadingProgressCallback(callback: (progress: LoadingProgress) => void): void {
    this.loadingProgressCallback = callback;
  }
  
  private updateProgress(stage: string, progress: number, total: number): void {
    console.log(`[SceneManager] Progress: ${stage} (${progress}/${total})`);
    if (this.loadingProgressCallback) {
      this.loadingProgressCallback({ stage, progress, total });
    }
  }
  
  private handleResize(): void {
    // Update camera aspect ratio
    this.camera.aspect = this.mountElement.clientWidth / this.mountElement.clientHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(this.mountElement.clientWidth, this.mountElement.clientHeight);
  }
  
  private clearScene(): void {
    // Dispose of all objects in the scene
    this.scene.children.forEach((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
      this.scene.remove(object);
    });
    
    // Dispose of the terrain if it exists
    if (this.terrain) {
      this.terrain.geometry.dispose();
      if (Array.isArray(this.terrain.material)) {
        this.terrain.material.forEach(material => material.dispose());
      } else {
        this.terrain.material.dispose();
      }
      this.scene.remove(this.terrain);
      this.terrain = null;
    }
  }
  
  private setupLighting(): void {
    console.log('[SceneManager] Setting up lighting...');
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);
    
    console.log('[SceneManager] Lighting setup complete');
  }
  
  private async createTerrain(): Promise<void> {
    console.log('[SceneManager] Creating procedural terrain...');
    
    // Create simple procedural terrain without external heightmap
    const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
    const vertices = geometry.attributes.position.array as Float32Array;
    
    // Generate procedural height variation
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      // Simple noise-like height variation
      vertices[i + 1] = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 + 
                        Math.sin(x * 0.02) * Math.cos(z * 0.03) * 1;
    }
    
    geometry.computeVertexNormals();
    
    // Create texture
    const grassTexture = TextureGenerator.createGrassTexture();
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(16, 16);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({ map: grassTexture });
    
    // Create mesh
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
    
    console.log('[SceneManager] Procedural terrain created');
  }
  
  private isPositionTooClose(position: THREE.Vector3, existingPositions: THREE.Vector3[], minDistance: number): boolean {
    for (const existingPosition of existingPositions) {
      if (position.distanceTo(existingPosition) < minDistance) {
        return true;
      }
    }
    return false;
  }
  
  private async createTrees(count: number = 8): Promise<void> {
    console.log(`[SceneManager] Creating ${count} trees...`);
    
    const treePositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate valid position
      let position: THREE.Vector3;
      let attempts = 0;
      const maxAttempts = 20;
      
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          0,
          (Math.random() - 0.5) * 100
        );
        attempts++;
      } while (attempts < maxAttempts && this.isPositionTooClose(position, treePositions, 8));
      
      treePositions.push(position);
      
      // Create tree geometry
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.copy(position);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      this.scene.add(trunk);
      
      // Create leaves geometry
      const leavesGeometry = new THREE.SphereGeometry(1.2, 8, 6);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.copy(position);
      leaves.position.y = 3.5;
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      this.scene.add(leaves);
    }
    
    console.log(`[SceneManager] Created ${treePositions.length} trees`);
  }
  
  private async createRocks(count: number = 6): Promise<void> {
    console.log(`[SceneManager] Creating ${count} rocks...`);
    
    const rockPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      let position: THREE.Vector3;
      let attempts = 0;
      const maxAttempts = 20;
      
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 120,
          0,
          (Math.random() - 0.5) * 120
        );
        attempts++;
      } while (attempts < maxAttempts && this.isPositionTooClose(position, rockPositions, 5));
      
      rockPositions.push(position);
      
      // Create rock geometry
      const rockGeometry = new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.4);
      const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.copy(position);
      rock.position.y = rockGeometry.parameters.radius * 0.6;
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      this.scene.add(rock);
    }
    
    console.log(`[SceneManager] Created ${rockPositions.length} rocks`);
  }
  
  private async createSimpleTavern(): Promise<void> {
    console.log('[SceneManager] Creating simple geometric tavern...');
    
    // Create tavern base
    const baseGeometry = new THREE.BoxGeometry(8, 4, 6);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, 2, -10);
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    
    // Create roof
    const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 5.5, -10);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.scene.add(roof);
    
    // Create door
    const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x4A4A4A });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, -6.9);
    this.scene.add(door);
    
    console.log('[SceneManager] Simple tavern created');
  }
  
  private createSkybox(): void {
    console.log('[SceneManager] Creating skybox...');
    
    const skyTexture = TextureGenerator.createSkyTexture();
    const skyGeometry = new THREE.SphereGeometry(400, 16, 16);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skybox);
    
    console.log('[SceneManager] Skybox created');
  }
  
  public async createWorld(): Promise<void> {
    console.log('[SceneManager] Creating world...');
    
    try {
      this.updateProgress('Setting up lighting...', 1, 6);
      this.setupLighting();
      
      this.updateProgress('Creating skybox...', 2, 6);
      this.createSkybox();
      
      this.updateProgress('Creating terrain...', 3, 6);
      await this.createTerrain();
      
      this.updateProgress('Creating trees...', 4, 6);
      await this.createTrees(8);
      
      this.updateProgress('Creating rocks...', 5, 6);
      await this.createRocks(6);
      
      this.updateProgress('Creating tavern...', 6, 6);
      await this.createSimpleTavern();
      
      console.log('[SceneManager] World creation complete');
      
    } catch (error) {
      console.error('[SceneManager] World creation failed:', error);
      this.updateProgress('World creation failed, continuing...', 6, 6);
    }
  }
  
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  public dispose(): void {
    console.log('[SceneManager] Disposing of SceneManager...');
    
    // Cancel any ongoing animations
    this.renderer.dispose();
    
    // Clear and dispose of the scene
    this.clearScene();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Remove the renderer from the DOM
    this.mountElement.removeChild(this.renderer.domElement);
    
    console.log('[SceneManager] SceneManager disposed');
  }
}
