import * as THREE from 'three';

export class SkyboxSystem {
  private scene: THREE.Scene;
  private skyboxMesh: THREE.Mesh;
  private skyboxMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSkyboxMaterial();
    this.createSkyboxMesh();
  }

  private createSkyboxMaterial(): void {
    this.skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        timeOfDay: { value: this.timeOfDay },
        sunPosition: { value: new THREE.Vector3() },
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
          float adjustedHeightFactor = pow(heightFactor, 2.0); // Increased from 0.6 to 2.0 for steeper gradient
          
          // PHASE 3: Create height-based color zones with cutoff
          float horizonZone = smoothstep(0.0, 0.3, heightFactor); // Only lower 30% gets full sunset colors
          float midZone = smoothstep(0.3, 0.6, heightFactor); // Transition zone
          float upperZone = smoothstep(0.6, 1.0, heightFactor); // Upper sky stays neutral
          
          if (time >= 0.15 && time <= 0.35) {
            // Sunrise period
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              // PHASE 2: Reduce zenith colors during sunrise - keep upper sky more neutral
              vec3 neutralTopColor = mix(nightTopColor, dayTopColor, 0.7);
              topColor = mix(nightTopColor, neutralTopColor, factor);
              
              // PHASE 3: Apply sunset colors only to lower zones
              vec3 fullBottomColor = mix(nightBottomColor, sunriseBottomColor, factor);
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
            // Sunset period - MAIN FOCUS AREA
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              // PHASE 2: Keep zenith colors more neutral during sunset
              vec3 neutralTopColor = mix(dayTopColor, sunsetTopColor, 0.4); // Reduced from full transition
              topColor = mix(dayTopColor, neutralTopColor, factor);
              
              // PHASE 3 & 4: Apply dramatic sunset colors only near horizon with aggressive height cutoff
              vec3 dramaticBottomColor = mix(dayBottomColor, sunsetBottomColor, factor);
              float sunsetIntensity = (1.0 - pow(heightFactor, 3.0)) * horizonZone; // Aggressive height decay
              bottomColor = mix(dayBottomColor, dramaticBottomColor, sunsetIntensity);
              
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              
              // PHASE 2: Transition to night with minimal sunset colors in upper sky
              vec3 neutralTopColor = mix(sunsetTopColor, nightTopColor, 0.8);
              topColor = mix(neutralTopColor, nightTopColor, factor);
              
              // PHASE 3: Keep sunset colors only at horizon level
              vec3 fullBottomColor = mix(sunsetBottomColor, nightBottomColor, factor);
              float sunsetIntensity = (1.0 - pow(heightFactor, 4.0)) * horizonZone; // Very aggressive height decay
              bottomColor = mix(nightBottomColor, fullBottomColor, sunsetIntensity);
            }
          } else {
            // Night period
            topColor = nightTopColor;
            bottomColor = nightBottomColor;
          }
          
          // PHASE 4: Fine-tuned transition with more aggressive height masking
          float blendFactor = 1.0 - adjustedHeightFactor;
          
          // Additional height-based masking for sunset periods
          if ((time >= 0.65 && time <= 0.85) || (time >= 0.15 && time <= 0.35)) {
            blendFactor *= (1.0 - pow(heightFactor, 1.8)); // Extra masking for transition periods
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

  public update(timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    if (this.skyboxMaterial && this.skyboxMaterial.uniforms) {
      this.skyboxMaterial.uniforms.timeOfDay.value = timeOfDay;
      
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

  public dispose(): void {
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      if (this.skyboxMesh.geometry) this.skyboxMesh.geometry.dispose();
      if (this.skyboxMaterial) this.skyboxMaterial.dispose();
    }
  }
}
