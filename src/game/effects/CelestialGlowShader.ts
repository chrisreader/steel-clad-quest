
import * as THREE from 'three';

export interface GlowUniforms {
  [uniform: string]: THREE.IUniform<any>;
  glowSize: { value: number };
  glowIntensity: { value: number };
  glowColor: { value: THREE.Color };
  atmosphericDensity: { value: number };
  falloffPower: { value: number };
  time: { value: number };
}

export class CelestialGlowShader {
  private static lastUpdateTime: number = 0;
  private static readonly UPDATE_INTERVAL: number = 50; // Update every 50ms for performance
  private static cachedCalculations: Map<string, number> = new Map();
  
  public static vertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  public static fragmentShader = `
    uniform float glowSize;
    uniform float glowIntensity;
    uniform vec3 glowColor;
    uniform float atmosphericDensity;
    uniform float falloffPower;
    uniform float time;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vec2 center = vec2(0.5, 0.5);
      float distance = length(vUv - center);
      
      // Optimized circular falloff
      float circularFalloff = 1.0 - smoothstep(0.0, glowSize * 0.7, distance);
      
      // Simplified atmospheric scattering (reduced complexity for performance)
      float innerGlow = pow(circularFalloff, falloffPower * 0.6);
      float outerGlow = pow(circularFalloff, falloffPower * 2.5);
      
      float combinedGlow = innerGlow * 0.7 + outerGlow * 0.3;
      
      // Reduced atmospheric variation for performance
      float atmospheric = 1.0 + sin(time * 0.3 + distance * 8.0) * 0.08 * atmosphericDensity;
      combinedGlow *= atmospheric;
      
      float edgeSmoothing = 1.0 - smoothstep(0.4, 0.5, distance);
      combinedGlow *= edgeSmoothing;
      
      vec3 finalColor = glowColor * glowIntensity * combinedGlow;
      float alpha = combinedGlow * glowIntensity;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;
  
  public static createGlowMaterial(
    size: number = 0.8,
    intensity: number = 0.3,
    color: THREE.Color = new THREE.Color(0xFFD700),
    atmosphericDensity: number = 0.15, // Reduced from 0.2 for performance
    falloffPower: number = 2.0
  ): THREE.ShaderMaterial {
    const uniforms: GlowUniforms = {
      glowSize: { value: size },
      glowIntensity: { value: intensity },
      glowColor: { value: color },
      atmosphericDensity: { value: atmosphericDensity },
      falloffPower: { value: falloffPower },
      time: { value: 0.0 }
    };
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      depthWrite: false,
      depthTest: true
    });
  }
  
  public static updateGlowMaterial(
    material: THREE.ShaderMaterial,
    size: number,
    intensity: number,
    color: THREE.Color,
    atmosphericDensity: number = 0.15,
    falloffPower: number = 2.0,
    time: number = 0.0
  ): void {
    const now = performance.now();
    
    // Only update time-sensitive uniforms at reduced frequency for performance
    if (now - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
      if (material.uniforms) {
        material.uniforms.time.value = time;
        this.lastUpdateTime = now;
      }
    }
    
    // Always update non-time-sensitive uniforms
    if (material.uniforms) {
      material.uniforms.glowSize.value = size;
      material.uniforms.glowIntensity.value = intensity;
      material.uniforms.glowColor.value.copy(color);
      material.uniforms.atmosphericDensity.value = atmosphericDensity;
      material.uniforms.falloffPower.value = falloffPower;
    }
  }
  
  public static clearCache(): void {
    this.cachedCalculations.clear();
  }
}
