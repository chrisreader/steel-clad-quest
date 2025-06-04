import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogLayers: THREE.Mesh[] = [];
  private fogWallLayers: THREE.Mesh[] = [];
  private skyFogLayers: THREE.Mesh[] = [];
  private groundFogLayers: THREE.Mesh[] = [];
  private fogMaterial: THREE.ShaderMaterial;
  private fogWallMaterial: THREE.ShaderMaterial;
  private skyFogMaterial: THREE.ShaderMaterial;
  private groundFogMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createVolumetricFogMaterial();
    this.createFogWallMaterial();
    this.createSkyFogMaterial();
    this.createGroundFogMaterial();
    this.createFogLayers();
    this.createFogWallLayers();
    this.createSkyFogLayers();
    this.createGroundFogLayers();
  }
  
  private createVolumetricFogMaterial(): void {
    this.fogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        fogColor: { value: new THREE.Color(0xB0E0E6) },
        dayFogColor: { value: new THREE.Color(0xB0E0E6) },
        nightFogColor: { value: new THREE.Color(0x191970) },
        sunriseFogColor: { value: new THREE.Color(0xFFB366) },
        sunsetFogColor: { value: new THREE.Color(0xFF8C42) },
        fogDensity: { value: 0.15 },
        layerHeight: { value: 1.0 },
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.02 },
        windDirection: { value: new THREE.Vector2(1.0, 0.5) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        
        uniform vec3 playerPosition;
        
        void main() {
          vPosition = position;
          vUv = uv;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float timeOfDay;
        uniform vec3 fogColor;
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
        uniform float fogDensity;
        uniform float layerHeight;
        uniform vec3 playerPosition;
        uniform float noiseScale;
        uniform vec2 windDirection;
        
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        
        // Simplex noise function
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
        
        float snoise(vec3 v) {
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
        
        vec3 getFogColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.2 && time <= 0.3) {
            // Sunrise
            float factor = (time - 0.2) / 0.1;
            currentColor = mix(nightFogColor, sunriseFogColor, factor);
          } else if (time > 0.3 && time < 0.4) {
            // Morning transition
            float factor = (time - 0.3) / 0.1;
            currentColor = mix(sunriseFogColor, dayFogColor, factor);
          } else if (time >= 0.4 && time <= 0.6) {
            // Day
            currentColor = dayFogColor;
          } else if (time > 0.6 && time < 0.7) {
            // Afternoon transition
            float factor = (time - 0.6) / 0.1;
            currentColor = mix(dayFogColor, sunsetFogColor, factor);
          } else if (time >= 0.7 && time <= 0.8) {
            // Sunset
            float factor = (time - 0.7) / 0.1;
            currentColor = mix(sunsetFogColor, nightFogColor, factor);
          } else {
            // Night
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          // Calculate dynamic fog color based on time
          vec3 dynamicFogColor = getFogColorForTime(timeOfDay);
          
          // Create animated noise for fog movement
          vec3 noisePos = vWorldPosition * noiseScale;
          noisePos.xy += windDirection * time * 0.1;
          
          float noise1 = snoise(noisePos);
          float noise2 = snoise(noisePos * 2.0 + vec3(time * 0.05));
          float noise3 = snoise(noisePos * 4.0 - vec3(time * 0.03));
          
          float combinedNoise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
          
          // Calculate height-based density
          float heightFactor = 1.0 - abs(vPosition.y) / layerHeight;
          heightFactor = smoothstep(0.0, 1.0, heightFactor);
          
          // Distance-based density
          float distanceFactor = 1.0 - smoothstep(20.0, 100.0, vDistance);
          
          // Calculate final fog density
          float density = fogDensity * heightFactor * distanceFactor;
          density *= (0.8 + combinedNoise * 0.4);
          density = clamp(density, 0.0, 1.0);
          
          // Time-based density adjustment (thicker fog at dawn/dusk)
          float timeDensityMultiplier = 1.0;
          if (timeOfDay >= 0.2 && timeOfDay <= 0.3 || timeOfDay >= 0.7 && timeOfDay <= 0.8) {
            timeDensityMultiplier = 1.5; // Thicker fog during transitions
          }
          density *= timeDensityMultiplier;
          
          // Edge fade for smooth blending
          float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x) *
                          smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          density *= edgeFade;
          
          gl_FragColor = vec4(dynamicFogColor, density);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  private createFogWallMaterial(): void {
    this.fogWallMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        fogColor: { value: new THREE.Color(0xF5F5F5) },
        dayFogColor: { value: new THREE.Color(0xF5F5F5) },
        nightFogColor: { value: new THREE.Color(0x404080) },
        sunriseFogColor: { value: new THREE.Color(0xFFE4CC) },
        sunsetFogColor: { value: new THREE.Color(0xFFD0AA) },
        fogWallDensity: { value: 0.4 }, // Increased for better coverage
        fogWallHeight: { value: 80.0 }, // Increased height for complete coverage
        horizonBlur: { value: 0.6 },
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.015 }, // Increased for more detail
        windDirection: { value: new THREE.Vector2(1.0, 0.3) },
        layerDepth: { value: 0.0 } // For depth layering
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
        uniform vec3 fogColor;
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
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
        
        // 3D Simplex noise function for volumetric effects
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
        
        vec3 getFogWallColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.2 && time <= 0.3) {
            float factor = (time - 0.2) / 0.1;
            currentColor = mix(nightFogColor, sunriseFogColor, factor);
          } else if (time > 0.3 && time < 0.4) {
            float factor = (time - 0.3) / 0.1;
            currentColor = mix(sunriseFogColor, dayFogColor, factor);
          } else if (time >= 0.4 && time <= 0.6) {
            currentColor = dayFogColor;
          } else if (time > 0.6 && time < 0.7) {
            float factor = (time - 0.6) / 0.1;
            currentColor = mix(dayFogColor, sunsetFogColor, factor);
          } else if (time >= 0.7 && time <= 0.8) {
            float factor = (time - 0.7) / 0.1;
            currentColor = mix(sunsetFogColor, nightFogColor, factor);
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          // Get dynamic fog color for wall effect
          vec3 dynamicFogColor = getFogWallColorForTime(timeOfDay);
          
          // Create 3D volumetric noise for realistic fog volume
          vec3 noisePos = vWorldPosition * noiseScale;
          noisePos += vec3(windDirection * time * 0.02, time * 0.01);
          
          // Multiple octaves of 3D noise for detail
          float noise1 = snoise3D(noisePos) * 0.5 + 0.5;
          float noise2 = snoise3D(noisePos * 2.1 + vec3(1.7)) * 0.25 + 0.25;
          float noise3 = snoise3D(noisePos * 4.3 + vec3(3.4)) * 0.125 + 0.125;
          float noise4 = snoise3D(noisePos * 8.7 + vec3(6.8)) * 0.0625 + 0.0625;
          
          float volumetricNoise = noise1 + noise2 + noise3 + noise4;
          
          // Create density holes for see-through effect
          float densityVariation = smoothstep(0.3, 0.8, volumetricNoise);
          
          // ALIGNED WITH THREE.JS FOG: Distance-based fog density matching THREE.js fog (25-120 units)
          float distanceRatio = (vDistance - 25.0) / (120.0 - 25.0);
          distanceRatio = clamp(distanceRatio, 0.0, 1.0);
          float exponentialFog = pow(distanceRatio, 1.5); // Smoother curve
          exponentialFog = smoothstep(0.0, 1.0, exponentialFog);
          
          // Atmospheric perspective - color shifts with distance
          vec3 atmosphericColor = dynamicFogColor;
          float atmosphericShift = smoothstep(25.0, 120.0, vDistance);
          atmosphericColor = mix(atmosphericColor, atmosphericColor * 0.7, atmosphericShift * 0.3);
          
          // ENHANCED BOTTOM COVERAGE - Stronger density at bottom to prevent horizon visibility
          float bottomDensityBoost = 1.0 - smoothstep(0.0, 0.3, vHeightFactor); // Strong at bottom
          bottomDensityBoost = pow(bottomDensityBoost, 0.5); // Soften the curve
          
          // SMOOTH SKY GRADIENT - Multiple transition zones for natural blending
          float skyTransition1 = smoothstep(0.5, 0.7, vHeightFactor); // Early fade start
          float skyTransition2 = smoothstep(0.7, 0.9, vHeightFactor); // Main fade
          float skyTransition3 = smoothstep(0.85, 1.0, vHeightFactor); // Final fade to transparent
          
          float heightGradient = 1.0 - vHeightFactor;
          heightGradient += bottomDensityBoost * 0.5; // Add bottom boost
          heightGradient *= (1.0 - skyTransition1 * 0.2); // Gentle fade start
          heightGradient *= (1.0 - skyTransition2 * 0.4); // Main fade
          heightGradient *= (1.0 - skyTransition3 * 0.6); // Strong fade at top
          
          // SOFT EDGE BLENDING - Radial falloff and seamless wall transitions
          vec2 centerUV = vUv - 0.5;
          float radialDistance = length(centerUV);
          float radialFalloff = 1.0 - smoothstep(0.3, 0.5, radialDistance);
          
          // Edge softening for seamless blending
          float edgeSoftness = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) *
                              smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          // LAYERED DENSITY - Combine all effects for realistic volumetric fog
          float baseDensity = fogWallDensity * exponentialFog * heightGradient;
          baseDensity *= densityVariation; // Add volume variation
          baseDensity *= radialFalloff * 0.7 + 0.3; // Soft radial falloff
          baseDensity *= edgeSoftness; // Smooth edges
          
          // Add subtle depth layering based on layer position
          baseDensity *= (0.8 + layerDepth * 0.4);
          
          // Time-based density adjustments - more subtle for realism
          float timeWallMultiplier = 1.0;
          if (timeOfDay >= 0.2 && timeOfDay <= 0.3 || timeOfDay >= 0.7 && timeOfDay <= 0.8) {
            timeWallMultiplier = 1.1;
          } else if (timeOfDay >= 0.8 || timeOfDay <= 0.2) {
            timeWallMultiplier = 1.05;
          }
          baseDensity *= timeWallMultiplier;
          
          // Ensure transparency for see-through effect but prevent horizon visibility
          baseDensity = clamp(baseDensity, 0.0, 0.7); // Increased max opacity
          
          gl_FragColor = vec4(atmosphericColor, baseDensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // Changed back for proper volumetric layering
      side: THREE.DoubleSide
    });
  }

  private createSkyFogMaterial(): void {
    this.skyFogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        dayFogColor: { value: new THREE.Color(0xF8F8F8) },
        nightFogColor: { value: new THREE.Color(0x606090) },
        sunriseFogColor: { value: new THREE.Color(0xFFECE0) },
        sunsetFogColor: { value: new THREE.Color(0xFFE0C0) },
        skyFogDensity: { value: 0.15 }, // Further reduced for subtlety
        playerPosition: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vDistance;
        
        uniform vec3 playerPosition;
        
        void main() {
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
        uniform float skyFogDensity;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        
        vec3 getSkyFogColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.2 && time <= 0.3) {
            float factor = (time - 0.2) / 0.1;
            currentColor = mix(nightFogColor, sunriseFogColor, factor);
          } else if (time > 0.3 && time < 0.4) {
            float factor = (time - 0.3) / 0.1;
            currentColor = mix(sunriseFogColor, dayFogColor, factor);
          } else if (time >= 0.4 && time <= 0.6) {
            currentColor = dayFogColor;
          } else if (time > 0.6 && time < 0.7) {
            float factor = (time - 0.6) / 0.1;
            currentColor = mix(dayFogColor, sunsetFogColor, factor);
          } else if (time >= 0.7 && time <= 0.8) {
            float factor = (time - 0.7) / 0.1;
            currentColor = mix(sunsetFogColor, nightFogColor, factor);
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 dynamicFogColor = getSkyFogColorForTime(timeOfDay);
          
          // ALIGNED WITH THREE.JS FOG: Sky fog density matching THREE.js fog completion range
          float distanceFactor = smoothstep(100.0, 120.0, vDistance);
          float density = skyFogDensity * distanceFactor * 0.5; // Further reduced
          
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
        groundFogDensity: { value: 0.25 },
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
        uniform float time;
        uniform float noiseScale;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        varying vec2 vUv;
        
        // Simple noise for ground fog variation
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        vec3 getGroundFogColorForTime(float time) {
          vec3 currentColor = dayFogColor;
          
          if (time >= 0.2 && time <= 0.3) {
            float factor = (time - 0.2) / 0.1;
            currentColor = mix(nightFogColor, sunriseFogColor, factor);
          } else if (time > 0.3 && time < 0.4) {
            float factor = (time - 0.3) / 0.1;
            currentColor = mix(sunriseFogColor, dayFogColor, factor);
          } else if (time >= 0.4 && time <= 0.6) {
            currentColor = dayFogColor;
          } else if (time > 0.6 && time < 0.7) {
            float factor = (time - 0.6) / 0.1;
            currentColor = mix(dayFogColor, sunsetFogColor, factor);
          } else if (time >= 0.7 && time <= 0.8) {
            float factor = (time - 0.7) / 0.1;
            currentColor = mix(sunsetFogColor, nightFogColor, factor);
          } else {
            currentColor = nightFogColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 dynamicFogColor = getGroundFogColorForTime(timeOfDay);
          
          // Create subtle noise variation
          vec2 noisePos = vWorldPosition.xz * noiseScale + time * 0.01;
          float noiseValue = noise(noisePos) * 0.5 + 0.5;
          
          // Distance-based density for ground fog
          float distanceFactor = smoothstep(15.0, 120.0, vDistance);
          
          // Radial falloff from center
          vec2 centerUV = vUv - 0.5;
          float radialDistance = length(centerUV);
          float radialFalloff = 1.0 - smoothstep(0.3, 0.5, radialDistance);
          
          float density = groundFogDensity * distanceFactor * radialFalloff * noiseValue;
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
  
  private createFogLayers(): void {
    const fogGeometries = [
      // Ground fog layer
      new THREE.PlaneGeometry(200, 200, 32, 32),
      // Mid-level fog
      new THREE.PlaneGeometry(150, 150, 24, 24),
      // High fog layer
      new THREE.PlaneGeometry(100, 100, 16, 16)
    ];
    
    const layerConfigs = [
      { y: 2, density: 0.25 },
      { y: 8, density: 0.15 },
      { y: 15, density: 0.1 }
    ];
    
    fogGeometries.forEach((geometry, index) => {
      // Add vertex displacement for organic look
      const positionAttribute = geometry.getAttribute('position');
      const positions = positionAttribute.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += (Math.random() - 0.5) * 2; // Y displacement
      }
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
      
      // Create fog layer
      const fogLayer = new THREE.Mesh(geometry, this.fogMaterial.clone());
      fogLayer.position.y = layerConfigs[index].y;
      fogLayer.rotation.x = -Math.PI / 2;
      
      // Set layer-specific density
      (fogLayer.material as THREE.ShaderMaterial).uniforms.fogDensity.value = layerConfigs[index].density;
      
      this.fogLayers.push(fogLayer);
      this.scene.add(fogLayer);
    });
    
    console.log(`Created ${this.fogLayers.length} volumetric fog layers`);
  }

  private createFogWallLayers(): void {
    // ENHANCED COVERAGE: Create more comprehensive fog wall layers to prevent horizon visibility
    const wallDistances = [20, 30, 45, 65, 90, 115]; // Extended range with closer start
    const wallHeights = [25, 35, 50, 65, 80, 95]; // Increased heights for complete coverage
    const wallWidths = [400, 500, 600, 700, 800, 900]; // Scaled for distances
    const layerDepths = [0.0, 0.15, 0.3, 0.45, 0.6, 0.75]; // More layers for depth
    
    wallDistances.forEach((distance, distanceIndex) => {
      const wallHeight = wallHeights[distanceIndex];
      const wallWidth = wallWidths[distanceIndex];
      const layerDepth = layerDepths[distanceIndex];
      
      // Create 24 walls for better coverage (increased from 16)
      for (let i = 0; i < 24; i++) {
        // Create organic wall geometry with more segments for deformation
        const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight, 32, 16);
        
        // Add organic vertex displacement for natural fog shapes
        const positionAttribute = wallGeometry.getAttribute('position');
        const positions = positionAttribute.array as Float32Array;
        
        for (let j = 0; j < positions.length; j += 3) {
          const x = positions[j];
          const y = positions[j + 1];
          const z = positions[j + 2];
          
          // Create billowing, organic displacement
          const displacement = Math.sin(x * 0.02) * Math.cos(y * 0.03) * Math.sin(z * 0.01) * 3.0;
          const heightFactor = (y + wallHeight / 2) / wallHeight; // 0 to 1 from bottom to top
          const edgeFactor = Math.abs(x) / (wallWidth / 2); // 0 to 1 from center to edge
          
          // Apply more displacement at edges and top for organic look
          positions[j] += displacement * edgeFactor * 0.5;
          positions[j + 1] += displacement * heightFactor * 1.5;
          positions[j + 2] += displacement * 0.3;
        }
        
        positionAttribute.needsUpdate = true;
        wallGeometry.computeVertexNormals();
        
        const wall = new THREE.Mesh(wallGeometry, this.fogWallMaterial.clone());
        
        const angle = (i / 24) * Math.PI * 2; // Updated for 24 walls
        wall.position.x = Math.cos(angle) * distance;
        wall.position.z = Math.sin(angle) * distance;
        wall.position.y = wallHeight / 2 - 5; // Position to extend below ground level
        wall.rotation.y = angle + Math.PI / 2;
        
        // Add slight random rotation for organic feel
        wall.rotation.x += (Math.random() - 0.5) * 0.1;
        wall.rotation.z += (Math.random() - 0.5) * 0.05;
        
        // Set distance-specific wall density and depth for layered effect
        const wallDensity = 0.25 + (distanceIndex * 0.03); // Increased base density
        const material = wall.material as THREE.ShaderMaterial;
        material.uniforms.fogWallDensity.value = wallDensity;
        material.uniforms.layerDepth.value = layerDepth;
        
        this.fogWallLayers.push(wall);
        this.scene.add(wall);
      }
    });
    
    console.log(`Created ${this.fogWallLayers.length} enhanced fog wall layers with complete horizon coverage`);
  }

  private createSkyFogLayers(): void {
    // ALIGNED WITH THREE.JS FOG: Create sky fog layers near THREE.js fog completion range
    const skyDistances = [100, 120]; // Aligned with THREE.js fog completion
    const skyHeights = [20, 30]; // Scaled for closer range
    
    skyDistances.forEach((distance, index) => {
      const skyHeight = skyHeights[index];
      const skyGeometry = new THREE.PlaneGeometry(300, 300, 16, 16); // Scaled for closer range
      const skyFog = new THREE.Mesh(skyGeometry, this.skyFogMaterial.clone());
      
      skyFog.position.y = skyHeight;
      skyFog.rotation.x = -Math.PI / 2;
      
      // Set distance-specific sky fog density - optimized for THREE.js fog range
      const skyDensity = 0.1 + (index * 0.03); // More subtle progression
      (skyFog.material as THREE.ShaderMaterial).uniforms.skyFogDensity.value = skyDensity;
      
      this.skyFogLayers.push(skyFog);
      this.scene.add(skyFog);
    });
    
    console.log(`Created ${this.skyFogLayers.length} sky fog layers aligned with THREE.js fog completion range`);
  }
  
  private createGroundFogLayers(): void {
    // Create ground fog planes to prevent seeing under fog walls
    const groundDistances = [0, 25, 50, 100]; // From player outward
    const groundSizes = [200, 300, 400, 500]; // Increasing sizes
    
    groundDistances.forEach((distance, index) => {
      const groundSize = groundSizes[index];
      const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 16, 16);
      
      // Add subtle vertex displacement for organic ground fog
      const positionAttribute = groundGeometry.getAttribute('position');
      const positions = positionAttribute.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        // Subtle height variation
        positions[i + 1] += Math.sin(x * 0.01) * Math.cos(z * 0.01) * 0.5;
      }
      
      positionAttribute.needsUpdate = true;
      groundGeometry.computeVertexNormals();
      
      const groundFog = new THREE.Mesh(groundGeometry, this.groundFogMaterial.clone());
      groundFog.position.y = -1; // Slightly below ground level
      groundFog.rotation.x = -Math.PI / 2; // Horizontal
      
      // Set distance-specific ground fog density
      const groundDensity = 0.15 + (index * 0.02);
      (groundFog.material as THREE.ShaderMaterial).uniforms.groundFogDensity.value = groundDensity;
      
      this.groundFogLayers.push(groundFog);
      this.scene.add(groundFog);
    });
    
    console.log(`Created ${this.groundFogLayers.length} ground fog layers for complete horizon coverage`);
  }
  
  public update(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    // Update atmospheric fog layers
    this.fogLayers.forEach(layer => {
      const material = layer.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
      }
    });
    
    // Update fog wall layers
    this.fogWallLayers.forEach((wall, index) => {
      const material = wall.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
      }
    });
    
    // Update sky fog layers
    this.skyFogLayers.forEach(layer => {
      const material = layer.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
      }
    });
    
    // Update ground fog layers
    this.groundFogLayers.forEach((groundFog, index) => {
      const material = groundFog.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
      }
    });
    
    // Update fog layer positions to follow player (with lag for depth)
    this.fogLayers.slice(0, 3).forEach((layer, index) => {
      const lagFactor = 0.8 - index * 0.1;
      layer.position.x = THREE.MathUtils.lerp(layer.position.x, playerPosition.x, lagFactor * deltaTime);
      layer.position.z = THREE.MathUtils.lerp(layer.position.z, playerPosition.z, lagFactor * deltaTime);
    });
    
    // ALIGNED WITH THREE.JS FOG: Update fog wall positions to maintain THREE.js fog range distances
    this.fogWallLayers.forEach((wall, index) => {
      const wallGroup = Math.floor(index / 24); // Changed to 24 walls per group
      const wallInGroup = index % 24;
      const angle = (wallInGroup / 24) * Math.PI * 2; // Updated for 24 walls
      const distance = [20, 30, 45, 65, 90, 115][wallGroup]; // Updated distances
      
      wall.position.x = playerPosition.x + Math.cos(angle) * distance;
      wall.position.z = playerPosition.z + Math.sin(angle) * distance;
    });
    
    // Update ground fog positions to follow player
    this.groundFogLayers.forEach((groundFog, index) => {
      groundFog.position.x = playerPosition.x;
      groundFog.position.z = playerPosition.z;
    });
    
    // Update sky fog positions to follow player
    this.skyFogLayers.forEach((skyFog, index) => {
      skyFog.position.x = playerPosition.x;
      skyFog.position.z = playerPosition.z;
    });
  }
  
  public dispose(): void {
    // Dispose atmospheric fog layers
    this.fogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogLayers = [];
    
    // Dispose fog wall layers
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogWallLayers = [];
    
    // Dispose sky fog layers
    this.skyFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.skyFogLayers = [];
    
    // Dispose ground fog layers
    this.groundFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.groundFogLayers = [];
    
    // Dispose ground fog material
    if (this.groundFogMaterial) {
      this.groundFogMaterial.dispose();
    }
    
    // Dispose fog wall material
    if (this.fogWallMaterial) {
      this.fogWallMaterial.dispose();
    }
    
    // Dispose fog material
    if (this.fogMaterial) {
      this.fogMaterial.dispose();
    }
    
    // Dispose sky fog material
    if (this.skyFogMaterial) {
      this.skyFogMaterial.dispose();
    }
    
    console.log("Enhanced VolumetricFogSystem with complete horizon coverage disposed");
  }
}
