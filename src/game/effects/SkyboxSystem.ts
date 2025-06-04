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
        sunsetTopColor: { value: new THREE.Color(0x4A5D7A) },
        sunsetBottomColor: { value: new THREE.Color(0xFF4500) },
        twilightTopColor: { value: new THREE.Color(0x0D1B2A) },
        twilightBottomColor: { value: new THREE.Color(0x2B1B40) }
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
        uniform vec3 sunsetTopColor;
        uniform vec3 sunsetBottomColor;
        uniform vec3 twilightTopColor;
        uniform vec3 twilightBottomColor;
        
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        vec3 getSkyColor(float time, float heightFactor) {
          vec3 topColor = dayTopColor;
          vec3 bottomColor = dayBottomColor;
          
          float adjustedHeightFactor = pow(heightFactor, 1.2);
          float horizonZone = smoothstep(0.0, 0.5, heightFactor);
          
          if (time >= 0.0 && time <= 0.15) {
            // Night period
            topColor = nightTopColor;
            bottomColor = nightBottomColor;
          } else if (time >= 0.15 && time <= 0.25) {
            // Dawn period
            float factor = (time - 0.15) / 0.1;
            factor = smoothstep(0.0, 1.0, factor);
            
            topColor = mix(nightTopColor, dayTopColor * 0.7, factor);
            bottomColor = mix(nightBottomColor, dayBottomColor * 0.8, factor);
          } else if (time >= 0.25 && time <= 0.7) {
            // Day period
            topColor = dayTopColor;
            bottomColor = dayBottomColor;
          } else if (time >= 0.7 && time <= 0.8) {
            // Sunset period - more dramatic colors
            float factor = (time - 0.7) / 0.1;
            factor = pow(factor, 1.2);
            
            topColor = mix(dayTopColor, sunsetTopColor, factor);
            
            vec3 dramaticSunsetBottom = mix(sunsetBottomColor, vec3(1.0, 0.3, 0.1), 0.3);
            float sunsetIntensity = (1.0 - pow(heightFactor, 1.5)) * horizonZone;
            bottomColor = mix(dayBottomColor, dramaticSunsetBottom, factor * (0.7 + 0.3 * sunsetIntensity));
          } else if (time >= 0.8 && time <= 0.9) {
            // Twilight period - accelerated transition with reduced sunset bleeding
            float factor = (time - 0.8) / 0.1;
            factor = pow(factor, 1.2); // Faster transition from 1.8 to 1.2
            
            // More aggressive darkening
            float darkeningFactor = smoothstep(0.0, 0.7, factor);
            
            topColor = mix(sunsetTopColor, twilightTopColor, factor);
            
            // Reduced sunset color bleeding from 40% to 15%
            vec3 deepTwilightHorizon = mix(twilightBottomColor, sunsetBottomColor * 0.15, 0.85);
            float twilightIntensity = (1.0 - pow(heightFactor, 2.2)) * horizonZone * (1.0 - darkeningFactor * 0.5);
            bottomColor = mix(sunsetBottomColor, deepTwilightHorizon, factor * (0.9 + 0.1 * twilightIntensity));
          } else {
            // Deep night transition
            float factor = (time - 0.9) / 0.1;
            factor = pow(factor, 2.0);
            
            topColor = mix(twilightTopColor, nightTopColor, factor);
            bottomColor = mix(twilightBottomColor, nightBottomColor, factor);
          }
          
          float blendFactor = 1.0 - adjustedHeightFactor;
          
          // Enhanced horizon effects during sunset and twilight with faster darkening
          if ((time >= 0.7 && time <= 0.9)) {
            // More aggressive horizon blending during twilight
            float horizonBoost = (time >= 0.8) ? 1.5 : 1.0;
            blendFactor *= (1.0 - pow(heightFactor, 1.0 / horizonBoost));
            blendFactor = max(blendFactor, 0.05);
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
