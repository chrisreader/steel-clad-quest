
import * as THREE from 'three';
import { JointAnimationHelpers } from './JointAnimationHelpers';
import { EnemyBodyParts } from '../entities/humanoid/EnemyHumanoid';

export interface RealisticMovementConfig {
  // Walking configuration
  stepLength: number;
  walkCycleSpeed: number;
  kneeFlexionIntensity: number;
  elbowSwingIntensity: number;
  weaponWeight: number;
  
  // Combat configuration
  combatStanceType: 'aggressive' | 'defensive';
  weaponType: 'axe' | 'sword' | 'club';
  
  // Character traits
  characterSeed: number;
  asymmetryIntensity: number;
  
  // Body proportions affecting movement
  legLength: number;
  armLength: number;
}

export class RealisticMovementSystem {
  private config: RealisticMovementConfig;
  private walkTime: number = 0;
  private idleTime: number = 0;
  
  constructor(config: RealisticMovementConfig) {
    this.config = config;
  }

  public updateRealisticWalk(
    bodyParts: EnemyBodyParts,
    deltaTime: number,
    isMoving: boolean,
    movementSpeed: number,
    neutralPoses: any
  ): void {
    if (!isMoving) {
      this.updateRealisticIdle(bodyParts, deltaTime, neutralPoses);
      return;
    }

    this.walkTime += deltaTime * movementSpeed * this.config.walkCycleSpeed;
    
    // Calculate gait phases for each leg
    const walkPhase = (this.walkTime % (Math.PI * 2)) / (Math.PI * 2);
    const leftLegPhase = walkPhase;
    const rightLegPhase = (walkPhase + 0.5) % 1;
    
    // Enhanced knee movement with realistic gait
    this.updateRealisticKnees(bodyParts, leftLegPhase, rightLegPhase);
    
    // Coordinated elbow movement
    this.updateRealisticElbows(bodyParts, leftLegPhase, rightLegPhase, neutralPoses);
    
    // Body sway and weight transfer
    this.updateBodyDynamics(bodyParts, walkPhase, neutralPoses);
  }

  private updateRealisticKnees(
    bodyParts: EnemyBodyParts,
    leftLegPhase: number,
    rightLegPhase: number
  ): void {
    if (!bodyParts.leftKnee || !bodyParts.rightKnee) return;
    
    // Calculate realistic knee flexion for each leg
    const leftKneeFlexion = JointAnimationHelpers.calculateRealisticKneeMovement(
      leftLegPhase, false
    ) * this.config.kneeFlexionIntensity;
    
    const rightKneeFlexion = JointAnimationHelpers.calculateRealisticKneeMovement(
      rightLegPhase, false
    ) * this.config.kneeFlexionIntensity;
    
    // Add subtle asymmetry for realism
    const leftFlexionWithAsymmetry = JointAnimationHelpers.addAsymmetry(
      leftKneeFlexion, this.config.characterSeed, this.config.asymmetryIntensity
    );
    const rightFlexionWithAsymmetry = JointAnimationHelpers.addAsymmetry(
      rightKneeFlexion, this.config.characterSeed + 1, this.config.asymmetryIntensity
    );
    
    // Apply knee rotations
    bodyParts.leftKnee.rotation.x = leftFlexionWithAsymmetry;
    bodyParts.rightKnee.rotation.x = rightFlexionWithAsymmetry;
  }

  private updateRealisticElbows(
    bodyParts: EnemyBodyParts,
    leftLegPhase: number,
    rightLegPhase: number,
    neutralPoses: any
  ): void {
    if (!bodyParts.leftElbow || !bodyParts.rightElbow) return;
    
    // Left arm typically holds weapon, right arm is supporting
    const leftElbowMovement = JointAnimationHelpers.calculateCoordinatedElbowMovement(
      rightLegPhase, 'weapon', this.config.weaponWeight
    ) * this.config.elbowSwingIntensity;
    
    const rightElbowMovement = JointAnimationHelpers.calculateCoordinatedElbowMovement(
      leftLegPhase, 'supporting', this.config.weaponWeight
    ) * this.config.elbowSwingIntensity;
    
    // Add asymmetry
    const leftElbowWithAsymmetry = JointAnimationHelpers.addAsymmetry(
      leftElbowMovement, this.config.characterSeed + 2, this.config.asymmetryIntensity
    );
    const rightElbowWithAsymmetry = JointAnimationHelpers.addAsymmetry(
      rightElbowMovement, this.config.characterSeed + 3, this.config.asymmetryIntensity
    );
    
    // Apply elbow rotations (these are already negative from the helper functions)
    bodyParts.leftElbow.rotation.x = leftElbowWithAsymmetry;
    bodyParts.rightElbow.rotation.x = rightElbowWithAsymmetry;
    
    // Add subtle secondary movements
    bodyParts.leftElbow.rotation.y = Math.sin(this.walkTime * 1.2) * 0.05;
    bodyParts.rightElbow.rotation.y = Math.sin(this.walkTime * 1.3) * 0.03;
  }

  private updateBodyDynamics(
    bodyParts: EnemyBodyParts,
    walkPhase: number,
    neutralPoses: any
  ): void {
    if (!bodyParts.body) return;
    
    // Weight transfer creates body sway
    const hipSway = Math.sin(walkPhase * Math.PI * 2) * 0.03;
    const verticalBob = Math.sin(walkPhase * Math.PI * 4) * 0.05;
    
    // Apply body movement
    bodyParts.body.rotation.z = hipSway;
    bodyParts.body.position.y = neutralPoses.bodyY + verticalBob;
    
    // Shoulder compensation for hip movement
    if (bodyParts.leftArm && bodyParts.rightArm) {
      const shoulderCompensation = -hipSway * 0.5;
      bodyParts.leftArm.rotation.z = neutralPoses.arms.left.z + shoulderCompensation;
      bodyParts.rightArm.rotation.z = neutralPoses.arms.right.z - shoulderCompensation;
    }
  }

  private updateRealisticIdle(
    bodyParts: EnemyBodyParts,
    deltaTime: number,
    neutralPoses: any
  ): void {
    this.idleTime += deltaTime;
    
    // Breathing animation
    if (bodyParts.body) {
      const breathingOffset = Math.sin(this.idleTime * 4) * 0.02;
      bodyParts.body.position.y = neutralPoses.bodyY + breathingOffset;
    }
    
    // Subtle idle movements with FIXED elbow bending
    if (bodyParts.leftElbow && bodyParts.rightElbow) {
      const idleElbowMovement = Math.sin(this.idleTime * 2) * 0.05;
      // FIXED: Use negative values for natural elbow bend
      bodyParts.leftElbow.rotation.x = -0.05 - idleElbowMovement; // Weapon arm slightly more bent
      bodyParts.rightElbow.rotation.x = -0.05 + idleElbowMovement * 0.7; // Supporting arm less bent
    }
    
    // Weapon sway
    if (bodyParts.weapon) {
      const baseRotation = -0.3;
      bodyParts.weapon.rotation.z = baseRotation + Math.sin(this.idleTime * 2) * 0.1;
    }
  }

  public updateRealisticAttack(
    bodyParts: EnemyBodyParts,
    attackProgress: number,
    neutralPoses: any
  ): void {
    // Calculate combat stance
    const stanceData = JointAnimationHelpers.calculateCombatStance(
      attackProgress, this.config.combatStanceType
    );
    
    // Apply stance to knees
    if (bodyParts.leftKnee && bodyParts.rightKnee) {
      bodyParts.leftKnee.rotation.x = stanceData.frontKnee;
      bodyParts.rightKnee.rotation.x = stanceData.backKnee;
    }
    
    // Calculate weapon elbow movement (already returns negative values)
    const weaponElbowAngle = JointAnimationHelpers.calculateWeaponElbowMovement(
      attackProgress, this.config.weaponType
    );
    
    // Calculate supporting elbow movement (already returns negative values)
    const supportElbowAngle = JointAnimationHelpers.calculateBalanceElbowMovement(attackProgress);
    
    // Apply elbow movements (values are already negative from helper functions)
    if (bodyParts.leftElbow) {
      bodyParts.leftElbow.rotation.x = weaponElbowAngle;
    }
    if (bodyParts.rightElbow) {
      bodyParts.rightElbow.rotation.x = supportElbowAngle;
    }
    
    // Add body weight shift
    if (bodyParts.body) {
      const weightShift = Math.sin(attackProgress * Math.PI) * 0.1;
      bodyParts.body.rotation.z = weightShift;
    }
  }

  public updateWalkTime(deltaTime: number, speed: number): void {
    this.walkTime += deltaTime * speed;
  }

  public getWalkPhase(): number {
    return (this.walkTime % (Math.PI * 2)) / (Math.PI * 2);
  }
}
