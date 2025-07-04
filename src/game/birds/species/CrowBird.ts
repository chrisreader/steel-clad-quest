import * as THREE from 'three';
import { BaseBird } from '../core/BaseBird';
import { BirdState, FlightMode, BirdBodyParts, WingSegments, BirdMaterials, CROW_CONFIG } from '../core/BirdTypes';
import { BirdMaterialFactory } from '../components/BirdMaterialFactory';
import { BirdGeometryFactory } from '../components/BirdGeometryFactory';
import { BirdWingFactory } from '../components/BirdWingFactory';
import { BirdLegFactory } from '../components/BirdLegFactory';
import { BirdBehaviorController } from '../behavior/BirdBehaviorController';
import { BirdAnimationController } from '../animation/BirdAnimationController';

export class CrowBird extends BaseBird {
  private wingSegments: { left: WingSegments; right: WingSegments } | null = null;
  private materials: BirdMaterials | null = null;
  private behaviorController: BirdBehaviorController;
  private animationController: BirdAnimationController | null = null;

  constructor(id: string) {
    super(id, CROW_CONFIG);
    this.behaviorController = new BirdBehaviorController(CROW_CONFIG);
  }

  protected createBirdBody(): void {
    // Create materials using factory
    this.materials = BirdMaterialFactory.createCrowMaterials();
    
    const bodyGroup = new THREE.Group();
    
    // Create body using geometry factory
    const bodyGeometry = BirdGeometryFactory.createBirdBodyGeometry();
    const body = new THREE.Mesh(bodyGeometry, this.materials.body || this.materials.feather);
    bodyGroup.add(body);

    // Create neck using factory
    const neckGroup = new THREE.Group();
    const neckGeometry = BirdGeometryFactory.createBirdNeckGeometry();
    const neck = new THREE.Mesh(neckGeometry, this.materials.feather);
    neck.position.set(0.3, 0.08, 0);
    neckGroup.add(neck);
    bodyGroup.add(neckGroup);

    // Create head using factory
    const headGroup = new THREE.Group();
    const headGeometry = BirdGeometryFactory.createBirdHeadGeometry();
    const head = new THREE.Mesh(headGeometry, this.materials.feather);
    headGroup.add(head);
    headGroup.position.set(0.52, 0.15, 0);
    bodyGroup.add(headGroup);
    
    // Create beak using factory
    const beakGeometry = BirdGeometryFactory.createBirdBeakGeometry();
    const beak = new THREE.Mesh(beakGeometry, this.materials.beak);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.15, -0.02, 0);
    headGroup.add(beak);

    // Create eyes using factory
    const eyeGeometry = BirdGeometryFactory.createBirdEyeGeometry();
    const leftEye = new THREE.Mesh(eyeGeometry, this.materials.eye);
    const rightEye = new THREE.Mesh(eyeGeometry, this.materials.eye);
    leftEye.position.set(0.06, 0.04, 0.09);
    rightEye.position.set(0.06, 0.04, -0.09);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Create tail using factory
    const tailGroup = new THREE.Group();
    const tailGeometry = BirdGeometryFactory.createBirdTailGeometry();
    const tail = new THREE.Mesh(tailGeometry, this.materials.feather);
    tail.position.set(-0.3, -0.03, 0);
    tailGroup.add(tail);
    bodyGroup.add(tailGroup);

    // Create wings using wing factory
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    const leftWingResult = BirdWingFactory.createAnatomicalWing(true, this.materials);
    const rightWingResult = BirdWingFactory.createAnatomicalWing(false, this.materials);
    
    leftWingGroup.add(leftWingResult.wing);
    rightWingGroup.add(rightWingResult.wing);
    
    // Store wing segments for animation
    this.wingSegments = {
      left: leftWingResult.segments,
      right: rightWingResult.segments
    };
    
    // Position wings at shoulders
    leftWingGroup.position.set(0.2, 0.05, 0.16);
    rightWingGroup.position.set(0.2, 0.05, -0.16);
    
    bodyGroup.add(leftWingGroup);
    bodyGroup.add(rightWingGroup);

    // Create legs using leg factory
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    
    const leftLeg = BirdLegFactory.createAnatomicalLeg(this.materials);
    const rightLeg = BirdLegFactory.createAnatomicalLeg(this.materials);
    
    leftLegGroup.add(leftLeg);
    rightLegGroup.add(rightLeg);
    
    // Position legs
    leftLegGroup.position.set(0.08, -0.18, 0.1);
    rightLegGroup.position.set(0.08, -0.18, -0.1);
    
    bodyGroup.add(leftLegGroup);
    bodyGroup.add(rightLegGroup);

    // Store body parts reference
    this.bodyParts = {
      body: bodyGroup,
      head: headGroup,
      neck: bodyGroup, // Unified body-neck
      tail: tailGroup,
      leftWing: leftWingGroup,
      rightWing: rightWingGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      beak: beak,
      leftEye: leftEye,
      rightEye: rightEye
    };

    // Initialize animation controller
    this.animationController = new BirdAnimationController(this.bodyParts, this.wingSegments);

    this.mesh.add(bodyGroup);
  }

  protected updateBirdBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Use behavior controller to determine state changes
    const behaviorResult = this.behaviorController.update(deltaTime, playerPosition, this.position);
    
    // Apply state changes
    this.birdState = behaviorResult.birdState;
    this.flightMode = behaviorResult.flightMode;
    
    // Handle flight transitions
    if (behaviorResult.shouldStartFlight) {
      this.startFlight();
    } else if (behaviorResult.shouldStartLanding) {
      this.startLanding();
    }

    // Apply flight movement if in the air
    if (this.flightMode !== FlightMode.GROUNDED) {
      this.followFlightPath(deltaTime);
    }

    // Update behavior controller with current flight mode
    this.behaviorController.setFlightMode(this.flightMode);
  }

  protected updateAnimation(deltaTime: number): void {
    if (!this.animationController) return;

    // Update animation controller with current state
    this.animationController.update(
      deltaTime,
      this.birdState,
      this.flightMode,
      this.isFlapping,
      this.velocity
    );
  }

  public dispose(): void {
    // Clean up animation controller
    if (this.animationController) {
      this.animationController.dispose();
    }

    // Clean up materials
    if (this.materials) {
      Object.values(this.materials).forEach(material => {
        if (material) {
          material.dispose();
        }
      });
    }

    // Call parent dispose
    super.dispose();
  }
}