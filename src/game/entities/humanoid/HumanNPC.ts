import * as THREE from 'three';
import { PeacefulHumanoid } from './PeacefulHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TavernKeeperBehavior } from '../../ai/TavernKeeperBehavior';

export interface HumanNPCConfig {
  name: string;
  position: THREE.Vector3;
  wanderRadius?: number;
  useRandomizedAppearance?: boolean;
  toolType?: 'mug' | 'dagger' | 'sword' | 'staff' | 'axe';
}

export class HumanNPC {
  private humanoid: PeacefulHumanoid;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private behavior: TavernKeeperBehavior;
  private config: HumanNPCConfig;
  
  private walkTime: number = 0;
  private isDead: boolean = false;

  constructor(
    scene: THREE.Scene,
    config: HumanNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Create realistic human using the sophisticated PeacefulHumanoid system
    this.humanoid = new PeacefulHumanoid(
      scene,
      config.position,
      effectsManager,
      audioManager,
      true, // Always tavern keeper type
      config.useRandomizedAppearance || false,
      config.toolType || 'mug' // Default to mug for tavern keeper
    );
    
    this.setupBehavior();
    
    console.log(`👤 [HumanNPC] Created realistic tavern keeper at position:`, config.position);
  }

  // Body creation is now handled by PeacefulHumanoid - no primitive geometry needed!

  private setupBehavior(): void {
    this.behavior = new TavernKeeperBehavior({
      wanderRadius: this.config.wanderRadius || 8,
      moveSpeed: 1.5,
      pauseDuration: 3000,
      interactionRadius: 15
    });
    
    console.log(`🧠 [HumanNPC] Setup tavern keeper behavior for ${this.config.name}`);
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    // Update AI behavior
    const action = this.behavior.update(deltaTime, this.getMesh().position, playerPosition);
    
    // Handle movement based on behavior
    if (action.type === 'move' && action.target) {
      this.moveTowards(action.target, deltaTime);
      // Use unified animation method with movement state
      this.humanoid.updateAnimation(deltaTime, true, 1.5); // isMoving=true, speed=1.5
    } else if (action.type === 'idle') {
      // Use unified animation method for idle state
      this.humanoid.updateAnimation(deltaTime, false, 0); // isMoving=false
    } else if (action.type === 'interact') {
      // Use unified animation method for interaction
      this.humanoid.updateAnimation(deltaTime, false, 0); // isMoving=false
    }
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const mesh = this.getMesh();
    const direction = new THREE.Vector3()
      .subVectors(target, mesh.position)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 1.5 * deltaTime;
    const newPosition = mesh.position.clone();
    newPosition.add(direction.multiplyScalar(moveSpeed));
    newPosition.y = 0; // Ensure stays on ground
    
    // Check distance to avoid overshooting
    const distanceToTarget = mesh.position.distanceTo(target);
    if (distanceToTarget > 0.5) {
      mesh.position.copy(newPosition);
      
      // Update rotation to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetRotation, 0.1);
    }
  }

  // Animation is now handled by the sophisticated PeacefulHumanoid system!

  public getMesh(): THREE.Group {
    return this.humanoid.getMesh();
  }

  public getPosition(): THREE.Vector3 {
    return this.humanoid.getPosition();
  }

  public getName(): string {
    return this.config.name;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public dispose(): void {
    // Dispose of the sophisticated humanoid
    this.humanoid.dispose();
    
    console.log(`👤 [HumanNPC] Disposed realistic tavern keeper ${this.config.name}`);
  }

  public static createTavernKeeper(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): HumanNPC {
    return new HumanNPC(scene, {
      name: 'Tavern Keeper',
      position: position,
      wanderRadius: 8,
      toolType: 'mug'
    }, effectsManager, audioManager);
  }
}