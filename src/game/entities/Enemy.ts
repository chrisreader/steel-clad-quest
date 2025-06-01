import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { EnemyType, Enemy as EnemyInterface } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { MathUtils } from '../utils';

export class Enemy {
  private enemy: EnemyInterface;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
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
    
    // Create enemy based on type
    this.enemy = this.createEnemy(type, position);
    
    // Add to scene
    scene.add(this.enemy.mesh);
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
    
    // Update idle time
    this.enemy.idleTime += deltaTime;
    
    // Handle hit animation
    if (this.enemy.isHit && now - this.enemy.hitTime < 300) {
      // Shake effect only
      const shakeIntensity = 0.1;
      this.enemy.mesh.position.x += (Math.random() - 0.5) * shakeIntensity;
      this.enemy.mesh.position.z += (Math.random() - 0.5) * shakeIntensity;
    } else if (this.enemy.isHit) {
      // Reset hit state
      this.enemy.isHit = false;
    }
    
    const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);
    
    // Enhanced AI behavior with proper attack ranges and movement
    if (distanceToPlayer <= this.enemy.attackRange) {
      // Face player using lookAt
      const targetPosition = playerPosition.clone();
      targetPosition.y = this.enemy.mesh.position.y; // Keep same Y level
      this.enemy.mesh.lookAt(targetPosition);
      
      // Move toward player if outside damage range
      if (distanceToPlayer > this.enemy.damageRange) {
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.enemy.mesh.position)
          .normalize();
        direction.y = 0; // Keep movement on ground level
        
        const moveAmount = this.enemy.speed * deltaTime;
        const newPosition = this.enemy.mesh.position.clone();
        newPosition.add(direction.multiplyScalar(moveAmount));
        newPosition.y = 0; // Ensure enemies stay on ground
      
        this.enemy.mesh.position.copy(newPosition);
        
        // Walking animation
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
      
      // Attack if within damage range
      if (distanceToPlayer <= this.enemy.damageRange && now - this.enemy.lastAttackTime > this.enemy.attackCooldown) {
        this.attack(playerPosition);
        this.enemy.lastAttackTime = now;
      }
    } else {
      // If enemy is far from player but not in attack range, still move toward player slowly
      if (distanceToPlayer > this.enemy.attackRange && distanceToPlayer < 50) {
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.enemy.mesh.position)
          .normalize();
        direction.y = 0;
        
        const slowMoveAmount = this.enemy.speed * deltaTime * 0.3; // Slower movement when far
        const newPosition = this.enemy.mesh.position.clone();
        newPosition.add(direction.multiplyScalar(slowMoveAmount));
        newPosition.y = 0;
        
        this.enemy.mesh.position.copy(newPosition);
        
        // Face player
        const targetPosition = playerPosition.clone();
        targetPosition.y = this.enemy.mesh.position.y;
        this.enemy.mesh.lookAt(targetPosition);
      }
      
      // Idle animations
      if (this.enemy.body) {
        this.enemy.body.position.y = (this.enemy.type === EnemyType.GOBLIN ? 1.2 : 1.8) / 2 + Math.sin(this.enemy.idleTime * 4) * 0.05;
      }
      
      // Body sway
      if (this.enemy.head) {
        const baseSway = Math.sin(this.enemy.idleTime * 2) * 0.015;
        // Don't override lookAt rotation completely, just add subtle sway
        this.enemy.mesh.rotation.y += baseSway;
      }
      
      // Weapon swing animation
      if (this.enemy.weapon) {
        const baseRotation = -0.5;
        this.enemy.weapon.rotation.z = baseRotation + Math.sin(this.enemy.idleTime * 3) * 0.2;
      }
    }
  }
  
  private attack(playerPosition: THREE.Vector3): void {
    // Create attack animation
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
    
    // Create attack effect
    const attackPosition = this.enemy.mesh.position.clone();
    attackPosition.y += 1;
    this.effectsManager.createAttackEffect(attackPosition, 0x880000);
    
    // Play attack sound
    this.audioManager.play('enemy_hurt');
  }
  
  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.enemy.isDead) return;
    
    this.enemy.health -= damage;
    this.enemy.isHit = true;
    this.enemy.hitTime = Date.now();
    
    // Enhanced attack effect at enemy position
    this.effectsManager.createAttackEffect(this.enemy.mesh.position.clone(), 0xFFD700);
    
    // Blood effect
    const direction = new THREE.Vector3()
      .subVectors(this.enemy.mesh.position, playerPosition)
      .normalize();
    direction.y = 0.5;
    this.effectsManager.createBloodEffect(this.enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), direction);
    
    // Play hit sound
    this.audioManager.play('enemy_hurt');
    
    // Directional knockback effect
    const knockbackDirection = new THREE.Vector3()
      .subVectors(this.enemy.mesh.position, playerPosition)
      .normalize();
    this.enemy.mesh.position.add(knockbackDirection.multiplyScalar(0.9));
    
    // Check if enemy is dead
    if (this.enemy.health <= 0) {
      this.die();
    }
  }
  
  private die(): void {
    this.enemy.isDead = true;
    this.enemy.deathTime = Date.now();
    this.enemy.deathAnimation.falling = true;
    
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
  
  public getEnemy(): EnemyInterface {
    return this.enemy;
  }
  
  public static createRandomEnemy(
    scene: THREE.Scene,
    playerPosition: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1
  ): Enemy {
    // Determine enemy type (more difficult enemies appear more often at higher difficulty)
    const typeRoll = Math.random() * (1 + difficulty * 0.2);
    const type = typeRoll < 0.7 ? EnemyType.GOBLIN : EnemyType.ORC;
    
    // Determine spawn position (at distance from player)
    const spawnDistance = 20 + Math.random() * 15;
    const angle = Math.random() * Math.PI * 2;
    const spawnPosition = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * spawnDistance,
      0,
      playerPosition.z + Math.sin(angle) * spawnDistance
    );
    
    // Create enemy
    return new Enemy(scene, type, spawnPosition, effectsManager, audioManager);
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
}
