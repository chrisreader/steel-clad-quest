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
    this.position = position.clone(); // Store world position for fire effects
    this.fireplaceId = id;
    this.alwaysOn = alwaysOn;
    
    this.fireplaceGroup = new THREE.Group();
    // Use relative positioning (0,0,0) since parent handles world positioning
    this.fireplaceGroup.position.set(0, 0, 0);
    
    this.fireSystem = new FireSystem(this.scene, this.audioManager);
  }

  public create(): THREE.Group {
    console.log(`🔥 Creating fireplace component '${this.fireplaceId}' at position:`, this.position, `alwaysOn: ${this.alwaysOn}`);

    // Create fireplace structure (base, logs, ash)
    this.fireplaceGeometry = new FireplaceGeometry(this.scene, new THREE.Vector3(0, 0, 0));
    const structureGroup = this.fireplaceGeometry.createFireplaceStructure();
    this.fireplaceGroup.add(structureGroup);

    // Create surrounding rocks with realistic campfire sizing - doubled rock count
    this.fireplaceRocks = new FireplaceRocks(this.scene, this.physicsManager, new THREE.Vector3(0, 0, 0));
    const rocksGroup = this.fireplaceRocks.createRockCircle(0.8, 16);
    this.fireplaceGroup.add(rocksGroup);

    // Start fire immediately if always-on (tavern), otherwise wait for time updates for camp fires
    if (this.alwaysOn) {
      console.log(`🔥 [${this.fireplaceId}] TAVERN FIRE - Always on, lighting immediately`);
      this.lightFire();
      this.fireActive = true;
    } else {
      console.log(`🔥 [${this.fireplaceId}] CAMP FIRE - Time-based, starting inactive`);
      this.fireActive = false;
    }

    // Don't add directly to scene - let the parent building handle positioning
    console.log(`🔥 Fireplace component '${this.fireplaceId}' created - Fire Active: ${this.fireActive}`);
    
    return this.fireplaceGroup;
  }

  public updateTimeOfDay(gameTime: number, timePhases: any): void {
    this.currentGameTime = gameTime;
    this.fireSystem.updateTimeOfDay(gameTime, timePhases);
    
    console.log(`🔥 [${this.fireplaceId}] Time update: ${gameTime.toFixed(1)}h, alwaysOn: ${this.alwaysOn}, fireActive: ${this.fireActive}`);
    
    // Skip time-based control if always on (tavern fire)
    if (this.alwaysOn) {
      console.log(`🔥 [${this.fireplaceId}] TAVERN FIRE - Skipping time-based control`);
      if (!this.fireActive) {
        console.log(`🔥 [${this.fireplaceId}] TAVERN FIRE - Fire was off, lighting it`);
        this.lightFire();
        this.fireActive = true;
      }
      return;
    }
    
    // Turn fire on at sunset (19:00) and off at sunrise (6:00) for camp fires
    const isNightTime = gameTime >= 19 || gameTime <= 6;
    console.log(`🔥 [${this.fireplaceId}] CAMP FIRE - Time: ${gameTime.toFixed(1)}h, isNightTime: ${isNightTime}, fireActive: ${this.fireActive}`);
    
    if (isNightTime && !this.fireActive) {
      console.log(`🔥 [${this.fireplaceId}] 🌙 CAMP FIRE - Lighting fire for night time!`);
      this.lightFire();
      this.fireActive = true;
    } else if (!isNightTime && this.fireActive) {
      console.log(`🔥 [${this.fireplaceId}] ☀️ CAMP FIRE - Extinguishing fire for day time!`);
      this.extinguishFire();
      this.fireActive = false;
    } else if (isNightTime && this.fireActive) {
      // FORCED FIX: Check if fire is actually lit visually
      const actualFire = this.fireSystem.getFire(this.fireplaceId);
      if (!actualFire || !actualFire.isRunning()) {
        console.log(`🔥 [${this.fireplaceId}] 🔧 CAMP FIRE - Fire marked active but not running, re-lighting!`);
        this.lightFire();
      } else {
        console.log(`🔥 [${this.fireplaceId}] CAMP FIRE - No state change needed`);
      }
    } else {
      console.log(`🔥 [${this.fireplaceId}] CAMP FIRE - No state change needed`);
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
    // Use the original position that was passed to the constructor
    // Since we're now using relative positioning, we need to add the parent's world position
    const firePosition = this.position.clone();
    firePosition.y += 0.2;
    
    console.log(`🔥 [${this.fireplaceId}] Lighting fire at position:`, firePosition);
    
    this.fireSystem.createFire(this.fireplaceId, firePosition, {
      intensity: 1.0,
      size: 1.0,
      particleCount: 45,
      smokeEnabled: true,
      emberCount: 12,
      lightIntensity: 12.0, // Strong intensity for realistic shadow casting  
      lightDistance: 60     // Good range for area lighting
    });
    
    const fireType = this.alwaysOn ? 'TAVERN' : 'CAMP';
    console.log(`🔥✨ [${this.fireplaceId}] ${fireType} FIRE LIT - Strong shadows & lighting active!`);
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
    
    // Don't remove from scene - parent building handles cleanup
    console.log(`🔥 Fireplace component '${this.fireplaceId}' disposed`);
  }
}
