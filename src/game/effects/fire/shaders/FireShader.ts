import * as THREE from 'three';
import { ParticleTextureGenerator } from '../utils/ParticleTextureGenerator';

export class FireShader {
  public static createFireMaterial(): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      uniform float turbulenceSpeed;
      uniform float particleSize;
      
      attribute float lifetime;
      attribute float age;
      
      varying vec2 vUv;
      varying float vHeight;
      varying float vFlicker;
      varying vec3 vWorldPosition;
      varying float vAlpha;
      varying float vPointSize;
      
      void main() {
        vUv = uv;
        
        vec3 transformed = position;
        
        // Calculate relative height from fire base (normalize to 0-1 range)
        float baseY = 0.0; // Fire base position
        vHeight = clamp((transformed.y - baseY) / 2.0, 0.0, 1.0);
        
        // Enhanced organic flame dancing motion with multiple frequency layers
        float heightFactor = pow(vHeight + 0.1, 1.8);
        
        // Multi-layered turbulence for grass-like wind motion
        float baseTime = time * turbulenceSpeed;
        float turbulence1 = sin(baseTime + transformed.x * 3.0 + transformed.z * 2.0) * heightFactor;
        float turbulence2 = cos(baseTime * 1.7 + transformed.x * 1.8 + transformed.z * 1.3) * heightFactor * 0.7;
        float turbulence3 = sin(baseTime * 0.9 + transformed.z * 2.5 + transformed.x * 0.8) * heightFactor * 0.5;
        
        // Combine turbulence layers for complex organic motion
        float totalTurbulence = (turbulence1 + turbulence2 + turbulence3) * windStrength;
        
        // Apply enhanced dancing motion with wind direction
        transformed.x += totalTurbulence * windDirection.x * 0.3;
        transformed.z += totalTurbulence * windDirection.y * 0.3;
        
        // Add vertical stretching and swaying motion
        float verticalSway = sin(baseTime * 1.8 + transformed.x * 2.0) * heightFactor * 0.1;
        transformed.y += verticalSway;
        
        // Calculate enhanced flicker intensity
        vFlicker = 0.8 + 0.4 * sin(baseTime * 6.0 + transformed.x * 10.0 + transformed.z * 8.0);
        
        // Calculate age-based alpha for particle lifecycle
        vAlpha = 1.0 - smoothstep(0.7, 1.0, age / lifetime);
        
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Enhanced point size with distance scaling
        float distanceFromCamera = length(mvPosition.xyz);
        float baseSize = particleSize * (1.0 + heightFactor * 0.5);
        vPointSize = baseSize / (1.0 + distanceFromCamera * 0.01);
        gl_PointSize = vPointSize;
      }
    `;
    
    const fragmentShader = `
      uniform float time;
      uniform float intensity;
      uniform float opacity;
      uniform sampler2D particleTexture;
      
      varying vec2 vUv;
      varying float vHeight;
      varying float vFlicker;
      varying vec3 vWorldPosition;
      varying float vAlpha;
      varying float vPointSize;
      
      void main() {
        // Use point coordinates for circular particles
        vec2 pointCoord = gl_PointCoord;
        vec4 textureColor = texture2D(particleTexture, pointCoord);
        
        // Calculate distance from center for circular falloff
        vec2 center = pointCoord - vec2(0.5);
        float distance = length(center);
        
        // Create soft circular edge
        float alpha = textureColor.a * (1.0 - smoothstep(0.3, 0.5, distance));
        
        // Create flame colors based on height
        vec3 whiteHot = vec3(1.0, 1.0, 0.9);
        vec3 yellowFlame = vec3(1.0, 0.8, 0.3);
        vec3 orangeFlame = vec3(1.0, 0.4, 0.1);
        vec3 redFlame = vec3(0.8, 0.2, 0.05);
        
        // Height-based color mixing
        vec3 color;
        if (vHeight > 0.7) {
          color = mix(yellowFlame, whiteHot, (vHeight - 0.7) / 0.3);
        } else if (vHeight > 0.4) {
          color = mix(orangeFlame, yellowFlame, (vHeight - 0.4) / 0.3);
        } else {
          color = mix(redFlame, orangeFlame, vHeight / 0.4);
        }
        
        // Apply flicker and intensity
        color *= vFlicker * intensity;
        
        // Apply alpha effects
        alpha *= vAlpha;
        alpha = clamp(alpha, 0.0, 1.0);
        
        if (alpha < 0.01) discard;
        
        gl_FragColor = vec4(color, alpha * opacity);
      }
    `;
    
    // Create particle texture
    const particleTexture = ParticleTextureGenerator.createCircularParticleTexture();
    
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 1.0 },
        windDirection: { value: new THREE.Vector2(1, 0.3) },
        turbulenceSpeed: { value: 2.0 },
        intensity: { value: 1.0 },
        opacity: { value: 0.8 },
        particleSize: { value: 32.0 },
        particleTexture: { value: particleTexture }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      vertexColors: false
    });
  }
  
  public static updateShaderTime(material: THREE.ShaderMaterial, totalTime: number): void {
    if (material.uniforms.time) {
      material.uniforms.time.value = totalTime;
    }
  }
  
  public static setShaderIntensity(material: THREE.ShaderMaterial, intensity: number): void {
    if (material.uniforms.intensity) {
      material.uniforms.intensity.value = intensity;
    }
  }
  
  public static setWindEffect(material: THREE.ShaderMaterial, strength: number, direction: THREE.Vector2): void {
    if (material.uniforms.windStrength) {
      material.uniforms.windStrength.value = strength;
    }
    if (material.uniforms.windDirection) {
      material.uniforms.windDirection.value.copy(direction);
    }
  }
}
