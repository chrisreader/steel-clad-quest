
import { HuntingBow } from '../weapons/items/HuntingBow';
import { WeaponAnimationSystem } from './WeaponAnimationSystem';

export class BowAnimationBridge {
  private weaponAnimationSystem: WeaponAnimationSystem;
  
  constructor(weaponAnimationSystem: WeaponAnimationSystem) {
    this.weaponAnimationSystem = weaponAnimationSystem;
  }
  
  public updateBowDrawingStage(bow: HuntingBow): void {
    if (!bow) return;
    
    const chargeLevel = bow.getChargeLevel();
    
    // Map charge level to drawing stages (1-4)
    let drawingStage = 1;
    if (chargeLevel >= 0.25) drawingStage = 2;
    if (chargeLevel >= 0.5) drawingStage = 3;
    if (chargeLevel >= 0.75) drawingStage = 4;
    
    // Pass the drawing stage to the animation system
    this.weaponAnimationSystem.updateBowDrawingStage(drawingStage, chargeLevel);
    
    console.log(`🏹 [BowAnimationBridge] Updated drawing stage: ${drawingStage} (charge: ${(chargeLevel * 100).toFixed(1)}%)`);
  }
}
