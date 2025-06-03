import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';
import { StructureGenerator } from '../world/StructureGenerator';
import { TerrainFeatureGenerator } from '../world/TerrainFeatureGenerator';
import { TerrainTestGenerator } from '../world/TerrainTestGenerator';
import { RingQuadrantSystem } from '../world/RingQuadrantSystem';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private physicsManager: PhysicsManager;
  private structureGenerator: StructureGenerator;
  private featureGenerator: TerrainFeatureGenerator;
  private terrainTestGenerator: TerrainTestGenerator;
  private ringSystem: RingQuadrantSystem;

  constructor() {
    console.log('🏗️ [SceneManager] Initializing scene manager');
    
    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Initialize physics with scene for debug visualization
    this.physicsManager = new PhysicsManager(this.scene);
    
    // Initialize world systems
    this.ringSystem = new RingQuadrantSystem();
    this.structureGenerator = new StructureGenerator(this.scene, this.physicsManager);
    this.featureGenerator = new TerrainFeatureGenerator(this.ringSystem, this.scene);
    this.terrainTestGenerator = new TerrainTestGenerator(this.scene, this.physicsManager);
    
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    this.createGround();
    this.createStructures();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0xADD8E6); // Light blue background
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft ambient light
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 5); // Positioned to cast shadows
    directionalLight.castShadow = true;

    // Shadow map size
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;

    // Shadow camera frustum
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;

    this.scene.add(directionalLight);
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    groundGeometry.rotateX(-Math.PI / 2);

    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createStructures(): void {
    // Generate a tavern in the center of the scene
    this.structureGenerator.generateTavern(0, 0);
  }

  public createTestTerrain(): void {
    console.log('🏔️ [SceneManager] Creating test terrain for slope testing');
    this.terrainTestGenerator.generateTestRegion(50, 50);
    
    // Enable debug visualization for testing
    this.physicsManager.setDebugVisualization(true);
    
    console.log('🏔️ [SceneManager] Test terrain created. Debug visualization enabled.');
    console.log('🏔️ [SceneManager] Navigate to (50, 50) to test different slopes:');
    console.log('🏔️ [SceneManager] - Gentle Hill (20°) at (20, 50) - should be walkable');
    console.log('🏔️ [SceneManager] - Medium Slope (35°) at (40, 50) - should be walkable');
    console.log('🏔️ [SceneManager] - Steep Cliff (60°) at (60, 50) - should block movement');
    console.log('🏔️ [SceneManager] - Staircase at (80, 50) - should be walkable');
  }

  public toggleDebugVisualization(): void {
    // Get current state and toggle it
    const currentState = this.physicsManager ? true : false; // Simplified check
    this.physicsManager.setDebugVisualization(!currentState);
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

  public getPhysicsManager(): PhysicsManager {
    return this.physicsManager;
  }

  public dispose(): void {
    // Dispose of all resources
    console.log('🔥 [SceneManager] Disposing of scene resources');
    
    // Traverse the scene and dispose of geometries and materials
    this.scene.traverse((object: any) => {
      if (object.isMesh) {
        object.geometry?.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    // Dispose of the renderer
    this.renderer.dispose();
    
    // Dispose of the physics manager
    this.physicsManager.dispose();
    
    // Dispose of the structure generator
    this.structureGenerator.dispose();
    
    // Dispose of the feature generator
    this.featureGenerator.dispose();
    
    // Dispose of the terrain test generator
    this.terrainTestGenerator.dispose();

    // Remove the canvas from the DOM
    const canvas = this.renderer.domElement;
    canvas.parentNode?.removeChild(canvas);
  }
}
