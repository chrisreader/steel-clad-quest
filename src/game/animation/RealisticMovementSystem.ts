import * as THREE from 'three';
import { JointAnimationHelpers } from './JointAnimationHelpers';
import { EnemyBodyParts } from '../entities/humanoid/EnemyHumanoid';
import { BodyCohesionSystem, EnhancedNeutralPoses } from './BodyCohesionSystem';

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
  private bodyCohesionSystem: BodyCohesionSystem;
  
  constructor(config: RealisticMovementConfig) {
    this.config = config;
    this.bodyCohesionSystem = new BodyCohesionSystem();
  }

  public updateRealisticWalk(
    bodyParts: EnemyBodyParts,
    deltaTime: number,
    isMoving: boolean,
    movementSpeed: number,
    neutralPoses: EnhancedNeutralPoses
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
    
    // FIXED: Enhanced knee movement with proper joint constraints
    this.updateRealisticKnees(bodyParts, leftLegPhase, rightLegPhase);
    
    // Coordinated elbow movement
    this.updateRealisticElbows(bodyParts, leftLegPhase, rightLegPhase, neutralPoses);
    
    // NEW: Apply unified body cohesion system
    this.bodyCohesionSystem.updateBodyCohesion(
      bodyParts, 
      walkPhase, 
      deltaTime, 
      isMoving, 
      neutralPoses
    );
  }

  private updateRealisticKnees(
    bodyParts: EnemyBodyParts,
    leftLegPhase: number,
    rightLegPhase: number
  ): void {
    if (!bodyParts.leftKnee || !bodyParts.rightKnee) return;
    
    // FIXED: Calculate knee flexion with proper limits to prevent glitching
    const leftKneeFlexion = this.calculateSafeKneeMovement(leftLegPhase);
    const rightKneeFlexion = this.calculateSafeKneeMovement(rightLegPhase);
    
    // Apply intensity scaling with safety limits
    const leftFlexionScaled = leftKneeFlexion * this.config.kneeFlexionIntensity;
    const rightFlexionScaled = rightKneeFlexion * this.config.kneeFlexionIntensity;
    
    // FIXED: Add subtle asymmetry with clamping to prevent extreme values
    const leftFlexionWithAsymmetry = this.clampKneeRotation(
      JointAnimationHelpers.addAsymmetry(
        leftFlexionScaled, this.config.characterSeed, this.config.asymmetryIntensity
      )
    );
    const rightFlexionWithAsymmetry = this.clampKneeRotation(
      JointAnimationHelpers.addAsymmetry(
        rightFlexionScaled, this.config.characterSeed + 1, this.config.asymmetryIntensity
      )
    );
    
    // FIXED: Apply knee rotations with smooth interpolation to prevent snapping
    this.smoothApplyKneeRotation(bodyParts.leftKnee, leftFlexionWithAsymmetry);
    this.smoothApplyKneeRotation(bodyParts.rightKnee, rightFlexionWithAsymmetry);
  }

  /**
   * FIXED: Calculate safe knee movement that prevents glitching
   */
  private calculateSafeKneeMovement(legPhase: number): number {
    // Use the same realistic gait calculation but with safety limits
    let result: number;
    
    if (legPhase < 0.1) {
      // Heel strike - slight flexion for impact absorption
      const t = legPhase / 0.1;
      result = THREE.MathUtils.lerp(0.1, 0.05, t);
    } else if (legPhase < 0.4) {
      // Stance phase - leg straightens for weight bearing
      const t = (legPhase - 0.1) / 0.3;
      result = THREE.MathUtils.lerp(0.05, 0, t);
    } else if (legPhase < 0.6) {
      // Toe-off - slight bend for power generation
      const t = (legPhase - 0.4) / 0.2;
      result = THREE.MathUtils.lerp(0, 0.15, t);
    } else if (legPhase < 0.8) {
      // Swing phase - controlled knee flexion
      const t = (legPhase - 0.6) / 0.2;
      // FIXED: Reduced maximum bend to prevent glitching (was 0.8, now 0.5)
      const maxBend = 0.5;
      result = THREE.MathUtils.lerp(0.15, maxBend, Math.sin(t * Math.PI));
    } else {
      // Leg extension - prepare for next heel strike
      const t = (legPhase - 0.8) / 0.2;
      const maxBend = 0.5;
      result = THREE.MathUtils.lerp(maxBend, 0.1, t);
    }
    
    // FIXED: Clamp to safe range to prevent extreme rotations
    return THREE.MathUtils.clamp(result, 0, 0.6);
  }

  /**
   * FIXED: Clamp knee rotation to prevent glitching
   */
  private clampKneeRotation(rotation: number): number {
    // Prevent extreme knee bends that cause visual glitches
    return THREE.MathUtils.clamp(rotation, 0, 0.7); // Max ~40 degrees
  }

  /**
   * FIXED: Smooth application of knee rotation to prevent snapping
   */
  private smoothApplyKneeRotation(knee: THREE.Mesh, targetRotation: number): void {
    const currentRotation = knee.rotation.x;
    const maxChange = 0.1; // Limit rotation change per frame
    
    const rotationDiff = targetRotation - currentRotation;
    const clampedDiff = THREE.MathUtils.clamp(rotationDiff, -maxChange, maxChange);
    
    knee.rotation.x = currentRotation + clampedDiff;
  }

  private updateRealisticElbows(
    bodyParts: EnemyBodyParts,
    leftLegPhase: number,
    rightLegPhase: number,
    neutralPoses: EnhancedNeutralPoses
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

  private updateRealisticIdle(
    bodyParts: EnemyBodyParts,
    deltaTime: number,
    neutralPoses: EnhancedNeutralPoses
  ): void {
    this.idleTime += deltaTime;
    
    // NEW: Use unified body cohesion for idle animations
    this.bodyCohesionSystem.updateIdleCohesion(bodyParts, deltaTime, neutralPoses);
    
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
    neutralPoses: EnhancedNeutralPoses
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
    
    // Calculate weapon wrist movement to control weapon angle
    const weaponWristRotation = JointAnimationHelpers.calculateWeaponWristMovement(
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
    
    // Apply wrist movements to control weapon angle
    if (bodyParts.leftWrist) {
      bodyParts.leftWrist.rotation.x = weaponWristRotation.x;
      bodyParts.leftWrist.rotation.y = weaponWristRotation.y;
      bodyParts.leftWrist.rotation.z = weaponWristRotation.z;
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
