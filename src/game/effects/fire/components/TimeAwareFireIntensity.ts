
import { TimeUtils } from '../../../utils/TimeUtils';

export class TimeAwareFireIntensity {
  private baseIntensity: number;
  private nightMultiplier: number = 2.5;
  private twilightMultiplier: number = 2.0;
  private dawnMultiplier: number = 1.5;
  private dayMultiplier: number = 1.0;

  constructor(baseIntensity: number) {
    this.baseIntensity = baseIntensity;
  }

  public getAdjustedIntensity(time: number, timePhases: any): number {
    const phase = TimeUtils.getCurrentPhase(time, timePhases);
    
    let multiplier = this.dayMultiplier;
    
    switch (phase) {
      case 'night':
        multiplier = this.nightMultiplier;
        break;
      case 'dawn':
        multiplier = this.dawnMultiplier;
        break;
      case 'day':
        multiplier = this.dayMultiplier;
        break;
      case 'sunset':
      case 'civilTwilight':
      case 'nauticalTwilight':
      case 'astronomicalTwilight':
        multiplier = this.twilightMultiplier;
        break;
    }
    
    return this.baseIntensity * multiplier;
  }

  public setNightMultiplier(multiplier: number): void {
    this.nightMultiplier = multiplier;
  }

  public setTwilightMultiplier(multiplier: number): void {
    this.twilightMultiplier = multiplier;
  }
}
