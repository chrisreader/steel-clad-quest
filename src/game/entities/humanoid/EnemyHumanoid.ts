import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { EnemyAnimationSystem } from '../../animation/EnemyAnimationSystem';
import { HumanMaterialManager } from './HumanMaterialManager';
import { HumanGeometryFactory } from './HumanGeometryFactory';

// Export all necessary types and interfaces
export interface EnemyBodyParts {
  body: THREE.Mesh | undefined;
  head: THREE.Mesh | THREE.Group | undefined;
  leftArm: THREE.Mesh | undefined;
  rightArm: THREE.Mesh | undefined;
  leftElbow: THREE.Mesh | undefined;
  rightElbow: THREE.Mesh | undefined;
  leftWrist: THREE.Mesh | undefined;
  rightWrist: THREE.Mesh | undefined;
  leftLeg: THREE.Mesh | undefined;
  rightLeg: THREE.Mesh | undefined;
  leftKnee: THREE.Mesh | undefined;
  rightKnee: THREE.Mesh | undefined;
  leftShoulderJoint: THREE.Mesh | undefined;
  rightShoulderJoint: THREE.Mesh | undefined;
  weapon: THREE.Group | undefined;
  hitBox: THREE.Mesh | undefined;
}

export interface BodyScale {
  body: { radius: number; height: number };
  head: { radius: number };
  arm: { radius: [number, number]; length: number };
  forearm: { radius: [number, number]; length: number };
  leg: { radius: [number, number]; length: number };
  shin: { radius: [number, number]; length: number };
}

export interface BodyPositions {
  legTopY: number;
  thighCenterY: number;
  bodyY: number;
  bodyTopY: number;
  headY: number;
  shoulderHeight: number;
}

export interface NeutralPoses {
  arms: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  elbows: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
  wrists: {
    left: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };
}

export interface AnimationMetrics {
  walkCycleSpeed: number;
  armSwingIntensity: number;
  legSwingIntensity: number;
  shoulderMovement: number;
  elbowMovement: number;
  breathingIntensity: number;
}

export interface EnemyBodyMetrics {
  scale: BodyScale;
  positions: BodyPositions;
  neutralPoses: NeutralPoses;
  animationMetrics: AnimationMetrics;
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
}

export interface EnemyBodyResult {
  group: THREE.Group;
  bodyParts: EnemyBodyParts;
  metrics: EnemyBodyMetrics;
}

export interface HumanoidConfig {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  goldReward: number;
  experienceReward: number;
  attackRange: number;
  damageRange: number;
  attackCooldown: number;
  points: number;
  knockbackResistance: number;
  
  bodyScale: BodyScale;
  
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
  
  features: {
    hasEyes: boolean;
    hasTusks: boolean;
    hasWeapon: boolean;
    eyeConfig?: {
      radius: number;
      color: number;
      emissiveIntensity: number;
      offsetX: number;
      offsetY: number;
      offsetZ: number;
    };
    tuskConfig?: {
      radius: number;
      height: number;
      color: number;
      offsetX: number;
      offsetY: number;
      offsetZ: number;
    };
  };
  
  userData?: {
    clothingColors?: {
      tshirt: number;
      pants: number;
      hair: number;
    };
    toolType?: string;
  };
}

export enum EnemyMovementState {
  IDLE = 'idle',
  PURSUING = 'pursuing',
  ATTACKING = 'attacking',
  KNOCKED_BACK = 'knocked_back',
  STUNNED = 'stunned'
}

export abstract class EnemyHumanoid {
  protected scene: THREE.Scene;
  protected effectsManager: EffectsManager;
  protected audioManager: AudioManager;
  protected config: HumanoidConfig;
  
  protected mesh: THREE.Group;
  protected health: number;
  protected isDead: boolean = false;
  protected deathTime: number = 0;
  protected lastAttackTime: number = 0;
  protected isHit: boolean = false;
  protected hitTime: number = 0;
  
  protected bodyParts: EnemyBodyParts;
  protected animationSystem: EnemyAnimationSystem;
  
  protected movementState: EnemyMovementState = EnemyMovementState.IDLE;
  protected knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
  protected knockbackDuration: number = 0;
  protected stunDuration: number = 0;
  protected targetRotation: number = 0;
  protected rotationSpeed: number = 3.0;
  protected hasInitialOrientation: boolean = false;
  
  protected deathAnimation = {
    falling: false,
    rotationSpeed: Math.random() * 0.1 + 0.05,
    fallSpeed: 0
  };

  constructor(
    scene: THREE.Scene,
    config: HumanoidConfig,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.health = config.health;
    
    const bodyResult = this.createHumanoidBody(position);
    this.mesh = bodyResult.group;
    this.bodyParts = bodyResult.bodyParts;
    
    this.animationSystem = new EnemyAnimationSystem(bodyResult.bodyParts, bodyResult.metrics, config.type);
    
    scene.add(this.mesh);
  }

  protected createHumanoidBody(position: THREE.Vector3): EnemyBodyResult {
    const humanoidGroup = new THREE.Group();
    const { bodyScale, colors, features } = this.config;
    
    // Calculate ground reference - feet should be at Y=0
    const footHeight = 0.15; // Height of foot geometry
    const groundToFeetBottom = bodyScale.leg.length + bodyScale.shin.length + footHeight / 2;
    
    // Calculate positions with proper ground reference
    const legTopY = groundToFeetBottom; // Position legs so feet touch ground at Y=0
    const thighCenterY = legTopY - bodyScale.leg.length / 2;
    const bodyY = legTopY + bodyScale.body.height / 2;
    const bodyTopY = bodyY + bodyScale.body.height / 2;
    const headY = bodyTopY + bodyScale.head.radius + 0.1; // Much shorter neck for goblin-like appearance
    const shoulderHeight = bodyTopY - 0.15; // Lower shoulders for more natural proportions

    // Create base materials once
    const baseSkinMaterial = new THREE.MeshPhongMaterial({
      color: colors.skin,
      shininess: 35,
      specular: 0x333333
    });
    
    const baseMuscleMaterial = new THREE.MeshPhongMaterial({
      color: colors.muscle,
      shininess: 40,
      specular: 0x444444
    });

    const baseAccentMaterial = new THREE.MeshPhongMaterial({
      color: colors.accent,
      shininess: 45,
      specular: 0x555555
    });

    // Create legs - use skin material for humans
    const { leftLeg, rightLeg } = this.createLegs(bodyScale, thighCenterY, baseSkinMaterial);
    humanoidGroup.add(leftLeg, rightLeg);

    // Create hip joints - smaller for humans
    const hipJointRadius = bodyScale.body.radius * 0.4; // Scale with body size
    const hipJointGeometry = new THREE.SphereGeometry(hipJointRadius, 24, 20);
    const leftHipJoint = new THREE.Mesh(hipJointGeometry, baseSkinMaterial.clone());
    leftHipJoint.position.set(-bodyScale.body.radius * 0.4, legTopY - 0.03, 0);
    leftHipJoint.scale.set(1, 0.8, 1);
    leftHipJoint.castShadow = true;
    humanoidGroup.add(leftHipJoint);

    const rightHipJoint = new THREE.Mesh(hipJointGeometry, baseSkinMaterial.clone());
    rightHipJoint.position.set(bodyScale.body.radius * 0.4, legTopY - 0.03, 0);
    rightHipJoint.scale.set(1, 0.8, 1);
    rightHipJoint.castShadow = true;
    humanoidGroup.add(rightHipJoint);

    // Create torso
    const body = this.createTorso(bodyScale, bodyY, bodyTopY, legTopY, shoulderHeight, baseSkinMaterial, baseMuscleMaterial, baseAccentMaterial);
    humanoidGroup.add(body.parent);

    // Create head
    const head = this.createHead(bodyScale, headY, colors, features, baseMuscleMaterial, baseAccentMaterial);
    head.parent.position.y = headY; // Position the head group at the correct height
    humanoidGroup.add(head.parent);

    // Create arms and shoulder joints
    const { leftArm, rightArm, leftElbow, rightElbow, leftWrist, rightWrist, leftShoulderJoint, rightShoulderJoint } = this.createArms(
      bodyScale, shoulderHeight, baseSkinMaterial, baseMuscleMaterial, baseAccentMaterial
    );
    humanoidGroup.add(leftArm, rightArm);

    // Create legs with knees and feet
    const { leftKnee, rightKnee } = this.createShinsAndFeet(
      leftLeg, rightLeg, bodyScale, baseSkinMaterial, baseMuscleMaterial, baseAccentMaterial
    );

    // Create weapon
    let weapon: THREE.Group | undefined;
    if (features.hasWeapon) {
      const woodTexture = TextureGenerator.createWoodTexture(0x5D4037);
      const metalTexture = TextureGenerator.createMetalTexture(0x444444);
      weapon = this.createWeapon(woodTexture, metalTexture);
      weapon.position.set(0, 0.1, 0);
      weapon.rotation.x = Math.PI / 2 + 0.2;
      leftWrist.add(weapon);
    }

    // Create hitbox
    const hitBoxGeometry = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.position.y = bodyY;
    humanoidGroup.add(hitBox);

    humanoidGroup.position.copy(position);
    humanoidGroup.castShadow = true;

    const bodyParts: EnemyBodyParts = {
      body: body.mesh,
      head: head.parent,
      leftArm,
      rightArm,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      leftShoulderJoint,
      rightShoulderJoint,
      weapon,
      hitBox
    };

    const metrics: EnemyBodyMetrics = {
      scale: bodyScale,
      positions: { legTopY, thighCenterY, bodyY, bodyTopY, headY, shoulderHeight },
      neutralPoses: {
        arms: {
          left: { x: -0.393, y: 0, z: -0.3 },
          right: { x: -0.393, y: 0, z: 0.3 }
        },
        elbows: {
          left: { x: 0, y: 0, z: 0 },
          right: { x: 0, y: 0, z: 0 }
        },
        wrists: {
          left: { x: 0, y: 0, z: 0 },
          right: { x: 0, y: 0, z: 0 }
        }
      },
      animationMetrics: {
        walkCycleSpeed: 2.5,
        armSwingIntensity: 0.25,
        legSwingIntensity: 0.2,
        shoulderMovement: 0.1,
        elbowMovement: 0.5,
        breathingIntensity: 0.02
      },
      colors
    };

    return { group: humanoidGroup, bodyParts, metrics };
  }

  private createLegs(bodyScale: BodyScale, thighCenterY: number, material: THREE.MeshPhongMaterial) {
    const leftLegGeometry = this.createTaperedLimbGeometry(
      bodyScale.leg.radius[1], 
      bodyScale.leg.radius[0], 
      bodyScale.leg.length
    );
    const leftLeg = new THREE.Mesh(leftLegGeometry, material.clone());
    leftLeg.position.set(-bodyScale.body.radius * 0.4, thighCenterY, 0);
    leftLeg.castShadow = true;

    const rightLegGeometry = this.createTaperedLimbGeometry(
      bodyScale.leg.radius[1],
      bodyScale.leg.radius[0],
      bodyScale.leg.length
    );
    const rightLeg = new THREE.Mesh(rightLegGeometry, material.clone());
    rightLeg.position.set(bodyScale.body.radius * 0.4, thighCenterY, 0);
    rightLeg.castShadow = true;

    return { leftLeg, rightLeg };
  }

  private createTorso(
    bodyScale: BodyScale, 
    bodyY: number, 
    bodyTopY: number, 
    legTopY: number,
    shoulderHeight: number,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    const torsoGroup = new THREE.Group();
    
    // Create realistic human torso geometry - increased size
    const torsoGeometry = new THREE.CylinderGeometry(
      bodyScale.body.radius * 1.1,  // Chest width (increased from 0.9 to 1.1)
      bodyScale.body.radius * 0.7,  // Waist width (narrower)
      bodyScale.body.height * 1.2,  // Height (increased by 20%)
      32, 16
    );
    
    // Natural human silhouette: shoulders -> waist -> hips
    const positions = torsoGeometry.attributes.position.array as Float32Array;
    const isHuman = this.config.type === EnemyType.HUMAN; // Check actual type, not weapon status
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Normalize Y position (-0.5 to 0.5)
      const normalizedY = y / bodyScale.body.height;
      
      let scaleFactor = 1.0;
      let frontBackScale = 1.0;
      
      // For humans: create graduated scaling for natural shoulder-to-neck transition
      if (isHuman && normalizedY > 0.1) {
        if (normalizedY > 0.45) {
          // Very top - significant taper toward neck
          const topCurve = (normalizedY - 0.45) / 0.05; // 0 at upper-top boundary, 1 at very top
          scaleFactor = 1.2 - (topCurve * 0.4); // Taper from 1.2 to 0.8
          frontBackScale = 1.0 - topCurve * 0.3; // More narrow front-to-back
        } else if (normalizedY > 0.4) {
          // Upper-top - start slight taper (extended chest area)
          const upperCurve = (normalizedY - 0.4) / 0.05; // 0 at upper-middle boundary, 1 at very top boundary
          scaleFactor = 1.2 - (upperCurve * 0.1); // Gradual reduction from 1.2 to 1.1
          frontBackScale = 1.0 - upperCurve * 0.15; // Start front-to-back compression
        } else {
          // Upper-middle - broader chest/shoulder area (EXTENDED higher to align with shoulders)
          scaleFactor = 1.2; // Broader chest extending higher
          frontBackScale = 1.0; // Flatter chest front-to-back depth
        }
        
        // Create curved shoulder transition for all upper sections
        const shoulderRadius = Math.sqrt(x * x + z * z);
        if (shoulderRadius > 0) {
          const angle = Math.atan2(z, x);
          const ovalX = Math.cos(angle) * shoulderRadius * scaleFactor;
          
          // Apply different scaling to front vs back - make back flatter
          let zScale = frontBackScale;
          if (z < 0) { // Back of the chest (negative Z)
            zScale = frontBackScale * 0.85; // Make back slightly flatter
          }
          
          const ovalZ = Math.sin(angle) * shoulderRadius * zScale;
          positions[i] = ovalX;
          positions[i + 2] = ovalZ;
        }
      }
      // Regular chest area - keep full width
      else if (normalizedY > 0.1) {
        scaleFactor = 1.0; // Keep full width at chest
      }
      // Waist area - narrower 
      else if (normalizedY >= -0.2) {
        // Smooth transition to narrow waist
        const waistPosition = (normalizedY + 0.2) / 0.3; // 0 at bottom of waist, 1 at top
        scaleFactor = 0.75 + waistPosition * 0.25; // Scale from 0.75 to 1.0
      }
      // Hip/pelvis area - wider again
      else {
        // Smooth transition to wider hips
        const hipPosition = Math.abs(normalizedY + 0.2) / 0.3; // 0 at waist, 1 at bottom
        scaleFactor = 0.75 + hipPosition * 0.2; // Scale from 0.75 to 0.95
      }
      
      // Apply the scaling (only if not already handled by human shoulder curve logic)
      if (!(isHuman && normalizedY > 0.1)) {
        positions[i] = x * scaleFactor;
        positions[i + 2] = z * scaleFactor;
      }
    }
    
    torsoGeometry.attributes.position.needsUpdate = true;
    torsoGeometry.computeVertexNormals();
    
    const mainTorso = new THREE.Mesh(torsoGeometry, skinMaterial.clone());
    mainTorso.position.y = bodyY;
    mainTorso.castShadow = true;
    torsoGroup.add(mainTorso);

    // Pelvis - more anatomically shaped (orcs only)
    if (this.config.type === EnemyType.ORC) { // Check actual creature type, not weapon status
      const pelvisGeometry = new THREE.SphereGeometry(bodyScale.body.radius * 0.8, 20, 16);
      const pelvisPositions = pelvisGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pelvisPositions.length; i += 3) {
        const x = pelvisPositions[i];
        const y = pelvisPositions[i + 1];
        const z = pelvisPositions[i + 2];
        
        // Flatten top and bottom, widen sides
        pelvisPositions[i] = x * 1.1; // Wider
        pelvisPositions[i + 1] = y * 0.6; // Flatter
        pelvisPositions[i + 2] = z * 0.9; // Slightly compressed front-to-back
      }
      pelvisGeometry.attributes.position.needsUpdate = true;
      pelvisGeometry.computeVertexNormals();
      
      const pelvis = new THREE.Mesh(pelvisGeometry, skinMaterial.clone());
      pelvis.position.y = legTopY + 0.15;
      pelvis.castShadow = true;
      torsoGroup.add(pelvis);
    }

    return { parent: torsoGroup, mesh: mainTorso };
  }

  private createEggShapedHeadGeometry(radius: number): THREE.SphereGeometry {
    // Create base sphere geometry with high detail
    const geometry = new THREE.SphereGeometry(radius, 32, 24);
    
    // Transform vertices to create egg-shaped human head
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Normalize Y position to -1 to 1 range
      const normalizedY = y / radius;
      
      // Define head regions based on normalized Y
      let horizontalScale = 1.0;
      let frontBackScale = 1.0;
      let heightScale = 1.0;
      
      if (normalizedY > 0.6) {
        // Crown/top region - flatter
        const topFactor = (normalizedY - 0.6) / 0.4;
        horizontalScale = 1.0 - topFactor * 0.3; // Narrower at top
        frontBackScale = 1.0 - topFactor * 0.2; // Slightly flatter front-to-back
        heightScale = 0.95 - topFactor * 0.1; // Compress vertically
      } else if (normalizedY > 0.1) {
        // Upper-middle region - eye/temple area (flatter for humans)
        const eyeFactor = Math.sin(((normalizedY - 0.1) / 0.5) * Math.PI);
        horizontalScale = 0.95 + eyeFactor * 0.05; // Slightly narrower, more skull-like
        frontBackScale = 1.15; // Reduced forward projection for flatter forehead/brow
        heightScale = 1.0;
      } else if (normalizedY > -0.3) {
        // Mid-face region - mouth area (narrower)
        const mouthFactor = Math.sin(((normalizedY + 0.3) / 0.4) * Math.PI);
        horizontalScale = 0.9 + mouthFactor * 0.1; // Slightly narrower
        frontBackScale = 1.3 - mouthFactor * 0.1; // Forward projection for face area
        heightScale = 1.0;
      } else {
        // Lower region - jaw/chin (wider and rounder)
        const jawFactor = Math.abs(normalizedY + 0.3) / 0.7;
        horizontalScale = 0.9 + jawFactor * 0.3; // Wider jaw
        frontBackScale = 1.2 + jawFactor * 0.1; // Forward projection for chin
        heightScale = 1.0 + jawFactor * 0.1; // Slightly taller jaw
      }
      
      // Apply transformations
      const horizontalDistance = Math.sqrt(x * x + z * z);
      if (horizontalDistance > 0) {
        const angle = Math.atan2(z, x);
        
        // Apply horizontal scaling
        const newX = Math.cos(angle) * horizontalDistance * horizontalScale;
        
        // Make back of head flatter - apply different scaling to back vs front
        let adjustedFrontBackScale = frontBackScale;
        if (z < 0) { // Back of head (negative Z)
          adjustedFrontBackScale = frontBackScale * 0.65; // Make back much flatter
        }
        
        const newZ = Math.sin(angle) * horizontalDistance * adjustedFrontBackScale;
        
        positions[i] = newX;
        positions[i + 1] = y * heightScale;
        positions[i + 2] = newZ;
      } else {
        // Handle center vertices
        positions[i + 1] = y * heightScale;
      }
    }
    
    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  private createHead(
    bodyScale: BodyScale,
    headY: number,
    colors: any,
    features: any,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    const headGroup = new THREE.Group();
    
    // Create egg-shaped skull with realistic human proportions
    const upperSkullGeometry = this.createEggShapedHeadGeometry(bodyScale.head.radius);
    
    // Use skin material for human faces, muscle material for orcs
    const headMaterial = this.config.type === EnemyType.HUMAN ? 
      new THREE.MeshPhongMaterial({ color: colors.skin, shininess: 35, specular: 0x333333 }) :
      muscleMaterial.clone();
    
    const upperSkull = new THREE.Mesh(upperSkullGeometry, headMaterial);
    upperSkull.position.y = 0; // Position relative to head group center
    upperSkull.castShadow = true;
    headGroup.add(upperSkull);

    // Neck - natural taper that flares to connect with chest, 50% shorter
    const neckGeometry = new THREE.CylinderGeometry(
      bodyScale.head.radius * 0.35, // Top radius (at head)
      bodyScale.body.radius * 0.6,  // Bottom radius (flares to connect with chest) 
      0.35, 16, 4  // Reduced height from 0.7 to 0.35 (50% shorter)
    );
    const neck = new THREE.Mesh(neckGeometry, accentMaterial.clone());
    neck.position.y = -bodyScale.head.radius - 0.175; // Adjusted position for shorter neck
    neck.castShadow = true;
    headGroup.add(neck);

    // Nose - smaller and more elliptical for human proportions
    const noseGeometry = new THREE.SphereGeometry(0.06, 16, 12);
    const nose = new THREE.Mesh(noseGeometry, accentMaterial.clone());
    nose.position.set(0, -0.05, bodyScale.head.radius * 1.15); // Position relative to head group center
    nose.scale.set(0.8, 0.6, 1.4); // More elliptical and smaller
    nose.castShadow = true;
    headGroup.add(nose);

    // Eyes and other features
    if (features.hasEyes && features.eyeConfig) {
      this.addEyes(headGroup, 0, bodyScale, features, accentMaterial); // Use 0 since head group is positioned
    }

    if (features.hasTusks && features.tuskConfig) {
      this.addTusks(headGroup, 0, bodyScale, features); // Use 0 since head group is positioned
    }

    // Add ears (longer for green humanoids/goblins)
    const isGreenHumanoid = this.config.type === EnemyType.GOBLIN; // Green humanoids use GOBLIN type
    this.addEars(headGroup, 0, bodyScale, colors, muscleMaterial, isGreenHumanoid);

    return { parent: headGroup, mesh: upperSkull };
  }

  private addEyes(
    headGroup: THREE.Group,
    headY: number,
    bodyScale: BodyScale,
    features: any,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    // Eye sockets - remove for humans to eliminate rectangles, keep minimal for others
    if (!features.eyeConfig.color || features.eyeConfig.color !== 0xFFFFFF) {
      const eyeSocketGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 0.8, 16, 12);
      const eyeSocketMaterial = accentMaterial.clone();

      const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
      leftEyeSocket.position.set(
        -features.eyeConfig.offsetX,
        features.eyeConfig.offsetY,
        bodyScale.head.radius * features.eyeConfig.offsetZ * 1.1
      );
      leftEyeSocket.scale.z = 0.5;
      headGroup.add(leftEyeSocket);

      const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial.clone());
      rightEyeSocket.position.set(
        features.eyeConfig.offsetX,
        features.eyeConfig.offsetY,
        bodyScale.head.radius * features.eyeConfig.offsetZ * 1.1
      );
      rightEyeSocket.scale.z = 0.5;
      headGroup.add(rightEyeSocket);
    }

    // Eyes - oval shaped for humans, sphere for others
    const isHuman = features.eyeConfig.color === 0xFFFFFF;
    
    let eyeGeometry;
    if (isHuman) {
      // Create smaller, more recessed eyeball shape for humans
      eyeGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 0.6, 16, 12); // Reduced from 0.8 to 0.6
      // Apply scaling after creation to avoid shader issues
      eyeGeometry.computeBoundingBox();
      eyeGeometry.computeVertexNormals();
      // Scale to make it more eyeball-shaped (slightly wider, but smaller overall)
      eyeGeometry.scale(1.1, 0.9, 0.8); // More realistic, smaller eyeball proportions
      // Recompute normals after scaling to fix rendering
      eyeGeometry.computeVertexNormals();
    } else {
      // Keep sphere for orcs/goblins
      eyeGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 0.7, 16, 12);
    }
    
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: isHuman ? 0xFFFFFF : features.eyeConfig.color, // Pure white for humans
      transparent: false,
      opacity: 1.0,
      emissive: new THREE.Color(0x000000), // No glow
      emissiveIntensity: 0.0,
      shininess: isHuman ? 30 : 100,
      side: THREE.FrontSide // Ensure proper rendering
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(
      -features.eyeConfig.offsetX,
      features.eyeConfig.offsetY,
      bodyScale.head.radius * features.eyeConfig.offsetZ * (isHuman ? 0.95 : 1.15) // Much more recessed for humans
    );
    leftEye.castShadow = false; // Disable shadow casting for eyes to avoid shader issues

    const rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial.clone());
    rightEye.position.set(
      features.eyeConfig.offsetX,
      features.eyeConfig.offsetY,
      bodyScale.head.radius * features.eyeConfig.offsetZ * (isHuman ? 0.95 : 1.15) // Much more recessed for humans
    );
    rightEye.castShadow = false; // Disable shadow casting for eyes

    // Pupils - circular and smaller for humans
    const pupilGeometry = new THREE.SphereGeometry(features.eyeConfig.radius * 0.15, 12, 10);
    const pupilMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000, // Pure black pupils
      shininess: 100
    });

    // Remove nose to eliminate rectangle between eyes

    // Remove rectangular eyebrows for humans to eliminate rectangles between eyes
    
    // Add realistic mouth for humans
    if (isHuman) {
      this.addMouthToHead(headGroup, bodyScale, this.config.colors.skin);
      this.addNoseToHead(headGroup, bodyScale, this.config.colors.skin);
    }

    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, features.eyeConfig.radius * 0.7);
    leftEye.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial.clone());
    rightPupil.position.set(0, 0, features.eyeConfig.radius * 0.7);
    rightEye.add(rightPupil);

    headGroup.add(leftEye);
    headGroup.add(rightEye);
  }

  private addTusks(headGroup: THREE.Group, headY: number, bodyScale: BodyScale, features: any) {
    const tuskGeometry = new THREE.ConeGeometry(
      features.tuskConfig.radius, features.tuskConfig.height, 12
    );
    const tuskMaterial = new THREE.MeshPhongMaterial({
      color: features.tuskConfig.color,
      shininess: 90,
      specular: 0xFFFFFF
    });

    const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
    leftTusk.position.set(
      -features.tuskConfig.offsetX,
      -0.3,
      bodyScale.head.radius * 1.0
    );
    leftTusk.rotation.x = Math.PI;
    leftTusk.rotation.z = -0.1;
    leftTusk.castShadow = true;
    headGroup.add(leftTusk);

    const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial.clone());
    rightTusk.position.set(
      features.tuskConfig.offsetX,
      -0.3,
      bodyScale.head.radius * 1.0
    );
    rightTusk.rotation.x = Math.PI;
    rightTusk.rotation.z = 0.1;
    rightTusk.castShadow = true;
    headGroup.add(rightTusk);
  }

  /**
   * Add realistic nose geometry to human heads
   */
  private addNoseToHead(headGroup: THREE.Group, bodyScale: any, skinColor: number): void {
    // Create nose bridge
    const bridgeGeometry = new THREE.CylinderGeometry(0.025, 0.035, 0.12, 8);
    const noseMaterial = new THREE.MeshPhongMaterial({
      color: skinColor,
      shininess: 15
    });

    const noseBridge = new THREE.Mesh(bridgeGeometry, noseMaterial);
    noseBridge.position.set(0, -0.03, bodyScale.head.radius * 0.94);
    noseBridge.rotation.x = Math.PI * 0.15; // Slight downward angle
    noseBridge.castShadow = true;
    headGroup.add(noseBridge);
    
    // Create nose tip (bulbous end)
    const tipGeometry = new THREE.SphereGeometry(0.032, 12, 8);
    const noseTip = new THREE.Mesh(tipGeometry, noseMaterial.clone());
    noseTip.position.set(0, -0.08, bodyScale.head.radius * 0.98);
    noseTip.scale.set(1, 0.8, 1.2); // Slightly flattened
    noseTip.castShadow = true;
    headGroup.add(noseTip);
    
    // Create nostrils
    const nostrilGeometry = new THREE.SphereGeometry(0.012, 8, 6);
    const nostrilMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444, // Darker color for nostrils
      shininess: 5
    });
    
    const leftNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);  
    leftNostril.position.set(-0.02, -0.085, bodyScale.head.radius * 0.99);
    leftNostril.scale.set(0.8, 0.6, 1.5);
    headGroup.add(leftNostril);
    
    const rightNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial.clone());
    rightNostril.position.set(0.02, -0.085, bodyScale.head.radius * 0.99);
    rightNostril.scale.set(0.8, 0.6, 1.5);
    headGroup.add(rightNostril);
  }

  /**
   * Add realistic mouth geometry to human heads
   */
  private addMouthToHead(headGroup: THREE.Group, bodyScale: any, skinColor: number): void {
    // Create upper lip
    const upperLipGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.06, 8);
    const lipMaterial = new THREE.MeshPhongMaterial({
      color: 0xB87070, // Natural lip color - pinkish
      shininess: 25
    });

    const upperLip = new THREE.Mesh(upperLipGeometry, lipMaterial);
    upperLip.position.set(0, -0.145, bodyScale.head.radius * 0.93);
    upperLip.rotation.z = Math.PI / 2; // Horizontal
    upperLip.scale.set(1, 0.4, 1); // Flatter
    upperLip.castShadow = true;
    headGroup.add(upperLip);
    
    // Create lower lip (slightly larger)
    const lowerLipGeometry = new THREE.CylinderGeometry(0.018, 0.025, 0.07, 8);
    const lowerLip = new THREE.Mesh(lowerLipGeometry, lipMaterial.clone());
    lowerLip.position.set(0, -0.155, bodyScale.head.radius * 0.925);
    lowerLip.rotation.z = Math.PI / 2; // Horizontal
    lowerLip.scale.set(1, 0.5, 1); // Slightly fuller lower lip
    lowerLip.castShadow = true;
    headGroup.add(lowerLip);
    
    // Create mouth opening (dark line between lips)
    const mouthLineGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6);
    const mouthLineMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333, // Dark mouth opening
      shininess: 1
    });
    
    const mouthLine = new THREE.Mesh(mouthLineGeometry, mouthLineMaterial);
    mouthLine.position.set(0, -0.15, bodyScale.head.radius * 0.932);
    mouthLine.rotation.z = Math.PI / 2;
    mouthLine.scale.set(1, 0.2, 1);
    headGroup.add(mouthLine);
  }

  /**
   * Add eyebrow ridges for better facial definition
   */
  private addEyebrowsToHead(headGroup: THREE.Group, bodyScale: any, features: any, accentColor: number): void {
    const browGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.08);
    const browMaterial = new THREE.MeshPhongMaterial({
      color: accentColor,
      shininess: 10
    });

    // Left eyebrow
    const leftBrow = new THREE.Mesh(browGeometry, browMaterial);
    leftBrow.position.set(
      -bodyScale.head.radius * features.eyeConfig.offsetX,
      bodyScale.head.radius * (features.eyeConfig.offsetY + 0.15),
      bodyScale.head.radius * features.eyeConfig.offsetZ * 1.1
    );
    leftBrow.castShadow = true;
    headGroup.add(leftBrow);

    // Right eyebrow
    const rightBrow = new THREE.Mesh(browGeometry, browMaterial.clone());
    rightBrow.position.set(
      bodyScale.head.radius * features.eyeConfig.offsetX,
      bodyScale.head.radius * (features.eyeConfig.offsetY + 0.15),
      bodyScale.head.radius * features.eyeConfig.offsetZ * 1.1
    );
    rightBrow.castShadow = true;
    headGroup.add(rightBrow);
  }

  private addEars(
    headGroup: THREE.Group,
    headY: number,
    bodyScale: BodyScale,
    colors: any,
    muscleMaterial: THREE.MeshPhongMaterial,
    isGreenHumanoid: boolean = false
  ) {
    if (isGreenHumanoid) {
      // Create extremely long, pointed goblin ears (200% longer than original)
      const earLength = 1.0; // Doubled again from 0.5 to 1.0 for another 100% increase
      const earWidth = 0.12;
      const earThickness = 0.06;
      
      const earGeometry = new THREE.BoxGeometry(earThickness, earLength, earWidth);
      
      // Left ear - positioned and angled for goblin look
      const leftEar = new THREE.Mesh(earGeometry, muscleMaterial.clone());
      leftEar.position.set(
        -bodyScale.head.radius * 0.9, 
        0.2, // Higher position for longer ears
        0
      );
      leftEar.rotation.z = -0.3; // More angled for goblins
      leftEar.rotation.y = -0.2; // Slight forward angle for goblins
      leftEar.castShadow = true;
      headGroup.add(leftEar);

      // Right ear - positioned and angled for goblin look  
      const rightEar = new THREE.Mesh(earGeometry, muscleMaterial.clone());
      rightEar.position.set(
        bodyScale.head.radius * 0.9, 
        0.2, // Higher position for longer ears
        0
      );
      rightEar.rotation.z = 0.3; // More angled for goblins
      rightEar.rotation.y = 0.2; // Slight forward angle for goblins
      rightEar.castShadow = true;
      headGroup.add(rightEar);

      // Add pointed ear tips for extra long goblin ears
      const tipGeometry = new THREE.ConeGeometry(0.02, 0.1, 6); // Slightly bigger tips for longer ears
      
      // Left ear tip - positioned at end of extremely long ear
      const leftTip = new THREE.Mesh(tipGeometry, muscleMaterial.clone());
      leftTip.position.set(-bodyScale.head.radius * 0.9, 0.7, 0); // Positioned at end of 1.0 length ears
      leftTip.rotation.z = -0.3;
      leftTip.castShadow = true;
      headGroup.add(leftTip);
      
      // Right ear tip - positioned at end of extremely long ear
      const rightTip = new THREE.Mesh(tipGeometry, muscleMaterial.clone());
      rightTip.position.set(bodyScale.head.radius * 0.9, 0.7, 0); // Positioned at end of 1.0 length ears
      rightTip.rotation.z = 0.3;
      rightTip.castShadow = true;
      headGroup.add(rightTip);
    } else {
      // Create realistic human ear structure (original code)
      const earMaterial = muscleMaterial.clone();
      
      // Outer ear (main structure)
      const outerEarGeometry = new THREE.SphereGeometry(0.08, 12, 10);
      const outerEarPositions = outerEarGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < outerEarPositions.length; i += 3) {
        const x = outerEarPositions[i];
        const y = outerEarPositions[i + 1];
        const z = outerEarPositions[i + 2];
        
        // Shape into realistic ear form
        outerEarPositions[i] = x * 0.5;      // Much thinner from side
        outerEarPositions[i + 1] = y * 1.3;  // Taller
        outerEarPositions[i + 2] = z * 0.7;  // Less depth
      }
      outerEarGeometry.attributes.position.needsUpdate = true;
      outerEarGeometry.computeVertexNormals();

      // Left ear
      const leftOuterEar = new THREE.Mesh(outerEarGeometry, earMaterial);
      leftOuterEar.position.set(-bodyScale.head.radius * 0.85, 0.05, 0);
      leftOuterEar.rotation.z = -Math.PI / 12; // Slight tilt
      leftOuterEar.castShadow = true;
      headGroup.add(leftOuterEar);
      
      // Inner ear cavity for left ear
      const innerEarGeometry = new THREE.SphereGeometry(0.035, 8, 6);
      const innerEarMaterial = new THREE.MeshPhongMaterial({
        color: 0x555555, // Darker inner ear
        shininess: 5
      });
      
      const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
      leftInnerEar.position.set(-bodyScale.head.radius * 0.83, 0.05, 0.02);
      leftInnerEar.scale.set(0.4, 0.8, 0.6);
      headGroup.add(leftInnerEar);

      // Right ear 
      const rightOuterEar = new THREE.Mesh(outerEarGeometry.clone(), earMaterial.clone());
      rightOuterEar.position.set(bodyScale.head.radius * 0.85, 0.05, 0);
      rightOuterEar.rotation.z = Math.PI / 12; // Slight tilt opposite direction
      rightOuterEar.castShadow = true;
      headGroup.add(rightOuterEar);
      
      // Inner ear cavity for right ear
      const rightInnerEar = new THREE.Mesh(innerEarGeometry.clone(), innerEarMaterial.clone());
      rightInnerEar.position.set(bodyScale.head.radius * 0.83, 0.05, 0.02);
      rightInnerEar.scale.set(0.4, 0.8, 0.6);
      headGroup.add(rightInnerEar);
    }
  }

  private createArms(
    bodyScale: BodyScale,
    shoulderHeight: number,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    // Left arm
    const leftArmGeometry = this.createTaperedLimbGeometry(
      bodyScale.arm.radius[1], 
      bodyScale.arm.radius[0], 
      bodyScale.arm.length
    );
    leftArmGeometry.translate(0, -bodyScale.arm.length * 0.5, 0);
    const leftArm = new THREE.Mesh(leftArmGeometry, muscleMaterial.clone());
    leftArm.position.set(-(bodyScale.body.radius * 0.85), shoulderHeight, 0); // More inward shoulders
    leftArm.rotation.set(-0.393, 0, -0.3);
    leftArm.castShadow = true;

    // Right arm
    const rightArmGeometry = this.createTaperedLimbGeometry(
      bodyScale.arm.radius[1],
      bodyScale.arm.radius[0],
      bodyScale.arm.length
    );
    rightArmGeometry.translate(0, -bodyScale.arm.length * 0.5, 0);
    const rightArm = new THREE.Mesh(rightArmGeometry, muscleMaterial.clone());
    rightArm.position.set(bodyScale.body.radius * 0.85, shoulderHeight, 0); // More inward shoulders
    rightArm.rotation.set(-0.393, 0, 0.3);
    rightArm.castShadow = true;

    // Shoulder joints - create curved deltoid-like joints using custom spherical geometry
    const shoulderJointRadius = bodyScale.body.radius * 0.5; // Scale with body size
    
    // Create custom deltoid-shaped shoulder geometry based on sphere
    const shoulderJointGeometry = new THREE.SphereGeometry(shoulderJointRadius, 24, 16);
    
    // Modify vertices to create deltoid muscle shape with natural curves
    const shoulderPositions = shoulderJointGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < shoulderPositions.length; i += 3) {
      const x = shoulderPositions[i];
      const y = shoulderPositions[i + 1];
      const z = shoulderPositions[i + 2];
      
      // Calculate normalized position within sphere
      const distance = Math.sqrt(x * x + y * y + z * z);
      const normalizedY = y / shoulderJointRadius; // -1 to 1, where 1 is top, -1 is bottom
      
      // Create completely uniform deltoid - no angular variation to eliminate any points
      // Use only height-based linear scaling for guaranteed smoothness
      
      // Convert to normalized coordinates
      const heightNorm = (normalizedY + 1.0) / 2.0; // 0 at bottom, 1 at top
      
      // Completely uniform scaling around circumference - no angular factors at all
      let scaleFactor = 0.75 + (heightNorm * 0.1); // Simple linear from 0.75 to 0.85
      
      // Constant front-back compression throughout
      let frontBackScale = 0.68;
      
      // Apply scaling with natural deltoid curves
      const horizontalDistance = Math.sqrt(x * x + z * z);
      if (horizontalDistance > 0) {
        const angle = Math.atan2(z, x);
        
        // Apply lateral scaling to X (side-to-side) and front-back scaling to Z
        const newX = Math.cos(angle) * horizontalDistance * scaleFactor;
        const newZ = Math.sin(angle) * horizontalDistance * frontBackScale;
        
        shoulderPositions[i] = newX; // X scaling with lateral constraint
        shoulderPositions[i + 2] = newZ; // Z scaling with front-back compression
      }
    }
    shoulderJointGeometry.attributes.position.needsUpdate = true;
    shoulderJointGeometry.computeVertexNormals();
    
    const leftShoulderJoint = new THREE.Mesh(shoulderJointGeometry, skinMaterial.clone());
    leftShoulderJoint.position.set(0, 0.05, 0); // Slightly lower to blend with extended chest
    leftShoulderJoint.rotation.x = Math.PI; // Flip so wider part is at bottom
    leftShoulderJoint.castShadow = true;
    leftArm.add(leftShoulderJoint); // Attach to arm for animation

    const rightShoulderJoint = new THREE.Mesh(shoulderJointGeometry.clone(), skinMaterial.clone());
    rightShoulderJoint.position.set(0, 0.05, 0); // Slightly lower to blend with extended chest
    rightShoulderJoint.rotation.x = Math.PI; // Flip so wider part is at bottom
    rightShoulderJoint.castShadow = true;
    rightArm.add(rightShoulderJoint); // Attach to arm for animation

    // Elbows and forearms
    const { leftElbow, rightElbow, leftWrist, rightWrist } = this.createForearms(
      leftArm, rightArm, bodyScale, skinMaterial, muscleMaterial, accentMaterial
    );

    return { leftArm, rightArm, leftElbow, rightElbow, leftWrist, rightWrist, leftShoulderJoint, rightShoulderJoint };
  }

  private createForearms(
    leftArm: THREE.Mesh,
    rightArm: THREE.Mesh,
    bodyScale: BodyScale,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    // Elbow joints - make smaller and use skin material for humans
    const elbowJointRadius = bodyScale.arm.radius[1] + 0.02; // Scale with arm size
    const elbowJointGeometry = new THREE.SphereGeometry(elbowJointRadius, 24, 20);
    const leftElbowJoint = new THREE.Mesh(elbowJointGeometry, skinMaterial.clone());
    leftElbowJoint.position.set(0, -bodyScale.arm.length + 0.03, 0);
    leftElbowJoint.scale.set(0.8, 1.2, 0.8);
    leftElbowJoint.castShadow = true;
    leftArm.add(leftElbowJoint);

    const rightElbowJoint = new THREE.Mesh(elbowJointGeometry, skinMaterial.clone());
    rightElbowJoint.position.set(0, -bodyScale.arm.length + 0.03, 0);
    rightElbowJoint.scale.set(0.8, 1.2, 0.8);
    rightElbowJoint.castShadow = true;
    rightArm.add(rightElbowJoint);

    // Forearms
    const leftElbowGeometry = this.createTaperedLimbGeometry(
      bodyScale.forearm.radius[1], 
      bodyScale.forearm.radius[0], 
      bodyScale.forearm.length
    );
    leftElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const leftElbow = new THREE.Mesh(leftElbowGeometry, skinMaterial.clone());
    leftElbow.position.set(0, -bodyScale.arm.length, 0);
    leftElbow.castShadow = true;
    leftArm.add(leftElbow);

    const rightElbowGeometry = this.createTaperedLimbGeometry(
      bodyScale.forearm.radius[1],
      bodyScale.forearm.radius[0],
      bodyScale.forearm.length
    );
    rightElbowGeometry.translate(0, -bodyScale.forearm.length * 0.5, 0);
    const rightElbow = new THREE.Mesh(rightElbowGeometry, skinMaterial.clone());
    rightElbow.position.set(0, -bodyScale.arm.length, 0);
    rightElbow.castShadow = true;
    rightArm.add(rightElbow);

    // Hands/wrists
    const { leftWrist, rightWrist } = this.createHands(leftElbow, rightElbow, bodyScale, muscleMaterial);

    return { leftElbow, rightElbow, leftWrist, rightWrist };
  }

  private createHands(
    leftElbow: THREE.Mesh,
    rightElbow: THREE.Mesh,
    bodyScale: BodyScale,
    muscleMaterial: THREE.MeshPhongMaterial
  ) {
    // Create oval-shaped hands instead of spherical
    const leftWristGeometry = new THREE.SphereGeometry(0.12, 20, 16);
    const leftWrist = new THREE.Mesh(leftWristGeometry, muscleMaterial.clone());
    leftWrist.position.set(0, -bodyScale.forearm.length, 0);
    leftWrist.scale.set(0.8, 1.4, 0.6); // Make oval: narrower width/depth, longer height
    leftWrist.castShadow = true;
    leftElbow.add(leftWrist);

    const rightWristGeometry = new THREE.SphereGeometry(0.12, 20, 16);
    const rightWrist = new THREE.Mesh(rightWristGeometry, muscleMaterial.clone());
    rightWrist.position.set(0, -bodyScale.forearm.length, 0);
    rightWrist.scale.set(0.8, 1.4, 0.6); // Make oval: narrower width/depth, longer height
    rightWrist.castShadow = true;
    rightElbow.add(rightWrist);

    // Add fingers - check config TYPE to determine if claws or human fingers
    if (this.config.type === EnemyType.ORC) {
      // Orcs get claws
      this.addClaws(leftWrist);
      this.addClaws(rightWrist);
    } else {
      // Humans get normal fingers (regardless of whether they have weapons)
      this.addHumanFingers(leftWrist);
      this.addHumanFingers(rightWrist);
    }

    return { leftWrist, rightWrist };
  }

  private addClaws(wrist: THREE.Mesh) {
    const clawGeometry = HumanGeometryFactory.createClaw();
    const clawMaterial = HumanMaterialManager.createSharedMaterial(
      'claw', 
      0x2C1810, 
      90, 
      0x888888
    );

    for (let i = 0; i < 5; i++) {
      const angle = (i / 4) * Math.PI - Math.PI / 2;
      const claw = new THREE.Mesh(clawGeometry, clawMaterial);
      claw.position.set(
        Math.cos(angle) * 0.22,
        -0.12,
        Math.sin(angle) * 0.22
      );
      claw.rotation.x = Math.PI + 0.3;
      claw.castShadow = true;
      wrist.add(claw);
    }
  }

  private addHumanFingers(wrist: THREE.Mesh) {
    const fingerGeometry = HumanGeometryFactory.createFinger();
    const fingerMaterial = HumanMaterialManager.createSharedMaterial(
      'finger', 
      this.config.colors.skin, 
      30, 
      0x333333
    );

    // Define finger positions extending from the "palm" of the hand
    const fingerPositions = [
      { x: -0.04, y: -0.12, z: 0.02, name: 'thumb' },     // Thumb - closer to hand
      { x: -0.02, y: -0.14, z: 0.01, name: 'index' },    // Index finger
      { x: 0.0, y: -0.15, z: 0.0, name: 'middle' },      // Middle finger (longest)
      { x: 0.02, y: -0.14, z: -0.01, name: 'ring' },     // Ring finger
      { x: 0.04, y: -0.13, z: -0.02, name: 'pinky' }     // Pinky (shortest)
    ];

    fingerPositions.forEach((pos, i) => {
      const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
      
      // Position fingers extending from the hand/wrist
      finger.position.set(pos.x, pos.y, pos.z);
      
      // Rotate fingers to point outward from hand naturally
      if (pos.name === 'thumb') {
        // Thumb points inward toward other fingers
        finger.rotation.set(0.4, 0, -0.6);
      } else {
        // Other fingers point forward and slightly downward
        finger.rotation.set(0.3, 0, 0);
      }
      
      finger.castShadow = true;
      wrist.add(finger);
    });
  }

  private createShinsAndFeet(
    leftLeg: THREE.Mesh,
    rightLeg: THREE.Mesh,
    bodyScale: BodyScale,
    skinMaterial: THREE.MeshPhongMaterial,
    muscleMaterial: THREE.MeshPhongMaterial,
    accentMaterial: THREE.MeshPhongMaterial
  ) {
    const shinRelativeY = -bodyScale.leg.length / 2;

    // Shins
    const leftKneeGeometry = this.createTaperedLimbGeometry(
      bodyScale.shin.radius[1], 
      bodyScale.shin.radius[0], 
      bodyScale.shin.length
    );
    leftKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const leftKnee = new THREE.Mesh(leftKneeGeometry, skinMaterial.clone());
    leftKnee.position.set(0, shinRelativeY, 0);
    leftKnee.castShadow = true;
    leftLeg.add(leftKnee);

    const rightKneeGeometry = this.createTaperedLimbGeometry(
      bodyScale.shin.radius[1],
      bodyScale.shin.radius[0],
      bodyScale.shin.length
    );
    rightKneeGeometry.translate(0, -bodyScale.shin.length * 0.5, 0);
    const rightKnee = new THREE.Mesh(rightKneeGeometry, skinMaterial.clone());
    rightKnee.position.set(0, shinRelativeY, 0);
    rightKnee.castShadow = true;
    rightLeg.add(rightKnee);

    // Knee joints - make smaller and use skin material for humans
    const kneeJointRadius = bodyScale.leg.radius[1] + 0.02; // Scale with leg size
    const kneeJointGeometry = new THREE.SphereGeometry(kneeJointRadius, 24, 20);
    const leftKneeJoint = new THREE.Mesh(kneeJointGeometry, skinMaterial.clone());
    leftKneeJoint.position.set(0, shinRelativeY + 0.03, 0);
    leftKneeJoint.scale.set(0.8, 1.2, 0.8);
    leftKneeJoint.castShadow = true;
    leftLeg.add(leftKneeJoint);

    const rightKneeJoint = new THREE.Mesh(kneeJointGeometry, skinMaterial.clone());
    rightKneeJoint.position.set(0, shinRelativeY + 0.03, 0);
    rightKneeJoint.scale.set(0.8, 1.2, 0.8);
    rightKneeJoint.castShadow = true;
    rightLeg.add(rightKneeJoint);

    // Feet - pass skin material to make feet skin-colored for humans
    this.addFeet(leftKnee, rightKnee, bodyScale, skinMaterial);

    return { leftKnee, rightKnee };
  }

  private addFeet(
    leftKnee: THREE.Mesh,
    rightKnee: THREE.Mesh,
    bodyScale: BodyScale,
    skinMaterial: THREE.MeshPhongMaterial
  ) {
    // Create oval-shaped feet with curved edges using capsule geometry
    const footGeometry = HumanGeometryFactory.createFoot();
    
    // Create dark grey shoe material instead of skin material
    const footMaterial = HumanMaterialManager.createShoeMaterial();

    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(0, -bodyScale.shin.length, 0.15);
    leftFoot.rotation.x = Math.PI / 2; // Rotate to lie flat like a foot
    leftFoot.castShadow = true;
    leftKnee.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0, -bodyScale.shin.length, 0.15);
    rightFoot.rotation.x = Math.PI / 2; // Rotate to lie flat like a foot
    rightFoot.castShadow = true;
    rightKnee.add(rightFoot);

    // Add human toes for humans, claws only for orcs
    if (this.config.type === EnemyType.HUMAN) {
      this.addHumanToes(leftFoot, skinMaterial);
      this.addHumanToes(rightFoot, skinMaterial);
    } else {
      // Orc toe claws for non-human types
      const clawGeometry = HumanGeometryFactory.createClaw();
      const clawMaterial = HumanMaterialManager.createSharedMaterial(
        'claw', 
        0x2C1810, 
        90, 
        0x888888
      );

      for (let i = 0; i < 3; i++) {
        const toeClaw = new THREE.Mesh(clawGeometry, clawMaterial);
        toeClaw.position.set((i - 1) * 0.12, -0.075, 0.25);
        toeClaw.rotation.x = Math.PI / 2;
        toeClaw.castShadow = true;
        leftFoot.add(toeClaw);

        const rightToeClaw = new THREE.Mesh(clawGeometry, clawMaterial);
        rightToeClaw.position.set((i - 1) * 0.12, -0.075, 0.25);
        rightToeClaw.rotation.x = Math.PI / 2;
        rightToeClaw.castShadow = true;
        rightFoot.add(rightToeClaw);
      }
    }
  }

  private addHumanToes(foot: THREE.Mesh, skinMaterial: THREE.MeshPhongMaterial) {
    const toeGeometry = HumanGeometryFactory.createToe();
    
    for (let i = 0; i < 5; i++) {
      const toe = new THREE.Mesh(toeGeometry, skinMaterial);
      toe.position.set((i - 2) * 0.04, -0.075, 0.22);
      toe.castShadow = true;
      foot.add(toe);
    }
  }

  private createTaperedLimbGeometry(
    topRadius: number,
    bottomRadius: number, 
    height: number
  ): THREE.CylinderGeometry {
    return new THREE.CylinderGeometry(topRadius, bottomRadius, height, 24, 8);
  }

  protected abstract createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group;

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    const now = Date.now();
    
    if (this.isDead) {
      this.updateDeathAnimation(deltaTime);
      return;
    }
    
    if (!this.hasInitialOrientation) {
      this.setInitialOrientation(playerPosition);
      this.hasInitialOrientation = true;
    }
    
    this.updateMovementState(deltaTime);
    
    if (this.animationSystem.isAttacking()) {
      const animationContinues = this.animationSystem.updateAttackAnimation(deltaTime);
      if (!animationContinues) {
        console.log("🗡️ [EnemyHumanoid] Attack animation completed");
      }
    }
    
    if (this.isHit && now - this.hitTime < 300) {
      // Hit feedback handled elsewhere
    } else if (this.isHit) {
      this.isHit = false;
    }
    
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    switch (this.movementState) {
      case EnemyMovementState.KNOCKED_BACK:
        this.handleKnockbackMovement(deltaTime);
        break;
      case EnemyMovementState.STUNNED:
        break;
      default:
        this.handleNormalMovement(deltaTime, playerPosition, distanceToPlayer, now);
        break;
    }
    
    this.updateRotation(deltaTime);
  }

  private setInitialOrientation(playerPosition: THREE.Vector3): void {
    const directionToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    directionToPlayer.y = 0;
    
    this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    this.mesh.rotation.y = this.targetRotation;
  }

  private updateMovementState(deltaTime: number): void {
    if (this.knockbackDuration > 0) {
      this.knockbackDuration -= deltaTime * 1000;
      if (this.knockbackDuration <= 0) {
        this.knockbackVelocity.set(0, 0, 0);
        this.movementState = this.stunDuration > 0 ? EnemyMovementState.STUNNED : EnemyMovementState.IDLE;
      }
    }
    
    if (this.stunDuration > 0) {
      this.stunDuration -= deltaTime * 1000;
      if (this.stunDuration <= 0) {
        this.movementState = EnemyMovementState.IDLE;
      }
    }
  }

  private handleKnockbackMovement(deltaTime: number): void {
    const movement = this.knockbackVelocity.clone().multiplyScalar(deltaTime);
    this.mesh.position.add(movement);
    this.mesh.position.y = 0;
  }

  private handleNormalMovement(deltaTime: number, playerPosition: THREE.Vector3, distanceToPlayer: number, now: number): void {
    if (distanceToPlayer <= this.config.attackRange) {
      this.movementState = EnemyMovementState.PURSUING;
      
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position)
        .normalize();
      directionToPlayer.y = 0;
      
      this.targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
      
      // Define optimal combat distance (slightly larger than damage range to avoid walking into player)
      const optimalCombatDistance = this.config.damageRange + 0.8; // Add buffer distance
      
      // Only move closer if we're further than optimal combat distance
      if (distanceToPlayer > optimalCombatDistance) {
        const moveAmount = this.config.speed * deltaTime;
        const newPosition = this.mesh.position.clone();
        newPosition.add(directionToPlayer.multiplyScalar(moveAmount));
        newPosition.y = 0;
        
        this.mesh.position.copy(newPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed);
      } else {
        // We're at optimal distance - stop moving and just face the player
        this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
      }
      
      // Attack if within damage range and attack cooldown is ready
      if (distanceToPlayer <= this.config.damageRange && now - this.lastAttackTime > this.config.attackCooldown) {
        this.movementState = EnemyMovementState.ATTACKING;
        this.attack(playerPosition);
        this.lastAttackTime = now;
      }
    } else {
      if (distanceToPlayer > this.config.attackRange && distanceToPlayer < 50) {
        this.movementState = EnemyMovementState.PURSUING;
        
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.mesh.position)
          .normalize();
        direction.y = 0;
        
        this.targetRotation = Math.atan2(direction.x, direction.z);
        
        const slowMoveAmount = this.config.speed * deltaTime * 0.3;
        const newPosition = this.mesh.position.clone();
        newPosition.add(direction.multiplyScalar(slowMoveAmount));
        newPosition.y = 0;
        
        this.mesh.position.copy(newPosition);
        this.animationSystem.updateWalkAnimation(deltaTime, true, this.config.speed * 0.3);
      } else {
        this.movementState = EnemyMovementState.IDLE;
        this.animationSystem.updateWalkAnimation(deltaTime, false, 0);
      }
    }
  }

  private updateRotation(deltaTime: number): void {
    if (this.movementState !== EnemyMovementState.KNOCKED_BACK && 
        this.movementState !== EnemyMovementState.STUNNED && 
        this.hasInitialOrientation) {
      
      const currentRotation = this.mesh.rotation.y;
      const rotationDiff = this.targetRotation - currentRotation;
      
      let normalizedDiff = rotationDiff;
      if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
      
      if (Math.abs(normalizedDiff) > 0.1) {
        const rotationStep = this.rotationSpeed * deltaTime;
        const newRotation = currentRotation + Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotationStep);
        this.mesh.rotation.y = newRotation;
      }
    }
  }

  private attack(playerPosition: THREE.Vector3): void {
    this.animationSystem.startAttackAnimation();
    
    const attackPosition = this.mesh.position.clone();
    attackPosition.y += 1;
    this.effectsManager.createAttackEffect(attackPosition, 0x880000);
    
    this.audioManager.play('enemy_hurt');
  }

  public takeDamage(damage: number, playerPosition: THREE.Vector3): void {
    if (this.isDead) return;
    
    this.health -= damage;
    this.isHit = true;
    this.hitTime = Date.now();
    
    this.effectsManager.createAttackEffect(this.mesh.position.clone(), 0xFFD700);
    
    const knockbackDirection = new THREE.Vector3()
      .subVectors(this.mesh.position, playerPosition)
      .normalize();
    knockbackDirection.y = 0;
    
    const baseKnockback = 3.0;
    const damageMultiplier = Math.min(damage / 20, 2.0);
    const knockbackIntensity = (baseKnockback * damageMultiplier) / this.config.knockbackResistance;
    
    this.knockbackVelocity.copy(knockbackDirection).multiplyScalar(knockbackIntensity);
    this.knockbackDuration = 300;
    this.stunDuration = 150;
    this.movementState = EnemyMovementState.KNOCKED_BACK;
    
    const bloodDirection = knockbackDirection.clone();
    bloodDirection.y = 0.5;
    this.effectsManager.createRealisticBloodEffect(
      this.mesh.position.clone(), 
      bloodDirection
    );
    console.log(`🩸 [EnemyHumanoid] Created death blood decal at position:`, this.mesh.position);
    
    this.audioManager.play('enemy_hurt');
    
    if (this.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.deathTime = Date.now();
    this.deathAnimation.falling = true;
    this.movementState = EnemyMovementState.STUNNED;
    
    this.effectsManager.createHitEffect(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    this.audioManager.play('enemy_death');
  }

  private updateDeathAnimation(deltaTime: number): void {
    if (!this.deathAnimation.falling) return;
    
    this.deathAnimation.fallSpeed += deltaTime * 2;
    
    this.mesh.rotation.x += this.deathAnimation.rotationSpeed;
    this.mesh.position.y -= this.deathAnimation.fallSpeed;
    
    const fadeProgress = Math.min((Date.now() - this.deathTime) / 5000, 1);
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child !== this.bodyParts.hitBox) {
        (child.material as THREE.MeshLambertMaterial).transparent = true;
        (child.material as THREE.MeshLambertMaterial).opacity = 1 - fadeProgress;
      }
    });
    
    if (this.mesh.position.y < -2) {
      this.deathAnimation.falling = false;
    }
  }

  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    return this.mesh.position.distanceTo(playerPosition) <= range;
  }

  public isDeadFor(time: number): boolean {
    if (!this.isDead) return false;
    return Date.now() - this.deathTime > time;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getGoldReward(): number {
    return this.config.goldReward;
  }

  public getExperienceReward(): number {
    return this.config.experienceReward;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getDistanceFromPlayer(playerPosition: THREE.Vector3): number {
    return this.mesh.position.distanceTo(playerPosition);
  }

  public shouldCleanup(maxDistance: number, playerPosition: THREE.Vector3): boolean {
    if (this.isDead && this.isDeadFor(30000)) return true;
    if (this.getDistanceFromPlayer(playerPosition) > maxDistance) return true;
    return false;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  public getBodyParts(): EnemyBodyParts {
    return this.bodyParts;
  }

  public getAnimationSystem(): EnemyAnimationSystem {
    return this.animationSystem;
  }
}
