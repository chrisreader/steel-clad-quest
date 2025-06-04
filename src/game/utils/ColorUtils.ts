
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
    
    const keyColors = {
      night: new THREE.Color(0x000040),
      dawn: new THREE.Color(0x4A5D7A),
      day: new THREE.Color(0x4682B4),
      sunset: new THREE.Color(0xFF8C42),
      twilight: new THREE.Color(0x2E1B69),
      deepNight: new THREE.Color(0x000030)
    };
    
    let resultColor: THREE.Color;
    const moonElevation = getMoonElevationFactor();
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      resultColor = this.lerpColor(keyColors.night, keyColors.night, moonElevation * 0.5);
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      resultColor = this.lerpColor(keyColors.night, keyColors.dawn, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.DAY_END - timePhases.DAY_START);
      resultColor = this.lerpColor(keyColors.dawn, keyColors.day, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      resultColor = this.lerpColor(keyColors.day, keyColors.sunset, this.exponentialDecay(factor, 1.5));
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      resultColor = this.lerpColor(keyColors.sunset, keyColors.twilight, this.exponentialDecay(factor, 2));
    } else {
      const factor = (normalizedTime - timePhases.DEEP_NIGHT_START) / (timePhases.DEEP_NIGHT_END - timePhases.DEEP_NIGHT_START);
      resultColor = this.lerpColor(keyColors.twilight, keyColors.deepNight, this.exponentialDecay(factor, 2.5));
    }
    
    return resultColor.getHex();
  }

  static getSynchronizedLightColorForTime(time: number, timePhases: any): THREE.Color {
    const normalizedTime = time % 1;
    
    const nightColor = new THREE.Color(0x4169E1);
    const dawnColor = new THREE.Color(0xFFB366);
    const dayColor = new THREE.Color(0xFFFAF0);
    const sunsetColor = new THREE.Color(0xFF6B35);
    const twilightColor = new THREE.Color(0x6A5ACD);
    const deepNightColor = new THREE.Color(0x2E2E5A);
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      return nightColor;
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime <= timePhases.DAWN_END) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAWN_END - timePhases.DAWN_START);
      return this.lerpColor(nightColor, dawnColor, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.DAY_END - timePhases.DAY_START);
      return this.lerpColor(dawnColor, dayColor, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      return this.lerpColor(dayColor, sunsetColor, this.exponentialDecay(factor, 1.5));
    } else if (normalizedTime >= timePhases.TWILIGHT_START && normalizedTime <= timePhases.TWILIGHT_END) {
      const factor = (normalizedTime - timePhases.TWILIGHT_START) / (timePhases.TWILIGHT_END - timePhases.TWILIGHT_START);
      return this.lerpColor(sunsetColor, twilightColor, this.exponentialDecay(factor, 2));
    } else {
      const factor = (normalizedTime - timePhases.DEEP_NIGHT_START) / (timePhases.DEEP_NIGHT_END - timePhases.DEEP_NIGHT_START);
      return this.lerpColor(twilightColor, deepNightColor, this.exponentialDecay(factor, 2.5));
    }
  }
}
