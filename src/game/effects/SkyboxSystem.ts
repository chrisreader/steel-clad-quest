
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
        uniform vec3 sunsetTopColor;
        uniform vec3 sunsetBottomColor;
        
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        vec3 getSkyColor(float time, float heightFactor) {
          vec3 topColor = dayTopColor;
          vec3 bottomColor = dayBottomColor;
          
          float adjustedHeightFactor = pow(heightFactor, 1.5);
          
          float horizonZone = smoothstep(0.0, 0.4, heightFactor);
          
          if (time >= 0.0 && time <= 0.2) {
            // Night period
            topColor = nightTopColor;
            bottomColor = nightBottomColor;
          } else if (time >= 0.2 && time <= 0.8) {
            // Day period with smooth transition
            float factor = (time - 0.2) / 0.6;
            factor = factor * factor * (3.0 - 2.0 * factor);
            
            topColor = mix(nightTopColor, dayTopColor, factor);
            bottomColor = mix(nightBottomColor, dayBottomColor, factor);
          } else if (time >= 0.8 && time <= 0.9) {
            // Sunset period
            float factor = (time - 0.8) / 0.1;
            factor = factor * factor * (3.0 - 2.0 * factor);
            
            vec3 neutralTopColor = mix(dayTopColor, sunsetTopColor, 0.6);
            topColor = mix(dayTopColor, neutralTopColor, factor);
            
            vec3 dramaticBottomColor = mix(dayBottomColor, sunsetBottomColor, factor);
            float sunsetIntensity = (1.0 - pow(heightFactor, 2.0)) * horizonZone;
            bottomColor = mix(dayBottomColor, dramaticBottomColor, sunsetIntensity);
          } else {
            // Evening to night transition
            float factor = (time - 0.9) / 0.1;
            factor = factor * factor * (3.0 - 2.0 * factor);
            
            topColor = mix(sunsetTopColor, nightTopColor, factor);
            
            vec3 fullBottomColor = mix(sunsetBottomColor, nightBottomColor, factor);
            float sunsetIntensity = (1.0 - pow(heightFactor, 3.0)) * horizonZone;
            bottomColor = mix(nightBottomColor, fullBottomColor, sunsetIntensity);
          }
          
          float blendFactor = 1.0 - adjustedHeightFactor;
          
          if ((time >= 0.8 && time <= 1.0) || (time >= 0.0 && time <= 0.2)) {
            blendFactor *= (1.0 - pow(heightFactor, 1.5));
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
