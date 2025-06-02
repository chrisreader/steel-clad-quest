import * as THREE from 'three';
import { PlayerBody, WeaponSwingAnimation } from '../../../types/GameTypes';
import { STANDARD_SWORD_CONFIG } from '../configs/StandardSwordConfig';
import { EffectsManager } from '../../engine/EffectsManager';

export class StandardSwordBehavior {
  private hitBoxMesh: THREE.Mesh | null = null;
  private debugHitBox: THREE.LineSegments | null = null;
  private debugMode: boolean = false;
  
  // Animation state
  private weaponSwing: WeaponSwingAnimation;
  private playerBody: PlayerBody;
  private equippedWeapon: any;
  private effectsManager: EffectsManager | null = null;
  
  // Trail tracking
  private weaponTipPositions: THREE.Vector3[] = [];
  private lastTipTrackTime: number = 0;
  private swooshEffectCreated: boolean = false;
  
  constructor(
    weaponSwing: WeaponSwingAnimation, 
    playerBody: PlayerBody, 
    equippedWeapon: any,
    effectsManager?: EffectsManager
  ) {
    this.weaponSwing = weaponSwing;
    this.playerBody = playerBody;
    this.equippedWeapon = equippedWeapon;
    this.effectsManager = effectsManager || null;
    
    console.log('🗡️ [StandardSwordBehavior] Unified sword behavior system initialized');
  }

  public createHitBox(): THREE.Mesh {
    const { size } = STANDARD_SWORD_CONFIG.hitbox;
    const hitBoxGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    
    this.hitBoxMesh = hitBox;
    this.createDebugHitBox(hitBoxGeometry);
    
    console.log(`🗡️ [StandardSwordBehavior] Created standardized hitbox (${size.width}x${size.height}x${size.depth})`);
    
    return hitBox;
  }

  private createDebugHitBox(geometry: THREE.BoxGeometry): void {
    const { debugConfig } = STANDARD_SWORD_CONFIG.effects;
    const edges = new THREE.EdgesGeometry(geometry);
    const debugMaterial = new THREE.LineBasicMaterial({ 
      color: debugConfig.wireframeColor,
      linewidth: 3,
      transparent: true,
      opacity: debugConfig.opacity
    });
    
    this.debugHitBox = new THREE.LineSegments(edges, debugMaterial);
    this.debugHitBox.visible = false;
    
    console.log('🔧 [StandardSwordBehavior] Debug hitbox visualization created');
  }

  public updateHitBoxPosition(playerPosition: THREE.Vector3, playerRotation: number, swingProgress: number): void {
    if (!this.hitBoxMesh) return;

    const { swingArc, forwardDistance, heightOffset } = STANDARD_SWORD_CONFIG.hitbox;
    
    // Calculate swing arc position based on progress
    const swingAngle = THREE.MathUtils.lerp(swingArc.startAngle, swingArc.endAngle, swingProgress);
    
    // Position hitbox in swing arc
    const swingX = Math.sin(playerRotation + swingAngle) * forwardDistance;
    const swingZ = Math.cos(playerRotation + swingAngle) * forwardDistance;
    
    this.hitBoxMesh.position.set(
      playerPosition.x + swingX,
      playerPosition.y + heightOffset,
      playerPosition.z + swingZ
    );
    
    this.hitBoxMesh.rotation.y = playerRotation + swingAngle;
    
    // Update debug hitbox
    if (this.debugHitBox) {
      this.debugHitBox.position.copy(this.hitBoxMesh.position);
      this.debugHitBox.rotation.copy(this.hitBoxMesh.rotation);
    }
    
    console.log(`🗡️ [StandardSwordBehavior] Updated hitbox - progress: ${(swingProgress * 100).toFixed(1)}%, angle: ${(swingAngle * 180 / Math.PI).toFixed(1)}°`);
  }

  public resetHitBoxPosition(): void {
    if (!this.hitBoxMesh) return;
    
    this.hitBoxMesh.position.set(0, 0, 0);
    this.hitBoxMesh.rotation.set(0, 0, 0);
    
    if (this.debugHitBox) {
      this.debugHitBox.position.copy(this.hitBoxMesh.position);
      this.debugHitBox.rotation.copy(this.hitBoxMesh.rotation);
    }
    
    console.log('🗡️ [StandardSwordBehavior] Reset hitbox to neutral position');
  }

  public updateAnimation(): void {
    if (!this.weaponSwing || !this.weaponSwing.isActive) {
      return;
    }

    const elapsed = this.weaponSwing.clock.getElapsedTime() - this.weaponSwing.startTime;
    const { phases, duration, rotations } = STANDARD_SWORD_CONFIG.animation;
    
    console.log(`🗡️ [StandardSwordBehavior] Updating unified animation - Elapsed: ${elapsed.toFixed(3)}s`);
    
    // Calculate animation phase and apply arm rotations
    let shoulderRotation = { x: rotations.neutral.x, y: rotations.neutral.y, z: rotations.neutral.z };
    let elbowRotation = { x: 0.05, y: 0, z: 0 };
    let wristRotation = { x: -Math.PI / 6, y: 0, z: 0 };
    let torsoRotation = 0;
    
    if (elapsed < phases.windup) {
      // Windup phase
      const t = elapsed / phases.windup;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.neutral.x, rotations.windup.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.neutral.y, rotations.windup.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.neutral.z, rotations.windup.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.05, -0.1, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 6, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(0, -Math.PI / 8, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, rotations.windup.z, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0, -0.3, easedT);
      
    } else if (elapsed < phases.windup + phases.slash) {
      // Slash phase
      const t = (elapsed - phases.windup) / phases.slash;
      const aggressiveT = t * t * (3 - 2 * t);
      
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.windup.x, rotations.slash.x, aggressiveT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.windup.y, rotations.slash.y, aggressiveT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.windup.z, rotations.slash.z, aggressiveT);
      
      elbowRotation.x = THREE.MathUtils.lerp(-0.1, 0.15, aggressiveT);
      elbowRotation.y = THREE.MathUtils.lerp(-Math.PI / 6, Math.PI / 6, aggressiveT);
      
      wristRotation.y = THREE.MathUtils.lerp(-Math.PI / 8, Math.PI / 10, aggressiveT);
      wristRotation.z = THREE.MathUtils.lerp(rotations.windup.z, 0, aggressiveT);
      
      torsoRotation = THREE.MathUtils.lerp(-0.3, 0.25, aggressiveT);
      
      // Track weapon tip and create effects during slash
      this.trackWeaponTip();
      this.updateSwooshEffect(t);
      
    } else if (elapsed < duration) {
      // Recovery phase
      const t = (elapsed - phases.windup - phases.slash) / phases.recovery;
      const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
      
      shoulderRotation.x = THREE.MathUtils.lerp(rotations.slash.x, rotations.neutral.x, easedT);
      shoulderRotation.y = THREE.MathUtils.lerp(rotations.slash.y, rotations.neutral.y, easedT);
      shoulderRotation.z = THREE.MathUtils.lerp(rotations.slash.z, rotations.neutral.z, easedT);
      
      elbowRotation.x = THREE.MathUtils.lerp(0.15, 0.05, easedT);
      elbowRotation.y = THREE.MathUtils.lerp(Math.PI / 6, 0, easedT);
      
      wristRotation.y = THREE.MathUtils.lerp(Math.PI / 10, 0, easedT);
      wristRotation.z = THREE.MathUtils.lerp(0, 0, easedT);
      
      torsoRotation = THREE.MathUtils.lerp(0.25, 0, easedT);
      
    } else {
      // Animation complete
      this.completeAnimation();
      return;
    }
    
    this.applyArmRotations(shoulderRotation, elbowRotation, wristRotation, torsoRotation);
  }

  private applyArmRotations(
    shoulderRotation: any,
    elbowRotation: any, 
    wristRotation: any, 
    torsoRotation: number
  ): void {
    if (!this.playerBody || !this.playerBody.rightArm) return;
    
    this.playerBody.rightArm.rotation.set(shoulderRotation.x, shoulderRotation.y, shoulderRotation.z, 'XYZ');
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(elbowRotation.x, elbowRotation.y, elbowRotation.z);
    }
    
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(wristRotation.x, wristRotation.y, wristRotation.z);
    }
    
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = torsoRotation;
    }
  }

  private trackWeaponTip(): void {
    if (!this.equippedWeapon) return;
    
    const now = Date.now();
    if (now - this.lastTipTrackTime < STANDARD_SWORD_CONFIG.effects.trailConfig.tipTrackInterval) {
      return;
    }
    
    try {
      const bladeReference = this.equippedWeapon.getBladeReference();
      if (!bladeReference) {
        console.warn('🗡️ [StandardSwordBehavior] No blade reference available for tip tracking');
        return;
      }
      
      const bladeLocalTip = new THREE.Vector3(0, 0, -0.9);
      
      const worldTipPosition = bladeLocalTip.clone();
      bladeReference.localToWorld(worldTipPosition);
      
      this.weaponTipPositions.push(worldTipPosition.clone());
      
      if (this.weaponTipPositions.length > STANDARD_SWORD_CONFIG.effects.trailConfig.maxTrailLength) {
        this.weaponTipPositions.shift();
      }
      
      this.lastTipTrackTime = now;
      
      console.log(`🗡️ [StandardSwordBehavior] Tracked weapon tip: ${this.weaponTipPositions.length} positions`);
      
    } catch (error) {
      console.warn('🗡️ [StandardSwordBehavior] Could not track weapon tip:', error);
    }
  }

  private updateSwooshEffect(slashProgress: number): void {
    if (!this.effectsManager) {
      console.warn('🌪️ [StandardSwordBehavior] No EffectsManager available for swoosh effect');
      return;
    }
    
    if (this.swooshEffectCreated || this.weaponTipPositions.length < 3) {
      return;
    }
    
    const { triggerAtProgress } = STANDARD_SWORD_CONFIG.effects.swooshConfig;
    
    if (slashProgress >= triggerAtProgress) {
      const pathStart = this.weaponTipPositions[0];
      const pathEnd = this.weaponTipPositions[this.weaponTipPositions.length - 1];
      const swingDirection = pathEnd.clone().sub(pathStart).normalize();
      
      this.effectsManager.createSwordSwooshEffect(this.weaponTipPositions.slice(), swingDirection);
      this.swooshEffectCreated = true;
      
      console.log('🌪️ [StandardSwordBehavior] Created standardized swoosh effect with', this.weaponTipPositions.length, 'tip positions');
    }
  }

  private completeAnimation(): void {
    console.log('🗡️ [StandardSwordBehavior] Animation completed, resetting to neutral');
    
    const { rotations } = STANDARD_SWORD_CONFIG.animation;
    
    this.playerBody.rightArm.rotation.set(rotations.neutral.x, rotations.neutral.y, rotations.neutral.z);
    
    if (this.playerBody.rightElbow) {
      this.playerBody.rightElbow.rotation.set(0.05, 0, 0);
    }
    if (this.playerBody.rightWrist) {
      this.playerBody.rightWrist.rotation.set(-Math.PI / 6, 0, 0);
    }
    if (this.playerBody.body) {
      this.playerBody.body.rotation.y = 0;
    }
    
    this.weaponSwing.isActive = false;
    this.resetEffects();
  }

  private resetEffects(): void {
    this.weaponTipPositions = [];
    this.swooshEffectCreated = false;
    this.lastTipTrackTime = 0;
  }

  // Debug methods
  public getDebugHitBox(): THREE.LineSegments | null {
    return this.debugHitBox;
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (this.debugHitBox) {
      this.debugHitBox.visible = enabled;
      console.log(`🔧 [StandardSwordBehavior] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  public showHitBoxDebug(): void {
    if (this.debugHitBox && this.debugMode) {
      this.debugHitBox.visible = true;
    }
  }

  public hideHitBoxDebug(): void {
    if (this.debugHitBox) {
      this.debugHitBox.visible = false;
    }
  }

  public getHitBoxMesh(): THREE.Mesh | null {
    return this.hitBoxMesh;
  }

  public isDebugMode(): boolean {
    return this.debugMode;
  }
}
