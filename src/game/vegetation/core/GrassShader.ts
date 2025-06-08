
import * as THREE from 'three';

export class GrassShader {
  private static materialCache = new Map<string, THREE.ShaderMaterial>();

  public static createGrassMaterial(
    baseColor: THREE.Color, 
    species: string = 'meadow',
    isGroundGrass: boolean = false
  ): THREE.ShaderMaterial {
    const cacheKey = `${species}_${baseColor.getHexString()}_${isGroundGrass}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!.clone();
    }

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
      
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vUv = uv;
        vNormal = normal;
        vHeight = position.y;
        
        mat4 instanceMatrix = instanceMatrix;
        vec3 transformed = position;
        
        vec3 worldPos = (instanceMatrix * vec4(position, 1.0)).xyz;
        vWorldPosition = worldPos;
        
        float heightFactor = pow(position.y, 1.8);
        float baseWind = sin(time * 1.5 + worldPos.x * 0.08 + worldPos.z * 0.08) * windStrength;
        
        float gustTime = time * gustFrequency;
        float gustNoise = noise(vec2(worldPos.x * 0.02, gustTime * 0.1));
        float gustWind = sin(gustTime + gustNoise * 6.28) * gustIntensity;
        
        float microWind = sin(time * 4.0 + worldPos.x * 0.2 + worldPos.z * 0.2) * 0.02;
        
        float totalWind = (baseWind + gustWind + microWind) * heightFactor;
        vWindInfluence = totalWind;
        
        transformed.x += totalWind * windDirection.x;
        transformed.z += totalWind * windDirection.y;
        
        float sideWind = sin(time * 0.8 + worldPos.z * 0.1) * windStrength * 0.3 * heightFactor;
        transformed.x += sideWind * windDirection.y;
        transformed.z -= sideWind * windDirection.x;
        
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
      uniform float seasonalFactor;
      uniform float biomeColorIntensity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec3 vWorldPosition;
      varying float vWindInfluence;
      
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec3 currentGrassColor = mix(grassColor, nightGrassColor, nightFactor);
        vec3 enhancedTipColor = tipColor;
        vec3 baseColor = currentGrassColor * 0.7;
        vec3 color = mix(baseColor, enhancedTipColor, vHeight);
        
        float microVariation = noise(vWorldPosition.xz * 50.0) * 0.08;
        color += microVariation;
        
        vec3 lightDir = normalize(lightDirection);
        float backlight = max(0.0, dot(-lightDir, vNormal));
        vec3 subsurfaceColor = currentGrassColor * 0.6;
        color = mix(color, subsurfaceColor, backlight * subsurfaceIntensity * vHeight);
        
        float frontLight = dot(vNormal, lightDir) * 0.5 + 0.5;
        float ambientLight = 0.45;
        float totalLight = mix(ambientLight, frontLight, dayFactor);
        
        float windLighting = 1.0 + abs(vWindInfluence) * 0.15;
        totalLight *= windLighting;
        
        color *= totalLight;
        
        float ageVariation = noise(vWorldPosition.xz * 12.0);
        color = mix(color, color * 0.85, ageVariation * 0.2);
        
        float depth = gl_FragCoord.z / gl_FragCoord.w;
        float fogFactor = smoothstep(fogNear, fogFar, depth);
        color = mix(color, fogColor, fogFactor);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    const tipColor = new THREE.Color().copy(baseColor).multiplyScalar(1.4);
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        windStrength: { value: isGroundGrass ? 0.2 : 0.25 },
        windDirection: { value: new THREE.Vector2(1, 0.5) },
        gustIntensity: { value: isGroundGrass ? 0.09 : 0.15 },
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
        seasonalFactor: { value: 0.5 },
        biomeColorIntensity: { value: 1.0 }
      },
      side: THREE.DoubleSide,
      transparent: false
    });
    
    this.materialCache.set(cacheKey, material);
    return material.clone();
  }
  
  public static updateWindAnimation(
    material: THREE.ShaderMaterial, 
    time: number, 
    windStrength: number = 0.25,
    gustIntensity: number = 0.15
  ): void {
    if (material.uniforms.time) material.uniforms.time.value = time;
    if (material.uniforms.windStrength) material.uniforms.windStrength.value = windStrength;
    if (material.uniforms.gustIntensity) material.uniforms.gustIntensity.value = gustIntensity;
    
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
    const seasonalFactors = { spring: 0.2, summer: 0.5, autumn: 0.8, winter: 0.1 };
    if (material.uniforms.seasonalFactor) {
      material.uniforms.seasonalFactor.value = seasonalFactors[season];
    }
  }
  
  public static updateDayNightCycle(
    material: THREE.ShaderMaterial, 
    nightFactor: number, 
    dayFactor: number
  ): void {
    if (material.uniforms.nightFactor) material.uniforms.nightFactor.value = nightFactor;
    if (material.uniforms.dayFactor) material.uniforms.dayFactor.value = dayFactor;
  }

  public static updateBiomeColors(
    material: THREE.ShaderMaterial,
    grassColor: THREE.Color,
    intensity: number = 1.0
  ): void {
    if (material.uniforms.grassColor) material.uniforms.grassColor.value.copy(grassColor);
    if (material.uniforms.nightGrassColor) {
      material.uniforms.nightGrassColor.value.copy(grassColor).multiplyScalar(0.15);
    }
    if (material.uniforms.tipColor) {
      material.uniforms.tipColor.value.copy(grassColor).multiplyScalar(1.4);
    }
    if (material.uniforms.biomeColorIntensity) {
      material.uniforms.biomeColorIntensity.value = intensity;
    }
  }

  public static dispose(): void {
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
  }
}
