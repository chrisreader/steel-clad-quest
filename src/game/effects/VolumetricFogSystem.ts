import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogWallLayers: THREE.Mesh[] = [];
  private atmosphericFogLayers: THREE.Mesh[] = [];
  private horizonFogLayers: THREE.Mesh[] = [];
  private groundFogLayers: THREE.Mesh[] = [];
  private fogWallMaterial: THREE.ShaderMaterial;
  private atmosphericFogMaterial: THREE.ShaderMaterial;
  private horizonFogMaterial: THREE.ShaderMaterial;
  private groundFogMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createFogWallMaterial();
    this.createAtmosphericFogMaterial();
    this.createHorizonFogMaterial();
    this.createGroundFogMaterial();
    // Only create fog walls - no atmospheric layers or sky layers
    this.createRealisticFogWalls();
    this.createAtmosphericLayers();
    this.createHorizonBlendingLayers();
    this.createGroundFogLayers();
  }
  
  // NEW: Smooth interpolation functions for seamless transitions
  private getDarknessFactor(timeOfDay: number): number {
    // Create smooth darkness factor from 0 (full day) to 1 (full night)
    if (timeOfDay >= 0.35 && timeOfDay <= 0.65) {
      return 0.0; // Full day
    } else if (timeOfDay >= 0.25 && timeOfDay < 0.35) {
      // Sunrise transition (0.25 -> 0.35)
      const factor = (timeOfDay - 0.25) / 0.1;
      return 1.0 - this.smoothStep(0.0, 1.0, factor);
    } else if (timeOfDay > 0.65 && timeOfDay <= 0.75) {
      // Sunset transition (0.65 -> 0.75)
      const factor = (timeOfDay - 0.65) / 0.1;
      return this.smoothStep(0.0, 1.0, factor);
    } else {
      return 1.0; // Full night
    }
  }
  
  private getTransitionFactor(timeOfDay: number): number {
    // Factor for transition periods (0 = stable period, 1 = active transition)
    if ((timeOfDay >= 0.2 && timeOfDay <= 0.4) || (timeOfDay >= 0.6 && timeOfDay <= 0.8)) {
      if (timeOfDay >= 0.2 && timeOfDay <= 0.4) {
        // Sunrise transition period
        const center = 0.3;
        const distance = Math.abs(timeOfDay - center);
        return 1.0 - (distance / 0.1);
      } else {
        // Sunset transition period
        const center = 0.7;
        const distance = Math.abs(timeOfDay - center);
        return 1.0 - (distance / 0.1);
      }
    }
    return 0.0;
  }
  
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  
  private cubicInterpolation(t: number): number {
    return t * t * (3 - 2 * t);
  }
  
  private getFogDensityMultiplier(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    const transitionFactor = this.getTransitionFactor(timeOfDay);
    
    // Base multiplier ranges from 1.0 (day) to 2.8 (night)
    const baseMultiplier = 1.0 + (darknessFactor * 1.8);
    
    // Add extra density during active transitions for atmospheric effect
    const transitionBoost = transitionFactor * 0.3;
    
    return baseMultiplier + transitionBoost;
  }
  
  private getFogMaxDistance(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    
    // Distance ranges from 300 (day) to 200 (night)
    return 300 - (darknessFactor * 100);
  }
  
  private getFogMaxOpacity(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    
    // Opacity ranges from 0.35 (day) to 0.65 (night)
    return 0.35 + (darknessFactor * 0.3);
  }
  
  private getBlendingAlpha(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    const transitionFactor = this.getTransitionFactor(timeOfDay);
    
    // During stable periods, use clear blending (0 = additive, 1 = normal)
    // During transitions, blend between modes
    return darknessFactor * (1.0 - transitionFactor * 0.3);
  }
  
  private createFogWallMaterial(): void {
    this.fogWallMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        dayFogColor: { value: new THREE.Color(0xF5F5F5) },
        nightFogColor: { value: new THREE.Color(0x707090) },
        sunriseFogColor: { value: new THREE.Color(0xFFE8D0) },
        sunsetFogColor: { value: new THREE.Color(0xFFDCC0) },
        // NEW: Dynamic parameters for smooth transitions
        fogWallDensityMultiplier: { value: 1.0 },
        maxWallDistance: { value: 300.0 },
        maxWallOpacity: { value: 0.25 }, // Reduced for realism
        blendingAlpha: { value: 0.0 },
        fogWallDensity: { value: 0.05 }, // Reduced base density
        fogWallHeight: { value: 25.0 }, // Significantly reduced height
        horizonBlur: { value: 0.8 }, // Increased for smoother transition
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.015 },
        windDirection: { value: new THREE.Vector2(1.0, 0.3) },
        layerDepth: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        varying float vHeightFactor;
        varying vec3 vLocalPosition;
        
        uniform vec3 playerPosition;
        uniform float fogWallHeight;
        uniform float time;
        
        void main() {
          vPosition = position;
          vUv = uv;
          vLocalPosition = position;
          
          // Add organic vertex displacement
          vec3 displacedPosition = position;
          float noiseScale = 0.02;
          float displacement = sin(position.x * noiseScale + time * 0.5) * 
                              cos(position.z * noiseScale + time * 0.3) * 
                              sin(position.y * noiseScale * 2.0 + time * 0.2);
          
          // Apply displacement mainly to edges
          float edgeFactor = smoothstep(0.3, 1.0, abs(uv.x - 0.5) * 2.0);
          displacedPosition += normal * displacement * 2.0 * edgeFactor;
          
          vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
          // Calculate height factor for vertical fog wall gradient
          vHeightFactor = clamp(worldPosition.y / fogWallHeight, 0.0, 1.0);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float timeOfDay;
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
        uniform float fogWallDensityMultiplier;
        uniform float maxWallDistance;
        uniform float maxWallOpacity;
        uniform float blendingAlpha;
        uniform float fogWallDensity;
        uniform float fogWallHeight;
        uniform float horizonBlur;
        uniform vec3 playerPosition;
        uniform float noiseScale;
        uniform vec2 windDirection;
        uniform float layerDepth;
        
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        varying float vHeightFactor;
        varying vec3 vLocalPosition;
        
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float snoise3D(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        // ENHANCED: Extended color transitions for smooth atmosphere
        vec3 getFogColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.15 && time <= 0.35) {
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(nightFogColor, sunriseFogColor, factor);
            } else {
              float factor = (time - 0.25) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunriseFogColor, dayFogColor, factor);
            }
          } else if (time >= 0.35 && time <= 0.65) {
            currentColor = dayFogColor;
          } else if (time >= 0.65 && time <= 0.85) {
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(dayFogColor, sunsetFogColor, factor);
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunsetFogColor, nightFogColor, factor);
            }
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 atmosphericColor = getFogColorForTime(timeOfDay);
          
          // Create 3D volumetric noise for realistic fog volume
          vec3 noisePos = vWorldPosition * noiseScale;
          noisePos += vec3(windDirection * time * 0.02, time * 0.01);
          
          // Multiple octaves of 3D noise for detail
          float noise1 = snoise3D(noisePos) * 0.5 + 0.5;
          float noise2 = snoise3D(noisePos * 2.1 + vec3(1.7)) * 0.25 + 0.25;
          float noise3 = snoise3D(noisePos * 4.3 + vec3(3.4)) * 0.125 + 0.125;
          float noise4 = snoise3D(noisePos * 8.7 + vec3(6.8)) * 0.0625 + 0.0625;
          
          float volumetricNoise = noise1 + noise2 + noise3 + noise4;
          float densityVariation = smoothstep(0.3, 0.8, volumetricNoise);
          
          // ENHANCED: Smooth distance calculation with dynamic parameters
          float distanceRatio;
          float exponentialFog;
          
          if (vDistance < 60.0) {
            distanceRatio = (vDistance - 15.0) / (60.0 - 15.0);
            distanceRatio = clamp(distanceRatio, 0.0, 1.0);
            exponentialFog = pow(distanceRatio, 0.8) * 0.3;
          } else if (vDistance < maxWallDistance * 0.5) {
            distanceRatio = (vDistance - 60.0) / (maxWallDistance * 0.5 - 60.0);
            distanceRatio = clamp(distanceRatio, 0.0, 1.0);
            exponentialFog = 0.3 + pow(distanceRatio, 0.9) * 0.4;
          } else {
            distanceRatio = (vDistance - maxWallDistance * 0.5) / (maxWallDistance - maxWallDistance * 0.5);
            distanceRatio = clamp(distanceRatio, 0.0, 1.0);
            exponentialFog = 0.7 + pow(distanceRatio, 1.2) * 0.3;
          }
          
          exponentialFog = smoothstep(0.0, 1.0, exponentialFog);
          
          // Enhanced bottom coverage with smooth transitions
          float bottomDensityBoost = 1.0 - smoothstep(0.0, 0.3, vHeightFactor);
          bottomDensityBoost = pow(bottomDensityBoost, 0.5);
          
          // Apply smooth darkness-based boost
          float darknessBoost = blendingAlpha * 0.4;
          bottomDensityBoost += darknessBoost;
          
          // Dynamic sky gradient
          float skyTransition1 = smoothstep(0.6, 0.8, vHeightFactor) * (1.0 - blendingAlpha * 0.6);
          float skyTransition2 = smoothstep(0.8, 0.95, vHeightFactor) * (1.0 - blendingAlpha * 0.7);
          float skyTransition3 = smoothstep(0.9, 1.0, vHeightFactor) * (1.0 - blendingAlpha * 0.8);
          
          float heightGradient = 1.0 - vHeightFactor;
          heightGradient += bottomDensityBoost * 0.5;
          heightGradient *= (1.0 - skyTransition1 * 0.1);
          heightGradient *= (1.0 - skyTransition2 * 0.2);
          heightGradient *= (1.0 - skyTransition3 * 0.3);
          
          // Soft edge blending
          vec2 centerUV = vUv - 0.5;
          float radialDistance = length(centerUV);
          float radialFalloff = 1.0 - smoothstep(0.3, 0.5, radialDistance);
          
          float edgeSoftness = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) *
                              smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          // Enhanced density for dark periods
          float baseDensity = fogWallDensity * exponentialFog * heightGradient * fogWallDensityMultiplier;
          baseDensity *= densityVariation;
          baseDensity *= radialFalloff * 0.7 + 0.3;
          baseDensity *= edgeSoftness;
          baseDensity *= (0.8 + layerDepth * 0.4);
          
          baseDensity = clamp(baseDensity, 0.0, maxWallOpacity);
          
          gl_FragColor = vec4(atmosphericColor, baseDensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
  }

  private createAtmosphericFogMaterial(): void {
    this.atmosphericFogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        dayFogColor: { value: new THREE.Color(0xF8F8F8) },
        nightFogColor: { value: new THREE.Color(0x606090) },
        sunriseFogColor: { value: new THREE.Color(0xFFECE0) },
        sunsetFogColor: { value: new THREE.Color(0xFFE0C0) },
        atmosphericDensity: { value: 0.06 },
        atmosphericMultiplier: { value: 1.0 },
        maxAtmosphericDistance: { value: 400.0 },
        playerPosition: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying float vHeight;
        
        uniform vec3 playerPosition;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          vHeight = worldPosition.y;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
        uniform float atmosphericDensity;
        uniform float atmosphericMultiplier;
        uniform float maxAtmosphericDistance;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying float vHeight;
        
        vec3 getAtmosphericColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.15 && time <= 0.35) {
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(nightFogColor, sunriseFogColor, factor);
            } else {
              float factor = (time - 0.25) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunriseFogColor, dayFogColor, factor);
            }
          } else if (time >= 0.35 && time <= 0.65) {
            currentColor = dayFogColor;
          } else if (time >= 0.65 && time <= 0.85) {
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(dayFogColor, sunsetFogColor, factor);
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunsetFogColor, nightFogColor, factor);
            }
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 dynamicFogColor = getAtmosphericColorForTime(timeOfDay);
          
          // Atmospheric perspective with height and distance
          float heightFactor = clamp(vHeight / 40.0, 0.0, 1.0);
          float distanceFactor = smoothstep(150.0, maxAtmosphericDistance, vDistance);
          
          // Atmospheric scattering effect
          float scatteringEffect = 1.0 - exp(-vDistance * 0.002);
          vec3 scatteredColor = mix(dynamicFogColor, vec3(0.8, 0.85, 0.9), scatteringEffect * 0.2);
          
          float density = atmosphericDensity * distanceFactor * (0.5 + heightFactor * 0.5) * atmosphericMultiplier;
          density = clamp(density, 0.0, 0.3);
          
          gl_FragColor = vec4(scatteredColor, density);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  private createHorizonFogMaterial(): void {
    this.horizonFogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        dayFogColor: { value: new THREE.Color(0xF0F0F0) },
        nightFogColor: { value: new THREE.Color(0x505080) },
        sunriseFogColor: { value: new THREE.Color(0xFFE8D0) },
        sunsetFogColor: { value: new THREE.Color(0xFFDCC0) },
        horizonDensity: { value: 0.15 },
        horizonMultiplier: { value: 1.0 },
        maxHorizonDistance: { value: 350.0 },
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.008 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying vec2 vUv;
        
        uniform vec3 playerPosition;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
        uniform float horizonDensity;
        uniform float horizonMultiplier;
        uniform float maxHorizonDistance;
        uniform float time;
        uniform float noiseScale;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying vec2 vUv;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        vec3 getHorizonFogColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.15 && time <= 0.35) {
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(nightFogColor, sunriseFogColor, factor);
            } else {
              float factor = (time - 0.25) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunriseFogColor, dayFogColor, factor);
            }
          } else if (time >= 0.35 && time <= 0.65) {
            currentColor = dayFogColor;
          } else if (time >= 0.65 && time <= 0.85) {
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(dayFogColor, sunsetFogColor, factor);
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunsetFogColor, nightFogColor, factor);
            }
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 dynamicFogColor = getHorizonFogColorForTime(timeOfDay);
          
          vec2 noisePos = vWorldPosition.xz * noiseScale + time * 0.005;
          float noiseValue = noise(noisePos) * 0.5 + 0.5;
          
          // Enhanced horizon blending with very long transition
          float horizonBlendStart = 0.1;
          float horizonBlendEnd = 0.8;
          float horizonFactor = smoothstep(horizonBlendStart, horizonBlendEnd, vDistance / maxHorizonDistance);
          
          vec2 centerUV = vUv - 0.5;
          float radialDistance = length(centerUV);
          float radialFalloff = 1.0 - smoothstep(0.2, 0.5, radialDistance);
          
          float density = horizonDensity * horizonFactor * radialFalloff * noiseValue * horizonMultiplier;
          density = clamp(density, 0.0, 0.4);
          
          gl_FragColor = vec4(dynamicFogColor, density);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }
  
  private createGroundFogMaterial(): void {
    this.groundFogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        dayFogColor: { value: new THREE.Color(0xF0F0F0) },
        nightFogColor: { value: new THREE.Color(0x505080) },
        sunriseFogColor: { value: new THREE.Color(0xFFE8D0) },
        sunsetFogColor: { value: new THREE.Color(0xFFDCC0) },
        groundFogDensity: { value: 0.12 },
        groundDensityMultiplier: { value: 1.0 },
        maxGroundDistance: { value: 250.0 },
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.01 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying vec2 vUv;
        
        uniform vec3 playerPosition;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
        uniform float groundFogDensity;
        uniform float groundDensityMultiplier;
        uniform float maxGroundDistance;
        uniform float time;
        uniform float noiseScale;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying vec2 vUv;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        vec3 getGroundFogColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.15 && time <= 0.35) {
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(nightFogColor, sunriseFogColor, factor);
            } else {
              float factor = (time - 0.25) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunriseFogColor, dayFogColor, factor);
            }
          } else if (time >= 0.35 && time <= 0.65) {
            currentColor = dayFogColor;
          } else if (time >= 0.65 && time <= 0.85) {
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(dayFogColor, sunsetFogColor, factor);
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunsetFogColor, nightFogColor, factor);
            }
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 dynamicFogColor = getGroundFogColorForTime(timeOfDay);
          
          vec2 noisePos = vWorldPosition.xz * noiseScale + time * 0.01;
          float noiseValue = noise(noisePos) * 0.5 + 0.5;
          
          float distanceFactor = smoothstep(10.0, maxGroundDistance, vDistance);
          
          vec2 centerUV = vUv - 0.5;
          float radialDistance = length(centerUV);
          float radialFalloff = 1.0 - smoothstep(0.3, 0.5, radialDistance);
          
          float density = groundFogDensity * distanceFactor * radialFalloff * noiseValue * groundDensityMultiplier;
          density = clamp(density, 0.0, 0.25);
          
          gl_FragColor = vec4(dynamicFogColor, density);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }
  
  private createRealisticFogWalls(): void {
    // Create multiple layers of realistic fog walls with reduced heights
    const layerConfigs = [
      { distances: [25, 45, 70, 100, 140, 190], heights: [15, 18, 22, 25, 28, 30] },
      { distances: [35, 60, 90, 130, 180, 240], heights: [12, 15, 18, 20, 22, 25] },
      { distances: [50, 80, 120, 170, 230, 300], heights: [10, 12, 15, 18, 20, 22] }
    ];
    
    layerConfigs.forEach((layerConfig, layerIndex) => {
      layerConfig.distances.forEach((distance, distanceIndex) => {
        const wallHeight = layerConfig.heights[distanceIndex];
        const wallWidth = 400 + distanceIndex * 100;
        
        // Create fewer walls per ring for better performance
        for (let i = 0; i < 20; i++) {
          const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight, 20, 10);
          
          // Add subtle organic displacement
          const positionAttribute = wallGeometry.getAttribute('position');
          const positions = positionAttribute.array as Float32Array;
          
          for (let j = 0; j < positions.length; j += 3) {
            const x = positions[j];
            const y = positions[j + 1];
            
            const displacement = Math.sin(x * 0.02) * Math.cos(y * 0.03) * 1.5; // Reduced displacement
            const heightFactor = (y + wallHeight / 2) / wallHeight;
            
            positions[j] += displacement * 0.2;
            positions[j + 1] += displacement * heightFactor * 0.8;
            positions[j + 2] += displacement * 0.15;
          }
          
          positionAttribute.needsUpdate = true;
          wallGeometry.computeVertexNormals();
          
          const wall = new THREE.Mesh(wallGeometry, this.fogWallMaterial.clone());
          
          const angle = (i / 20) * Math.PI * 2;
          wall.position.x = Math.cos(angle) * distance;
          wall.position.z = Math.sin(angle) * distance;
          wall.position.y = wallHeight / 2 - 2; // Lower positioning
          wall.rotation.y = angle + Math.PI / 2;
          
          // Reduced density for realism
          const wallDensity = 0.02 + (distanceIndex * 0.008) + (layerIndex * 0.005);
          const material = wall.material as THREE.ShaderMaterial;
          material.uniforms.fogWallDensity.value = wallDensity;
          material.uniforms.layerDepth.value = layerIndex * 0.3;
          material.uniforms.fogWallHeight.value = wallHeight;
          
          // Store for smooth transitions
          (wall as any).baseDistance = distance;
          (wall as any).wallIndex = i;
          (wall as any).layerIndex = layerIndex;
          (wall as any).distanceIndex = distanceIndex;
          
          this.fogWallLayers.push(wall);
          this.scene.add(wall);
        }
      });
    });
    
    console.log(`Created ${this.fogWallLayers.length} realistic fog walls with atmospheric perspective`);
  }

  private createAtmosphericLayers(): void {
    // Create atmospheric fog layers for distant haze
    const atmosphericDistances = [200, 300, 400];
    const atmosphericSizes = [600, 800, 1000];
    
    atmosphericDistances.forEach((distance, index) => {
      const size = atmosphericSizes[index];
      const atmosphericGeometry = new THREE.PlaneGeometry(size, size, 12, 12);
      const atmosphericFog = new THREE.Mesh(atmosphericGeometry, this.atmosphericFogMaterial.clone());
      
      atmosphericFog.position.y = 20 + index * 8; // Higher positioning for atmospheric layers
      atmosphericFog.rotation.x = -Math.PI / 2;
      
      const atmosphericDensity = 0.04 + (index * 0.015);
      (atmosphericFog.material as THREE.ShaderMaterial).uniforms.atmosphericDensity.value = atmosphericDensity;
      (atmosphericFog.material as THREE.ShaderMaterial).uniforms.maxAtmosphericDistance.value = 300 + index * 100;
      
      this.atmosphericFogLayers.push(atmosphericFog);
      this.scene.add(atmosphericFog);
    });
    
    console.log(`Created ${this.atmosphericFogLayers.length} atmospheric perspective layers`);
  }

  private createHorizonBlendingLayers(): void {
    // Create horizon fog for seamless sky transition
    const horizonDistances = [150, 250, 350];
    const horizonSizes = [500, 700, 900];
    
    horizonDistances.forEach((distance, index) => {
      const size = horizonSizes[index];
      const horizonGeometry = new THREE.PlaneGeometry(size, size, 16, 16);
      
      // Add subtle height variation
      const positionAttribute = horizonGeometry.getAttribute('position');
      const positions = positionAttribute.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        positions[i + 1] += Math.sin(x * 0.01) * Math.cos(z * 0.01) * 0.8;
      }
      
      positionAttribute.needsUpdate = true;
      horizonGeometry.computeVertexNormals();
      
      const horizonFog = new THREE.Mesh(horizonGeometry, this.horizonFogMaterial.clone());
      horizonFog.position.y = 8 + index * 4; // Mid-level positioning
      horizonFog.rotation.x = -Math.PI / 2;
      
      const horizonDensity = 0.08 + (index * 0.02);
      (horizonFog.material as THREE.ShaderMaterial).uniforms.horizonDensity.value = horizonDensity;
      (horizonFog.material as THREE.ShaderMaterial).uniforms.maxHorizonDistance.value = distance + 50;
      
      this.horizonFogLayers.push(horizonFog);
      this.scene.add(horizonFog);
    });
    
    console.log(`Created ${this.horizonFogLayers.length} horizon blending layers for seamless sky transition`);
  }
  
  private createGroundFogLayers(): void {
    const groundDistances = [0, 30, 80, 150];
    const groundSizes = [160, 280, 400, 520];
    
    groundDistances.forEach((distance, index) => {
      const groundSize = groundSizes[index];
      const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 14, 14);
      
      const positionAttribute = groundGeometry.getAttribute('position');
      const positions = positionAttribute.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        positions[i + 1] += Math.sin(x * 0.008) * Math.cos(z * 0.008) * 0.4;
      }
      
      positionAttribute.needsUpdate = true;
      groundGeometry.computeVertexNormals();
      
      const groundFog = new THREE.Mesh(groundGeometry, this.groundFogMaterial.clone());
      groundFog.position.y = -0.5;
      groundFog.rotation.x = -Math.PI / 2;
      
      const groundDensity = 0.08 + (index * 0.015);
      (groundFog.material as THREE.ShaderMaterial).uniforms.groundFogDensity.value = groundDensity;
      (groundFog.material as THREE.ShaderMaterial).uniforms.maxGroundDistance.value = 200 + index * 50;
      
      this.groundFogLayers.push(groundFog);
      this.scene.add(groundFog);
    });
    
    console.log(`Created ${this.groundFogLayers.length} realistic ground fog layers`);
  }
  
  // PERFORMANCE OPTIMIZATION: Frame skipping and uniform caching
  private fogUpdateFrameCounter: number = 0;
  private cachedUniforms: { [key: string]: any } = {};
  
  public dispose(): void {
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogWallLayers = [];
    
    this.atmosphericFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.atmosphericFogLayers = [];
    
    this.horizonFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.horizonFogLayers = [];
    
    this.groundFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.groundFogLayers = [];
    
    if (this.groundFogMaterial) this.groundFogMaterial.dispose();
    if (this.fogWallMaterial) this.fogWallMaterial.dispose();
    if (this.atmosphericFogMaterial) this.atmosphericFogMaterial.dispose();
    if (this.horizonFogMaterial) this.horizonFogMaterial.dispose();
    
    console.log("Realistic VolumetricFogSystem with atmospheric perspective disposed");
  }
  
  // PHASE 2: Massive performance optimization for fog system
  private updateCounter: number = 0;
  private cachedTime: number = 0;
  private cachedFogParams: {
    densityMultiplier: number;
    maxDistance: number;
    maxOpacity: number;
    blendingAlpha: number;
    lastUpdate: number;
  } | null = null;

  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.updateCounter++;
    this.timeOfDay = gameTime || this.timeOfDay;
    
    // ULTRA-AGGRESSIVE: Update fog every 8 frames for 87.5% fewer updates
    if (this.updateCounter % 8 !== 0) return;
    
    const time = Date.now() * 0.001;
    const timeDiff = time - this.cachedTime;
    
    // CACHE fog parameters - only recalculate if time changed significantly
    if (!this.cachedFogParams || timeDiff > 0.1 || Math.abs(this.timeOfDay - (this.cachedFogParams.lastUpdate || 0)) > 0.01) {
      this.cachedFogParams = {
        densityMultiplier: this.getFogDensityMultiplier(this.timeOfDay),
        maxDistance: this.getFogMaxDistance(this.timeOfDay),
        maxOpacity: this.getFogMaxOpacity(this.timeOfDay),
        blendingAlpha: this.getBlendingAlpha(this.timeOfDay),
        lastUpdate: this.timeOfDay
      };
      this.cachedTime = time;
    }
    
    const { densityMultiplier, maxDistance, maxOpacity, blendingAlpha } = this.cachedFogParams;
    
    // BATCH uniform updates for maximum performance
    const updateMaterialUniforms = (material: THREE.ShaderMaterial, timeOffset: number, multiplier: number = 1) => {
      if (!material.uniforms) return;
      
      material.uniforms.time.value = time + timeOffset;
      material.uniforms.timeOfDay.value = this.timeOfDay;
      material.uniforms.playerPosition.value = playerPosition;
      
      // Apply cached parameters with multiplier
      if (material.uniforms.fogWallDensityMultiplier) {
        material.uniforms.fogWallDensityMultiplier.value = densityMultiplier * multiplier;
      }
      if (material.uniforms.maxWallDistance) {
        material.uniforms.maxWallDistance.value = maxDistance;
      }
      if (material.uniforms.maxWallOpacity) {
        material.uniforms.maxWallOpacity.value = maxOpacity;
      }
      if (material.uniforms.blendingAlpha) {
        material.uniforms.blendingAlpha.value = blendingAlpha;
      }
    };
    
    // OPTIMIZED: Single loop with specific multipliers for each layer type
    this.fogWallLayers.forEach((layer, index) => {
      updateMaterialUniforms(layer.material as THREE.ShaderMaterial, index * 0.1, 1.0);
      if ((layer.material as THREE.ShaderMaterial).uniforms?.layerDepth) {
        (layer.material as THREE.ShaderMaterial).uniforms.layerDepth.value = index * 0.1;
      }
    });
    
    this.atmosphericFogLayers.forEach((layer, index) => {
      updateMaterialUniforms(layer.material as THREE.ShaderMaterial, index * 0.05, 0.7);
    });
    
    this.horizonFogLayers.forEach((layer, index) => {
      updateMaterialUniforms(layer.material as THREE.ShaderMaterial, index * 0.03, 0.5);
    });
    
    this.groundFogLayers.forEach((layer, index) => {
      updateMaterialUniforms(layer.material as THREE.ShaderMaterial, index * 0.02, 0.8);
    });
  }
}
