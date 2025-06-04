import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogLayers: THREE.Mesh[] = [];
  private fogWallLayers: THREE.Mesh[] = [];
  private darkPeriodFogWalls: THREE.Mesh[] = [];
  private skyFogLayers: THREE.Mesh[] = [];
  private groundFogLayers: THREE.Mesh[] = [];
  private fogMaterial: THREE.ShaderMaterial;
  private fogWallMaterial: THREE.ShaderMaterial;
  private skyFogMaterial: THREE.ShaderMaterial;
  private groundFogMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  // Enhanced color palette for smooth transitions
  private readonly COLOR_PALETTE = [
    { time: 0.0, color: new THREE.Color(0x191970) },    // Midnight - dark blue
    { time: 0.1, color: new THREE.Color(0x1F1F80) },    // Late night - slightly lighter
    { time: 0.15, color: new THREE.Color(0x2F2F70) },   // Pre-dawn - lighter dark blue
    { time: 0.2, color: new THREE.Color(0x4A4A90) },    // Early dawn - purple-blue
    { time: 0.22, color: new THREE.Color(0x6B4A90) },   // Dawn purple transition
    { time: 0.25, color: new THREE.Color(0xFF6B35) },   // Sunrise start - deep orange
    { time: 0.28, color: new THREE.Color(0xFF8B55) },   // Warm sunrise
    { time: 0.3, color: new THREE.Color(0xFFB366) },    // Sunrise peak - warm orange
    { time: 0.33, color: new THREE.Color(0xFFD088) },   // Sunrise fading
    { time: 0.35, color: new THREE.Color(0xC8D8E8) },   // Morning - soft blue-orange
    { time: 0.4, color: new THREE.Color(0xB0E0E6) },    // Day transition - atmospheric blue
    { time: 0.5, color: new THREE.Color(0xB0E0E6) },    // Noon - clear blue
    { time: 0.6, color: new THREE.Color(0xA8D0DD) },    // Afternoon - slightly warmer blue
    { time: 0.65, color: new THREE.Color(0xC8C8E8) },   // Pre-sunset - light blue
    { time: 0.67, color: new THREE.Color(0xE8C8C8) },   // Warm blue transition
    { time: 0.7, color: new THREE.Color(0xFF8C42) },    // Sunset start - warm orange
    { time: 0.72, color: new THREE.Color(0xFF7B32) },   // Deep sunset
    { time: 0.75, color: new THREE.Color(0xFF6B42) },   // Sunset peak - deep orange/red
    { time: 0.78, color: new THREE.Color(0xCC5A66) },   // Sunset red transition
    { time: 0.8, color: new THREE.Color(0x8B5A96) },    // Dusk - purple
    { time: 0.82, color: new THREE.Color(0x7A5A96) },   // Deeper dusk
    { time: 0.85, color: new THREE.Color(0x5A5A96) },   // Late dusk - dark purple
    { time: 0.9, color: new THREE.Color(0x2F2F70) },    // Night transition - dark blue-purple
    { time: 0.95, color: new THREE.Color(0x1F1F80) },   // Early night
    { time: 1.0, color: new THREE.Color(0x191970) }     // Night - dark blue (wraps to midnight)
  ];
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createVolumetricFogMaterial();
    this.createFogWallMaterial();
    this.createSkyFogMaterial();
    this.createGroundFogMaterial();
    this.createFogLayers();
    this.createFogWallLayers();
    this.createDarkPeriodFogWalls();
    this.createSkyFogLayers();
    this.createGroundFogLayers();
  }
  
  // Enhanced smooth color blending
  public getBlendedFogColor(timeOfDay: number): THREE.Color {
    // Normalize time to 0-1 range
    const normalizedTime = ((timeOfDay % 1.0) + 1.0) % 1.0;
    
    // Find the two closest color stops
    let prevStop = this.COLOR_PALETTE[this.COLOR_PALETTE.length - 1];
    let nextStop = this.COLOR_PALETTE[0];
    
    for (let i = 0; i < this.COLOR_PALETTE.length; i++) {
      if (normalizedTime <= this.COLOR_PALETTE[i].time) {
        nextStop = this.COLOR_PALETTE[i];
        prevStop = i > 0 ? this.COLOR_PALETTE[i - 1] : this.COLOR_PALETTE[this.COLOR_PALETTE.length - 1];
        break;
      }
      if (i === this.COLOR_PALETTE.length - 1) {
        prevStop = this.COLOR_PALETTE[i];
        nextStop = this.COLOR_PALETTE[0];
      }
    }
    
    // Calculate interpolation factor with smooth easing
    let timeDiff = nextStop.time - prevStop.time;
    if (timeDiff <= 0) timeDiff += 1.0; // Handle wrap-around
    
    let timeProgress = normalizedTime - prevStop.time;
    if (timeProgress < 0) timeProgress += 1.0; // Handle wrap-around
    
    const factor = this.smoothStep(0, 1, timeProgress / timeDiff);
    
    // Interpolate between colors using smooth blending
    const blendedColor = new THREE.Color();
    blendedColor.lerpColors(prevStop.color, nextStop.color, factor);
    
    return blendedColor;
  }
  
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // Restored dynamic parameter methods
  private getDarknessFactor(timeOfDay: number): number {
    const normalizedTime = ((timeOfDay % 1.0) + 1.0) % 1.0;
    
    // Define dark periods with smooth transitions
    if (normalizedTime >= 0.0 && normalizedTime <= 0.2) {
      // Night to early dawn - high darkness
      return this.smoothStep(0.8, 1.0, (0.2 - normalizedTime) / 0.2);
    } else if (normalizedTime >= 0.2 && normalizedTime <= 0.4) {
      // Dawn to morning - decreasing darkness
      return this.smoothStep(0.0, 0.8, (0.4 - normalizedTime) / 0.2);
    } else if (normalizedTime >= 0.4 && normalizedTime <= 0.65) {
      // Day - minimal darkness
      return 0.0;
    } else if (normalizedTime >= 0.65 && normalizedTime <= 0.85) {
      // Sunset to dusk - increasing darkness
      return this.smoothStep(0.0, 0.8, (normalizedTime - 0.65) / 0.2);
    } else {
      // Night - high darkness
      return this.smoothStep(0.8, 1.0, (normalizedTime - 0.85) / 0.15);
    }
  }

  private getFogDensityMultiplier(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    // Smooth interpolation between day (1.0x) and night (2.8x) density
    return 1.0 + (darknessFactor * 1.8);
  }

  private getFogMaxDistance(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    // Smooth interpolation between day (300) and night (180) distance
    return 300 - (darknessFactor * 120);
  }

  private getFogMaxOpacity(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    // Smooth interpolation between day (0.35) and night (0.55) opacity
    return 0.35 + (darknessFactor * 0.2);
  }

  private getBlendingAlpha(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    // Smooth blending alpha for transition effects
    return darknessFactor * 0.3;
  }

  private getSkyDensityMultiplier(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 0.5 + (darknessFactor * 1.0);
  }

  private getGroundDensityMultiplier(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 0.6 + (darknessFactor * 1.2);
  }

  private getFogWallDensityMultiplier(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 1.0 + (darknessFactor * 1.5);
  }

  private updateDarkPeriodFogWalls(timeOfDay: number): void {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    
    this.darkPeriodFogWalls.forEach(wall => {
      if (wall.material instanceof THREE.ShaderMaterial) {
        // Smooth fade in/out for dark period walls
        wall.visible = darknessFactor > 0.1;
        if (wall.material.uniforms.fogWallDensityMultiplier) {
          wall.material.uniforms.fogWallDensityMultiplier.value = darknessFactor * 1.8;
        }
      }
    });
  }
  
  private createVolumetricFogMaterial(): void {
    this.fogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        blendedFogColor: { value: new THREE.Color(0xB0E0E6) },
        fogDensityMultiplier: { value: 1.0 },
        maxFogDistance: { value: 300.0 },
        maxFogOpacity: { value: 0.35 },
        blendingAlpha: { value: 0.0 },
        fogDensity: { value: 0.12 },
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
        uniform vec3 blendedFogColor;
        uniform float fogDensityMultiplier;
        uniform float maxFogDistance;
        uniform float maxFogOpacity;
        uniform float blendingAlpha;
        uniform float fogDensity;
        uniform float layerHeight;
        uniform vec3 playerPosition;
        uniform float noiseScale;
        uniform vec2 windDirection;
        
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistance;
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec3 permute(vec3 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        
        void main() {
          vec3 dynamicFogColor = blendedFogColor;
          
          vec2 noisePos = vWorldPosition.xz * noiseScale + windDirection * time * 0.1;
          float noise = snoise(noisePos) * 0.5 + 0.5;
          
          float heightFactor = exp(-abs(vWorldPosition.y - layerHeight) * 2.0);
          float distanceFactor = smoothstep(50.0, maxFogDistance, vDistance);
          
          float density = fogDensity * heightFactor * distanceFactor * noise * fogDensityMultiplier;
          density = min(density, maxFogOpacity);
          
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
        blendedFogColor: { value: new THREE.Color(0xF5F5F5) },
        fogWallDensityMultiplier: { value: 1.0 },
        maxWallDistance: { value: 300.0 },
        maxWallOpacity: { value: 0.35 },
        blendingAlpha: { value: 0.0 },
        fogWallDensity: { value: 0.08 },
        fogWallHeight: { value: 80.0 },
        horizonBlur: { value: 0.6 },
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
        uniform float layerDepth;
        
        void main() {
          vPosition = position;
          vUv = uv;
          vLocalPosition = position;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
          vHeightFactor = clamp((worldPosition.y + layerDepth) / fogWallHeight, 0.0, 1.0);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float timeOfDay;
        uniform vec3 blendedFogColor;
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
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec3 permute(vec3 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        
        void main() {
          vec3 atmosphericColor = blendedFogColor;
          
          vec2 noisePos = vWorldPosition.xz * noiseScale + windDirection * time * 0.05;
          float volumetricNoise = snoise(noisePos) * 0.3 + 0.7;
          
          float heightAttenuation = pow(vHeightFactor, 0.8);
          float distanceAttenuation = smoothstep(100.0, maxWallDistance, vDistance);
          float horizonEffect = pow(1.0 - abs(vLocalPosition.y / fogWallHeight), horizonBlur);
          
          float baseDensity = fogWallDensity * heightAttenuation * distanceAttenuation * volumetricNoise * horizonEffect * fogWallDensityMultiplier;
          baseDensity = min(baseDensity, maxWallOpacity);
          
          gl_FragColor = vec4(atmosphericColor, baseDensity);
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
        blendedFogColor: { value: new THREE.Color(0xF8F8F8) },
        skyFogDensity: { value: 0.12 },
        skyDensityMultiplier: { value: 1.0 },
        maxSkyDistance: { value: 200.0 },
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
        uniform vec3 blendedFogColor;
        uniform float skyFogDensity;
        uniform float skyDensityMultiplier;
        uniform float maxSkyDistance;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        
        void main() {
          vec3 dynamicFogColor = blendedFogColor;
          
          float distanceFactor = smoothstep(100.0, maxSkyDistance, vDistance);
          float density = skyFogDensity * distanceFactor * skyDensityMultiplier * 0.5;
          
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
        blendedFogColor: { value: new THREE.Color(0xF0F0F0) },
        groundFogDensity: { value: 0.15 },
        groundDensityMultiplier: { value: 1.0 },
        maxGroundDistance: { value: 150.0 },
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
        uniform vec3 blendedFogColor;
        uniform float groundFogDensity;
        uniform float groundDensityMultiplier;
        uniform float maxGroundDistance;
        
        varying vec3 vWorldPosition;
        varying float vDistance;
        
        void main() {
          vec3 dynamicFogColor = blendedFogColor;
          
          float heightFactor = exp(-vWorldPosition.y * 0.5);
          float distanceFactor = smoothstep(50.0, maxGroundDistance, vDistance);
          float density = groundFogDensity * heightFactor * distanceFactor * groundDensityMultiplier * 0.6;
          
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
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.PlaneGeometry(800, 800, 32, 32);
      const mesh = new THREE.Mesh(geometry, this.fogMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = i * 15 + 10;
      mesh.renderOrder = 1000 + i;
      this.scene.add(mesh);
      this.fogLayers.push(mesh);
    }
  }

  private createFogWallLayers(): void {
    const positions = [
      { x: 400, z: 0, rotation: 0 },
      { x: -400, z: 0, rotation: Math.PI },
      { x: 0, z: 400, rotation: -Math.PI / 2 },
      { x: 0, z: -400, rotation: Math.PI / 2 }
    ];

    positions.forEach((pos, index) => {
      for (let layer = 0; layer < 2; layer++) {
        const geometry = new THREE.PlaneGeometry(800, 100, 32, 16);
        const material = this.fogWallMaterial.clone();
        material.uniforms.layerDepth = { value: layer * 20 };
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, 40 + layer * 10, pos.z);
        mesh.rotation.y = pos.rotation;
        mesh.renderOrder = 1100 + index * 10 + layer;
        this.scene.add(mesh);
        this.fogWallLayers.push(mesh);
      }
    });
  }

  private createDarkPeriodFogWalls(): void {
    const positions = [
      { x: 300, z: 300, rotation: -Math.PI / 4 },
      { x: -300, z: 300, rotation: -3 * Math.PI / 4 },
      { x: -300, z: -300, rotation: 3 * Math.PI / 4 },
      { x: 300, z: -300, rotation: Math.PI / 4 }
    ];

    positions.forEach((pos, index) => {
      const geometry = new THREE.PlaneGeometry(400, 80, 16, 8);
      const material = this.fogWallMaterial.clone();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, 30, pos.z);
      mesh.rotation.y = pos.rotation;
      mesh.renderOrder = 1200 + index;
      this.scene.add(mesh);
      this.darkPeriodFogWalls.push(mesh);
    });
  }

  private createSkyFogLayers(): void {
    for (let i = 0; i < 2; i++) {
      const geometry = new THREE.SphereGeometry(400 + i * 100, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, this.skyFogMaterial);
      mesh.position.y = 100 + i * 50;
      mesh.renderOrder = 900 + i;
      this.scene.add(mesh);
      this.skyFogLayers.push(mesh);
    }
  }

  private createGroundFogLayers(): void {
    for (let i = 0; i < 2; i++) {
      const geometry = new THREE.PlaneGeometry(600 + i * 200, 600 + i * 200, 24, 24);
      const mesh = new THREE.Mesh(geometry, this.groundFogMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = i * 5 + 2;
      mesh.renderOrder = 800 + i;
      this.scene.add(mesh);
      this.groundFogLayers.push(mesh);
    }
  }

  public update(deltaTime: number, timeOfDay: number, playerPosition?: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    // Get the blended color for current time
    const blendedColor = this.getBlendedFogColor(timeOfDay);
    
    // Calculate all dynamic parameters based on time of day
    const fogDensityMultiplier = this.getFogDensityMultiplier(timeOfDay);
    const maxFogDistance = this.getFogMaxDistance(timeOfDay);
    const maxFogOpacity = this.getFogMaxOpacity(timeOfDay);
    const blendingAlpha = this.getBlendingAlpha(timeOfDay);
    const skyDensityMultiplier = this.getSkyDensityMultiplier(timeOfDay);
    const groundDensityMultiplier = this.getGroundDensityMultiplier(timeOfDay);
    const fogWallDensityMultiplier = this.getFogWallDensityMultiplier(timeOfDay);
    
    // Update main fog material
    if (this.fogMaterial?.uniforms) {
      if (this.fogMaterial.uniforms.time?.value !== undefined) this.fogMaterial.uniforms.time.value += deltaTime;
      if (this.fogMaterial.uniforms.timeOfDay?.value !== undefined) this.fogMaterial.uniforms.timeOfDay.value = timeOfDay;
      if (this.fogMaterial.uniforms.blendedFogColor?.value) this.fogMaterial.uniforms.blendedFogColor.value.copy(blendedColor);
      if (this.fogMaterial.uniforms.fogDensityMultiplier?.value !== undefined) this.fogMaterial.uniforms.fogDensityMultiplier.value = fogDensityMultiplier;
      if (this.fogMaterial.uniforms.maxFogDistance?.value !== undefined) this.fogMaterial.uniforms.maxFogDistance.value = maxFogDistance;
      if (this.fogMaterial.uniforms.maxFogOpacity?.value !== undefined) this.fogMaterial.uniforms.maxFogOpacity.value = maxFogOpacity;
      if (this.fogMaterial.uniforms.blendingAlpha?.value !== undefined) this.fogMaterial.uniforms.blendingAlpha.value = blendingAlpha;
      
      if (playerPosition && this.fogMaterial.uniforms.playerPosition?.value) {
        this.fogMaterial.uniforms.playerPosition.value.copy(playerPosition);
      }
    }
    
    // Update sky fog material
    if (this.skyFogMaterial?.uniforms) {
      if (this.skyFogMaterial.uniforms.time?.value !== undefined) this.skyFogMaterial.uniforms.time.value += deltaTime;
      if (this.skyFogMaterial.uniforms.timeOfDay?.value !== undefined) this.skyFogMaterial.uniforms.timeOfDay.value = timeOfDay;
      if (this.skyFogMaterial.uniforms.blendedFogColor?.value) this.skyFogMaterial.uniforms.blendedFogColor.value.copy(blendedColor);
      if (this.skyFogMaterial.uniforms.skyDensityMultiplier?.value !== undefined) this.skyFogMaterial.uniforms.skyDensityMultiplier.value = skyDensityMultiplier;
      
      if (playerPosition && this.skyFogMaterial.uniforms.playerPosition?.value) {
        this.skyFogMaterial.uniforms.playerPosition.value.copy(playerPosition);
      }
    }
    
    // Update ground fog material
    if (this.groundFogMaterial?.uniforms) {
      if (this.groundFogMaterial.uniforms.time?.value !== undefined) this.groundFogMaterial.uniforms.time.value += deltaTime;
      if (this.groundFogMaterial.uniforms.timeOfDay?.value !== undefined) this.groundFogMaterial.uniforms.timeOfDay.value = timeOfDay;
      if (this.groundFogMaterial.uniforms.blendedFogColor?.value) this.groundFogMaterial.uniforms.blendedFogColor.value.copy(blendedColor);
      if (this.groundFogMaterial.uniforms.groundDensityMultiplier?.value !== undefined) this.groundFogMaterial.uniforms.groundDensityMultiplier.value = groundDensityMultiplier;
      
      if (playerPosition && this.groundFogMaterial.uniforms.playerPosition?.value) {
        this.groundFogMaterial.uniforms.playerPosition.value.copy(playerPosition);
      }
    }
    
    // Update fog wall layers (including cloned materials)
    this.fogWallLayers.forEach(wall => {
      if (wall.material instanceof THREE.ShaderMaterial && wall.material.uniforms) {
        if (wall.material.uniforms.time?.value !== undefined) wall.material.uniforms.time.value += deltaTime;
        if (wall.material.uniforms.timeOfDay?.value !== undefined) wall.material.uniforms.timeOfDay.value = timeOfDay;
        if (wall.material.uniforms.blendedFogColor?.value) wall.material.uniforms.blendedFogColor.value.copy(blendedColor);
        if (wall.material.uniforms.fogWallDensityMultiplier?.value !== undefined) wall.material.uniforms.fogWallDensityMultiplier.value = fogWallDensityMultiplier;
        if (wall.material.uniforms.maxWallDistance?.value !== undefined) wall.material.uniforms.maxWallDistance.value = maxFogDistance;
        if (wall.material.uniforms.maxWallOpacity?.value !== undefined) wall.material.uniforms.maxWallOpacity.value = maxFogOpacity;
        if (wall.material.uniforms.blendingAlpha?.value !== undefined) wall.material.uniforms.blendingAlpha.value = blendingAlpha;
        
        if (playerPosition && wall.material.uniforms.playerPosition?.value) {
          wall.material.uniforms.playerPosition.value.copy(playerPosition);
        }
      }
    });
    
    // Update dark period fog walls with special handling
    this.updateDarkPeriodFogWalls(timeOfDay);
  }

  public dispose(): void {
    this.fogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
    });
    
    this.fogWallLayers.forEach(wall => {
      this.scene.remove(wall);
      if (wall.geometry) wall.geometry.dispose();
      if (wall.material instanceof THREE.Material) wall.material.dispose();
    });
    
    this.darkPeriodFogWalls.forEach(wall => {
      this.scene.remove(wall);
      if (wall.geometry) wall.geometry.dispose();
      if (wall.material instanceof THREE.Material) wall.material.dispose();
    });
    
    this.skyFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
    });
    
    this.groundFogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
    });
    
    if (this.fogMaterial) this.fogMaterial.dispose();
    if (this.fogWallMaterial) this.fogWallMaterial.dispose();
    if (this.skyFogMaterial) this.skyFogMaterial.dispose();
    if (this.groundFogMaterial) this.groundFogMaterial.dispose();
    
    this.fogLayers = [];
    this.fogWallLayers = [];
    this.darkPeriodFogWalls = [];
    this.skyFogLayers = [];
    this.groundFogLayers = [];
  }
}
