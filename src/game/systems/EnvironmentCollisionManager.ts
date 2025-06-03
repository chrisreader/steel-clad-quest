import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class EnvironmentCollisionManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private registeredObjects: Set<string> = new Set();

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('🔧 EnvironmentCollisionManager initialized with enhanced terrain and staircase support');
  }

  public registerEnvironmentCollisions(): void {
    console.log('🔧 === ENVIRONMENT COLLISION REGISTRATION START ===');
    console.log('🔧 Registering environment collisions with enhanced terrain support...');
    
    // DEBUG: Check existing registrations before clearing
    const existingCollisions = this.physicsManager.getCollisionObjects();
    console.log(`🔧 BEFORE CLEAR: ${existingCollisions.size} collision objects exist`);
    
    let terrainCountBefore = 0;
    for (const [id, obj] of existingCollisions) {
      if (obj.type === 'terrain') {
        terrainCountBefore++;
        console.log(`🔧 FOUND EXISTING TERRAIN: ${id} (${obj.mesh.name})`);
      }
    }
    console.log(`🔧 TERRAIN COUNT BEFORE CLEAR: ${terrainCountBefore}`);
    
    // Clear existing registrations
    console.log('🔧 ⚠️  CLEARING ALL EXISTING REGISTRATIONS...');
    this.registeredObjects.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
    });
    this.registeredObjects.clear();
    
    const afterClear = this.physicsManager.getCollisionObjects();
    console.log(`🔧 AFTER CLEAR: ${afterClear.size} collision objects remain`);

    // Register all environment objects for collision
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        this.registerObjectCollision(object);
      }
    });
    
    const finalCount = this.physicsManager.getCollisionObjects();
    let finalTerrainCount = 0;
    for (const [id, obj] of finalCount) {
      if (obj.type === 'terrain') {
        finalTerrainCount++;
        console.log(`🔧 FINAL TERRAIN REGISTRATION: ${id} (${obj.mesh.name})`);
      }
    }

    console.log(`🔧 === REGISTRATION COMPLETE ===`);
    console.log(`🔧 Registered ${this.registeredObjects.size} collision objects`);
    console.log(`🔧 Final terrain count: ${finalTerrainCount}`);
    console.log(`🔧 Total collision objects: ${finalCount.size}`);
  }

  private registerObjectCollision(object: THREE.Object3D): void {
    // Skip if already registered
    if (this.registeredObjects.has(object.uuid)) return;

    // ENHANCED: Special handling for test hills with height data - AUTO REGISTER
    if (object instanceof THREE.Mesh && object.name === 'test_hill' && object.userData.heightData) {
      const heightData = object.userData.heightData;
      const terrainSize = object.userData.terrainSize || 30;
      
      console.log(`🏔️ === AUTO-REGISTERING TEST HILL ===`);
      console.log(`🏔️ Hill name: ${object.name}`);
      console.log(`🏔️ Hill position: (${object.position.x}, ${object.position.y}, ${object.position.z})`);
      console.log(`🏔️ Has heightData: ${!!heightData}`);
      console.log(`🏔️ HeightData size: ${heightData?.length}x${heightData?.[0]?.length}`);
      console.log(`🏔️ Terrain size: ${terrainSize}`);
      
      // Check if already registered by StructureGenerator
      let alreadyRegistered = false;
      for (const [id, collisionObject] of this.physicsManager.getCollisionObjects()) {
        if (collisionObject.mesh === object) {
          alreadyRegistered = true;
          console.log(`🏔️ Hill already registered with ID: ${id}`);
          break;
        }
      }
      
      if (!alreadyRegistered) {
        const id = this.physicsManager.addTerrainCollision(object, heightData, terrainSize, object.uuid);
        this.registeredObjects.add(id);
        console.log(`🏔️ ✅ AUTO-REGISTERED test hill as terrain collision with ID: ${id}`);
      } else {
        console.log(`🏔️ ✅ Test hill already registered by StructureGenerator`);
      }
      return;
    }

    // ENHANCED: Special handling for staircases (register steps individually)
    if (object instanceof THREE.Group && object.name === 'staircase') {
      const id = this.physicsManager.addCollisionObject(object, 'staircase', 'stone', object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🪜 Registered staircase collision (with ${object.children.length} steps) at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`);
      return;
    }

    // Determine object type and material based on geometry and position
    const material = this.determineMaterial(object);
    const shouldRegister = this.shouldRegisterForCollision(object);

    if (shouldRegister) {
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🔧 Registered collision for object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
    }
  }

  private determineMaterial(object: THREE.Object3D): 'wood' | 'stone' | 'metal' | 'fabric' {
    // Analyze object properties to determine material
    if (object instanceof THREE.Mesh && object.material) {
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      
      if (material instanceof THREE.MeshLambertMaterial) {
        const color = material.color;
        
        // Brown/tan colors suggest wood
        if (color.r > 0.4 && color.g > 0.3 && color.b < 0.4) {
          return 'wood';
        }
        
        // Gray colors suggest stone
        if (Math.abs(color.r - color.g) < 0.1 && Math.abs(color.g - color.b) < 0.1) {
          return 'stone';
        }
        
        // Metallic colors
        if (color.r > 0.7 && color.g > 0.7 && color.b > 0.7) {
          return 'metal';
        }
      }
    }

    // Default based on object characteristics
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Tall, thin objects are likely trees (wood)
    if (size.y > 3 && (size.x < 2 && size.z < 2)) {
      return 'wood';
    }
    
    // Large, angular objects are likely stone/walls
    if (size.y > 2 || size.x > 3 || size.z > 3) {
      return 'stone';
    }
    
    // Small objects default to stone
    return 'stone';
  }

  private shouldRegisterForCollision(object: THREE.Object3D): boolean {
    // Skip very small objects (likely decorative)
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    if (size.x < 0.2 && size.y < 0.2 && size.z < 0.2) {
      return false;
    }

    // Skip objects that are too high (likely clouds or sky elements)
    if (object.position.y > 50) {
      return false;
    }

    // Skip ground plane
    if (size.x > 50 || size.z > 50) {
      return false;
    }

    // Register solid objects
    return object instanceof THREE.Mesh && object.geometry && object.material;
  }

  public updateCollisions(): void {
    // Re-register collisions for any new objects
    this.registerEnvironmentCollisions();
  }

  public dispose(): void {
    this.registeredObjects.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
    });
    this.registeredObjects.clear();
    console.log('EnvironmentCollisionManager disposed');
  }
}
