
export class HealthSystem {
  private currentHealth: number;
  private maxHealth: number;
  
  constructor(maxHealth: number) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }
  
  public getCurrentHealth(): number {
    return this.currentHealth;
  }
  
  public getMaxHealth(): number {
    return this.maxHealth;
  }
  
  public takeDamage(damage: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - damage);
  }
  
  public heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }
  
  public isAlive(): boolean {
    return this.currentHealth > 0;
  }
  
  public update(deltaTime: number): void {
    // Health system update logic if needed
  }
}
