import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class EnvironmentCollisionManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private registeredObjects: Set<string> = new Set();
  private terrainObjects: Set<string> = new Set(); // Track terrain objects separately

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('🔧 EnvironmentCollisionManager initialized - buildings now handled by BuildingManager');
  }

  // Method to register a single object for collision (handles Groups and Meshes)
  public registerSingleObject(object: THREE.Object3D): void {
    // Skip if already registered OR if it's a known terrain object OR if it's a bush
    if (this.registeredObjects.has(object.uuid) || this.terrainObjects.has(object.uuid) || this.isBushObject(object)) return;

    const material = this.determineMaterial(object);
    const shouldRegister = this.shouldRegisterForCollision(object);

    if (shouldRegister) {
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🔧 Dynamically registered collision for ${object instanceof THREE.Group ? 'GROUP' : 'MESH'} at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
    }
  }

  public registerEnvironmentCollisions(): void {
    console.log('🔧 === ENVIRONMENT COLLISION REGISTRATION START ===');
    console.log('🔧 Registering environment collisions (excluding buildings managed by BuildingManager)...');
    
    // DEBUG: Check existing registrations before clearing
    const existingCollisions = this.physicsManager.getCollisionObjects();
    console.log(`🔧 BEFORE CLEAR: ${existingCollisions.size} collision objects exist`);
    
    let terrainCountBefore = 0;
    for (const [id, obj] of existingCollisions) {
      if (obj.type === 'terrain') {
        terrainCountBefore++;
        this.terrainObjects.add(id); // Track existing terrain objects
        console.log(`🔧 FOUND EXISTING TERRAIN: ${id} (${obj.mesh.name})`);
      }
    }
    console.log(`🔧 TERRAIN COUNT BEFORE CLEAR: ${terrainCountBefore}`);
    
    // Only clear non-terrain and non-building environment objects
    console.log('🔧 ⚠️  CLEARING ENVIRONMENT REGISTRATIONS (preserving terrain and buildings)...');
    const objectsToRemove: string[] = [];
    this.registeredObjects.forEach(id => {
      const obj = this.physicsManager.getCollisionObjects().get(id);
      if (obj && obj.type !== 'terrain' && !this.terrainObjects.has(id) && !this.isBuildingObject(obj)) {
        objectsToRemove.push(id);
      }
    });
    
    objectsToRemove.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
      this.registeredObjects.delete(id);
    });
    
    const afterClear = this.physicsManager.getCollisionObjects();
    console.log(`🔧 AFTER SELECTIVE CLEAR: ${afterClear.size} collision objects remain`);

    // Register all non-building environment objects for collision
    this.scene.traverse((object) => {
      if ((object instanceof THREE.Mesh || object instanceof THREE.Group) && !this.isBuildingComponent(object)) {
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

  // NEW: Check if an object is a bush (should not have collision)
  private isBushObject(object: THREE.Object3D): boolean {
    if (object instanceof THREE.Group) {
      // Check if this is a bush group by looking for sphere geometry (leaves) without cylinder geometry (trunk)
      const hasSpheresOnly = object.children.some(child => 
        child instanceof THREE.Mesh && 
        child.geometry instanceof THREE.SphereGeometry
      );
      const hasCylinder = object.children.some(child =>
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.CylinderGeometry
      );
      
      // If it has spheres but no main cylinder trunk, it's likely a bush
      if (hasSpheresOnly && !hasCylinder) {
        console.log(`🌿 Detected bush group - skipping collision registration`);
        return true;
      }
      
      // Also check for very small cylinders (stems) which indicate bushes
      const hasSmallStem = object.children.some(child =>
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.CylinderGeometry &&
        child.scale.x < 0.1 && child.scale.z < 0.1 // Very thin stems
      );
      
      if (hasSpheresOnly && hasSmallStem) {
        console.log(`🌿 Detected bush with stem - skipping collision registration`);
        return true;
      }
    }
    
    return false;
  }

  // NEW: Check if an object is a building component (managed by BuildingManager)
  private isBuildingComponent(object: THREE.Object3D): boolean {
    // Check if the object is part of a building group
    let current = object.parent;
    while (current) {
      if (current.userData && (current.userData.buildingType === 'tavern' || current.userData.buildingType === 'castle')) {
        return true;
      }
      current = current.parent;
    }
    
    // Check if the object itself has building metadata
    return !!(object.userData && (object.userData.buildingType || object.userData.isBuildingComponent));
  }

  // NEW: Check if a collision object is from a building
  private isBuildingObject(collisionObj: any): boolean {
    const mesh = collisionObj.mesh;
    if (!mesh) return false;
    
    return this.isBuildingComponent(mesh);
  }

  private registerObjectCollision(object: THREE.Object3D): void {
    // Skip if already registered OR if it's a known terrain object OR if it's a building component OR if it's a bush
    if (this.registeredObjects.has(object.uuid) || 
        this.terrainObjects.has(object.uuid) || 
        this.isBuildingComponent(object) ||
        this.isBushObject(object)) {
      return;
    }

    // Enhanced handling for test hills with height data
    if (object instanceof THREE.Mesh && object.name === 'test_hill' && object.userData.heightData) {
      const heightData = object.userData.heightData;
      const terrainSize = object.userData.terrainSize || 30;
      
      console.log(`🏔️ === ENVIRONMENT MANAGER PROCESSING TEST HILL ===`);
      console.log(`🏔️ Hill name: ${object.name}`);
      console.log(`🏔️ Hill position: (${object.position.x}, ${object.position.y}, ${object.position.z})`);
      console.log(`🏔️ Has heightData: ${!!heightData}`);
      console.log(`🏔️ HeightData size: ${heightData?.length}x${heightData?.[0]?.length}`);
      console.log(`🏔️ Terrain size: ${terrainSize}`);
      
      // Check if already registered by StructureGenerator
      let alreadyRegistered = false;
      for (const [id, collisionObject] of this.physicsManager.getCollisionObjects()) {
        if (collisionObject.mesh === object && collisionObject.type === 'terrain') {
          alreadyRegistered = true;
          this.terrainObjects.add(id); // Track this terrain object
          console.log(`🏔️ Hill already registered with ID: ${id} - TRACKING`);
          break;
        }
      }
      
      if (!alreadyRegistered) {
        const id = this.physicsManager.addTerrainCollision(object, heightData, terrainSize, object.uuid);
        this.registeredObjects.add(id);
        this.terrainObjects.add(id); // Track new terrain object
        console.log(`🏔️ ✅ ENVIRONMENT MANAGER registered test hill as terrain collision with ID: ${id}`);
      } else {
        console.log(`🏔️ ✅ Test hill already registered by StructureGenerator - preserving existing registration`);
      }
      return;
    }

    // Enhanced handling for staircases
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
      
      console.log(`🔧 Registered collision for ${object instanceof THREE.Group ? 'GROUP' : 'MESH'} at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
    }
  }

  private determineMaterial(object: THREE.Object3D): 'wood' | 'stone' | 'metal' | 'fabric' {
    // FIXED: Special handling for tree groups
    if (object instanceof THREE.Group) {
      // Check if this is a tree (contains meshes that look like tree parts)
      const hasTrunk = object.children.some(child => 
        child instanceof THREE.Mesh && 
        child.geometry instanceof THREE.CylinderGeometry
      );
      const hasLeaves = object.children.some(child =>
        child instanceof THREE.Mesh &&
        (child.geometry instanceof THREE.ConeGeometry || child.geometry instanceof THREE.SphereGeometry)
      );
      
      if (hasTrunk && hasLeaves) {
        console.log(`🌳 Detected tree group - assigning wood material`);
        return 'wood';
      }
      
      // For other groups, check the first child's material
      const firstMesh = object.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
      if (firstMesh) {
        return this.determineMaterialFromMesh(firstMesh);
      }
    }
    
    // Handle individual meshes
    if (object instanceof THREE.Mesh) {
      return this.determineMaterialFromMesh(object);
    }
    
    // Default fallback
    return 'stone';
  }
  
  private determineMaterialFromMesh(mesh: THREE.Mesh): 'wood' | 'stone' | 'metal' | 'fabric' {
    if (mesh.material) {
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      
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
    const boundingBox = new THREE.Box3().setFromObject(mesh);
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

  // FIXED: Updated to handle both THREE.Mesh AND THREE.Group objects
  private shouldRegisterForCollision(object: THREE.Object3D): boolean {
    // Skip bushes
    if (this.isBushObject(object)) {
      console.log(`🌿 Skipping bush collision registration`);
      return false;
    }

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

    // FIXED: Register both Mesh and Group objects (trees are Groups!)
    if (object instanceof THREE.Mesh && object.geometry && object.material) {
      return true;
    }
    
    if (object instanceof THREE.Group && object.children.length > 0) {
      // Check if the group contains meshes with geometry and materials
      const hasSolidChildren = object.children.some(child => 
        child instanceof THREE.Mesh && child.geometry && child.material
      );
      console.log(`🔧 Group collision check: ${object.children.length} children, hasSolidChildren: ${hasSolidChildren}`);
      return hasSolidChildren;
    }

    return false;
  }

  public updateCollisions(): void {
    // CRITICAL FIX: Disable this method to prevent terrain collision corruption
    console.log('🔧 DISABLED: updateCollisions() method disabled to preserve terrain collision integrity');
    return;
  }

  public dispose(): void {
    // Clean up environment objects but preserve terrain and buildings
    this.registeredObjects.forEach(id => {
      if (!this.terrainObjects.has(id)) {
        const collisionObj = this.physicsManager.getCollisionObjects().get(id);
        if (collisionObj && !this.isBuildingObject(collisionObj)) {
          this.physicsManager.removeCollisionObject(id);
        }
      }
    });
    this.registeredObjects.clear();
    this.terrainObjects.clear();
    console.log('EnvironmentCollisionManager disposed with terrain and building preservation');
  }
}
