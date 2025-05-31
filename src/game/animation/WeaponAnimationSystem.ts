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
    
    // Initialize bow states
    this.currentBowState = this.createBowState(60); // Idle state
    this.targetBowState = this.createBowState(60);
    
    console.log('🎭 [WeaponAnimationSystem] Initialized with smooth bow state transitions');
  }
  
  private createBowState(leftArmAngle: number): BowState {
    return {
      leftArmX: Math.PI * leftArmAngle / 180,
      rightArmX: Math.PI / 6,
      rightArmY: 0,
      rightArmZ: -Math.PI / 8,
      leftElbowX: 0.2,
      rightElbowX: 0.3
    };
  }
  
  private getBowStateForCondition(isMoving: boolean, isBowDrawing: boolean): BowState {
    if (isBowDrawing) {
      return this.createBowState(115); // Drawing state
    } else if (isMoving) {
      return this.createBowState(80);  // Walking/Running state
    } else {
      return this.createBowState(60);  // Idle state
    }
  }
  
  private updateBowStateTransition(
    playerBody: PlayerBody,
    deltaTime: number,
    isMoving: boolean,
    isBowDrawing: boolean,
    bowChargeLevel: number
  ): void {
    const newTargetState = this.getBowStateForCondition(isMoving, isBowDrawing);
    
    // Check if we need to start a new transition
    const stateChanged = 
      Math.abs(newTargetState.leftArmX - this.targetBowState.leftArmX) > 0.01;
    
    if (stateChanged) {
      this.targetBowState = newTargetState;
      this.isTransitioning = true;
      console.log(`🏹 [WeaponAnimationSystem] Starting transition to ${(newTargetState.leftArmX * 180 / Math.PI).toFixed(0)}° state`);
    }
    
    // Smooth transition to target state
    const transitionAmount = deltaTime * this.transitionSpeed;
    
    this.currentBowState.leftArmX = THREE.MathUtils.lerp(
      this.currentBowState.leftArmX,
      this.targetBowState.leftArmX,
      transitionAmount
    );
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
    playerBody.leftArm.rotation.y = 0; // Always parallel with body
    playerBody.leftArm.rotation.z = 0; // Always parallel with body
    
    // For drawing state, apply the draw animation on top of the base position
    if (isBowDrawing) {
      this.applyDrawAnimationModifiers(playerBody, bowChargeLevel);
    } else {
      // Apply base right arm position when not drawing
      playerBody.rightArm.rotation.x = this.currentBowState.rightArmX;
      playerBody.rightArm.rotation.y = this.currentBowState.rightArmY;
      playerBody.rightArm.rotation.z = this.currentBowState.rightArmZ;
    }
    
    // Apply elbow positions
    if (playerBody.leftElbow) {
      playerBody.leftElbow.rotation.x = this.currentBowState.leftElbowX;
    }
    if (playerBody.rightElbow && !isBowDrawing) {
      playerBody.rightElbow.rotation.x = this.currentBowState.rightElbowX;
    }
    
    // Check if transition is complete
    const threshold = 0.01;
    if (Math.abs(this.currentBowState.leftArmX - this.targetBowState.leftArmX) < threshold) {
      this.isTransitioning = false;
    }
  }
  
  private applyDrawAnimationModifiers(playerBody: PlayerBody, chargeLevel: number): void {
    // Apply draw-specific modifications on top of the base state
    const drawAmount = this.easeInOutQuad(chargeLevel);
    
    // Right arm draw animation - pulls back based on charge level
    const rightArmDrawX = Math.PI / 6 + (drawAmount * Math.PI / 4);  // Pull up
    const rightArmDrawY = drawAmount * Math.PI / 8;  // Slight outward angle
    const rightArmDrawZ = -Math.PI / 8 - (drawAmount * Math.PI / 6);  // Pull back
    
    playerBody.rightArm.rotation.x = rightArmDrawX;
    playerBody.rightArm.rotation.y = rightArmDrawY;
    playerBody.rightArm.rotation.z = rightArmDrawZ;
    
    // Right elbow bends more as we draw
    if (playerBody.rightElbow) {
      playerBody.rightElbow.rotation.x = 0.3 + (drawAmount * 0.8);
    }
    
    // Hand positions for drawing
    playerBody.leftHand.rotation.x = -Math.PI / 6;
    playerBody.leftHand.rotation.y = 0;
    playerBody.leftHand.rotation.z = Math.PI / 4;
    
    // Right hand pulls string back
    playerBody.rightHand.rotation.x = drawAmount * Math.PI / 8;
    playerBody.rightHand.rotation.y = 0;
    playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6;
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
    console.log(`🎭 [WeaponAnimationSystem] Update: moving=${isMoving}, weapon=${this.currentWeaponType}, attacking=${isAttacking}, bowDrawing=${isBowDrawing}`);
    
    // BOW WEAPON - Handle smooth state transitions
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
        case 'bow':
          // For bow, the smooth transition system handles this
          break;
          
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
    
    // Hand positions
    playerBody.leftHand.rotation.x = -Math.PI / 6;
    playerBody.leftHand.rotation.y = 0;
    playerBody.leftHand.rotation.z = Math.PI / 4;
    
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
      case 'bow':
        // BOW NATURAL READY STANCE: Left arm at 60° chest level, parallel with body
        const bowLeftArmTargetX = Math.PI * 60 / 180;  // 60° upward angle
        const bowLeftArmTargetY = 0;                   // Parallel with body
        const bowLeftArmTargetZ = 0;                   // Parallel with body
        
        playerBody.leftArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.x, bowLeftArmTargetX, returnSpeed
        );
        playerBody.leftArm.rotation.y = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.y, bowLeftArmTargetY, returnSpeed
        );
        playerBody.leftArm.rotation.z = THREE.MathUtils.lerp(
          playerBody.leftArm.rotation.z, bowLeftArmTargetZ, returnSpeed
        );
        
        // Right arm in ready position
        playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.x, Math.PI / 6, returnSpeed
        );
        playerBody.rightArm.rotation.y = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.y, 0, returnSpeed
        );
        playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
          playerBody.rightArm.rotation.z, -Math.PI / 8, returnSpeed
        );
        
        // Bow-specific elbow and hand positions
        if (playerBody.leftElbow) {
          playerBody.leftElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.leftElbow.rotation.x, 0.2, returnSpeed
          );
        }
        if (playerBody.rightElbow) {
          playerBody.rightElbow.rotation.x = THREE.MathUtils.lerp(
            playerBody.rightElbow.rotation.x, 0.3, returnSpeed
          );
        }
        
        playerBody.leftHand.rotation.x = THREE.MathUtils.lerp(
          playerBody.leftHand.rotation.x, -Math.PI / 6, returnSpeed
        );
        playerBody.leftHand.rotation.y = THREE.MathUtils.lerp(
          playerBody.leftHand.rotation.y, 0, returnSpeed
        );
        playerBody.leftHand.rotation.z = THREE.MathUtils.lerp(
          playerBody.leftHand.rotation.z, Math.PI / 4, returnSpeed
        );
        
        playerBody.rightHand.rotation.x = THREE.MathUtils.lerp(
          playerBody.rightHand.rotation.x, 0, returnSpeed
        );
        playerBody.rightHand.rotation.y = THREE.MathUtils.lerp(
          playerBody.rightHand.rotation.y, 0, returnSpeed
        );
        playerBody.rightHand.rotation.z = THREE.MathUtils.lerp(
          playerBody.rightHand.rotation.z, 0, returnSpeed
        );
        
        console.log('🏹 [WeaponAnimationSystem] Returning to bow natural ready stance - 60° chest level, parallel with body');
        break;
        
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
        this.currentBowState = this.createBowState(60);
        this.targetBowState = this.createBowState(60);
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
