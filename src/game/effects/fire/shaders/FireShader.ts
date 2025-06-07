
import * as THREE from 'three';
import { ParticleTextureGenerator } from '../utils/ParticleTextureGenerator';

export class FireShader {
  public static createFireMaterial(): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      uniform float particleSize;
      
      attribute float lifetime;
      attribute float age;
      attribute vec3 velocity;
      
      varying vec2 vUv;
      varying float vAlpha;
      varying float vHeight;
      varying vec3 vColor;
      
      void main() {
        vUv = uv;
        
        vec3 transformed = position;
        
        // Calculate normalized age (0 = new, 1 = dying)
        float normalizedAge = age / lifetime;
        
        // Calculate height factor for color variation
        vHeight = clamp(transformed.y / 3.0, 0.0, 1.0);
        
        // Apply wind motion - simple sine wave
        float windEffect = sin(time * 2.0 + transformed.x * 3.0 + transformed.z * 2.0) * windStrength * vHeight;
        transformed.x += windEffect * windDirection.x * 0.5;
        transformed.z += windEffect * windDirection.y * 0.5;
        
        // Add some vertical sway
        transformed.y += sin(time * 1.5 + transformed.x * 2.0) * vHeight * 0.2;
        
        // Calculate alpha based on age
        vAlpha = 1.0 - smoothstep(0.6, 1.0, normalizedAge);
        
        // Set colors based on height and age
        if (vHeight > 0.7) {
          vColor = mix(vec3(1.0, 0.8, 0.3), vec3(1.0, 1.0, 0.9), (vHeight - 0.7) / 0.3);
        } else if (vHeight > 0.4) {
          vColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.8, 0.3), (vHeight - 0.4) / 0.3);
        } else {
          vColor = mix(vec3(0.8, 0.2, 0.05), vec3(1.0, 0.4, 0.1), vHeight / 0.4);
        }
        
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Set point size
        float distance = length(mvPosition.xyz);
        gl_PointSize = particleSize * (300.0 / distance);
      }
    `;
    
    const fragmentShader = `
      uniform float intensity;
      uniform float opacity;
      uniform sampler2D particleTexture;
      
      varying vec2 vUv;
      varying float vAlpha;
      varying float vHeight;
      varying vec3 vColor;
      
      void main() {
        // Use gl_PointCoord for point sprites
        vec4 textureColor = texture2D(particleTexture, gl_PointCoord);
        
        // Apply color and intensity
        vec3 finalColor = vColor * intensity;
        
        // Apply texture alpha and particle alpha
        float finalAlpha = textureColor.a * vAlpha * opacity;
        
        if (finalAlpha < 0.01) discard;
        
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;
    
    const particleTexture = ParticleTextureGenerator.createCircularParticleTexture();
    
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 1.0 },
        windDirection: { value: new THREE.Vector2(1, 0.3) },
        intensity: { value: 1.0 },
        opacity: { value: 0.8 },
        particleSize: { value: 50.0 },
        particleTexture: { value: particleTexture }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      vertexColors: false
    });
  }

  public static createBasicFireMaterial(name: string): THREE.PointsMaterial {
    const texture = ParticleTextureGenerator.createBasicParticleTexture();
    
    let color = 0xFF6600;
    let size = 50;
    let opacity = 0.8;
    
    if (name === 'smoke') {
      color = 0x888888;
      size = 80;
      opacity = 0.4;
    } else if (name === 'embers') {
      color = 0xFF4400;
      size = 30;
      opacity = 1.0;
    }
    
    return new THREE.PointsMaterial({
      color: color,
      size: size,
      map: texture,
      transparent: true,
      opacity: opacity,
      blending: name === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
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
}
