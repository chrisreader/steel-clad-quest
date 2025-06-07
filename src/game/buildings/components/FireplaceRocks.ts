
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

  public createRockCircle(radius: number = 0.8, rockCount: number = 8): THREE.Group {
    console.log(`🪨 Creating fireplace rock circle with ${rockCount} rocks at radius ${radius}`);

    // Create realistic rock material with better visibility
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.8,
      metalness: 0.1
    });

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const rockRadius = radius + (Math.random() - 0.5) * 0.1;
      
      const x = Math.cos(angle) * rockRadius;
      const z = Math.sin(angle) * rockRadius;

      // Generate rocks for 15-26cm diameter (0.15-0.26 units base size)
      const rockType = Math.random() < 0.6 ? 'boulder' : Math.random() < 0.8 ? 'flat' : 'angular';
      const rockShape = SimpleRockGenerator.generateSimpleRock(rockType, 0.15 + Math.random() * 0.11);

      // Create rock with scale for 15-26cm diameter
      const rock = new THREE.Mesh(rockShape.geometry, rockMaterial.clone());
      const scaleValue = 0.9 + Math.random() * 0.4; // 0.9 to 1.3 scale for 15-26cm rocks
      rock.scale.setScalar(scaleValue);
      rock.rotation.copy(rockShape.rotation);
      
      // Position rock properly on ground level with slight height variation
      const heightVariation = Math.random() * 0.04; // Small random height for natural placement
      rock.position.set(x, 0.09 + heightVariation, z); // Adjusted height for smaller rocks
      
      // Add natural tilt for organic look
      rock.rotation.x += (Math.random() - 0.5) * 0.3;
      rock.rotation.z += (Math.random() - 0.5) * 0.3;

      // Enable shadows for realism
      rock.castShadow = true;
      rock.receiveShadow = true;

      this.rocks.push(rock);
      this.rockGroup.add(rock);

      console.log(`🪨 Created realistic ${rockType} rock ${i + 1} at (${x.toFixed(2)}, ${z.toFixed(2)}) with scale ${scaleValue.toFixed(2)}`);
    }

    // Add smaller accent rocks for natural variation (12-18cm)
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const smallRadius = radius * 0.7 + Math.random() * 0.2;
      
      const x = Math.cos(angle) * smallRadius;
      const z = Math.sin(angle) * smallRadius;

      const smallRockShape = SimpleRockGenerator.generateSimpleRock('flat', 0.12);
      const smallRock = new THREE.Mesh(smallRockShape.geometry, rockMaterial.clone());
      
      smallRock.scale.setScalar(0.7 + Math.random() * 0.3); // 12-18cm accent rocks
      smallRock.rotation.copy(smallRockShape.rotation);
      smallRock.position.set(x, 0.07, z);
      
      // Flatten small rocks more (lying flat orientation)
      smallRock.rotation.x += Math.PI * 0.4;
      smallRock.rotation.z += (Math.random() - 0.5) * 0.4;
      
      smallRock.castShadow = true;
      smallRock.receiveShadow = true;

      this.rocks.push(smallRock);
      this.rockGroup.add(smallRock);
    }

    this.scene.add(this.rockGroup);
    console.log(`🪨 Realistic fireplace rock circle created with ${this.rocks.length} properly sized rocks (15-26cm diameter)`);
    
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
