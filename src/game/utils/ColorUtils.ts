
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
    const { phase, nextPhase, factor } = this.getPhaseTransitionFactor(time, timePhases);
    const moonElevation = getMoonElevationFactor();
    
    const fogPalettes = {
      night: new THREE.Color(0x000040),
      dawn: new THREE.Color(0x2a2a4a),     // Much darker dawn fog
      day: new THREE.Color(0x87CEEB),
      sunset: new THREE.Color(0xFF8C42),
      civilTwilight: new THREE.Color(0x1e1e3e),
      nauticalTwilight: new THREE.Color(0x1a1a3a),
      astronomicalTwilight: new THREE.Color(0x0d0d26)
    };
    
    const currentColor = fogPalettes[phase as keyof typeof fogPalettes] || fogPalettes.day;
    const nextColor = fogPalettes[nextPhase as keyof typeof fogPalettes] || fogPalettes.night;
    
    let transitionFactor = factor;
    
    // Special handling for day phase to prevent early sunset colors
    if (phase === 'day' && nextPhase === 'sunset') {
      const normalizedTime = time % 1;
      const dayStart = timePhases.DAY_START;
      const sunsetStart = timePhases.SUNSET_START;
      const dayProgress = (normalizedTime - dayStart) / (sunsetStart - dayStart);
      
      // Only start transitioning to sunset in the final 20% of day phase
      if (dayProgress < 0.8) {
        transitionFactor = 0; // Keep pure day color
      } else {
        // Smooth transition in final 20% of day
        const lateTransition = (dayProgress - 0.8) / 0.2;
        transitionFactor = this.exponentialDecay(lateTransition, 1.5);
      }
    } else if (phase === 'night' && nextPhase === 'dawn') {
      // Severely delay the dawn transition to prevent early brightening
      transitionFactor = this.exponentialDecay(Math.max(0, factor - 0.7) / 0.3, 4);
    } else if (phase === 'dawn' && nextPhase === 'day') {
      // Much more gradual transition from dawn to day
      transitionFactor = this.exponentialDecay(Math.max(0, factor - 0.5) / 0.5, 2);
    } else if (phase === 'sunset' || phase === 'civilTwilight') {
      transitionFactor = this.exponentialDecay(factor, 2);
    } else if (phase === 'astronomicalTwilight' && nextPhase === 'night') {
      // Smoother transition to deep night
      transitionFactor = this.smoothStep(0, 1, factor);
    }
    
    const resultColor = this.lerpColor(currentColor, nextColor, transitionFactor);
    
    // Minimal moon influence during night phases only
    if (phase === 'night' || phase === 'astronomicalTwilight') {
      const moonInfluence = moonElevation * 0.1; // Further reduced influence
      resultColor.lerp(new THREE.Color(0x000a1a), moonInfluence);
    }
    
    return resultColor.getHex();
  }

  static getSynchronizedLightColorForTime(time: number, timePhases: any): THREE.Color {
    const { phase, nextPhase, factor } = this.getPhaseTransitionFactor(time, timePhases);
    
    const lightColors = {
      night: new THREE.Color(0x2a3a5a), // Cooler night light
      dawn: new THREE.Color(0x4a4a6a),  // Much darker dawn light
      day: new THREE.Color(0xFFFAF0),
      sunset: new THREE.Color(0xFFE4B5),
      civilTwilight: new THREE.Color(0x3a3a5a),
      nauticalTwilight: new THREE.Color(0x2a2a4a),
      astronomicalTwilight: new THREE.Color(0x2a3a5a)
    };
    
    const currentColor = lightColors[phase as keyof typeof lightColors] || lightColors.day;
    const nextColor = lightColors[nextPhase as keyof typeof lightColors] || lightColors.night;
    
    let transitionFactor = factor;
    
    // Apply similar logic for lighting to prevent early sunset colors
    if (phase === 'day' && nextPhase === 'sunset') {
      const normalizedTime = time % 1;
      const dayStart = timePhases.DAY_START;
      const sunsetStart = timePhases.SUNSET_START;
      const dayProgress = (normalizedTime - dayStart) / (sunsetStart - dayStart);
      
      // Keep pure day lighting until final 15% of day phase
      if (dayProgress < 0.85) {
        transitionFactor = 0;
      } else {
        const lateTransition = (dayProgress - 0.85) / 0.15;
        transitionFactor = this.smoothStep(0, 1, lateTransition);
      }
    } else if (phase === 'night' && nextPhase === 'dawn') {
      // Prevent early light brightening with severe delay
      transitionFactor = this.exponentialDecay(Math.max(0, factor - 0.8) / 0.2, 5);
    } else if (phase === 'dawn' && nextPhase === 'day') {
      // Very gradual transition from dawn to day
      transitionFactor = this.exponentialDecay(Math.max(0, factor - 0.6) / 0.4, 2.5);
    } else if (phase === 'sunset' || phase === 'dawn') {
      transitionFactor = this.smoothStep(0, 1, factor);
    } else if (phase === 'civilTwilight' || phase === 'nauticalTwilight') {
      transitionFactor = this.exponentialDecay(factor, 1.5);
    }
    
    return this.lerpColor(currentColor, nextColor, transitionFactor);
  }

  private static getPhaseTransitionFactor(time: number, timePhases: any): { phase: string, nextPhase: string, factor: number } {
    const normalizedTime = time % 1;
    
    if (normalizedTime >= timePhases.NIGHT_START && normalizedTime < timePhases.DAWN_START) {
      const factor = (normalizedTime - timePhases.NIGHT_START) / (timePhases.DAWN_START - timePhases.NIGHT_START);
      return { phase: 'night', nextPhase: 'dawn', factor };
    } else if (normalizedTime >= timePhases.DAWN_START && normalizedTime < timePhases.DAY_START) {
      const factor = (normalizedTime - timePhases.DAWN_START) / (timePhases.DAY_START - timePhases.DAWN_START);
      return { phase: 'dawn', nextPhase: 'day', factor };
    } else if (normalizedTime >= timePhases.DAY_START && normalizedTime < timePhases.SUNSET_START) {
      const factor = (normalizedTime - timePhases.DAY_START) / (timePhases.SUNSET_START - timePhases.DAY_START);
      return { phase: 'day', nextPhase: 'sunset', factor };
    } else if (normalizedTime >= timePhases.SUNSET_START && normalizedTime < timePhases.CIVIL_TWILIGHT_START) {
      const factor = (normalizedTime - timePhases.SUNSET_START) / (timePhases.CIVIL_TWILIGHT_START - timePhases.SUNSET_START);
      return { phase: 'sunset', nextPhase: 'civilTwilight', factor };
    } else if (normalizedTime >= timePhases.CIVIL_TWILIGHT_START && normalizedTime < timePhases.NAUTICAL_TWILIGHT_START) {
      const factor = (normalizedTime - timePhases.CIVIL_TWILIGHT_START) / (timePhases.NAUTICAL_TWILIGHT_START - timePhases.CIVIL_TWILIGHT_START);
      return { phase: 'civilTwilight', nextPhase: 'nauticalTwilight', factor };
    } else if (normalizedTime >= timePhases.NAUTICAL_TWILIGHT_START && normalizedTime < timePhases.ASTRONOMICAL_TWILIGHT_START) {
      const factor = (normalizedTime - timePhases.NAUTICAL_TWILIGHT_START) / (timePhases.ASTRONOMICAL_TWILIGHT_START - timePhases.NAUTICAL_TWILIGHT_START);
      return { phase: 'nauticalTwilight', nextPhase: 'astronomicalTwilight', factor };
    } else {
      const factor = (normalizedTime - timePhases.ASTRONOMICAL_TWILIGHT_START) / (1.0 - timePhases.ASTRONOMICAL_TWILIGHT_START);
      return { phase: 'astronomicalTwilight', nextPhase: 'night', factor };
    }
  }
}
