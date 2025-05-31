
export class ExperienceSystem {
  private level: number;
  private experience: number = 0;
  private experienceToNext: number;
  
  constructor(initialLevel: number = 1) {
    this.level = initialLevel;
    this.experienceToNext = this.calculateExperienceForLevel(this.level + 1);
  }
  
  private calculateExperienceForLevel(level: number): number {
    return level * 100; // Simple calculation
  }
  
  public addExperience(amount: number): void {
    this.experience += amount;
    while (this.experience >= this.experienceToNext) {
      this.levelUp();
    }
  }
  
  private levelUp(): void {
    this.experience -= this.experienceToNext;
    this.level++;
    this.experienceToNext = this.calculateExperienceForLevel(this.level + 1);
    console.log(`📈 [ExperienceSystem] Level up! Now level ${this.level}`);
  }
  
  public getLevel(): number {
    return this.level;
  }
  
  public getExperience(): number {
    return this.experience;
  }
  
  public getExperienceToNext(): number {
    return this.experienceToNext;
  }
}
