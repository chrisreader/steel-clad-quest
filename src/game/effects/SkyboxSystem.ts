
import * as THREE from 'three';
import { SKY_COLOR_PALETTES } from '../config/DayNightConfig';

export class SkyboxSystem {
  private scene: THREE.Scene;
  private skyboxMesh: THREE.Mesh;
  private skyboxMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createRealisticSkyboxMaterial();
    this.createSkyboxMesh();
  }

  private createRealisticSkyboxMaterial(): void {
    this.skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        timeOfDay: { value: this.timeOfDay },
        sunPosition: { value: new THREE.Vector3() },
        moonElevation: { value: 0.0 },
        // Night colors
        nightZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.night.zenith) },
        nightHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.night.horizon) },
        // Dawn colors
        dawnZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.dawn.zenith) },
        dawnHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.dawn.horizon) },
        // Day colors
        dayZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.day.zenith) },
        dayHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.day.horizon) },
        // Sunset colors
        sunsetZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.sunset.zenith) },
        sunsetHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.sunset.horizon) },
        // Twilight colors
        civilTwilightZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.civilTwilight.zenith) },
        civilTwilightHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.civilTwilight.horizon) },
        nauticalTwilightZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.nauticalTwilight.zenith) },
        nauticalTwilightHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.nauticalTwilight.horizon) },
        astroTwilightZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.astronomicalTwilight.zenith) },
        astroTwilightHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.astronomicalTwilight.horizon) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDirection = normalize(position);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 sunPosition;
        uniform float moonElevation;
        
        // Color uniforms for all phases
        uniform vec3 nightZenith;
        uniform vec3 nightHorizon;
        uniform vec3 dawnZenith;
        uniform vec3 dawnHorizon;
        uniform vec3 dayZenith;
        uniform vec3 dayHorizon;
        uniform vec3 sunsetZenith;
        uniform vec3 sunsetHorizon;
        uniform vec3 civilTwilightZenith;
        uniform vec3 civilTwilightHorizon;
        uniform vec3 nauticalTwilightZenith;
        uniform vec3 nauticalTwilightHorizon;
        uniform vec3 astroTwilightZenith;
        uniform vec3 astroTwilightHorizon;
        
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        vec3 lerpColor(vec3 a, vec3 b, float factor) {
          return mix(a, b, clamp(factor, 0.0, 1.0));
        }
        
        float smoothStep(float edge0, float edge1, float x) {
          float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        }
        
        float exponentialDecay(float factor, float intensity) {
          return pow(clamp(factor, 0.0, 1.0), intensity);
        }
        
        vec3 getSkyColorForPhase(float time, float heightFactor) {
          vec3 zenithColor, horizonColor;
          
          // Determine current phase and colors
          if (time >= 0.0 && time < 0.15) {
            // Night
            zenithColor = nightZenith;
            horizonColor = nightHorizon;
          } else if (time >= 0.15 && time < 0.25) {
            // Dawn transition
            float factor = (time - 0.15) / 0.1;
            factor = smoothStep(0.0, 1.0, factor);
            zenithColor = lerpColor(nightZenith, dawnZenith, factor);
            horizonColor = lerpColor(nightHorizon, dawnHorizon, factor);
          } else if (time >= 0.25 && time < 0.7) {
            // Day
            zenithColor = dayZenith;
            horizonColor = dayHorizon;
          } else if (time >= 0.7 && time < 0.8) {
            // Sunset transition
            float factor = (time - 0.7) / 0.1;
            factor = exponentialDecay(factor, 1.5);
            zenithColor = lerpColor(dayZenith, sunsetZenith, factor);
            horizonColor = lerpColor(dayHorizon, sunsetHorizon, factor);
          } else if (time >= 0.8 && time < 0.85) {
            // Civil twilight
            float factor = (time - 0.8) / 0.05;
            factor = exponentialDecay(factor, 2.0);
            zenithColor = lerpColor(sunsetZenith, civilTwilightZenith, factor);
            horizonColor = lerpColor(sunsetHorizon, civilTwilightHorizon, factor);
          } else if (time >= 0.85 && time < 0.9) {
            // Nautical twilight
            float factor = (time - 0.85) / 0.05;
            factor = exponentialDecay(factor, 2.5);
            zenithColor = lerpColor(civilTwilightZenith, nauticalTwilightZenith, factor);
            horizonColor = lerpColor(civilTwilightHorizon, nauticalTwilightHorizon, factor);
          } else {
            // Astronomical twilight to night
            float factor = (time - 0.9) / 0.1;
            factor = exponentialDecay(factor, 3.0);
            zenithColor = lerpColor(nauticalTwilightZenith, astroTwilightZenith, factor);
            horizonColor = lerpColor(nauticalTwilightHorizon, astroTwilightHorizon, factor);
            
            // Transition to night at the end
            if (time > 0.95) {
              float nightFactor = (time - 0.95) / 0.05;
              nightFactor = exponentialDecay(nightFactor, 2.0);
              zenithColor = lerpColor(astroTwilightZenith, nightZenith, nightFactor);
              horizonColor = lerpColor(astroTwilightHorizon, nightHorizon, nightFactor);
            }
          }
          
          // Height-based gradient with atmospheric perspective
          float adjustedHeightFactor = pow(heightFactor, 1.2);
          
          // Apply height-based darkening more aggressively during twilight
          if (time >= 0.8 && time <= 1.0) {
            float twilightDarkening = pow(heightFactor, 0.8);
            adjustedHeightFactor = twilightDarkening;
          }
          
          return lerpColor(horizonColor, zenithColor, adjustedHeightFactor);
        }
        
        void main() {
          float heightFactor = (vDirection.y + 1.0) * 0.5;
          heightFactor = clamp(heightFactor, 0.0, 1.0);
          
          vec3 skyColor = getSkyColorForPhase(timeOfDay, heightFactor);
          
          // Add star field during night and twilight phases
          if (timeOfDay < 0.25 || timeOfDay > 0.8) {
            float starField = fract(sin(dot(vDirection.xz * 80.0, vec2(12.9898, 78.233))) * 43758.5453);
            if (starField > 0.9985 && vDirection.y > 0.2) {
              float starVisibility = 1.0;
              if (timeOfDay >= 0.15 && timeOfDay < 0.25) {
                starVisibility = 1.0 - (timeOfDay - 0.15) / 0.1;
              } else if (timeOfDay > 0.8) {
                starVisibility = (timeOfDay - 0.8) / 0.2;
              }
              starVisibility = clamp(starVisibility, 0.0, 1.0);
              
              float starIntensity = 0.5 + 0.3 * moonElevation;
              skyColor += vec3(0.9, 0.9, 1.0) * starIntensity * starVisibility;
            }
          }
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
  }

  private createSkyboxMesh(): void {
    const skyboxGeometry = new THREE.SphereGeometry(1000, 32, 32);
    this.skyboxMesh = new THREE.Mesh(skyboxGeometry, this.skyboxMaterial);
    this.skyboxMesh.renderOrder = -1;
    this.scene.add(this.skyboxMesh);
  }

  public update(timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    if (this.skyboxMaterial && this.skyboxMaterial.uniforms) {
      this.skyboxMaterial.uniforms.timeOfDay.value = timeOfDay;
      
      const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
      const sunPosition = new THREE.Vector3(
        Math.cos(sunAngle) * 500,
        Math.sin(sunAngle) * 500,
        0
      );
      this.skyboxMaterial.uniforms.sunPosition.value.copy(sunPosition);
    }
    
    this.skyboxMesh.position.copy(playerPosition);
  }

  public dispose(): void {
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      if (this.skyboxMesh.geometry) this.skyboxMesh.geometry.dispose();
      if (this.skyboxMaterial) this.skyboxMaterial.dispose();
    }
  }
}
