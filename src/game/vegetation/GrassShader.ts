
import * as THREE from 'three';

export class GrassShader {
  public static createGrassMaterial(baseColor: THREE.Color, ringIndex: number = 0): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      
      attribute float instanceId;
      attribute vec3 instancePosition;
      attribute float instanceRotation;
      attribute float instanceScale;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      
      void main() {
        vUv = uv;
        vNormal = normal;
        vHeight = position.y;
        
        // Apply instance transformations
        vec3 pos = position;
        pos *= instanceScale;
        
        // Wind animation - affects top more than bottom
        float windFactor = pow(position.y, 2.0) * windStrength;
        float windOffset = sin(time * 2.0 + instancePosition.x * 0.1 + instancePosition.z * 0.1) * windFactor;
        pos.x += windOffset * windDirection.x;
        pos.z += windOffset * windDirection.y;
        
        // Rotation
        float cosR = cos(instanceRotation);
        float sinR = sin(instanceRotation);
        mat2 rotation = mat2(cosR, -sinR, sinR, cosR);
        pos.xz = rotation * pos.xz;
        
        pos += instancePosition;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform vec3 grassColor;
      uniform float time;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      
      void main() {
        // Base grass color with height variation
        vec3 color = grassColor;
        color = mix(color * 0.6, color, vHeight); // Darker at base
        
        // Add subtle color variation
        float variation = sin(gl_FragCoord.x * 0.01) * sin(gl_FragCoord.y * 0.01) * 0.1;
        color += variation;
        
        // Simple lighting
        float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
        color *= light;
        
        // Apply fog
        float depth = gl_FragCoord.z / gl_FragCoord.w;
        float fogFactor = smoothstep(fogNear, fogFar, depth);
        color = mix(color, fogColor, fogFactor);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 0.3 },
        windDirection: { value: new THREE.Vector2(1, 0.5) },
        grassColor: { value: baseColor },
        fogColor: { value: new THREE.Color(0x87CEEB) },
        fogNear: { value: 50 },
        fogFar: { value: 200 }
      },
      side: THREE.DoubleSide,
      transparent: false
    });
    
    return material;
  }
  
  public static updateWindAnimation(material: THREE.ShaderMaterial, time: number, windStrength: number = 0.3): void {
    if (material.uniforms.time) {
      material.uniforms.time.value = time;
    }
    if (material.uniforms.windStrength) {
      material.uniforms.windStrength.value = windStrength;
    }
  }
}
