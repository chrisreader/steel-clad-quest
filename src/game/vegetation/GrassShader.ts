
import * as THREE from 'three';

export class GrassShader {
  public static createGrassMaterial(baseColor: THREE.Color, ringIndex: number = 0): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec3 vWorldPosition;
      
      // Use built-in THREE.js fog uniforms
      #ifdef USE_FOG
        varying float vFogDepth;
      #endif
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vHeight = position.y;
        
        vec3 transformed = position;
        
        // Apply wind animation - affects top more than bottom
        float windFactor = pow(position.y, 2.0) * windStrength;
        float windOffset = sin(time * 2.0 + position.x * 0.1 + position.z * 0.1) * windFactor;
        transformed.x += windOffset * windDirection.x;
        transformed.z += windOffset * windDirection.y;
        
        // Calculate world position
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        
        #ifdef USE_FOG
          vFogDepth = -mvPosition.z;
        #endif
      }
    `;
    
    const fragmentShader = `
      uniform vec3 grassColor;
      uniform vec3 nightGrassColor;
      uniform float time;
      uniform float nightFactor;
      uniform float dayFactor;
      uniform float opacity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec3 vWorldPosition;
      
      // Use built-in THREE.js fog
      #ifdef USE_FOG
        uniform vec3 fogColor;
        varying float vFogDepth;
        #ifdef FOG_EXP2
          uniform float fogDensity;
        #else
          uniform float fogNear;
          uniform float fogFar;
        #endif
      #endif
      
      void main() {
        // Interpolate between day and night grass colors
        vec3 currentGrassColor = mix(grassColor, nightGrassColor, nightFactor);
        
        // Base grass color with height variation
        vec3 color = currentGrassColor;
        color = mix(color * 0.7, color, vHeight); // Darker at base
        
        // Add subtle color variation based on world position (not screen coordinates)
        float variation = sin(vWorldPosition.x * 0.1) * sin(vWorldPosition.z * 0.1) * 0.08;
        color += variation;
        
        // Improved lighting calculation
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3)); // Fixed light direction
        float NdotL = dot(normalize(vNormal), lightDir);
        float lightIntensity = max(0.3, (NdotL * 0.5 + 0.5)); // Softer lighting
        
        // Apply day/night lighting adjustment
        lightIntensity = mix(lightIntensity * 0.2, lightIntensity, dayFactor);
        color *= lightIntensity;
        
        // Apply opacity for distance fading
        float alpha = opacity;
        
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          color = mix(color, fogColor, fogFactor);
        #endif
        
        gl_FragColor = vec4(color, alpha);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 0.2 },
        windDirection: { value: new THREE.Vector2(1, 0.5) },
        grassColor: { value: baseColor },
        nightGrassColor: { value: new THREE.Color().copy(baseColor).multiplyScalar(0.15) },
        nightFactor: { value: 0 },
        dayFactor: { value: 1 },
        opacity: { value: 1.0 }
      },
      side: THREE.FrontSide, // Changed from DoubleSide to prevent z-fighting
      transparent: true, // Enable transparency for opacity control
      depthWrite: true,
      depthTest: true,
      fog: true // Enable built-in fog support
    });
    
    return material;
  }
  
  public static updateWindAnimation(material: THREE.ShaderMaterial, time: number, windStrength: number = 0.2): void {
    if (material.uniforms.time) {
      material.uniforms.time.value = time;
    }
    if (material.uniforms.windStrength) {
      material.uniforms.windStrength.value = windStrength;
    }
  }
  
  public static updateDayNightCycle(
    material: THREE.ShaderMaterial, 
    nightFactor: number, 
    dayFactor: number
  ): void {
    if (material.uniforms.nightFactor) {
      material.uniforms.nightFactor.value = nightFactor;
    }
    if (material.uniforms.dayFactor) {
      material.uniforms.dayFactor.value = dayFactor;
    }
  }
  
  public static updateOpacity(material: THREE.ShaderMaterial, opacity: number): void {
    if (material.uniforms.opacity) {
      material.uniforms.opacity.value = opacity;
    }
  }
}
