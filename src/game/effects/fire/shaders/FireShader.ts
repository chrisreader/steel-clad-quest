
import * as THREE from 'three';

export class FireShader {
  public static createFireMaterial(): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      uniform float turbulenceSpeed;
      
      varying vec2 vUv;
      varying float vHeight;
      varying float vFlicker;
      varying vec3 vWorldPosition;
      
      void main() {
        vUv = uv;
        vHeight = position.y;
        
        vec3 transformed = position;
        
        // Organic flame dancing motion (inspired by grass system)
        // Height-based movement - flame tips move more than base
        float heightFactor = pow(vHeight + 0.5, 2.0);
        
        // Multi-layered turbulence for organic motion
        float turbulence1 = sin(time * turbulenceSpeed + position.x * 2.0 + position.z * 1.5) * heightFactor;
        float turbulence2 = cos(time * turbulenceSpeed * 1.3 + position.x * 1.2) * heightFactor * 0.6;
        float turbulence3 = sin(time * turbulenceSpeed * 0.8 + position.z * 2.1) * heightFactor * 0.4;
        
        // Combine turbulence layers for complex organic motion
        float totalTurbulence = (turbulence1 + turbulence2 + turbulence3) * windStrength;
        
        // Apply dancing motion
        transformed.x += totalTurbulence * windDirection.x * 0.3;
        transformed.z += totalTurbulence * windDirection.y * 0.3;
        
        // Add upward stretching motion for flame licking effect
        float stretchMotion = sin(time * turbulenceSpeed * 2.0 + position.x) * heightFactor * 0.1;
        transformed.y += stretchMotion;
        
        // Calculate flicker intensity for fragment shader
        vFlicker = 0.8 + 0.2 * sin(time * turbulenceSpeed * 3.0 + position.x * 5.0);
        
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        gl_PointSize = 50.0 * (1.0 + heightFactor * 0.5); // Larger points for flame effect
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
      
      void main() {
        // Create circular/oval flame shape using distance field
        vec2 center = gl_PointCoord - vec2(0.5);
        
        // Make flames more oval (taller than wide)
        center.y *= 0.7;
        float distance = length(center);
        
        // Smooth circular edge with soft falloff
        float alpha = 1.0 - smoothstep(0.3, 0.5, distance);
        
        // Create realistic flame colors
        // White-hot center to orange edges with height variation
        float coreIntensity = 1.0 - distance * 2.0;
        coreIntensity = max(0.0, coreIntensity);
        
        // Height-based color mixing (hotter at base, cooler at tips)
        float heightColorFactor = mix(1.2, 0.6, vHeight);
        
        // Dynamic flame colors with flickering
        vec3 whiteHot = vec3(1.0, 1.0, 0.9);
        vec3 yellowFlame = vec3(1.0, 0.8, 0.3);
        vec3 orangeFlame = vec3(1.0, 0.4, 0.1);
        vec3 redFlame = vec3(0.8, 0.2, 0.1);
        
        // Mix colors based on distance from center and height
        vec3 color;
        if (coreIntensity > 0.7) {
          color = mix(yellowFlame, whiteHot, (coreIntensity - 0.7) / 0.3);
        } else if (coreIntensity > 0.4) {
          color = mix(orangeFlame, yellowFlame, (coreIntensity - 0.4) / 0.3);
        } else {
          color = mix(redFlame, orangeFlame, coreIntensity / 0.4);
        }
        
        // Apply height-based color adjustment
        color *= heightColorFactor;
        
        // Apply flickering effect
        color *= vFlicker;
        
        // Apply intensity
        color *= intensity;
        
        // Soft edges for realistic flame appearance
        alpha *= smoothstep(0.0, 0.2, coreIntensity);
        
        if (alpha < 0.01) discard;
        
        gl_FragColor = vec4(color, alpha * opacity);
      }
    `;
    
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 0.8 },
        windDirection: { value: new THREE.Vector2(1, 0.5) },
        turbulenceSpeed: { value: 2.5 },
        intensity: { value: 1.0 },
        opacity: { value: 0.9 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false
    });
  }
  
  public static updateShaderTime(material: THREE.ShaderMaterial, deltaTime: number): void {
    if (material.uniforms.time) {
      material.uniforms.time.value += deltaTime;
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
