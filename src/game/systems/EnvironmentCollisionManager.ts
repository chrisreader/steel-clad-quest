import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class EnvironmentCollisionManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private registeredObjects: Set<string> = new Set();
  private terrainObjects: Map<string, { meshUUID: string; collisionId: string }> = new Map();
  private isArrowImpactActive: boolean = false;
  private terrainCollisionLock: boolean = false;
  private terrainValidationTimer: NodeJS.Timeout | null = null;
  private collisionUpdateDisabled: boolean = false; // COMPLETE shutdown flag

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('🔧 EnvironmentCollisionManager initialized with COMPLETE terrain isolation');
  }

  public registerEnvironmentCollisions(): void {
    // COMPLETE SHUTDOWN: Never run if collision updates are disabled
    if (this.collisionUpdateDisabled || this.terrainCollisionLock || this.isArrowImpactActive) {
      console.log('🔧 ⚠️ COMPLETE SHUTDOWN: All collision registration DISABLED - terrain completely isolated');
      return;
    }

    console.log('🔧 === ENVIRONMENT COLLISION REGISTRATION START (terrain isolation active) ===');
    
    // Validate terrain collisions before any operations
    this.validateAndRestoreTerrainCollisions();
    
    const existingCollisions = this.physicsManager.getCollisionObjects();
    console.log(`🔧 BEFORE PROCESSING: ${existingCollisions.size} collision objects exist`);
    
    // COMPLETE TERRAIN PRESERVATION: Never touch terrain objects
    const preservedTerrainIds = new Set<string>();
    const preservedTerrainMeshes = new Set<string>();
    
    for (const [id, obj] of existingCollisions) {
      if (obj.type === 'terrain') {
        preservedTerrainIds.add(id);
        preservedTerrainMeshes.add(obj.mesh.uuid);
        this.terrainObjects.set(obj.mesh.uuid, { meshUUID: obj.mesh.uuid, collisionId: id });
        console.log(`🔧 PRESERVING TERRAIN: ${id} (${obj.mesh.name || 'unnamed'}) - UUID: ${obj.mesh.uuid}`);
      }
    }
    
    // Only clear non-terrain environment objects
    console.log('🔧 ⚠️ CLEARING NON-TERRAIN REGISTRATIONS (complete terrain preservation)...');
    const objectsToRemove: string[] = [];
    this.registeredObjects.forEach(id => {
      if (!preservedTerrainIds.has(id)) {
        const obj = this.physicsManager.getCollisionObjects().get(id);
        if (obj && obj.type !== 'terrain') {
          objectsToRemove.push(id);
        }
      }
    });
    
    objectsToRemove.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
      this.registeredObjects.delete(id);
    });
    
    const afterClear = this.physicsManager.getCollisionObjects();
    console.log(`🔧 AFTER SELECTIVE CLEAR: ${afterClear.size} collision objects remain`);

    // Register new environment objects (completely skip terrain objects)
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        // CRITICAL: Skip any mesh that's already tracked as terrain
        if (!preservedTerrainMeshes.has(object.uuid)) {
          this.registerObjectCollision(object);
        }
      }
    });
    
    // Final validation after registration
    this.validateAndRestoreTerrainCollisions();
    
    const finalCount = this.physicsManager.getCollisionObjects();
    let finalTerrainCount = 0;
    for (const [id, obj] of finalCount) {
      if (obj.type === 'terrain') {
        finalTerrainCount++;
      }
    }

    console.log(`🔧 === REGISTRATION COMPLETE ===`);
    console.log(`🔧 Registered ${this.registeredObjects.size} collision objects`);
    console.log(`🔧 Protected terrain count: ${finalTerrainCount}`);
    console.log(`🔧 Total collision objects: ${finalCount.size}`);
  }

  private registerObjectCollision(object: THREE.Object3D): void {
    // Skip if already registered
    if (this.registeredObjects.has(object.uuid)) return;

    // CRITICAL: Never register terrain objects that are already tracked
    if (this.terrainObjects.has(object.uuid)) {
      console.log(`🔧 ⚠️ Skipping terrain object ${object.name} - already tracked and protected`);
      return;
    }

    // Enhanced handling for test hills with height data
    if (object instanceof THREE.Mesh && object.name === 'test_hill' && object.userData.heightData) {
      // Check if this terrain is already registered
      let alreadyRegistered = false;
      for (const [id, collisionObject] of this.physicsManager.getCollisionObjects()) {
        if (collisionObject.mesh === object && collisionObject.type === 'terrain') {
          alreadyRegistered = true;
          this.terrainObjects.set(object.uuid, { meshUUID: object.uuid, collisionId: id });
          console.log(`🏔️ Hill already registered with ID: ${id} - COMPLETELY PROTECTED`);
          break;
        }
      }
      
      if (!alreadyRegistered) {
        const heightData = object.userData.heightData;
        const terrainSize = object.userData.terrainSize || 30;
        
        console.log(`🏔️ === ENVIRONMENT MANAGER PROCESSING NEW TEST HILL ===`);
        console.log(`🏔️ Hill name: ${object.name}`);
        console.log(`🏔️ Hill position: (${object.position.x}, ${object.position.y}, ${object.position.z})`);
        
        const id = this.physicsManager.addTerrainCollision(object, heightData, terrainSize, object.uuid);
        this.registeredObjects.add(id);
        this.terrainObjects.set(object.uuid, { meshUUID: object.uuid, collisionId: id });
        console.log(`🏔️ ✅ NEW terrain registered and COMPLETELY protected with ID: ${id}`);
      }
      return;
    }

    // Handle other environment objects normally
    if (object instanceof THREE.Group && object.name === 'staircase') {
      const id = this.physicsManager.addCollisionObject(object, 'staircase', 'stone', object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🪜 Registered staircase collision (with ${object.children.length} steps) at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`);
      return;
    }

    // Standard environment object registration
    const material = this.determineMaterial(object);
    const shouldRegister = this.shouldRegisterForCollision(object);

    if (shouldRegister) {
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🔧 Registered collision for object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
    }
  }

  // ENHANCED: Comprehensive terrain validation and restoration
  private validateAndRestoreTerrainCollisions(): void {
    console.log('🔧 🔍 COMPREHENSIVE terrain validation with complete restoration...');
    
    let terrainCount = 0;
    let corruptedTerrain: string[] = [];
    
    for (const [meshUUID, terrainInfo] of this.terrainObjects) {
      const collisionObject = this.physicsManager.getCollisionObjects().get(terrainInfo.collisionId);
      
      if (!collisionObject) {
        console.error(`🔧 ❌ CORRUPTED: Terrain collision missing for mesh ${meshUUID}`);
        corruptedTerrain.push(meshUUID);
      } else if (collisionObject.type !== 'terrain') {
        console.error(`🔧 ❌ CORRUPTED: Terrain object has wrong type: ${collisionObject.type}`);
        corruptedTerrain.push(meshUUID);
      } else if (!collisionObject.heightData || collisionObject.heightData.length === 0) {
        console.error(`🔧 ❌ CORRUPTED: Terrain object missing height data: ${terrainInfo.collisionId}`);
        corruptedTerrain.push(meshUUID);
      } else {
        terrainCount++;
        console.log(`🔧 ✅ VALID: Terrain ${terrainInfo.collisionId} (${collisionObject.mesh.name || 'unnamed'})`);
      }
    }
    
    console.log(`🔧 Terrain validation: ${terrainCount} valid, ${corruptedTerrain.length} corrupted`);
    
    // Immediately restore corrupted terrain
    if (corruptedTerrain.length > 0) {
      console.error(`🔧 ⚠️ CRITICAL: Restoring ${corruptedTerrain.length} corrupted terrain objects...`);
      this.restoreCorruptedTerrain(corruptedTerrain);
    }
  }

  // ENHANCED: Improved terrain restoration
  private restoreCorruptedTerrain(corruptedUUIDs: string[]): void {
    for (const meshUUID of corruptedUUIDs) {
      // Find the mesh in the scene
      let foundMesh: THREE.Mesh | null = null;
      this.scene.traverse((object) => {
        if (object.uuid === meshUUID && object instanceof THREE.Mesh) {
          foundMesh = object;
        }
      });
      
      if (foundMesh && foundMesh.name === 'test_hill' && foundMesh.userData.heightData) {
        console.log(`🔧 🔄 RESTORING terrain collision for hill: ${foundMesh.name}`);
        
        const heightData = foundMesh.userData.heightData;
        const terrainSize = foundMesh.userData.terrainSize || 30;
        
        const id = this.physicsManager.addTerrainCollision(foundMesh, heightData, terrainSize, foundMesh.uuid);
        this.terrainObjects.set(meshUUID, { meshUUID: meshUUID, collisionId: id });
        this.registeredObjects.add(id);
        
        console.log(`🔧 ✅ RESTORED terrain collision with ID: ${id}`);
      }
    }
  }

  // ENHANCED: Complete terrain collision lockdown during arrow impacts
  public lockTerrainCollisions(): void {
    this.terrainCollisionLock = true;
    this.collisionUpdateDisabled = true; // COMPLETE shutdown
    console.log('🔧 ❄️ TERRAIN COLLISIONS COMPLETELY LOCKED - all updates disabled');
    
    // Clear any existing validation timer
    if (this.terrainValidationTimer) {
      clearTimeout(this.terrainValidationTimer);
    }
    
    // Immediate validation and backup
    this.validateAndRestoreTerrainCollisions();
  }

  // ENHANCED: Delayed unlock with comprehensive validation
  public unlockTerrainCollisions(): void {
    console.log('🔧 🔥 Unlocking terrain collisions with comprehensive validation...');
    
    // Validate terrain state before unlocking
    this.validateAndRestoreTerrainCollisions();
    
    // Set a validation timer to check again after unlock
    this.terrainValidationTimer = setTimeout(() => {
      console.log('🔧 🔍 Post-unlock comprehensive terrain validation...');
      this.validateAndRestoreTerrainCollisions();
      this.terrainValidationTimer = null;
    }, 3000); // Extended validation delay
    
    this.terrainCollisionLock = false;
    this.collisionUpdateDisabled = false; // Re-enable updates
    console.log('🔧 ✅ TERRAIN COLLISIONS UNLOCKED with comprehensive validation');
  }

  // ENHANCED: Arrow impact state management with complete isolation
  public setArrowImpactActive(active: boolean): void {
    this.isArrowImpactActive = active;
    this.collisionUpdateDisabled = active; // Complete update shutdown during arrow impact
    console.log(`🔧 🏹 Arrow impact state: ${active ? 'ACTIVE - COMPLETE ISOLATION' : 'INACTIVE - SYSTEMS RESTORED'}`);
    
    if (active) {
      // Immediately validate terrain when arrow impact starts
      this.validateAndRestoreTerrainCollisions();
    } else {
      // Extended validation when arrow impact ends
      setTimeout(() => {
        this.validateAndRestoreTerrainCollisions();
      }, 1000);
    }
  }

  // ... keep existing code (determineMaterial, shouldRegisterForCollision methods remain the same)
  private determineMaterial(object: THREE.Object3D): 'wood' | 'stone' | 'metal' | 'fabric' {
    if (object instanceof THREE.Mesh && object.material) {
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      
      if (material instanceof THREE.MeshLambertMaterial) {
        const color = material.color;
        
        if (color.r > 0.4 && color.g > 0.3 && color.b < 0.4) {
          return 'wood';
        }
        
        if (Math.abs(color.r - color.g) < 0.1 && Math.abs(color.g - color.b) < 0.1) {
          return 'stone';
        }
        
        if (color.r > 0.7 && color.g > 0.7 && color.b > 0.7) {
          return 'metal';
        }
      }
    }

    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    if (size.y > 3 && (size.x < 2 && size.z < 2)) {
      return 'wood';
    }
    
    if (size.y > 2 || size.x > 3 || size.z > 3) {
      return 'stone';
    }
    
    return 'stone';
  }

  private shouldRegisterForCollision(object: THREE.Object3D): boolean {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    if (size.x < 0.2 && size.y < 0.2 && size.z < 0.2) {
      return false;
    }

    if (object.position.y > 50) {
      return false;
    }

    if (size.x > 50 || size.z > 50) {
      return false;
    }

    return object instanceof THREE.Mesh && object.geometry && object.material;
  }

  public updateCollisions(): void {
    // COMPLETE SHUTDOWN: Never update if any protection is active
    if (this.collisionUpdateDisabled || this.terrainCollisionLock || this.isArrowImpactActive) {
      return;
    }

    // Extremely reduced frequency when safe
    if (Math.random() < 0.0001) { // ~1/10000 chance per frame
      this.registerEnvironmentCollisions();
    }
  }

  public dispose(): void {
    // Clear validation timer
    if (this.terrainValidationTimer) {
      clearTimeout(this.terrainValidationTimer);
      this.terrainValidationTimer = null;
    }
    
    // Clean up environment objects but preserve ALL terrain
    this.registeredObjects.forEach(id => {
      const isTerrainObject = Array.from(this.terrainObjects.values()).some(terrain => terrain.collisionId === id);
      if (!isTerrainObject) {
        this.physicsManager.removeCollisionObject(id);
      }
    });
    this.registeredObjects.clear();
    // Keep terrain objects tracked but don't clear them
    console.log('EnvironmentCollisionManager disposed with COMPLETE terrain preservation');
  }
}
