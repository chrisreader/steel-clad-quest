import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogLayers: THREE.Mesh[] = [];
  private fogWallLayers: THREE.Mesh[] = [];
  private fogMaterial: THREE.ShaderMaterial;
  private fogWallMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createVolumetricFogMaterial();
    this.createFogWallMaterial();
    this.createFogLayers();
    this.createRealisticFogWalls();
  }
  
  private getDarknessFactor(timeOfDay: number): number {
    if (timeOfDay >= 0.35 && timeOfDay <= 0.65) {
      return 0.0; // Full day
    } else if (timeOfDay >= 0.25 && timeOfDay < 0.35) {
      const factor = (timeOfDay - 0.25) / 0.1;
      return 1.0 - this.smoothStep(0.0, 1.0, factor);
    } else if (timeOfDay > 0.65 && timeOfDay <= 0.75) {
      const factor = (timeOfDay - 0.65) / 0.1;
      return this.smoothStep(0.0, 1.0, factor);
    } else {
      return 1.0; // Full night
    }
  }
  
  private getTransitionFactor(timeOfDay: number): number {
    if ((timeOfDay >= 0.2 && timeOfDay <= 0.4) || (timeOfDay >= 0.6 && timeOfDay <= 0.8)) {
      if (timeOfDay >= 0.2 && timeOfDay <= 0.4) {
        const center = 0.3;
        const distance = Math.abs(timeOfDay - center);
        return 1.0 - (distance / 0.1);
      } else {
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
    const baseMultiplier = 1.0 + (darknessFactor * 1.8);
    const transitionBoost = transitionFactor * 0.3;
    return baseMultiplier + transitionBoost;
  }
  
  private getFogMaxDistance(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 300 - (darknessFactor * 100);
  }
  
  private getFogMaxOpacity(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 0.35 + (darknessFactor * 0.3);
  }
  
  private getBlendingAlpha(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    const transitionFactor = this.getTransitionFactor(timeOfDay);
    return darknessFactor * (1.0 - transitionFactor * 0.3);
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
        fogDensityMultiplier: { value: 1.0 },
        maxFogDistance: { value: 300.0 },
        maxFogOpacity: { value: 0.25 },
        blendingAlpha: { value: 0.0 },
        fogDensity: { value: 0.08 },
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
          } else if (time > 0.35 && time < 0.65) {
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
          vec3 dynamicFogColor = getFogColorForTime(timeOfDay);
          
          vec3 noisePos = vWorldPosition * noiseScale;
          noisePos.xy += windDirection * time * 0.1;
          
          float noise1 = snoise(noisePos);
          float noise2 = snoise(noisePos * 2.0 + vec3(time * 0.05));
          float noise3 = snoise(noisePos * 4.0 - vec3(time * 0.03));
          
          float combinedNoise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
          
          float heightFactor = 1.0 - abs(vPosition.y) / layerHeight;
          heightFactor = smoothstep(0.0, 1.0, heightFactor);
          
          float distanceFactor = 1.0 - smoothstep(15.0, maxFogDistance, vDistance);
          
          float density = fogDensity * heightFactor * distanceFactor * fogDensityMultiplier;
          density *= (0.8 + combinedNoise * 0.4);
          density = clamp(density, 0.0, maxFogOpacity);
          
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

  private createFogLayers(): void {
    const fogConfigs = [
      { size: 180, y: 1, density: 0.2 },
      { size: 140, y: 4, density: 0.15 },
      { size: 100, y: 8, density: 0.1 }
    ];
    
    fogConfigs.forEach((config, index) => {
      const geometry = new THREE.PlaneGeometry(config.size, config.size, 24, 24);
      
      const positionAttribute = geometry.getAttribute('position');
      const positions = positionAttribute.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += (Math.random() - 0.5) * 1.5;
      }
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
      
      const fogLayer = new THREE.Mesh(geometry, this.fogMaterial.clone());
      fogLayer.position.y = config.y;
      fogLayer.rotation.x = -Math.PI / 2;
      
      (fogLayer.material as THREE.ShaderMaterial).uniforms.fogDensity.value = config.density;
      
      this.fogLayers.push(fogLayer);
      this.scene.add(fogLayer);
    });
    
    console.log(`Created ${this.fogLayers.length} realistic low-lying fog layers`);
  }

  private createRealisticFogWalls(): void {
    const layerConfigs = [
      { distances: [25, 45, 70, 100, 140, 190], heights: [15, 18, 22, 25, 28, 30] },
      { distances: [35, 60, 90, 130, 180, 240], heights: [12, 15, 18, 20, 22, 25] },
      { distances: [50, 80, 120, 170, 230, 300], heights: [10, 12, 15, 18, 20, 22] }
    ];
    
    layerConfigs.forEach((layerConfig, layerIndex) => {
      layerConfig.distances.forEach((distance, distanceIndex) => {
        const wallHeight = layerConfig.heights[distanceIndex];
        const wallWidth = 400 + distanceIndex * 100;
        
        for (let i = 0; i < 20; i++) {
          const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight, 20, 10);
          
          const positionAttribute = wallGeometry.getAttribute('position');
          const positions = positionAttribute.array as Float32Array;
          
          for (let j = 0; j < positions.length; j += 3) {
            const x = positions[j];
            const y = positions[j + 1];
            
            const displacement = Math.sin(x * 0.02) * Math.cos(y * 0.03) * 1.5;
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
          wall.position.y = wallHeight / 2 - 2;
          wall.rotation.y = angle + Math.PI / 2;
          
          const wallDensity = 0.02 + (distanceIndex * 0.008) + (layerIndex * 0.005);
          const material = wall.material as THREE.ShaderMaterial;
          material.uniforms.fogWallDensity.value = wallDensity;
          material.uniforms.layerDepth.value = layerIndex * 0.3;
          material.uniforms.fogWallHeight.value = wallHeight;
          
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

  public update(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    const transitionFactor = this.getTransitionFactor(timeOfDay);
    const densityMultiplier = this.getFogDensityMultiplier(timeOfDay);
    const maxDistance = this.getFogMaxDistance(timeOfDay);
    const maxOpacity = this.getFogMaxOpacity(timeOfDay);
    const blendingAlpha = this.getBlendingAlpha(timeOfDay);
    
    this.fogLayers.forEach(layer => {
      const material = layer.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.fogDensityMultiplier.value = densityMultiplier * 0.8;
        material.uniforms.maxFogDistance.value = maxDistance;
        material.uniforms.maxFogOpacity.value = maxOpacity * 0.7;
        material.uniforms.blendingAlpha.value = blendingAlpha;
      }
    });
    
    this.fogWallLayers.forEach((wall, index) => {
      const material = wall.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.fogWallDensityMultiplier.value = densityMultiplier * 0.6;
        material.uniforms.maxWallDistance.value = maxDistance;
        material.uniforms.maxWallOpacity.value = maxOpacity * 0.5;
        material.uniforms.blendingAlpha.value = blendingAlpha;
      }
      
      const wallData = wall as any;
      const baseDistance = wallData.baseDistance;
      const wallIndex = wallData.wallIndex;
      
      const angle = (wallIndex / 20) * Math.PI * 2;
      wall.position.x = playerPosition.x + Math.cos(angle) * baseDistance;
      wall.position.z = playerPosition.z + Math.sin(angle) * baseDistance;
    });
    
    this.fogLayers.forEach((layer, index) => {
      const lagFactor = 0.7 - index * 0.1;
      layer.position.x = THREE.MathUtils.lerp(layer.position.x, playerPosition.x, lagFactor * deltaTime);
      layer.position.z = THREE.MathUtils.lerp(layer.position.z, playerPosition.z, lagFactor * deltaTime);
    });
  }
  
  public dispose(): void {
    this.fogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogLayers = [];
    
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogWallLayers = [];
    
    if (this.fogWallMaterial) this.fogWallMaterial.dispose();
    if (this.fogMaterial) this.fogMaterial.dispose();
    
    console.log("VolumetricFogSystem disposed - removed vertical light beams while preserving fog walls");
  }
}
