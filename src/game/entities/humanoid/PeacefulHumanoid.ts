import * as THREE from 'three';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { HumanBodyConfig } from './HumanBodyConfig';

/**
 * PeacefulHumanoid extends EnemyHumanoid but removes all combat functionality
 * Provides sophisticated human anatomy for non-combat NPCs like tavern keepers
 */
export class PeacefulHumanoid extends EnemyHumanoid {
  private humanHair?: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    isKeeperType: boolean = false
  ) {
    // Use appropriate human configuration
    const config = isKeeperType 
      ? HumanBodyConfig.createTavernKeeperConfig()
      : HumanBodyConfig.createHumanConfig();
    
    super(scene, config, position, effectsManager, audioManager);
    
    // Add human-specific features after body creation
    this.addHumanFeatures();
    
    console.log('👤 [PeacefulHumanoid] Created realistic human with full anatomy');
  }

  /**
   * Add human-specific features like hair
   */
  private addHumanFeatures(): void {
    // Since bodyParts.head is now a THREE.Group itself, use it directly
    const headGroup = this.bodyParts.head as THREE.Group;
    
    if (!headGroup) return;

    // Add realistic human hair
    this.humanHair = HumanBodyConfig.createHumanHair(
      this.config.bodyScale.head.radius, 
      0x654321 // Brown hair
    );
    
    // Position hair relative to head group's local coordinates
    this.humanHair.position.set(0, this.config.bodyScale.head.radius * 0.3, 0);
    this.humanHair.castShadow = true;
    
    // Add hair to the head group for proper positioning
    headGroup.add(this.humanHair);
  }

  /**
   * Override createWeapon to not create weapons for peaceful NPCs
   * Instead, optionally create civilian tools like mugs, brooms, etc.
   */
  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const toolGroup = new THREE.Group();
    
    // Create a simple mug or tankard for tavern keeper
    const mugGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.15, 12);
    const mugMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513, // Brown mug
      shininess: 20
    });
    
    const mug = new THREE.Mesh(mugGeometry, mugMaterial);
    mug.castShadow = true;
    
    // Add a simple handle
    const handleGeometry = new THREE.TorusGeometry(0.05, 0.02, 8, 16);
    const handle = new THREE.Mesh(handleGeometry, mugMaterial.clone());
    handle.position.set(0.08, 0, 0);
    handle.rotation.z = Math.PI / 2;
    
    toolGroup.add(mug);
    toolGroup.add(handle);
    
    return toolGroup;
  }

  /**
   * Override attack methods to be non-functional for peaceful NPCs
   */
  public takeDamage(damage: number, knockbackDirection: THREE.Vector3): void {
    // Peaceful NPCs don't take damage or show combat reactions
    console.log('👤 [PeacefulHumanoid] Peaceful NPC cannot be harmed');
  }

  /**
   * Override update to remove combat logic, keep only animation
   */
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Only update animations, no combat logic
    if (this.animationSystem && !this.isDead) {
      // Update idle animation (not moving)
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
  }

  /**
   * Add walking animation for NPC movement
   */
  public updateWalkAnimation(deltaTime: number): void {
    if (this.animationSystem) {
      this.animationSystem.updateWalkAnimation(deltaTime, true, 1.5);
    }
  }

  /**
   * Add idle animation for when NPC is stationary
   */
  public updateIdleAnimation(deltaTime: number): void {
    if (this.animationSystem) {
      // Use updateWalkAnimation with isMoving=false for idle state
      this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
    }
  }

  /**
   * Override disposal to clean up human-specific features
   */
  public dispose(): void {
    // Clean up human-specific meshes
    if (this.humanHair) {
      if (this.humanHair.geometry) this.humanHair.geometry.dispose();
      if (this.humanHair.material instanceof THREE.Material) {
        this.humanHair.material.dispose();
      }
    }
    
    // Call parent disposal
    super.dispose();
  }

  /**
   * Get human-specific configuration
   */
  public getHumanConfig(): HumanoidConfig {
    return this.config;
  }

  /**
   * Check if this is a peaceful (non-combat) humanoid
   */
  public isPeaceful(): boolean {
    return true;
  }
}
