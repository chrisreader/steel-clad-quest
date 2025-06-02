
import * as THREE from 'three';
import { EnemyBodyParts } from '../entities/humanoid/EnemyHumanoid';

export interface BodyMovementState {
  hipSway: number;
  verticalBob: number;
  weightTransfer: number;
  breathingPhase: number;
  walkPhase: number;
  momentum: THREE.Vector3;
}

export interface EnhancedNeutralPoses {
  bodyY: number;
  headY?: number;
  shoulderHeight?: number;
  bodyRadius?: number;
  arms: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  elbows?: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  wrists?: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
}

export class BodyCohesionSystem {
  private previousBodyState: BodyMovementState;
  private breathingTime: number = 0;
  
  constructor() {
    this.previousBodyState = {
      hipSway: 0,
      verticalBob: 0,
      weightTransfer: 0,
      breathingPhase: 0,
      walkPhase: 0,
      momentum: new THREE.Vector3()
    };
  }

  public updateBodyCohesion(
    bodyParts: EnemyBodyParts,
    walkPhase: number,
    deltaTime: number,
    isMoving: boolean,
    neutralPoses: EnhancedNeutralPoses
  ): BodyMovementState {
    this.breathingTime += deltaTime;
    
    // Calculate unified body movement state
    const currentState: BodyMovementState = {
      hipSway: Math.sin(walkPhase * Math.PI * 2) * 0.03,
      verticalBob: Math.sin(walkPhase * Math.PI * 4) * 0.05,
      weightTransfer: Math.sin(walkPhase * Math.PI * 2) * 0.4,
      breathingPhase: Math.sin(this.breathingTime * 4) * 0.02,
      walkPhase,
      momentum: this.calculateMomentum(deltaTime)
    };

    // Apply movements with proper hierarchy
    this.updateTorsoMovement(bodyParts, currentState, neutralPoses);
    this.updateHeadMovement(bodyParts, currentState, neutralPoses);
    this.updateShoulderMovement(bodyParts, currentState, neutralPoses);
    this.updateArmCohesion(bodyParts, currentState, isMoving, neutralPoses);
    
    this.previousBodyState = currentState;
    return currentState;
  }

  private calculateMomentum(deltaTime: number): THREE.Vector3 {
    // Simple momentum calculation for secondary motion
    const momentum = new THREE.Vector3();
    if (this.previousBodyState) {
      momentum.set(
        this.previousBodyState.hipSway * 0.1,
        this.previousBodyState.verticalBob * 0.1,
        0
      );
    }
    return momentum;
  }

  private updateTorsoMovement(
    bodyParts: EnemyBodyParts,
    state: BodyMovementState,
    neutralPoses: EnhancedNeutralPoses
  ): void {
    if (!bodyParts.body) return;

    // Primary torso movement (already working)
    bodyParts.body.rotation.z = state.hipSway;
    bodyParts.body.position.y = neutralPoses.bodyY + state.verticalBob + state.breathingPhase;
  }

  private updateHeadMovement(
    bodyParts: EnemyBodyParts,
    state: BodyMovementState,
    neutralPoses: EnhancedNeutralPoses
  ): void {
    if (!bodyParts.head) return;

    // Head follows torso rotation with slight compensation
    const headCompensation = -state.hipSway * 0.3; // Counter-rotate slightly for stability
    bodyParts.head.rotation.z = state.hipSway * 0.7 + headCompensation;
    
    // Head bob follows body movement with slight delay
    const headBob = state.verticalBob * 0.8 + state.momentum.y;
    const baseHeadY = neutralPoses.headY || (neutralPoses.bodyY + 1.5); // Fallback if headY not provided
    bodyParts.head.position.y = baseHeadY + headBob + state.breathingPhase * 0.5;
    
    // Subtle head sway for realism
    bodyParts.head.rotation.y = Math.sin(state.walkPhase * Math.PI * 2) * 0.05;
    
    // Breathing affects head slightly
    bodyParts.head.rotation.x = state.breathingPhase * 0.5;
  }

  private updateShoulderMovement(
    bodyParts: EnemyBodyParts,
    state: BodyMovementState,
    neutralPoses: EnhancedNeutralPoses
  ): void {
    if (!bodyParts.leftArm || !bodyParts.rightArm) return;

    // Shoulders compensate for hip movement (counter-rotation)
    const shoulderCompensation = -state.hipSway * 0.6;
    
    // Add weight transfer effect on shoulders
    const leftShoulderShift = state.weightTransfer * 0.1;
    const rightShoulderShift = -state.weightTransfer * 0.1;
    
    // Apply to arm base rotations
    bodyParts.leftArm.rotation.z = neutralPoses.arms.left.z + shoulderCompensation + leftShoulderShift;
    bodyParts.rightArm.rotation.z = neutralPoses.arms.right.z - shoulderCompensation + rightShoulderShift;
    
    // Vertical movement follows body with slight delay
    const shoulderBob = state.verticalBob * 0.9 + state.momentum.y * 0.5;
    const baseShoulderHeight = neutralPoses.shoulderHeight || (neutralPoses.bodyY + 0.8); // Fallback
    bodyParts.leftArm.position.y = baseShoulderHeight + shoulderBob + state.breathingPhase * 0.3;
    bodyParts.rightArm.position.y = baseShoulderHeight + shoulderBob + state.breathingPhase * 0.3;
    
    // Breathing affects shoulder width slightly
    const breathingExpansion = state.breathingPhase * 0.02;
    const baseBodyRadius = neutralPoses.bodyRadius || 0.55; // Fallback
    bodyParts.leftArm.position.x = -(baseBodyRadius + 0.1) - breathingExpansion;
    bodyParts.rightArm.position.x = (baseBodyRadius + 0.1) + breathingExpansion;
  }

  private updateArmCohesion(
    bodyParts: EnemyBodyParts,
    state: BodyMovementState,
    isMoving: boolean,
    neutralPoses: EnhancedNeutralPoses
  ): void {
    if (!bodyParts.leftElbow || !bodyParts.rightElbow) return;

    // Arms respond to body sway with secondary motion
    const armSwayResponse = state.hipSway * 0.2;
    const verticalResponse = state.verticalBob * 0.1;
    
    if (isMoving) {
      // During walking, arms get additional momentum-based movement
      const leftArmMomentum = state.momentum.x * 0.3;
      const rightArmMomentum = -state.momentum.x * 0.3;
      
      // Apply to arm swing (additive to existing swing)
      bodyParts.leftArm.rotation.x += verticalResponse + leftArmMomentum;
      bodyParts.rightArm.rotation.x += verticalResponse + rightArmMomentum;
      
      // Elbows get subtle response to body movement
      bodyParts.leftElbow.rotation.z = armSwayResponse;
      bodyParts.rightElbow.rotation.z = -armSwayResponse;
    } else {
      // During idle, arms sway gently with breathing and body micro-movements
      const idleArmSway = state.breathingPhase * 0.1 + armSwayResponse;
      
      bodyParts.leftArm.rotation.x += state.breathingPhase * 0.05;
      bodyParts.rightArm.rotation.x += state.breathingPhase * 0.05;
      
      bodyParts.leftElbow.rotation.z = idleArmSway;
      bodyParts.rightElbow.rotation.z = -idleArmSway;
    }
    
    // Wrists follow elbow movement with slight delay
    if (bodyParts.leftWrist && bodyParts.rightWrist) {
      const wristResponse = state.verticalBob * 0.05;
      bodyParts.leftWrist.rotation.z = armSwayResponse * 0.5;
      bodyParts.rightWrist.rotation.z = -armSwayResponse * 0.5;
      bodyParts.leftWrist.rotation.x += wristResponse;
      bodyParts.rightWrist.rotation.x += wristResponse;
    }
  }

  public updateIdleCohesion(
    bodyParts: EnemyBodyParts,
    deltaTime: number,
    neutralPoses: EnhancedNeutralPoses
  ): void {
    this.breathingTime += deltaTime;
    
    const breathingPhase = Math.sin(this.breathingTime * 4) * 0.02;
    const microMovement = Math.sin(this.breathingTime * 1.5) * 0.005;
    
    // Unified breathing across all body parts
    if (bodyParts.body) {
      bodyParts.body.position.y = neutralPoses.bodyY + breathingPhase;
      bodyParts.body.rotation.z = microMovement;
    }
    
    if (bodyParts.head) {
      const baseHeadY = neutralPoses.headY || (neutralPoses.bodyY + 1.5);
      bodyParts.head.position.y = baseHeadY + breathingPhase * 0.5;
      bodyParts.head.rotation.x = breathingPhase * 0.3;
      bodyParts.head.rotation.z = microMovement * 0.5;
    }
    
    if (bodyParts.leftArm && bodyParts.rightArm) {
      const baseShoulderHeight = neutralPoses.shoulderHeight || (neutralPoses.bodyY + 0.8);
      const shoulderHeight = baseShoulderHeight + breathingPhase * 0.3;
      bodyParts.leftArm.position.y = shoulderHeight;
      bodyParts.rightArm.position.y = shoulderHeight;
      
      // Subtle breathing expansion
      const expansion = breathingPhase * 0.01;
      const baseBodyRadius = neutralPoses.bodyRadius || 0.55;
      bodyParts.leftArm.position.x = -(baseBodyRadius + 0.1) - expansion;
      bodyParts.rightArm.position.x = (baseBodyRadius + 0.1) + expansion;
    }
  }
}
