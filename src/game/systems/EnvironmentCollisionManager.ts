
import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class EnvironmentCollisionManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private registeredObjects: Set<string> = new Set();

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    console.log('EnvironmentCollisionManager initialized');
  }

  public registerEnvironmentCollisions(): void {
    console.log('Registering environment collisions...');
    
    // Clear existing registrations
    this.registeredObjects.forEach(id => {
      this.physicsManager.removeCollisionObject(id);
    });
    this.registeredObjects.clear();

    // Register all environment objects for collision
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        this.registerObjectCollision(object);
      } else if (object instanceof THREE.Group) {
        this.registerGroupCollision(object);
      }
    });

    console.log(`Registered ${this.registeredObjects.size} collision objects`);
  }

  private registerGroupCollision(group: THREE.Group): void {
    // Skip if already registered
    if (this.registeredObjects.has(group.uuid)) return;

    console.log('🌳 [EnvironmentCollisionManager] Processing group:', group.name || 'unnamed', 'with', group.children.length, 'children');

    // Traverse group to find meshes (like tree trunks and leaves)
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== group) {
        // Register each mesh within the group individually
        this.registerMeshFromGroup(child, group);
      }
    });
  }

  private registerMeshFromGroup(mesh: THREE.Mesh, parentGroup: THREE.Group): void {
    // Skip if already registered
    if (this.registeredObjects.has(mesh.uuid)) return;

    const material = this.determineMaterial(mesh);
    const shouldRegister = this.shouldRegisterForCollision(mesh);

    if (shouldRegister) {
      // Use mesh.uuid for individual mesh registration
      const id = this.physicsManager.addCollisionObject(mesh, 'environment', material, mesh.uuid);
      this.registeredObjects.add(id);
      
      console.log(`🌳 [EnvironmentCollisionManager] Registered mesh collision from group "${parentGroup.name || 'unnamed'}" at position: ${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)} (${material})`);
    }
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
      
      console.log(`Registered collision for object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
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
