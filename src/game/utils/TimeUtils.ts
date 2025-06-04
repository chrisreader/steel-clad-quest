
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
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      const minNightIntensity = 0.12;
      const maxNightIntensity = 0.3;
      baseIntensity = minNightIntensity + (maxNightIntensity - minNightIntensity) * moonElevation;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      const exponentialFactor = ColorUtils.smoothStep(0, 1, factor);
      const nightIntensity = 0.12 + (0.3 - 0.12) * moonElevation;
      baseIntensity = nightIntensity + (0.8 - nightIntensity) * exponentialFactor;
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      baseIntensity = 1.8;
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 1.5);
      baseIntensity = 1.8 - (1.8 - 1.0) * exponentialFactor;
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 2);
      baseIntensity = 1.0 - (1.0 - 0.5) * exponentialFactor;
    } else {
      const factor = (normalizedTime - timePhases.DEEP_NIGHT_START) / (timePhases.DEEP_NIGHT_END - timePhases.DEEP_NIGHT_START);
      const exponentialFactor = ColorUtils.exponentialDecay(factor, 2.5);
      const nightIntensity = 0.12 + (0.3 - 0.12) * moonElevation;
      baseIntensity = 0.5 - (0.5 - nightIntensity) * exponentialFactor;
    }
    
    return baseIntensity;
  }

  static getSynchronizedNightFactor(time: number, timePhases: any): number {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      return 1.0;
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      return 0.0;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      return 1.0 - ColorUtils.smoothStep(0, 1, factor);
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      return ColorUtils.exponentialDecay(factor, 1.5);
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      return 0.5 + 0.5 * ColorUtils.exponentialDecay(factor, 2);
    } else {
      const factor = (normalizedTime - timePhases.DEEP_NIGHT_START) / (timePhases.DEEP_NIGHT_END - timePhases.DEEP_NIGHT_START);
      return ColorUtils.smoothStep(0.8, 1.0, factor);
    }
  }

  static getDayFactor(time: number, timePhases: any): number {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      return 1.0;
    } else if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      return 0.0;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      return ColorUtils.smoothStep(0, 1, factor);
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      return 1.0 - ColorUtils.exponentialDecay(factor, 1.5);
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.DEEP_NIGHT_END) {
      return 0.0;
    } else {
      return 0.0;
    }
  }
}
