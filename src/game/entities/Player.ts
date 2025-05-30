import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator';
import { PlayerBody, SwordSwingAnimation, PlayerStats } from '../../types/GameTypes';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';

export class Player {
  // THREE.js objects
  private group: THREE.Group;
  private playerBody: PlayerBody;
  private sword: THREE.Group;
  private swordHitBox: THREE.Mesh;
  private bladeMesh: THREE.Mesh; // Reference to the actual blade for precise tip tracking
  
  // Game state
  private stats: PlayerStats;
  private walkTime: number = 0;
  private isWalking: boolean = false;
  private isSprinting: boolean = false;
  private sprintStamina: number = 100;
  private sprintStartTime: number = 0;
  private lastAttackTime: number = 0;
  private hitEnemiesThisSwing: Set<any> = new Set();
  
  // Animation parameters
  private walkCycle: number = 0;
  private walkCycleSpeed: number = 3;
  private armSwingIntensity: number = 0.1;
  private legSwingIntensity: number = 0.25;
  private animationReturnSpeed: number = 3;
  private swordSwing: SwordSwingAnimation;
  
  // External managers
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  // Sword trail tracking
  private swordTipPositions: THREE.Vector3[] = [];
  private maxTrailLength: number = 15;
  private swooshEffectCreated: boolean = false;
  
  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    // Create player group
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 2);
    this.group.userData.isPlayer = true;
    scene.add(this.group);
    
    console.log("Player group created and added to scene at position:", this.group.position);
    
    // Create player body
    this.playerBody = this.createPlayerBody();
    
    // Create sword hitbox for collision detection
    const swordHitBoxGeometry = new THREE.BoxGeometry(3.5, 3.5, 4);
    const swordHitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.swordHitBox = new THREE.Mesh(swordHitBoxGeometry, swordHitBoxMaterial);
    scene.add(this.swordHitBox);
    
    // Initialize sword swing animation
    this.swordSwing = this.initializeSwordSwing();
    
    // Initialize player stats
    this.stats = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      gold: 0,
      experience: 0,
      experienceToNext: 100,
      level: 1,
      attack: 20,
      defense: 5,
      speed: 5,
      attackPower: 20
    };
    
    console.log("Player initialized with stats:", this.stats);
  }
  
  private createPlayerBody(): PlayerBody {
    const playerBodyGroup = new THREE.Group();
    
    // Create metal texture
    const metalTexture = TextureGenerator.createMetalTexture();
    const woodTexture = TextureGenerator.createWoodTexture();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.3);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A6FA5,
      shininess: 80,
      specular: 0x666666,
      map: metalTexture,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.4;
    body.castShadow = true;
    body.visible = false; // Hide body in first-person
    playerBodyGroup.add(body);
    
    // Head
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.3);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFDBC4,
      transparent: true,
      opacity: 0.95
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.4;
    head.castShadow = true;
    head.visible = false; // Hide head in first-person
    playerBodyGroup.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 12);
    const armMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5A7BC8,
      shininess: 60,
      specular: 0x555555,
      map: metalTexture
    });
    
    // Left arm
    const leftArmGroup = new THREE.Group();
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.y = -0.4;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-0.6, 1.4, -0.3);
    leftArmGroup.rotation.x = Math.PI / 8;
    leftArmGroup.visible = true; // Keep arms visible for immersion
    playerBodyGroup.add(leftArmGroup);
    
    // Left hand
    const handGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const handMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf4c2a1,
      transparent: true,
      opacity: 0.95
    });
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -0.5, 0);
    leftHand.castShadow = true;
    leftArmGroup.add(leftHand);
    
    // Right arm
    const rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.y = -0.4;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(0.6, 1.4, -0.2);
    rightArmGroup.rotation.order = 'XYZ';
    rightArmGroup.rotation.set(Math.PI / 8, 0, 0);
    rightArmGroup.visible = true; // Keep arms visible for immersion
    playerBodyGroup.add(rightArmGroup);
    
    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial.clone());
    rightHand.position.set(0, -0.5, 0);
    rightHand.castShadow = true;
    rightArmGroup.add(rightHand);
    
    // SWORD
    const swordGroup = new THREE.Group();
    swordGroup.rotation.order = 'XYZ';
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 12);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xCD853F,
      shininess: 30,
      map: woodTexture,
      normalScale: new THREE.Vector2(0.3, 0.3)
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0);
    handle.rotation.x = Math.PI / 2;
    handle.castShadow = true;
    swordGroup.add(handle);
    
    // Cross guard
    const guardGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.08);
    const guardMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x9A9A9A,
      shininess: 100,
      specular: 0xffffff,
      map: metalTexture
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0, -0.3);
    guard.castShadow = true;
    swordGroup.add(guard);
    
    // Blade - Store reference for tip tracking
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.02, 1.8);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFFFFFF,
      shininess: 150,
      specular: 0xffffff,
      reflectivity: 0.8,
      map: metalTexture
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0, -1.2);
    blade.castShadow = true;
    swordGroup.add(blade);
    
    // Store blade reference for tip tracking
    this.bladeMesh = blade;
    
    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.06, 12, 8);
    const pommelMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xCD853F,
      shininess: 80,
      map: woodTexture
    });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, 0, 0.3);
    pommel.castShadow = true;
    swordGroup.add(pommel);
    
    swordGroup.position.set(0, -0.5, -0.1);
    swordGroup.rotation.x = -Math.PI / 12;
    rightArmGroup.add(swordGroup);
    this.sword = swordGroup;
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A6FA5,
      shininess: 60,
      map: metalTexture
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, -1.2, 0);
    leftLeg.castShadow = true;
    leftLeg.visible = false; // Hide legs in first-person
    playerBodyGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(0.2, -1.2, 0);
    rightLeg.castShadow = true;
    rightLeg.visible = false; // Hide legs in first-person
    playerBodyGroup.add(rightLeg);
    
    this.group.add(playerBodyGroup);
    
    return {
      group: playerBodyGroup,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftLeg,
      rightLeg,
      body,
      head
    };
  }
  
  private initializeSwordSwing(): SwordSwingAnimation {
    const duration = 0.64;
    
    return {
      isActive: false,
      mixer: null,
      action: null,
      startTime: 0,
      duration: duration,
      phases: {
        windup: duration * 0.2,
        slash: duration * 0.5,
        recovery: duration * 0.3
      },
      rotations: {
        neutral: { x: Math.PI / 8, y: 0, z: 0 },
        windup: { 
          x: Math.PI / 8 + THREE.MathUtils.degToRad(50),
          y: THREE.MathUtils.degToRad(-40),
          z: 0
        },
        slash: { 
          x: Math.PI / 8 + THREE.MathUtils.degToRad(-15),
          y: THREE.MathUtils.degToRad(70),
          z: 0
        }
      },
      clock: new THREE.Clock(),
      trail: null,
      trailPoints: [],
      cameraShakeIntensity: 0.05,
      wristSnapIntensity: THREE.MathUtils.degToRad(10)
    };
  }
  
  public update(deltaTime: number, isMoving?: boolean): void {
    const isActuallyMoving = isMoving ?? false;
    
    // Update sword swing animation
    this.updateSwordSwing();
    
    // Update walking animation
    if (isActuallyMoving && !this.swordSwing.isActive) {
      // Update walk cycle
      const walkCycleMultiplier = this.isSprinting ? 2 : 1;
      this.walkCycle += deltaTime * this.walkCycleSpeed * walkCycleMultiplier;
      
      // Animate legs
      const legSwing = Math.sin(this.walkCycle) * this.legSwingIntensity;
      this.playerBody.leftLeg.rotation.x = legSwing;
      this.playerBody.rightLeg.rotation.x = -legSwing;
      
      // Animate arms if not attacking
      const armSwing = Math.sin(this.walkCycle) * this.armSwingIntensity;
      this.playerBody.leftArm.rotation.x = Math.PI / 8 - armSwing;
      if (!this.swordSwing.isActive) {
        this.playerBody.rightArm.rotation.x = Math.PI / 8 + armSwing;
      }
      
      this.isWalking = true;
      
      // Play footstep sound
      if (Math.sin(this.walkCycle) > 0.9 && !this.audioManager.isPlaying('footstep')) {
        this.audioManager.play('footstep');
      }
    } 
    else if (!isActuallyMoving && !this.swordSwing.isActive) {
      // Return to idle pose
      const returnSpeed = deltaTime * this.animationReturnSpeed;
      
      this.playerBody.leftLeg.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftLeg.rotation.x, 0, returnSpeed
      );
      this.playerBody.rightLeg.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightLeg.rotation.x, 0, returnSpeed
      );
      
      this.playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.x, Math.PI / 8, returnSpeed
      );
      
      if (!this.swordSwing.isActive) {
        this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
          this.playerBody.rightArm.rotation.x, Math.PI / 8, returnSpeed
        );
      }
      
      this.isWalking = false;
    }
    
    // Update sprint stamina
    if (this.isSprinting) {
      const sprintElapsed = Date.now() - this.sprintStartTime;
      
      // Stop sprinting if stamina reaches 0 or 5 seconds have elapsed
      if (this.sprintStamina <= 0 || sprintElapsed >= 5000) {
        this.isSprinting = false;
      } else {
        // Drain stamina if actually moving while sprinting
        if (isActuallyMoving) {
          // For 5 seconds of sprinting: 100 stamina / 5 seconds = 20 stamina per second
          this.sprintStamina = Math.max(0, this.sprintStamina - (20 * deltaTime));
          this.stats.stamina = this.sprintStamina;
        }
      }
    } else {
      // Regenerate stamina when not sprinting - 10 stamina per second (full recovery in 10 seconds)
      if (this.sprintStamina < this.stats.maxStamina) {
        this.sprintStamina = Math.min(this.stats.maxStamina, this.sprintStamina + (10 * deltaTime));
        this.stats.stamina = this.sprintStamina;
      }
    }
    
    // Update sword hitbox position
    this.updateSwordHitBox();
  }
  
  public startSwordSwing(): void {
    if (this.swordSwing.isActive) {
      console.log("🗡️ [Player] Sword swing blocked - already attacking");
      return;
    }
    
    const now = Date.now();
    if (now - this.lastAttackTime < 640) {
      console.log("🗡️ [Player] Sword swing blocked - player cooldown active");
      return;
    }
    
    console.log("🗡️ [Player] Starting sword swing animation");
    this.swordSwing.isActive = true;
    this.swordSwing.startTime = this.swordSwing.clock.getElapsedTime();
    this.lastAttackTime = now;
    
    // Clear hit enemies set for new swing
    this.hitEnemiesThisSwing.clear();
    
    // Reset sword trail tracking
    this.swordTipPositions = [];
    this.swooshEffectCreated = false;
    
    // Play sword swing sound
    this.audioManager.play('sword_swing');
    
    // Initialize trail points
    this.swordSwing.trailPoints = [];
    for (let i = 0; i < 15; i++) {
      this.swordSwing.trailPoints.push(new THREE.Vector3());
    }
    
    console.log("🗡️ [Player] Sword swing animation started successfully");
  }
  
  private updateSwordSwing(): void {
    if (!this.swordSwing.isActive) return;
    
    const elapsed = this.swordSwing.clock.getElapsedTime() - this.swordSwing.startTime;
    const { phases, rotations, duration } = this.swordSwing;
    
    let currentRotation = { x: 0, y: 0, z: 0 };
    let swordWristRotation = 0;
    let isSlashPhase = false;
    
    if (elapsed < phases.windup) {
      // WIND-UP PHASE: UP and RIGHT
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      currentRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      currentRotation.y = THREE.MathUtils.lerp(rotations.neutral.y, rotations.windup.y, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE: DOWN and LEFT
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t);
      
      currentRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, easedT);
      currentRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, easedT);
      
      // Wrist snap
      if (t >= 0.2 && t <= 0.8) {
        const wristT = (t - 0.2) / 0.6;
        swordWristRotation = Math.sin(wristT * Math.PI) * this.swordSwing.wristSnapIntensity;
      }
      
      isSlashPhase = true;
      
      // Track sword tip for trail effect more frequently during slash
      this.trackSwordTip();
      
      // Create enhanced swoosh effect once during mid-slash
      if (t >= 0.3 && t <= 0.5 && !this.swooshEffectCreated) {
        this.createEnhancedSwooshEffect();
        this.swooshEffectCreated = true;
      }
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE: Return to neutral
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      currentRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      currentRotation.y = THREE.MathUtils.lerp(rotations.slash.y, rotations.neutral.y, easedT);
      
    } else {
      // ANIMATION COMPLETE
      currentRotation = rotations.neutral;
      this.swordSwing.isActive = false;
      
      // Create sword trail if we have enough positions
      if (this.swordTipPositions.length > 5) {
        this.createSwordTrailEffect();
      }
      
      // Clean up trail
      if (this.swordSwing.trail) {
        this.swordSwing.trail = null;
      }
      
      return;
    }
    
    // Apply rotations to right arm
    this.playerBody.rightArm.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z, 'XYZ');
    
    // Apply wrist snap to sword
    if (this.sword) {
      this.sword.rotation.z = swordWristRotation;
    }
  }
  
  private trackSwordTip(): void {
    // Get the actual sword tip position using blade mesh world position
    const bladeTipPosition = new THREE.Vector3();
    
    // The blade extends 1.8 units in the -Z direction from its center
    // So the tip is at the blade's position + half the blade length in local -Z
    const bladeLocalTip = new THREE.Vector3(0, 0, -0.9); // Half of 1.8 blade length
    
    // Transform to world coordinates
    this.bladeMesh.localToWorld(bladeLocalTip.clone());
    bladeTipPosition.copy(bladeLocalTip);
    
    // Add to trail positions
    this.swordTipPositions.push(bladeTipPosition.clone());
    
    // Limit trail length
    if (this.swordTipPositions.length > this.maxTrailLength) {
      this.swordTipPositions.shift();
    }
    
    console.log("🗡️ [Player] Tracking sword tip at:", bladeTipPosition);
  }
  
  private createEnhancedSwooshEffect(): void {
    // Get actual sword tip position
    const swordTipPosition = new THREE.Vector3();
    const bladeLocalTip = new THREE.Vector3(0, 0, -0.9);
    this.bladeMesh.localToWorld(bladeLocalTip.clone());
    swordTipPosition.copy(bladeLocalTip);
    
    // Calculate sword direction based on recent tip positions
    let swordDirection = new THREE.Vector3(1, 0, 0); // Default direction
    if (this.swordTipPositions.length >= 2) {
      const recent = this.swordTipPositions[this.swordTipPositions.length - 1];
      const previous = this.swordTipPositions[this.swordTipPositions.length - 2];
      swordDirection = recent.clone().sub(previous).normalize();
    }
    
    // Create multiple swoosh effects for better visibility
    this.effectsManager.createSwooshEffect(swordTipPosition, swordDirection);
    
    // Create additional attack effect at tip
    this.effectsManager.createAttackEffect(swordTipPosition, 0xFFFFFF);
    
    // Create dust cloud at sword position
    this.effectsManager.createDustCloud(swordTipPosition);
    
    console.log("🌪️ [Player] Enhanced swoosh effect created at sword tip:", swordTipPosition);
  }
  
  private createSwordTrailEffect(): void {
    if (this.swordTipPositions.length < 2) return;
    
    // Create sword trail using the tracked positions
    const trail = this.effectsManager.createSwordTrail(this.swordTipPositions);
    
    if (trail) {
      console.log("⚡ [Player] Sword trail created with", this.swordTipPositions.length, "positions");
    }
  }
  
  private updateSwordHitBox(): void {
    if (!this.swordSwing.isActive) return;
    
    // Use actual sword tip position for combat hitbox
    const swordTipPosition = new THREE.Vector3();
    const bladeLocalTip = new THREE.Vector3(0, 0, -0.9);
    this.bladeMesh.localToWorld(bladeLocalTip.clone());
    swordTipPosition.copy(bladeLocalTip);
    
    // Update sword hitbox position
    this.swordHitBox.position.copy(swordTipPosition);
  }
  
  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }
  
  public isAttacking(): boolean {
    return this.swordSwing.isActive;
  }
  
  public getAttackPower(): number {
    return this.stats.attackPower;
  }
  
  public addEnemy(enemy: any): void {
    this.hitEnemiesThisSwing.add(enemy);
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.hitEnemiesThisSwing.has(enemy);
  }
  
  public startSprint(): void {
    if (this.sprintStamina >= 50) { // Need at least 50 stamina to sprint
      this.isSprinting = true;
      this.sprintStartTime = Date.now();
    }
  }
  
  public stopSprint(): void {
    this.isSprinting = false;
  }
  
  public takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount);
    
    // Play hurt sound
    this.audioManager.play('player_hurt');
    
    // Create damage effect (no camera shake)
    this.effectsManager.createDamageEffect(this.group.position.clone());
  }
  
  public addGold(amount: number): void {
    this.stats.gold += amount;
    
    // Play gold pickup sound
    this.audioManager.play('gold_pickup');
  }
  
  public addExperience(amount: number): void {
    this.stats.experience += amount;
    
    // Check for level up
    while (this.stats.experience >= this.stats.experienceToNext) {
      this.stats.experience -= this.stats.experienceToNext;
      this.levelUp();
    }
  }
  
  private levelUp(): void {
    this.stats.level++;
    this.stats.maxHealth += 10;
    this.stats.health = this.stats.maxHealth;
    this.stats.attack += 2;
    this.stats.attackPower += 2;
    this.stats.defense += 1;
    
    // Increase experience requirement for next level
    this.stats.experienceToNext = Math.floor(this.stats.experienceToNext * 1.5);
    
    // Create level up effect
    // TODO: Add level up effect
  }
  
  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
  
  public setPosition(position: THREE.Vector3): void {
    this.group.position.copy(position);
    console.log("Player position set to:", this.group.position);
  }
  
  public getRotation(): number {
    return this.group.rotation.y;
  }
  
  public setRotation(rotation: number): void {
    // This is used by MovementSystem for movement direction calculation only
    // It doesn't rotate the visual components (arms, sword, etc.)
    console.log("Player movement rotation set to:", rotation);
  }
  
  public setVisualRotation(yaw: number, pitch: number): void {
    // Only rotate the player's visual components based on camera look direction
    // This keeps arms and sword pointing where the player is looking
    
    // Apply yaw rotation to the entire player body group for first-person feel
    this.group.rotation.y = yaw;
    
    // Apply subtle pitch rotation to arms for looking up/down
    if (this.playerBody.leftArm && this.playerBody.rightArm) {
      const pitchInfluence = pitch * 0.3; // Reduced influence for subtle effect
      
      // Adjust arm rotations based on pitch
      this.playerBody.leftArm.rotation.x = Math.PI / 8 + pitchInfluence;
      this.playerBody.rightArm.rotation.x = Math.PI / 8 + pitchInfluence;
    }
    
    console.log("Player visual rotation updated - Yaw:", yaw, "Pitch:", pitch);
  }
  
  public getStats(): PlayerStats {
    return { ...this.stats };
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  public getSprinting(): boolean {
    return this.isSprinting;
  }
  
  public getSprintStamina(): number {
    return this.sprintStamina;
  }
  
  public getBody(): PlayerBody {
    return this.playerBody;
  }
  
  public getSwordSwing(): SwordSwingAnimation {
    return this.swordSwing;
  }
  
  // Legacy methods for backwards compatibility
  public attack(): boolean {
    if (this.swordSwing.isActive) return false;
    
    const now = Date.now();
    if (now - this.lastAttackTime < 640) return false; // Attack cooldown
    
    this.startSwordSwing();
    return true;
  }
  
  public move(direction: any, deltaTime: number): void {
    const speed = this.stats.speed * deltaTime * (this.isSprinting ? 1.5 : 1);
    const previousPosition = this.group.position.clone();
    
    console.log("🚶 [Player] Move called:", {
      direction: direction,
      speed: speed,
      deltaTime: deltaTime,
      currentPos: previousPosition,
      isSprinting: this.isSprinting
    });
    
    // Apply movement
    this.group.position.x += direction.x * speed;
    this.group.position.z += direction.z * speed;
    
    const actualMovement = this.group.position.clone().sub(previousPosition);
    
    console.log("🚶 [Player] Move executed:", {
      previousPos: previousPosition,
      newPos: this.group.position.clone(),
      actualMovement: actualMovement,
      movementMagnitude: actualMovement.length(),
      wasSuccessful: actualMovement.length() > 0.001
    });
    
    // FIXED: Don't rotate visual components during movement
    // Visual rotation is now handled by setVisualRotation() from camera look
  }
  
  public getMesh(): THREE.Group {
    return this.group;
  }
  
  public isAlive(): boolean {
    return this.stats.health > 0;
  }
  
  public gainExperience(amount: number): boolean {
    this.addExperience(amount);
    return false; // Will be true if level up happened, but simplified for now
  }
  
  public dispose(): void {
    // Clean up resources
  }
}
