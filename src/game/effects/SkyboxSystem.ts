
import * as THREE from 'three';
import { SKY_COLOR_PALETTES } from '../config/DayNightConfig';

export class SkyboxSystem {
  private scene: THREE.Scene;
  private skyboxMesh: THREE.Mesh;
  public skyboxMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  // OPTIMIZED: Add caching for smooth celestial movement
  private lastTimeUpdate: number = 0;
  private lastSunPosition: THREE.Vector3 = new THREE.Vector3();
  private cachedSunPosition: THREE.Vector3 = new THREE.Vector3();
  private updateCounter: number = 0;
  private readonly UPDATE_INTERVAL = 3; // Update every 3 frames instead of every frame
  private readonly TIME_THRESHOLD = 0.001; // Only update when time changes significantly

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
        dawnZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.dawn.zenith) },
        dawnHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.dawn.horizon) },
        dayZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.day.zenith) },
        dayHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.day.horizon) },
        sunsetZenith: { value: new THREE.Color(SKY_COLOR_PALETTES.sunset.zenith) },
        sunsetHorizon: { value: new THREE.Color(SKY_COLOR_PALETTES.sunset.horizon) },
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
          
          if (time >= 0.0 && time < 0.08) {
            zenithColor = nightZenith;
            horizonColor = nightHorizon;
          } else if (time >= 0.08 && time < 0.12) {
            float factor = (time - 0.08) / 0.04;
            factor = exponentialDecay(max(0.0, factor - 0.5) / 0.5, 4.0);
            zenithColor = lerpColor(nightZenith, dawnZenith, factor);
            horizonColor = lerpColor(nightHorizon, dawnHorizon, factor);
          } else if (time >= 0.12 && time < 0.25) {
            float factor = (time - 0.12) / 0.13;
            factor = exponentialDecay(max(0.0, factor - 0.7) / 0.3, 3.0);
            zenithColor = lerpColor(dawnZenith, dayZenith, factor);
            horizonColor = lerpColor(dawnHorizon, dayHorizon, factor);
          } else if (time >= 0.25 && time < 0.65) {
            zenithColor = dayZenith;
            horizonColor = dayHorizon;
          } else if (time >= 0.65 && time < 0.75) {
            float factor = (time - 0.65) / 0.1;
            factor = exponentialDecay(factor, 1.5);
            zenithColor = lerpColor(dayZenith, sunsetZenith, factor);
            horizonColor = lerpColor(dayHorizon, sunsetHorizon, factor);
          } else if (time >= 0.75 && time < 0.82) {
            float factor = (time - 0.75) / 0.07;
            factor = exponentialDecay(factor, 2.0);
            zenithColor = lerpColor(sunsetZenith, civilTwilightZenith, factor);
            horizonColor = lerpColor(sunsetHorizon, civilTwilightHorizon, factor);
          } else if (time >= 0.82 && time < 0.88) {
            float factor = (time - 0.82) / 0.06;
            factor = exponentialDecay(factor, 2.5);
            zenithColor = lerpColor(civilTwilightZenith, nauticalTwilightZenith, factor);
            horizonColor = lerpColor(civilTwilightHorizon, nauticalTwilightHorizon, factor);
          } else if (time >= 0.88 && time < 0.95) {
            float factor = (time - 0.88) / 0.07;
            factor = exponentialDecay(factor, 3.0);
            zenithColor = lerpColor(nauticalTwilightZenith, astroTwilightZenith, factor);
            horizonColor = lerpColor(nauticalTwilightHorizon, astroTwilightHorizon, factor);
          } else {
            float factor = (time - 0.95) / 0.05;
            factor = smoothStep(0.0, 1.0, factor);
            zenithColor = lerpColor(astroTwilightZenith, nightZenith, factor);
            horizonColor = lerpColor(astroTwilightHorizon, nightHorizon, factor);
          }
          
          float adjustedHeightFactor = pow(heightFactor, 1.0);
          
          if (time < 0.25) {
            adjustedHeightFactor = pow(heightFactor, 0.8);
          }
          
          return lerpColor(horizonColor, zenithColor, adjustedHeightFactor);
        }
        
        void main() {
          float heightFactor = (vDirection.y + 1.0) * 0.5;
          heightFactor = clamp(heightFactor, 0.0, 1.0);
          
          vec3 skyColor = getSkyColorForPhase(timeOfDay, heightFactor);
          
          if (timeOfDay < 0.25 || timeOfDay > 0.75) {
            float starField = fract(sin(dot(vDirection.xz * 80.0, vec2(12.9898, 78.233))) * 43758.5453);
            if (starField > 0.9985 && vDirection.y > 0.2) {
              float starVisibility = 1.0;
              if (timeOfDay >= 0.15 && timeOfDay < 0.25) {
                starVisibility = 1.0 - (timeOfDay - 0.15) / 0.1;
              } else if (timeOfDay > 0.75 && timeOfDay < 0.95) {
                starVisibility = (timeOfDay - 0.75) / 0.2;
              }
              starVisibility = clamp(starVisibility, 0.0, 1.0);
              
              float starIntensity = 0.3 + 0.2 * moonElevation;
              skyColor += vec3(0.8, 0.8, 1.0) * starIntensity * starVisibility;
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
    this.updateCounter++;
    
    // OPTIMIZED: Only update sun/moon positions every few frames and when time changes significantly
    const timeChanged = Math.abs(timeOfDay - this.timeOfDay) > this.TIME_THRESHOLD;
    const shouldUpdate = this.updateCounter % this.UPDATE_INTERVAL === 0 || timeChanged;
    
    if (shouldUpdate) {
      this.timeOfDay = timeOfDay;
      
      if (this.skyboxMaterial && this.skyboxMaterial.uniforms) {
        this.skyboxMaterial.uniforms.timeOfDay.value = timeOfDay;
        
        // OPTIMIZED: Cache and interpolate sun position for smoother movement
        const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
        const targetSunPosition = new THREE.Vector3(
          Math.cos(sunAngle) * 500,
          Math.sin(sunAngle) * 500,
          0
        );
        
        // Smooth interpolation between positions
        if (this.lastTimeUpdate !== 0) {
          this.cachedSunPosition.lerp(targetSunPosition, 0.1);
        } else {
          this.cachedSunPosition.copy(targetSunPosition);
        }
        
        this.skyboxMaterial.uniforms.sunPosition.value.copy(this.cachedSunPosition);
        this.lastTimeUpdate = timeOfDay;
      }
    }
    
    // Always update skybox position to follow player
    this.skyboxMesh.position.copy(playerPosition);
  }

  public setMoonElevation(elevation: number): void {
    if (this.skyboxMaterial && this.skyboxMaterial.uniforms) {
      this.skyboxMaterial.uniforms.moonElevation.value = elevation;
    }
  }

  public dispose(): void {
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      if (this.skyboxMesh.geometry) this.skyboxMesh.geometry.dispose();
      if (this.skyboxMaterial) this.skyboxMaterial.dispose();
    }
  }
}
