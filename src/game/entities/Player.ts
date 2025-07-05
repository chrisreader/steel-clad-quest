import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { PlayerBody, WeaponSwingAnimation, PlayerStats } from '../../types/GameTypes';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { BaseBow } from '../weapons';
import { WeaponManager } from '../weapons/WeaponManager';
import { WeaponAnimationSystem, WeaponType } from '../animation/WeaponAnimationSystem';
import { SwordSwingAnimation } from '../animation/animations/SwordSwingAnimation';
import { STANDARD_SWORD_ANIMATION } from '../animation/StandardSwordAnimation';

export class Player {
  // THREE.js objects
  private group: THREE.Group;
  private playerBody: PlayerBody;
  private scene: THREE.Scene;
  
  // Weapon system
  private equippedWeapon: BaseWeapon | null = null;
  private weaponManager: WeaponManager;
  private swordHitBox: THREE.Mesh;
  
  // Animation system
  private weaponAnimationSystem: WeaponAnimationSystem;
  private swordSwingAnimation: SwordSwingAnimation | null = null;
  
  // NEW: Bow drawing state for animation
  private bowDrawing: boolean = false;
  private bowDrawStartTime: number = 0;
  
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
  
  // Weapon trail tracking - ENHANCED for better trail capture
  private weaponTipPositions: THREE.Vector3[] = [];
  private maxTrailLength: number = 25; // Increased from 15 for more detailed trails
  private swooshEffectCreated: boolean = false;
  private lastTipTrackTime: number = 0;
  private tipTrackInterval: number = 16; // Track every 16ms for smooth trails
  
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
    this.weaponAnimationSystem = new WeaponAnimationSystem();
    
    // Create player group at TALLER position for realistic scale
    this.group = new THREE.Group();
    this.group.position.set(0, 1.0, 2); // INCREASED from 0.7 to 1.0 (43% height increase)
    this.group.userData.isPlayer = true;
    scene.add(this.group);
    
    console.log("🧍 [Player] CONSTRUCTOR - Creating TALLER player with realistic proportions and improved first-person view");
    console.log("🧍 [Player] Player group created at INCREASED height:", this.group.position);
    
    // Create player body with TALLER realistic proportions
    this.playerBody = this.createTallerRealisticPlayerBody();
    
    // CRITICAL DEBUG: Verify arm positions immediately after creation
    this.debugArmPositions("AFTER_CREATION");
    
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
    
    console.log("🧍 [Player] CONSTRUCTOR COMPLETE - TALLER player initialized with improved first-person view:", this.stats);
    
    // Final verification
    this.debugArmPositions("CONSTRUCTOR_COMPLETE");
  }
  
  // NEW DEBUG METHOD: Track arm positions and detect changes
  private debugArmPositions(context: string): void {
    // Silent mode - removed debug logging for massive FPS improvement
  }
  
  private createTallerRealisticPlayerBody(): PlayerBody {
    const playerBodyGroup = new THREE.Group();
    
    console.log("🏗️ [Player] CREATING TALLER REALISTIC PLAYER BODY WITH TORSO INVISIBLE TO PLAYER BUT CASTING SHADOWS");
    
    // Create enhanced metal texture for armor/clothing
    const metalTexture = TextureGenerator.createMetalTexture();
    const skinTexture = this.createSkinTexture();
    
    // HEAD - TALLER position at top, but INVISIBLE in first-person for better view
    const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.25);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFDBC4,
      map: skinTexture,
      transparent: true,
      opacity: 0.0 // Completely transparent to camera but still casts shadows
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.2, 0); // INCREASED from 0.85 to 1.2 (proportional to height increase)
    head.castShadow = true; // Keep shadow casting enabled
    head.receiveShadow = true;
    head.visible = true; // Keep visible for shadow system
    playerBodyGroup.add(head);
    
    console.log("👤 [Player] Head positioned at TALLER height, transparent to camera but casts shadows - position:", head.position);
    
    // TORSO - TALLER and WIDER for realistic proportions, INVISIBLE TO PLAYER but casts shadows
    const bodyGeometry = new THREE.BoxGeometry(0.5, 1.0, 0.25); // INCREASED height from 0.7 to 1.0
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A6FA5,
      shininess: 80,
      specular: 0x666666,
      map: metalTexture,
      normalScale: new THREE.Vector2(0.5, 0.5),
      transparent: true,
      opacity: 0.0 // Completely transparent to camera but still casts shadows
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.5, 0); // INCREASED from 0.35 to 0.5 (proportional positioning)
    body.castShadow = true; // Keep shadow casting enabled for realism
    body.receiveShadow = true;
    body.visible = true; // Keep visible for shadow system
    
    // Keep torso on default layer 0 but transparent
    body.layers.set(0);
    
    playerBodyGroup.add(body);
    
    console.log("🧍 [Player] Torso set to transparent but keeps shadows - position:", body.position);
    
    // CRITICAL: TALLER ARM POSITIONING - MOVED TO REALISTIC TALLER SHOULDER HEIGHT
    console.log("🦾 [Player] CREATING ARMS AT NEW TALLER REALISTIC POSITION (Y=0.8 INSTEAD OF Y=0.55)");
    
    // REALISTIC ARM SYSTEM - Left Arm (positioned at TALLER shoulder height)
    const leftArmSystem = this.createRealisticArm('left');
    leftArmSystem.position.set(-0.3, 0.8, 0); // INCREASED from 0.55 to 0.8 for TALLER shoulder height
    leftArmSystem.visible = true;
    playerBodyGroup.add(leftArmSystem);
    
    // REALISTIC ARM SYSTEM - Right Arm (positioned at TALLER shoulder height)
    const rightArmSystem = this.createRealisticArm('right');
    rightArmSystem.position.set(0.3, 0.8, 0); // INCREASED from 0.55 to 0.8 for TALLER shoulder height
    rightArmSystem.visible = true;
    playerBodyGroup.add(rightArmSystem);
    
    console.log("🦾 [Player] NEW TALLER ARM POSITIONS SET FOR IMPROVED PROPORTIONS:");
    console.log("   Left Arm: x=-0.3, y=0.8, z=0 (INCREASED FROM y=0.55)");
    console.log("   Right Arm: x=0.3, y=0.8, z=0 (INCREASED FROM y=0.55)");
    console.log("   This positions arms at TALLER realistic shoulder height!");
    
    // Verify positions immediately after setting
    console.log("🔍 [Player] IMMEDIATE VERIFICATION:");
    console.log("   Left Arm actual position:", leftArmSystem.position);
    console.log("   Right Arm actual position:", rightArmSystem.position);
    
    // LEGS - TALLER and positioned for realistic proportions (keep visible)
    const legGeometry = new THREE.BoxGeometry(0.15, 0.8, 0.15); // INCREASED height from 0.6 to 0.8
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A6FA5,
      shininess: 60,
      map: metalTexture
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.1, -0.4, 0); // ADJUSTED from -0.3 to -0.4 for TALLER legs
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLeg.visible = true;
    // Keep legs on default layer 0 (visible to player)
    playerBodyGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(0.1, -0.4, 0); // ADJUSTED from -0.3 to -0.4 for TALLER legs
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLeg.visible = true;
    // Keep legs on default layer 0 (visible to player)
    playerBodyGroup.add(rightLeg);
    
    console.log("🦵 [Player] TALLER legs positioned and kept visible - Left:", leftLeg.position, "Right:", rightLeg.position);
    
    // FEET - Positioned at ground level relative to TALLER body (keep visible)
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const footMaterial = new THREE.MeshPhongMaterial({
      color: 0x2D3B5C,
      shininess: 40,
      map: metalTexture
    });
    
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(-0.1, -0.9, 0.1); // ADJUSTED from -0.7 to -0.9 for TALLER body
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    leftFoot.visible = true;
    // Keep feet on default layer 0 (visible to player)
    playerBodyGroup.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial.clone());
    rightFoot.position.set(0.1, -0.9, 0.1); // ADJUSTED from -0.7 to -0.9 for TALLER body
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    rightFoot.visible = true;
    // Keep feet on default layer 0 (visible to player)
    playerBodyGroup.add(rightFoot);
    
    console.log("👟 [Player] Feet positioned for TALLER body and kept visible - Left:", leftFoot.position, "Right:", rightFoot.position);
    
    this.group.add(playerBodyGroup);
    
    // Get references to the arm components for the return object
    const leftArmComponents = this.getArmComponents(leftArmSystem);
    const rightArmComponents = this.getArmComponents(rightArmSystem);
    
    console.log("🧍 [Player] Complete TALLER naturally proportioned body created with IMPROVED FIRST-PERSON VIEW");
    console.log("🔧 [Player] TALLER body creation complete - head invisible, camera will be at TALLER neck level, arms at TALLER realistic height");
    
    return {
      group: playerBodyGroup,
      leftArm: leftArmSystem,
      rightArm: rightArmSystem,
      leftHand: leftArmComponents.hand,
      rightHand: rightArmComponents.hand,
      leftLeg,
      rightLeg,
      body,
      head, // Invisible head for first-person view
      leftUpperArm: leftArmComponents.upperArm,
      rightUpperArm: rightArmComponents.upperArm,
      leftForearm: leftArmComponents.forearm,
      rightForearm: rightArmComponents.forearm,
      leftElbow: leftArmComponents.elbow,
      rightElbow: rightArmComponents.elbow,
      leftWrist: leftArmComponents.wrist,
      rightWrist: rightArmComponents.wrist,
      leftFoot,
      rightFoot
    };
  }
  
  private createRealisticArm(side: 'left' | 'right'): THREE.Group {
    const armSystem = new THREE.Group();
    armSystem.name = `${side}ArmSystem`;
    
    // Materials
    const metalTexture = TextureGenerator.createMetalTexture();
    
    const armMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5A7BC8,
      shininess: 60,
      specular: 0x555555,
      map: metalTexture
    });
    
    // Shoulder (connection point - invisible)
    const shoulderGroup = new THREE.Group();
    shoulderGroup.name = `${side}Shoulder`;
    armSystem.add(shoulderGroup);
    
    // Upper Arm (60% of total arm length)
    const upperArmLength = 0.5;
    const upperArmGeometry = new THREE.CylinderGeometry(0.09, 0.11, upperArmLength, 12);
    const upperArm = new THREE.Mesh(upperArmGeometry, armMaterial.clone());
    upperArm.position.y = -upperArmLength / 2;
    upperArm.castShadow = true;
    upperArm.receiveShadow = true;
    upperArm.name = `${side}UpperArm`;
    shoulderGroup.add(upperArm);
    
    // Elbow Joint
    const elbowGroup = new THREE.Group();
    elbowGroup.position.y = -upperArmLength;
    elbowGroup.name = `${side}Elbow`;
    shoulderGroup.add(elbowGroup);
    
    // Forearm (40% of total arm length)
    const forearmLength = 0.4;
    const forearmGeometry = new THREE.CylinderGeometry(0.07, 0.09, forearmLength, 12);
    const forearm = new THREE.Mesh(forearmGeometry, armMaterial.clone());
    forearm.position.y = -forearmLength / 2;
    forearm.castShadow = true;
    forearm.receiveShadow = true;
    forearm.name = `${side}Forearm`;
    elbowGroup.add(forearm);
    
    // Wrist Joint
    const wristGroup = new THREE.Group();
    wristGroup.position.y = -forearmLength;
    wristGroup.name = `${side}Wrist`;
    elbowGroup.add(wristGroup);
    
    // Simplified Hand - Single oval/ellipsoid shape
    const handGroup = new THREE.Group();
    handGroup.name = `${side}Hand`;
    
    // Create a simple ellipsoid hand that matches arm color
    const handGeometry = new THREE.SphereGeometry(0.06, 12, 8);
    handGeometry.scale(1.2, 0.8, 1.4);
    
    const hand = new THREE.Mesh(handGeometry, armMaterial.clone());
    hand.castShadow = true;
    hand.receiveShadow = true;
    hand.position.set(0, -0.02, 0);
    handGroup.add(hand);
    
    wristGroup.add(handGroup);
    
    // Store references for easy access
    armSystem.userData = {
      shoulder: shoulderGroup,
      upperArm: upperArm,
      elbow: elbowGroup,
      forearm: forearm,
      wrist: wristGroup,
      hand: handGroup
    };
    
    console.log(`🦾 [Player] Created realistic ${side} arm with shadow casting enabled and kept visible to player`);
    
    return armSystem;
  }
  
  private getArmComponents(armSystem: THREE.Group) {
    return {
      shoulder: armSystem.userData.shoulder,
      upperArm: armSystem.userData.upperArm,
      elbow: armSystem.userData.elbow,
      forearm: armSystem.userData.forearm,
      wrist: armSystem.userData.wrist,
      hand: armSystem.userData.hand
    };
  }
  
  private createSkinTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    
    // Create skin-like texture
    context.fillStyle = '#f4c2a1';
    context.fillRect(0, 0, 64, 64);
    
    // Add some subtle variations
    for (let i = 0; i < 20; i++) {
      context.fillStyle = `rgba(240, 180, 140, ${Math.random() * 0.3})`;
      context.fillRect(Math.random() * 64, Math.random() * 64, 4, 4);
    }
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  
  private initializeBowAnimationPositions(): void {
    // FIXED: Reduced left hand Z-rotation from 45° to 15° to minimize diagonal tilt
    this.bowDrawAnimation.leftHandRestRotation.set(-Math.PI / 4, 0, Math.PI / 12); // Changed from Math.PI / 3 to Math.PI / 12
    this.bowDrawAnimation.rightHandRestRotation.set(0, 0, 0);
    
    // FIXED: Hand rotations during draw - left hand maintains realistic grip with reduced Z-rotation
    this.bowDrawAnimation.leftHandDrawRotation.set(-Math.PI / 4, 0, Math.PI / 12); // Changed from Math.PI / 3 to Math.PI / 12
    this.bowDrawAnimation.rightHandDrawRotation.set(0, 0, 0);
    
    // Updated realistic arm positions for enhanced archery stance at TALLER height
    this.bowDrawAnimation.leftHandRestPosition.set(-0.4, 1.7, -0.4); // INCREASED Y from 1.4 to 1.7
    this.bowDrawAnimation.rightHandRestPosition.set(0.3, 1.8, -0.3); // INCREASED Y from 1.5 to 1.8
    
    // CRITICAL FIX: UPDATED to 80° chest-level position with NO Y ROTATION - matches WeaponAnimationSystem
    const bowNaturalReady = Math.PI * 80 / 180; // 80° upward angle (chest level)
    
    // FIXED: Left arm: Natural ready stance at 80° chest level - NO Y ROTATION, parallel with body
    this.bowDrawAnimation.leftArmRestRotation.set(
      bowNaturalReady, // 80° upward angle (chest level)
      0,               // FIXED: NO Y rotation - parallel with body
      0                // FIXED: NO Z rotation - parallel with body
    );
    
    // FIXED: Right arm: Ready to draw position - NO Y ROTATION
    this.bowDrawAnimation.rightArmRestRotation.set(
      Math.PI / 6,     // Moderate upward angle
      0,               // FIXED: NO Y rotation - parallel with body
      -Math.PI / 8     // Forward angle for better POV visibility
    );
    
    // Drawing positions - left arm stays steady, right arm pulls back at TALLER height
    this.bowDrawAnimation.leftHandDrawPosition.set(-0.4, 1.7, -0.4); // INCREASED Y from 1.4 to 1.7
    this.bowDrawAnimation.rightHandDrawPosition.set(0.8, 1.8, -0.2); // INCREASED Y from 1.5 to 1.8
    
    // FIXED: Drawing arm rotations with 80° base position - NO Y ROTATION
    this.bowDrawAnimation.leftArmDrawRotation.set(
      bowNaturalReady, // Use 80° chest-level position as base
      0,               // FIXED: NO Y rotation - parallel with body
      0                // FIXED: NO Z rotation - parallel with body
    );
    
    this.bowDrawAnimation.rightArmDrawRotation.set(
      Math.PI / 6 + 0.7, // Keep the +0.7 offset for drawing motion
      0,                 // FIXED: NO Y rotation - parallel with body
      -0.5
    );
    
    // Bow rotations - keep vertical throughout
    this.bowDrawAnimation.bowRestRotation.set(0, 0, 0);
    this.bowDrawAnimation.bowDrawRotation.set(0, 0, 0);
    
    console.log("🏹 [Player] UPDATED bow animation to 80° chest-level natural ready stance - matches WeaponAnimationSystem");
  }
  
  // FIXED: Set weapon-specific ready stance - only weapon arm raised with NO Y ROTATION and PARALLEL positioning
  private setWeaponArmStance(weaponType: 'melee' | 'bow'): void {
    // Debug arm positions before setting weapon stance
    this.debugArmPositions("BEFORE_WEAPON_READY_STANCE");
    
    // Keep arms at normal shoulder positions for proper shadow connection
    this.playerBody.leftArm.position.set(-0.3, 0.8, 0);
    this.playerBody.rightArm.position.set(0.3, 0.8, 0);
    
    if (weaponType === 'melee') {
      // MELEE READY STANCE: Right arm raised to horizontal combat position, left arm at side
      
      // Left arm: Normal side position (like empty hands)
      this.playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0);
      
      // Right arm: Horizontal combat ready position - FORWARD-FACING for realistic sword stance
      this.playerBody.rightArm.rotation.set(
        Math.PI / 3,  // 60° upward angle for chest-level positioning
        0,            // NO Y rotation - keep parallel with body
        0             // NO Z rotation - keep perfectly parallel with body
      );
      
      // NEW: Set wrist for forward-pointing sword
      if (this.playerBody.rightWrist) {
        this.playerBody.rightWrist.rotation.set(-Math.PI / 4, 0, 0); // Angle wrist down to point sword forward
      }
      
      console.log("🗡️ [Player] FIXED MELEE ready stance - Right arm at chest level with forward-pointing wrist");
      
    } else if (weaponType === 'bow') {
      // BOW READY STANCE: Left arm raised up PARALLEL with body, right arm at side
      
      // Left arm: Raised bow-holding position - UPWARD and PARALLEL with body
      this.playerBody.leftArm.rotation.set(
        Math.PI / 3,  // 60° upward angle
        0,            // NO Y rotation - keep parallel with body
        0             // NO Z rotation - keep perfectly parallel with body
      );
      
      // Right arm: Normal side position initially (will be adjusted by bow animation)
      this.playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0);
      
      console.log("🏹 [Player] FIXED BOW ready stance - Left arm raised upward and PARALLEL with body");
    }
    
    // Reset elbow positions for natural arm bend
    if (this.playerBody.leftElbow) {
      this.playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(-0.05, 0, 0); // Slight downward bend for melee weapons
    }
    
    // Reset hand rotations (wrist will be set above for melee weapons)
    this.playerBody.leftHand.rotation.set(0, 0, 0);
    this.playerBody.rightHand.rotation.set(0, 0, 0);
    
    // Debug arm positions after setting weapon stance
    this.debugArmPositions("AFTER_WEAPON_READY_STANCE");
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
    
    // Update weapon animation system
    let weaponType: WeaponType;
    if (this.isBowEquipped) {
      weaponType = 'bow';
      // Attach bow to left HAND for proper control with TALLER realistic arm system
      this.playerBody.leftHand.add(weapon.getMesh());
      
      // UPDATED: Clean bow rotation - X: 0° no forward tip, Y: 0° no twist, Z: 0° no tilt
      weapon.getMesh().position.set(0, -0.05, 0); // Position relative to left hand
      weapon.getMesh().rotation.set(0, 0, 0); // UPDATED: 0° X, 0° Y, 0° Z
      weapon.getMesh().scale.set(1.0, 1.0, 1.0);
      
      // Set bow ready stance - left arm raised outward
      this.setWeaponArmStance('bow');
      
      console.log(`🏹 [Player] Bow equipped with UPDATED rotation 0° X, 0° Y, 0° Z - completely flat positioning`);
    } else {
      weaponType = 'melee';
      // Attach melee weapon to right hand with TALLER realistic positioning
      this.playerBody.rightHand.add(weapon.getMesh());
      
      // Better weapon positioning for enhanced hand
      weapon.getMesh().position.set(0, 0, 0.1);
      weapon.getMesh().rotation.set(0, 0, 0);
      
      // Set melee ready stance - right arm raised outward
      this.setWeaponArmStance('melee');
      
      console.log(`🗡️ [Player] Melee weapon equipped with raised right arm ready stance`);
      
      // CRITICAL: Initialize SwordSwingAnimation for melee weapons
      this.swordSwingAnimation = new SwordSwingAnimation(
        this.weaponSwing, 
        this.playerBody, 
        this.equippedWeapon
      );
      console.log("🗡️ [Player] SwordSwingAnimation created for spatial arm movement");
    }
    
    // Update animation system weapon type
    this.weaponAnimationSystem.setWeaponType(weaponType);
    
    // FIXED: Use standardized sword animation for all swords
    const weaponConfig = weapon.getConfig();
    if (weaponConfig.type === 'sword') {
      // Use standardized sword animation configuration
      this.weaponSwing.duration = STANDARD_SWORD_ANIMATION.duration;
      this.weaponSwing.phases = STANDARD_SWORD_ANIMATION.phases;
      this.weaponSwing.rotations = STANDARD_SWORD_ANIMATION.rotations;
      console.log("🗡️ [Player] Using standardized sword animation configuration");
    } else if (weaponConfig.swingAnimation) {
      // Use weapon-specific animation for non-sword weapons
      this.weaponSwing.duration = weaponConfig.swingAnimation.duration;
      this.weaponSwing.phases = weaponConfig.swingAnimation.phases;
      this.weaponSwing.rotations = weaponConfig.swingAnimation.rotations;
      console.log("🗡️ [Player] Using weapon-specific animation configuration");
    }
    
    // Update hitbox reference
    this.swordHitBox = weapon.getHitBox();
    
    console.log(`🗡️ [Player] Successfully equipped ${weaponConfig.name} with weapon-specific ready stance and animation type: ${weaponType}`);
    return true;
  }
  
  private setRealisticArcheryStance(): void {
    // Debug arm positions before setting archery stance
    this.debugArmPositions("BEFORE_ARCHERY_STANCE");
    
    // Keep arms at normal shoulder positions for proper shadow connection
    this.playerBody.leftArm.position.set(-0.3, 0.8, 0);
    this.playerBody.rightArm.position.set(0.3, 0.8, 0);
    
    // CRITICAL FIX: Set shoulder rotations for archery stance with 80° chest-level position
    
    // FIXED: Left shoulder: 80° chest-level bow holding position - NO Y ROTATION, parallel with body
    this.bowDrawAnimation.leftArmRestRotation.set(
      Math.PI * 80 / 180, // 80° upward angle (chest level)
      0,                  // FIXED: NO Y rotation - parallel with body
      0                   // FIXED: NO Z rotation - parallel with body
    );
    
    // FIXED: Right shoulder: Ready to draw position - NO Y ROTATION
    this.bowDrawAnimation.rightArmRestRotation.set(
      Math.PI / 6,        // Moderate upward angle
      0,                  // FIXED: NO Y rotation - parallel with body
      -Math.PI / 8        // Forward angle for better POV visibility
    );
    
    // Apply rotations to shoulder joints (the main arm groups)
    this.playerBody.leftArm.rotation.copy(this.bowDrawAnimation.leftArmRestRotation);
    this.playerBody.rightArm.rotation.copy(this.bowDrawAnimation.rightArmRestRotation);
    
    // Set elbow positions for natural arm bend
    if (this.playerBody.leftElbow) {
      this.playerBody.leftElbow.rotation.set(0.2, 0, 0);
    }
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.3, 0, 0);
    }
    
    // Set realistic hand rotations for bow gripping
    this.playerBody.leftHand.rotation.copy(this.bowDrawAnimation.leftHandRestRotation);
    this.playerBody.rightHand.rotation.copy(this.bowDrawAnimation.rightHandRestRotation);
    
    // Initialize targets
    this.bowDrawAnimation.leftHandTarget.copy(this.bowDrawAnimation.leftHandRestPosition);
    this.bowDrawAnimation.rightHandTarget.copy(this.bowDrawAnimation.rightHandRestPosition);
    this.bowDrawAnimation.bowRotationTarget.copy(this.bowDrawAnimation.bowRestRotation);
    
    console.log("🏹 [Player] UPDATED archery stance to 80° chest-level position - matches WeaponAnimationSystem");
    
    // Debug arm positions after setting archery stance
    this.debugArmPositions("AFTER_ARCHERY_STANCE");
  }
  
  private resetToRealisticNormalStance(): void {
    // Debug arm positions before reset
    this.debugArmPositions("BEFORE_NORMAL_STANCE_RESET");
    
    // Reset arms to normal positions with TALLER realistic joint control
    this.playerBody.leftArm.position.set(-0.3, 0.8, 0); // Keep new TALLER shoulder height
    this.playerBody.rightArm.position.set(0.3, 0.8, 0); // Keep new TALLER shoulder height
    
    // FIXED: Reset shoulder rotations to SIDE-POSITIONED empty hands stance with NO Y ROTATION
    this.playerBody.leftArm.rotation.set(Math.PI / 8, 0, 0); // Back to side position (22.5°)
    this.playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0); // Back to side position (22.5°)
    
    // Reset elbow positions
    if (this.playerBody.leftElbow) {
      this.playerBody.leftElbow.rotation.set(0, 0, 0);
    }
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0, 0, 0);
    }
    
    // Reset hand rotations
    this.playerBody.leftHand.rotation.set(0, 0, 0);
    this.playerBody.rightHand.rotation.set(0, 0, 0);
    
    console.log("🗡️ [Player] FIXED reset to SIDE-POSITIONED empty hands stance with NO Y ROTATION");
    
    // Debug arm positions after reset
    this.debugArmPositions("AFTER_NORMAL_STANCE_RESET");
  }
  
  public unequipWeapon(): boolean {
    if (!this.equippedWeapon) {
      return false;
    }
    
    console.log(`🗡️ [Player] Unequipping weapon: ${this.equippedWeapon.getConfig().name}`);
    
    // Remove weapon from appropriate hand
    if (this.isBowEquipped) {
      this.playerBody.leftHand.remove(this.equippedWeapon.getMesh());
      this.resetToRealisticNormalStance(); // Reset stance when unequipping bow
    } else {
      this.playerBody.rightHand.remove(this.equippedWeapon.getMesh());
      // Clear sword swing animation
      this.swordSwingAnimation = null;
      console.log("🗡️ [Player] SwordSwingAnimation cleared");
    }
    
    // Reset bow state
    this.isBowEquipped = false;
    this.bowDrawAnimation.isActive = false;
    
    // Update animation system to empty hands
    this.weaponAnimationSystem.setWeaponType('emptyHands');
    
    // Reset to default hitbox
    const fallbackHitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const fallbackHitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.swordHitBox = new THREE.Mesh(fallbackHitBoxGeometry, fallbackHitBoxMaterial);
    this.scene.add(this.swordHitBox);
    
    this.equippedWeapon = null;
    
    console.log(`🗡️ [Player] Weapon unequipped from TALLER realistic arm system, animation type set to emptyHands`);
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
    
    console.log("🗡️ [Player] Starting SPATIAL MOVEMENT sword swing animation");
    this.weaponSwing.isActive = true;
    this.weaponSwing.startTime = this.weaponSwing.clock.getElapsedTime();
    this.lastAttackTime = now;
    
    // Clear hit enemies set for new swing
    this.hitEnemiesThisSwing.clear();
    
    // Reset weapon trail tracking with enhanced capture
    this.weaponTipPositions = [];
    this.swooshEffectCreated = false;
    this.lastTipTrackTime = 0;
    
    // Play weapon swing sound
    this.audioManager.play('sword_swing');
    
    // Initialize trail points
    this.weaponSwing.trailPoints = [];
    for (let i = 0; i < 15; i++) {
      this.weaponSwing.trailPoints.push(new THREE.Vector3());
    }
    
    console.log("🗡️ [Player] SPATIAL MOVEMENT sword swing animation started with enhanced trail tracking");
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
  
  private updateSwordSwingAnimation(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon || this.isBowEquipped) return;
    
    console.log("🗡️ [Player] *** UPDATING SWORD SWING WITH SPATIAL MOVEMENT ***");
    
    // Use SwordSwingAnimation for spatial movement if available
    if (this.swordSwingAnimation) {
      console.log("🗡️ [Player] Using SwordSwingAnimation for spatial arm movement");
      this.swordSwingAnimation.update();
    } else {
      console.warn("🗡️ [Player] SwordSwingAnimation not available, weapon swing may not work properly");
    }
    
    // Continue with existing weapon tip tracking and effects
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases } = this.weaponSwing;
    
    // FIXED: Track weapon tip continuously during the ENTIRE SLASH phase (0% to 100%)
    const now = Date.now();
    const slashStartTime = phases.windup;
    const slashEndTime = phases.windup + phases.slash;
    const isInSlashPhase = elapsed >= slashStartTime && elapsed <= slashEndTime;
    
    if (isInSlashPhase && now - this.lastTipTrackTime >= this.tipTrackInterval) {
      this.trackWeaponTipHighFrequency();
      this.lastTipTrackTime = now;
      
      const slashProgress = (elapsed - slashStartTime) / phases.slash;
      console.log("🗡️ [Player] Tracking weapon tip during SLASH phase - elapsed:", elapsed.toFixed(3), "progress:", (slashProgress * 100).toFixed(1) + "%");
      
      // FIXED: Create continuous trail effect throughout the ENTIRE slash phase
      // Start creating trail immediately when slash begins and continue until it ends
      if (slashProgress >= 0 && slashProgress <= 1.0 && this.weaponTipPositions.length >= 3) {
        // Calculate swing direction from recent positions for dynamic trail
        const recentPositions = this.weaponTipPositions.slice(-5); // Use last 5 positions
        if (recentPositions.length >= 2) {
          const pathStart = recentPositions[0];
          const pathEnd = recentPositions[recentPositions.length - 1];
          const swingDirection = pathEnd.clone().sub(pathStart).normalize();
          
          console.log("🌪️ [Player] Creating CONTINUOUS trail effect at progress:", (slashProgress * 100).toFixed(1) + "% with", this.weaponTipPositions.length, "positions");
          
          // Create progressive trail that follows the blade continuously
          this.createProgressiveTrailEffect(slashProgress);
        }
      }
    }
    
    // Reset trail tracking when entering slash phase
    if (elapsed >= slashStartTime && elapsed <= slashStartTime + 0.05 && this.weaponTipPositions.length === 0) {
      console.log("🗡️ [Player] Starting fresh trail tracking for CONTINUOUS SLASH phase");
      this.weaponTipPositions = [];
    }
    
    // Complete animation if duration exceeded
    if (elapsed >= this.weaponSwing.duration) {
      console.log("🗡️ [Player] Spatial sword swing animation completed");
    }
  }
  
  // NEW METHOD: Create progressive trail effect that builds continuously
  private createProgressiveTrailEffect(slashProgress: number): void {
    if (!this.equippedWeapon || this.weaponTipPositions.length < 3) {
      return;
    }
    
    // Calculate how many positions to include based on slash progress
    const totalPositions = this.weaponTipPositions.length;
    const progressiveLength = Math.max(3, Math.floor(totalPositions * (slashProgress + 0.2))); // +0.2 for smoother building
    
    // Get the progressive slice of positions (building trail as sword moves)
    const progressivePositions = this.weaponTipPositions.slice(0, progressiveLength);
    
    if (progressivePositions.length >= 3) {
      // Calculate swing direction from the progressive positions
      const pathStart = progressivePositions[0];
      const pathEnd = progressivePositions[progressivePositions.length - 1];
      const swingDirection = pathEnd.clone().sub(pathStart).normalize();
      
      console.log("🌪️ [Player] Building PROGRESSIVE trail - using", progressiveLength, "of", totalPositions, "positions at", (slashProgress * 100).toFixed(1) + "% progress");
      
      // Create the progressive swoosh effect
      this.effectsManager.createSwordSwooshEffect(progressivePositions.slice(), swingDirection);
    }
  }
  
  private trackWeaponTipHighFrequency(): void {
    if (!this.equippedWeapon) return;
    
    try {
      // Get weapon tip position using blade reference
      const bladeReference = this.equippedWeapon.getBladeReference();
      const bladeLocalTip = new THREE.Vector3(0, 0, -0.9);
      
      // Transform to world coordinates
      const worldTipPosition = bladeLocalTip.clone();
      bladeReference.localToWorld(worldTipPosition);
      
      // Add to trail positions with high frequency tracking
      this.weaponTipPositions.push(worldTipPosition.clone());
      
      // Limit trail length but keep more points for smoother trails
      if (this.weaponTipPositions.length > this.maxTrailLength) {
        this.weaponTipPositions.shift();
      }
      
      console.log("🗡️ [Player] High-frequency weapon tip tracking - total positions:", this.weaponTipPositions.length);
    } catch (error) {
      console.warn("Could not track weapon tip:", error);
    }
  }
  
  // LEGACY METHOD: Keep for backward compatibility but use high-frequency version
  private trackWeaponTip(): void {
    this.trackWeaponTipHighFrequency();
  }
  
  private createRealisticSwordSwoosh(): void {
    if (!this.equippedWeapon || this.weaponTipPositions.length < 5) {
      console.log("🌪️ [Player] Cannot create sword swoosh - insufficient weapon data");
      return;
    }
    
    // Calculate swing direction from the sword path (top-right to bottom-left)
    const pathStart = this.weaponTipPositions[0];
    const pathEnd = this.weaponTipPositions[this.weaponTipPositions.length - 1];
    const swingDirection = pathEnd.clone().sub(pathStart).normalize();
    
    console.log("🌪️ [Player] Creating TRAIL-BASED sword swoosh effect with", this.weaponTipPositions.length, "tracked positions");
    console.log("🌪️ [Player] Swing direction from top-right to bottom-left:", swingDirection);
    console.log("🌪️ [Player] Path start (top-right):", pathStart);
    console.log("🌪️ [Player] Path end (bottom-left):", pathEnd);
    
    // Create the TRAIL-BASED swoosh effect following the sword trail
    this.effectsManager.createSwordSwooshEffect(this.weaponTipPositions.slice(), swingDirection);
  }
  
  private createEnhancedSwooshEffect(): void {
    // Empty method - swoosh now handled by createRealisticSwordSwoosh
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
    
    // DEBUG: Periodically check arm positions to detect overrides
    if (Math.random() < 0.01) { // 1% chance per frame to log positions
      this.debugArmPositions("UPDATE_LOOP");
    }
    
    // Update weapon swing animation (for melee weapons) with SPATIAL MOVEMENT
    if (!this.isBowEquipped) {
      this.updateSwordSwingAnimation();
    }
    
    // Update bow animation (for bow weapons) with TALLER realistic arm system
    if (this.isBowEquipped) {
      this.updateRealisticBowAnimation(deltaTime);
    }
    
    // Update walk cycle
    if (isActuallyMoving) {
      const walkCycleMultiplier = this.isSprinting ? 2 : 1;
      const walkCycleSpeed = this.weaponAnimationSystem.getWalkCycleSpeed();
      this.walkCycle += deltaTime * walkCycleSpeed * walkCycleMultiplier;
    }
    
    // Use weapon animation system for walking animations with bow drawing state
    this.weaponAnimationSystem.updateWalkAnimation(
      this.playerBody,
      this.walkCycle,
      deltaTime,
      isActuallyMoving,
      this.isSprinting,
      this.weaponSwing.isActive,
      this.bowDrawing,        // Pass bow drawing state
      this.getBowChargeLevel() // Pass charge level for animation
    );
    
    // Play footstep sound
    if (isActuallyMoving && Math.sin(this.walkCycle) > 0.9 && !this.audioManager.isPlaying('footstep')) {
      this.audioManager.play('footstep');
    }
    
    this.isWalking = isActuallyMoving;
    
    // Update sprint stamina
    if (this.isSprinting) {
      const sprintElapsed = Date.now() - this.sprintStartTime;
      
      // Stop sprinting if stamina reaches 0 or 5 seconds have elapsed
      if (this.sprintStamina <= 0 || sprintElapsed >= 5000) {
        this.isSprinting = false;
      } else {
        // Drain stamina if actually moving while sprinting
        if (isActuallyMoving) {
          this.sprintStamina = Math.max(0, this.sprintStamina - (20 * deltaTime));
          this.stats.stamina = this.sprintStamina;
        }
      }
    } else {
      // Regenerate stamina when not sprinting
      if (this.sprintStamina < this.stats.maxStamina) {
        this.sprintStamina = Math.min(this.stats.maxStamina, this.sprintStamina + (10 * deltaTime));
        this.stats.stamina = this.sprintStamina;
      }
    }
    
    // Update weapon hitbox position
    this.updateSwordHitBox();
  }
  
  public startSprint(): void {
    if (this.sprintStamina >= 50) {
      this.isSprinting = true;
      this.sprintStartTime = Date.now();
    }
  }
  
  public stopSprint(): void {
    this.isSprinting = false;
  }
  
  public takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.audioManager.play('player_hurt');
    this.effectsManager.createDamageEffect(this.group.position.clone());
  }
  
  public addGold(amount: number): void {
    this.stats.gold += amount;
    this.audioManager.play('gold_pickup');
  }
  
  public addExperience(amount: number): void {
    this.stats.experience += amount;
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
    this.stats.experienceToNext = Math.floor(this.stats.experienceToNext * 1.5);
  }
  
  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
  
  public setPosition(position: THREE.Vector3): void {
    this.group.position.copy(position);
    console.log("TALLER Player position set to:", this.group.position);
  }
  
  public getRotation(): number {
    return this.group.rotation.y;
  }
  
  public setRotation(rotation: number): void {
    console.log("TALLER Player movement rotation set to:", rotation);
  }
  
  public setVisualRotation(yaw: number, pitch: number): void {
    // Apply yaw rotation to the entire player body group for first-person feel
    this.group.rotation.y = yaw;
    
    // Apply subtle pitch rotation to arms for looking up/down - BUT NOT when weapon is equipped
    if (this.playerBody.leftArm && this.playerBody.rightArm && !this.equippedWeapon) {
      const pitchInfluence = pitch * 0.3;
      
      // Adjust shoulder rotations based on pitch for empty hands only
      this.playerBody.leftArm.rotation.x = Math.PI / 8 + pitchInfluence;
      this.playerBody.rightArm.rotation.x = Math.PI / 8 + pitchInfluence;
    }
    
    console.log("TALLER Player visual rotation updated - Yaw:", yaw, "Pitch:", pitch, "Weapon equipped:", !!this.equippedWeapon);
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
    
    console.log("🚶 [Player] TALLER Move called with weapon animation system:", {
      direction: direction,
      speed: speed,
      deltaTime: deltaTime,
      currentPos: previousPosition,
      isSprinting: this.isSprinting,
      weaponType: this.weaponAnimationSystem.getCurrentWeaponType()
    });
    
    // Apply movement
    this.group.position.x += direction.x * speed;
    this.group.position.z += direction.z * speed;
    
    const actualMovement = this.group.position.clone().sub(previousPosition);
    
    console.log("🚶 [Player] TALLER Move executed with weapon animation system:", {
      previousPos: previousPosition,
      newPos: this.group.position.clone(),
      actualMovement: actualMovement,
      movementMagnitude: actualMovement.length(),
      wasSuccessful: actualMovement.length() > 0.001,
      weaponType: this.weaponAnimationSystem.getCurrentWeaponType()
    });
  }
  
  public getMesh(): THREE.Group {
    return this.group;
  }
  
  public isAlive(): boolean {
    return this.stats.health > 0;
  }
  
  public gainExperience(amount: number): boolean {
    this.addExperience(amount);
    return false;
  }
  
  public dispose(): void {
    // Clean up resources
  }
  
  private updateRealisticBowAnimation(deltaTime: number): void {
    if (!this.isBowEquipped || !this.equippedWeapon) return;
    
    // SIMPLIFIED: No charge mechanics, just maintain bow holding stance
    console.log(`🏹 [Player] Simplified bow animation - just maintaining stance`);
    
    // Keep bow in ready position without any charging or drawing mechanics
    if (this.bowDrawAnimation.isActive) {
      // Simple bow holding stance
      this.playerBody.leftArm.rotation.set(Math.PI / 3, 0, 0);   // Left arm raised
      this.playerBody.rightArm.rotation.set(Math.PI / 6, 0, -Math.PI / 8); // Right arm ready
    } else {
      // Return to archery rest stance
      this.playerBody.leftArm.rotation.set(Math.PI / 3, 0, 0);
      this.playerBody.rightArm.rotation.set(Math.PI / 8, 0, 0);
    }
  }
  
  public startBowDraw(): void {
    if (!this.isBowEquipped || !this.equippedWeapon) {
      console.log("🏹 [Player] Cannot draw bow - no bow equipped");
      return;
    }
    
    if (this.equippedWeapon.getConfig().type !== 'bow') {
      console.log("🏹 [Player] Cannot draw bow - equipped weapon is not a bow");
      return;
    }
    
    console.log("🏹 [Player] Starting bow draw animation");
    this.bowDrawing = true;
    this.bowDrawStartTime = Date.now();
    this.bowDrawAnimation.isActive = true;
  }
  
  public stopBowDraw(): void {
    if (!this.isBowEquipped || !this.equippedWeapon) {
      return;
    }
    
    if (this.equippedWeapon.getConfig().type !== 'bow') {
      return;
    }
    
    console.log("🏹 [Player] Stopping bow draw animation");
    this.bowDrawing = false;
    this.bowDrawStartTime = 0;
    this.bowDrawAnimation.isActive = false;
  }
  
  public isBowDrawing(): boolean {
    return this.bowDrawing;
  }
  
  public getBowChargeLevel(): number {
    if (!this.bowDrawing || this.bowDrawStartTime === 0) {
      return 0;
    }
    
    // Calculate charge level based on draw time (0.0 to 1.0)
    const drawTime = Date.now() - this.bowDrawStartTime;
    const maxDrawTime = 1000; // 1 second for full draw animation
    return Math.min(1.0, drawTime / maxDrawTime);
  }
}
