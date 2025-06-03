
import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class EnvironmentCollisionManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private registeredObjects: Set<string> = new Set();

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('🏔️ [EnvironmentCollisionManager] Initialized');
    
    // Set scene reference in physics manager for direct terrain detection
    this.physicsManager.setScene(scene);
  }

  public registerEnvironmentCollisions(): void {
    console.log('🏔️ [EnvironmentCollisionManager] Registering environment collisions...');
    
    // Clear existing registrations
    this.registeredObjects.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
    });
    this.registeredObjects.clear();

    // Register all environment objects for collision
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        this.registerObjectCollision(object);
      }
    });

    console.log(`🏔️ [EnvironmentCollisionManager] Registered ${this.registeredObjects.size} collision objects`);
  }

  // NEW: Method to register collisions for newly created objects
  public registerNewObject(object: THREE.Object3D): string | null {
    if (this.registeredObjects.has(object.uuid)) return null;

    const material = this.determineMaterial(object);
    const shouldRegister = this.shouldRegisterForCollision(object);

    if (shouldRegister) {
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🏔️ [EnvironmentCollisionManager] Registered new object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
      return id;
    }
    
    return null;
  }

  // NEW: Method to register multiple objects (for region loading)
  public registerObjects(objects: THREE.Object3D[]): void {
    console.log(`🏔️ [EnvironmentCollisionManager] Registering ${objects.length} new objects for collision`);
    
    objects.forEach(object => {
      this.registerNewObject(object);
    });
  }

  private registerObjectCollision(object: THREE.Object3D): void {
    // Skip if already registered
    if (this.registeredObjects.has(object.uuid)) return;

    // Determine object type and material based on geometry and position
    const material = this.determineMaterial(object);
    const shouldRegister = this.shouldRegisterForCollision(object);

    if (shouldRegister) {
      const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🏔️ [EnvironmentCollisionManager] Registered collision for object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
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

    // Don't skip ground plane - terrain should be handled by direct scene raycast
    // But still register smaller terrain features
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
    console.log('🏔️ [EnvironmentCollisionManager] Disposed');
  }
}
