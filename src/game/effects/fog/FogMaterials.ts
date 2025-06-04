
import * as THREE from 'three';
import {
  UNIFIED_FOG_FRAGMENT_SHADER,
  ATMOSPHERIC_FOG_FRAGMENT_SHADER,
  FOG_VERTEX_SHADER,
  FOG_WALL_VERTEX_SHADER,
  ATMOSPHERIC_VERTEX_SHADER
} from './FogShaders';

export interface FogMaterialUniforms {
  time: { value: number };
  timeOfDay: { value: number };
  dayFogColor: { value: THREE.Color };
  nightFogColor: { value: THREE.Color };
  sunriseFogColor: { value: THREE.Color };
  sunsetFogColor: { value: THREE.Color };
  fogDensityMultiplier: { value: number };
  maxFogDistance: { value: number };
  maxFogOpacity: { value: number };
  blendingAlpha: { value: number };
  fogDensity: { value: number };
  layerHeight: { value: number };
  playerPosition: { value: THREE.Vector3 };
  noiseScale: { value: number };
  windDirection: { value: THREE.Vector2 };
  fogType: { value: number };
}

export interface WallFogMaterialUniforms extends FogMaterialUniforms {
  fogWallHeight: { value: number };
  layerDepth: { value: number };
}

export interface AtmosphericMaterialUniforms {
  time: { value: number };
  timeOfDay: { value: number };
  dayFogColor: { value: THREE.Color };
  nightFogColor: { value: THREE.Color };
  sunriseFogColor: { value: THREE.Color };
  sunsetFogColor: { value: THREE.Color };
  atmosphericDensity: { value: number };
  atmosphericMultiplier: { value: number };
  maxAtmosphericDistance: { value: number };
  playerPosition: { value: THREE.Vector3 };
  noiseScale: { value: number };
}

export class FogMaterialFactory {
  private static defaultColors = {
    day: new THREE.Color(0xB0E0E6),
    night: new THREE.Color(0x191970),
    sunrise: new THREE.Color(0xFFB366),
    sunset: new THREE.Color(0xFF8C42)
  };

  public static createUnifiedFogMaterial(fogType: number = 0): THREE.ShaderMaterial {
    const uniforms: FogMaterialUniforms = {
      time: { value: 0.0 },
      timeOfDay: { value: 0.25 },
      dayFogColor: { value: this.defaultColors.day.clone() },
      nightFogColor: { value: this.defaultColors.night.clone() },
      sunriseFogColor: { value: this.defaultColors.sunrise.clone() },
      sunsetFogColor: { value: this.defaultColors.sunset.clone() },
      fogDensityMultiplier: { value: 1.0 },
      maxFogDistance: { value: 300.0 },
      maxFogOpacity: { value: 0.25 },
      blendingAlpha: { value: 0.0 },
      fogDensity: { value: 0.08 },
      layerHeight: { value: 1.0 },
      playerPosition: { value: new THREE.Vector3() },
      noiseScale: { value: 0.02 },
      windDirection: { value: new THREE.Vector2(1.0, 0.5) },
      fogType: { value: fogType }
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: FOG_VERTEX_SHADER,
      fragmentShader: UNIFIED_FOG_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  public static createFogWallMaterial(): THREE.ShaderMaterial {
    const uniforms: WallFogMaterialUniforms = {
      ...this.createUnifiedFogMaterial(1).uniforms as FogMaterialUniforms,
      fogWallHeight: { value: 25.0 },
      layerDepth: { value: 0.0 }
    };

    // Override specific settings for walls
    uniforms.dayFogColor.value = new THREE.Color(0xF5F5F5);
    uniforms.nightFogColor.value = new THREE.Color(0x707090);
    uniforms.sunriseFogColor.value = new THREE.Color(0xFFE8D0);
    uniforms.sunsetFogColor.value = new THREE.Color(0xFFDCC0);
    uniforms.fogDensity.value = 0.05;
    uniforms.noiseScale.value = 0.015;
    uniforms.windDirection.value = new THREE.Vector2(1.0, 0.3);

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: FOG_WALL_VERTEX_SHADER,
      fragmentShader: UNIFIED_FOG_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
  }

  public static createAtmosphericFogMaterial(): THREE.ShaderMaterial {
    const uniforms: AtmosphericMaterialUniforms = {
      time: { value: 0.0 },
      timeOfDay: { value: 0.25 },
      dayFogColor: { value: new THREE.Color(0xF8F8F8) },
      nightFogColor: { value: new THREE.Color(0x606090) },
      sunriseFogColor: { value: new THREE.Color(0xFFECE0) },
      sunsetFogColor: { value: new THREE.Color(0xFFE0C0) },
      atmosphericDensity: { value: 0.06 },
      atmosphericMultiplier: { value: 1.0 },
      maxAtmosphericDistance: { value: 400.0 },
      playerPosition: { value: new THREE.Vector3() },
      noiseScale: { value: 0.008 }
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: ATMOSPHERIC_VERTEX_SHADER,
      fragmentShader: ATMOSPHERIC_FOG_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }
}
