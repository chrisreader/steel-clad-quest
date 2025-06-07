
import { TimeUtils } from '../../../utils/TimeUtils';

export class TimeAwareFireIntensity {
  private baseIntensity: number;
  private nightMultiplier: number = 3.5; // Increased for dramatic night effect
  private twilightMultiplier: number = 3.0; // Increased for strong twilight presence
  private dawnMultiplier: number = 2.0; // Increased for enhanced dawn lighting
  private dayMultiplier: number = 1.2; // Slightly increased even for day

  constructor(baseIntensity: number) {
    this.baseIntensity = baseIntensity;
  }

  public getAdjustedIntensity(time: number, timePhases: any): number {
    const phase = TimeUtils.getCurrentPhase(time, timePhases);
    
    let multiplier = this.dayMultiplier;
    
    switch (phase) {
      case 'night':
        multiplier = this.nightMultiplier; // 3.5x for dramatic night lighting
        break;
      case 'dawn':
        multiplier = this.dawnMultiplier; // 2.0x for strong dawn presence
        break;
      case 'day':
        multiplier = this.dayMultiplier; // 1.2x even during day for visibility
        break;
      case 'sunset':
      case 'civilTwilight':
      case 'nauticalTwilight':
      case 'astronomicalTwilight':
        multiplier = this.twilightMultiplier; // 3.0x for strong twilight effect
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
