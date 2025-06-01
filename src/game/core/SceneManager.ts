import * as THREE from 'three';
import { ForestLevel } from '../world/levels/ForestLevel';
import { TavernLevel } from '../world/levels/TavernLevel';
import { DynamicCloudSpawningSystem } from '../world/spawning/DynamicCloudSpawningSystem';
import { PhysicsManager } from './PhysicsManager';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private cloudSpawningSystem: DynamicCloudSpawningSystem | null = null;
  private distanceBasedFogEnabled: boolean = true;
  private fogNear: number = 10;
  private fogFar: number = 150;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("🌍 [SceneManager] Initializing...");
  }
  
  public createDefaultWorld(): void {
    console.log("🌍 [SceneManager] Creating default world...");
    
    // Enable shadows
    this.scene.castShadow = true;
    this.scene.receiveShadow = true;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
    
    // Add skybox
    this.createSkybox();
    
    // Load tavern level
    this.loadLevel('tavern');
    
    // Initialize cloud spawning system
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(this.scene);
    
    console.log("🌍 [SceneManager] Default world created with skybox and dynamic clouds");
  }
  
  public loadLevel(levelName: string): void {
    console.log(`🌍 [SceneManager] Loading level: ${levelName}`);
    
    // Clear existing scene objects
    this.clearScene();
    
    let levelData;
    
    // Load level data based on level name
    if (levelName === 'tavern') {
      levelData = TavernLevel.getLevelData();
    } else if (levelName === 'forest') {
      levelData = ForestLevel.getLevelData();
    } else {
      console.warn(`🌍 [SceneManager] Level not found: ${levelName}`);
      return;
    }
    
    // Set lighting
    this.scene.add(new THREE.AmbientLight(levelData.lighting.ambient));
    const directionalLight = new THREE.DirectionalLight(levelData.lighting.directional, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
    
    // Set background music
    // this.audioManager.play(levelData.backgroundMusic, true);
    
    // Create floor
    this.createFloor(levelData.environment.floor);
    
    // Create objects
    this.createObjects(levelData.environment.objects);
    
    console.log(`🌍 [SceneManager] Level "${levelName}" loaded successfully`);
  }
  
  private createSkybox(): void {
    const textureLoader = new THREE.CubeTextureLoader();
    const texture = textureLoader.load([
      'assets/skybox/corona_ft.png',
      'assets/skybox/corona_bk.png',
      'assets/skybox/corona_up.png',
      'assets/skybox/corona_dn.png',
      'assets/skybox/corona_rt.png',
      'assets/skybox/corona_lf.png'
    ]);
    this.scene.background = texture;
  }
  
  private createFloor(floorData: any): void {
    const geometry = new THREE.PlaneGeometry(floorData.size.width, floorData.size.height);
    let material;
    
    if (floorData.texture) {
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(`assets/textures/${floorData.texture}.png`);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      
      material = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
    } else {
      material = new THREE.MeshLambertMaterial({ color: floorData.color, side: THREE.DoubleSide });
    }
    
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Add collision plane to physics manager
    this.physicsManager.addCollisionPlane(floor);
  }
  
  private createObjects(objectsData: any[]): void {
    objectsData.forEach(objectData => {
      if (objectData.type === 'table') {
        const geometry = new THREE.BoxGeometry(2, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const table = new THREE.Mesh(geometry, material);
        table.position.set(objectData.position.x, objectData.position.y, objectData.position.z);
        table.castShadow = true;
        table.receiveShadow = true;
        this.scene.add(table);
        
        this.physicsManager.addCollisionBox(table);
      } else if (objectData.type === 'chair') {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const chair = new THREE.Mesh(geometry, material);
        chair.position.set(objectData.position.x, objectData.position.y, objectData.position.z);
        chair.castShadow = true;
        chair.receiveShadow = true;
        this.scene.add(chair);
        
        this.physicsManager.addCollisionBox(chair);
      } else if (objectData.type === 'tree') {
        if (objectData.count && objectData.randomPosition) {
          for (let i = 0; i < objectData.count; i++) {
            const x = (Math.random() - 0.5) * 40;
            const z = (Math.random() - 0.5) * 40;
            
            const trunkHeight = 3 + Math.random() * 2;
            const leavesRadius = 1 + Math.random() * 2;
            
            // Trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, trunkHeight / 2, z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            this.scene.add(trunk);
            
            this.physicsManager.addCollisionBox(trunk);
            
            // Leaves
            const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 16, 12);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.set(x, trunkHeight + leavesRadius * 0.7, z);
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            this.scene.add(leaves);
            
            this.physicsManager.addCollisionBox(leaves);
          }
        }
      }
    });
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.update(deltaTime, playerPosition);
    }
    
    if (this.distanceBasedFogEnabled) {
      this.updateDistanceBasedFog(playerPosition);
    }
  }
  
  private updateDistanceBasedFog(playerPosition: THREE.Vector3): void {
    // Calculate player distance from origin
    const distance = playerPosition.length();
    
    // Adjust fog near and far values based on player distance
    this.fogNear = distance + 10;
    this.fogFar = distance + 150;
    
    // Apply fog to scene
    if (this.scene.fog) {
      this.scene.fog.near = this.fogNear;
      this.scene.fog.far = this.fogFar;
    } else {
      this.scene.fog = new THREE.Fog(0xaaaaaa, this.fogNear, this.fogFar);
    }
  }
  
  private clearScene(): void {
    // Dispose of all objects in the scene
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        } else if (Array.isArray(obj.material)) {
          obj.material.forEach(material => material.dispose());
        }
        this.scene.remove(obj);
      } else if (obj instanceof THREE.Light) {
        this.scene.remove(obj);
      }
    }
    
    // Reset background
    this.scene.background = null;
    
    // Clear fog
    this.scene.fog = null;
  }
  
  public dispose(): void {
    console.log("🌍 [SceneManager] Disposing...");
    
    // Dispose of cloud spawning system
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.dispose();
    }
    
    // Clear the scene
    this.clearScene();
    
    console.log("🌍 [SceneManager] Disposed successfully");
  }
}

