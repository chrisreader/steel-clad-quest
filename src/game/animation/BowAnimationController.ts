
import * as THREE from 'three';
import { PlayerBody } from '../../types/GameTypes';

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

export class BowAnimationController {
  private currentBowState: BowState;
  private targetBowState: BowState;
  private transitionSpeed: number = 5;
  private isTransitioning: boolean = false;
  private breathingTime: number = 0;

  // STANDARDIZED HAND ROTATION CONSTANTS - Used across ALL bow states
  private static readonly HAND_ROTATION_X = Math.PI * 80 / 180; // +80° downward angle for grip
  private static readonly HAND_ROTATION_Y = 0; // 0° no side rotation
  private static readonly HAND_ROTATION_Z = 0; // 0° no twist for bow grip

  constructor() {
    this.currentBowState = this.createBowState('idle');
    this.targetBowState = this.createBowState('idle');
    console.log('🏹 [BowAnimationController] Initialized with standardized hand rotations (+80°, 0°, 0°)');
  }

  private createBowState(state: 'idle' | 'walking' | 'drawing1' | 'drawing2' | 'drawing3' | 'drawing4'): BowState {
    switch (state) {
      case 'idle':
        return {
          leftArmX: Math.PI * 60 / 180, // 60° idle position
          leftArmY: 0,
          leftArmZ: 0,
          rightArmX: Math.PI / 6, // 30°
          rightArmY: 0,
          rightArmZ: 0,
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'walking':
        return {
          leftArmX: Math.PI * 70 / 180, // 70° walking position
          leftArmY: 0,
          leftArmZ: 0,
          rightArmX: Math.PI * 40 / 180, // 40°
          rightArmY: 0,
          rightArmZ: 0,
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'drawing1':
        return {
          leftArmX: Math.PI * 95 / 180, // 95° drawing position
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180, // +5.5° inward angle
          rightArmX: Math.PI * 95 / 180,
          rightArmY: 0,
          rightArmZ: -Math.PI * 15.5 / 180, // -15.5° inward angle
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'drawing2':
        return {
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180,
          rightArmX: Math.PI * 90 / 180,
          rightArmY: 0,
          rightArmZ: -Math.PI * 10.5 / 180,
          leftElbowX: 0.2,
          rightElbowX: 0.3
        };
      
      case 'drawing3':
        return {
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180,
          rightArmX: Math.PI * 93 / 180,
          rightArmY: 0,
          rightArmZ: -Math.PI * 5.5 / 180,
          leftElbowX: 0.2,
          rightElbowX: 0.9
        };
      
      case 'drawing4':
        return {
          leftArmX: Math.PI * 95 / 180,
          leftArmY: 0,
          leftArmZ: Math.PI * 5.5 / 180,
          rightArmX: Math.PI * 90 / 180,
          rightArmY: 0,
          rightArmZ: Math.PI * 1.5 / 180,
          leftElbowX: 0.2,
          rightElbowX: 1.4
        };
      
      default:
        return this.createBowState('idle');
    }
  }

  public updateAnimation(
    playerBody: PlayerBody,
    deltaTime: number,
    isMoving: boolean,
    isBowDrawing: boolean,
    bowChargeLevel: number,
    walkCycle?: number,
    isSprinting?: boolean
  ): void {
    this.breathingTime += deltaTime * 2;

    if (isBowDrawing) {
      this.updateDrawingState(playerBody, deltaTime, bowChargeLevel);
    } else if (isMoving && walkCycle !== undefined) {
      this.updateWalkingState(playerBody, deltaTime, walkCycle, isSprinting || false);
    } else {
      this.updateIdleState(playerBody, deltaTime);
    }

    // STANDARDIZED: Apply consistent hand rotation across ALL states
    this.applyStandardizedHandRotations(playerBody, isBowDrawing, bowChargeLevel);
  }

  private updateDrawingState(playerBody: PlayerBody, deltaTime: number, bowChargeLevel: number): void {
    const newTargetState = this.getBowStateForChargeLevel(bowChargeLevel);
    this.transitionToState(newTargetState, deltaTime);
    this.applyCurrentState(playerBody);
  }

  private updateWalkingState(playerBody: PlayerBody, deltaTime: number, walkCycle: number, isSprinting: boolean): void {
    const newTargetState = this.createBowState('walking');
    this.transitionToState(newTargetState, deltaTime);
    this.applyCurrentState(playerBody);
    this.applyWalkingModifiers(playerBody, walkCycle, isSprinting);
  }

  private updateIdleState(playerBody: PlayerBody, deltaTime: number): void {
    const newTargetState = this.createBowState('idle');
    this.transitionToState(newTargetState, deltaTime);
    this.applyCurrentState(playerBody);
  }

  private getBowStateForChargeLevel(chargeLevel: number): BowState {
    if (chargeLevel < 0.25) {
      return this.createBowState('drawing1');
    } else if (chargeLevel < 0.5) {
      return this.createBowState('drawing2');
    } else if (chargeLevel < 0.75) {
      return this.createBowState('drawing3');
    } else {
      return this.createBowState('drawing4');
    }
  }

  private transitionToState(newTargetState: BowState, deltaTime: number): void {
    const stateChanged = Math.abs(newTargetState.leftArmX - this.targetBowState.leftArmX) > 0.01;
    
    if (stateChanged) {
      this.targetBowState = newTargetState;
      this.isTransitioning = true;
    }

    const transitionAmount = deltaTime * this.transitionSpeed;
    
    // Smooth transitions for all components
    this.currentBowState.leftArmX = THREE.MathUtils.lerp(this.currentBowState.leftArmX, this.targetBowState.leftArmX, transitionAmount);
    this.currentBowState.leftArmY = THREE.MathUtils.lerp(this.currentBowState.leftArmY, this.targetBowState.leftArmY, transitionAmount);
    this.currentBowState.leftArmZ = THREE.MathUtils.lerp(this.currentBowState.leftArmZ, this.targetBowState.leftArmZ, transitionAmount);
    this.currentBowState.rightArmX = THREE.MathUtils.lerp(this.currentBowState.rightArmX, this.targetBowState.rightArmX, transitionAmount);
    this.currentBowState.rightArmY = THREE.MathUtils.lerp(this.currentBowState.rightArmY, this.targetBowState.rightArmY, transitionAmount);
    this.currentBowState.rightArmZ = THREE.MathUtils.lerp(this.currentBowState.rightArmZ, this.targetBowState.rightArmZ, transitionAmount);
    this.currentBowState.leftElbowX = THREE.MathUtils.lerp(this.currentBowState.leftElbowX, this.targetBowState.leftElbowX, transitionAmount);
    this.currentBowState.rightElbowX = THREE.MathUtils.lerp(this.currentBowState.rightElbowX, this.targetBowState.rightElbowX, transitionAmount);
  }

  private applyCurrentState(playerBody: PlayerBody): void {
    // Apply arm positions
    playerBody.leftArm.rotation.x = this.currentBowState.leftArmX;
    playerBody.leftArm.rotation.y = this.currentBowState.leftArmY;
    playerBody.leftArm.rotation.z = this.currentBowState.leftArmZ;
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
  }

  private applyWalkingModifiers(playerBody: PlayerBody, walkCycle: number, isSprinting: boolean): void {
    const sprintMultiplier = isSprinting ? 1.5 : 1;
    
    // Legs - normal walking animation
    const legSwing = Math.sin(walkCycle) * 0.25;
    playerBody.leftLeg.rotation.x = legSwing;
    playerBody.rightLeg.rotation.x = -legSwing;
    
    // Arms - reduced swing for bow-holding arm
    const armSwing = Math.sin(walkCycle) * 0.1;
    playerBody.leftArm.rotation.x += -(armSwing * 0.3);
    playerBody.rightArm.rotation.x += armSwing * 0.5;
    
    // Torso sway
    const torsoSway = Math.sin(walkCycle * 0.8) * 0.02 * sprintMultiplier;
    if (playerBody.body) {
      playerBody.body.rotation.z = torsoSway;
    }
  }

  private applyStandardizedHandRotations(playerBody: PlayerBody, isBowDrawing: boolean, bowChargeLevel: number): void {
    // STANDARDIZED: Left hand always uses the same rotation for grip
    playerBody.leftHand.rotation.x = BowAnimationController.HAND_ROTATION_X;
    playerBody.leftHand.rotation.y = BowAnimationController.HAND_ROTATION_Y;
    playerBody.leftHand.rotation.z = BowAnimationController.HAND_ROTATION_Z;

    // Right hand adjusts for drawing
    if (isBowDrawing) {
      const drawAmount = this.easeInOutQuad(bowChargeLevel);
      playerBody.rightHand.rotation.x = drawAmount * Math.PI / 8;
      playerBody.rightHand.rotation.y = 0;
      playerBody.rightHand.rotation.z = drawAmount * Math.PI / 6;
    } else {
      playerBody.rightHand.rotation.x = 0;
      playerBody.rightHand.rotation.y = 0;
      playerBody.rightHand.rotation.z = 0;
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  public reset(): void {
    this.currentBowState = this.createBowState('idle');
    this.targetBowState = this.createBowState('idle');
    this.isTransitioning = false;
    this.breathingTime = 0;
    console.log('🏹 [BowAnimationController] Reset to idle state');
  }
}
