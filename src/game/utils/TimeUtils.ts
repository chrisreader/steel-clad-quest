
import { ColorUtils } from './ColorUtils';

export class TimeUtils {
  static getSynchronizedAmbientIntensityForTime(
    time: number, 
    timePhases: any, 
    getMoonElevationFactor: () => number
  ): number {
    const normalizedTime = time % 1;
    const moonElevation = getMoonElevationFactor();
    
    let baseIntensity: number;
    
    if (normalizedTime >= timePhases.DEEP_NIGHT_START && normalizedTime <= timePhases.DEEP_NIGHT_END) {
      const minNightIntensity = 0.15;
      const maxNightIntensity = 0.35;
      baseIntensity = minNightIntensity + (maxNightIntensity - minNightIntensity) * moonElevation;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      const nightIntensity = 0.15 + (0.35 - 0.15) * moonElevation;
      baseIntensity = nightIntensity + (1.0 - nightIntensity) * ColorUtils.smoothStep(0, 1, factor);
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      baseIntensity = 1.8;
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 2);
      baseIntensity = 1.8 - (1.8 - 1.2) * exponentialFactor;
    } else if (normalizedTime >= timePhases.EVENING_START && normalizedTime <= timePhases.EVENING_END) {
      const factor = (normalizedTime - timePhases.EVENING_START) / (timePhases.EVENING_END - timePhases.EVENING_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 3);
      baseIntensity = 1.2 - (1.2 - 0.6) * exponentialFactor;
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 4);
      baseIntensity = 0.6 - (0.6 - 0.25) * exponentialFactor;
    } else if (normalizedTime >= timePhases.RAPID_NIGHT_START && normalizedTime <= timePhases.RAPID_NIGHT_END) {
      const factor = (normalizedTime - timePhases.RAPID_NIGHT_START) / (timePhases.RAPID_NIGHT_END - timePhases.RAPID_NIGHT_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 5);
      const nightIntensity = 0.15 + (0.35 - 0.15) * moonElevation;
      baseIntensity = 0.25 - (0.25 - nightIntensity) * exponentialFactor;
    } else {
      const nightIntensity = 0.15 + (0.35 - 0.15) * moonElevation;
      baseIntensity = nightIntensity;
    }
    
    return baseIntensity;
  }

  static getSynchronizedNightFactor(time: number, timePhases: any): number {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= timePhases.DEEP_NIGHT_START && normalizedTime <= timePhases.DEEP_NIGHT_END) {
      return 1.0;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      return 1.0 - ColorUtils.smoothStep(0, 1, factor);
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      return 0.0;
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.RAPID_NIGHT_END) {
      const sunsetProgress = (normalizedTime - timePhases.SUNSET_START) / (timePhases.RAPID_NIGHT_END - timePhases.SUNSET_START);
      const exponentialFactor = ColorUtils.exponentialDecay(sunsetProgress, 3);
      return 1.0 - exponentialFactor;
    } else {
      return 0.0;
    }
  }

  static getDayFactor(time: number, timePhases: any): number {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      return 1.0;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      return ColorUtils.smoothStep(0, 1, factor);
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.RAPID_NIGHT_END) {
      const sunsetProgress = (normalizedTime - timePhases.SUNSET_START) / (timePhases.RAPID_NIGHT_END - timePhases.SUNSET_START);
      const exponentialFactor = ColorUtils.exponentialDecay(sunsetProgress, 3);
      return 1.0 - exponentialFactor;
    } else {
      return 0.0;
    }
  }
}
