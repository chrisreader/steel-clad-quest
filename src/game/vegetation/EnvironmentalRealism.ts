
import * as THREE from 'three';

export interface EnvironmentalConditions {
  moisture: number;        // 0-1, affects species selection and color
  elevation: number;       // relative elevation, affects biome placement
  slope: number;          // terrain slope, affects drainage and wind exposure
  sunExposure: number;    // 0-1, affects growth and color intensity
  playerTraffic: number;  // 0-1, creates wear patterns
  waterProximity: number; // 0-1, distance to water sources
  windExposure: number;   // 0-1, affects species hardiness
}

export interface SpeciesPreferences {
  preferredMoisture: { min: number; max: number };
  elevationTolerance: { min: number; max: number };
  sunRequirement: number; // 0-1
  windTolerance: number;  // 0-1
  trafficsensitivity: number; // 0-1, higher = more affected by trampling
}

export class EnvironmentalRealism {
  private static readonly SPECIES_PREFERENCES: Record<string, SpeciesPreferences> = {
    meadow: {
      preferredMoisture: { min: 0.4, max: 0.8 },
      elevationTolerance: { min: 0.0, max: 0.6 },
      sunRequirement: 0.6,
      windTolerance: 0.4,
      trafficsensitivity: 0.7
    },
    prairie: {
      preferredMoisture: { min: 0.2, max: 0.6 },
      elevationTolerance: { min: 0.3, max: 1.0 },
      sunRequirement: 0.8,
      windTolerance: 0.9,
      trafficsensitivity: 0.3
    },
    clumping: {
      preferredMoisture: { min: 0.3, max: 0.7 },
      elevationTolerance: { min: 0.0, max: 0.8 },
      sunRequirement: 0.5,
      windTolerance: 0.6,
      trafficsensitivity: 0.8
    },
    fine: {
      preferredMoisture: { min: 0.5, max: 0.9 },
      elevationTolerance: { min: 0.0, max: 0.4 },
      sunRequirement: 0.4,
      windTolerance: 0.3,
      trafficsensitivity: 0.9
    }
  };

  public static calculateEnvironmentalConditions(
    position: THREE.Vector3,
    terrainHeight: number = 0
  ): EnvironmentalConditions {
    // Use multi-scale noise for realistic environmental variation
    const largeMoisture = Math.sin(position.x * 0.005) * Math.cos(position.z * 0.005);
    const mediumMoisture = Math.sin(position.x * 0.02) * Math.cos(position.z * 0.02) * 0.3;
    const fineMoisture = Math.sin(position.x * 0.08) * Math.cos(position.z * 0.08) * 0.1;
    
    const baseMoisture = 0.5 + (largeMoisture + mediumMoisture + fineMoisture) * 0.5;
    
    // Calculate water proximity (affects moisture)
    const waterNoise = Math.sin(position.x * 0.003 + 1000) * Math.cos(position.z * 0.003 + 1000);
    const waterProximity = Math.max(0, waterNoise);
    
    // Enhanced moisture with water influence
    const moisture = Math.max(0, Math.min(1, baseMoisture + waterProximity * 0.3));
    
    // Calculate elevation and slope
    const elevation = Math.max(0, terrainHeight / 10); // Normalize to 0-1 range
    const slopeNoise = Math.abs(Math.sin(position.x * 0.05) - Math.sin(position.z * 0.05));
    const slope = Math.min(1, slopeNoise);
    
    // Sun exposure (affected by elevation and slope)
    const sunExposure = Math.min(1, 0.6 + elevation * 0.3 + slope * 0.1);
    
    // Wind exposure (higher at elevation and on slopes)
    const windExposure = Math.min(1, 0.3 + elevation * 0.4 + slope * 0.3);
    
    return {
      moisture,
      elevation,
      slope,
      sunExposure,
      playerTraffic: 0, // Will be updated by traffic tracking
      waterProximity,
      windExposure
    };
  }

  public static calculateSpeciesSuitability(
    species: string,
    conditions: EnvironmentalConditions
  ): number {
    const prefs = this.SPECIES_PREFERENCES[species];
    if (!prefs) return 0.5; // Default suitability

    let suitability = 1.0;

    // Moisture preference
    const moistureMatch = this.calculatePreferenceMatch(
      conditions.moisture,
      prefs.preferredMoisture.min,
      prefs.preferredMoisture.max
    );
    suitability *= moistureMatch;

    // Elevation tolerance
    const elevationMatch = this.calculatePreferenceMatch(
      conditions.elevation,
      prefs.elevationTolerance.min,
      prefs.elevationTolerance.max
    );
    suitability *= elevationMatch;

    // Sun requirement
    const sunMatch = 1.0 - Math.abs(conditions.sunExposure - prefs.sunRequirement);
    suitability *= Math.max(0.1, sunMatch);

    // Wind tolerance
    const windStress = Math.max(0, conditions.windExposure - prefs.windTolerance);
    suitability *= Math.max(0.1, 1.0 - windStress);

    // Traffic impact
    const trafficImpact = conditions.playerTraffic * prefs.trafficsensitivity;
    suitability *= Math.max(0.1, 1.0 - trafficImpact);

    return Math.max(0.05, Math.min(1.0, suitability));
  }

  private static calculatePreferenceMatch(
    value: number,
    minPreferred: number,
    maxPreferred: number
  ): number {
    if (value >= minPreferred && value <= maxPreferred) {
      return 1.0; // Perfect match
    }
    
    // Calculate falloff outside preferred range
    if (value < minPreferred) {
      const distance = minPreferred - value;
      return Math.max(0.1, 1.0 - distance * 2);
    } else {
      const distance = value - maxPreferred;
      return Math.max(0.1, 1.0 - distance * 2);
    }
  }

  /**
   * Calculate realistic color variation based on environmental conditions
   */
  public static getEnvironmentalColorModifier(
    baseColor: THREE.Color,
    conditions: EnvironmentalConditions,
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): THREE.Color {
    const color = baseColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);

    // Moisture effects - more moisture = more vibrant
    const moistureBoost = (conditions.moisture - 0.5) * 0.1;
    hsl.s = Math.max(0, Math.min(1, hsl.s + moistureBoost));
    hsl.l = Math.max(0, Math.min(1, hsl.l + moistureBoost * 0.5));

    // Sun exposure effects - more sun = brighter but can cause bleaching
    if (conditions.sunExposure > 0.8) {
      hsl.l += 0.05; // Slight bleaching in high sun
      hsl.s -= 0.1;  // Desaturation from sun stress
    }

    // Wind exposure effects - stress from wind
    if (conditions.windExposure > 0.7) {
      hsl.s -= 0.05; // Slight desaturation from wind stress
    }

    // Player traffic effects - trampling creates brown patches
    if (conditions.playerTraffic > 0.3) {
      const brownShift = conditions.playerTraffic * 0.3;
      hsl.h = this.lerpAngle(hsl.h, 0.08, brownShift); // Shift towards brown
      hsl.s *= (1 - brownShift * 0.5);
      hsl.l *= (1 - brownShift * 0.3);
    }

    // Seasonal dormancy effects
    if (season === 'winter' && conditions.moisture < 0.4) {
      // Dry winter areas go dormant (brown)
      hsl.h = this.lerpAngle(hsl.h, 0.08, 0.6);
      hsl.s *= 0.3;
      hsl.l *= 0.7;
    }

    color.setHSL(hsl.h, hsl.s, hsl.l);
    return color;
  }

  private static lerpAngle(a: number, b: number, t: number): number {
    const difference = b - a;
    if (Math.abs(difference) > 0.5) {
      if (difference > 0) {
        a += 1;
      } else {
        b += 1;
      }
    }
    return (a + (b - a) * t) % 1;
  }
}
