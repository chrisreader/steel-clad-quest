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
  private drawingState: boolean = false;
  private currentDrawStage: DrawStage = DrawStage.IDLE;
  private shakeIntensity: number = 0;
  private shakeTime: number = 0;
  
  // Original limb rotations for reset
  private originalUpperLimbRotation: number = 0.15;
  private originalLowerLimbRotation: number = -0.15;
  
  // Original string position for pullback animation
  private originalStringPosition: number = 0;

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
    console.log("🏹 [HuntingBow] Initialized with enhanced charging system");
  }

  public createMesh(): THREE.Group {
    const bowGroup = new THREE.Group();
    
    // Create enhanced bow components with realistic geometry
    this.createEnhancedBowLimbs(bowGroup);
    this.createDetailedBowHandle(bowGroup);
    this.createRealisticBowString(bowGroup);
    this.createArrowRest(bowGroup);
    this.addBowTips(bowGroup);
    
    // FIXED: Removed the problematic rotation - bow now naturally points up/down
    // bowGroup.rotation.z = Math.PI / 2; // REMOVED this line
    
    // Optimized positioning for realistic archery hold
    bowGroup.scale.set(1.2, 1.2, 1.2);
    bowGroup.position.set(0, 0, 0);
    
    console.log("🏹 [HuntingBow] Bow oriented perfectly vertical (up/down) - X-axis offsets removed");
    
    return bowGroup;
  }

  private createEnhancedBowLimbs(bowGroup: THREE.Group): void {
    // FIXED: Create perfectly vertical bow limbs by removing X-axis offsets
    const upperLimbCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.35, 0.15),
      new THREE.Vector3(0, 0.75, 0.08)
    );
    
    const lowerLimbCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.35, 0.15),
      new THREE.Vector3(0, -0.75, 0.08)
    );
    
    // Enhanced limb geometry with better detail
    const limbGeometry = new THREE.TubeGeometry(upperLimbCurve, 24, 0.03, 8, false);
    const limbMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4a3f35,
      emissive: 0x2d1f17,
      emissiveIntensity: 0.1
    });
    
    // Upper limb with enhanced positioning
    this.upperLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    this.upperLimb.position.set(0, 0.15, 0);
    this.upperLimb.rotation.z = this.originalUpperLimbRotation;
    bowGroup.add(this.upperLimb);
    
    // Lower limb (using separate geometry for different curve)
    const lowerLimbGeometry = new THREE.TubeGeometry(lowerLimbCurve, 24, 0.03, 8, false);
    this.lowerLimb = new THREE.Mesh(lowerLimbGeometry, limbMaterial.clone());
    this.lowerLimb.position.set(0, -0.15, 0);
    this.lowerLimb.rotation.z = this.originalLowerLimbRotation;
    bowGroup.add(this.lowerLimb);
  }

  private createDetailedBowHandle(bowGroup: THREE.Group): void {
    // Main handle with enhanced proportions
    const handleGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.4);
    const handleMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x6b4e3d,
      emissive: 0x4a3529,
      emissiveIntensity: 0.05
    });
    
    this.handle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.handle.position.set(0, 0, 0);
    bowGroup.add(this.handle);
    
    // Enhanced grip wrapping with more detail
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
    
    // FIXED: Add sight window positioned for vertical bow orientation
    const sightGeometry = new THREE.RingGeometry(0.06, 0.07, 8);
    const sightMaterial = new THREE.MeshLambertMaterial({ color: 0x2c1810 });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.set(0, 0.05, -0.08); // Adjusted for vertical orientation
    sight.rotation.x = Math.PI / 2; // Rotated for proper facing
    bowGroup.add(sight);
  }

  private createRealisticBowString(bowGroup: THREE.Group): void {
    // Create bow string with proper material and enhanced pullback capability
    const stringGeometry = new THREE.CylinderGeometry(0.003, 0.003, 1.5);
    const stringMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf5f5dc,
      emissive: 0x332211,
      emissiveIntensity: 0.1
    });
    
    this.bowString = new THREE.Mesh(stringGeometry, stringMaterial);
    this.bowString.position.set(0, 0, 0);
    this.originalStringPosition = this.bowString.position.z; // Store original Z position for vertical bow
    bowGroup.add(this.bowString);
  }

  private createArrowRest(bowGroup: THREE.Group): void {
    // FIXED: Enhanced arrow rest design positioned for vertical bow
    const restGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.1);
    const restMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8d6e63,
      emissive: 0x3e2723,
      emissiveIntensity: 0.03
    });
    
    this.arrowRest = new THREE.Mesh(restGeometry, restMaterial);
    this.arrowRest.position.set(0, 0.03, -0.08); // Centered on X-axis
    bowGroup.add(this.arrowRest);
    
    // Add small notch detail
    const notchGeometry = new THREE.SphereGeometry(0.008, 6, 4);
    const notch = new THREE.Mesh(notchGeometry, restMaterial.clone());
    notch.position.set(0, 0.03, -0.08); // Centered on X-axis
    bowGroup.add(notch);
  }

  private addBowTips(bowGroup: THREE.Group): void {
    // FIXED: Enhanced bow tips (nocks) perfectly centered on X-axis
    const tipGeometry = new THREE.ConeGeometry(0.025, 0.06, 8);
    const tipMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xa0826d,
      emissive: 0x2d1f17,
      emissiveIntensity: 0.02
    });
    
    // Upper tip - centered on X-axis
    const upperTip = new THREE.Mesh(tipGeometry, tipMaterial);
    upperTip.position.set(0, 0.8, 0.08);
    upperTip.rotation.x = Math.PI;
    bowGroup.add(upperTip);
    
    // Lower tip - centered on X-axis
    const lowerTip = new THREE.Mesh(tipGeometry, tipMaterial.clone());
    lowerTip.position.set(0, -0.8, 0.08);
    bowGroup.add(lowerTip);
    
    // Add string attachment points - centered on X-axis
    const attachGeometry = new THREE.SphereGeometry(0.008, 6, 6);
    const attachMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    
    const upperAttach = new THREE.Mesh(attachGeometry, attachMaterial);
    upperAttach.position.set(0, 0.75, 0.08);
    bowGroup.add(upperAttach);
    
    const lowerAttach = new THREE.Mesh(attachGeometry, attachMaterial.clone());
    lowerAttach.position.set(0, -0.75, 0.08);
    bowGroup.add(lowerAttach);
  }

  public createHitBox(): THREE.Mesh {
    // Smaller hitbox for bow (not used for combat, just reference)
    const hitBoxGeometry = new THREE.BoxGeometry(0.05, 1.2, 0.05);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    
    return new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
  }

  public getBladeReference(): THREE.Mesh {
    // For bows, return the bow string as the reference for effects
    return this.bowString || new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1, 0.05),
      new THREE.MeshBasicMaterial({ visible: false })
    );
  }

  public isDrawing(): boolean {
    return this.drawingState;
  }

  public startDrawing(): void {
    this.drawingState = true;
    this.chargeLevel = 0;
    this.updateDrawStage();
    console.log('🏹 [HuntingBow] Started drawing bow with enhanced charging and debug');
  }

  public stopDrawing(): void {
    this.drawingState = false;
    this.chargeLevel = 0;
    this.currentDrawStage = DrawStage.IDLE;
    this.shakeIntensity = 0;
    this.updateBowVisuals();
    console.log('🏹 [HuntingBow] Stopped drawing bow and reset charge');
  }

  public updateCharge(deltaTime: number): void {
    if (!this.drawingState) return;
    
    // Enhanced charge calculation with better timing
    const chargeRate = 1.0 / this.maxChargeTime; // Charge per second
    this.chargeLevel = Math.min(this.chargeLevel + (deltaTime * chargeRate), 1.2); // Allow slight overcharge
    
    this.updateDrawStage();
    this.updateBowVisuals();
    
    // Debug charging
    if (this.chargeLevel > 0.1) {
      console.log(`🏹 [HuntingBow] Charging: ${(this.chargeLevel * 100).toFixed(1)}% (Stage: ${this.currentDrawStage})`);
    }
    
    // Handle overcharged shake with enhanced effect
    if (this.chargeLevel >= 1.0) {
      this.shakeTime += deltaTime * 15; // Faster shake
      this.shakeIntensity = 0.015 + Math.sin(this.shakeTime) * 0.008; // More intense shake
      this.applyEnhancedShakeEffect();
    }
  }

  private updateDrawStage(): void {
    const prevStage = this.currentDrawStage;
    
    if (this.chargeLevel === 0) {
      this.currentDrawStage = DrawStage.IDLE;
    } else if (this.chargeLevel < 0.25) {
      this.currentDrawStage = DrawStage.EARLY_DRAW;
    } else if (this.chargeLevel < 0.6) {
      this.currentDrawStage = DrawStage.MID_DRAW;
    } else if (this.chargeLevel < 1.0) {
      this.currentDrawStage = DrawStage.FULL_DRAW;
    } else {
      this.currentDrawStage = DrawStage.OVERCHARGED;
    }
    
    if (prevStage !== this.currentDrawStage) {
      console.log(`🏹 [HuntingBow] Draw stage: ${prevStage} -> ${this.currentDrawStage} (${Math.round(this.chargeLevel * 100)}%)`);
    }
  }

  private updateBowVisuals(): void {
    if (!this.bowString || !this.upperLimb || !this.lowerLimb) return;
    
    // Enhanced draw mechanics with more dramatic string pullback
    const pullback = this.easeInOutQuad(Math.min(this.chargeLevel, 1.0)) * 0.8; // Increased pullback distance
    const limbBend = this.easeInOutQuad(Math.min(this.chargeLevel, 1.0)) * 0.5; // More limb bend
    
    // FIXED: Update string position for vertical bow - moves toward player (positive Z for vertical bow)
    this.bowString.position.z = this.originalStringPosition + pullback;
    this.bowString.scale.y = 1 + (this.chargeLevel * 0.12); // More visible stretch
    
    // Enhanced limb bending with more dramatic physics
    const upperLimbRotation = this.originalUpperLimbRotation + limbBend;
    const lowerLimbRotation = this.originalLowerLimbRotation - limbBend;
    
    this.upperLimb.rotation.z = upperLimbRotation;
    this.lowerLimb.rotation.z = lowerLimbRotation;
    
    // Advanced visual strain effects
    this.updateStrainEffects();
    
    console.log(`🏹 [HuntingBow] Visual update - Pullback: ${pullback.toFixed(2)}, Limb bend: ${limbBend.toFixed(2)}`);
  }

  private updateStrainEffects(): void {
    if (!this.upperLimb || !this.lowerLimb) return;
    
    // Add visual strain effects for high charge with proper type checking
    if (this.chargeLevel > 0.7) {
      const strainIntensity = (this.chargeLevel - 0.7) * 3.33; // Normalize to 0-1
      const strainColor = new THREE.Color().lerpColors(
        new THREE.Color(0x4a3f35),
        new THREE.Color(0x8d6e63),
        strainIntensity
      );
      
      // Fixed: Proper type checking for material color access
      const upperMaterial = this.upperLimb.material;
      const lowerMaterial = this.lowerLimb.material;
      
      if (upperMaterial instanceof THREE.MeshLambertMaterial) {
        upperMaterial.color.copy(strainColor);
      }
      if (lowerMaterial instanceof THREE.MeshLambertMaterial) {
        lowerMaterial.color.copy(strainColor);
      }
    } else {
      // Reset to normal color with proper type checking
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

  private applyEnhancedShakeEffect(): void {
    if (!this.mesh || this.shakeIntensity === 0) return;
    
    // Enhanced multi-axis shake with realistic tremor
    const shakeX = Math.sin(this.shakeTime * 1.5) * this.shakeIntensity;
    const shakeY = Math.sin(this.shakeTime * 2.1) * this.shakeIntensity * 0.8;
    const shakeZ = Math.sin(this.shakeTime * 1.7) * this.shakeIntensity * 0.6;
    
    this.mesh.position.x += shakeX;
    this.mesh.position.y += shakeY;
    this.mesh.position.z += shakeZ;
    
    // Enhanced rotation shake
    const rotShakeX = Math.sin(this.shakeTime * 1.3) * this.shakeIntensity * 0.4;
    const rotShakeY = Math.sin(this.shakeTime * 1.9) * this.shakeIntensity * 0.3;
    const rotShakeZ = Math.sin(this.shakeTime * 1.6) * this.shakeIntensity * 0.5;
    
    this.mesh.rotation.x += rotShakeX;
    this.mesh.rotation.y += rotShakeY;
    this.mesh.rotation.z += rotShakeZ;
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  public getChargeLevel(): number {
    return Math.min(this.chargeLevel, 1.0); // Cap at 1.0 for external systems
  }

  public isFullyCharged(): boolean {
    return this.chargeLevel >= 1.0;
  }

  public getChargeDamage(): number {
    const baseDamage = this.config.stats.damage;
    const chargeMultiplier = Math.max(0.3, Math.min(this.chargeLevel, 1.0)); // Minimum 30% damage
    const damage = Math.floor(baseDamage * chargeMultiplier);
    console.log(`🏹 [HuntingBow] Damage calculation - Base: ${baseDamage}, Multiplier: ${chargeMultiplier.toFixed(2)}, Final: ${damage}`);
    return damage;
  }

  public getArrowSpeed(): number {
    const baseSpeed = 25; // Increased base speed
    const chargeMultiplier = 0.5 + (Math.min(this.chargeLevel, 1.0) * 0.5);
    const speed = baseSpeed * chargeMultiplier;
    console.log(`🏹 [HuntingBow] Speed calculation - Base: ${baseSpeed}, Multiplier: ${chargeMultiplier.toFixed(2)}, Final: ${speed.toFixed(1)}`);
    return speed;
  }

  public getCurrentDrawStage(): DrawStage {
    return this.currentDrawStage;
  }
}
