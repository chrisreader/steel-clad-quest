import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogWallLayers: THREE.Mesh[] = [];
  private fogWallMaterial: THREE.ShaderMaterial;
  private timeOfDay: number = 0.25;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createFogWallMaterial();
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
  
  private getFogDensityMultiplier(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 1.0 + darknessFactor * 0.5;
  }
  
  private getFogMaxDistance(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 300.0 - darknessFactor * 50.0;
  }
  
  private getFogMaxOpacity(timeOfDay: number): number {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    return 0.25 + darknessFactor * 0.2;
  }
  
  private getBlendingAlpha(timeOfDay: number): number {
    return this.getDarknessFactor(timeOfDay);
  }
  
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
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
        fogWallDensityMultiplier: { value: 1.0 },
        maxWallDistance: { value: 300.0 },
        maxWallOpacity: { value: 0.25 },
        blendingAlpha: { value: 0.0 },
        fogWallDensity: { value: 0.05 },
        fogWallHeight: { value: 15.0 }, // Reduced from 25.0
        horizonBlur: { value: 0.8 },
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
          
          vec3 displacedPosition = position;
          float noiseScale = 0.02;
          float displacement = sin(position.x * noiseScale + time * 0.5) * 
                              cos(position.z * noiseScale + time * 0.3) * 
                              sin(position.y * noiseScale * 2.0 + time * 0.2);
          
          float edgeFactor = smoothstep(0.3, 1.0, abs(uv.x - 0.5) * 2.0);
          displacedPosition += normal * displacement * 2.0 * edgeFactor;
          
          vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = distance(worldPosition.xyz, playerPosition);
          
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
          
          vec3 noisePos = vWorldPosition * noiseScale;
          noisePos += vec3(windDirection * time * 0.02, time * 0.01);
          
          float noise1 = snoise3D(noisePos) * 0.5 + 0.5;
          float noise2 = snoise3D(noisePos * 2.1 + vec3(1.7)) * 0.25 + 0.25;
          float noise3 = snoise3D(noisePos * 4.3 + vec3(3.4)) * 0.125 + 0.125;
          float noise4 = snoise3D(noisePos * 8.7 + vec3(6.8)) * 0.0625 + 0.0625;
          
          float volumetricNoise = noise1 + noise2 + noise3 + noise4;
          float densityVariation = smoothstep(0.3, 0.8, volumetricNoise);
          
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
          
          float bottomDensityBoost = 1.0 - smoothstep(0.0, 0.2, vHeightFactor); // Reduced from 0.3
          bottomDensityBoost = pow(bottomDensityBoost, 0.3); // More aggressive falloff
          
          float darknessBoost = blendingAlpha * 0.4;
          bottomDensityBoost += darknessBoost;
          
          float skyTransition1 = smoothstep(0.4, 0.6, vHeightFactor) * (1.0 - blendingAlpha * 0.8); // Reduced from 0.6, 0.8
          float skyTransition2 = smoothstep(0.6, 0.8, vHeightFactor) * (1.0 - blendingAlpha * 0.9); // Reduced from 0.8, 0.95
          float skyTransition3 = smoothstep(0.7, 0.9, vHeightFactor) * (1.0 - blendingAlpha * 0.95); // Reduced from 0.9, 1.0
          
          float heightGradient = 1.0 - vHeightFactor;
          heightGradient += bottomDensityBoost * 0.5;
          heightGradient *= (1.0 - skyTransition1 * 0.3); // Increased fade
          heightGradient *= (1.0 - skyTransition2 * 0.5); // Increased fade
          heightGradient *= (1.0 - skyTransition3 * 0.7); // Increased fade
          
          float colorHeightDampening = 1.0;
          if (timeOfDay >= 0.65 && timeOfDay <= 0.85) { // Sunset period
            colorHeightDampening = 1.0 - smoothstep(0.0, 0.4, vHeightFactor); // Aggressive dampening
          } else if (timeOfDay >= 0.15 && timeOfDay <= 0.35) { // Sunrise period
            colorHeightDampening = 1.0 - smoothstep(0.0, 0.4, vHeightFactor); // Aggressive dampening
          }
          
          vec2 centerUV = vUv - 0.5;
          float radialDistance = length(centerUV);
          float radialFalloff = 1.0 - smoothstep(0.3, 0.5, radialDistance);
          
          float edgeSoftness = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) *
                              smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          float baseDensity = fogWallDensity * exponentialFog * heightGradient * fogWallDensityMultiplier;
          baseDensity *= densityVariation;
          baseDensity *= radialFalloff * 0.7 + 0.3;
          baseDensity *= edgeSoftness;
          baseDensity *= (0.8 + layerDepth * 0.4);
          baseDensity *= colorHeightDampening; // Apply height-based color dampening
          
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

  private createRealisticFogWalls(): void {
    const layerConfigs = [
      { distances: [25, 45, 70, 100, 140, 190], heights: [8, 10, 12, 14, 16, 18] }, // Reduced heights
      { distances: [35, 60, 90, 130, 180, 240], heights: [6, 8, 10, 12, 14, 16] }, // Reduced heights
      { distances: [50, 80, 120, 170, 230, 300], heights: [5, 6, 8, 10, 12, 14] }  // Reduced heights
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
          wall.position.y = wallHeight / 2 - 1; // Slightly lower positioning
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
    
    console.log(`Created ${this.fogWallLayers.length} realistic fog walls with reduced height for sunset colors`);
  }

  public update(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    const transitionFactor = this.getTransitionFactor(timeOfDay);
    const densityMultiplier = this.getFogDensityMultiplier(timeOfDay);
    const maxDistance = this.getFogMaxDistance(timeOfDay);
    const maxOpacity = this.getFogMaxOpacity(timeOfDay);
    const blendingAlpha = this.getBlendingAlpha(timeOfDay);
    
    this.fogWallLayers.forEach((wall, index) => {
      const material = wall.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.fogWallDensityMultiplier.value = densityMultiplier * 0.6; // Reduced for realism
        material.uniforms.maxWallDistance.value = maxDistance;
        material.uniforms.maxWallOpacity.value = maxOpacity * 0.5; // Significantly reduced
        material.uniforms.blendingAlpha.value = blendingAlpha;
      }
      
      const wallData = wall as any;
      const baseDistance = wallData.baseDistance;
      const wallIndex = wallData.wallIndex;
      
      const angle = (wallIndex / 20) * Math.PI * 2;
      wall.position.x = playerPosition.x + Math.cos(angle) * baseDistance;
      wall.position.z = playerPosition.z + Math.sin(angle) * baseDistance;
    });
  }
  
  public dispose(): void {
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    this.fogWallLayers = [];
    
    if (this.fogWallMaterial) this.fogWallMaterial.dispose();
    
    console.log("Realistic VolumetricFogSystem with atmospheric perspective disposed");
  }
}
