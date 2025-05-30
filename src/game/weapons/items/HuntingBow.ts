
import * as THREE from 'three';
import { BaseWeapon, WeaponConfig, WeaponStats } from '../BaseWeapon';

// Draw stage enumeration for better state management
enum DrawStage {
  IDLE = 'idle',
  EARLY_DRAW = 'early_draw',
  MID_DRAW = 'mid_draw',
  FULL_DRAW = 'full_draw',
  OVERCHARGED = 'overcharged'
}

export class HuntingBow extends BaseWeapon {
  private bowString: THREE.Mesh | null = null;
  private upperLimb: THREE.Mesh | null = null;
  private lowerLimb: THREE.Mesh | null = null;
  private handle: THREE.Mesh | null = null;
  private arrowRest: THREE.Mesh | null = null;
  
  private chargeLevel: number = 0;
  private maxChargeTime: number = 3;
  private isDrawing: boolean = false;
  private currentDrawStage: DrawStage = DrawStage.IDLE;
  private shakeIntensity: number = 0;
  private shakeTime: number = 0;
  
  // Original limb rotations for reset
  private originalUpperLimbRotation: number = 0.15;
  private originalLowerLimbRotation: number = -0.15;

  constructor() {
    const config: WeaponConfig = {
      id: 'hunting_bow',
      name: 'Hunting Bow',
      type: 'bow',
      stats: {
        damage: 8,
        attackSpeed: 1.0,
        range: 50,
        durability: 200,
        weight: 1.5
      } as WeaponStats,
      swingAnimation: {
        duration: 1000,
        phases: {
          windup: 0.3,
          slash: 0.4,
          recovery: 0.3
        },
        rotations: {
          neutral: { x: 0, y: 0, z: 0 },
          windup: { x: -0.3, y: 0, z: 0 },
          slash: { x: 0.3, y: 0, z: 0 }
        }
      }
    };
    
    super(config);
  }

  public createMesh(): THREE.Group {
    const bowGroup = new THREE.Group();
    
    // Create enhanced bow components
    this.createBowLimbs(bowGroup);
    this.createBowHandle(bowGroup);
    this.createBowString(bowGroup);
    this.createArrowRest(bowGroup);
    
    // Position for optimal first-person view
    bowGroup.scale.set(1.2, 1.2, 1.2);
    bowGroup.position.set(0.4, -0.3, -0.8);
    bowGroup.rotation.set(0, Math.PI / 2 + 0.2, 0.1);
    
    return bowGroup;
  }

  private createBowLimbs(bowGroup: THREE.Group): void {
    // Create curved geometry for more realistic bow limbs
    const limbCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, 0.4, 0),
      new THREE.Vector3(0, 0.8, 0)
    );
    
    const limbGeometry = new THREE.TubeGeometry(limbCurve, 20, 0.025, 8, false);
    const limbMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x5d4037,
      emissive: 0x3e2723,
      emissiveIntensity: 0.1
    });
    
    // Upper limb
    this.upperLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    this.upperLimb.position.set(0, 0.2, 0);
    this.upperLimb.rotation.z = this.originalUpperLimbRotation;
    bowGroup.add(this.upperLimb);
    
    // Lower limb (mirrored)
    this.lowerLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    this.lowerLimb.position.set(0, -0.2, 0);
    this.lowerLimb.rotation.z = this.originalLowerLimbRotation;
    this.lowerLimb.rotation.x = Math.PI;
    bowGroup.add(this.lowerLimb);
    
    // Add bow tips (nocks)
    this.createBowTips(bowGroup);
  }

  private createBowTips(bowGroup: THREE.Group): void {
    const tipGeometry = new THREE.SphereGeometry(0.03, 8, 6);
    const tipMaterial = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    
    // Upper tip
    const upperTip = new THREE.Mesh(tipGeometry, tipMaterial);
    upperTip.position.set(0, 0.9, 0);
    bowGroup.add(upperTip);
    
    // Lower tip
    const lowerTip = new THREE.Mesh(tipGeometry, tipMaterial);
    lowerTip.position.set(0, -0.9, 0);
    bowGroup.add(lowerTip);
  }

  private createBowHandle(bowGroup: THREE.Group): void {
    // Main handle
    const handleGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.35);
    const handleMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x6d4c41,
      emissive: 0x5d4037,
      emissiveIntensity: 0.05
    });
    
    this.handle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.handle.position.set(0, 0, 0);
    bowGroup.add(this.handle);
    
    // Grip wrapping details
    for (let i = 0; i < 5; i++) {
      const wrapGeometry = new THREE.TorusGeometry(0.048, 0.008, 6, 12);
      const wrapMaterial = new THREE.MeshLambertMaterial({ color: 0x4e342e });
      const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
      wrap.position.set(0, -0.15 + (i * 0.06), 0);
      wrap.rotation.x = Math.PI / 2;
      bowGroup.add(wrap);
    }
  }

  private createBowString(bowGroup: THREE.Group): void {
    // Create bow string as a thin cylinder
    const stringGeometry = new THREE.CylinderGeometry(0.003, 0.003, 1.8);
    const stringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xf5f5dc,
      emissive: 0x333333,
      emissiveIntensity: 0.1
    });
    
    this.bowString = new THREE.Mesh(stringGeometry, stringMaterial);
    this.bowString.position.set(0, 0, 0);
    bowGroup.add(this.bowString);
  }

  private createArrowRest(bowGroup: THREE.Group): void {
    const restGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.08);
    const restMaterial = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    
    this.arrowRest = new THREE.Mesh(restGeometry, restMaterial);
    this.arrowRest.position.set(-0.06, 0.02, 0);
    bowGroup.add(this.arrowRest);
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    
    return new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
  }

  public getBladeReference(): THREE.Mesh {
    return this.bowString || new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1, 0.1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
  }

  public startDrawing(): void {
    this.isDrawing = true;
    this.chargeLevel = 0;
    this.updateDrawStage();
  }

  public stopDrawing(): void {
    this.isDrawing = false;
    this.chargeLevel = 0;
    this.currentDrawStage = DrawStage.IDLE;
    this.shakeIntensity = 0;
    this.updateBowVisuals();
  }

  public updateCharge(deltaTime: number): void {
    if (!this.isDrawing) return;
    
    this.chargeLevel = Math.min(this.chargeLevel + (deltaTime / this.maxChargeTime), 1.0);
    this.updateDrawStage();
    this.updateBowVisuals();
    
    // Handle overcharged shake
    if (this.chargeLevel >= 1.0) {
      this.shakeTime += deltaTime * 10;
      this.shakeIntensity = 0.008 + Math.sin(this.shakeTime) * 0.003;
      this.applyShakeEffect();
    }
  }

  private updateDrawStage(): void {
    const prevStage = this.currentDrawStage;
    
    if (this.chargeLevel === 0) {
      this.currentDrawStage = DrawStage.IDLE;
    } else if (this.chargeLevel < 0.33) {
      this.currentDrawStage = DrawStage.EARLY_DRAW;
    } else if (this.chargeLevel < 0.67) {
      this.currentDrawStage = DrawStage.MID_DRAW;
    } else if (this.chargeLevel < 1.0) {
      this.currentDrawStage = DrawStage.FULL_DRAW;
    } else {
      this.currentDrawStage = DrawStage.OVERCHARGED;
    }
    
    if (prevStage !== this.currentDrawStage) {
      console.log(`🏹 [HuntingBow] Draw stage changed: ${prevStage} -> ${this.currentDrawStage}`);
    }
  }

  private updateBowVisuals(): void {
    if (!this.bowString || !this.upperLimb || !this.lowerLimb) return;
    
    const pullback = this.chargeLevel * 0.4; // Maximum pullback distance
    const limbBend = this.chargeLevel * 0.3; // Maximum limb bend
    
    // Update string position
    this.bowString.position.x = -pullback;
    
    // Update limb bending based on charge level
    const upperLimbRotation = this.originalUpperLimbRotation + limbBend;
    const lowerLimbRotation = this.originalLowerLimbRotation - limbBend;
    
    this.upperLimb.rotation.z = upperLimbRotation;
    this.lowerLimb.rotation.z = lowerLimbRotation;
    
    // Add visual strain effects for high charge
    if (this.chargeLevel > 0.8) {
      const strainIntensity = (this.chargeLevel - 0.8) * 5;
      const strainColor = new THREE.Color().lerpColors(
        new THREE.Color(0x5d4037),
        new THREE.Color(0x8d6e63),
        strainIntensity
      );
      
      if (this.upperLimb.material instanceof THREE.MeshLambertMaterial) {
        this.upperLimb.material.color = strainColor;
        this.lowerLimb.material.color = strainColor;
      }
    } else {
      // Reset to normal color
      if (this.upperLimb.material instanceof THREE.MeshLambertMaterial) {
        this.upperLimb.material.color.setHex(0x5d4037);
        this.lowerLimb.material.color.setHex(0x5d4037);
      }
    }
  }

  private applyShakeEffect(): void {
    if (!this.mesh || this.shakeIntensity === 0) return;
    
    // Multi-axis shake for more realistic effect
    const shakeX = Math.sin(this.shakeTime * 1.3) * this.shakeIntensity;
    const shakeY = Math.sin(this.shakeTime * 1.7) * this.shakeIntensity * 0.7;
    const shakeZ = Math.sin(this.shakeTime * 2.1) * this.shakeIntensity * 0.5;
    
    this.mesh.position.x += shakeX;
    this.mesh.position.y += shakeY;
    this.mesh.position.z += shakeZ;
    
    // Add slight rotation shake
    const rotShake = Math.sin(this.shakeTime * 1.5) * this.shakeIntensity * 0.3;
    this.mesh.rotation.z += rotShake;
  }

  public getChargeLevel(): number {
    return this.chargeLevel;
  }

  public isFullyCharged(): boolean {
    return this.chargeLevel >= 1.0;
  }

  public getChargeDamage(): number {
    const baseDamage = this.config.stats.damage;
    const chargeMultiplier = Math.max(0.3, this.chargeLevel);
    return Math.floor(baseDamage * chargeMultiplier);
  }

  public getArrowSpeed(): number {
    const baseSpeed = 20;
    return baseSpeed * (0.5 + this.chargeLevel * 0.5);
  }

  public getCurrentDrawStage(): DrawStage {
    return this.currentDrawStage;
  }
}
