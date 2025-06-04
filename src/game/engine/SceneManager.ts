import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private skyGeometry: THREE.SphereGeometry;
  private skyMaterial: THREE.ShaderMaterial;
  private skyMesh: THREE.Mesh;
  private timeOfDay: number = 0.25; // Start at sunrise
  private cloudColor: THREE.Color = new THREE.Color();
  
  // NEW: Accelerated time periods for faster dawn clearing
  private static readonly TIME_PERIODS = {
    NIGHT_START: 0.0,
    DAWN_START: 0.15,      // Dawn begins
    DAWN_END: 0.22,        // Shortened from 0.25 to 0.22 - 30% faster dawn
    EARLY_DAY_START: 0.22, // NEW: Brief early day transition
    EARLY_DAY_END: 0.25,   // NEW: Quick transition to full day
    DAY_START: 0.25,       // Full day begins earlier
    DAY_END: 0.65,
    DUSK_START: 0.65,
    DUSK_END: 0.75,        // Keep dusk normal length
    EVENING_START: 0.75,
    EVENING_END: 0.82,     // Shortened evening
    TWILIGHT_START: 0.82,  // Ultra-short twilight
    TWILIGHT_END: 0.86,    // Even shorter twilight
    NIGHT_END: 1.0
  };

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.createLighting();
    this.createSkybox();
  }

  // NEW: Ultra-steep interpolation for aggressive dawn color clearing
  private ultraSteepStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    // Ultra-steep curve - colors change very rapidly
    return t * t * t * t * (35.0 - 84.0 * t + 70.0 * t * t - 20.0 * t * t * t);
  }

  // NEW: Exponential curve for rapid color clearing
  private exponentialStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * t; // Cubic for rapid acceleration
  }

  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  private steepStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * t * (10 - 15 * t + 6 * t * t);
  }

  private createLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(100, 100, 50);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);
  }

  private createSkybox(): void {
    this.skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        timeOfDay: { value: this.timeOfDay },
        sunPosition: { value: new THREE.Vector3() },
        nightColor: { value: new THREE.Color(0x000511) },
        dawnColor: { value: new THREE.Color(0xFF6B35) },    // Orange dawn
        dayColor: { value: new THREE.Color(0x87CEEB) },     // Sky blue
        duskColor: { value: new THREE.Color(0xFF4500) },    // Orange dusk
        eveningColor: { value: new THREE.Color(0x4B0082) }, // Indigo evening
        twilightColor: { value: new THREE.Color(0x191970) } // Midnight blue
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 sunPosition;
        uniform vec3 nightColor;
        uniform vec3 dawnColor;
        uniform vec3 dayColor;
        uniform vec3 duskColor;
        uniform vec3 eveningColor;
        uniform vec3 twilightColor;
        
        varying vec3 vWorldPosition;
        
        // NEW: Ultra-steep interpolation for rapid dawn clearing
        float ultraSteepStep(float edge0, float edge1, float x) {
          float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
          return t * t * t * t * (35.0 - 84.0 * t + 70.0 * t * t - 20.0 * t * t * t);
        }
        
        // NEW: Exponential curve for aggressive color transitions
        float exponentialStep(float edge0, float edge1, float x) {
          float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
          return t * t * t;
        }
        
        float smoothstep3(float edge0, float edge1, float x) {
          float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        }
        
        void main() {
          vec3 direction = normalize(vWorldPosition);
          float height = direction.y;
          
          vec3 currentColor;
          
          // NEW: Accelerated dawn phase with ultra-steep color transitions
          if (timeOfDay >= 0.15 && timeOfDay < 0.22) {
            // Ultra-accelerated dawn phase (0.15 -> 0.22)
            float dawnProgress = (timeOfDay - 0.15) / 0.07; // 30% shorter window
            
            if (dawnProgress < 0.6) {
              // Rapid clearing of night colors (first 60% of dawn)
              float factor = exponentialStep(0.0, 0.6, dawnProgress);
              currentColor = mix(nightColor, dawnColor, factor);
            } else {
              // Ultra-steep transition to day colors (last 40% of dawn)
              float factor = ultraSteepStep(0.6, 1.0, dawnProgress);
              currentColor = mix(dawnColor, dayColor, factor);
            }
          }
          // NEW: Early day phase for final color clearing (0.22 -> 0.25)
          else if (timeOfDay >= 0.22 && timeOfDay < 0.25) {
            float earlyDayProgress = (timeOfDay - 0.22) / 0.03; // Very short phase
            // Aggressive final clearing of any remaining dawn colors
            float factor = ultraSteepStep(0.0, 1.0, earlyDayProgress);
            vec3 lastDawnColor = mix(dawnColor, dayColor, 0.7); // Mostly day color already
            currentColor = mix(lastDawnColor, dayColor, factor);
          }
          // Full day phase (0.25 -> 0.65) - pure day colors
          else if (timeOfDay >= 0.25 && timeOfDay < 0.65) {
            currentColor = dayColor;
          }
          // Dusk phase (0.65 -> 0.75)
          else if (timeOfDay >= 0.65 && timeOfDay < 0.75) {
            float duskFactor = smoothstep3(0.65, 0.75, timeOfDay);
            currentColor = mix(dayColor, duskColor, duskFactor);
          }
          else if (timeOfDay >= 0.75 && timeOfDay < 0.82) {
            float eveningFactor = smoothstep3(0.75, 0.82, timeOfDay);
            currentColor = mix(duskColor, eveningColor, eveningFactor);
          }
          else if (timeOfDay >= 0.82 && timeOfDay < 0.86) {
            float twilightFactor = smoothstep3(0.82, 0.86, timeOfDay);
            currentColor = mix(eveningColor, twilightColor, twilightFactor);
          }
          else if (timeOfDay >= 0.86 && timeOfDay <= 1.0) {
            float nightFactor = smoothstep3(0.86, 1.0, timeOfDay);
            currentColor = mix(twilightColor, nightColor, nightFactor);
          }
          else {
            currentColor = nightColor;
          }
          
          // Height-based gradient for atmospheric perspective
          float horizonBlend = smoothstep3(-0.1, 0.3, height);
          vec3 zenithColor = currentColor;
          vec3 horizonColor = currentColor * 0.8;
          
          vec3 finalColor = mix(horizonColor, zenithColor, horizonBlend);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });

    this.skyMesh = new THREE.Mesh(this.skyGeometry, this.skyMaterial);
    this.scene.add(this.skyMesh);
  }

  public update(deltaTime: number): void {
    this.timeOfDay += deltaTime * 0.004;
    if (this.timeOfDay > 1) {
      this.timeOfDay = 0;
    }
    
    this.updateLighting();
    this.updateSkybox();
    this.updateCloudColor();
  }

  private updateLighting(): void {
    const { DAWN_START, DAWN_END, EARLY_DAY_START, EARLY_DAY_END, DAY_START, DAY_END, DUSK_START, DUSK_END, EVENING_START, EVENING_END, TWILIGHT_START, TWILIGHT_END } = SceneManager.TIME_PERIODS;
    
    let lightIntensity: number;
    let lightColor: THREE.Color;
    
    // NEW: Accelerated lighting transitions matching color changes
    if (this.timeOfDay >= DAWN_START && this.timeOfDay < DAWN_END) {
      // Faster dawn lighting transition
      const dawnProgress = (this.timeOfDay - DAWN_START) / (DAWN_END - DAWN_START);
      const factor = this.exponentialStep(0, 1, dawnProgress);
      lightIntensity = 0.1 + factor * 0.4; // Rapid brightness increase
      lightColor = new THREE.Color().setHSL(0.1, 0.8 - factor * 0.3, 0.3 + factor * 0.4);
    }
    else if (this.timeOfDay >= EARLY_DAY_START && this.timeOfDay < EARLY_DAY_END) {
      // Quick transition to full day lighting
      const earlyDayProgress = (this.timeOfDay - EARLY_DAY_START) / (EARLY_DAY_END - EARLY_DAY_START);
      const factor = this.ultraSteepStep(0, 1, earlyDayProgress);
      lightIntensity = 0.5 + factor * 0.4; // Reach near-full brightness quickly
      lightColor = new THREE.Color().setHSL(0.15, 0.5 - factor * 0.2, 0.7 + factor * 0.2);
    }
    else if (this.timeOfDay >= DAY_START && this.timeOfDay < DAY_END) {
      // Full day lighting
      lightIntensity = 0.9;
      lightColor = new THREE.Color(0xFFFFFF);
    }
    else if (this.timeOfDay >= DUSK_START && this.timeOfDay < DUSK_END) {
      const duskProgress = (this.timeOfDay - DUSK_START) / (DUSK_END - DUSK_START);
      const factor = this.smoothStep(0, 1, duskProgress);
      lightIntensity = 0.9 - factor * 0.4;
      lightColor = new THREE.Color().setHSL(0.08, 0.3 + factor * 0.5, 0.9 - factor * 0.3);
    }
    else if (this.timeOfDay >= EVENING_START && this.timeOfDay < EVENING_END) {
      const eveningProgress = (this.timeOfDay - EVENING_START) / (EVENING_END - EVENING_START);
      const factor = this.steepStep(0, 1, eveningProgress);
      lightIntensity = 0.5 - factor * 0.25;
      lightColor = new THREE.Color().setHSL(0.75, 0.8, 0.6 - factor * 0.25);
    }
    else if (this.timeOfDay >= TWILIGHT_START && this.timeOfDay < TWILIGHT_END) {
      const twilightProgress = (this.timeOfDay - TWILIGHT_START) / (TWILIGHT_END - TWILIGHT_START);
      const factor = this.steepStep(0, 1, twilightProgress);
      lightIntensity = 0.25 - factor * 0.15;
      lightColor = new THREE.Color().setHSL(0.75, 0.9, 0.35 - factor * 0.15);
    }
    else {
      lightIntensity = 0.1;
      lightColor = new THREE.Color(0x4040AA);
    }

    this.ambientLight.intensity = lightIntensity * 0.4;
    this.directionalLight.intensity = lightIntensity * 0.8;
    this.directionalLight.color = lightColor;
    
    // Update sun position
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    this.directionalLight.position.set(
      Math.cos(sunAngle) * 100,
      Math.sin(sunAngle) * 100,
      50
    );
  }

  private updateSkybox(): void {
    if (this.skyMaterial && this.skyMaterial.uniforms) {
      this.skyMaterial.uniforms.timeOfDay.value = this.timeOfDay;
      
      const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
      this.skyMaterial.uniforms.sunPosition.value.set(
        Math.cos(sunAngle),
        Math.sin(sunAngle),
        0
      );
    }
  }

  private updateCloudColor(): void {
    const { DAWN_START, DAWN_END, EARLY_DAY_START, EARLY_DAY_END, DAY_START, DAY_END, DUSK_START, DUSK_END, EVENING_START, EVENING_END, TWILIGHT_START, TWILIGHT_END } = SceneManager.TIME_PERIODS;
    
    // NEW: Accelerated cloud color transitions matching sky changes
    if (this.timeOfDay >= DAWN_START && this.timeOfDay < DAWN_END) {
      const dawnProgress = (this.timeOfDay - DAWN_START) / (DAWN_END - DAWN_START);
      const factor = this.exponentialStep(0, 1, dawnProgress);
      this.cloudColor.setHSL(0.08, 0.8 - factor * 0.4, 0.4 + factor * 0.3);
    }
    else if (this.timeOfDay >= EARLY_DAY_START && this.timeOfDay < EARLY_DAY_END) {
      const earlyDayProgress = (this.timeOfDay - EARLY_DAY_START) / (EARLY_DAY_END - EARLY_DAY_START);
      const factor = this.ultraSteepStep(0, 1, earlyDayProgress);
      this.cloudColor.setHSL(0.6, 0.4 - factor * 0.2, 0.7 + factor * 0.2);
    }
    else if (this.timeOfDay >= DAY_START && this.timeOfDay < DAY_END) {
      this.cloudColor.setRGB(0.9, 0.9, 0.95);
    }
    else if (this.timeOfDay >= DUSK_START && this.timeOfDay < DUSK_END) {
      const duskProgress = (this.timeOfDay - DUSK_START) / (DUSK_END - DUSK_START);
      const factor = this.smoothStep(0, 1, duskProgress);
      this.cloudColor.setHSL(0.08, 0.2 + factor * 0.6, 0.9 - factor * 0.2);
    }
    else if (this.timeOfDay >= EVENING_START && this.timeOfDay < EVENING_END) {
      const eveningProgress = (this.timeOfDay - EVENING_START) / (EVENING_END - EVENING_START);
      const factor = this.steepStep(0, 1, eveningProgress);
      this.cloudColor.setHSL(0.75, 0.8, 0.7 - factor * 0.3);
    }
    else if (this.timeOfDay >= TWILIGHT_START && this.timeOfDay < TWILIGHT_END) {
      const twilightProgress = (this.timeOfDay - TWILIGHT_START) / (TWILIGHT_END - TWILIGHT_START);
      const factor = this.steepStep(0, 1, twilightProgress);
      this.cloudColor.setHSL(0.75, 0.9, 0.4 - factor * 0.2);
    }
    else {
      this.cloudColor.setRGB(0.2, 0.2, 0.4);
    }
  }

  public setTimeOfDay(time: number): void {
    this.timeOfDay = time;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public getCloudColor(): THREE.Color {
    return this.cloudColor;
  }

  public dispose(): void {
    if (this.skyGeometry) {
      this.skyGeometry.dispose();
    }
    if (this.skyMaterial) {
      this.skyMaterial.dispose();
    }
  }
}
