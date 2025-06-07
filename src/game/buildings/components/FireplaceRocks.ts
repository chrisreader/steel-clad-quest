
import * as THREE from 'three';
import { RockShapeFactory } from '../../world/rocks/generators/RockShapeFactory';
import { PhysicsManager } from '../../engine/PhysicsManager';

export class FireplaceRocks {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private position: THREE.Vector3;
  private rocks: THREE.Mesh[] = [];
  private rockGroup: THREE.Group;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager, position: THREE.Vector3) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.position = position.clone();
    this.rockGroup = new THREE.Group();
    this.rockGroup.position.copy(this.position);
  }

  public createRockCircle(radius: number = 1.2, rockCount: number = 10): THREE.Group {
    console.log(`🪨 Creating fireplace rock circle with ${rockCount} rocks at radius ${radius}`);

    // Create rock material
    const rockMaterial = new THREE.MeshLambertMaterial({
      color: 0x555555
    });

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const rockRadius = radius + (Math.random() - 0.5) * 0.3; // Vary radius slightly
      
      const x = Math.cos(angle) * rockRadius;
      const z = Math.sin(angle) * rockRadius;

      // Generate organic rock shape
      const rockType = Math.random() < 0.4 ? 'flat' : Math.random() < 0.7 ? 'boulder' : 'angular';
      const rockShape = RockShapeFactory.generateRock(rockType, 0.15 + Math.random() * 0.15, 0.6);

      // Apply additional scale variation
      const finalScale = rockShape.scale * (0.8 + Math.random() * 0.4);
      
      const rock = new THREE.Mesh(rockShape.geometry, rockMaterial.clone());
      rock.scale.setScalar(finalScale);
      rock.rotation.copy(rockShape.rotation);
      
      // Position rock
      rock.position.set(x, rockShape.scale * 0.1, z); // Slight y-offset based on size
      
      // Add slight random tilt for natural look
      rock.rotation.x += (Math.random() - 0.5) * 0.3;
      rock.rotation.z += (Math.random() - 0.5) * 0.3;

      // Enable shadows
      rock.castShadow = true;
      rock.receiveShadow = true;

      this.rocks.push(rock);
      this.rockGroup.add(rock);

      console.log(`🪨 Created ${rockType} rock ${i + 1} at (${x.toFixed(2)}, ${z.toFixed(2)}) with scale ${finalScale.toFixed(2)}`);
    }

    // Add some smaller rocks between the main ones for detail
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const smallRadius = radius * 0.7 + Math.random() * 0.4;
      
      const x = Math.cos(angle) * smallRadius;
      const z = Math.sin(angle) * smallRadius;

      const smallRockShape = RockShapeFactory.generateRock('flat', 0.08 + Math.random() * 0.06, 0.4);
      const smallRock = new THREE.Mesh(smallRockShape.geometry, rockMaterial.clone());
      
      smallRock.scale.setScalar(smallRockShape.scale * 0.6);
      smallRock.rotation.copy(smallRockShape.rotation);
      smallRock.position.set(x, smallRockShape.scale * 0.05, z);
      
      smallRock.castShadow = true;
      smallRock.receiveShadow = true;

      this.rocks.push(smallRock);
      this.rockGroup.add(smallRock);
    }

    this.scene.add(this.rockGroup);
    console.log(`🪨 Fireplace rock circle created with ${this.rocks.length} total rocks`);
    
    return this.rockGroup;
  }

  public registerCollisions(buildingName: string = 'fireplace'): void {
    console.log(`🔧 Registering collision for ${this.rocks.length} fireplace rocks`);
    
    for (let i = 0; i < this.rocks.length; i++) {
      const rock = this.rocks[i];
      this.physicsManager.addCollisionObject(
        rock,
        'environment',
        'stone',
        `${buildingName}_rock_${i}_${Date.now()}`
      );
    }
    
    console.log(`🔧 All fireplace rock collisions registered`);
  }

  public dispose(): void {
    console.log('🪨 Disposing fireplace rocks');
    
    // Remove from scene
    this.scene.remove(this.rockGroup);
    
    // Dispose geometries and materials
    for (const rock of this.rocks) {
      if (rock.geometry) rock.geometry.dispose();
      if (rock.material instanceof THREE.Material) {
        rock.material.dispose();
      }
    }
    
    this.rocks = [];
    console.log('🪨 Fireplace rocks disposed');
  }
}
