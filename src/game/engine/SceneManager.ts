import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator';
import { Level, TerrainConfig, TerrainFeature, LightingConfig } from '../../types/GameTypes';

export interface LoadingProgress {
  stage: string;
  progress: number;
  total: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private width: number;
  private height: number;
  
  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private tavernLight: THREE.PointLight;
  private rimLight: THREE.DirectionalLight;
  
  // Environment
  private currentLevel: Level | null = null;
  private skybox: THREE.Mesh | null = null;
  private fog: THREE.Fog | null = null;
  private ground: THREE.Mesh | null = null;
  
  // Time of day
  private timeOfDay: number = 0.5;
  private dayNightCycleEnabled: boolean = false;
  private dayNightCycleSpeed: number = 0.001;
  
  // Loading progress callback
  private onLoadingProgress?: (progress: LoadingProgress) => void;
  
  constructor(mountElement: HTMLDivElement) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.clock = new THREE.Clock();
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xB0E0E6, 50, 150);
    this.fog = this.scene.fog;
    
    // Create camera with proper first-person position
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 1.8, 5); // Eye level height (1.8m)
    console.log("Camera created at first-person position:", this.camera.position);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xB0E0E6);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;
    
    // Add renderer to DOM
    mountElement.appendChild(this.renderer.domElement);
    console.log("Renderer added to DOM, canvas size:", this.width, "x", this.height);
    
    // Setup pointer lock for first-person controls
    this.setupPointerLock(mountElement);
    
    // Setup basic lighting
    this.setupLighting();
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  private setupPointerLock(element: HTMLDivElement): void {
    const canvas = this.renderer.domElement;
    
    // Request pointer lock on canvas click
    canvas.addEventListener('click', () => {
      console.log('Canvas clicked, requesting pointer lock');
      canvas.requestPointerLock();
    });
    
    // Handle pointer lock events
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === canvas) {
        console.log('Pointer lock activated');
        document.addEventListener('mousemove', this.handleMouseMove);
      } else {
        console.log('Pointer lock deactivated');
        document.removeEventListener('mousemove', this.handleMouseMove);
      }
    });
    
    document.addEventListener('pointerlockerror', () => {
      console.error('Pointer lock failed');
    });
  }
  
  private handleMouseMove = (event: MouseEvent): void => {
    const sensitivity = 0.002;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    console.log('Mouse movement detected:', movementX, movementY);
    
    // Dispatch custom event for mouse look
    const lookEvent = new CustomEvent('gameInput', {
      detail: {
        type: 'look',
        data: {
          x: movementX * sensitivity,
          y: movementY * sensitivity
        }
      }
    });
    document.dispatchEvent(lookEvent);
  };
  
  public setLoadingProgressCallback(callback: (progress: LoadingProgress) => void): void {
    this.onLoadingProgress = callback;
  }
  
  private updateLoadingProgress(stage: string, progress: number, total: number): void {
    if (this.onLoadingProgress) {
      this.onLoadingProgress({ stage, progress, total });
    }
    console.log(`Loading: ${stage} (${progress}/${total})`);
  }
  
  private setupLighting(): void {
    // Ambient light - increased intensity for better visibility
    this.ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(this.ambientLight);
    console.log("Ambient light added with intensity 1.5");
    
    // Directional light (sun) - increased intensity
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(15, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);
    console.log("Directional light added at position:", this.directionalLight.position);
    
    // Tavern light (warm)
    this.tavernLight = new THREE.PointLight(0xffa500, 1.0, 25);
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = 512;
    this.tavernLight.shadow.mapSize.height = 512;
    this.scene.add(this.tavernLight);
    console.log("Tavern light added");
    
    // Rim light for atmosphere
    this.rimLight = new THREE.DirectionalLight(0xB0E0E6, 0.6);
    this.rimLight.position.set(-10, 5, -10);
    this.scene.add(this.rimLight);
    console.log("Rim light added");
  }
  
  public async createDefaultWorld(): Promise<void> {
    console.log('Creating optimized default world...');
    
    const totalStages = 6;
    let currentStage = 0;
    
    // Create terrain
    this.updateLoadingProgress('Creating terrain', ++currentStage, totalStages);
    await this.createTerrain();
    
    // Create tavern
    this.updateLoadingProgress('Building tavern', ++currentStage, totalStages);
    await this.createSimplifiedTavern();
    
    // Create forest (reduced count)
    this.updateLoadingProgress('Planting forest', ++currentStage, totalStages);
    await this.createOptimizedForest();
    
    // Create rocks (reduced count)
    this.updateLoadingProgress('Placing rocks', ++currentStage, totalStages);
    await this.createOptimizedRocks();
    
    // Create bushes (reduced count)
    this.updateLoadingProgress('Growing bushes', ++currentStage, totalStages);
    await this.createOptimizedBushes();
    
    // Create skybox
    this.updateLoadingProgress('Painting sky', ++currentStage, totalStages);
    await this.createSkybox();
    
    console.log('Optimized world creation complete. Total scene children:', this.scene.children.length);
  }
  
  private async createTerrain(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 25, 25); // Reduced detail
        const groundMaterial = new THREE.MeshLambertMaterial({ 
          color: 0x5FAD5F,
          map: TextureGenerator.createGrassTexture(),
          transparent: false
        });
        
        // Add simplified height variation
        const positions = groundGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 2] = Math.random() * 0.2 - 0.1; // Reduced variation
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        resolve();
      }, 50);
    });
  }
  
  private async createSimplifiedTavern(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const tavernGroup = new THREE.Group();
        
        // Simplified tavern floor
        const tavernFloorGeometry = new THREE.PlaneGeometry(10, 10);
        const tavernFloorMaterial = new THREE.MeshLambertMaterial({ 
          color: 0xDEB887,
          map: TextureGenerator.createWoodTexture()
        });
        const tavernFloor = new THREE.Mesh(tavernFloorGeometry, tavernFloorMaterial);
        tavernFloor.rotation.x = -Math.PI / 2;
        tavernFloor.position.y = 0.01;
        tavernFloor.receiveShadow = true;
        tavernGroup.add(tavernFloor);
        
        // Simplified walls (just 4 walls, no fancy geometry)
        const wallMaterial = new THREE.MeshLambertMaterial({ 
          color: 0x8B7355,
          map: TextureGenerator.createStoneTexture()
        });
        const wallHeight = 5;
        
        // Create 4 simple walls
        const wallPositions = [
          { pos: [0, wallHeight/2, -5], rot: [0, 0, 0], size: [10, wallHeight, 0.3] },
          { pos: [0, wallHeight/2, 5], rot: [0, 0, 0], size: [8, wallHeight, 0.3] }, // Front with door gap
          { pos: [-5, wallHeight/2, 0], rot: [0, 0, 0], size: [0.3, wallHeight, 10] },
          { pos: [5, wallHeight/2, 0], rot: [0, 0, 0], size: [0.3, wallHeight, 10] }
        ];
        
        wallPositions.forEach(wall => {
          const wallGeometry = new THREE.BoxGeometry(...wall.size);
          const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial.clone());
          wallMesh.position.set(...wall.pos);
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          tavernGroup.add(wallMesh);
        });
        
        // Simple roof
        const roofGeometry = new THREE.ConeGeometry(7, 2, 6);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xCD5C5C });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, wallHeight + 1, 0);
        roof.castShadow = true;
        tavernGroup.add(roof);
        
        // Simple table
        const table = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.2, 1), 
          new THREE.MeshLambertMaterial({ color: 0xDEB887 })
        );
        table.position.set(-2, 1, -2);
        table.castShadow = true;
        tavernGroup.add(table);
        
        this.scene.add(tavernGroup);
        resolve();
      }, 100);
    });
  }
  
  private async createOptimizedForest(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const treeCount = 12; // Reduced from 80
        for (let i = 0; i < treeCount; i++) {
          // Simple tree trunk
          const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 6, 8); // Reduced detail
          const trunkMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B7355,
            map: TextureGenerator.createWoodTexture()
          });
          const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
          
          let x, z;
          do {
            x = (Math.random() - 0.5) * 120;
            z = (Math.random() - 0.5) * 120;
          } while (Math.sqrt(x * x + z * z) < 15 || (Math.abs(x) < 12 && Math.abs(z) < 12));
          
          trunk.position.set(x, 3, z);
          trunk.castShadow = true;
          trunk.receiveShadow = true;
          this.scene.add(trunk);
          
          // Simple leaves (just one layer)
          const leavesGeometry = new THREE.SphereGeometry(2, 8, 6); // Reduced detail
          const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.5 + Math.random() * 0.2);
          const leavesMaterial = new THREE.MeshLambertMaterial({ color: leavesColor });
          const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
          leaves.position.set(x, 6, z);
          leaves.castShadow = true;
          leaves.receiveShadow = true;
          this.scene.add(leaves);
        }
        resolve();
      }, 150);
    });
  }
  
  private async createOptimizedRocks(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const rockCount = 10; // Reduced from 40
        for (let i = 0; i < rockCount; i++) {
          const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 0.5 + 0.3, 0); // Reduced detail
          const rockMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0, 0, 0.5 + Math.random() * 0.3),
            map: TextureGenerator.createStoneTexture()
          });
          const rock = new THREE.Mesh(rockGeometry, rockMaterial);
          
          let x, z;
          do {
            x = (Math.random() - 0.5) * 80;
            z = (Math.random() - 0.5) * 80;
          } while (Math.abs(x) < 8 && Math.abs(z) < 8);
          
          rock.position.set(x, Math.random() * 0.2 + 0.2, z);
          rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          rock.castShadow = true;
          rock.receiveShadow = true;
          this.scene.add(rock);
        }
        resolve();
      }, 100);
    });
  }
  
  private async createOptimizedBushes(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const bushCount = 10; // Reduced from 30
        for (let i = 0; i < bushCount; i++) {
          const bushGeometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.2, 6, 4); // Reduced detail
          const bushMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.25, 0.6, 0.45 + Math.random() * 0.2)
          });
          const bush = new THREE.Mesh(bushGeometry, bushMaterial);
          
          let x, z;
          do {
            x = (Math.random() - 0.5) * 60;
            z = (Math.random() - 0.5) * 60;
          } while (Math.abs(x) < 10 && Math.abs(z) < 10);
          
          bush.position.set(x, 0.3, z);
          bush.scale.y = 0.6;
          bush.castShadow = true;
          bush.receiveShadow = true;
          this.scene.add(bush);
        }
        resolve();
      }, 100);
    });
  }
  
  private async createSkybox(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const skyGeometry = new THREE.SphereGeometry(400, 16, 16); // Reduced detail
        const skyMaterial = new THREE.MeshBasicMaterial({
          map: TextureGenerator.createSkyTexture(this.timeOfDay),
          side: THREE.BackSide
        });
        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);
        resolve();
      }, 50);
    });
  }
  
  // Legacy compatibility methods
  public loadLevel(levelName: string): void {
    console.log(`Loading level: ${levelName}`);
    this.clearScene();
    
    switch (levelName) {
      case 'tavern':
        this.loadTavernLevel();
        break;
      case 'forest':
        this.loadForestLevel();
        break;
      default:
        this.loadDefaultLevel();
    }
  }

  private clearScene(): void {
    // Remove all meshes except lights and camera
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => this.scene.remove(obj));
  }

  private loadTavernLevel(): void {
    // Create a simple tavern environment
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Add some basic tavern furniture
    this.addTavernFurniture();
  }

  private loadForestLevel(): void {
    // Create forest environment
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x228B22,
      map: TextureGenerator.createGrassTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Add trees
    this.addTrees();
  }

  private loadDefaultLevel(): void {
    // Create a basic ground plane
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x90EE90,
      map: TextureGenerator.createGrassTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private addTavernFurniture(): void {
    // Add table
    const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(3, 0.5, 0);
    table.castShadow = true;
    this.scene.add(table);

    // Add chairs
    for (let i = 0; i < 4; i++) {
      const chairGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
      const chairMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x654321,
        map: TextureGenerator.createWoodTexture()
      });
      const chair = new THREE.Mesh(chairGeometry, chairMaterial);
      const angle = (i / 4) * Math.PI * 2;
      chair.position.set(3 + Math.cos(angle) * 1.5, 0.5, Math.sin(angle) * 1.5);
      chair.castShadow = true;
      this.scene.add(chair);
    }
  }

  private addTrees(): void {
    for (let i = 0; i < 20; i++) {
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3);
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,
        map: TextureGenerator.createWoodTexture()
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

      // Tree leaves
      const leavesGeometry = new THREE.SphereGeometry(1.5);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 2.5;

      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(leaves);

      // Random position
      tree.position.set(
        (Math.random() - 0.5) * 40,
        1.5,
        (Math.random() - 0.5) * 40
      );

      tree.castShadow = true;
      this.scene.add(tree);
    }
  }

  public getCurrentLevel(): string {
    return this.currentLevel?.name || 'default';
  }
  
  // Utility methods
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  private handleResize = (): void => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
  
  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.dispose();
  }
}
