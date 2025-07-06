import * as THREE from 'three';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { HumanMaterialManager } from './HumanMaterialManager';
import { HumanGeometryFactory } from './HumanGeometryFactory';
import { HumanBodyConfig } from './HumanBodyConfig';

/**
 * PureHuman - A completely clean human implementation without any orc inheritance
 * Built specifically for camp NPCs to ensure proper human anatomy and appearance
 */
export class PureHuman {
  private scene: THREE.Scene;
  private humanGroup: THREE.Group;
  private bodyParts: { [key: string]: THREE.Object3D } = {};
  private walkTime: number = 0;
  private clothingColors: any;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    useRandomizedAppearance: boolean = true,
    toolType?: string
  ) {
    this.scene = scene;
    this.humanGroup = new THREE.Group();
    this.humanGroup.position.copy(position);
    
    // Generate random clothing colors
    this.clothingColors = this.generateRandomClothingColors();
    
    this.createPureHumanBody();
    this.addClothing();
    this.addHair();
    
    if (toolType) {
      this.addTool(toolType);
    }
    
    this.scene.add(this.humanGroup);
    
    console.log('👤 [PureHuman] Created clean human without orc inheritance');
  }

  private generateRandomClothingColors(): any {
    const tshirtColors = [0x808080, 0x2F4F2F, 0xF5F5DC, 0x4169E1, 0x8B0000];
    const pantsColors = [0x000000, 0x2F4F2F, 0x808080, 0x8B4513, 0x483D8B];
    const hairColors = [0x000000, 0x8B4513, 0x808080, 0x654321, 0x2F1B14];
    
    return {
      tshirt: tshirtColors[Math.floor(Math.random() * tshirtColors.length)],
      pants: pantsColors[Math.floor(Math.random() * pantsColors.length)],
      hair: hairColors[Math.floor(Math.random() * hairColors.length)]
    };
  }

  private createPureHumanBody(): void {
    // Human body proportions - clean and anatomically correct
    const humanScale = {
      body: { radius: 0.3, height: 1.0 },
      head: { radius: 0.25 },
      arm: { radius: [0.08, 0.1], length: 0.5 },
      forearm: { radius: [0.06, 0.08], length: 0.42 },
      leg: { radius: [0.1, 0.12], length: 0.6 },
      shin: { radius: [0.08, 0.1], length: 0.55 }
    };

    // Create materials - proper human skin tones
    const skinMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFDBAE, // Natural human skin tone
      shininess: 60,
      specular: 0x333333
    });

    // Create body (torso)
    const bodyGeometry = new THREE.CylinderGeometry(
      humanScale.body.radius,
      humanScale.body.radius * 0.7,
      humanScale.body.height,
      32, 16
    );
    const body = new THREE.Mesh(bodyGeometry, skinMaterial);
    body.position.set(0, 1.4, 0); // Position above ground
    body.castShadow = true;
    body.receiveShadow = true;
    this.humanGroup.add(body);
    this.bodyParts.body = body;

    // Create head
    const headGeometry = new THREE.SphereGeometry(humanScale.head.radius, 32, 24);
    const head = new THREE.Mesh(headGeometry, skinMaterial.clone());
    head.position.set(0, 1.9, 0); // Above body
    head.castShadow = true;
    this.humanGroup.add(head);
    this.bodyParts.head = head;

    // Add human eyes
    this.addEyes(head, humanScale.head.radius);

    // Create arms
    this.createArms(humanScale, skinMaterial);
    
    // Create legs
    this.createLegs(humanScale, skinMaterial);
  }

  private addEyes(head: THREE.Mesh, headRadius: number): void {
    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 12);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF, // White human eyes
      shininess: 100
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 0.05, headRadius * 0.9);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.12, 0.05, headRadius * 0.9);
    head.add(rightEye);

    // Add pupils
    const pupilGeometry = new THREE.SphereGeometry(0.04, 12, 8);
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.04);
    leftEye.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial.clone());
    rightPupil.position.set(0, 0, 0.04);
    rightEye.add(rightPupil);
  }

  private createArms(humanScale: any, skinMaterial: THREE.Material): void {
    // Left arm
    const leftArmGeometry = new THREE.CylinderGeometry(
      humanScale.arm.radius[1], humanScale.arm.radius[0], 
      humanScale.arm.length, 24, 8
    );
    const leftArm = new THREE.Mesh(leftArmGeometry, skinMaterial.clone());
    leftArm.position.set(-0.4, 1.6, 0);
    leftArm.castShadow = true;
    this.humanGroup.add(leftArm);
    this.bodyParts.leftArm = leftArm;

    // Right arm
    const rightArmGeometry = new THREE.CylinderGeometry(
      humanScale.arm.radius[1], humanScale.arm.radius[0], 
      humanScale.arm.length, 24, 8
    );
    const rightArm = new THREE.Mesh(rightArmGeometry, skinMaterial.clone());
    rightArm.position.set(0.4, 1.6, 0);
    rightArm.castShadow = true;
    this.humanGroup.add(rightArm);
    this.bodyParts.rightArm = rightArm;

    // Add forearms
    const leftForearmGeometry = new THREE.CylinderGeometry(
      humanScale.forearm.radius[1], humanScale.forearm.radius[0], 
      humanScale.forearm.length, 24, 8
    );
    const leftForearm = new THREE.Mesh(leftForearmGeometry, skinMaterial.clone());
    leftForearm.position.set(0, -0.46, 0);
    leftForearm.castShadow = true;
    leftArm.add(leftForearm);
    this.bodyParts.leftForearm = leftForearm;

    const rightForearmGeometry = new THREE.CylinderGeometry(
      humanScale.forearm.radius[1], humanScale.forearm.radius[0], 
      humanScale.forearm.length, 24, 8
    );
    const rightForearm = new THREE.Mesh(rightForearmGeometry, skinMaterial.clone());
    rightForearm.position.set(0, -0.46, 0);
    rightForearm.castShadow = true;
    rightArm.add(rightForearm);
    this.bodyParts.rightForearm = rightForearm;

    // Add hands
    this.addHands(leftForearm, rightForearm, skinMaterial);
  }

  private addHands(leftForearm: THREE.Mesh, rightForearm: THREE.Mesh, skinMaterial: THREE.Material): void {
    const handGeometry = new THREE.SphereGeometry(0.08, 16, 12);
    
    const leftHand = new THREE.Mesh(handGeometry, skinMaterial.clone());
    leftHand.position.set(0, -0.25, 0);
    leftHand.castShadow = true;
    leftForearm.add(leftHand);
    this.bodyParts.leftHand = leftHand;

    const rightHand = new THREE.Mesh(handGeometry, skinMaterial.clone());
    rightHand.position.set(0, -0.25, 0);
    rightHand.castShadow = true;
    rightForearm.add(rightHand);
    this.bodyParts.rightHand = rightHand;

    // Add human fingers (not claws!)
    this.addHumanFingers(leftHand, skinMaterial);
    this.addHumanFingers(rightHand, skinMaterial);
  }

  private addHumanFingers(hand: THREE.Mesh, skinMaterial: THREE.Material): void {
    const fingerGeometry = new THREE.CylinderGeometry(0.015, 0.01, 0.08, 8);
    
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeometry, skinMaterial.clone());
      const angle = (i - 1.5) * 0.3;
      finger.position.set(Math.sin(angle) * 0.06, -0.04, Math.cos(angle) * 0.08);
      finger.rotation.x = angle;
      finger.castShadow = true;
      hand.add(finger);
    }

    // Thumb
    const thumb = new THREE.Mesh(fingerGeometry, skinMaterial.clone());
    thumb.position.set(0.08, 0, 0.04);
    thumb.rotation.z = Math.PI / 4;
    thumb.castShadow = true;
    hand.add(thumb);
  }

  private createLegs(humanScale: any, skinMaterial: THREE.Material): void {
    // Left leg
    const leftLegGeometry = new THREE.CylinderGeometry(
      humanScale.leg.radius[1], humanScale.leg.radius[0], 
      humanScale.leg.length, 24, 8
    );
    const leftLeg = new THREE.Mesh(leftLegGeometry, skinMaterial.clone());
    leftLeg.position.set(-0.2, 0.6, 0);
    leftLeg.castShadow = true;
    this.humanGroup.add(leftLeg);
    this.bodyParts.leftLeg = leftLeg;

    // Right leg
    const rightLegGeometry = new THREE.CylinderGeometry(
      humanScale.leg.radius[1], humanScale.leg.radius[0], 
      humanScale.leg.length, 24, 8
    );
    const rightLeg = new THREE.Mesh(rightLegGeometry, skinMaterial.clone());
    rightLeg.position.set(0.2, 0.6, 0);
    rightLeg.castShadow = true;
    this.humanGroup.add(rightLeg);
    this.bodyParts.rightLeg = rightLeg;

    // Add shins
    const leftShinGeometry = new THREE.CylinderGeometry(
      humanScale.shin.radius[1], humanScale.shin.radius[0], 
      humanScale.shin.length, 24, 8
    );
    const leftShin = new THREE.Mesh(leftShinGeometry, skinMaterial.clone());
    leftShin.position.set(0, -0.575, 0);
    leftShin.castShadow = true;
    leftLeg.add(leftShin);
    this.bodyParts.leftShin = leftShin;

    const rightShinGeometry = new THREE.CylinderGeometry(
      humanScale.shin.radius[1], humanScale.shin.radius[0], 
      humanScale.shin.length, 24, 8
    );
    const rightShin = new THREE.Mesh(rightShinGeometry, skinMaterial.clone());
    rightShin.position.set(0, -0.575, 0);
    rightShin.castShadow = true;
    rightLeg.add(rightShin);
    this.bodyParts.rightShin = rightShin;

    // Add feet
    this.addFeet(leftShin, rightShin, skinMaterial);
  }

  private addFeet(leftShin: THREE.Mesh, rightShin: THREE.Mesh, skinMaterial: THREE.Material): void {
    const footGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.25);
    
    const leftFoot = new THREE.Mesh(footGeometry, skinMaterial.clone());
    leftFoot.position.set(0, -0.35, 0.08);
    leftFoot.castShadow = true;
    leftShin.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeometry, skinMaterial.clone());
    rightFoot.position.set(0, -0.35, 0.08);
    rightFoot.castShadow = true;
    rightShin.add(rightFoot);

    // Add human toes (not claws!)
    this.addHumanToes(leftFoot, skinMaterial);
    this.addHumanToes(rightFoot, skinMaterial);
  }

  private addHumanToes(foot: THREE.Mesh, skinMaterial: THREE.Material): void {
    const toeGeometry = new THREE.SphereGeometry(0.02, 8, 6);
    
    for (let i = 0; i < 5; i++) {
      const toe = new THREE.Mesh(toeGeometry, skinMaterial.clone());
      toe.position.set((i - 2) * 0.025, 0.04, 0.1);
      toe.castShadow = true;
      foot.add(toe);
    }
  }

  private addClothing(): void {
    // Add t-shirt
    const tshirt = HumanBodyConfig.createTShirt(0.3, 1.0, this.clothingColors.tshirt);
    tshirt.position.set(0, 1.4, 0);
    this.humanGroup.add(tshirt);

    // Attach t-shirt components to arms for animation
    const tshirtComponents = tshirt.userData;
    if (tshirtComponents) {
      const { leftShoulderTShirt, rightShoulderTShirt, leftSleeveTShirt, rightSleeveTShirt } = tshirtComponents;
      
      if (this.bodyParts.leftArm && leftShoulderTShirt) {
        this.bodyParts.leftArm.add(leftShoulderTShirt);
      }
      if (this.bodyParts.rightArm && rightShoulderTShirt) {
        this.bodyParts.rightArm.add(rightShoulderTShirt);
      }
      if (this.bodyParts.leftArm && leftSleeveTShirt) {
        this.bodyParts.leftArm.add(leftSleeveTShirt);
      }
      if (this.bodyParts.rightArm && rightSleeveTShirt) {
        this.bodyParts.rightArm.add(rightSleeveTShirt);
      }
    }

    // Add pants
    const pants = HumanBodyConfig.createPants(0.3, this.clothingColors.pants);
    const pantsComponents = pants.userData;
    if (pantsComponents) {
      const { leftThighPants, rightThighPants, leftShinPants, rightShinPants, waistband } = pantsComponents;
      
      if (this.bodyParts.leftLeg && leftThighPants) {
        this.bodyParts.leftLeg.add(leftThighPants);
      }
      if (this.bodyParts.rightLeg && rightThighPants) {
        this.bodyParts.rightLeg.add(rightThighPants);
      }
      if (this.bodyParts.leftShin && leftShinPants) {
        this.bodyParts.leftShin.add(leftShinPants);
      }
      if (this.bodyParts.rightShin && rightShinPants) {
        this.bodyParts.rightShin.add(rightShinPants);
      }
      if (this.bodyParts.body && waistband) {
        waistband.position.set(0, -0.4, 0);
        this.bodyParts.body.add(waistband);
      }
    }
  }

  private addHair(): void {
    const hair = HumanBodyConfig.createHumanHair(0.25, this.clothingColors.hair);
    if (this.bodyParts.head) {
      hair.position.set(0, 0.08, 0);
      this.bodyParts.head.add(hair);
    }
  }

  private addTool(toolType: string): void {
    let tool: THREE.Group;
    
    switch (toolType) {
      case 'dagger':
        tool = this.createDagger();
        break;
      case 'sword':
        tool = this.createSword();
        break;
      case 'staff':
        tool = this.createStaff();
        break;
      case 'axe':
        tool = this.createAxe();
        break;
      default:
        return;
    }

    // Attach tool to right hand
    if (this.bodyParts.rightHand) {
      tool.position.set(0, -0.1, 0);
      tool.rotation.x = Math.PI / 2;
      this.bodyParts.rightHand.add(tool);
    }
  }

  private createDagger(): THREE.Group {
    const toolGroup = new THREE.Group();
    
    const bladeGeometry = new THREE.BoxGeometry(0.03, 0.25, 0.01);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0xC0C0C0,
      shininess: 100
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.125, 0);
    blade.castShadow = true;
    
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.05, 0);
    handle.castShadow = true;
    
    toolGroup.add(blade);
    toolGroup.add(handle);
    
    return toolGroup;
  }

  private createSword(): THREE.Group {
    const toolGroup = new THREE.Group();
    
    const bladeGeometry = new THREE.BoxGeometry(0.04, 0.4, 0.01);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0xC0C0C0,
      shininess: 100
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.2, 0);
    blade.castShadow = true;
    
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.075, 0);
    handle.castShadow = true;
    
    toolGroup.add(blade);
    toolGroup.add(handle);
    
    return toolGroup;
  }

  private createStaff(): THREE.Group {
    const toolGroup = new THREE.Group();
    
    const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
    const shaftMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.set(0, 0.3, 0);
    shaft.castShadow = true;
    
    const ornamentGeometry = new THREE.SphereGeometry(0.04, 12, 8);
    const ornamentMaterial = new THREE.MeshPhongMaterial({
      color: 0x4169E1,
      shininess: 80
    });
    
    const ornament = new THREE.Mesh(ornamentGeometry, ornamentMaterial);
    ornament.position.set(0, 0.64, 0);
    ornament.castShadow = true;
    
    toolGroup.add(shaft);
    toolGroup.add(ornament);
    
    return toolGroup;
  }

  private createAxe(): THREE.Group {
    const toolGroup = new THREE.Group();
    
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0.15, 0);
    handle.castShadow = true;
    
    const headGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.02);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0x696969,
      shininess: 60
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.32, 0);
    head.castShadow = true;
    
    toolGroup.add(handle);
    toolGroup.add(head);
    
    return toolGroup;
  }

  public updateWalkAnimation(deltaTime: number): void {
    this.walkTime += deltaTime * 3;
    
    // Simple walking animation
    const armSwing = Math.sin(this.walkTime) * 0.3;
    const legSwing = Math.sin(this.walkTime + Math.PI) * 0.2;
    
    // Animate arms
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.x = armSwing;
    }
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.x = -armSwing;
    }
    
    // Animate legs
    if (this.bodyParts.leftLeg) {
      this.bodyParts.leftLeg.rotation.x = legSwing;
    }
    if (this.bodyParts.rightLeg) {
      this.bodyParts.rightLeg.rotation.x = -legSwing;
    }
  }

  public updateIdleAnimation(deltaTime: number): void {
    // Subtle idle animation - reset to neutral positions
    const idleTime = Date.now() * 0.001;
    const subtleSway = Math.sin(idleTime) * 0.05;
    
    // Subtle body sway
    if (this.bodyParts.body) {
      this.bodyParts.body.rotation.z = subtleSway;
    }
    
    // Reset limbs to neutral
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.x = THREE.MathUtils.lerp(this.bodyParts.leftArm.rotation.x, 0, 0.1);
    }
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.x = THREE.MathUtils.lerp(this.bodyParts.rightArm.rotation.x, 0, 0.1);
    }
    if (this.bodyParts.leftLeg) {
      this.bodyParts.leftLeg.rotation.x = THREE.MathUtils.lerp(this.bodyParts.leftLeg.rotation.x, 0, 0.1);
    }
    if (this.bodyParts.rightLeg) {
      this.bodyParts.rightLeg.rotation.x = THREE.MathUtils.lerp(this.bodyParts.rightLeg.rotation.x, 0, 0.1);
    }
  }

  public getMesh(): THREE.Group {
    return this.humanGroup;
  }

  public getPosition(): THREE.Vector3 {
    return this.humanGroup.position;
  }

  public dispose(): void {
    this.humanGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    
    if (this.humanGroup.parent) {
      this.humanGroup.parent.remove(this.humanGroup);
    }
    
    console.log('👤 [PureHuman] Disposed clean human');
  }
}