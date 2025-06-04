
import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogWallLayers: THREE.Mesh[] = [];
  private fogWallMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createFogWallMaterial();
    this.createFogWallLayers();
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

  private createFogWallLayers(): void {
    // Create comprehensive fog wall coverage with proper distances
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
        
        // Distance-specific wall density
        const wallDensity = 0.95 + (distanceIndex * 0.01);
        (wall.material as THREE.ShaderMaterial).uniforms.fogWallDensity.value = wallDensity;
        
        this.fogWallLayers.push(wall);
        this.scene.add(wall);
      }
    });
    
    console.log(`Created ${this.fogWallLayers.length} fog wall layers for complete horizon blocking`);
  }
  
  public update(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    // Update fog wall layers
    this.fogWallLayers.forEach(layer => {
      const material = layer.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
      }
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
  }
  
  public dispose(): void {
    // Dispose fog wall layers
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogWallLayers = [];
    
    if (this.fogWallMaterial) {
      this.fogWallMaterial.dispose();
    }
    
    console.log("VolumetricFogSystem with fog wall effect disposed");
  }
}
