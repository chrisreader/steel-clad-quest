
import { ColorUtils } from './ColorUtils';

export class TimeUtils {
  static getCurrentPhase(time: number, timePhases: any): string {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime < timePhases.DAWN_START) {
      return 'night';
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime < timePhases.DAY_START) {
      return 'dawn';
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime < timePhases.SUNSET_START) {
      return 'day';
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime < timePhases.CIVIL_TWILIGHT_START) {
      return 'sunset';
    } else if (normalizedTime >= timePhases.CIVIL_TWILIGHT_START && normalizedTime < timePhases.NAUTICAL_TWILIGHT_START) {
      return 'civilTwilight';
    } else if (normalizedTime >= timePhases.NAUTICAL_TWILIGHT_START && normalizedTime < timePhases.ASTRONOMICAL_TWILIGHT_START) {
      return 'nauticalTwilight';
    } else {
      return 'astronomicalTwilight';
    }
  }

  static getPhaseTransitionFactor(time: number, timePhases: any): { phase: string, nextPhase: string, factor: number } {
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
    return { phase: currentPhase, nextPhase, factor: Math.max(0, Math.min(1, factor)) };
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
        // Realistic night ambient - never pure black
        return 0.25 + (0.15 * moonElevation);
      case 'dawn':
        const { factor: dawnFactor } = this.getPhaseTransitionFactor(time, timePhases);
        // Very gradual brightening that starts late in dawn phase
        const delayedDawnFactor = ColorUtils.exponentialDecay(Math.max(0, dawnFactor - 0.6) / 0.4, 3);
        return 0.4 + (0.8 * delayedDawnFactor);
      case 'day':
        return 1.8;
      case 'sunset':
        const { factor: sunsetFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 1.8 - (1.0 * ColorUtils.exponentialDecay(sunsetFactor, 2));
      case 'civilTwilight':
        return 0.8;
      case 'nauticalTwilight':
        return 0.5;
      case 'astronomicalTwilight':
        const { factor: astroFactor } = this.getPhaseTransitionFactor(time, timePhases);
        return 0.5 - (0.25 * ColorUtils.exponentialDecay(astroFactor, 2));
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
}
