
import * as THREE from 'three';
import { BaseBow, DrawStage } from './BaseBow';
import { WeaponConfig, WeaponStats } from '../BaseWeapon';

export class HuntingBow extends BaseBow {
  private bowString: THREE.Mesh | null = null;
  private upperLimb: THREE.Mesh | null = null;
  private lowerLimb: THREE.Mesh | null = null;
  private handle: THREE.Mesh | null = null;
  private arrowRest: THREE.Mesh | null = null;
  
  // Original limb rotations for reset
  private originalUpperLimbRotation: number = 0.15;
  private originalLowerLimbRotation: number = -0.15;
  private originalStringPosition: number = 0;

  constructor() {
    const config: WeaponConfig = {
      id: 'hunting_bow',
      name: 'Hunting Bow',
      type: 'bow',
      handRequirement: 'two-handed',
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
    console.log("🏹 [HuntingBow] Initialized with unified bow system");
  }

  public createMesh(): THREE.Group {
    const bowGroup = new THREE.Group();
    
    this.createEnhancedBowLimbs(bowGroup);
    this.createDetailedBowHandle(bowGroup);
    this.createRealisticBowString(bowGroup);
    this.createArrowRest(bowGroup);
    this.addBowTips(bowGroup);
    
    bowGroup.scale.set(1.2, 1.2, 1.2);
    bowGroup.position.set(0, 0, 0);
    
    console.log("🏹 [HuntingBow] Bow oriented vertically (up/down) - unified system");
    
    return bowGroup;
  }

  private createEnhancedBowLimbs(bowGroup: THREE.Group): void {
    const upperLimbCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.025, 0.35, 0.15),
      new THREE.Vector3(0.01, 0.75, 0.08)
    );
    
    const lowerLimbCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.025, -0.35, 0.15),
      new THREE.Vector3(0.01, -0.75, 0.08)
    );
    
    const limbGeometry = new THREE.TubeGeometry(upperLimbCurve, 24, 0.03, 8, false);
    const limbMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4a3f35,
      emissive: 0x2d1f17,
      emissiveIntensity: 0.1
    });
    
    this.upperLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    this.upperLimb.position.set(0, 0.15, 0);
    this.upperLimb.rotation.z = this.originalUpperLimbRotation;
    bowGroup.add(this.upperLimb);
    
    const lowerLimbGeometry = new THREE.TubeGeometry(lowerLimbCurve, 24, 0.03, 8, false);
    this.lowerLimb = new THREE.Mesh(lowerLimbGeometry, limbMaterial.clone());
    this.lowerLimb.position.set(0, -0.15, 0);
    this.lowerLimb.rotation.z = this.originalLowerLimbRotation;
    bowGroup.add(this.lowerLimb);
  }

  private createDetailedBowHandle(bowGroup: THREE.Group): void {
    const handleGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.4);
    const handleMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x6b4e3d,
      emissive: 0x4a3529,
      emissiveIntensity: 0.05
    });
    
    this.handle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.handle.position.set(0, 0, 0);
    bowGroup.add(this.handle);
    
    for (let i = 0; i < 6; i++) {
      const wrapGeometry = new THREE.TorusGeometry(0.058, 0.009, 6, 12);
      const wrapMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3e2723,
        emissive: 0x1c1410,
        emissiveIntensity: 0.02
      });
      const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
      wrap.position.set(0, -0.18 + (i * 0.06), 0);
      wrap.rotation.x = Math.PI / 2;
      bowGroup.add(wrap);
    }
    
    const sightGeometry = new THREE.RingGeometry(0.06, 0.07, 8);
    const sightMaterial = new THREE.MeshLambertMaterial({ color: 0x2c1810 });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.set(0, 0.05, -0.08);
    sight.rotation.x = Math.PI / 2;
    bowGroup.add(sight);
  }

  private createRealisticBowString(bowGroup: THREE.Group): void {
    const stringGeometry = new THREE.CylinderGeometry(0.003, 0.003, 1.5);
    const stringMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf5f5dc,
      emissive: 0x332211,
      emissiveIntensity: 0.1
    });
    
    this.bowString = new THREE.Mesh(stringGeometry, stringMaterial);
    this.bowString.position.set(0, 0, 0);
    this.originalStringPosition = this.bowString.position.z;
    bowGroup.add(this.bowString);
  }

  private createArrowRest(bowGroup: THREE.Group): void {
    const restGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.1);
    const restMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8d6e63,
      emissive: 0x3e2723,
      emissiveIntensity: 0.03
    });
    
    this.arrowRest = new THREE.Mesh(restGeometry, restMaterial);
    this.arrowRest.position.set(0, 0.03, -0.08);
    bowGroup.add(this.arrowRest);
    
    const notchGeometry = new THREE.SphereGeometry(0.008, 6, 4);
    const notch = new THREE.Mesh(notchGeometry, restMaterial.clone());
    notch.position.set(0, 0.03, -0.08);
    bowGroup.add(notch);
  }

  private addBowTips(bowGroup: THREE.Group): void {
    const tipGeometry = new THREE.ConeGeometry(0.025, 0.06, 8);
    const tipMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xa0826d,
      emissive: 0x2d1f17,
      emissiveIntensity: 0.02
    });
    
    const upperTip = new THREE.Mesh(tipGeometry, tipMaterial);
    upperTip.position.set(0, 0.8, 0.05);
    upperTip.rotation.x = Math.PI;
    bowGroup.add(upperTip);
    
    const lowerTip = new THREE.Mesh(tipGeometry, tipMaterial.clone());
    lowerTip.position.set(0, -0.8, 0.05);
    bowGroup.add(lowerTip);
    
    const attachGeometry = new THREE.SphereGeometry(0.008, 6, 6);
    const attachMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    
    const upperAttach = new THREE.Mesh(attachGeometry, attachMaterial);
    upperAttach.position.set(0, 0.75, 0.05);
    bowGroup.add(upperAttach);
    
    const lowerAttach = new THREE.Mesh(attachGeometry, attachMaterial.clone());
    lowerAttach.position.set(0, -0.75, 0.05);
    bowGroup.add(lowerAttach);
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.05, 1.2, 0.05);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    
    return new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
  }

  public getBladeReference(): THREE.Mesh {
    return this.bowString || new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1, 0.05),
      new THREE.MeshBasicMaterial({ visible: false })
    );
  }

  protected updateBowVisuals(): void {
    if (!this.bowString || !this.upperLimb || !this.lowerLimb) return;
    
    const pullback = this.easeInOutQuad(Math.min(this.chargeLevel, 1.0)) * 0.8;
    const limbBend = this.easeInOutQuad(Math.min(this.chargeLevel, 1.0)) * 0.5;
    
    this.bowString.position.z = this.originalStringPosition + pullback;
    this.bowString.scale.y = 1 + (this.chargeLevel * 0.12);
    
    const upperLimbRotation = this.originalUpperLimbRotation + limbBend;
    const lowerLimbRotation = this.originalLowerLimbRotation - limbBend;
    
    this.upperLimb.rotation.z = upperLimbRotation;
    this.lowerLimb.rotation.z = lowerLimbRotation;
    
    this.updateStrainEffects();
  }

  private updateStrainEffects(): void {
    if (!this.upperLimb || !this.lowerLimb) return;
    
    if (this.chargeLevel > 0.7) {
      const strainIntensity = (this.chargeLevel - 0.7) * 3.33;
      const strainColor = new THREE.Color().lerpColors(
        new THREE.Color(0x4a3f35),
        new THREE.Color(0x8d6e63),
        strainIntensity
      );
      
      const upperMaterial = this.upperLimb.material;
      const lowerMaterial = this.lowerLimb.material;
      
      if (upperMaterial instanceof THREE.MeshLambertMaterial) {
        upperMaterial.color.copy(strainColor);
      }
      if (lowerMaterial instanceof THREE.MeshLambertMaterial) {
        lowerMaterial.color.copy(strainColor);
      }
    } else {
      const upperMaterial = this.upperLimb.material;
      const lowerMaterial = this.lowerLimb.material;
      
      if (upperMaterial instanceof THREE.MeshLambertMaterial) {
        upperMaterial.color.setHex(0x4a3f35);
      }
      if (lowerMaterial instanceof THREE.MeshLambertMaterial) {
        lowerMaterial.color.setHex(0x4a3f35);
      }
    }
  }

  protected applyShakeEffect(): void {
    if (!this.mesh || this.shakeIntensity === 0) return;
    
    const shakeX = Math.sin(this.shakeTime * 1.5) * this.shakeIntensity;
    const shakeY = Math.sin(this.shakeTime * 2.1) * this.shakeIntensity * 0.8;
    const shakeZ = Math.sin(this.shakeTime * 1.7) * this.shakeIntensity * 0.6;
    
    this.mesh.position.x += shakeX;
    this.mesh.position.y += shakeY;
    this.mesh.position.z += shakeZ;
    
    const rotShakeX = Math.sin(this.shakeTime * 1.3) * this.shakeIntensity * 0.4;
    const rotShakeY = Math.sin(this.shakeTime * 1.9) * this.shakeIntensity * 0.3;
    const rotShakeZ = Math.sin(this.shakeTime * 1.6) * this.shakeIntensity * 0.5;
    
    this.mesh.rotation.x += rotShakeX;
    this.mesh.rotation.y += rotShakeY;
    this.mesh.rotation.z += rotShakeZ;
  }
}
