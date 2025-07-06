import * as THREE from 'three';
import { PeacefulHumanoid } from './PeacefulHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { CampKeeperBehavior } from '../../ai/CampKeeperBehavior';

export interface CampNPCConfig {
  name: string;
  position: THREE.Vector3;
  campCenter: THREE.Vector3;
  wanderRadius?: number;
  useRandomizedAppearance?: boolean;
  toolType?: 'dagger' | 'sword' | 'staff' | 'axe';
}

export class CampNPC {
  private humanoid: PeacefulHumanoid;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private behavior: CampKeeperBehavior;
  private config: CampNPCConfig;
  
  private walkTime: number = 0;
  private isDead: boolean = false;

  constructor(
    scene: THREE.Scene,
    config: CampNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    console.log(`👤 [CampNPC] Creating camp keeper at position:`, config.position);
    
    // Create realistic human using the sophisticated PeacefulHumanoid system
    this.humanoid = new PeacefulHumanoid(
      scene,
      config.position,
      effectsManager,
      audioManager,
      false, // Not tavern keeper type
      config.useRandomizedAppearance || true, // Use randomized appearance for variety
      config.toolType || 'dagger' // Default to dagger for camp keeper
    );
    
    this.setupBehavior();
    
    console.log(`👤 [CampNPC] Created realistic camp keeper at position:`, config.position);
  }

  private setupBehavior(): void {
    this.behavior = new CampKeeperBehavior({
      wanderRadius: this.config.wanderRadius || 8,
      moveSpeed: 2.0,
      pauseDuration: 1500,
      interactionRadius: 12
    }, this.config.campCenter);
    
    console.log(`🧠 [CampNPC] Setup enhanced camp keeper behavior for ${this.config.name} - faster movement, shorter pauses, larger patrol area`);
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    // Update AI behavior
    const action = this.behavior.update(deltaTime, this.getMesh().position, playerPosition);
    
    // Handle movement based on behavior with enhanced logging
    if (action.type === 'move' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.humanoid.updateWalkAnimation(deltaTime);
      console.log('🚶 [CampNPC] Moving towards target:', action.target, 'at speed:', 2.0);
    } else if (action.type === 'idle') {
      this.humanoid.updateIdleAnimation(deltaTime);
      console.log('🛌 [CampNPC] Standing idle at position:', this.getMesh().position);
    } else if (action.type === 'interact') {
      this.humanoid.updateIdleAnimation(deltaTime);
      console.log('💬 [CampNPC] Interacting with player');
    }
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const mesh = this.getMesh();
    const direction = new THREE.Vector3()
      .subVectors(target, mesh.position)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 2.0 * deltaTime;
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
    this.humanoid.dispose();
    console.log(`👤 [CampNPC] Disposed realistic camp keeper ${this.config.name}`);
  }

  public static createCampKeeper(
    scene: THREE.Scene,
    position: THREE.Vector3,
    campCenter: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): CampNPC {
    const tools = ['dagger', 'sword', 'staff', 'axe'];
    const randomTool = tools[Math.floor(Math.random() * tools.length)] as 'dagger' | 'sword' | 'staff' | 'axe';
    
    console.log('👤 [CampNPC] Creating camp keeper at position:', position, 'for camp at:', campCenter);
    
    return new CampNPC(scene, {
      name: 'Camp Keeper',
      position: position,
      campCenter: campCenter,
      wanderRadius: 6,
      useRandomizedAppearance: true,
      toolType: randomTool
    }, effectsManager, audioManager);
  }
}