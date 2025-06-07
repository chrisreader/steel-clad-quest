
import * as THREE from 'three';

export class RealisticGrassShader {
  public static createRealisticGrassMaterial(
    baseColor: THREE.Color, 
    ringIndex: number = 0,
    species: string = 'meadow'
  ): THREE.ShaderMaterial {
    const vertexShader = `
      uniform float time;
      uniform float windStrength;
      uniform vec2 windDirection;
      uniform float gustIntensity;
      uniform float gustFrequency;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec3 vWorldPosition;
      varying float vWindInfluence;
      
      // Noise function for wind variation
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vUv = uv;
        vNormal = normal;
        vHeight = position.y;
        
        // Get instance matrix
        mat4 instanceMatrix = instanceMatrix;
        vec3 transformed = position;
        
        // Enhanced wind system with multiple layers
        vec3 worldPos = (instanceMatrix * vec4(position, 1.0)).xyz;
        vWorldPosition = worldPos;
        
        // Base wind animation
        float heightFactor = pow(position.y, 1.8); // More realistic height curve
        float baseWind = sin(time * 1.5 + worldPos.x * 0.08 + worldPos.z * 0.08) * windStrength;
        
        // Wind gusts
        float gustTime = time * gustFrequency;
        float gustNoise = noise(vec2(worldPos.x * 0.02, gustTime * 0.1));
        float gustWind = sin(gustTime + gustNoise * 6.28) * gustIntensity;
        
        // Micro wind variations
        float microWind = sin(time * 4.0 + worldPos.x * 0.2 + worldPos.z * 0.2) * 0.02;
        
        // Combine wind effects
        float totalWind = (baseWind + gustWind + microWind) * heightFactor;
        vWindInfluence = totalWind;
        
        // Apply wind displacement
        transformed.x += totalWind * windDirection.x;
        transformed.z += totalWind * windDirection.y;
        
        // Add subtle sideways swaying
        float sideWind = sin(time * 0.8 + worldPos.z * 0.1) * windStrength * 0.3 * heightFactor;
        transformed.x += sideWind * windDirection.y; // Perpendicular to main wind
        transformed.z -= sideWind * windDirection.x;
        
        // Apply instance transformation
        vec4 worldPosition = instanceMatrix * vec4(transformed, 1.0);
        
        gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
      }
    `;
    
    const fragmentShader = `
      uniform vec3 grassColor;
      uniform vec3 nightGrassColor;
      uniform vec3 tipColor;
      uniform float time;
      uniform float nightFactor;
      uniform float dayFactor;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      uniform float subsurfaceIntensity;
      uniform vec3 lightDirection;
      uniform float seasonalFactor; // 0-1 for seasonal variation
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec3 vWorldPosition;
      varying float vWindInfluence;
      
      // Noise function for micro-detail variation
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        // Base color interpolation between day and night
        vec3 currentGrassColor = mix(grassColor, nightGrassColor, nightFactor);
        
        // Seasonal color variation
        vec3 autumnColor = mix(grassColor, vec3(0.8, 0.6, 0.2), 0.3);
        vec3 springColor = mix(grassColor, vec3(0.4, 0.8, 0.3), 0.2);
        currentGrassColor = mix(currentGrassColor, mix(autumnColor, springColor, seasonalFactor), 0.3);
        
        // Height-based color variation (darker at base, brighter at tips)
        vec3 baseColor = currentGrassColor * 0.7;
        vec3 color = mix(baseColor, tipColor, vHeight);
        
        // Add micro-detail color variation using world position
        float microVariation = noise(vWorldPosition.xz * 50.0) * 0.1;
        color += microVariation;
        
        // Subsurface scattering effect
        vec3 lightDir = normalize(lightDirection);
        float backlight = max(0.0, dot(-lightDir, vNormal));
        vec3 subsurfaceColor = currentGrassColor * 0.5;
        color = mix(color, subsurfaceColor, backlight * subsurfaceIntensity * vHeight);
        
        // Enhanced lighting with multiple factors
        float frontLight = dot(vNormal, lightDir) * 0.5 + 0.5;
        float ambientLight = 0.4;
        float totalLight = mix(ambientLight, frontLight, dayFactor);
        
        // Wind-based lighting variation (grass catches light differently when bent)
        float windLighting = 1.0 + abs(vWindInfluence) * 0.2;
        totalLight *= windLighting;
        
        color *= totalLight;
        
        // Age and health variation based on world position
        float ageVariation = noise(vWorldPosition.xz * 10.0);
        color = mix(color, color * 0.8, ageVariation * 0.3);
        
        // Apply fog
        float depth = gl_FragCoord.z / gl_FragCoord.w;
        float fogFactor = smoothstep(fogNear, fogFar, depth);
        color = mix(color, fogColor, fogFactor);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    // Create seasonal and species-specific colors
    const tipColor = new THREE.Color().copy(baseColor).multiplyScalar(1.3);
    const seasonalColors = this.getSeasonalColors(species);
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: 0.25 },
        windDirection: { value: new THREE.Vector2(1, 0.5) },
        gustIntensity: { value: 0.15 },
        gustFrequency: { value: 0.3 },
        grassColor: { value: baseColor },
        nightGrassColor: { value: new THREE.Color().copy(baseColor).multiplyScalar(0.15) },
        tipColor: { value: tipColor },
        nightFactor: { value: 0 },
        dayFactor: { value: 1 },
        fogColor: { value: new THREE.Color(0x87CEEB) },
        fogNear: { value: 50 },
        fogFar: { value: 200 },
        subsurfaceIntensity: { value: 0.4 },
        lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
        seasonalFactor: { value: 0.5 } // Summer by default
      },
      side: THREE.DoubleSide,
      transparent: false
    });
    
    return material;
  }
  
  private static getSeasonalColors(species: string): { spring: THREE.Color; summer: THREE.Color; autumn: THREE.Color; winter: THREE.Color } {
    const baseColors = {
      meadow: new THREE.Color(0x5a8442),
      prairie: new THREE.Color(0x4a7339),
      clumping: new THREE.Color(0x7a9451),
      fine: new THREE.Color(0x6b8f47)
    };
    
    const base = baseColors[species as keyof typeof baseColors] || baseColors.meadow;
    
    return {
      spring: new THREE.Color().copy(base).offsetHSL(0.02, 0.1, 0.05),
      summer: new THREE.Color().copy(base),
      autumn: new THREE.Color().copy(base).offsetHSL(-0.05, -0.2, -0.1),
      winter: new THREE.Color().copy(base).offsetHSL(0, -0.4, -0.2)
    };
  }
  
  public static updateRealisticWindAnimation(
    material: THREE.ShaderMaterial, 
    time: number, 
    windStrength: number = 0.25,
    gustIntensity: number = 0.15
  ): void {
    if (material.uniforms.time) {
      material.uniforms.time.value = time;
    }
    if (material.uniforms.windStrength) {
      material.uniforms.windStrength.value = windStrength;
    }
    if (material.uniforms.gustIntensity) {
      material.uniforms.gustIntensity.value = gustIntensity;
    }
    
    // Slowly change wind direction
    if (material.uniforms.windDirection) {
      const windAngle = time * 0.1;
      material.uniforms.windDirection.value.set(
        Math.cos(windAngle),
        Math.sin(windAngle) * 0.5
      );
    }
  }
  
  public static updateSeasonalVariation(
    material: THREE.ShaderMaterial,
    season: 'spring' | 'summer' | 'autumn' | 'winter'
  ): void {
    const seasonalFactors = {
      spring: 0.2,
      summer: 0.5,
      autumn: 0.8,
      winter: 0.1
    };
    
    if (material.uniforms.seasonalFactor) {
      material.uniforms.seasonalFactor.value = seasonalFactors[season];
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
}
