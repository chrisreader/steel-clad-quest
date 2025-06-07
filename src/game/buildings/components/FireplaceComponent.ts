
import * as THREE from 'three';
import { FireplaceGeometry } from './FireplaceGeometry';
import { FireplaceRocks } from './FireplaceRocks';
import { FireSystem } from '../../effects/fire/FireSystem';
import { PhysicsManager } from '../../engine/PhysicsManager';
import { AudioManager } from '../../engine/AudioManager';

export class FireplaceComponent {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private audioManager: AudioManager;
  private position: THREE.Vector3;
  
  private fireplaceGeometry: FireplaceGeometry | null = null;
  private fireplaceRocks: FireplaceRocks | null = null;
  private fireSystem: FireSystem;
  private fireplaceGroup: THREE.Group;
  
  private fireplaceId: string;

  constructor(
    scene: THREE.Scene, 
    physicsManager: PhysicsManager, 
    audioManager: AudioManager, 
    position: THREE.Vector3,
    id: string = 'main_fireplace'
  ) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.audioManager = audioManager;
    this.position = position.clone();
    this.fireplaceId = id;
    
    this.fireplaceGroup = new THREE.Group();
    this.fireplaceGroup.position.copy(this.position);
    
    this.fireSystem = new FireSystem(this.scene, this.audioManager);
  }

  public create(): THREE.Group {
    console.log(`🔥 Creating fireplace component '${this.fireplaceId}' at position:`, this.position);

    // Create fireplace structure (base, logs, ash)
    this.fireplaceGeometry = new FireplaceGeometry(this.scene, new THREE.Vector3(0, 0, 0));
    const structureGroup = this.fireplaceGeometry.createFireplaceStructure();
    this.fireplaceGroup.add(structureGroup);

    // Create surrounding rocks with realistic campfire sizing
    this.fireplaceRocks = new FireplaceRocks(this.scene, this.physicsManager, new THREE.Vector3(0, 0, 0));
    const rocksGroup = this.fireplaceRocks.createRockCircle(0.8, 8);
    this.fireplaceGroup.add(rocksGroup);

    // Create fire effects
    const firePosition = this.position.clone();
    firePosition.y += 0.2; // Slightly above the base
    
    this.fireSystem.createFire(this.fireplaceId, firePosition, {
      intensity: 1.0,
      size: 1.0,
      particleCount: 45,
      smokeEnabled: true,
      emberCount: 12,
      lightIntensity: 1.5,
      lightDistance: 8
    });

    this.scene.add(this.fireplaceGroup);
    console.log(`🔥 Fireplace component '${this.fireplaceId}' created successfully`);
    
    return this.fireplaceGroup;
  }

  public registerCollisions(buildingName: string = 'tavern'): void {
    if (this.fireplaceRocks) {
      this.fireplaceRocks.registerCollisions(`${buildingName}_fireplace`);
    }
  }

  public update(deltaTime: number): void {
    this.fireSystem.update(deltaTime);
  }

  public extinguishFire(): void {
    this.fireSystem.removeFire(this.fireplaceId);
    console.log(`🔥 Fire '${this.fireplaceId}' extinguished`);
  }

  public lightFire(): void {
    const firePosition = this.position.clone();
    firePosition.y += 0.2;
    
    this.fireSystem.createFire(this.fireplaceId, firePosition, {
      intensity: 1.0,
      size: 1.0,
      particleCount: 45,
      smokeEnabled: true,
      emberCount: 12,
      lightIntensity: 1.5,
      lightDistance: 8
    });
    
    console.log(`🔥 Fire '${this.fireplaceId}' lit`);
  }

  public setFireIntensity(intensity: number): void {
    const fire = this.fireSystem.getFire(this.fireplaceId);
    if (fire) {
      fire.setIntensity(intensity);
    }
  }

  public getFireplaceGroup(): THREE.Group {
    return this.fireplaceGroup;
  }

  public dispose(): void {
    console.log(`🔥 Disposing fireplace component '${this.fireplaceId}'`);
    
    this.fireSystem.dispose();
    
    if (this.fireplaceGeometry) {
      this.fireplaceGeometry.dispose();
      this.fireplaceGeometry = null;
    }
    
    if (this.fireplaceRocks) {
      this.fireplaceRocks.dispose();
      this.fireplaceRocks = null;
    }
    
    this.scene.remove(this.fireplaceGroup);
    console.log(`🔥 Fireplace component '${this.fireplaceId}' disposed`);
  }
}
