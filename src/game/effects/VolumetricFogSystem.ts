
import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogLayers: THREE.Mesh[] = [];
  private fogWallLayers: THREE.Mesh[] = [];
  private skyFogLayers: THREE.Mesh[] = [];
  private fogMaterial: THREE.ShaderMaterial;
  private fogWallMaterial: THREE.ShaderMaterial;
  private skyFogMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createVolumetricFogMaterial();
    this.createFogWallMaterial();
    this.createSkyFogMaterial();
    this.createFogLayers();
    this.createFogWallLayers();
    this.createSkyFogLayers();
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
        fogColor: { value: new THREE.Color(0xE0E0E0) },
        dayFogColor: { value: new THREE.Color(0xB0E0E6) },
        nightFogColor: { value: new THREE.Color(0x191970) },
        sunriseFogColor: { value: new THREE.Color(0xFFB366) },
        sunsetFogColor: { value: new THREE.Color(0xFF8C42) },
        fogWallDensity: { value: 0.98 },
        fogWallHeight: { value: 120.0 },
        horizonBlur: { value: 1.0 },
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.008 },
        windDirection: { value: new THREE.Vector2(1.0, 0.3) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        varying float vHeightFactor;
        
        uniform vec3 playerPosition;
        uniform float fogWallHeight;
        
        void main() {
          vPosition = position;
          vUv = uv;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
          // Calculate height factor for vertical fog wall gradient
          vHeightFactor = clamp(worldPosition.y / fogWallHeight, 0.0, 1.0);
          
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
        uniform float fogWallDensity;
        uniform float fogWallHeight;
        uniform float horizonBlur;
        uniform vec3 playerPosition;
        uniform float noiseScale;
        uniform vec2 windDirection;
        
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        varying float vHeightFactor;
        
        // Simple noise function for fog wall effect
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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
          
          // Create subtle noise for wall texture
          vec2 noisePos = vWorldPosition.xz * noiseScale;
          noisePos += windDirection * time * 0.03;
          
          float fogNoise = noise(noisePos);
          fogNoise += noise(noisePos * 2.0) * 0.5;
          fogNoise += noise(noisePos * 4.0) * 0.25;
          fogNoise /= 1.75;
          
          // Exponential fog calculation - starts at 40 units, complete at 80 units
          float fogStart = 40.0;
          float fogRange = 40.0;
          float distanceRatio = max(0.0, (vDistance - fogStart) / fogRange);
          float exponentialFog = 1.0 - exp(-distanceRatio * distanceRatio * 4.0);
          
          // Height-based gradient (thicker at bottom, fading up)
          float heightGradient = 1.0 - pow(vHeightFactor, 0.4);
          
          // Combine all effects for final wall density
          float wallDensity = fogWallDensity * exponentialFog * heightGradient;
          wallDensity *= (0.95 + fogNoise * 0.1);
          
          // Horizon blur effect - complete opacity at far distances
          float horizonEffect = smoothstep(60.0, 80.0, vDistance);
          wallDensity = max(wallDensity, horizonEffect * 0.99);
          
          // Time-based wall density adjustments
          float timeWallMultiplier = 1.0;
          if (timeOfDay >= 0.2 && timeOfDay <= 0.3 || timeOfDay >= 0.7 && timeOfDay <= 0.8) {
            timeWallMultiplier = 1.2;
          } else if (timeOfDay >= 0.8 || timeOfDay <= 0.2) {
            timeWallMultiplier = 1.1;
          }
          wallDensity *= timeWallMultiplier;
          
          // Ensure complete horizon blocking
          wallDensity = clamp(wallDensity, 0.0, 0.99);
          
          gl_FragColor = vec4(dynamicFogColor, wallDensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
  }

  private createSkyFogMaterial(): void {
    this.skyFogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        dayFogColor: { value: new THREE.Color(0xB0E0E6) },
        nightFogColor: { value: new THREE.Color(0x191970) },
        sunriseFogColor: { value: new THREE.Color(0xFFB366) },
        sunsetFogColor: { value: new THREE.Color(0xFF8C42) },
        skyFogDensity: { value: 0.95 },
        playerPosition: { value: new THREE.Vector3() },
        noiseScale: { value: 0.005 },
        windDirection: { value: new THREE.Vector2(1.0, 0.2) }
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
        uniform vec3 dayFogColor;
        uniform vec3 nightFogColor;
        uniform vec3 sunriseFogColor;
        uniform vec3 sunsetFogColor;
        uniform float skyFogDensity;
        uniform vec3 playerPosition;
        uniform float noiseScale;
        uniform vec2 windDirection;
        
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
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
          
          // Sky-level fog - covers upper horizon
          vec2 noisePos = vWorldPosition.xz * noiseScale;
          noisePos += windDirection * time * 0.02;
          
          float skyNoise = noise(noisePos);
          skyNoise += noise(noisePos * 2.0) * 0.5;
          skyNoise /= 1.5;
          
          // Exponential fog for sky level - starts at 50 units
          float skyFogStart = 50.0;
          float skyFogRange = 30.0;
          float skyDistanceRatio = max(0.0, (vDistance - skyFogStart) / skyFogRange);
          float skyExponentialFog = 1.0 - exp(-skyDistanceRatio * skyDistanceRatio * 5.0);
          
          float skyDensity = skyFogDensity * skyExponentialFog;
          skyDensity *= (0.92 + skyNoise * 0.15);
          skyDensity = clamp(skyDensity, 0.0, 0.98);
          
          gl_FragColor = vec4(dynamicFogColor, skyDensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
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
    // Phase 1 & 2: Create comprehensive fog wall coverage with proper distances
    const wallDistances = [40, 50, 65, 80]; // Closer start, gradual buildup
    const wallHeights = [80, 100, 120, 120]; // Higher walls for complete coverage
    const wallWidths = [400, 500, 600, 800]; // Wider for no gaps
    
    wallDistances.forEach((distance, distanceIndex) => {
      const wallHeight = wallHeights[distanceIndex];
      const wallWidth = wallWidths[distanceIndex];
      
      // Create 12 walls in a dodecagon for better coverage
      for (let i = 0; i < 12; i++) {
        const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight, 20, 12);
        const wall = new THREE.Mesh(wallGeometry, this.fogWallMaterial.clone());
        
        const angle = (i / 12) * Math.PI * 2;
        wall.position.x = Math.cos(angle) * distance;
        wall.position.z = Math.sin(angle) * distance;
        wall.position.y = wallHeight / 2;
        wall.rotation.y = angle + Math.PI / 2;
        
        // Distance-specific wall density - Phase 4
        const wallDensity = 0.95 + (distanceIndex * 0.01);
        (wall.material as THREE.ShaderMaterial).uniforms.fogWallDensity.value = wallDensity;
        
        this.fogWallLayers.push(wall);
        this.scene.add(wall);
      }
    });
    
    console.log(`Created ${this.fogWallLayers.length} fog wall layers for complete horizon blocking`);
  }

  private createSkyFogLayers(): void {
    // Phase 3: Create sky-level fog integration
    const skyDistances = [60, 80, 100];
    const skyHeights = [150, 180, 200];
    const skyWidths = [600, 800, 1000];
    
    skyDistances.forEach((distance, index) => {
      const skyHeight = skyHeights[index];
      const skyWidth = skyWidths[index];
      
      // Create overhead fog planes (8 panels for coverage)
      for (let i = 0; i < 8; i++) {
        const skyGeometry = new THREE.PlaneGeometry(skyWidth, skyHeight, 16, 8);
        const skyFog = new THREE.Mesh(skyGeometry, this.skyFogMaterial.clone());
        
        const angle = (i / 8) * Math.PI * 2;
        skyFog.position.x = Math.cos(angle) * distance;
        skyFog.position.z = Math.sin(angle) * distance;
        skyFog.position.y = 100 + index * 20; // High in the sky
        skyFog.rotation.y = angle + Math.PI / 2;
        
        // Distance-specific sky density
        const skyDensity = 0.92 + (index * 0.02);
        (skyFog.material as THREE.ShaderMaterial).uniforms.skyFogDensity.value = skyDensity;
        
        this.skyFogLayers.push(skyFog);
        this.scene.add(skyFog);
      }
    });
    
    console.log(`Created ${this.skyFogLayers.length} sky fog layers for upper horizon coverage`);
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
    this.fogWallLayers.forEach(layer => {
      const material = layer.material as THREE.ShaderMaterial;
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
    
    // Update fog layer positions to follow player (with lag for depth)
    this.fogLayers.slice(0, 3).forEach((layer, index) => {
      const lagFactor = 0.8 - index * 0.1;
      layer.position.x = THREE.MathUtils.lerp(layer.position.x, playerPosition.x, lagFactor * deltaTime);
      layer.position.z = THREE.MathUtils.lerp(layer.position.z, playerPosition.z, lagFactor * deltaTime);
    });
    
    // Update fog wall positions to maintain proper distance from player
    this.fogWallLayers.forEach((wall, index) => {
      const wallGroup = Math.floor(index / 12);
      const wallInGroup = index % 12;
      const angle = (wallInGroup / 12) * Math.PI * 2;
      const distance = [40, 50, 65, 80][wallGroup];
      
      wall.position.x = playerPosition.x + Math.cos(angle) * distance;
      wall.position.z = playerPosition.z + Math.sin(angle) * distance;
    });
    
    // Update sky fog positions
    this.skyFogLayers.forEach((skyFog, index) => {
      const skyGroup = Math.floor(index / 8);
      const skyInGroup = index % 8;
      const angle = (skyInGroup / 8) * Math.PI * 2;
      const distance = [60, 80, 100][skyGroup];
      
      skyFog.position.x = playerPosition.x + Math.cos(angle) * distance;
      skyFog.position.z = playerPosition.z + Math.sin(angle) * distance;
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
    
    if (this.fogMaterial) {
      this.fogMaterial.dispose();
    }
    
    if (this.fogWallMaterial) {
      this.fogWallMaterial.dispose();
    }
    
    if (this.skyFogMaterial) {
      this.skyFogMaterial.dispose();
    }
    
    console.log("VolumetricFogSystem with complete horizon blocking effect disposed");
  }
}
