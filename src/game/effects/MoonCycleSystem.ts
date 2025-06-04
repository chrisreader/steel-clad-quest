
import * as THREE from 'three';

export enum MoonPhase {
  NEW_MOON = 0,        // Day 0 - Darkest night
  WAXING_CRESCENT = 1, // Day 1 - Very dim
  FIRST_QUARTER = 2,   // Day 2 - Moderate light
  WAXING_GIBBOUS = 3,  // Day 3 - Bright
  FULL_MOON = 4,       // Day 4 - Brightest night
  WANING_GIBBOUS = 5,  // Day 5 - Bright
  LAST_QUARTER = 6,    // Day 6 - Moderate light
  WANING_CRESCENT = 7  // Day 7 - Very dim
}

export interface MoonPhaseData {
  phase: MoonPhase;
  phaseName: string;
  dayInCycle: number;
  illuminationPercentage: number;
  ambientLightMultiplier: number;
  directionalLightMultiplier: number;
  moonGlowIntensity: number;
}

export class MoonCycleSystem {
  private moonCycleLength: number = 7; // 7-day cycle
  private currentCycleDay: number = 0;
  
  constructor(startingDay: number = 0) {
    this.currentCycleDay = startingDay % this.moonCycleLength;
    console.log("🌙 MoonCycleSystem initialized with 7-day cycle, starting on day", this.currentCycleDay);
  }
  
  public update(timeOfDay: number, deltaTime: number, cycleSpeed: number): void {
    // Advance the moon cycle based on day/night progression
    // Full day cycle (0 to 1) advances the moon cycle by 1 day
    const dayProgress = deltaTime * cycleSpeed;
    this.currentCycleDay += dayProgress;
    
    // Wrap around after 7 days
    if (this.currentCycleDay >= this.moonCycleLength) {
      this.currentCycleDay -= this.moonCycleLength;
    }
  }
  
  public getCurrentPhaseData(): MoonPhaseData {
    const phase = this.getCurrentPhase();
    const phaseName = this.getPhaseName(phase);
    const illuminationPercentage = this.getIlluminationPercentage(phase);
    
    return {
      phase,
      phaseName,
      dayInCycle: Math.floor(this.currentCycleDay),
      illuminationPercentage,
      ambientLightMultiplier: this.getAmbientLightMultiplier(phase),
      directionalLightMultiplier: this.getDirectionalLightMultiplier(phase),
      moonGlowIntensity: this.getMoonGlowIntensity(phase)
    };
  }
  
  private getCurrentPhase(): MoonPhase {
    const dayInCycle = Math.floor(this.currentCycleDay) % this.moonCycleLength;
    
    switch (dayInCycle) {
      case 0: return MoonPhase.NEW_MOON;
      case 1: return MoonPhase.WAXING_CRESCENT;
      case 2: return MoonPhase.FIRST_QUARTER;
      case 3: return MoonPhase.WAXING_GIBBOUS;
      case 4: return MoonPhase.FULL_MOON;
      case 5: return MoonPhase.WANING_GIBBOUS;
      case 6: return MoonPhase.LAST_QUARTER;
      default: return MoonPhase.NEW_MOON;
    }
  }
  
  private getPhaseName(phase: MoonPhase): string {
    const phaseNames = {
      [MoonPhase.NEW_MOON]: "New Moon",
      [MoonPhase.WAXING_CRESCENT]: "Waxing Crescent",
      [MoonPhase.FIRST_QUARTER]: "First Quarter",
      [MoonPhase.WAXING_GIBBOUS]: "Waxing Gibbous",
      [MoonPhase.FULL_MOON]: "Full Moon",
      [MoonPhase.WANING_GIBBOUS]: "Waning Gibbous",
      [MoonPhase.LAST_QUARTER]: "Last Quarter",
      [MoonPhase.WANING_CRESCENT]: "Waning Crescent"
    };
    
    return phaseNames[phase];
  }
  
  private getIlluminationPercentage(phase: MoonPhase): number {
    // Calculate how much of the moon is illuminated (0-100%)
    switch (phase) {
      case MoonPhase.NEW_MOON: return 0;
      case MoonPhase.WAXING_CRESCENT: return 25;
      case MoonPhase.FIRST_QUARTER: return 50;
      case MoonPhase.WAXING_GIBBOUS: return 75;
      case MoonPhase.FULL_MOON: return 100;
      case MoonPhase.WANING_GIBBOUS: return 75;
      case MoonPhase.LAST_QUARTER: return 50;
      case MoonPhase.WANING_CRESCENT: return 25;
      default: return 0;
    }
  }
  
  private getAmbientLightMultiplier(phase: MoonPhase): number {
    // Multiplier for ambient light during night (0.0 to 1.0)
    switch (phase) {
      case MoonPhase.NEW_MOON: return 0.1;          // Very dark - 10% of base
      case MoonPhase.WAXING_CRESCENT: return 0.3;   // Dim - 30% of base
      case MoonPhase.FIRST_QUARTER: return 0.5;     // Moderate - 50% of base
      case MoonPhase.WAXING_GIBBOUS: return 0.7;    // Bright - 70% of base
      case MoonPhase.FULL_MOON: return 1.0;         // Brightest - 100% of base
      case MoonPhase.WANING_GIBBOUS: return 0.7;    // Bright - 70% of base
      case MoonPhase.LAST_QUARTER: return 0.5;      // Moderate - 50% of base
      case MoonPhase.WANING_CRESCENT: return 0.3;   // Dim - 30% of base
      default: return 0.1;
    }
  }
  
  private getDirectionalLightMultiplier(phase: MoonPhase): number {
    // Multiplier for moon directional light intensity
    switch (phase) {
      case MoonPhase.NEW_MOON: return 0.0;          // No moonlight
      case MoonPhase.WAXING_CRESCENT: return 0.2;   // Very weak
      case MoonPhase.FIRST_QUARTER: return 0.4;     // Weak
      case MoonPhase.WAXING_GIBBOUS: return 0.7;    // Strong
      case MoonPhase.FULL_MOON: return 1.0;         // Strongest
      case MoonPhase.WANING_GIBBOUS: return 0.7;    // Strong
      case MoonPhase.LAST_QUARTER: return 0.4;      // Weak
      case MoonPhase.WANING_CRESCENT: return 0.2;   // Very weak
      default: return 0.0;
    }
  }
  
  private getMoonGlowIntensity(phase: MoonPhase): number {
    // Controls moon visual glow intensity
    switch (phase) {
      case MoonPhase.NEW_MOON: return 0.0;          // No glow
      case MoonPhase.WAXING_CRESCENT: return 0.1;   // Very faint
      case MoonPhase.FIRST_QUARTER: return 0.2;     // Faint
      case MoonPhase.WAXING_GIBBOUS: return 0.4;    // Noticeable
      case MoonPhase.FULL_MOON: return 0.6;         // Bright glow
      case MoonPhase.WANING_GIBBOUS: return 0.4;    // Noticeable
      case MoonPhase.LAST_QUARTER: return 0.2;      // Faint
      case MoonPhase.WANING_CRESCENT: return 0.1;   // Very faint
      default: return 0.0;
    }
  }
  
  // Utility methods for external systems
  public getMoonPhaseIntensity(): number {
    return this.getDirectionalLightMultiplier(this.getCurrentPhase());
  }
  
  public isFullMoonPeriod(): boolean {
    const phase = this.getCurrentPhase();
    return phase === MoonPhase.FULL_MOON || phase === MoonPhase.WAXING_GIBBOUS || phase === MoonPhase.WANING_GIBBOUS;
  }
  
  public isNewMoonPeriod(): boolean {
    const phase = this.getCurrentPhase();
    return phase === MoonPhase.NEW_MOON || phase === MoonPhase.WAXING_CRESCENT || phase === MoonPhase.WANING_CRESCENT;
  }
  
  public setCycleDay(day: number): void {
    this.currentCycleDay = Math.max(0, Math.min(6.99, day));
    console.log("🌙 Moon cycle set to day", this.currentCycleDay, "- Phase:", this.getCurrentPhaseData().phaseName);
  }
  
  public dispose(): void {
    console.log("🌙 MoonCycleSystem disposed");
  }
}
