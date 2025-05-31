
import * as THREE from 'three';
import { PlayerBody } from '../../../types/GameTypes';

export class BowDrawAnimation {
  private playerBody: PlayerBody;
  private isActive: boolean = false;
  private currentStage: number = 1;
  private chargeLevel: number = 0;
  
  // Stage positions for right arm (drawing arm)
  private stagePositions = {
    1: { x: -0.3, y: 0.2, z: 0.1, rotation: { x: -0.5, y: 0.3, z: 0.2 } },
    2: { x: -0.5, y: 0.3, z: 0.2, rotation: { x: -0.7, y: 0.5, z: 0.3 } },
    3: { x: -0.7, y: 0.4, z: 0.3, rotation: { x: -0.9, y: 0.7, z: 0.4 } },
    4: { x: -0.9, y: 0.5, z: 0.4, rotation: { x: -1.1, y: 0.9, z: 0.5 } }
  };

  constructor(playerBody: PlayerBody) {
    this.playerBody = playerBody;
  }

  public startDraw(): void {
    this.isActive = true;
    this.currentStage = 1;
    this.chargeLevel = 0;
    this.updateArmPosition();
    console.log('🏹 [BowDrawAnimation] Started bow draw animation');
  }

  public stopDraw(): void {
    this.isActive = false;
    this.currentStage = 1;
    this.chargeLevel = 0;
    this.resetArmPosition();
    console.log('🏹 [BowDrawAnimation] Stopped bow draw animation');
  }

  public updateDrawingStage(stage: number, chargeLevel: number): void {
    if (!this.isActive) return;
    
    this.currentStage = Math.max(1, Math.min(4, stage));
    this.chargeLevel = chargeLevel;
    this.updateArmPosition();
    
    console.log(`🏹 [BowDrawAnimation] Updated to stage ${this.currentStage} with charge ${(chargeLevel * 100).toFixed(1)}%`);
  }

  private updateArmPosition(): void {
    if (!this.playerBody.rightArm) return;
    
    const targetPos = this.stagePositions[this.currentStage as keyof typeof this.stagePositions];
    
    // Smoothly interpolate to target position
    this.playerBody.rightArm.position.lerp(
      new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
      0.1
    );
    
    // Update rotation for more realistic drawing pose
    this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(
      this.playerBody.rightArm.rotation.x,
      targetPos.rotation.x,
      0.1
    );
    this.playerBody.rightArm.rotation.y = THREE.MathUtils.lerp(
      this.playerBody.rightArm.rotation.y,
      targetPos.rotation.y,
      0.1
    );
    this.playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(
      this.playerBody.rightArm.rotation.z,
      targetPos.rotation.z,
      0.1
    );
  }

  private resetArmPosition(): void {
    if (!this.playerBody.rightArm) return;
    
    // Reset to neutral position
    this.playerBody.rightArm.position.lerp(new THREE.Vector3(0, 0, 0), 0.2);
    this.playerBody.rightArm.rotation.x = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.x, 0, 0.2);
    this.playerBody.rightArm.rotation.y = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.y, 0, 0.2);
    this.playerBody.rightArm.rotation.z = THREE.MathUtils.lerp(this.playerBody.rightArm.rotation.z, 0, 0.2);
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;
    
    // Continuous updates can be added here if needed
    this.updateArmPosition();
  }
}
