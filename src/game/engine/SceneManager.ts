import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
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
  private progressBarDiv: HTMLDivElement;
  private progressLabelDiv: HTMLDivElement;
  private loadingManager: THREE.LoadingManager;
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
    
    // Loading progress bar
    this.progressBarDiv = document.createElement('div');
    this.progressBarDiv.style.position = 'absolute';
    this.progressBarDiv.style.top = '50%';
    this.progressBarDiv.style.left = '50%';
    this.progressBarDiv.style.transform = 'translate(-50%, -50%)';
    this.progressBarDiv.style.width = '50%';
    this.progressBarDiv.style.height = '20px';
    this.progressBarDiv.style.backgroundColor = '#333';
    this.progressBarDiv.style.borderRadius = '10px';
    this.progressBarDiv.style.overflow = 'hidden';
    this.progressBarDiv.style.zIndex = '1000';
    
    const progressInnerDiv = document.createElement('div');
    progressInnerDiv.style.width = '0%';
    progressInnerDiv.style.height = '100%';
    progressInnerDiv.style.backgroundColor = '#4CAF50';
    progressInnerDiv.style.borderRadius = '10px';
    progressInnerDiv.id = 'progressInner';
    this.progressBarDiv.appendChild(progressInnerDiv);
    
    this.progressLabelDiv = document.createElement('div');
    this.progressLabelDiv.style.position = 'absolute';
    this.progressLabelDiv.style.top = 'calc(50% - 30px)';
    this.progressLabelDiv.style.left = '50%';
    this.progressLabelDiv.style.transform = 'translateX(-50%)';
    this.progressLabelDiv.style.color = 'white';
    this.progressLabelDiv.style.fontSize = '16px';
    this.progressLabelDiv.style.zIndex = '1001';
    this.progressLabelDiv.id = 'progressLabel';
    this.mountElement.appendChild(this.progressLabelDiv);
    
    this.mountElement.appendChild(this.progressBarDiv);
    
    // Loading manager
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = (itemsLoaded / itemsTotal) * 100;
      this.updateProgressBar(progress);
    };
    
    this.loadingManager.onLoad = () => {
      this.hideProgressBar();
    };
    
    this.loadingManager.onError = (url) => {
      console.error('Error loading: ' + url);
    };
    
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
    if (this.loadingProgressCallback) {
      this.loadingProgressCallback({ stage, progress, total });
    }
  }
  
  private updateProgressBar(progress: number): void {
    const progressInner = document.getElementById('progressInner') as HTMLDivElement;
    if (progressInner) {
      progressInner.style.width = `${progress}%`;
    }
  }
  
  private hideProgressBar(): void {
    if (this.progressBarDiv && this.progressLabelDiv) {
      this.mountElement.removeChild(this.progressBarDiv);
      this.mountElement.removeChild(this.progressLabelDiv);
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
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);
  }
  
  private async createTerrain(): Promise<void> {
    console.log('[SceneManager] Creating terrain...');
    
    // Load heightmap
    const textureLoader = new THREE.TextureLoader(this.loadingManager);
    const heightMap = await textureLoader.loadAsync('/heightmap.png');
    
    // Create geometry from heightmap
    const geometry = new THREE.PlaneGeometry(200, 200, 256, 256);
    const vertices = geometry.attributes.position.array as Array<number>;
    
    const canvas = document.createElement('canvas');
    canvas.width = heightMap.image.width;
    canvas.height = heightMap.image.height;
    const ctx = canvas.getContext('2d');
    ctx!.drawImage(heightMap.image, 0, 0, canvas.width, canvas.height);
    const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height).data;
    
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 4) {
      // Set height based on red channel value
      vertices[i * 3 + 1] = imageData[j] / 8;
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
    
    console.log('[SceneManager] Terrain created');
  }
  
  private isPositionTooClose(position: THREE.Vector3, existingPositions: THREE.Vector3[], minDistance: number): boolean {
    for (const existingPosition of existingPositions) {
      if (position.distanceTo(existingPosition) < minDistance) {
        return true;
      }
    }
    return false;
  }
  
  private async createTrees(count: number = 10): Promise<void> {
    console.log(`[SceneManager] Creating ${count} trees...`);
    
    const treePositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate valid position
      let position: THREE.Vector3;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          0,
          (Math.random() - 0.5) * 200
        );
        attempts++;
      } while (attempts < maxAttempts && this.isPositionTooClose(position, treePositions, 5));
      
      treePositions.push(position);
      
      // Create tree geometry
      const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 12);
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color(0x8B4513).multiplyScalar(0.7 + Math.random() * 0.3)
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.copy(position);
      trunk.position.y = 1;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      this.scene.add(trunk);
      
      // Create leaves geometry
      const leavesGeometry = new THREE.SphereGeometry(1 + Math.random() * 0.5, 12, 8);
      const leavesMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color(0x228B22).multiplyScalar(0.7 + Math.random() * 0.3)
      });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.copy(position);
      leaves.position.y = 3;
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      this.scene.add(leaves);
      
      // Yield control occasionally for async behavior
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    console.log(`[SceneManager] Created ${treePositions.length} trees`);
  }
  
  private async createRocks(count: number = 10): Promise<void> {
    console.log(`[SceneManager] Creating ${count} rocks...`);
    
    const rockPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate valid position
      let position: THREE.Vector3;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          0,
          (Math.random() - 0.5) * 200
        );
        attempts++;
      } while (attempts < maxAttempts && this.isPositionTooClose(position, rockPositions, 2));
      
      rockPositions.push(position);
      
      // Create rock geometry
      const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.5);
      const rockMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color(0x808080).multiplyScalar(0.7 + Math.random() * 0.3)
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.copy(position);
      rock.position.y = rockGeometry.parameters.radius * 0.6;
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      this.scene.add(rock);
      
      // Yield control occasionally for async behavior
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    console.log(`[SceneManager] Created ${rockPositions.length} rocks`);
  }
  
  private async createBushes(count: number = 10): Promise<void> {
    console.log(`[SceneManager] Creating ${count} bushes...`);
    
    const bushPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate valid position
      let position: THREE.Vector3;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          0,
          (Math.random() - 0.5) * 200
        );
        attempts++;
      } while (attempts < maxAttempts && this.isPositionTooClose(position, [...bushPositions], 3));
      
      bushPositions.push(position);
      
      // Create bush geometry
      const bushGeometry = new THREE.SphereGeometry(
        0.8 + Math.random() * 0.4,
        12,
        8
      );
      
      const bushMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color(0x228B22).multiplyScalar(0.7 + Math.random() * 0.3)
      });
      
      const bush = new THREE.Mesh(bushGeometry, bushMaterial);
      bush.position.copy(position);
      bush.position.y = bushGeometry.parameters.radius * 0.7;
      bush.castShadow = true;
      bush.receiveShadow = true;
      
      this.scene.add(bush);
      
      // Yield control occasionally for async behavior
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    console.log(`[SceneManager] Created ${bushPositions.length} bushes`);
  }
  
  private async createTavern(): Promise<void> {
    console.log('[SceneManager] Creating tavern...');
    
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    
    gltfLoader.load(
      '/tavern.glb',
      (gltf) => {
        const tavern = gltf.scene;
        tavern.position.set(0, 0, 0);
        tavern.scale.set(0.02, 0.02, 0.02);
        tavern.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        this.scene.add(tavern);
        console.log('[SceneManager] Tavern loaded and added to scene');
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('An error happened', error);
      }
    );
  }
  
  private createSkybox(): void {
    console.log('[SceneManager] Creating skybox...');
    
    const skyTexture = TextureGenerator.createSkyTexture();
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skybox);
    
    console.log('[SceneManager] Skybox created');
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
