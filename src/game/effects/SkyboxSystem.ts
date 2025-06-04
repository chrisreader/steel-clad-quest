
import * as THREE from 'three';
import { MoonCycleSystem, MoonPhaseData } from './MoonCycleSystem';

export class SkyboxSystem {
  private scene: THREE.Scene;
  private skyboxMesh: THREE.Mesh;
  private skyboxMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  private moonCycleSystem: MoonCycleSystem;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moonCycleSystem = new MoonCycleSystem(0); // Start at New Moon
    this.createSkyboxMaterial();
    this.createSkyboxMesh();
    console.log("🌙 SkyboxSystem initialized with moon cycle integration");
  }

  private createSkyboxMaterial(): void {
    this.skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        timeOfDay: { value: this.timeOfDay },
        sunPosition: { value: new THREE.Vector3() },
        moonPhaseIntensity: { value: 0.0 },  // NEW: Moon phase intensity
        moonIllumination: { value: 0.0 },    // NEW: Moon illumination percentage
        dayTopColor: { value: new THREE.Color(0x87CEEB) },
        dayBottomColor: { value: new THREE.Color(0xE6F3FF) },
        nightTopColor: { value: new THREE.Color(0x0B1426) },
        nightBottomColor: { value: new THREE.Color(0x1E2951) },
        sunriseTopColor: { value: new THREE.Color(0x4A90E2) },
        sunriseBottomColor: { value: new THREE.Color(0xFFE8D0) },
        sunsetTopColor: { value: new THREE.Color(0x4A5D7A) },
        sunsetBottomColor: { value: new THREE.Color(0xFF6B35) }
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
        uniform float moonPhaseIntensity;
        uniform float moonIllumination;
        uniform vec3 dayTopColor;
        uniform vec3 dayBottomColor;
        uniform vec3 nightTopColor;
        uniform vec3 nightBottomColor;
        uniform vec3 sunriseTopColor;
        uniform vec3 sunriseBottomColor;
        uniform vec3 sunsetTopColor;
        uniform vec3 sunsetBottomColor;
        
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        vec3 getSkyColor(float time, float heightFactor) {
          vec3 topColor = dayTopColor;
          vec3 bottomColor = dayBottomColor;
          
          // PHASE 1: Modified height gradient calculation - steeper transition
          float adjustedHeightFactor = pow(heightFactor, 2.0);
          
          // PHASE 3: Create height-based color zones with cutoff
          float horizonZone = smoothstep(0.0, 0.3, heightFactor);
          float midZone = smoothstep(0.3, 0.6, heightFactor);
          float upperZone = smoothstep(0.6, 1.0, heightFactor);
          
          if (time >= 0.15 && time <= 0.35) {
            // Sunrise period
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              // UPDATED: Night colors now affected by moon phase
              vec3 baseNightTop = mix(nightTopColor, vec3(0.02, 0.02, 0.05), moonPhaseIntensity * 0.3);
              vec3 baseNightBottom = mix(nightBottomColor, vec3(0.05, 0.05, 0.1), moonPhaseIntensity * 0.3);
              
              vec3 neutralTopColor = mix(baseNightTop, dayTopColor, 0.7);
              topColor = mix(baseNightTop, neutralTopColor, factor);
              
              vec3 fullBottomColor = mix(baseNightBottom, sunriseBottomColor, factor);
              bottomColor = mix(fullBottomColor * (1.0 - upperZone), fullBottomColor, horizonZone);
            } else {
              float factor = (time - 0.25) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              vec3 neutralTopColor = mix(sunriseTopColor, dayTopColor, 0.8);
              topColor = mix(neutralTopColor, dayTopColor, factor);
              
              vec3 fullBottomColor = mix(sunriseBottomColor, dayBottomColor, factor);
              bottomColor = mix(fullBottomColor * (1.0 - upperZone), fullBottomColor, horizonZone);
            }
          } else if (time >= 0.35 && time <= 0.65) {
            // Day period
            topColor = dayTopColor;
            bottomColor = dayBottomColor;
          } else if (time >= 0.65 && time <= 0.85) {
            // Sunset period
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              vec3 neutralTopColor = mix(dayTopColor, sunsetTopColor, 0.4);
              topColor = mix(dayTopColor, neutralTopColor, factor);
              
              vec3 dramaticBottomColor = mix(dayBottomColor, sunsetBottomColor, factor);
              float sunsetIntensity = (1.0 - pow(heightFactor, 3.0)) * horizonZone;
              bottomColor = mix(dayBottomColor, dramaticBottomColor, sunsetIntensity);
              
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              // UPDATED: Transition to moon-phase affected night colors
              vec3 baseNightTop = mix(nightTopColor, vec3(0.02, 0.02, 0.05), moonPhaseIntensity * 0.3);
              vec3 baseNightBottom = mix(nightBottomColor, vec3(0.05, 0.05, 0.1), moonPhaseIntensity * 0.3);
              
              vec3 neutralTopColor = mix(sunsetTopColor, baseNightTop, 0.8);
              topColor = mix(neutralTopColor, baseNightTop, factor);
              
              vec3 fullBottomColor = mix(sunsetBottomColor, baseNightBottom, factor);
              float sunsetIntensity = (1.0 - pow(heightFactor, 4.0)) * horizonZone;
              bottomColor = mix(baseNightBottom, fullBottomColor, sunsetIntensity);
            }
          } else {
            // Night period - UPDATED: Colors affected by moon phase
            vec3 baseNightTop = mix(nightTopColor, vec3(0.02, 0.02, 0.05), moonPhaseIntensity * 0.3);
            vec3 baseNightBottom = mix(nightBottomColor, vec3(0.05, 0.05, 0.1), moonPhaseIntensity * 0.3);
            topColor = baseNightTop;
            bottomColor = baseNightBottom;
          }
          
          // PHASE 4: Fine-tuned transition with more aggressive height masking
          float blendFactor = 1.0 - adjustedHeightFactor;
          
          // Additional height-based masking for sunset periods
          if ((time >= 0.65 && time <= 0.85) || (time >= 0.15 && time <= 0.35)) {
            blendFactor *= (1.0 - pow(heightFactor, 1.8));
          }
          
          return mix(topColor, bottomColor, blendFactor);
        }
        
        void main() {
          float heightFactor = (vDirection.y + 1.0) * 0.5;
          heightFactor = clamp(heightFactor, 0.0, 1.0);
          
          vec3 skyColor = getSkyColor(timeOfDay, heightFactor);
          
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

  public update(timeOfDay: number, playerPosition: THREE.Vector3, deltaTime: number, cycleSpeed: number): void {
    this.timeOfDay = timeOfDay;
    
    // Update moon cycle system
    this.moonCycleSystem.update(timeOfDay, deltaTime, cycleSpeed);
    const moonPhaseData = this.moonCycleSystem.getCurrentPhaseData();
    
    if (this.skyboxMaterial && this.skyboxMaterial.uniforms) {
      this.skyboxMaterial.uniforms.timeOfDay.value = timeOfDay;
      this.skyboxMaterial.uniforms.moonPhaseIntensity.value = moonPhaseData.directionalLightMultiplier;
      this.skyboxMaterial.uniforms.moonIllumination.value = moonPhaseData.illuminationPercentage / 100.0;
      
      // Update sun position for reference
      const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
      const sunPosition = new THREE.Vector3(
        Math.cos(sunAngle) * 500,
        Math.sin(sunAngle) * 500,
        0
      );
      this.skyboxMaterial.uniforms.sunPosition.value.copy(sunPosition);
    }
    
    // Keep skybox centered on player
    this.skyboxMesh.position.copy(playerPosition);
  }
  
  public getMoonPhaseData(): MoonPhaseData {
    return this.moonCycleSystem.getCurrentPhaseData();
  }
  
  public setMoonCycleDay(day: number): void {
    this.moonCycleSystem.setCycleDay(day);
  }

  public dispose(): void {
    if (this.moonCycleSystem) {
      this.moonCycleSystem.dispose();
    }
    
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      if (this.skyboxMesh.geometry) this.skyboxMesh.geometry.dispose();
      if (this.skyboxMaterial) this.skyboxMaterial.dispose();
    }
  }
}
