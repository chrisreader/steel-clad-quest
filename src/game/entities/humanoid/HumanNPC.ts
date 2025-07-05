import * as THREE from 'three';
import { PeacefulHumanoid } from './PeacefulHumanoid';
import { HumanBodyConfig, HumanNPCConfig } from './HumanBodyConfig';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TavernKeeperBehavior } from '../../ai/TavernKeeperBehavior';

export interface HumanNPCOptions {
  name: string;
  position: THREE.Vector3;
  skinColor?: number;
  clothingColor?: number;
  hairColor?: number;
  scale?: number;
  wanderRadius?: number;
  role?: 'tavern_keeper' | 'merchant' | 'guard' | 'citizen';
}

export class HumanNPC extends PeacefulHumanoid {
  private behavior: TavernKeeperBehavior;
  private npcConfig: HumanNPCConfig;
  private npcName: string;
  
  constructor(
    scene: THREE.Scene,
    options: HumanNPCOptions,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    // Create NPC configuration
    const npcConfig: HumanNPCConfig = {
      name: options.name,
      skinColor: options.skinColor || HumanBodyConfig.getRandomSkinTone(),
      clothingColor: options.clothingColor || HumanBodyConfig.getClothingColorForRole(options.role || 'tavern_keeper'),
      hairColor: options.hairColor,
      scale: options.scale || 1.0,
      role: options.role || 'tavern_keeper'
    };

    // Generate humanoid configuration with realistic human body
    const humanoidConfig = HumanBodyConfig.createHumanConfig(npcConfig);
    
    // Call parent constructor with sophisticated body system
    super(scene, humanoidConfig, options.position, effectsManager, audioManager);
    
    this.npcConfig = npcConfig;
    this.npcName = options.name;
    
    // Setup AI behavior
    this.setupBehavior(options.wanderRadius || 8);
    
    // Add human-specific features
    this.addHumanFeatures();
    
    console.log(`👤 [HumanNPC] Created realistic ${this.npcName} with full human anatomy at position:`, options.position);
  }

  private setupBehavior(wanderRadius: number): void {
    this.behavior = new TavernKeeperBehavior({
      wanderRadius,
      moveSpeed: 1.5,
      pauseDuration: 3000,
      interactionRadius: 15
    });
    
    console.log(`🧠 [HumanNPC] Setup tavern keeper behavior for ${this.npcName}`);
  }

  private addHumanFeatures(): void {
    // Add hair if specified
    if (this.npcConfig.hairColor) {
      this.addHair();
    }
    
    // Add role-specific clothing and accessories
    this.addClothing();
    this.addRoleProps();
    
    // Remove any enemy-specific features (claws, tusks, etc.)
    this.removeEnemyFeatures();
  }

  private addHair(): void {
    if (!this.npcConfig.hairColor || !this.bodyParts.head) return;
    
    // Create realistic hair geometry
    const hairGeometry = new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hairMaterial = new THREE.MeshPhongMaterial({ 
      color: this.npcConfig.hairColor,
      shininess: 30,
      specular: 0x222222
    });
    
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 0.15;
    hair.castShadow = true;
    hair.receiveShadow = true;
    
    // Add hair to the head
    this.bodyParts.head.add(hair);
    
    console.log(`💇 [HumanNPC] Added hair to ${this.npcName}`);
  }

  protected addClothing(): void {
    if (!this.bodyParts.body) return;
    
    // Add an apron for tavern keeper
    if (this.npcConfig.role === 'tavern_keeper') {
      const apronGeometry = new THREE.PlaneGeometry(0.6, 0.8);
      const apronMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513, // Brown apron
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      
      const apron = new THREE.Mesh(apronGeometry, apronMaterial);
      apron.position.set(0, -0.2, 0.3);
      apron.castShadow = true;
      apron.receiveShadow = true;
      
      this.bodyParts.body.add(apron);
    }
    
    console.log(`👔 [HumanNPC] Added clothing to ${this.npcName}`);
  }

  protected addRoleProps(): void {
    // Override in subclasses for role-specific props
    // Tavern keeper could have a towel, keys, etc.
  }

  private removeEnemyFeatures(): void {
    // Remove claws from hands if they exist
    if (this.bodyParts.leftWrist) {
      // Remove all claw children
      const clawsToRemove: THREE.Object3D[] = [];
      this.bodyParts.leftWrist.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
          clawsToRemove.push(child);
        }
      });
      clawsToRemove.forEach(claw => this.bodyParts.leftWrist?.remove(claw));
    }
    
    if (this.bodyParts.rightWrist) {
      // Remove all claw children
      const clawsToRemove: THREE.Object3D[] = [];
      this.bodyParts.rightWrist.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
          clawsToRemove.push(child);
        }
      });
      clawsToRemove.forEach(claw => this.bodyParts.rightWrist?.remove(claw));
    }
    
    // Remove toe claws from feet if they exist
    if (this.bodyParts.leftKnee) {
      this.bodyParts.leftKnee.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
          child.parent?.remove(child);
        }
      });
    }
    
    if (this.bodyParts.rightKnee) {
      this.bodyParts.rightKnee.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
          child.parent?.remove(child);
        }
      });
    }
    
    console.log(`✂️ [HumanNPC] Removed enemy features from ${this.npcName}`);
  }

  protected updateNPCBehavior(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.behavior) {
      // Update AI behavior
      const action = this.behavior.update(deltaTime, this.mesh.position, playerPosition);
      
      // Handle movement based on behavior
      if (action.type === 'move' && action.target) {
        this.moveTowards(action.target, 1.5, deltaTime);
      } else if (action.type === 'idle') {
        // Update animation to idle
        if (this.animationSystem) {
          this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
        }
      }
    }
  }

  public getName(): string {
    return this.npcName;
  }

  public getRole(): string {
    return this.npcConfig.role;
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
      skinColor: 0xFFDBAE, // Light human skin tone
      clothingColor: 0x8B4513, // Brown apron/shirt
      hairColor: 0x654321, // Brown hair
      scale: 1.0,
      wanderRadius: 8,
      role: 'tavern_keeper'
    }, effectsManager, audioManager);
  }

  public static createMerchant(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): HumanNPC {
    return new HumanNPC(scene, {
      name: 'Merchant',
      position: position,
      skinColor: 0xF4C2A1, // Medium skin tone
      clothingColor: 0x4A148C, // Purple merchant robes
      hairColor: 0x2E2E2E, // Dark hair
      scale: 0.95,
      wanderRadius: 5,
      role: 'merchant'
    }, effectsManager, audioManager);
  }

  public dispose(): void {
    console.log(`👤 [HumanNPC] Disposing ${this.npcName}`);
    super.dispose();
  }
}