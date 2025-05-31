import * as THREE from 'three';
import { TextureGenerator } from '../utils/TextureGenerator';
import { PlayerBody, WeaponSwingAnimation, PlayerStats } from '../../types/GameTypes';
import { AudioManager, SoundCategory } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { WeaponManager } from '../weapons/WeaponManager';
import { WeaponAnimationSystem, WeaponType } from '../animation/WeaponAnimationSystem';

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
    if (this.playerBody && this.playerBody.leftArm && this.playerBody.rightArm) {
      const leftPos = this.playerBody.leftArm.position.clone();
      const rightPos = this.playerBody.rightArm.position.clone();
      const leftRot = this.playerBody.leftArm.rotation.clone();
      const rightRot = this.playerBody.rightArm.rotation.clone();
      
      console.log(`🔍 [Player] ARM DEBUG [${context}]:`);
      console.log(`   Left Arm Position: x=${leftPos.x.toFixed(3)}, y=${leftPos.y.toFixed(3)}, z=${leftPos.z.toFixed(3)}`);
      console.log(`   Right Arm Position: x=${rightPos.x.toFixed(3)}, y=${rightPos.y.toFixed(3)}, z=${rightPos.z.toFixed(3)}`);
      console.log(`   Left Arm Rotation: x=${leftRot.x.toFixed(3)}, y=${leftRot.y.toFixed(3)}, z=${leftRot.z.toFixed(3)}`);
      console.log(`   Right Arm Rotation: x=${rightRot.x.toFixed(3)}, y=${rightRot.y.toFixed(3)}, z=${rightRot.z.toFixed(3)}`);
      console.log(`   Expected "CORRECT" Rotation: x=0.393 (22.5°), y=0.000, z=0.000`);
      
      if (Math.abs(leftRot.y) < 0.01 && Math.abs(rightRot.y) < 0.01) {
        console.log(`✅ [Player] ARM ROTATIONS CORRECT - Y rotations are 0 (no inward/outward angle)!`);
      } else {
        console.log(`❌ [Player] ARM ROTATIONS HAVE INWARD ANGLE - Y rotations not zero!`);
        console.log(`   Left Y rotation: ${leftRot.y.toFixed(3)} (should be 0.000)`);
        console.log(`   Right Y rotation: ${rightRot.y.toFixed(3)} (should be 0.000)`);
      }
    } else {
      console.log(`❌ [Player] ARM DEBUG [${context}] - Arms not yet created!`);
    }
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
    // FIXED: Enhanced hand rotations for proper vertical bow gripping - NO Y ROTATION
    this.bowDrawAnimation.leftHandRestRotation.set(-Math.PI / 4, 0, Math.PI / 3);
    this.bowDrawAnimation.rightHandRestRotation.set(0, 0, 0);
    
    // FIXED: Hand rotations during draw - left hand maintains realistic grip - NO Y ROTATION
    this.bowDrawAnimation.leftHandDrawRotation.set(-Math.PI / 4, 0, Math.PI / 3);
    this.bowDrawAnimation.rightHandDrawRotation.set(0, 0, 0);
    
    // Updated realistic arm positions for enhanced archery stance at TALLER height
    this.bowDrawAnimation.leftHandRestPosition.set(-0.4, 1.7, -0.4); // INCREASED Y from 1.4 to 1.7
    this.bowDrawAnimation.rightHandRestPosition.set(0.3, 1.8, -0.3); // INCREASED Y from 1.5 to 1.8
    
    // CRITICAL FIX: FORWARD-ANGLED base position for bow stance with NO Y ROTATION
    const baseShoulder = Math.PI / 6; // Changed from Math.PI / 8 to Math.PI / 6 (30° instead of 22.5°)
    
    // FIXED: Left arm: Extended forward for bow holding with upward angle - NO Y ROTATION
    this.bowDrawAnimation.leftArmRestRotation.set(
      baseShoulder, // Use forward-angled base position
      0,            // FIXED: NO Y rotation - no inward/outward angle
      -0.4          // Added forward angle (negative Z rotation)
    );
    
    // FIXED: Right arm: Ready to draw position - NO Y ROTATION
    this.bowDrawAnimation.rightArmRestRotation.set(
      baseShoulder, // Use forward-angled base position
      0,            // FIXED: NO Y rotation - no inward/outward angle
      -0.3          // Added forward angle (negative Z rotation)
    );
    
    // Drawing positions - left arm stays steady, right arm pulls back at TALLER height
    this.bowDrawAnimation.leftHandDrawPosition.set(-0.4, 1.7, -0.4); // INCREASED Y from 1.4 to 1.7
    this.bowDrawAnimation.rightHandDrawPosition.set(0.8, 1.8, -0.2); // INCREASED Y from 1.5 to 1.8
    
    // FIXED: Drawing arm rotations with enhanced visibility - NO Y ROTATION
    this.bowDrawAnimation.leftArmDrawRotation.set(
      baseShoulder, // Use forward-angled base position
      0,            // FIXED: NO Y rotation - no inward/outward angle
      -0.4          // Maintain forward angle
    );
    
    this.bowDrawAnimation.rightArmDrawRotation.set(
      baseShoulder + 0.7, // Keep the +0.7 offset for drawing motion
      0,                  // FIXED: NO Y rotation - no inward/outward angle
      -0.5
    );
    
    // Bow rotations - keep vertical throughout
    this.bowDrawAnimation.bowRestRotation.set(0, 0, 0);
    this.bowDrawAnimation.bowDrawRotation.set(0, 0, 0);
    
    console.log("🏹 [Player] FIXED bow animation initialized with NO Y ROTATION - arms only go upward/forward");
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
      
      // Position bow handle properly in the enhanced hand
      weapon.getMesh().position.set(-0.03, 0, 0.08);
      weapon.getMesh().rotation.set(0, 0, 0);
      weapon.getMesh().scale.set(1.0, 1.0, 1.0);
      
      // Set bow ready stance - left arm raised outward
      this.setWeaponArmStance('bow');
      
      console.log(`🏹 [Player] Bow equipped with raised left arm ready stance`);
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
    }
    
    // Update animation system weapon type
    this.weaponAnimationSystem.setWeaponType(weaponType);
    
    // Update swing animation with weapon config
    const weaponConfig = weapon.getConfig();
    this.weaponSwing.duration = weaponConfig.swingAnimation.duration;
    this.weaponSwing.phases = weaponConfig.swingAnimation.phases;
    this.weaponSwing.rotations = weaponConfig.swingAnimation.rotations;
    
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
    
    // CRITICAL FIX: Set shoulder rotations for archery stance with NO Y ROTATION
    
    // FIXED: Left shoulder: Enhanced bow holding position - NO Y ROTATION
    this.bowDrawAnimation.leftArmRestRotation.set(
      Math.PI / 4,   // Keep the raised angle from ready stance
      0,             // FIXED: NO Y rotation - no inward/outward angle
      -Math.PI / 6   // Forward angle for better POV visibility
    );
    
    // FIXED: Right shoulder: Ready to draw position - NO Y ROTATION
    this.bowDrawAnimation.rightArmRestRotation.set(
      Math.PI / 6,   // Moderate upward angle
      0,             // FIXED: NO Y rotation - no inward/outward angle
      -Math.PI / 8   // Forward angle for better POV visibility
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
    
    console.log("🏹 [Player] FIXED archery stance set with NO Y ROTATION - arms only upward/forward");
    
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
    
    console.log("🗡️ [Player] Starting TALLER realistic weapon swing animation");
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
    
    console.log("🗡️ [Player] TALLER realistic weapon swing animation started successfully");
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
  
  private updateRealisticSwordSwing(): void {
    if (!this.weaponSwing.isActive || !this.equippedWeapon) return;
    
    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, rotations, duration } = this.weaponSwing;
    
    let shoulderRotation = { x: 0, y: 0, z: 0 };
    let elbowRotation = { x: 0, y: 0, z: 0 };
    let weaponWristRotation = 0;
    let torsoRotation = 0; // New: Add torso rotation for realism
    
    // ENHANCED: Match current idle arm position for proper swing base
    const parallelAngleBase = Math.PI / 3 + 0.03; // 61.7° upward angle, matching current idle position
    
    if (elapsed < phases.windup) {
      // ENHANCED WIND-UP PHASE with torso rotation and improved motion
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Enhanced shoulder movement - more dramatic windup
      shoulderRotation.x = THREE.MathUtils.lerp(parallelAngleBase, rotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(0, rotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
      
      // FIXED: Enhanced elbow coordination - DOWNWARD bend for horizontal sword positioning
      elbowRotation.x = THREE.MathUtils.lerp(0, -0.05, easedT); // CHANGED: Negative (downward) bend to counteract forward shoulder
      
      // NEW: Add torso rotation for power generation
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT); // Rotate torso back for windup
      
    } else if (elapsed < phases.windup + phases.slash) {
      // ENHANCED SLASH PHASE with coordinated body movement and forward swing
      const t = (elapsed - phases.windup) / phases.slash;
      const easedT = t * t * (3 - 2 * t); // Smooth easing for powerful swing
      
      // Enhanced shoulder movement - dramatic forward swing
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, easedT);
      
      // FIXED: Enhanced elbow movement - DOWNWARD extension for horizontal blade
      elbowRotation.x = THREE.MathUtils.lerp(-0.05, -0.1, easedT); // CHANGED: Negative (downward) extension for horizontal sword
      
      // NEW: Enhanced torso rotation - snap forward for power
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.4, easedT); // Rotate torso forward through swing
      
      // Enhanced wrist snap for impact
      if (t >= 0.15 && t <= 0.85) { // Extended wrist snap duration
        const wristT = (t - 0.15) / 0.7;
        weaponWristRotation = Math.sin(wristT * Math.PI) * (this.weaponSwing.wristSnapIntensity * 1.5); // Increased intensity
      }
      
      // Track weapon tip for trail effect
      this.trackWeaponTip();
      
      // Create enhanced swoosh effect once during mid-slash
      if (t >= 0.3 && t <= 0.5 && !this.swooshEffectCreated) {
        this.createEnhancedSwooshEffect();
        this.swooshEffectCreated = true;
      }
      
    } else if (elapsed < duration) {
      // ENHANCED RECOVERY PHASE - smooth return to ready stance
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      // Return to proper idle position
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, parallelAngleBase, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.slash.y, 0, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.slash.z, 0, easedT);
      
      // FIXED: Elbow returns to DOWNWARD position for horizontal sword
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, -0.05, easedT); // CHANGED: Return to downward bend for horizontal sword
      
      // NEW: Torso returns to neutral position
      torsoRotation = THREE.MathUtils.lerp(0.4, 0, easedT);
      
    } else {
      // ANIMATION COMPLETE - return to exact idle position
      shoulderRotation.x = parallelAngleBase;
      shoulderRotation.y = 0;
      shoulderRotation.z = 0;
      elbowRotation = { x: -0.05, y: 0, z: 0 }; // FIXED: DOWNWARD elbow bend for horizontal sword at rest
      torsoRotation = 0;
      this.weaponSwing.isActive = false;
      
      // Create weapon trail if we have enough positions
      if (this.weaponTipPositions.length > 5) {
        this.createWeaponTrailEffect();
      }
      
      return;
    }
    
    // Apply enhanced rotations to realistic arm system
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    // Apply enhanced elbow rotation
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    // NEW: Apply torso rotation for realistic body movement
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
    }
    
    // Apply enhanced wrist snap to weapon
    if (this.equippedWeapon) {
      this.equippedWeapon.getMesh().rotation.z = weaponWristRotation;
    }
    
    console.log(`⚔️ [Player] FIXED Enhanced realistic sword swing - Phase: ${elapsed < phases.windup ? 'WINDUP' : elapsed < phases.windup + phases.slash ? 'SLASH' : 'RECOVERY'}, Elbow: ${elbowRotation.x.toFixed(3)} (DOWNWARD), Torso: ${torsoRotation.toFixed(2)}`);
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
    
    // DEBUG: Periodically check arm positions to detect overrides
    if (Math.random() < 0.01) { // 1% chance per frame to log positions
      this.debugArmPositions("UPDATE_LOOP");
    }
    
    // Update weapon swing animation (for melee weapons) with TALLER realistic arm system
    if (!this.isBowEquipped) {
      this.updateRealisticSwordSwing();
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
    
    // Use weapon animation system for walking animations
    this.weaponAnimationSystem.updateWalkAnimation(
      this.playerBody,
      this.walkCycle,
      deltaTime,
      isActuallyMoving,
      this.isSprinting,
      this.weaponSwing.isActive,
      this.bowDrawAnimation.isActive
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
    
    const chargeLevel = this.equippedWeapon.getChargeLevel ? this.equippedWeapon.getChargeLevel() : 0;
    const lerpSpeed = deltaTime * 8;
    
    console.log(`🏹 [Player] FIXED bow animation update - Active: ${this.bowDrawAnimation.isActive}, Charge: ${chargeLevel.toFixed(2)}`);
    
    if (this.bowDrawAnimation.isActive) {
      // Enhanced progressive draw animation with FIXED joint control - NO Y ROTATION
      const drawProgress = Math.min(chargeLevel * 1.2, 1.0);
      
      // FIXED: Left shoulder: Stays steady holding the bow with slight adjustment - NO Y ROTATION
      const leftShoulderRotation = new THREE.Euler(
        this.bowDrawAnimation.leftArmRestRotation.x + (drawProgress * 0.1), // Slight lift
        0, // FIXED: NO Y rotation - no inward/outward angle
        this.bowDrawAnimation.leftArmRestRotation.z + (drawProgress * 0.05)
      );
      
      // FIXED: Right shoulder: Major movement - pulls string back dramatically - NO Y ROTATION
      const rightShoulderRotation = new THREE.Euler(
        this.bowDrawAnimation.rightArmRestRotation.x + (drawProgress * 0.8),
        0, // FIXED: NO Y rotation - no inward/outward angle
        this.bowDrawAnimation.rightArmRestRotation.z - (drawProgress * 0.6)
      );
      
      // Elbow movements for realistic drawing
      const leftElbowRotation = new THREE.Euler(
        0.2 + (drawProgress * 0.1), // Natural forward bend with slight adjustment
        0,
        0
      );
      
      const rightElbowRotation = new THREE.Euler(
        0.3 + (drawProgress * 0.5), // Natural forward bend that increases with draw
        0,
        0
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
      
      // FIXED: Smooth interpolation for shoulders - ENSURE Y ROTATION STAYS 0
      this.playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.x, leftShoulderRotation.x, lerpSpeed
      );
      this.playerBody.leftArm.rotation.y = 0; // FIXED: Force Y rotation to 0
      this.playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.z, leftShoulderRotation.z, lerpSpeed
      );
      
      this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.x, rightShoulderRotation.x, lerpSpeed
      );
      this.playerBody.rightArm.rotation.y = 0; // FIXED: Force Y rotation to 0
      this.playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.z, rightShoulderRotation.z, lerpSpeed
      );
      
      // Smooth interpolation for elbows
      if (this.playerBody.leftElbow) {
        this.playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
          this.playerBody.leftElbow.rotation.x, leftElbowRotation.x, lerpSpeed
        );
      }
      if (this.playerBody.rightElbow) {
        this.playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
          this.playerBody.rightElbow.rotation.x, rightElbowRotation.x, lerpSpeed
        );
      }
      
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
        this.playerBody.rightArm.rotation.z += shakeAmount * 0.5; // FIXED: Shake only X and Z, not Y
        console.log("🏹 [Player] FIXED full draw shake effect - no Y rotation shake");
      }
      
    } else {
      // FIXED: Return to archery rest stance smoothly with all joints - NO Y ROTATION
      this.playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.x, this.bowDrawAnimation.leftArmRestRotation.x, lerpSpeed
      );
      this.playerBody.leftArm.rotation.y = 0; // FIXED: Force Y rotation to 0
      this.playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.leftArm.rotation.z, this.bowDrawAnimation.leftArmRestRotation.z, lerpSpeed
      );
      
      this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.x, this.bowDrawAnimation.rightArmRestRotation.x, lerpSpeed
      );
      this.playerBody.rightArm.rotation.y = 0; // FIXED: Force Y rotation to 0
      this.playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
        this.playerBody.rightArm.rotation.z, this.bowDrawAnimation.rightArmRestRotation.z, lerpSpeed
      );
      
      // Return elbows to rest positions
      if (this.playerBody.leftElbow) {
        this.playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
          this.playerBody.leftElbow.rotation.x, 0.2, lerpSpeed
        );
      }
      if (this.playerBody.rightElbow) {
        this.playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
          this.playerBody.rightElbow.rotation.x, 0.3, lerpSpeed
        );
      }
      
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
    
    console.log("🏹 [Player] Starting TALLER realistic bow draw animation with enhanced joint control");
    this.bowDrawAnimation.isActive = true;
    
    if (this.equippedWeapon.startDrawing) {
      this.equippedWeapon.startDrawing();
      console.log("🏹 [Player] Weapon draw started on equipped weapon with TALLER realistic arms");
    } else {
      console.warn("🏹 [Player] Equipped weapon does not support startDrawing method");
    }
  }
  
  public stopBowDraw(): void {
    if (!this.isBowEquipped || !this.equippedWeapon) {
      return;
    }
    
    console.log("🏹 [Player] Stopping TALLER realistic bow draw animation with enhanced joint control");
    this.bowDrawAnimation.isActive = false;
    
    if (this.equippedWeapon.stopDrawing) {
      this.equippedWeapon.stopDrawing();
      console.log("🏹 [Player] Weapon draw stopped on equipped weapon with TALLER realistic arms");
    } else {
      console.warn("🏹 [Player] Equipped weapon does not support stopDrawing method");
    }
  }
}
