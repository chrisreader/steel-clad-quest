import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator';
import { PlayerBody, WeaponSwingAnimation, PlayerStats } from '../../types/GameTypes';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponManager } from '../weapons/WeaponManager';

export class Player {
  // THREE.js objects
  private group: THREE.Group;
  private playerBody: PlayerBody;
  private scene: THREE.Scene;
  
  // Weapon system
  private equippedWeapon: BaseWeapon | null = null;
  private weaponManager: WeaponManager;
  private swordHitBox: THREE.Mesh;
  
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
  private weaponSwing: WeaponSwingAnimation;
  
  // External managers
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  // Weapon trail tracking
  private weaponTipPositions: THREE.Vector3[] = [];
  private maxTrailLength: number = 15;
  private swooshEffectCreated: boolean = false;
  
  // Enhanced bow animation properties
  private isBowEquipped: boolean = false;
  private bowDrawAnimation: {
    isActive: boolean;
    leftHandRestPosition: THREE.Vector3;
    rightHandRestPosition: THREE.Vector3;
    leftHandDrawPosition: THREE.Vector3;
    rightHandDrawPosition: THREE.Vector3;
    bowRestRotation: THREE.Euler;
    bowDrawRotation: THREE.Euler;
    leftHandTarget: THREE.Vector3;
    rightHandTarget: THREE.Vector3;
    bowRotationTarget: THREE.Euler;
    leftArmRestRotation: THREE.Euler;
    rightArmRestRotation: THREE.Euler;
    leftArmDrawRotation: THREE.Euler;
    rightArmDrawRotation: THREE.Euler;
    leftHandRestRotation: THREE.Euler;
    rightHandRestRotation: THREE.Euler;
    leftHandDrawRotation: THREE.Euler;
    rightHandDrawRotation: THREE.Euler;
  } = {
    isActive: false,
    leftHandRestPosition: new THREE.Vector3(0, 0, 0),
    rightHandRestPosition: new THREE.Vector3(0, 0, 0),
    leftHandDrawPosition: new THREE.Vector3(0, 0, 0),
    rightHandDrawPosition: new THREE.Vector3(0, 0, 0),
    bowRestRotation: new THREE.Euler(0, 0, 0),
    bowDrawRotation: new THREE.Euler(0, 0, 0),
    leftHandTarget: new THREE.Vector3(0, 0, 0),
    rightHandTarget: new THREE.Vector3(0, 0, 0),
    bowRotationTarget: new THREE.Euler(0, 0, 0),
    leftArmRestRotation: new THREE.Euler(0, 0, 0),
    rightArmRestRotation: new THREE.Euler(0, 0, 0),
    leftArmDrawRotation: new THREE.Euler(0, 0, 0),
    rightArmDrawRotation: new THREE.Euler(0, 0, 0),
    leftHandRestRotation: new THREE.Euler(0, 0, 0),
    rightHandRestRotation: new THREE.Euler(0, 0, 0),
    leftHandDrawRotation: new THREE.Euler(0, 0, 0),
    rightHandDrawRotation: new THREE.Euler(0, 0, 0)
  };
  
  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.weaponManager = new WeaponManager();
    
    // Create player group
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 2);
    this.group.userData.isPlayer = true;
    scene.add(this.group);
    
    console.log("Player group created and added to scene at position:", this.group.position);
    
    // Create player body with separate hand controls
    this.playerBody = this.createPlayerBody();
    
    // Create fallback hitbox for when no weapon is equipped
    const fallbackHitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const fallbackHitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.swordHitBox = new THREE.Mesh(fallbackHitBoxGeometry, fallbackHitBoxMaterial);
    scene.add(this.swordHitBox);
    
    // Initialize weapon swing animation
    this.weaponSwing = this.initializeWeaponSwing();
    
    // Initialize bow animation positions
    this.initializeBowAnimationPositions();
    
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
    
    // Left arm - positioned higher and more forward for better visibility
    const leftArmGroup = new THREE.Group();
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.y = -0.4;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-0.4, 1.6, -0.6); // Raised Y from 1.4 to 1.6, brought closer with Z
    leftArmGroup.rotation.x = Math.PI / 8;
    leftArmGroup.visible = true;
    playerBodyGroup.add(leftArmGroup);
    
    // Left hand - positioned at the proper end of the arm
    const leftHandGroup = new THREE.Group();
    const handGeometry = new THREE.SphereGeometry(0.08, 12, 8);
    const handMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf4c2a1,
      transparent: true,
      opacity: 0.95
    });
    const leftHandMesh = new THREE.Mesh(handGeometry, handMaterial);
    leftHandMesh.castShadow = true;
    leftHandGroup.add(leftHandMesh);
    leftHandGroup.position.set(0, -0.6, 0); // Extended further down the arm to the end
    leftArmGroup.add(leftHandGroup);
    
    // Right arm (weapon-holding arm)
    const rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.y = -0.4;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(1.0, 1.4, -0.2);
    rightArmGroup.rotation.order = 'XYZ';
    rightArmGroup.rotation.set(Math.PI / 8, 0, 0);
    rightArmGroup.visible = true;
    playerBodyGroup.add(rightArmGroup);
    
    // Right hand (separate group for independent control)
    const rightHandGroup = new THREE.Group();
    const rightHandMesh = new THREE.Mesh(handGeometry, handMaterial.clone());
    rightHandMesh.castShadow = true;
    rightHandGroup.add(rightHandMesh);
    rightHandGroup.position.set(0, -0.5, 0);
    rightArmGroup.add(rightHandGroup);
    
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
    leftLeg.visible = false;
    playerBodyGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(0.2, -1.2, 0);
    rightLeg.castShadow = true;
    rightLeg.visible = false;
    playerBodyGroup.add(rightLeg);
    
    this.group.add(playerBodyGroup);
    
    return {
      group: playerBodyGroup,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftHand: leftHandGroup,
      rightHand: rightHandGroup,
      leftLeg,
      rightLeg,
      body,
      head
    };
  }
  
  private initializeBowAnimationPositions(): void {
    // Enhanced hand rotations for proper vertical bow gripping
    this.bowDrawAnimation.leftHandRestRotation.set(-Math.PI / 4, 0, Math.PI / 3); // Better grip angle
    this.bowDrawAnimation.rightHandRestRotation.set(0, 0, 0); // Keep right hand neutral
    
    // Hand rotations during draw - left hand maintains realistic grip
    this.bowDrawAnimation.leftHandDrawRotation.set(-Math.PI / 4, 0, Math.PI / 3); // Maintain grip orientation
    this.bowDrawAnimation.rightHandDrawRotation.set(0, 0, 0); // Right hand stays neutral
    
    // Updated realistic arm positions for enhanced archery stance
    this.bowDrawAnimation.leftHandRestPosition.set(-0.4, 1.4, -0.4); // Updated Y to 1.4
    this.bowDrawAnimation.rightHandRestPosition.set(0.3, 1.5, -0.3); // Right arm ready position
    
    const baseShoulder = Math.PI / 8;
    
    // Left arm: Extended forward for bow holding with better visibility
    this.bowDrawAnimation.leftArmRestRotation.set(
      baseShoulder + 0.3, // Slight upward angle for visibility
      -0.6, // Less extreme angle across body for better view
      0.1   // Slight outward rotation
    );
    
    // Right arm: Ready to draw position
    this.bowDrawAnimation.rightArmRestRotation.set(
      baseShoulder + 0.2, // Slightly raised
      0.1,  // Forward position
      -0.1  // Slight inward rotation
    );
    
    // Drawing positions - left arm stays steady, right arm pulls back
    this.bowDrawAnimation.leftHandDrawPosition.set(-0.4, 1.4, -0.4); // Updated Y to 1.4
    this.bowDrawAnimation.rightHandDrawPosition.set(0.8, 1.5, -0.2);  // Right hand pulls back
    
    // Drawing arm rotations with enhanced visibility
    this.bowDrawAnimation.leftArmDrawRotation.set(
      baseShoulder + 0.3, // Maintain bow holding angle
      -0.6, // Keep extended position but visible
      0.1   // Maintain outward rotation
    );
    
    this.bowDrawAnimation.rightArmDrawRotation.set(
      baseShoulder + 0.7, // Pull back higher
      1.0,  // Pulled back position
      -0.5  // More inward rotation when drawing
    );
    
    // Bow rotations - keep vertical throughout
    this.bowDrawAnimation.bowRestRotation.set(0, 0, 0); // Vertical bow
    this.bowDrawAnimation.bowDrawRotation.set(0, 0, 0); // Stay vertical
    
    console.log("🏹 [Player] Enhanced bow animation initialized with better visibility and hand positioning");
  }
  
  public equipWeapon(weaponId: string): boolean {
    console.log(`🗡️ [Player] Equipping weapon: ${weaponId}`);
    
    // Unequip current weapon if any
    if (this.equippedWeapon) {
      this.unequipWeapon();
    }
    
    // Create new weapon
    const weapon = this.weaponManager.createWeapon(weaponId);
    if (!weapon) {
      console.error(`Failed to create weapon: ${weaponId}`);
      return false;
    }
    
    // Equip the weapon
    weapon.equip(this.scene);
    this.equippedWeapon = weapon;
    
    // Check if weapon is a bow
    this.isBowEquipped = weapon.getConfig().type === 'bow';
    
    if (this.isBowEquipped) {
      // Attach bow to left HAND for proper control
      this.playerBody.leftHand.add(weapon.getMesh());
      
      // Position bow handle properly in the hand for realistic grip
      weapon.getMesh().position.set(0.05, 0, 0.1); // Adjusted for better hand positioning
      weapon.getMesh().rotation.set(0, 0, 0); // Vertical orientation
      weapon.getMesh().scale.set(1.0, 1.0, 1.0);
      
      // Set initial archery stance positions
      this.setArcheryStance();
      
      console.log(`🏹 [Player] Bow equipped with improved hand positioning and visibility`);
    } else {
      // Attach melee weapon to right hand
      this.playerBody.rightHand.add(weapon.getMesh());
      
      // Reset to normal arm positions for melee weapons
      this.resetToNormalStance();
    }
    
    // Update swing animation with weapon config
    const weaponConfig = weapon.getConfig();
    this.weaponSwing.duration = weaponConfig.swingAnimation.duration;
    this.weaponSwing.phases = weaponConfig.swingAnimation.phases;
    this.weaponSwing.rotations = weaponConfig.swingAnimation.rotations;
    
    // Update hitbox reference
    this.swordHitBox = weapon.getHitBox();
    
    console.log(`🗡️ [Player] Successfully equipped ${weaponConfig.name}`);
    return true;
  }
  
  private setArcheryStance(): void {
    // Set arms to proper archery positions with enhanced visibility - lowered by 10% from raised position
    this.playerBody.leftArm.position.set(-0.4, 1.512, -0.4);  // Lowered Y by 10% (1.68 * 0.9)
    this.playerBody.rightArm.position.set(0.3, 1.512, -0.2);  // Lowered Y by 10% (1.68 * 0.9)
    
    // Set arm rotations for archery stance with better field of view
    this.playerBody.leftArm.rotation.copy(this.bowDrawAnimation.leftArmRestRotation);
    this.playerBody.rightArm.rotation.copy(this.bowDrawAnimation.rightArmRestRotation);
    
    // Set enhanced hand rotations for realistic bow gripping
    this.playerBody.leftHand.rotation.copy(this.bowDrawAnimation.leftHandRestRotation);
    this.playerBody.rightHand.rotation.copy(this.bowDrawAnimation.rightHandRestRotation);
    
    // Initialize targets
    this.bowDrawAnimation.leftHandTarget.copy(this.bowDrawAnimation.leftHandRestPosition);
    this.bowDrawAnimation.rightHandTarget.copy(this.bowDrawAnimation.rightHandRestPosition);
    this.bowDrawAnimation.bowRotationTarget.copy(this.bowDrawAnimation.bowRestRotation);
    
    console.log("🏹 [Player] Enhanced archery stance with improved visibility and hand positioning");
  }
  
  private resetToNormalStance(): void {
    // Reset arms to normal positions for non-bow weapons
    this.playerBody.leftArm.position.set(-0.6, 1.4, -0.3);
    this.playerBody.rightArm.position.set(1.0, 1.4, -0.2);
    
    // Reset arm rotations
    this.playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
    this.playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0);
    
    // Reset hand rotations
    this.playerBody.leftHand.rotation.set(0, 0, 0);
    this.playerBody.rightHand.rotation.set(0, 0, 0);
    
    console.log("🗡️ [Player] Reset to normal stance for melee weapon");
  }
  
  public unequipWeapon(): boolean {
    if (!this.equippedWeapon) {
      return false;
    }
    
    console.log(`🗡️ [Player] Unequipping weapon: ${this.equippedWeapon.getConfig().name}`);
    
    // Remove weapon from appropriate hand
    if (this.isBowEquipped) {
      this.playerBody.leftHand.remove(this.equippedWeapon.getMesh());
      this.resetToNormalStance(); // Reset stance when unequipping bow
    } else {
      this.playerBody.rightHand.remove(this.equippedWeapon.getMesh());
    }
    
    // Reset bow state
    this.isBowEquipped = false;
    this.bowDrawAnimation.isActive = false;
    
    // Reset to default hitbox
    const fallbackHitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const fallbackHitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.swordHitBox = new THREE.Mesh(fallbackHitBoxGeometry, fallbackHitBoxMaterial);
    this.scene.add(this.swordHitBox);
    
    console.log(`🗡️ [Player] Weapon unequipped`);
    return true;
  }
  
  public getEquippedWeapon(): BaseWeapon | null {
    return this.equippedWeapon;
  }
  
  private initializeWeaponSwing(): WeaponSwingAnimation {
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
  
  public startSwordSwing(): void {
    // Only allow attack if weapon is equipped and not a bow
    if (!this.equippedWeapon) {
      console.log("🗡️ [Player] Cannot attack - no weapon equipped");
      return;
    }
    
    if (this.isBowEquipped) {
      console.log("🏹 [Player] Cannot melee attack with bow - use bow draw instead");
      return;
    }
    
    if (this.weaponSwing.isActive) {
      console.log("🗡️ [Player] Weapon swing blocked - already attacking");
      return;
    }
    
    const now = Date.now();
    if (now - this.lastAttackTime < this.weaponSwing.duration * 1000) {
      console.log("🗡️ [Player] Weapon swing blocked - player cooldown active");
      return;
    }
    
    console.log("🗡️ [Player] Starting weapon swing animation");
    this.weaponSwing.isActive = true;
    this.weaponSwing.startTime = this.weaponSwing.clock.getElapsedTime();
    this.lastAttackTime = now;
    
    // Clear hit enemies set for new swing
    this.hitEnemiesThisSwing.clear();
    
    // Reset weapon trail tracking
    this.weaponTipPositions = [];
    this.swooshEffectCreated = false;
    
    // Play weapon swing sound
    this.audioManager.play('sword_swing');
    
    // Initialize trail points
    this.weaponSwing.trailPoints = [];
    for (let i = 0; i < 15; i++) {
      this.weaponSwing.trailPoints.push(new THREE.Vector3());
    }
    
    console.log("🗡️ [Player] Weapon swing animation started successfully");
  }
  
  public isAttacking(): boolean {
    return this.weaponSwing.isActive;
  }
  
  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }
  
  public hasHitEnemy(enemy: any): boolean {
    return this.hitEnemiesThisSwing.has(enemy);
  }
  
  public addEnemy(enemy: any): void {
    this.hitEnemiesThisSwing.add(enemy);
  }
  
  private updateSwordSwing(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) return;
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, rotations, duration } = this.weaponSwing;
    
    let currentRotation = { x: 0, y: 0, z: 0 };
    let weaponWristRotation = 0;
    
    if (elapsed < phases.windup) {
      // WIND-UP PHASE
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      currentRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      currentRotation.y = THREE.MathUtils.lerp(rotations.neutral.y, rotations.windup.y, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // SLASH PHASE
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t);
      
      currentRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, easedT);
      currentRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, easedT);
      
      // Wrist snap
      if (t >= 0.2 && t <= 0.8) {
        const wristT = (t - 0.2) / 0.6;
        weaponWristRotation = Math.sin(wristT * Math.PI) * this.weaponSwing.wristSnapIntensity;
      }
      
      // Track weapon tip for trail effect
      this.trackWeaponTip();
      
      // Create enhanced swoosh effect once during mid-slash
      if (t >= 0.3 && t <= 0.5 && !this.swooshEffectCreated) {
        this.createEnhancedSwooshEffect();
        this.swooshEffectCreated = true;
      }
      
    } else if (elapsed < duration) {
      // RECOVERY PHASE
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      currentRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      currentRotation.y = THREE.MathUtils.lerp(rotations.slash.y, rotations.neutral.y, easedT);
      
    } else {
      // ANIMATION COMPLETE
      currentRotation = rotations.neutral;
      this.weaponSwing.isActive = false;
      
      // Create weapon trail if we have enough positions
      if (this.weaponTipPositions.length > 5) {
        this.createWeaponTrailEffect();
      }
      
      return;
    }
    
    // Apply rotations to right arm
    this.playerBody.rightArm.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z, 'XYZ');
    
    // Apply wrist snap to weapon
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = weaponWristRotation;
    }
  }
  
  private trackWeaponTip(): void {
    if (!this.equippedWeapon) return;
    
    try {
      // Get weapon tip position using blade reference
      const bladeReference = this.equippedWeapon.getBladeReference();
      const bladeLocalTip = new THREE.Vector3(0, 0, -0.9);
      
      // Transform to world coordinates
      const worldTipPosition = bladeLocalTip.clone();
      bladeReference.localToWorld(worldTipPosition);
      
      // Add to trail positions
      this.weaponTipPositions.push(worldTipPosition.clone());
      
      // Limit trail length
      if (this.weaponTipPositions.length > this.maxTrailLength) {
        this.weaponTipPositions.shift();
      }
    } catch (error) {
      console.warn("Could not track weapon tip:", error);
    }
  }
  
  private createEnhancedSwooshEffect(): void {
    if (!this.equippedWeapon || this.weaponTipPositions.length === 0) return;
    
    const tipPosition = this.weaponTipPositions[this.weaponTipPositions.length - 1];
    let direction = new THREE.Vector3(1, 0, 0);
    
    if (this.weaponTipPositions.length >= 2) {
      const recent = this.weaponTipPositions[this.weaponTipPositions.length - 1];
      const previous = this.weaponTipPositions[this.weaponTipPositions.length - 2];
      direction = recent.clone().sub(previous).normalize();
    }
    
    this.effectsManager.createSwooshEffect(tipPosition, direction);
  }
  
  private createWeaponTrailEffect(): void {
    if (this.weaponTipPositions.length < 2) return;
    
    const trail = this.effectsManager.createSwordTrail(this.weaponTipPositions);
    if (trail) {
      console.log("⚡ [Player] Weapon trail created with", this.weaponTipPositions.length, "positions");
    }
  }
  
  private updateSwordHitBox(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) return;
    
    try {
      // Update hitbox position using weapon's tip
      const bladeReference = this.equippedWeapon.getBladeReference();
      const bladeLocalTip = new THREE.Vector3(0, 0, -0.9);
      
      const worldTipPosition = bladeLocalTip.clone();
      bladeReference.localToWorld(worldTipPosition);
      
      this.swordHitBox.position.copy(worldTipPosition);
    } catch (error) {
      console.warn("Could not update weapon hitbox:", error);
    }
  }
  
  public getAttackPower(): number {
    if (this.equippedWeapon) {
      return this.stats.attackPower + this.equippedWeapon.getStats().damage;
    }
    return this.stats.attackPower;
  }
  
  public update(deltaTime: number, isMoving?: boolean): void {
    const isActuallyMoving = isMoving ?? false;
    
    // Update weapon swing animation (for melee weapons)
    if (!this.isBowEquipped) {
      this.updateSwordSwing();
    }
    
    // Update bow animation (for bow weapons)
    if (this.isBowEquipped) {
      this.updateBowAnimation(deltaTime);
    }
    
    // Update walking animation
    if (isActuallyMoving && !this.weaponSwing.isActive && !this.bowDrawAnimation.isActive) {
      // Update walk cycle
      const walkCycleMultiplier = this.isSprinting ? 2 : 1;
      this.walkCycle += deltaTime * this.walkCycleSpeed * walkCycleMultiplier;
      
      // Animate legs
      const legSwing = Math.sin(this.walkCycle) * this.legSwingIntensity;
      this.playerBody.leftLeg.rotation.x = legSwing;
      this.playerBody.rightLeg.rotation.x = -legSwing;
      
      // Animate arms if not in archery stance
      if (!this.isBowEquipped) {
        const armSwing = Math.sin(this.walkCycle) * this.armSwingIntensity;
        this.playerBody.leftArm.rotation.x = Math.PI / 8 - armSwing;
        if (!this.weaponSwing.isActive) {
          this.playerBody.rightArm.rotation.x = Math.PI / 8 + armSwing;
        }
      }
      
      this.isWalking = true;
      
      // Play footstep sound
      if (Math.sin(this.walkCycle) > 0.9 && !this.audioManager.isPlaying('footstep')) {
        this.audioManager.play('footstep');
      }
    } 
    else if (!isActuallyMoving && !this.weaponSwing.isActive && !this.bowDrawAnimation.isActive) {
      // Return to idle pose
      const returnSpeed = deltaTime * this.animationReturnSpeed;
      
      this.playerBody.leftLeg.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftLeg.rotation.x, 0, returnSpeed
      );
      this.playerBody.rightLeg.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightLeg.rotation.x, 0, returnSpeed
      );
      
      // Only reset arms if not holding bow
      if (!this.isBowEquipped) {
        this.playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
          this.playerBody.leftArm.rotation.x, Math.PI / 8, returnSpeed
        );
        
        if (!this.weaponSwing.isActive) {
          this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
            this.playerBody.rightArm.rotation.x, Math.PI / 8, returnSpeed
          );
        }
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
    
    // Update weapon hitbox position
    this.updateSwordHitBox();
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
  
  public getSwordSwing(): WeaponSwingAnimation {
    return this.weaponSwing;
  }
  
  public attack(): boolean {
    return this.startSwordSwing() !== undefined;
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
  
  private updateBowAnimation(deltaTime: number): void {
    if (!this.isBowEquipped || !this.equippedWeapon) return;
    
    const chargeLevel = this.equippedWeapon.getChargeLevel ? this.equippedWeapon.getChargeLevel() : 0;
    const lerpSpeed = deltaTime * 8;
    
    console.log(`🏹 [Player] Bow animation update - Active: ${this.bowDrawAnimation.isActive}, Charge: ${chargeLevel.toFixed(2)}`);
    
    if (this.bowDrawAnimation.isActive) {
      // Enhanced progressive draw animation with hand control
      const drawProgress = Math.min(chargeLevel * 1.2, 1.0);
      
      // Left arm: Stays steady holding the bow with slight adjustment
      const leftArmRotation = new THREE.Euler(
        this.bowDrawAnimation.leftArmRestRotation.x + (drawProgress * 0.1), // Slight lift
        this.bowDrawAnimation.leftArmRestRotation.y - (drawProgress * 0.1), // Minor angle adjustment
        this.bowDrawAnimation.leftArmRestRotation.z + (drawProgress * 0.05)
      );
      
      // Right arm: Major movement - pulls string back dramatically
      const rightArmRotation = new THREE.Euler(
        this.bowDrawAnimation.rightArmRestRotation.x + (drawProgress * 0.8),
        this.bowDrawAnimation.rightArmRestRotation.y + (drawProgress * 0.8),
        this.bowDrawAnimation.rightArmRestRotation.z - (drawProgress * 0.6)
      );
      
      // Hand rotations - left hand maintains grip, right hand adjusts for string pull
      const leftHandRotation = new THREE.Euler(
        this.bowDrawAnimation.leftHandRestRotation.x + (drawProgress * 0.05), // Slight grip adjustment
        this.bowDrawAnimation.leftHandRestRotation.y,
        this.bowDrawAnimation.leftHandRestRotation.z
      );
      
      const rightHandRotation = new THREE.Euler(
        drawProgress * 0.2, // Slight curl for string grip
        0,
        drawProgress * -0.3 // Rotate for pulling motion
      );
      
      // Smooth interpolation for arms
      this.playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.x, leftArmRotation.x, lerpSpeed
      );
      this.playerBody.leftArm.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.y, leftArmRotation.y, lerpSpeed
      );
      this.playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.z, leftArmRotation.z, lerpSpeed
      );
      
      this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.x, rightArmRotation.x, lerpSpeed
      );
      this.playerBody.rightArm.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.y, rightArmRotation.y, lerpSpeed
      );
      this.playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.z, rightArmRotation.z, lerpSpeed
      );
      
      // Smooth interpolation for hands - maintain realistic gripping
      this.playerBody.leftHand.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftHand.rotation.x, leftHandRotation.x, lerpSpeed
      );
      this.playerBody.leftHand.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.leftHand.rotation.y, leftHandRotation.y, lerpSpeed
      );
      this.playerBody.leftHand.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.leftHand.rotation.z, leftHandRotation.z, lerpSpeed
      );
      
      this.playerBody.rightHand.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightHand.rotation.x, rightHandRotation.x, lerpSpeed
      );
      this.playerBody.rightHand.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.rightHand.rotation.y, rightHandRotation.y, lerpSpeed
      );
      this.playerBody.rightHand.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.rightHand.rotation.z, rightHandRotation.z, lerpSpeed
      );
      
      // Enhanced shake at full draw
      if (drawProgress >= 1.0) {
        const shakeAmount = 0.03 * Math.sin(Date.now() * 0.015);
        this.playerBody.rightArm.rotation.x += shakeAmount;
        this.playerBody.rightArm.rotation.y += shakeAmount * 0.7;
        console.log("🏹 [Player] Full draw shake effect active");
      }
      
    } else {
      // Return to archery rest stance smoothly
      this.playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.x, this.bowDrawAnimation.leftArmRestRotation.x, lerpSpeed
      );
      this.playerBody.leftArm.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.y, this.bowDrawAnimation.leftArmRestRotation.y, lerpSpeed
      );
      this.playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.z, this.bowDrawAnimation.leftArmRestRotation.z, lerpSpeed
      );
      
      this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.x, this.bowDrawAnimation.rightArmRestRotation.x, lerpSpeed
      );
      this.playerBody.rightArm.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.y, this.bowDrawAnimation.rightArmRestRotation.y, lerpSpeed
      );
      this.playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.z, this.bowDrawAnimation.rightArmRestRotation.z, lerpSpeed
      );
      
      // Return hands to rest gripping position
      this.playerBody.leftHand.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftHand.rotation.x, this.bowDrawAnimation.leftHandRestRotation.x, lerpSpeed
      );
      this.playerBody.leftHand.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.leftHand.rotation.y, this.bowDrawAnimation.leftHandRestRotation.y, lerpSpeed
      );
      this.playerBody.leftHand.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.leftHand.rotation.z, this.bowDrawAnimation.leftHandRestRotation.z, lerpSpeed
      );
      
      this.playerBody.rightHand.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightHand.rotation.x, this.bowDrawAnimation.rightHandRestRotation.x, lerpSpeed
      );
      this.playerBody.rightHand.rotation.y = THREE.MathUtils.lerp(
        this.playerBody.rightHand.rotation.y, this.bowDrawAnimation.rightHandRestRotation.y, lerpSpeed
      );
      this.playerBody.rightHand.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.rightHand.rotation.z, this.bowDrawAnimation.rightHandRestRotation.z, lerpSpeed
      );
    }
    
    // Keep bow vertical and straight up and down throughout
    if (this.equippedWeapon) {
      const bowMesh = this.equippedWeapon.getMesh();
      bowMesh.rotation.x = THREE.MathUtils.lerp(bowMesh.rotation.x, 0, lerpSpeed);
      bowMesh.rotation.y = THREE.MathUtils.lerp(bowMesh.rotation.y, 0, lerpSpeed);
      bowMesh.rotation.z = THREE.MathUtils.lerp(bowMesh.rotation.z, 0, lerpSpeed);
    }
  }
  
  public startBowDraw(): void {
    if (!this.isBowEquipped || !this.equippedWeapon) {
      console.log("🏹 [Player] Cannot draw bow - no bow equipped");
      return;
    }
    
    console.log("🏹 [Player] Starting enhanced bow draw animation with debug info");
    this.bowDrawAnimation.isActive = true;
    
    // Start weapon draw
    if (this.equippedWeapon.startDrawing) {
      this.equippedWeapon.startDrawing();
      console.log("🏹 [Player] Weapon draw started on equipped weapon");
    } else {
      console.warn("🏹 [Player] Equipped weapon does not support startDrawing method");
    }
  }
  
  public stopBowDraw(): void {
    if (!this.isBowEquipped || !this.equippedWeapon) {
      return;
    }
    
    console.log("🏹 [Player] Stopping bow draw animation with debug info");
    this.bowDrawAnimation.isActive = false;
    
    // Stop weapon draw
    if (this.equippedWeapon.stopDrawing) {
      this.equippedWeapon.stopDrawing();
      console.log("🏹 [Player] Weapon draw stopped on equipped weapon");
    } else {
      console.warn("🏹 [Player] Equipped weapon does not support stopDrawing method");
    }
  }
}
