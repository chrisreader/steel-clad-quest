import * as THREE from 'three';
import { PlayerBody } from '../../types/GameTypes';
import { ANIMATION_CONFIGS, WeaponAnimationConfigs } from './AnimationConfig';
import { BowWalkAnimation } from './animations/BowWalkAnimation';
import { BowDrawAnimation } from './animations/BowDrawAnimation';
import { MeleeWalkAnimation } from './animations/MeleeWalkAnimation';
import { EmptyHandsWalkAnimation } from './animations/EmptyHandsWalkAnimation';

export type WeaponType = 'emptyHands' | 'melee' | 'bow';

interface BowState {
  leftArmX: number;
  leftArmY: number;
  leftArmZ: number;
  rightArmX: number;
  rightArmY: number;
  rightArmZ: number;
  leftElbowX: number;
  rightElbowX: number;
}

export class WeaponAnimationSystem {
  private configs: WeaponAnimationConfigs;
  private bowWalkAnimation: BowWalkAnimation;
  private bowDrawAnimation: BowDrawAnimation;
  private meleeWalkAnimation: MeleeWalkAnimation;
  private emptyHandsWalkAnimation: EmptyHandsWalkAnimation;
  private currentWeaponType: WeaponType = 'emptyHands';
  private animationReturnSpeed: number = 3;
  
  // Bow state transition tracking
  private currentBowState: BowState;
  private targetBowState: BowState;
  private transitionSpeed: number = 5;
  private isTransitioning: boolean = false;
  
  constructor() {
    this.configs = ANIMATION_CONFIGS;
    this.bowWalkAnimation = new BowWalkAnimation(this.configs.bow);
    this.bowDrawAnimation = new BowDrawAnimation(this.configs.bow);
    this.meleeWalkAnimation = new MeleeWalkAnimation(this.configs.melee);
    this.emptyHandsWalkAnimation = new EmptyHandsWalkAnimation(this.configs.emptyHands);
    
    // Initialize bow states - Idle state
    this.currentBowState = this.createBowState('idle');
    this.targetBowState = this.createBowState('idle');
    
    console.log('🎭 [WeaponAnimationSystem] Initialized with smooth bow state transitions');
  }
  
  private createBowState(state: 'idle' | 'walking' | 'drawing1' | 'drawing2' | 'drawing3' | 'drawing4'): BowState {
    switch (state) {
      case 'idle':
        return {
          // Left arm (bow-holding): 60° upward, parallel with body
          leftArmX: Math.PI * 60 / 180,
          leftArmY: 0,
          leftArmZ: 0,
          // Right arm (string-pulling): 30° upward, no inward angle
          rightArmX: Math.PI / 6, // 30°
          rightArmY: 0,
          rightArmZ: 0,
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'walking':
        return {
          // Left arm (bow-holding): 70° upward, parallel with body
          leftArmX: Math.PI * 70 / 180,
          leftArmY: 0,
          leftArmZ: 0,
          // Right arm (string-pulling): 40° upward, no inward angle
          rightArmX: Math.PI * 40 / 180, // 40°
          rightArmY: 0,
          rightArmZ: 0,
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'drawing1':
        return {
          // Left arm (bow-holding): 95° upward, with small inward angle pointing right
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180, // +5.5° inward angle pointing right
          // Right arm: 95° upward with -15.5° inward angle pointing left
          rightArmX: Math.PI * 95 / 180, // 95°
          rightArmY: 0,
          rightArmZ: -Math.PI * 15.5 / 180, // -15.5° inward angle pointing left
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'drawing2':
        return {
          // Left arm stays the same as drawing1
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180,
          // Right arm: 90° upward, -10.5° inward angle
          rightArmX: Math.PI * 90 / 180, // 90°
          rightArmY: 0,
          rightArmZ: -Math.PI * 10.5 / 180, // -10.5° inward angle pointing left
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'drawing3':
        return {
          // Left arm stays the same as drawing1
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180,
          // Right arm: 93° upward, -5.5° inward angle
          rightArmX: Math.PI * 93 / 180, // 93°
          rightArmY: 0,
          rightArmZ: -Math.PI * 5.5 / 180, // -5.5° inward angle pointing left
          leftElbowX: 0.2,
          rightElbowX: 0.9 // Increased elbow bend
        };
      
      case 'drawing4':
        return {
          // Left arm stays the same as drawing1
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180,
          // Right arm: 90° upward, +1.5° outward angle
          rightArmX: Math.PI * 90 / 180, // 90°
          rightArmY: 0,
          rightArmZ: Math.PI * 1.5 / 180, // +1.5° outward angle
          leftElbowX: 0.2,
          rightElbowX: 1.4 // Maximum elbow bend
        };
      
      default:
        return this.createBowState('idle');
    }
  }
  
  private getBowStateForCondition(isMoving: boolean, isBowDrawing: boolean, chargeLevel: number): BowState {
    if (isBowDrawing) {
      // Determine drawing stage based on charge level (0.0 to 1.0)
      if (chargeLevel < 0.25) {
        return this.createBowState('drawing1'); // 0-1 second
      } else if (chargeLevel < 0.5) {
        return this.createBowState('drawing2'); // 1-2 seconds
      } else if (chargeLevel < 0.75) {
        return this.createBowState('drawing3'); // 2-3 seconds
      } else {
        return this.createBowState('drawing4'); // 3-4 seconds
      }
    } else if (isMoving) {
      return this.createBowState('walking');
    } else {
      return this.createBowState('idle');
    }
  }
  
  private updateBowStateTransition(
    playerBody: PlayerBody,
    deltaTime: number,
    isMoving: boolean,
    isBowDrawing: boolean,
    bowChargeLevel: number
  ): void {
    const newTargetState = this.getBowStateForCondition(isMoving, isBowDrawing, bowChargeLevel);
    
    // Check if we need to start a new transition
    const stateChanged = 
      Math.abs(newTargetState.leftArmX - this.targetBowState.leftArmX) > 0.01 ||
      Math.abs(newTargetState.leftArmZ - this.targetBowState.leftArmZ) > 0.01 ||
      Math.abs(newTargetState.rightArmX - this.targetBowState.rightArmX) > 0.01 ||
      Math.abs(newTargetState.rightArmZ - this.targetBowState.rightArmZ) > 0.01 ||
      Math.abs(newTargetState.rightElbowX - this.targetBowState.rightElbowX) > 0.01;
    
    if (stateChanged) {
      this.targetBowState = newTargetState;
      this.isTransitioning = true;
      
      // Determine current drawing stage for logging
      let stageName = 'idle';
      if (isBowDrawing) {
        if (bowChargeLevel < 0.25) stageName = 'drawing1';
        else if (bowChargeLevel < 0.5) stageName = 'drawing2';
        else if (bowChargeLevel < 0.75) stageName = 'drawing3';
        else stageName = 'drawing4';
      } else if (isMoving) {
        stageName = 'walking';
      }
      
      console.log(`🏹 [WeaponAnimationSystem] Starting transition to ${stageName} stage - Left: ${(newTargetState.leftArmX * 180 / Math.PI).toFixed(0)}°, Right: ${(newTargetState.rightArmX * 180 / Math.PI).toFixed(0)}°, RightElbow: ${newTargetState.rightElbowX.toFixed(1)}`);
    }
    
    // Smooth transition to target state
    const transitionAmount = deltaTime * this.transitionSpeed;
    
    // Left arm transitions
    this.currentBowState.leftArmX = THREE.MathUtils.lerp(
      this.currentBowState.leftArmX,
      this.targetBowState.leftArmX,
      transitionAmount
    );
    this.currentBowState.leftArmY = THREE.MathUtils.lerp(
      this.currentBowState.leftArmY,
      this.targetBowState.leftArmY,
      transitionAmount
    );
    this.currentBowState.leftArmZ = THREE.MathUtils.lerp(
      this.currentBowState.leftArmZ,
      this.targetBowState.leftArmZ,
      transitionAmount
    );
    
    // Right arm transitions
    this.currentBowState.rightArmX = THREE.MathUtils.lerp(
      this.currentBowState.rightArmX,
      this.targetBowState.rightArmX,
      transitionAmount
    );
    this.currentBowState.rightArmY = THREE.MathUtils.lerp(
      this.currentBowState.rightArmY,
      this.targetBowState.rightArmY,
      transitionAmount
    );
    this.currentBowState.rightArmZ = THREE.MathUtils.lerp(
      this.currentBowState.rightArmZ,
      this.targetBowState.rightArmZ,
      transitionAmount
    );
    
    // Elbow transitions
    this.currentBowState.leftElbowX = THREE.MathUtils.lerp(
      this.currentBowState.leftElbowX,
      this.targetBowState.leftElbowX,
      transitionAmount
    );
    this.currentBowState.rightElbowX = THREE.MathUtils.lerp(
      this.currentBowState.rightElbowX,
      this.targetBowState.rightElbowX,
      transitionAmount
    );
    
    // Apply the interpolated state to the player body
    playerBody.leftArm.rotation.x = this.currentBowState.leftArmX;
    playerBody.leftArm.rotation.y = this.currentBowState.leftArmY;
    playerBody.leftArm.rotation.z = this.currentBowState.leftArmZ;
    
    // Apply right arm position (no longer needs draw animation modifiers)
    playerBody.rightArm.rotation.x = this.currentBowState.rightArmX;
    playerBody.rightArm.rotation.y = this.currentBowState.rightArmY;
    playerBody.rightArm.rotation.z = this.currentBowState.rightArmZ;
    
    // Apply elbow positions
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = this.currentBowState.leftElbowX;
    }
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.x = this.currentBowState.rightElbowX;
    }
    
    // FIXED: Consistent left hand rotation across ALL bow states (+80°, 0°, 0°)
    playerBody.leftHand.rotation.x = Math.PI * 80 / 180; // +80° downward angle for grip
    playerBody.leftHand.rotation.y = 0; // 0° no side rotation
    playerBody.leftHand.rotation.z = 0; // 0° no twist for bow grip
    
    // Apply hand positions for drawing states
    if (isBowDrawing) {
      // Right hand pulls string back with progressive intensity
      const drawAmount = this.easeInOutQuad(bowChargeLevel);
      playerBody.rightHand.rotation.x = drawAmount * Math.PI / 8;
      playerBody.rightHand.rotation.y = 0;
      playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6;
    } else {
      // Right hand in neutral position for idle and walking
      playerBody.rightHand.rotation.x = 0;
      playerBody.rightHand.rotation.y = 0;
      playerBody.rightHand.rotation.z = 0;
    }
    
    // Check if transition is complete
    const threshold = 0.01;
    if (Math.abs(this.currentBowState.leftArmX - this.targetBowState.leftArmX) < threshold &&
        Math.abs(this.currentBowState.rightArmX - this.targetBowState.rightArmX) < threshold &&
        Math.abs(this.currentBowState.rightElbowX - this.targetBowState.rightElbowX) < threshold) {
      this.isTransitioning = false;
    }
  }
  
  public setWeaponType(weaponType: WeaponType): void {
    if (this.currentWeaponType !== weaponType) {
      console.log(`🎭 [WeaponAnimationSystem] Weapon type changed: ${this.currentWeaponType} -> ${weaponType}`);
      this.currentWeaponType = weaponType;
    }
  }
  
  public updateWalkAnimation(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isMoving: boolean,
    isSprinting: boolean,
    isAttacking: boolean = false,
    isBowDrawing: boolean = false,
    bowChargeLevel: number = 0
  ): void {
    console.log(`🎭 [WeaponAnimationSystem] Update: moving=${isMoving}, weapon=${this.currentWeaponType}, attacking=${isAttacking}, bowDrawing=${isBowDrawing}, chargeLevel=${bowChargeLevel.toFixed(2)}`);
    
    // BOW WEAPON - Handle smooth state transitions with new drawing stages
    if (this.currentWeaponType === 'bow') {
      this.updateBowStateTransition(playerBody, deltaTime, isMoving, isBowDrawing, bowChargeLevel);
      
      // Apply walking animation on top of the smooth base state if moving
      if (isMoving && !isBowDrawing) {
        this.applyBowWalkingModifiers(playerBody, walkCycle, deltaTime, isSprinting);
      }
      
      console.log(`🏹 [WeaponAnimationSystem] Applied smooth bow animation - State: ${(this.currentBowState.leftArmX * 180 / Math.PI).toFixed(0)}°`);
      return;
    }
    
    // WALKING/RUNNING STATE for other weapons
    if (isMoving) {
      // Only block walking animation during melee attacks, not during bow drawing
      const shouldBlockWalkAnimation = isAttacking && this.currentWeaponType === 'melee';
      
      if (!shouldBlockWalkAnimation) {
        // Apply weapon-specific walking animation
        switch (this.currentWeaponType) {
          case 'melee':
            this.meleeWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting, isAttacking);
            console.log('⚔️ [WeaponAnimationSystem] Applied melee walking animation');
            break;
          case 'emptyHands':
            this.emptyHandsWalkAnimation.update(playerBody, walkCycle, deltaTime, isSprinting);
            console.log('✋ [WeaponAnimationSystem] Applied empty hands walking animation');
            break;
        }
      } else {
        console.log('🚫 [WeaponAnimationSystem] Walking animation blocked due to melee attack');
      }
    } else if (!isMoving && !isAttacking && !isBowDrawing) {
      const returnSpeed = deltaTime * this.animationReturnSpeed;
    
      // Return legs to neutral
      playerBody.leftLeg.rotation.x = THREE.MathUtils.lerp(
        playerBody.leftLeg.rotation.x, 0, returnSpeed
      );
      playerBody.rightLeg.rotation.x = THREE.MathUtils.lerp(
        playerBody.rightLeg.rotation.x, 0, returnSpeed
      );
      
      // Return to weapon-appropriate idle stance
      switch (this.currentWeaponType) {
        case 'melee':
        case 'emptyHands':
          // Return to neutral arm positions
          playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
            playerBody.leftArm.rotation.x, Math.PI / 8, returnSpeed
          );
          playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
            playerBody.rightArm.rotation.x, Math.PI / 8, returnSpeed
          );
          
          if (playerBody.leftElbow) {
            playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
              playerBody.leftElbow.rotation.x, 0, returnSpeed
            );
          }
          if (playerBody.rightElbow) {
            playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
              playerBody.rightElbow.rotation.x, 0, returnSpeed
            );
          }
          break;
      }
    }
  }
  
  private applyBowWalkingModifiers(
    playerBody: PlayerBody,
    walkCycle: number,
    deltaTime: number,
    isSprinting: boolean
  ): void {
    const sprintMultiplier = isSprinting ? 1.5 : 1;
    
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * this.configs.bow.legSwingIntensity;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - reduced swing for bow-holding arm
    const armSwing = Math.sin(walkCycle) * this.configs.bow.armSwingIntensity;
    
    // Apply walking swing on top of the smooth base state
    playerBody.leftArm.rotation.x += -(armSwing * 0.3); // Reduced swing for bow-holding arm
    playerBody.rightArm.rotation.x += armSwing * 0.5;   // Normal swing for right arm
    
    // Torso sway for natural movement
    const torsoSway = Math.sin(walkCycle * 0.8) * this.configs.bow.torsoSway * sprintMultiplier;
    if (playerBody.body) {
      playerBody.body.rotation.z = torsoSway;
    }
    
    // FIXED: Consistent left hand rotation (+80°, 0°, 0°) - same as all other bow states
    playerBody.leftHand.rotation.x = Math.PI * 80 / 180; // +80° downward angle for grip
    playerBody.leftHand.rotation.y = 0; // 0° no side rotation
    playerBody.leftHand.rotation.z = 0; // 0° no twist for bow grip
    
    playerBody.rightHand.rotation.x = 0;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = 0;
  }
  
  private returnToIdlePose(playerBody: PlayerBody, deltaTime: number): void {
    const returnSpeed = deltaTime * this.animationReturnSpeed;
    
    // Return legs to neutral
    playerBody.leftLeg.rotation.x = THREE.MathUtils.lerp(
      playerBody.leftLeg.rotation.x, 0, returnSpeed
    );
    playerBody.rightLeg.rotation.x = THREE.MathUtils.lerp(
      playerBody.rightLeg.rotation.x, 0, returnSpeed
    );
    
    // Return to weapon-appropriate idle stance
    switch (this.currentWeaponType) {
      case 'melee':
      case 'emptyHands':
        // Return to neutral arm positions
        playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.x, Math.PI / 8, returnSpeed
        );
        playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.x, Math.PI / 8, returnSpeed
        );
        
        if (playerBody.leftElbow) {
          playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.leftElbow.rotation.x, 0, returnSpeed
          );
        }
        if (playerBody.rightElbow) {
          playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.rightElbow.rotation.x, 0, returnSpeed
          );
        }
        break;
    }
  }
  
  public resetToWeaponStance(playerBody: PlayerBody): void {
    switch (this.currentWeaponType) {
      case 'bow':
        // Reset to idle state and let transition system handle it
        this.currentBowState = this.createBowState('idle');
        this.targetBowState = this.createBowState('idle');
        this.isTransitioning = false;
        break;
      case 'melee':
        this.meleeWalkAnimation.reset(playerBody);
        break;
      case 'emptyHands':
        this.emptyHandsWalkAnimation.reset(playerBody);
        break;
    }
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  
  public getCurrentWeaponType(): WeaponType {
    return this.currentWeaponType;
  }
  
  public getWalkCycleSpeed(): number {
    return this.configs[this.currentWeaponType].walkCycleSpeed;
  }
}
