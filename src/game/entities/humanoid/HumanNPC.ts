import * as THREE from 'three';
import { EnemyHumanoid } from './EnemyHumanoid';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TavernKeeperBehavior } from '../../ai/TavernKeeperBehavior';

export interface HumanNPCConfig {
  name: string;
  position: THREE.Vector3;
  skinColor: number;
  clothingColor: number;
  hairColor: number;
  scale?: number;
  wanderRadius?: number;
}

export class HumanNPC {
  private mesh: THREE.Group;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private behavior: TavernKeeperBehavior;
  private config: HumanNPCConfig;
  
  // Human body parts
  private bodyParts: {
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    hair?: THREE.Mesh;
  } = {} as any;
  
  private walkTime: number = 0;
  private isDead: boolean = false;

  constructor(
    scene: THREE.Scene,
    config: HumanNPCConfig,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.config = config;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    this.mesh = new THREE.Group();
    this.createHumanBody();
    this.setupBehavior();
    
    // Position the NPC
    this.mesh.position.copy(config.position);
    scene.add(this.mesh);
    
    console.log(`👤 [HumanNPC] Created ${config.name} at position:`, config.position);
  }

  private createHumanBody(): void {
    const scale = this.config.scale || 1;
    
    // More realistic human proportions compared to orc enemies
    const humanProportions = {
      bodyRadius: 0.25 * scale,
      bodyHeight: 1.4 * scale,
      headRadius: 0.22 * scale,
      headY: 1.8 * scale,
      armRadius: 0.08 * scale,
      armLength: 0.9 * scale,
      legRadius: 0.1 * scale,
      legLength: 0.9 * scale
    };

    // Body (torso)
    const bodyGeometry = new THREE.CylinderGeometry(
      humanProportions.bodyRadius, 
      humanProportions.bodyRadius * 1.1, 
      humanProportions.bodyHeight, 
      12
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: this.config.clothingColor,
      shininess: 10
    });
    this.bodyParts.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyParts.body.position.y = humanProportions.bodyHeight / 2;
    this.bodyParts.body.castShadow = true;
    this.bodyParts.body.receiveShadow = true;
    this.mesh.add(this.bodyParts.body);

    // Head
    const headGeometry = new THREE.SphereGeometry(humanProportions.headRadius, 16, 12);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: this.config.skinColor,
      shininess: 5
    });
    this.bodyParts.head = new THREE.Mesh(headGeometry, headMaterial);
    this.bodyParts.head.position.y = humanProportions.headY;
    this.bodyParts.head.castShadow = true;
    this.bodyParts.head.receiveShadow = true;
    this.mesh.add(this.bodyParts.head);

    // Hair (simple cap-like hair)
    if (this.config.hairColor) {
      const hairGeometry = new THREE.SphereGeometry(humanProportions.headRadius * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const hairMaterial = new THREE.MeshPhongMaterial({ 
        color: this.config.hairColor,
        shininess: 20
      });
      this.bodyParts.hair = new THREE.Mesh(hairGeometry, hairMaterial);
      this.bodyParts.hair.position.y = humanProportions.headY + humanProportions.headRadius * 0.3;
      this.bodyParts.hair.castShadow = true;
      this.mesh.add(this.bodyParts.hair);
    }

    // Eyes (human eyes, not red like enemies)
    const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 6);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4A4A4A, // Dark eyes
      transparent: false
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, humanProportions.headY + 0.05, humanProportions.headRadius * 0.85);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.08, humanProportions.headY + 0.05, humanProportions.headRadius * 0.85);
    this.mesh.add(leftEye);
    this.mesh.add(rightEye);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(
      humanProportions.armRadius, 
      humanProportions.armRadius * 1.2, 
      humanProportions.armLength, 
      8
    );
    const armMaterial = new THREE.MeshPhongMaterial({ 
      color: this.config.skinColor,
      shininess: 5
    });
    
    this.bodyParts.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.bodyParts.leftArm.position.set(-(humanProportions.bodyRadius + 0.15), humanProportions.bodyHeight * 0.7, 0);
    this.bodyParts.leftArm.rotation.z = 0.2;
    this.bodyParts.leftArm.castShadow = true;
    this.bodyParts.leftArm.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftArm);
    
    this.bodyParts.rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    this.bodyParts.rightArm.position.set(humanProportions.bodyRadius + 0.15, humanProportions.bodyHeight * 0.7, 0);
    this.bodyParts.rightArm.rotation.z = -0.2;
    this.bodyParts.rightArm.castShadow = true;
    this.bodyParts.rightArm.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(
      humanProportions.legRadius, 
      humanProportions.legRadius * 1.3, 
      humanProportions.legLength, 
      8
    );
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513, // Brown pants/trousers
      shininess: 5
    });
    
    this.bodyParts.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.bodyParts.leftLeg.position.set(-humanProportions.bodyRadius * 0.4, humanProportions.legLength / 2, 0);
    this.bodyParts.leftLeg.castShadow = true;
    this.bodyParts.leftLeg.receiveShadow = true;
    this.mesh.add(this.bodyParts.leftLeg);
    
    this.bodyParts.rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    this.bodyParts.rightLeg.position.set(humanProportions.bodyRadius * 0.4, humanProportions.legLength / 2, 0);
    this.bodyParts.rightLeg.castShadow = true;
    this.bodyParts.rightLeg.receiveShadow = true;
    this.mesh.add(this.bodyParts.rightLeg);
  }

  private setupBehavior(): void {
    this.behavior = new TavernKeeperBehavior({
      wanderRadius: this.config.wanderRadius || 8,
      moveSpeed: 1.5,
      pauseDuration: 3000,
      interactionRadius: 15
    });
    
    console.log(`🧠 [HumanNPC] Setup tavern keeper behavior for ${this.config.name}`);
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.isDead) return;

    // Update AI behavior
    const action = this.behavior.update(deltaTime, this.mesh.position, playerPosition);
    
    // Handle movement based on behavior
    if (action.type === 'move' && action.target) {
      this.moveTowards(action.target, deltaTime);
      this.updateWalkAnimation(deltaTime);
    } else if (action.type === 'idle') {
      this.updateIdleAnimation(deltaTime);
    }
  }

  private moveTowards(target: THREE.Vector3, deltaTime: number): void {
    const direction = new THREE.Vector3()
      .subVectors(target, this.mesh.position)
      .normalize();
    direction.y = 0; // Keep on ground level
    
    const moveSpeed = 1.5 * deltaTime;
    const newPosition = this.mesh.position.clone();
    newPosition.add(direction.multiplyScalar(moveSpeed));
    newPosition.y = 0; // Ensure stays on ground
    
    // Check distance to avoid overshooting
    const distanceToTarget = this.mesh.position.distanceTo(target);
    if (distanceToTarget > 0.5) {
      this.mesh.position.copy(newPosition);
      
      // Update rotation to face movement direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, 0.1);
    }
  }

  private updateWalkAnimation(deltaTime: number): void {
    this.walkTime += deltaTime * 3;
    
    const armSwing = Math.sin(this.walkTime) * 0.3;
    const legSwing = Math.sin(this.walkTime + Math.PI) * 0.4;
    
    // Animate arms and legs for walking
    this.bodyParts.leftArm.rotation.x = armSwing;
    this.bodyParts.rightArm.rotation.x = -armSwing;
    this.bodyParts.leftLeg.rotation.x = legSwing;
    this.bodyParts.rightLeg.rotation.x = -legSwing;
    
    // Slight body bob while walking
    this.bodyParts.body.position.y = 0.7 + Math.sin(this.walkTime * 2) * 0.02;
  }

  private updateIdleAnimation(deltaTime: number): void {
    this.walkTime += deltaTime;
    
    // Reset limb positions gradually
    this.bodyParts.leftArm.rotation.x = THREE.MathUtils.lerp(this.bodyParts.leftArm.rotation.x, 0, 0.05);
    this.bodyParts.rightArm.rotation.x = THREE.MathUtils.lerp(this.bodyParts.rightArm.rotation.x, 0, 0.05);
    this.bodyParts.leftLeg.rotation.x = THREE.MathUtils.lerp(this.bodyParts.leftLeg.rotation.x, 0, 0.05);
    this.bodyParts.rightLeg.rotation.x = THREE.MathUtils.lerp(this.bodyParts.rightLeg.rotation.x, 0, 0.05);
    
    // Gentle idle breathing animation
    this.bodyParts.body.position.y = 0.7 + Math.sin(this.walkTime * 2) * 0.01;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getName(): string {
    return this.config.name;
  }

  public getIsDead(): boolean {
    return this.isDead;
  }

  public dispose(): void {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    
    // Dispose of all geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    console.log(`👤 [HumanNPC] Disposed ${this.config.name}`);
  }

  public static createTavernKeeper(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): HumanNPC {
    return new HumanNPC(scene, {
      name: 'Tavern Keeper',
      position: position,
      skinColor: 0xFFDBAE, // Human skin tone
      clothingColor: 0x8B4513, // Brown apron/shirt
      hairColor: 0x654321, // Brown hair
      scale: 1.0,
      wanderRadius: 8
    }, effectsManager, audioManager);
  }
}