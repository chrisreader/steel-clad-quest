
import * as THREE from 'three';
import { EnemyBodyConfiguration } from './EnemyBodyConfig';

export class EnemyBodyMetrics {
  private config: EnemyBodyConfiguration;
  
  // Calculated positions
  private _legTopY: number;
  private _bodyCenterY: number;
  private _bodyTopY: number;
  private _shoulderHeight: number;
  private _headCenterY: number;
  
  constructor(config: EnemyBodyConfiguration) {
    this.config = config;
    this.calculatePositions();
  }
  
  private calculatePositions(): void {
    // Start from ground up
    this._legTopY = 1.4; // Base leg attachment point
    
    // Body center is leg top + half body height
    this._bodyCenterY = this._legTopY + this.config.scale.body.height / 2;
    
    // Body top
    this._bodyTopY = this._bodyCenterY + this.config.scale.body.height / 2;
    
    // Shoulder height (positioned on upper torso)
    this._shoulderHeight = this._bodyCenterY + this.config.scale.body.height * 0.25;
    
    // Head center (touching body top)
    this._headCenterY = this._bodyTopY + this.config.scale.head.radius;
  }
  
  // Position getters
  public getBodyCenterY(): number { return this._bodyCenterY; }
  public getBodyTopY(): number { return this._bodyTopY; }
  public getShoulderHeight(): number { return this._shoulderHeight; }
  public getHeadCenterY(): number { return this._headCenterY; }
  public getLegTopY(): number { return this._legTopY; }
  
  // Calculated limb positions
  public getThighCenterY(): number {
    return this._legTopY - this.config.scale.leg.length / 2;
  }
  
  public getShinCenterY(): number {
    const thighBottomY = this.getThighCenterY() - this.config.scale.leg.length / 2;
    return thighBottomY - this.config.scale.shin.length / 2;
  }
  
  public getShinRelativeY(): number {
    return this.getShinCenterY() - this.getThighCenterY();
  }
  
  // Neutral pose calculations
  public getNeutralArmRotation(): { left: THREE.Euler; right: THREE.Euler } {
    const base = this.config.neutralPose.armRotation;
    return {
      left: new THREE.Euler(base.x, 0, base.z),
      right: new THREE.Euler(base.x, 0, -base.z) // Mirror Z for right arm
    };
  }
  
  public getArmPosition(isLeft: boolean): THREE.Vector3 {
    const x = isLeft ? 
      -(this.config.scale.body.radius + this.config.neutralPose.shoulderOffset) :
      (this.config.scale.body.radius + this.config.neutralPose.shoulderOffset);
    
    return new THREE.Vector3(x, this.getShoulderHeight(), 0);
  }
  
  public getLegPosition(isLeft: boolean): THREE.Vector3 {
    const x = isLeft ? 
      -this.config.scale.body.radius * this.config.neutralPose.legPosition.x :
      this.config.scale.body.radius * this.config.neutralPose.legPosition.x;
    
    return new THREE.Vector3(x, this.getThighCenterY(), 0);
  }
  
  // Animation helpers
  public getWalkingBobOffset(walkTime: number): number {
    return Math.sin(walkTime * 2) * 0.05;
  }
  
  public getBreathingOffset(idleTime: number): number {
    return Math.sin(idleTime * 4) * this.config.animationParams.breathingIntensity;
  }
  
  public getArmSwing(walkTime: number): number {
    return Math.sin(walkTime) * this.config.animationParams.armSwingIntensity;
  }
  
  public getLegSwing(walkTime: number): number {
    return Math.sin(walkTime + Math.PI) * this.config.animationParams.legSwingIntensity;
  }
  
  public getShoulderSway(walkTime: number): number {
    return Math.sin(walkTime * 0.5) * this.config.animationParams.shoulderMovement;
  }
  
  // Configuration accessors
  public getConfig(): EnemyBodyConfiguration { return this.config; }
  public getAnimationParams() { return this.config.animationParams; }
  public getScale() { return this.config.scale; }
  public getColors() { return this.config.colors; }
  public getStats() { return this.config.stats; }
}
