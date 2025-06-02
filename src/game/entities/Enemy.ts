import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { EnemyType, Enemy as EnemyInterface } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { MathUtils } from '../utils';
import { EnemyBodyBuilder, EnemyBodyParts } from './EnemyBody';
import { EnemyAnimationSystem } from '../animation/EnemyAnimationSystem';

// Enhanced enemy states for better movement control
enum EnemyMovementState {
  IDLE = 'idle',
  PURSUING = 'pursuing',
  ATTACKING = 'attacking',
  KNOCKED_BACK = 'knocked_back',
  STUNNED = 'stunned'
}

export class Enemy {
  private enemy: EnemyInterface;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  // NEW: Enhanced body and animation systems
  private enhancedBodyParts: EnemyBodyParts | null = null;
  private animationSystem: EnemyAnimationSystem | null = null;
  private isEnhancedEnemy: boolean = false;
  
  // Enhanced movement state management
  private movementState: EnemyMovementState = EnemyMovementState.IDLE;
  private knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
  private knockbackDuration: number = 0;
  private knockbackResistance: number = 1.0;
  private stunDuration: number = 0;
  private targetRotation: number = 0;
  private rotationSpeed: number = 3.0;
  
  constructor(
    scene: THREE.Scene,
    type: EnemyType,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Create enemy based on type with enhanced system for orcs
    if (type === EnemyType.ORC) {
      this.enemy = this.createEnhancedOrc(position);
      this.isEnhancedEnemy = true;
      
      console.log(`🗡️ [Enemy] Enhanced orc created with auto-synced animation system`);
    } else {
      this.enemy = this.createEnemy(type, position);
      console.log("🗡️ [Enemy] Created basic goblin enemy");
    }
    
    // Set knockback resistance based on enemy type
    this.knockbackResistance = type === EnemyType.ORC ? 0.7 : 1.0;
    
    // Add to scene
    scene.add(this.enemy.mesh);
  }
  
  private createEnhancedOrc(position: THREE.Vector3): EnemyInterface {
    // Use new data-driven body builder
    const { group: orcGroup, bodyParts, metrics } = EnemyBodyBuilder.createRealisticOrcBody(position);
    this.enhancedBodyParts = bodyParts;
    
    // FIXED: Rotate the entire orc group to face forward (toward positive Z)
    orcGroup.rotation.y = Math.PI; // 180 degrees to face forward
    
    // Pass metrics to animation system for auto-sync
    this.animationSystem = new EnemyAnimationSystem(bodyParts, metrics);
    
    console.log(`🗡️ [Enemy] Fixed orc orientation - now facing forward`);
    
    return {
      mesh: orcGroup,
      health: 60,
      maxHealth: 60,
      speed: 3,
      damage: 20,
      goldReward: 50,
      experienceReward: 25,
      lastAttackTime: 0,
      isDead: false,
      deathTime: 0,
      type: EnemyType.ORC,
      leftArm: bodyParts.leftArm,
      rightArm: bodyParts.rightArm,
      leftLeg: bodyParts.leftLeg,
      rightLeg: bodyParts.rightLeg,
      walkTime: 0,
      hitBox: bodyParts.hitBox,
      originalMaterials: [], // Enhanced body uses different material system
      isHit: false,
      hitTime: 0,
      deathAnimation: {
        falling: false,
        rotationSpeed: Math.random() * 0.1 + 0.05,
        fallSpeed: 0
      },
      weapon: bodyParts.weapon,
      body: bodyParts.body,
      head: bodyParts.head,
      attackRange: 3.5,
      damageRange: 2.5,
      attackCooldown: 2000,
      points: 50,
      idleTime: 0
    };
  }
  
  private createEnemy(type: EnemyType, position: THREE.Vector3): EnemyInterface {
    const enemyGroup = new THREE.Group();
    const isGoblin = type === EnemyType.GOBLIN;
    
    let leftArm: THREE.Mesh, rightArm: THREE.Mesh, leftLeg: THREE.Mesh, rightLeg: THREE.Mesh;
    let body: THREE.Mesh, head: THREE.Mesh, weapon: THREE.Group;
    const originalMaterials: THREE.Material[] = [];
    
    // Set enemy stats based on type
    const stats = isGoblin ? {
      health: 20, // Dies in 1 hit (20 damage)
      maxHealth: 20,
      speed: 4,
      damage: 10,
      experienceReward: 10,
      goldReward: 25,
      points: 25,
      attackRange: 2.5,
      damageRange: 1.5,
      attackCooldown: 2000,
      bodyRadius: 0.35,
      bodyHeight: 1.2,
      headRadius: 0.35,
      headY: 1.4,
      armRadius: [0.1, 0.12],
      armHeight: 0.8,
      legRadius: [0.12, 0.15],
      legHeight: 0.8,
      bodyColor: 0x4A7C4A,
      headColor: 0x6B8E6B,
      limbColor: 0x4A7C4A
    } : {
      health: 60, // Takes 3 hits (20 damage each = 60 total)
      maxHealth: 60,
      speed: 3,
      damage: 20,
      experienceReward: 25,
      goldReward: 50,
      points: 50,
      attackRange: 3.0,
      damageRange: 2.0,
      attackCooldown: 2500,
      bodyRadius: 0.5,
      bodyHeight: 1.8,
      headRadius: 0.45,
      headY: 2.1,
      armRadius: [0.15, 0.18],
      armHeight: 1.0,
      legRadius: [0.18, 0.22],
      legHeight: 1.0,
      bodyColor: 0x8B4513,
      headColor: 0x9B5523,
      limbColor: 0x8B4513
    };
    
    // Invisible hitbox
    const hitBoxGeometry = new THREE.BoxGeometry(
      isGoblin ? 1.2 : 1.8,
      isGoblin ? 1.8 : 2.4,
      isGoblin ? 1.2 : 1.8
    );
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = stats.bodyHeight / 2;
    enemyGroup.add(hitBox);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(stats.bodyRadius, stats.bodyRadius * 1.1, stats.bodyHeight, 12);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(stats.bodyColor).multiplyScalar(1.8),
      shininess: 20,
      specular: 0x222222
    });
    body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = stats.bodyHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    enemyGroup.add(body);
    originalMaterials.push(bodyMaterial);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(stats.headRadius, 16, 12);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(stats.headColor).multiplyScalar(1.8),
      shininess: 30
    });
    head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = stats.headY;
    head.castShadow = true;
    head.receiveShadow = true;
    enemyGroup.add(head);
    originalMaterials.push(headMaterial);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFF0000,
      transparent: true,
      opacity: 1,
      emissive: 0xFF0000,
      emissiveIntensity: 0.3
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, stats.headY + 0.05, stats.headRadius * 0.8);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.15, stats.headY + 0.05, stats.headRadius * 0.8);
    enemyGroup.add(leftEye);
    enemyGroup.add(rightEye);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(stats.armRadius[0], stats.armRadius[1], stats.armHeight, 12);
    const armMaterial = new THREE.MeshPhongMaterial({ 
      color: stats.limbColor,
      shininess: 25
    });
    
    leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-(stats.bodyRadius + 0.2), stats.bodyHeight * 0.7, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    enemyGroup.add(leftArm);
    originalMaterials.push(armMaterial);
    
    rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.set(stats.bodyRadius + 0.2, stats.bodyHeight * 0.7, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    enemyGroup.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(stats.legRadius[0], stats.legRadius[1], stats.legHeight, 12);
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: stats.limbColor,
      shininess: 25
    });
    
    leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-stats.bodyRadius * 0.5, stats.legHeight / 2, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    enemyGroup.add(leftLeg);
    originalMaterials.push(legMaterial);
    
    rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(stats.bodyRadius * 0.5, stats.legHeight / 2, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    enemyGroup.add(rightLeg);
    
    // Weapon
    weapon = new THREE.Group();
    
    // Create wood texture
    const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
    
    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.8, 12);
    const shaftMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5D4037,
      shininess: 40,
      map: woodTexture
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.4;
    shaft.castShadow = true;
    weapon.add(shaft);
    
    // Create metal texture
    const metalTexture = TextureGenerator.createMetalTexture(0x444444);
    
    // Spikes
    const spikeGeometry = new THREE.ConeGeometry(0.025, 0.12, 8);
    const spikeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      shininess: 80,
      specular: 0x666666,
      map: metalTexture
    });
    
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial.clone());
      const angle = (i / 6) * Math.PI * 2;
      spike.position.set(
        Math.cos(angle) * 0.09,
        0.7,
        Math.sin(angle) * 0.09
      );
      spike.rotation.x = Math.PI / 2;
      spike.rotation.z = angle;
      spike.castShadow = true;
      weapon.add(spike);
    }
    
    weapon.position.set(0.5, stats.bodyHeight * 0.85, 0);
    weapon.rotation.z = -0.5;
    enemyGroup.add(weapon);
    
    // Add tusks for orcs
    if (!isGoblin) {
      const tuskGeometry = new THREE.ConeGeometry(0.05, 0.25, 8);
      const tuskMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xfffacd,
        shininess: 60
      });
      const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
      leftTusk.position.set(-0.15, stats.headY - 0.1, stats.headRadius * 0.8);
      leftTusk.rotation.x = Math.PI;
      leftTusk.castShadow = true;
      const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
      rightTusk.position.set(0.15, stats.headY - 0.1, stats.headRadius * 0.8);
      rightTusk.rotation.x = Math.PI;
      rightTusk.castShadow = true;
      enemyGroup.add(leftTusk);
      enemyGroup.add(rightTusk);
    }
    
    enemyGroup.position.copy(position);
    enemyGroup.position.y = 0;
    enemyGroup.castShadow = true;
    
    return {
      mesh: enemyGroup,
      health: stats.health,
      maxHealth: stats.maxHealth,
      speed: stats.speed,
      damage: stats.damage,
      goldReward: stats.goldReward,
      experienceReward: stats.experienceReward,
      lastAttackTime: 0,
      isDead: false,
      deathTime: 0,
      type: type,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      walkTime: 0,
      hitBox,
      originalMaterials,
      isHit: false,
      hitTime: 0,
      deathAnimation: {
        falling: false,
        rotationSpeed: Math.random() * 0.1 + 0.05,
        fallSpeed: 0
      },
      weapon,
      body,
      head,
      attackRange: stats.attackRange,
      damageRange: stats.damageRange,
      attackCooldown: stats.attackCooldown,
      points: stats.points,
      idleTime: 0
    };
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    const now = Date.now();
    
    // Skip update if enemy is dead
    if (this.enemy.isDead) {
      this.updateDeathAnimation(deltaTime);
      return;
    }
    
    // Update movement state timers
    this.updateMovementState(deltaTime);
    
    // ENHANCED: Update animation system for enhanced enemies
    if (this.isEnhancedEnemy && this.animationSystem) {
      if (this.animationSystem.isAttacking()) {
        const animationContinues = this.animationSystem.updateAttackAnimation(deltaTime);
        if (!animationContinues) {
          console.log("🗡️ [Enemy] Enhanced orc attack animation completed");
        }
      }
    }
    
    // Handle hit animation
    if (this.enemy.isHit && now - this.enemy.hitTime < 300) {
      // No visual effects needed - hit feedback comes from blood effects and sounds
    } else if (this.enemy.isHit) {
      this.enemy.isHit = false;
    }
    
    const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);
    
    // Handle different movement states
    switch (this.movementState) {
      case EnemyMovementState.KNOCKED_BACK:
        this.handleKnockbackMovement(deltaTime);
        break;
        
      case EnemyMovementState.STUNNED:
        // Just wait, don't move
        break;
        
      default:
        this.handleNormalMovement(deltaTime, playerPosition, distanceToPlayer, now);
        break;
    }
    
    // Update smooth rotation
    this.updateRotation(deltaTime);
  }
  
  private createHitFlashEffect(): void {
    // Flash enemy red for hit feedback
    this.enemy.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child !== this.enemy.hitBox) {
        const originalMaterial = child.material as THREE.MeshPhongMaterial;
        if (originalMaterial) {
          // Temporarily increase red component
          const currentColor = originalMaterial.color.clone();
          originalMaterial.color.setRGB(
            Math.min(currentColor.r + 0.5, 1),
            currentColor.g * 0.5,
            currentColor.b * 0.5
          );
          
          // Restore original color after a short time
          setTimeout(() => {
            originalMaterial.color.copy(currentColor);
          }, 100);
        }
      }
    });
  }
  
  private updateMovementState(deltaTime: number): void {
    if (this.knockbackDuration > 0) {
      this.knockbackDuration -= deltaTime * 1000;
      if (this.knockbackDuration <= 0) {
        this.knockbackVelocity.set(0, 0, 0);
        this.movementState = this.stunDuration > 0 ? EnemyMovementState.STUNNED : EnemyMovementState.IDLE;
      }
    }
    
    if (this.stunDuration > 0) {
      this.stunDuration -= deltaTime * 1000;
      if (this.stunDuration <= 0) {
        this.movementState = EnemyMovementState.IDLE;
      }
    }
  }
  
  private handleKnockbackMovement(deltaTime: number): void {
    // FIXED: Pure directional movement without decay for consistent knockback
    const movement = this.knockbackVelocity.clone().multiplyScalar(deltaTime);
    this.enemy.mesh.position.add(movement);
    this.enemy.mesh.position.y = 0; // Keep on ground
    
    console.log(`🎯 [Enemy] Clean knockback movement: velocity=${this.knockbackVelocity.length().toFixed(2)}, duration=${this.knockbackDuration.toFixed(0)}ms`);
  }
  
  private handleNormalMovement(deltaTime: number, playerPosition: THREE.Vector3, distanceToPlayer: number, now: number): void {
    // Update idle time
    this.enemy.idleTime += deltaTime;
    
    // Enhanced AI behavior with proper attack ranges and movement
    if (distanceToPlayer <= this.enemy.attackRange) {
      this.movementState = EnemyMovementState.PURSUING;
      
      // FIXED: Calculate target rotation to face player with corrected direction
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.enemy.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      // FIXED: Correct rotation calculation for enemies that spawn facing forward
      if (this.isEnhancedEnemy) {
        // For enhanced orcs that are rotated 180°, we need to adjust the target rotation
        this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z) + Math.PI;
      } else {
        // For goblins, use normal calculation
        this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
      }
      
      // Move toward player if outside damage range
      if (distanceToPlayer > this.enemy.damageRange) {
        const moveAmount = this.enemy.speed * deltaTime;
        const newPosition = this.enemy.mesh.position.clone();
        newPosition.add(directionToPlayer.multiplyScalar(moveAmount));
        newPosition.y = 0; // Ensure enemies stay on ground
      
        this.enemy.mesh.position.copy(newPosition);
        
        // ENHANCED: Use sophisticated animation system for enhanced enemies
        if (this.isEnhancedEnemy && this.animationSystem) {
          this.animationSystem.updateWalkAnimation(deltaTime, true, this.enemy.speed);
        } else {
          // Legacy walking animation for goblins
          this.updateLegacyWalkAnimation(deltaTime);
        }
      }
      
      // Attack if within damage range
      if (distanceToPlayer <= this.enemy.damageRange && now - this.enemy.lastAttackTime > this.enemy.attackCooldown) {
        this.movementState = EnemyMovementState.ATTACKING;
        this.attack(playerPosition);
        this.enemy.lastAttackTime = now;
      }
    } else {
      // If enemy is far from player but not in attack range, still move toward player slowly
      if (distanceToPlayer > this.enemy.attackRange && distanceToPlayer < 50) {
        this.movementState = EnemyMovementState.PURSUING;
        
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.enemy.mesh.position)
          .normalize();
        direction.y = 0;
        
        // FIXED: Calculate target rotation with corrected direction
        if (this.isEnhancedEnemy) {
          this.targetRotation = Math.atan2(direction.x, direction.z) + Math.PI;
        } else {
          this.targetRotation = Math.atan2(direction.x, direction.z);
        }
        
        const slowMoveAmount = this.enemy.speed * deltaTime * 0.3; // Slower movement when far
        const newPosition = this.enemy.mesh.position.clone();
        newPosition.add(direction.multiplyScalar(slowMoveAmount));
        newPosition.y = 0;
        
        this.enemy.mesh.position.copy(newPosition);
        
        // ENHANCED: Use sophisticated animation for movement
        if (this.isEnhancedEnemy && this.animationSystem) {
          this.animationSystem.updateWalkAnimation(deltaTime, true, this.enemy.speed * 0.3);
        }
      } else {
        this.movementState = EnemyMovementState.IDLE;
        
        // ENHANCED: Use sophisticated idle animation
        if (this.isEnhancedEnemy && this.animationSystem) {
          this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
        } else {
          // Legacy idle animations for goblins
          this.updateLegacyIdleAnimation();
        }
      }
    }
  }
  
  private updateLegacyWalkAnimation(deltaTime: number): void {
    // Walking animation for legacy enemies (goblins)
    this.enemy.walkTime += deltaTime * this.enemy.speed * 2.5;
  
    if (this.enemy.leftArm && this.enemy.rightArm && this.enemy.leftLeg && this.enemy.rightLeg) {
      const armSwing = Math.sin(this.enemy.walkTime) * 0.25;
      const legSwing = Math.sin(this.enemy.walkTime + Math.PI) * 0.2;
      
      this.enemy.leftArm.rotation.x = armSwing;
      this.enemy.rightArm.rotation.x = -armSwing;
      this.enemy.leftLeg.rotation.x = legSwing;
      this.enemy.rightLeg.rotation.x = -legSwing;
    }
  }
  
  private updateLegacyIdleAnimation(): void {
    // Idle animations for legacy enemies
    if (this.enemy.body) {
      this.enemy.body.position.y = (this.enemy.type === EnemyType.GOBLIN ? 1.2 : 1.8) / 2 + Math.sin(this.enemy.idleTime * 4) * 0.05;
    }
    
    // Weapon swing animation
    if (this.enemy.weapon) {
      const baseRotation = -0.5;
      this.enemy.weapon.rotation.z = baseRotation + Math.sin(this.enemy.idleTime * 3) * 0.2;
    }
  }
  
  private updateRotation(deltaTime: number): void {
    // Smooth rotation interpolation
    if (this.movementState !== EnemyMovementState.KNOCKED_BACK && this.movementState !== EnemyMovementState.STUNNED) {
      const currentRotation = this.enemy.mesh.rotation.y;
      const rotationDiff = this.targetRotation - currentRotation;
      
      // Handle rotation wrapping around -π to π
      let normalizedDiff = rotationDiff;
      if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
      
      // Apply smooth rotation
      const rotationStep = this.rotationSpeed * deltaTime;
      const newRotation = currentRotation + Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationStep);
      this.enemy.mesh.rotation.y = newRotation;
    }
  }
  
  private attack(playerPosition: THREE.Vector3): void {
    // ENHANCED: Start sophisticated attack animation for enhanced enemies
    if (this.isEnhancedEnemy && this.animationSystem) {
      this.animationSystem.startAttackAnimation();
      console.log("🗡️ [Enemy] Enhanced orc started sophisticated attack animation");
    } else {
      // Legacy weapon swing animation for goblins
      this.startLegacyAttackAnimation();
    }
    
    // Create attack effect
    const attackPosition = this.enemy.mesh.position.clone();
    attackPosition.y += 1;
    this.effectsManager.createAttackEffect(attackPosition, 0x880000);
    
    // Play attack sound
    this.audioManager.play('enemy_hurt');
  }
  
  private startLegacyAttackAnimation(): void {
    if (this.enemy.weapon) {
      const originalRotation = this.enemy.weapon.rotation.z;
      
      // Weapon swing animation
      const swingAnimation = () => {
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = elapsed / duration;
          
          if (progress >= 1) {
            this.enemy.weapon.rotation.z = originalRotation;
            return;
          }
          
          // Swing back, then forward
          if (progress < 0.3) {
            // Wind up
            this.enemy.weapon.rotation.z = originalRotation + progress / 0.3 * 0.5;
          } else if (progress < 0.7) {
            // Swing
            const swingProgress = (progress - 0.3) / 0.4;
            this.enemy.weapon.rotation.z = originalRotation + 0.5 - swingProgress * 1.5;
          } else {
            // Return
            const returnProgress = (progress - 0.7) / 0.3;
            this.enemy.weapon.rotation.z = originalRotation - 1 + returnProgress;
          }
          
          requestAnimationFrame(animate);
        };
        
        animate();
      };
      
      swingAnimation();
    }
  }
  
  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.enemy.isDead) return;
    
    this.enemy.health -= damage;
    this.enemy.isHit = true;
    this.enemy.hitTime = Date.now();
    
    // Enhanced attack effect at enemy position
    this.effectsManager.createAttackEffect(this.enemy.mesh.position.clone(), 0xFFD700);
    
    // FIXED: Consistent knockback for both sword and bow attacks
    const knockbackDirection = new THREE.Vector3()
      .subVectors(this.enemy.mesh.position, playerPosition)
      .normalize();
    knockbackDirection.y = 0; // Keep knockback horizontal only
    
    // MATCHED: Same knockback intensity as sword attacks for all weapons
    const baseKnockback = 3.0; // Same as sword knockback
    const damageMultiplier = Math.min(damage / 20, 2.0); // Same scaling
    const knockbackIntensity = (baseKnockback * damageMultiplier) / this.knockbackResistance;
    
    // FIXED: Set clean directional velocity for consistent knockback
    this.knockbackVelocity.copy(knockbackDirection).multiplyScalar(knockbackIntensity);
    this.knockbackDuration = 300; // Same duration as sword
    this.stunDuration = 150; // Same stun duration as sword
    this.movementState = EnemyMovementState.KNOCKED_BACK;
    
    console.log(`💥 [Enemy] Consistent knockback applied: intensity=${knockbackIntensity.toFixed(2)}, direction=(${knockbackDirection.x.toFixed(2)}, ${knockbackDirection.z.toFixed(2)})`);
    
    // Blood effect
    const bloodDirection = knockbackDirection.clone();
    bloodDirection.y = 0.5;
    this.effectsManager.createBloodEffect(this.enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), bloodDirection);
    
    // Play hit sound
    this.audioManager.play('enemy_hurt');
    
    // Check if enemy is dead
    if (this.enemy.health <= 0) {
      this.die();
    }
  }
  
  private die(): void {
    this.enemy.isDead = true;
    this.enemy.deathTime = Date.now();
    this.enemy.deathAnimation.falling = true;
    this.movementState = EnemyMovementState.STUNNED; // Stop all movement
    
    // Enhanced death explosion effect
    this.effectsManager.createHitEffect(this.enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    
    // Play death sound
    this.audioManager.play('enemy_death');
  }
  
  private updateDeathAnimation(deltaTime: number): void {
    if (!this.enemy.deathAnimation.falling) return;
    
    // Update fall speed
    this.enemy.deathAnimation.fallSpeed += deltaTime * 2; // Gravity
    
    // Rotate and fall
    this.enemy.mesh.rotation.x += this.enemy.deathAnimation.rotationSpeed;
    this.enemy.mesh.position.y -= this.enemy.deathAnimation.fallSpeed;
    
    // Fade out
    const fadeProgress = Math.min((Date.now() - this.enemy.deathTime) / 5000, 1);
    this.enemy.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child !== this.enemy.hitBox) {
        (child.material as THREE.MeshLambertMaterial).transparent = true;
        (child.material as THREE.MeshLambertMaterial).opacity = 1 - fadeProgress;
      }
    });
    
    // Stop falling when below ground
    if (this.enemy.mesh.position.y < -2) {
      this.enemy.deathAnimation.falling = false;
    }
  }
  
  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    return this.enemy.mesh.position.distanceTo(playerPosition) <= range;
  }
  
  public isDeadFor(time: number): boolean {
    if (!this.enemy.isDead) return false;
    return Date.now() - this.enemy.deathTime > time;
  }
  
  public isDead(): boolean {
    return this.enemy.isDead;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.enemy.mesh.position.clone();
  }
  
  public getGoldReward(): number {
    return this.enemy.goldReward;
  }
  
  public getExperienceReward(): number {
    return this.enemy.experienceReward;
  }
  
  public getMesh(): THREE.Group {
    return this.enemy.mesh;
  }
  
  public getEnemy(): any {
    return this.enemy;
  }
  
  public getDistanceFromPlayer(playerPosition: THREE.Vector3): number {
    return this.enemy.mesh.position.distanceTo(playerPosition);
  }
  
  public shouldCleanup(maxDistance: number, playerPosition: THREE.Vector3): boolean {
    if (this.enemy.isDead && this.isDeadFor(30000)) return true;
    if (this.getDistanceFromPlayer(playerPosition) > maxDistance) return true;
    return false;
  }
  
  public static createRandomEnemy(
    scene: THREE.Scene,
    playerPosition: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1
  ): Enemy {
    // ENHANCED: Favor orcs at higher difficulty for better visual experience
    const typeRoll = Math.random() * (1 + difficulty * 0.3);
    const type = typeRoll < 0.5 ? EnemyType.GOBLIN : EnemyType.ORC;
    
    // Determine spawn position (at distance from player)
    const spawnDistance = 20 + Math.random() * 15;
    const angle = Math.random() * Math.PI * 2;
    const spawnPosition = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * spawnDistance,
      0,
      playerPosition.z + Math.sin(angle) * spawnDistance
    );
    
    // Create enemy
    const enemy = new Enemy(scene, type, spawnPosition, effectsManager, audioManager);
    console.log(`🗡️ [Enemy] Created ${type} at difficulty ${difficulty} - Enhanced: ${enemy.isEnhancedEnemy}`);
    return enemy;
  }
  
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.enemy.mesh);
    
    // Dispose geometries and materials
    this.enemy.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
  
  // NEW: Enhanced enemy methods
  public isEnhanced(): boolean {
    return this.isEnhancedEnemy;
  }
  
  public getAnimationSystem(): EnemyAnimationSystem | null {
    return this.animationSystem;
  }
  
  public getBodyParts(): EnemyBodyParts | null {
    return this.enhancedBodyParts;
  }
}
