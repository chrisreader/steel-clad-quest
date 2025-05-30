
import * as THREE from 'three';
import { BaseWeapon, WeaponConfig, WeaponStats } from '../BaseWeapon';

export class HuntingBow extends BaseWeapon {
  private bowString: THREE.Mesh | null = null;
  private chargeLevel: number = 0;
  private maxChargeTime: number = 3; // 3 seconds for full charge
  private isDrawing: boolean = false;
  private shakeOffset: number = 0;

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
    
    // Bow limbs
    const limbGeometry = new THREE.CylinderGeometry(0.02, 0.03, 1.2);
    const limbMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    
    // Upper limb
    const upperLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    upperLimb.position.y = 0.3;
    upperLimb.rotation.z = 0.1;
    bowGroup.add(upperLimb);
    
    // Lower limb
    const lowerLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    lowerLimb.position.y = -0.3;
    lowerLimb.rotation.z = -0.1;
    bowGroup.add(lowerLimb);
    
    // Handle/grip
    const handleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    bowGroup.add(handle);
    
    // Bow string (using mesh instead of line)
    this.createBowString(bowGroup);
    
    // Scale and position for first-person view
    bowGroup.scale.set(0.8, 0.8, 0.8);
    bowGroup.position.set(0.3, -0.2, -0.5);
    bowGroup.rotation.set(0, Math.PI / 2, 0);
    
    return bowGroup;
  }

  private createBowString(bowGroup: THREE.Group): void {
    // Create a thin cylinder mesh for the bow string
    const stringGeometry = new THREE.CylinderGeometry(0.002, 0.002, 1.2);
    const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    this.bowString = new THREE.Mesh(stringGeometry, stringMaterial);
    this.bowString.position.set(0, 0, 0);
    bowGroup.add(this.bowString);
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
    // Return the bow string as the blade reference
    if (this.bowString) {
      return this.bowString;
    }
    
    // Fallback: create a simple mesh if no bow string found
    const fallbackGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const fallbackMaterial = new THREE.MeshBasicMaterial({ visible: false });
    return new THREE.Mesh(fallbackGeometry, fallbackMaterial);
  }

  public startDrawing(): void {
    this.isDrawing = true;
    this.chargeLevel = 0;
  }

  public stopDrawing(): void {
    this.isDrawing = false;
    this.chargeLevel = 0;
    this.updateBowString();
  }

  public updateCharge(deltaTime: number): void {
    if (!this.isDrawing) return;
    
    this.chargeLevel = Math.min(this.chargeLevel + (deltaTime / this.maxChargeTime), 1.0);
    this.updateBowString();
    
    // Add shake effect when fully charged
    if (this.chargeLevel >= 1.0) {
      this.shakeOffset = Math.sin(Date.now() * 0.01) * 0.002;
      this.mesh.position.x += this.shakeOffset;
    }
  }

  private updateBowString(): void {
    if (!this.bowString) return;
    
    const pullback = this.chargeLevel * 0.3; // Maximum pullback distance
    this.bowString.position.x = -pullback;
  }

  public getChargeLevel(): number {
    return this.chargeLevel;
  }

  public isFullyCharged(): boolean {
    return this.chargeLevel >= 1.0;
  }

  public getChargeDamage(): number {
    const baseDamage = this.config.stats.damage;
    const chargeMultiplier = Math.max(0.3, this.chargeLevel); // Minimum 30% damage
    return Math.floor(baseDamage * chargeMultiplier);
  }

  public getArrowSpeed(): number {
    const baseSpeed = 20;
    return baseSpeed * (0.5 + this.chargeLevel * 0.5); // 50% to 100% speed
  }
}
