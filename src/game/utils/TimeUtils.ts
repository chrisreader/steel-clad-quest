import { ColorUtils } from './ColorUtils';

export class TimeUtils {
  // Add caching for smooth calculations
  private static lastCalculatedTime: number = -1;
  private static cachedPhase: string = '';
  private static cachedTransition: { phase: string, nextPhase: string, factor: number } = { phase: '', nextPhase: '', factor: 0 };
  private static readonly CALCULATION_THRESHOLD = 0.001; // Only recalculate when time changes significantly
  
  static getCurrentPhase(time: number, timePhases: any): string {
    // OPTIMIZED: Cache phase calculations to reduce stuttering
    if (Math.abs(time - this.lastCalculatedTime) < this.CALCULATION_THRESHOLD && this.cachedPhase) {
      return this.cachedPhase;
    }
    
    const normalizedTime = time % 1;
    
    let phase: string;
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime < timePhases.DAWN_START) {
      phase = 'night';
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime < timePhases.DAY_START) {
      phase = 'dawn';
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime < timePhases.SUNSET_START) {
      phase = 'day';
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime < timePhases.CIVIL_TWILIGHT_START) {
      phase = 'sunset';
    } else if (normalizedTime >= timePhases.CIVIL_TWILIGHT_START && normalizedTime < timePhases.NAUTICAL_TWILIGHT_START) {
      phase = 'civilTwilight';
    } else if (normalizedTime >= timePhases.NAUTICAL_TWILIGHT_START && normalizedTime < timePhases.ASTRONOMICAL_TWILIGHT_START) {
      phase = 'nauticalTwilight';
    } else {
      phase = 'astronomicalTwilight';
    }
    
    this.lastCalculatedTime = time;
    this.cachedPhase = phase;
    return phase;
  }

  static getPhaseTransitionFactor(time: number, timePhases: any): { phase: string, nextPhase: string, factor: number } {
    // OPTIMIZED: Cache transition calculations
    if (Math.abs(time - this.lastCalculatedTime) < this.CALCULATION_THRESHOLD && this.cachedTransition.phase) {
      return this.cachedTransition;
    }
    
    const normalizedTime = time % 1;
    const currentPhase = this.getCurrentPhase(time, timePhases);
    
    let phaseStart: number, phaseEnd: number, nextPhase: string;
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime < timePhases.DAWN_START) {
      phaseStart = timePhases.NIGHT_START;
      phaseEnd = timePhases.DAWN_START;
      nextPhase = 'dawn';
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime < timePhases.DAY_START) {
      phaseStart = timePhases.DAWN_START;
      phaseEnd = timePhases.DAY_START;
      nextPhase = 'day';
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime < timePhases.SUNSET_START) {
      phaseStart = timePhases.DAY_START;
      phaseEnd = timePhases.SUNSET_START;
      nextPhase = 'sunset';
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime < timePhases.CIVIL_TWILIGHT_START) {
      phaseStart = timePhases.SUNSET_START;
      phaseEnd = timePhases.CIVIL_TWILIGHT_START;
      nextPhase = 'civilTwilight';
    } else if (normalizedTime >= timePhases.CIVIL_TWILIGHT_START && normalizedTime < timePhases.NAUTICAL_TWILIGHT_START) {
      phaseStart = timePhases.CIVIL_TWILIGHT_START;
      phaseEnd = timePhases.NAUTICAL_TWILIGHT_START;
      nextPhase = 'nauticalTwilight';
    } else if (normalizedTime >= timePhases.NAUTICAL_TWILIGHT_START && normalizedTime < timePhases.ASTRONOMICAL_TWILIGHT_START) {
      phaseStart = timePhases.NAUTICAL_TWILIGHT_START;
      phaseEnd = timePhases.ASTRONOMICAL_TWILIGHT_START;
      nextPhase = 'astronomicalTwilight';
    } else {
      phaseStart = timePhases.ASTRONOMICAL_TWILIGHT_START;
      phaseEnd = 1.0;
      nextPhase = 'night';
    }
    
    const factor = (normalizedTime - phaseStart) / (phaseEnd - phaseStart);
    const result = { phase: currentPhase, nextPhase, factor: Math.max(0, Math.min(1, factor)) };
    
    this.cachedTransition = result;
    return result;
  }

  static getSynchronizedAmbientIntensityForTime(
    time: number, 
    timePhases: any, 
    getMoonElevationFactor: () => number
  ): number {
    const phase = this.getCurrentPhase(time, timePhases);
    const moonElevation = getMoonElevationFactor();
    
    switch (phase) {
      case 'night':
        return 0.05 + (0.1 * moonElevation);
      case 'dawn':
        const { factor: dawnFactor } = this.getPhaseTransitionFactor(time, timePhases);
        const delayedDawnFactor = ColorUtils.exponentialDecay(Math.max(0, dawnFactor - 0.6) / 0.4, 3);
        return 0.15 + (0.8 * delayedDawnFactor);
      case 'day':
        return 1.8;
      case 'sunset':
        const { factor: sunsetFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 1.8 - (1.3 * ColorUtils.exponentialDecay(sunsetFactor, 2));
      case 'civilTwilight':
        return 0.5;
      case 'nauticalTwilight':
        return 0.25;
      case 'astronomicalTwilight':
        const { factor: astroFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 0.25 - (0.2 * ColorUtils.exponentialDecay(astroFactor, 2));
      default:
        return 1.0;
    }
  }

  static getSynchronizedNightFactor(time: number, timePhases: any): number {
    const phase = this.getCurrentPhase(time, timePhases);
    
    switch (phase) {
      case 'night':
        return 1.0;
      case 'dawn':
        const { factor: dawnFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 1.0 - ColorUtils.smoothStep(0, 1, dawnFactor);
      case 'day':
        return 0.0;
      case 'sunset':
        return 0.0;
      case 'civilTwilight':
        return 0.3;
      case 'nauticalTwilight':
        return 0.6;
      case 'astronomicalTwilight':
        const { factor: astroFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 0.6 + (0.4 * ColorUtils.exponentialDecay(astroFactor, 2));
      default:
        return 0.0;
    }
  }

  static getDayFactor(time: number, timePhases: any): number {
    const phase = this.getCurrentPhase(time, timePhases);
    
    switch (phase) {
      case 'night':
        return 0.0;
      case 'dawn':
        const { factor: dawnFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return ColorUtils.smoothStep(0, 1, dawnFactor);
      case 'day':
        return 1.0;
      case 'sunset':
        const { factor: sunsetFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 1.0 - ColorUtils.exponentialDecay(sunsetFactor, 2);
      case 'civilTwilight':
      case 'nauticalTwilight':
      case 'astronomicalTwilight':
        return 0.0;
      default:
        return 0.0;
    }
  }
  
  // Add method to clear cache when needed
  static clearCache(): void {
    this.lastCalculatedTime = -1;
    this.cachedPhase = '';
    this.cachedTransition = { phase: '', nextPhase: '', factor: 0 };
  }
}
