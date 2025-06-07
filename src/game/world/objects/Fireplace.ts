
import * as THREE from 'three';
import { FireplaceComponent } from '../../buildings/components/FireplaceComponent';
import { PhysicsManager } from '../../engine/PhysicsManager';
import { AudioManager } from '../../engine/AudioManager';

export class Fireplace {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private audioManager: AudioManager;
  private fireplaceComponent: FireplaceComponent;
  private position: THREE.Vector3;
  private id: string;

  constructor(
    scene: THREE.Scene,
    physicsManager: PhysicsManager,
    audioManager: AudioManager,
    position: THREE.Vector3,
    id?: string
  ) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.audioManager = audioManager;
    this.position = position.clone();
    this.id = id || `fireplace_${Date.now()}`;

    this.fireplaceComponent = new FireplaceComponent(
      this.scene,
      this.physicsManager,
      this.audioManager,
      this.position,
      this.id
    );
  }

  public static createAt(
    scene: THREE.Scene,
    physicsManager: PhysicsManager,
    audioManager: AudioManager,
    position: THREE.Vector3,
    id?: string
  ): Fireplace {
    const fireplace = new Fireplace(scene, physicsManager, audioManager, position, id);
    fireplace.create();
    return fireplace;
  }

  public create(): THREE.Group {
    console.log(`🔥 Creating standalone fireplace at position:`, this.position);
    const group = this.fireplaceComponent.create();
    this.fireplaceComponent.registerCollisions('standalone');
    return group;
  }

  public update(deltaTime: number): void {
    this.fireplaceComponent.update(deltaTime);
  }

  public extinguish(): void {
    this.fireplaceComponent.extinguishFire();
  }

  public light(): void {
    this.fireplaceComponent.lightFire();
  }

  public setIntensity(intensity: number): void {
    this.fireplaceComponent.setFireIntensity(intensity);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getId(): string {
    return this.id;
  }

  public dispose(): void {
    this.fireplaceComponent.dispose();
  }
}
