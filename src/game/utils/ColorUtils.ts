
import * as THREE from 'three';

export class ColorUtils {
  static lerpColor(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
    const result = new THREE.Color();
    result.lerpColors(color1, color2, Math.max(0, Math.min(1, factor)));
    return result;
  }

  static smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  static exponentialDecay(factor: number, intensity: number = 3): number {
    return Math.pow(factor, intensity);
  }

  static getSynchronizedFogColorForTime(time: number, timePhases: any, getMoonElevationFactor: () => number): number {
    const normalizedTime = time % 1;
    
    // Define key colors with improved night visibility
    const keyColors = {
      deepNight: new THREE.Color(0x000040),
      lightNight: new THREE.Color(0x000060),
      dawn: new THREE.Color(0xFF6B35),
      noon: new THREE.Color(0x4682B4),
      sunset: new THREE.Color(0xFF8C42),
      dusk: new THREE.Color(0x1a0050),
      rapidNight: new THREE.Color(0x000030)
    };
    
    let resultColor: THREE.Color;
    const moonElevation = getMoonElevationFactor();
    
    if (normalizedTime >= timePhases.DEEP_NIGHT_START && normalizedTime <= timePhases.DEEP_NIGHT_END) {
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation * 0.7);
      resultColor = nightColor;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation * 0.7);
      resultColor = this.lerpColor(nightColor, keyColors.dawn, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.DAY_END - timePhases.DAY_START);
      resultColor = this.lerpColor(keyColors.dawn, keyColors.noon, Math.sin(factor * Math.PI * 0.5));
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      resultColor = this.lerpColor(keyColors.noon, keyColors.sunset, exponentialFactor);
    } else if (normalizedTime >= timePhases.EVENING_START && normalizedTime <= timePhases.EVENING_END) {
      const factor = (normalizedTime - timePhases.EVENING_START) / (timePhases.EVENING_END - timePhases.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      resultColor = this.lerpColor(keyColors.sunset, keyColors.dusk, exponentialFactor);
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      resultColor = this.lerpColor(keyColors.dusk, keyColors.rapidNight, exponentialFactor);
    } else if (normalizedTime >= timePhases.RAPID_NIGHT_START && normalizedTime <= timePhases.RAPID_NIGHT_END) {
      const factor = (normalizedTime - timePhases.RAPID_NIGHT_START) / (timePhases.RAPID_NIGHT_END - timePhases.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation * 0.7);
      resultColor = this.lerpColor(keyColors.rapidNight, nightColor, exponentialFactor);
    } else {
      const nightColor = this.lerpColor(keyColors.lightNight, keyColors.deepNight, moonElevation * 0.7);
      resultColor = nightColor;
    }
    
    return resultColor.getHex();
  }

  static getSynchronizedLightColorForTime(time: number, timePhases: any): THREE.Color {
    const normalizedTime = time % 1;
    
    const nightColor = new THREE.Color(0x4169E1);
    const dawnColor = new THREE.Color(0xFFF4E6);
    const noonColor = new THREE.Color(0xFFFAF0);
    const sunsetColor = new THREE.Color(0xFFE4B5);
    const duskColor = new THREE.Color(0x6A5ACD);
    const rapidNightColor = new THREE.Color(0x2F4F4F);
    
    if (normalizedTime >= timePhases.DEEP_NIGHT_START && normalizedTime <= timePhases.DEEP_NIGHT_END) {
      return nightColor;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      return this.lerpColor(nightColor, dawnColor, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.DAY_END - timePhases.DAY_START);
      return this.lerpColor(dawnColor, noonColor, Math.sin(factor * Math.PI * 0.5));
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      return this.lerpColor(noonColor, sunsetColor, exponentialFactor);
    } else if (normalizedTime >= timePhases.EVENING_START && normalizedTime <= timePhases.EVENING_END) {
      const factor = (normalizedTime - timePhases.EVENING_START) / (timePhases.EVENING_END - timePhases.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      return this.lerpColor(sunsetColor, duskColor, exponentialFactor);
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      return this.lerpColor(duskColor, rapidNightColor, exponentialFactor);
    } else if (normalizedTime >= timePhases.RAPID_NIGHT_START && normalizedTime <= timePhases.RAPID_NIGHT_END) {
      const factor = (normalizedTime - timePhases.RAPID_NIGHT_START) / (timePhases.RAPID_NIGHT_END - timePhases.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      return this.lerpColor(rapidNightColor, nightColor, exponentialFactor);
    } else {
      return nightColor;
    }
  }
}
