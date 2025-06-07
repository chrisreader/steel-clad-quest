
import * as THREE from 'three';

export class FireShader {
  public static createFireMaterial(): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      uniform float turbulenceSpeed;
      
      attribute float lifetime;
      attribute float age;
      
      varying vec2 vUv;
      varying float vHeight;
      varying float vFlicker;
      varying vec3 vWorldPosition;
      varying float vAlpha;
      
      void main() {
        vUv = uv;
        
        vec3 transformed = position;
        
        // Calculate relative height from fire base (normalize to 0-1 range)
        vHeight = clamp(transformed.y / 3.0, 0.0, 1.0);
        
        // Enhanced organic flame dancing motion with multiple frequency layers
        float heightFactor = pow(vHeight + 0.1, 1.8);
        
        // Multi-layered turbulence for grass-like wind motion
        float baseTime = time * turbulenceSpeed;
        float turbulence1 = sin(baseTime + transformed.x * 3.0 + transformed.z * 2.0) * heightFactor;
        float turbulence2 = cos(baseTime * 1.7 + transformed.x * 1.8 + transformed.z * 1.3) * heightFactor * 0.7;
        float turbulence3 = sin(baseTime * 0.9 + transformed.z * 2.5 + transformed.x * 0.8) * heightFactor * 0.5;
        float turbulence4 = cos(baseTime * 2.3 + transformed.x * 0.6) * heightFactor * 0.3;
        
        // Combine turbulence layers for complex grass-like organic motion
        float totalTurbulence = (turbulence1 + turbulence2 + turbulence3 + turbulence4) * windStrength;
        
        // Apply enhanced dancing motion with wind direction
        transformed.x += totalTurbulence * windDirection.x * 0.4;
        transformed.z += totalTurbulence * windDirection.y * 0.4;
        
        // Add vertical stretching and swaying motion
        float verticalSway = sin(baseTime * 1.8 + transformed.x * 2.0) * heightFactor * 0.15;
        transformed.y += verticalSway;
        
        // Add secondary horizontal swaying like grass
        float horizontalSway = cos(baseTime * 1.2 + transformed.z * 1.5) * heightFactor * 0.2;
        transformed.x += horizontalSway * windDirection.x;
        transformed.z += horizontalSway * windDirection.y;
        
        // Calculate enhanced flicker intensity
        vFlicker = 0.7 + 0.3 * sin(baseTime * 4.0 + transformed.x * 8.0 + transformed.z * 6.0);
        
        // Calculate age-based alpha for particle lifecycle
        vAlpha = 1.0 - smoothstep(0.6, 1.0, age / lifetime);
        
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Enhanced point size with better scaling
        float distanceFromCamera = length(mvPosition.xyz);
        float baseSize = 25.0 + heightFactor * 20.0;
        gl_PointSize = baseSize / (1.0 + distanceFromCamera * 0.03);
      }
    `;
    
    const fragmentShader = `
      uniform float time;
      uniform float intensity;
      uniform float opacity;
      
      varying vec2 vUv;
      varying float vHeight;
      varying float vFlicker;
      varying vec3 vWorldPosition;
      varying float vAlpha;
      
      void main() {
        // Use gl_PointCoord for proper point sprite rendering
        vec2 center = gl_PointCoord - vec2(0.5);
        
        // Create flame-like oval shape (taller than wide)
        center.y *= 0.6;
        float distance = length(center);
        
        // Enhanced circular edge with very soft falloff for better visibility
        float alpha = 1.0 - smoothstep(0.15, 0.45, distance);
        
        // Create more vibrant flame colors with better core intensity
        float coreIntensity = 1.0 - distance * 1.8;
        coreIntensity = max(0.0, coreIntensity);
        
        // Enhanced height-based color mixing
        float heightColorFactor = mix(1.4, 0.8, vHeight);
        
        // More vibrant flame colors
        vec3 whiteHot = vec3(1.0, 1.0, 0.95);
        vec3 yellowFlame = vec3(1.0, 0.9, 0.4);
        vec3 orangeFlame = vec3(1.0, 0.5, 0.15);
        vec3 redFlame = vec3(0.9, 0.3, 0.1);
        
        // Enhanced color mixing for more dramatic flames
        vec3 color;
        if (coreIntensity > 0.8) {
          color = mix(yellowFlame, whiteHot, (coreIntensity - 0.8) / 0.2);
        } else if (coreIntensity > 0.5) {
          color = mix(orangeFlame, yellowFlame, (coreIntensity - 0.5) / 0.3);
        } else if (coreIntensity > 0.2) {
          color = mix(redFlame, orangeFlame, (coreIntensity - 0.2) / 0.3);
        } else {
          color = redFlame * (coreIntensity / 0.2);
        }
        
        // Apply enhanced effects
        color *= heightColorFactor;
        color *= vFlicker;
        color *= intensity;
        
        // Enhanced alpha calculation for better visibility
        alpha *= vAlpha;
        alpha *= smoothstep(0.0, 0.4, coreIntensity);
        alpha = clamp(alpha, 0.0, 1.0);
        
        if (alpha < 0.02) discard;
        
        gl_FragColor = vec4(color, alpha * opacity);
      }
    `;
    
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 1.2 },
        windDirection: { value: new THREE.Vector2(1, 0.6) },
        turbulenceSpeed: { value: 3.0 },
        intensity: { value: 1.2 },
        opacity: { value: 0.95 }
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
