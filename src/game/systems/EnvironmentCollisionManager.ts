
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
      if (this.shouldRegisterForCollision(object)) {
        this.registerObjectCollision(object);
      }
    });

    console.log(`Registered ${this.registeredObjects.size} collision objects`);
  }

  private registerObjectCollision(object: THREE.Object3D): void {
    // Skip if already registered
    if (this.registeredObjects.has(object.uuid)) return;

    // Determine object type and material based on geometry and position
    const material = this.determineMaterial(object);
    
    const id = this.physicsManager.addCollisionObject(object, 'environment', material, object.uuid);
    this.registeredObjects.add(id);
    
    console.log(`Registered collision for object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)} (${material})`);
  }

  private determineMaterial(object: THREE.Object3D): 'wood' | 'stone' | 'metal' | 'fabric' {
    // Check if this is a tree (Group with multiple children including trunk and leaves)
    if (object instanceof THREE.Group) {
      // Check for tree-like structure (trunk + leaves)
      let hasTrunk = false;
      let hasLeaves = false;
      
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          if (material instanceof THREE.MeshLambertMaterial) {
            const color = material.color;
            // Brown colors suggest trunk
            if (color.r > 0.4 && color.g > 0.3 && color.b < 0.4) {
              hasTrunk = true;
            }
            // Green colors suggest leaves
            if (color.g > 0.5 && color.r < 0.4) {
              hasLeaves = true;
            }
          }
        }
      });
      
      if (hasTrunk && hasLeaves) {
        return 'wood'; // This is definitely a tree
      }
    }

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
    // Always register Groups (trees are Groups)
    if (object instanceof THREE.Group) {
      // Check if this group has mesh children (tree structure)
      let hasMeshChildren = false;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && child.material) {
          hasMeshChildren = true;
        }
      });
      
      if (hasMeshChildren) {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const size = boundingBox.getSize(new THREE.Vector3());
        
        // Skip very small groups
        if (size.x < 0.2 && size.y < 0.2 && size.z < 0.2) {
          return false;
        }
        
        // Skip objects that are too high (clouds)
        if (object.position.y > 50) {
          return false;
        }
        
        // Skip ground plane
        if (size.x > 50 || size.z > 50) {
          return false;
        }
        
        console.log(`Tree group found at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}, size: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`);
        return true;
      }
    }

    // Register individual meshes that meet criteria
    if (object instanceof THREE.Mesh && object.geometry && object.material) {
      const boundingBox = new THREE.Box3().setFromObject(object);
      const size = boundingBox.getSize(new THREE.Vector3());
      
      // Skip very small objects (likely decorative)
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

      return true;
    }

    return false;
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
