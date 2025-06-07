
import * as THREE from 'three';
import { SimpleRockGenerator } from './SimpleRockGenerator';
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

  public createRockCircle(radius: number = 0.6, rockCount: number = 6): THREE.Group {
    console.log(`🪨 Creating fireplace rock circle with ${rockCount} rocks at radius ${radius}`);

    // Create darker rock material for better contrast with fire
    const rockMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 10
    });

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const rockRadius = radius + (Math.random() - 0.5) * 0.1; // Smaller radius variation
      
      const x = Math.cos(angle) * rockRadius;
      const z = Math.sin(angle) * rockRadius;

      // Generate simple organic rock shape
      const rockType = Math.random() < 0.4 ? 'flat' : Math.random() < 0.7 ? 'boulder' : 'angular';
      const rockShape = SimpleRockGenerator.generateSimpleRock(rockType, 0.05 + Math.random() * 0.03);

      // Use simple, small scale
      const rock = new THREE.Mesh(rockShape.geometry, rockMaterial.clone());
      rock.scale.setScalar(0.4);
      rock.rotation.copy(rockShape.rotation);
      
      // Position rock on ground level
      rock.position.set(x, 0.02, z); // Very small y-offset to sit on ground
      
      // Add minimal random tilt for natural look
      rock.rotation.x += (Math.random() - 0.5) * 0.2;
      rock.rotation.z += (Math.random() - 0.5) * 0.2;

      // Enable shadows
      rock.castShadow = true;
      rock.receiveShadow = true;

      this.rocks.push(rock);
      this.rockGroup.add(rock);

      console.log(`🪨 Created ${rockType} rock ${i + 1} at (${x.toFixed(2)}, ${z.toFixed(2)}) with scale 0.4`);
    }

    // Add fewer smaller rocks between the main ones for detail
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const smallRadius = radius * 0.8 + Math.random() * 0.2;
      
      const x = Math.cos(angle) * smallRadius;
      const z = Math.sin(angle) * smallRadius;

      const smallRockShape = SimpleRockGenerator.generateSimpleRock('flat', 0.03 + Math.random() * 0.02);
      const smallRock = new THREE.Mesh(smallRockShape.geometry, rockMaterial.clone());
      
      smallRock.scale.setScalar(0.25); // Very small scale for detail rocks
      smallRock.rotation.copy(smallRockShape.rotation);
      smallRock.position.set(x, 0.01, z);
      
      smallRock.castShadow = true;
      smallRock.receiveShadow = true;

      this.rocks.push(smallRock);
      this.rockGroup.add(smallRock);
    }

    this.scene.add(this.rockGroup);
    console.log(`🪨 Fireplace rock circle created with ${this.rocks.length} total small rocks`);
    
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
