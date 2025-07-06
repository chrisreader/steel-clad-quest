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
  private fireActive: boolean = false;
  private currentGameTime: number = 0;
  private alwaysOn: boolean = false;

  constructor(
    scene: THREE.Scene, 
    physicsManager: PhysicsManager, 
    audioManager: AudioManager, 
    position: THREE.Vector3,
    id: string = 'main_fireplace',
    alwaysOn: boolean = false
  ) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.audioManager = audioManager;
    this.position = position.clone();
    this.fireplaceId = id;
    this.alwaysOn = alwaysOn;
    
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

    // Create surrounding rocks with realistic campfire sizing - doubled rock count
    this.fireplaceRocks = new FireplaceRocks(this.scene, this.physicsManager, new THREE.Vector3(0, 0, 0));
    const rocksGroup = this.fireplaceRocks.createRockCircle(0.8, 16);
    this.fireplaceGroup.add(rocksGroup);

    // Start fire immediately if always-on (tavern), otherwise wait for night time
    if (this.alwaysOn) {
      this.lightFire();
      this.fireActive = true;
    }

    this.scene.add(this.fireplaceGroup);
    console.log(`🔥 Fireplace component '${this.fireplaceId}' created with MASSIVE landscape-reaching lighting`);
    
    return this.fireplaceGroup;
  }

  public updateTimeOfDay(gameTime: number, timePhases: any): void {
    this.currentGameTime = gameTime;
    this.fireSystem.updateTimeOfDay(gameTime, timePhases);
    
    // Skip time-based control if always on (tavern fire)
    if (this.alwaysOn) {
      if (!this.fireActive) {
        this.lightFire();
        this.fireActive = true;
      }
      return;
    }
    
    // Turn fire on at night (18:00-6:00), off during day for camp fires
    const isNightTime = gameTime >= 18 || gameTime <= 6;
    
    if (isNightTime && !this.fireActive) {
      this.lightFire();
      this.fireActive = true;
    } else if (!isNightTime && this.fireActive) {
      this.extinguishFire();
      this.fireActive = false;
    }
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
      lightIntensity: 10.0, // MASSIVE intensity for landscape visibility  
      lightDistance: 120    // EXTREME range for doorway spillover effect
    });
    
    console.log(`🔥 Fire '${this.fireplaceId}' lit with MASSIVE landscape-reaching lighting`);
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
