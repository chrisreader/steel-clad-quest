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
      // Calculate distance from center for circular appearance
      vec2 center = vec2(0.5, 0.5);
      float distance = length(vUv - center);
      
      // Create circular falloff instead of square
      float circularFalloff = 1.0 - smoothstep(0.0, glowSize * 0.7, distance);
      
      // Apply atmospheric scattering with multiple layers
      float innerGlow = pow(circularFalloff, falloffPower * 0.5);
      float middleGlow = pow(circularFalloff, falloffPower * 1.5);
      float outerGlow = pow(circularFalloff, falloffPower * 3.0);
      
      // Combine layers with different intensities
      float combinedGlow = innerGlow * 0.6 + middleGlow * 0.3 + outerGlow * 0.1;
      
      // Add atmospheric density variation
      float atmospheric = 1.0 + sin(time * 0.5 + distance * 10.0) * 0.1 * atmosphericDensity;
      combinedGlow *= atmospheric;
      
      // Additional circular edge smoothing to ensure perfect circular appearance
      float edgeSmoothing = 1.0 - smoothstep(0.4, 0.5, distance);
      combinedGlow *= edgeSmoothing;
      
      // Apply intensity and color
      vec3 finalColor = glowColor * glowIntensity * combinedGlow;
      
      // Smooth alpha falloff for seamless circular blending
      float alpha = combinedGlow * glowIntensity;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;
  
  public static createGlowMaterial(
    size: number = 0.8,
    intensity: number = 0.3,
    color: THREE.Color = new THREE.Color(0xFFD700),
    atmosphericDensity: number = 0.2,
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
    atmosphericDensity: number = 0.2,
    falloffPower: number = 2.0,
    time: number = 0.0
  ): void {
    if (material.uniforms) {
      material.uniforms.glowSize.value = size;
      material.uniforms.glowIntensity.value = intensity;
      material.uniforms.glowColor.value.copy(color);
      material.uniforms.atmosphericDensity.value = atmosphericDensity;
      material.uniforms.falloffPower.value = falloffPower;
      material.uniforms.time.value = time;
    }
  }
}
