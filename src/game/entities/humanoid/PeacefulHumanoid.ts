import * as THREE from 'three';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';

/**
 * PeacefulHumanoid extends the sophisticated EnemyHumanoid body system
 * but removes all combat functionality for friendly NPCs
 */
export abstract class PeacefulHumanoid extends EnemyHumanoid {
  protected isNPC: boolean = true;
  protected basePosition: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, config, position, effectsManager, audioManager);
    this.basePosition = position.clone();
    
    // Override initial health to prevent any damage system activation
    this.health = this.config.maxHealth;
    this.isDead = false;
    
    console.log('🕊️ [PeacefulHumanoid] Created non-combat humanoid with full anatomy');
  }

  /**
   * Override combat methods to be non-functional for peaceful NPCs
   */
  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    // Peaceful NPCs cannot be damaged - override the parent method
    return;
  }

  /**
   * Override death-related methods since NPCs don't die
   */
  public getIsDead(): boolean {
    return false; // NPCs never die
  }

  public shouldRemove(): boolean {
    return false; // NPCs are persistent
  }

  /**
   * Peaceful update - only handles animation and peaceful behaviors
   */
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // Update animation system with peaceful parameters (no combat)
    if (this.animationSystem && !this.isDead) {
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0); // Default to idle
    }
    
    // Handle any custom NPC behaviors (implemented by subclasses)
    this.updateNPCBehavior(deltaTime, playerPosition);
  }

  /**
   * Abstract method for NPC-specific behavior updates
   * Subclasses should implement their own behavior logic
   */
  protected abstract updateNPCBehavior(deltaTime: number, playerPosition?: THREE.Vector3): void;

  /**
   * NPCs don't create weapons - override to return empty group
   */
  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    return new THREE.Group(); // Empty group for peaceful NPCs
  }

  /**
   * Set NPC to idle animation state
   */
  public setIdleState(): void {
    if (this.animationSystem) {
      this.animationSystem.updateWalkAnimation(0.016, false, 0); // 60fps idle
    }
  }

  /**
   * Set NPC to walking animation state
   */
  public setWalkingState(): void {
    if (this.animationSystem) {
      this.animationSystem.updateWalkAnimation(0.016, true, this.config.speed); // 60fps walking
    }
  }

  /**
   * Move the NPC smoothly to a target position
   */
  public moveTowards(target: THREE.Vector3, speed: number, deltaTime: number): boolean {
    const direction = new THREE.Vector3()
      .subVectors(target, this.mesh.position)
      .normalize();
    
    // Keep movement on ground level
    direction.y = 0;
    
    const moveDistance = speed * deltaTime;
    const distanceToTarget = this.mesh.position.distanceTo(target);
    
    if (distanceToTarget > 0.5) {
      const newPosition = this.mesh.position.clone();
      newPosition.add(direction.multiplyScalar(moveDistance));
      newPosition.y = this.basePosition.y; // Maintain ground level
      
      this.mesh.position.copy(newPosition);
      
      // Rotate to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y, 
        targetRotation, 
        0.1
      );
      
      // Update animation to walking with proper parameters
      if (this.animationSystem) {
        this.animationSystem.updateWalkAnimation(deltaTime, true, speed);
      }
      return false; // Still moving
    } else {
      // Update animation to idle
      if (this.animationSystem) {
        this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
      }
      return true; // Reached target
    }
  }

  /**
   * Face towards a specific position (useful for interactions)
   */
  public faceTowards(target: THREE.Vector3, speed: number = 0.1): void {
    const direction = new THREE.Vector3()
      .subVectors(target, this.mesh.position)
      .normalize();
    
    const targetRotation = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(
      this.mesh.rotation.y, 
      targetRotation, 
      speed
    );
  }

  /**
   * Get the NPC's current position
   */
  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  /**
   * Get the NPC's base/spawn position
   */
  public getBasePosition(): THREE.Vector3 {
    return this.basePosition.clone();
  }

  /**
   * Check if NPC is within a certain distance of a position
   */
  public isWithinRange(position: THREE.Vector3, range: number): boolean {
    return this.mesh.position.distanceTo(position) <= range;
  }

  /**
   * Override dispose to clean up NPC-specific resources
   */
  public dispose(): void {
    console.log('🕊️ [PeacefulHumanoid] Disposing peaceful humanoid');
    super.dispose();
  }

  /**
   * Get the mesh for external systems that need direct access
   */
  public getMesh(): THREE.Group {
    return this.mesh;
  }

  /**
   * Add clothing or accessories to the NPC
   * Can be overridden by subclasses for role-specific appearance
   */
  protected addClothing(): void {
    // Base implementation - can be overridden by subclasses
    // This could add aprons, hats, accessories etc.
  }

  /**
   * Add role-specific props or tools
   */
  protected addRoleProps(): void {
    // Base implementation - can be overridden by subclasses
    // This could add tools, items, decorative elements etc.
  }
}
