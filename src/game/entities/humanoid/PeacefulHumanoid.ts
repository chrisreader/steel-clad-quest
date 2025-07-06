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
  private humanTShirt?: THREE.Group;
  private humanPants?: THREE.Group;

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
   * Add human-specific features like hair and clothing
   */
  private addHumanFeatures(): void {
    // Since bodyParts.head is now a THREE.Group itself, use it directly
    const headGroup = this.bodyParts.head as THREE.Group;
    const bodyMesh = this.bodyParts.body;
    
    if (!headGroup || !bodyMesh) return;

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

    // Add realistic t-shirt
    this.humanTShirt = HumanBodyConfig.createTShirt(
      this.config.bodyScale.body.radius,
      this.config.bodyScale.body.height,
      0x4169E1 // Blue t-shirt
    );
    
    // Position t-shirt relative to body center (like hair to head)
    this.humanTShirt.position.set(0, 0, 0);
    
    // Add t-shirt directly to the body mesh (same pattern as hair to headGroup)
    if (bodyMesh instanceof THREE.Mesh) {
      // Add to the body mesh directly, like hair is added to headGroup
      bodyMesh.add(this.humanTShirt);
    }

    // Extract t-shirt arm components from userData (same pattern as pants)
    const tshirtComponents = this.humanTShirt.userData;
    const { 
      leftShoulderTShirt, 
      rightShoulderTShirt, 
      leftSleeveTShirt, 
      rightSleeveTShirt 
    } = tshirtComponents;
    
    // Attach t-shirt arm components directly to arm meshes (CRITICAL for animation following)
    // Same pattern as pants components attach to leg meshes
    
    // 1. Attach shoulder t-shirt components to arm meshes - they will follow arm swing animations
    if (this.bodyParts.leftArm && leftShoulderTShirt) {
      this.bodyParts.leftArm.add(leftShoulderTShirt);
    }
    if (this.bodyParts.rightArm && rightShoulderTShirt) {
      this.bodyParts.rightArm.add(rightShoulderTShirt);
    }
    
    // 2. Attach sleeve t-shirt components to arm meshes - they will follow arm swing animations
    if (this.bodyParts.leftArm && leftSleeveTShirt) {
      this.bodyParts.leftArm.add(leftSleeveTShirt);
    }
    if (this.bodyParts.rightArm && rightSleeveTShirt) {
      this.bodyParts.rightArm.add(rightSleeveTShirt);
    }
    
    console.log('👔 [PeacefulHumanoid] Added t-shirt with shoulders and sleeves attached to arms for animation following');

    // Add realistic pants using exact same methodology as t-shirt
    this.humanPants = HumanBodyConfig.createPants(
      this.config.bodyScale.body.radius,
      0x2F4F2F // Dark green pants
    );
    
    // Extract pants components from userData (same pattern as t-shirt components)
    const pantsComponents = this.humanPants.userData;
    const { 
      leftThighPants, 
      rightThighPants, 
      leftShinPants, 
      rightShinPants, 
      leftKneePants, 
      rightKneePants, 
      waistband 
    } = pantsComponents;
    
    // Attach pants components directly to leg meshes (CRITICAL for animation following)
    // Same pattern as t-shirt sleeves attach to arms
    
    // 1. Attach thigh pants to leg meshes - they will follow leg swing animations
    if (this.bodyParts.leftLeg && leftThighPants) {
      this.bodyParts.leftLeg.add(leftThighPants);
    }
    if (this.bodyParts.rightLeg && rightThighPants) {
      this.bodyParts.rightLeg.add(rightThighPants);
    }
    
    // 2. Attach shin pants to knee meshes - they will follow shin animations  
    if (this.bodyParts.leftKnee && leftShinPants) {
      this.bodyParts.leftKnee.add(leftShinPants);
    }
    if (this.bodyParts.rightKnee && rightShinPants) {
      this.bodyParts.rightKnee.add(rightShinPants);
    }
    
    // 3. Attach knee pants to knee meshes - they will follow knee joint movements
    if (this.bodyParts.leftKnee && leftKneePants) {
      this.bodyParts.leftKnee.add(leftKneePants);
    }
    if (this.bodyParts.rightKnee && rightKneePants) {
      this.bodyParts.rightKnee.add(rightKneePants);
    }
    
    // 4. Attach waistband to body mesh at hip level - calculate position relative to body center
    if (bodyMesh instanceof THREE.Mesh && waistband) {
      // Position waistband at hip level relative to body center
      // From EnemyHumanoid: legTopY = groundToFeetBottom, bodyY = legTopY + bodyHeight / 2
      // Hip level is approximately at legTopY, so relative to body center: legTopY - bodyY
      const legLength = this.config.bodyScale.leg.length;   // 0.6
      const shinLength = this.config.bodyScale.shin.length; // 0.55
      const footHeight = 0.15;
      const groundToFeetBottom = legLength + shinLength + footHeight / 2;
      const legTopY = groundToFeetBottom;
      const bodyY = legTopY + this.config.bodyScale.body.height / 2;
      const hipLevelRelative = legTopY - bodyY; // Hip level relative to body center
      
      waistband.position.set(0, hipLevelRelative, 0);
      bodyMesh.add(waistband);
    }
    
    console.log('👔 [PeacefulHumanoid] Added pants with full leg coverage and animation following');
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
    
    // Clean up t-shirt
    if (this.humanTShirt) {
      this.humanTShirt.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      
      // Also clean up t-shirt arm components stored in userData (same pattern as pants)
      const tshirtComponents = this.humanTShirt.userData;
      if (tshirtComponents) {
        Object.values(tshirtComponents).forEach((component: any) => {
          if (component instanceof THREE.Mesh) {
            if (component.geometry) component.geometry.dispose();
            if (component.material instanceof THREE.Material) {
              component.material.dispose();
            }
          }
        });
      }
    }
    
    // Clean up pants (same pattern as t-shirt)
    if (this.humanPants) {
      this.humanPants.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      
      // Also clean up components stored in userData
      const pantsComponents = this.humanPants.userData;
      if (pantsComponents) {
        Object.values(pantsComponents).forEach((component: any) => {
          if (component instanceof THREE.Mesh) {
            if (component.geometry) component.geometry.dispose();
            if (component.material instanceof THREE.Material) {
              component.material.dispose();
            }
          }
        });
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
