
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
      night: new THREE.Color(0x000050),
      day: new THREE.Color(0x4682B4),
      sunset: new THREE.Color(0xFF8C42),
      evening: new THREE.Color(0x1a0050)
    };
    
    let resultColor: THREE.Color;
    const moonElevation = getMoonElevationFactor();
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      resultColor = this.lerpColor(keyColors.night, keyColors.night, moonElevation * 0.7);
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.DAY_END - timePhases.DAY_START);
      resultColor = this.lerpColor(keyColors.night, keyColors.day, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      resultColor = this.lerpColor(keyColors.day, keyColors.sunset, this.exponentialDecay(factor, 2));
    } else {
      const factor = (normalizedTime - timePhases.EVENING_START) / (timePhases.EVENING_END - timePhases.EVENING_START);
      resultColor = this.lerpColor(keyColors.sunset, keyColors.night, this.exponentialDecay(factor, 3));
    }
    
    return resultColor.getHex();
  }

  static getSynchronizedLightColorForTime(time: number, timePhases: any): THREE.Color {
    const normalizedTime = time % 1;
    
    const nightColor = new THREE.Color(0x4169E1);
    const dayColor = new THREE.Color(0xFFFAF0);
    const sunsetColor = new THREE.Color(0xFFE4B5);
    const eveningColor = new THREE.Color(0x6A5ACD);
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime <= timePhases.NIGHT_END) {
      return nightColor;
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime <= timePhases.DAY_END) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.DAY_END - timePhases.DAY_START);
      return this.lerpColor(nightColor, dayColor, this.smoothStep(0, 1, factor));
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime <= timePhases.SUNSET_END) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.SUNSET_END - timePhases.SUNSET_START);
      return this.lerpColor(dayColor, sunsetColor, this.exponentialDecay(factor, 2));
    } else {
      const factor = (normalizedTime - timePhases.EVENING_START) / (timePhases.EVENING_END - timePhases.EVENING_START);
      return this.lerpColor(sunsetColor, nightColor, this.exponentialDecay(factor, 3));
    }
  }
}
