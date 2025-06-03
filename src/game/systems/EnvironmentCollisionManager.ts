import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class EnvironmentCollisionManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private registeredObjects: Set<string> = new Set();
  private terrainObjects: Set<string> = new Set();

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('🔧 EnvironmentCollisionManager initialized with enhanced terrain, staircase and castle support');
  }

  public registerSingleObject(object: THREE.Object3D): void {
    if (this.registeredObjects.has(object.uuid) || this.terrainObjects.has(object.uuid)) return;

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
    console.log('🔧 Registering environment collisions with enhanced terrain and castle support...');
    
    // DEBUG: Check existing registrations before clearing
    const existingCollisions = this.physicsManager.getCollisionObjects();
    console.log(`🔧 BEFORE CLEAR: ${existingCollisions.size} collision objects exist`);
    
    let terrainCountBefore = 0;
    for (const [id, obj] of existingCollisions) {
      if (obj.type === 'terrain') {
        terrainCountBefore++;
        this.terrainObjects.add(id);
        console.log(`🔧 FOUND EXISTING TERRAIN: ${id} (${obj.mesh.name})`);
      }
    }
    console.log(`🔧 TERRAIN COUNT BEFORE CLEAR: ${terrainCountBefore}`);
    
    // ENHANCED FIX: Only clear non-terrain environment objects
    console.log('🔧 ⚠️  CLEARING ENVIRONMENT REGISTRATIONS (preserving terrain)...');
    const objectsToRemove: string[] = [];
    this.registeredObjects.forEach(id => {
      const obj = this.physicsManager.getCollisionObjects().get(id);
      if (obj && obj.type !== 'terrain' && !this.terrainObjects.has(id)) {
        objectsToRemove.push(id);
      }
    });
    
    objectsToRemove.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
      this.registeredObjects.delete(id);
    });
    
    const afterClear = this.physicsManager.getCollisionObjects();
    console.log(`🔧 AFTER SELECTIVE CLEAR: ${afterClear.size} collision objects remain`);

    // ENHANCED: Deep scene traversal to find all collision objects including nested castle components
    console.log('🔧 === STARTING ENHANCED DEEP SCENE TRAVERSAL ===');
    this.traverseAndRegisterObjects(this.scene);
    
    const finalCount = this.physicsManager.getCollisionObjects();
    let finalTerrainCount = 0;
    let finalEnvironmentCount = 0;
    for (const [id, obj] of finalCount) {
      if (obj.type === 'terrain') {
        finalTerrainCount++;
        console.log(`🔧 FINAL TERRAIN REGISTRATION: ${id} (${obj.mesh.name})`);
      } else if (obj.type === 'environment') {
        finalEnvironmentCount++;
        console.log(`🔧 FINAL ENVIRONMENT REGISTRATION: ${id} (${obj.mesh.name})`);
      }
    }

    console.log(`🔧 === REGISTRATION COMPLETE ===`);
    console.log(`🔧 Registered ${this.registeredObjects.size} collision objects`);
    console.log(`🔧 Final terrain count: ${finalTerrainCount}`);
    console.log(`🔧 Final environment count: ${finalEnvironmentCount}`);
    console.log(`🔧 Total collision objects: ${finalCount.size}`);
  }

  // CRITICAL FIX: Enhanced recursive traversal to find ALL collision objects including nested castle meshes
  private traverseAndRegisterObjects(object: THREE.Object3D, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    console.log(`🔧${indent}Traversing: ${object.name || 'unnamed'} (${object.type})`);

    // CRITICAL: Check if this is an individual mesh that should be registered
    if (object instanceof THREE.Mesh) {
      console.log(`🔧${indent}Found MESH: ${object.name}`);
      this.registerObjectCollision(object, depth);
    }
    
    // ENHANCED: For Groups, check if it's a castle structure but also traverse its children
    if (object instanceof THREE.Group) {
      console.log(`🔧${indent}Found GROUP: ${object.name} with ${object.children.length} children`);
      
      // If it's a main castle group, log it but don't register the group itself
      if (object.name === 'castle') {
        console.log(`🔧${indent}🏰 FOUND MAIN CASTLE GROUP - will traverse children for individual components`);
      }
      
      // CRITICAL: Always traverse children to find individual meshes
      object.children.forEach(child => {
        this.traverseAndRegisterObjects(child, depth + 1);
      });
    }
  }

  private registerObjectCollision(object: THREE.Object3D, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    
    // Skip if already registered OR if it's a known terrain object
    if (this.registeredObjects.has(object.uuid) || this.terrainObjects.has(object.uuid)) {
      console.log(`🔧${indent}SKIPPING ${object.name} - already registered`);
      return;
    }

    // ENHANCED: Enhanced handling for test hills with height data
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
          this.terrainObjects.add(id);
          console.log(`🏔️ Hill already registered with ID: ${id} - TRACKING`);
          break;
        }
      }
      
      if (!alreadyRegistered) {
        const id = this.physicsManager.addTerrainCollision(object, heightData, terrainSize, object.uuid);
        this.registeredObjects.add(id);
        this.terrainObjects.add(id);
        console.log(`🏔️ ✅ ENVIRONMENT MANAGER registered test hill as terrain collision with ID: ${id}`);
      } else {
        console.log(`🏔️ ✅ Test hill already registered by StructureGenerator - preserving existing registration`);
      }
      return;
    }

    // ENHANCED: Special handling for staircases (register steps individually)
    if (object instanceof THREE.Group && object.name === 'staircase') {
      const id = this.physicsManager.addCollisionObject(object, 'staircase', 'stone', object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🪜${indent}Registered staircase collision (with ${object.children.length} steps) at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`);
      return;
    }

    // CRITICAL FIX: Enhanced castle component detection and registration for individual meshes
    if (this.isCastleComponent(object)) {
      const material = this.determineMaterial(object);
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🏰${indent}✅ REGISTERED CASTLE COLLISION for MESH ${object.name} at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
      return;
    }

    // Standard environment object registration (tavern, etc.)
    const material = this.determineMaterial(object);
    const shouldRegister = this.shouldRegisterForCollision(object);

    if (shouldRegister) {
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🔧${indent}Registered STANDARD collision for ${object instanceof THREE.Group ? 'GROUP' : 'MESH'} ${object.name || 'unnamed'} at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
    } else {
      console.log(`🔧${indent}SKIPPED ${object.name || 'unnamed'} - failed shouldRegister check`);
    }
  }

  // CRITICAL FIX: Enhanced castle component detection that works with individual meshes
  private isCastleComponent(object: THREE.Object3D): boolean {
    // CRITICAL: Check if this mesh has a castle-related name
    if (object.name && object.name.startsWith('castle_')) {
      console.log(`🏰 DETECTED individual castle component MESH: ${object.name}`);
      return true;
    }
    
    // Check if parent hierarchy contains castle naming
    let parent = object.parent;
    let level = 0;
    while (parent && level < 10) { // Increased search depth for nested structures
      if (parent.name === 'castle' || parent.name.startsWith('castle_')) {
        console.log(`🏰 DETECTED castle child component MESH: ${object.name} (ancestor: ${parent.name})`);
        return true;
      }
      parent = parent.parent;
      level++;
    }
    
    return false;
  }

  private determineMaterial(object: THREE.Object3D): 'wood' | 'stone' | 'metal' | 'fabric' {
    // ENHANCED: Castle components are always stone
    if (this.isCastleComponent(object)) {
      console.log(`🏰 Castle component ${object.name} assigned STONE material`);
      return 'stone';
    }

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

  // CRITICAL FIX: Enhanced collision detection specifically for castle mesh components
  private shouldRegisterForCollision(object: THREE.Object3D): boolean {
    // CRITICAL: Always register castle mesh components
    if (this.isCastleComponent(object)) {
      console.log(`🏰 Castle component MESH ${object.name} APPROVED for collision (CRITICAL FIX)`);
      return true;
    }

    // Skip very small objects (likely decorative)
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    if (size.x < 0.2 && size.y < 0.2 && size.z < 0.2) {
      console.log(`🔧 SKIPPED ${object.name} - too small (${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)})`);
      return false;
    }

    // Skip objects that are too high (likely clouds or sky elements)
    if (object.position.y > 50) {
      console.log(`🔧 SKIPPED ${object.name} - too high (y=${object.position.y.toFixed(2)})`);
      return false;
    }

    // Skip ground plane
    if (size.x > 50 || size.z > 50) {
      console.log(`🔧 SKIPPED ${object.name} - ground plane size (${size.x.toFixed(2)}x${size.z.toFixed(2)})`);
      return false;
    }

    // FIXED: Register both Mesh and Group objects (trees are Groups!)
    if (object instanceof THREE.Mesh && object.geometry && object.material) {
      console.log(`🔧 APPROVED mesh ${object.name} for collision`);
      return true;
    }
    
    if (object instanceof THREE.Group && object.children.length > 0) {
      // Check if the group contains meshes with geometry and materials
      const hasSolidChildren = object.children.some(child => 
        child instanceof THREE.Mesh && child.geometry && child.material
      );
      console.log(`🔧 Group collision check: ${object.name} - ${object.children.length} children, hasSolidChildren: ${hasSolidChildren}`);
      return hasSolidChildren;
    }

    console.log(`🔧 REJECTED ${object.name} - not mesh or valid group`);
    return false;
  }

  public updateCollisions(): void {
    // CRITICAL FIX: Disable this method to prevent terrain collision corruption
    console.log('🔧 DISABLED: updateCollisions() method disabled to preserve terrain collision integrity');
    return;
  }

  public dispose(): void {
    // Clean up environment objects but preserve terrain
    this.registeredObjects.forEach(id => {
      if (!this.terrainObjects.has(id)) {
        this.physicsManager.removeCollisionObject(id);
      }
    });
    this.registeredObjects.clear();
    this.terrainObjects.clear();
    console.log('EnvironmentCollisionManager disposed with terrain preservation');
  }
}
