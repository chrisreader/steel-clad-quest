
export class Attack {
  private damage: number;
  
  constructor(initialDamage: number) {
    this.damage = initialDamage;
  }
  
  public setDamage(damage: number): void {
    this.damage = damage;
  }
  
  public getDamage(): number {
    return this.damage;
  }
  
  public execute(target?: any): number {
    console.log(`⚔️ [Attack] Executing attack for ${this.damage} damage`);
    return this.damage;
  }
}
