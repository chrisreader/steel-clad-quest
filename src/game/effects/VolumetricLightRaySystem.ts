import * as THREE from 'three';

export class VolumetricLightRaySystem {
  private scene: THREE.Scene;
  private physicsManager: any;
  private lightRays: THREE.Mesh[] = [];
  private shadowVolumes: THREE.Mesh[] = [];
  private lightRayMaterial: THREE.ShaderMaterial;
  private sunPosition: THREE.Vector3 = new THREE.Vector3();
  private moonPosition: THREE.Vector3 = new THREE.Vector3();
  private timeOfDay: number = 0.25;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private raycastHelper: THREE.Raycaster = new THREE.Raycaster();
  
  constructor(scene: THREE.Scene, physicsManager?: any) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.createLightRayMaterial();
    console.log('VolumetricLightRaySystem initialized - matching shadow system angles');
  }
  
  private createLightRayMaterial(): void {
    this.lightRayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        timeOfDay: { value: this.timeOfDay },
        lightDirection: { value: new THREE.Vector3(0, -1, 0) },
        lightPosition: { value: new THREE.Vector3(0, 100, 0) },
        playerPosition: { value: new THREE.Vector3() },
        dayLightColor: { value: new THREE.Color(0xFFFFDD) },
        sunriseLightColor: { value: new THREE.Color(0xFFB366) },
        sunsetLightColor: { value: new THREE.Color(0xFF8C42) },
        moonLightColor: { value: new THREE.Color(0xB0C4FF) },
        lightIntensity: { value: 1.0 },
        shadowFactor: { value: 1.0 },
        rayLength: { value: 200.0 },
        atmosphericDensity: { value: 0.15 },
        scatteringFactor: { value: 0.8 },
        noiseScale: { value: 0.02 },
        rayDistance: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistanceToLight;
        varying float vHeightFactor;
        varying float vRayDistance;
        
        uniform vec3 lightPosition;
        uniform vec3 playerPosition;
        uniform float rayLength;
        uniform float rayDistance;
        
        void main() {
          vPosition = position;
          vUv = uv;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          // Calculate distance from light source
          vDistanceToLight = distance(worldPosition.xyz, lightPosition);
          
          // Calculate distance along the ray from light source
          vRayDistance = rayDistance;
          
          // Calculate height factor for atmospheric perspective
          vHeightFactor = clamp((lightPosition.y - worldPosition.y) / rayLength, 0.0, 1.0);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float timeOfDay;
        uniform vec3 lightDirection;
        uniform vec3 lightPosition;
        uniform vec3 playerPosition;
        uniform vec3 dayLightColor;
        uniform vec3 sunriseLightColor;
        uniform vec3 sunsetLightColor;
        uniform vec3 moonLightColor;
        uniform float lightIntensity;
        uniform float shadowFactor;
        uniform float rayLength;
        uniform float atmosphericDensity;
        uniform float scatteringFactor;
        uniform float noiseScale;
        
        varying vec3 vWorldPosition;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vDistanceToLight;
        varying float vHeightFactor;
        varying float vRayDistance;
        
        // Simplex noise for atmospheric scattering
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
        
        vec3 getLightColorForTime(float time) {
          vec3 currentColor = dayLightColor;
          
          if (time >= 0.15 && time <= 0.35) {
            if (time <= 0.25) {
              float factor = (time - 0.15) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(moonLightColor, sunriseLightColor, factor);
            } else {
              float factor = (time - 0.25) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunriseLightColor, dayLightColor, factor);
            }
          } else if (time >= 0.35 && time <= 0.65) {
            currentColor = dayLightColor;
          } else if (time >= 0.65 && time <= 0.85) {
            if (time <= 0.75) {
              float factor = (time - 0.65) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(dayLightColor, sunsetLightColor, factor);
            } else {
              float factor = (time - 0.75) / 0.1;
              factor = factor * factor * (3.0 - 2.0 * factor);
              currentColor = mix(sunsetLightColor, moonLightColor, factor);
            }
          } else {
            currentColor = moonLightColor;
          }
          
          return currentColor;
        }
        
        void main() {
          vec3 dynamicLightColor = getLightColorForTime(timeOfDay);
          
          // Create volumetric scattering effect along the ray
          vec3 noisePos = vWorldPosition * noiseScale + vec3(time * 0.05);
          float noise1 = snoise(noisePos) * 0.5 + 0.5;
          float noise2 = snoise(noisePos * 2.1 + vec3(1.7)) * 0.25 + 0.25;
          float noise3 = snoise(noisePos * 4.3 + vec3(3.4)) * 0.125 + 0.125;
          
          float combinedNoise = noise1 + noise2 + noise3;
          
          // Distance-based attenuation along the ray
          float rayAttenuation = 1.0 - smoothstep(0.0, rayLength, vRayDistance);
          
          // Height-based atmospheric scattering (stronger closer to light source)
          float atmosphericScatter = atmosphericDensity * vHeightFactor;
          
          // Calculate ray intensity based on position along the beam
          float rayIntensity = lightIntensity * rayAttenuation * shadowFactor;
          rayIntensity *= atmosphericScatter;
          rayIntensity *= (0.7 + combinedNoise * 0.6);
          rayIntensity *= scatteringFactor;
          
          // Edge fade for natural blending
          float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) *
                          smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          rayIntensity *= edgeFade;
          rayIntensity = clamp(rayIntensity, 0.0, 0.6);
          
          gl_FragColor = vec4(dynamicLightColor, rayIntensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }
  
  private createLightRayGeometry(lightPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
    // Clear existing rays
    this.lightRays.forEach(ray => {
      this.scene.remove(ray);
      if (ray.geometry) ray.geometry.dispose();
      if (ray.material) (ray.material as THREE.Material).dispose();
    });
    this.lightRays = [];
    
    // Only create rays if the light source is above horizon (like shadows)
    if (lightPosition.y <= 0) {
      console.log('🌅 Light source below horizon - no rays created');
      return;
    }
    
    // Calculate light direction FROM light source TO ground (matching shadow system)
    const lightDirection = new THREE.Vector3(0, -1, 0);
    lightDirection.copy(lightPosition).normalize();
    lightDirection.y = -Math.abs(lightDirection.y); // Always point downward
    
    console.log('🌅 Light direction (matching shadows):', lightDirection);
    console.log('🌅 Light position:', lightPosition);
    
    // Create rays emanating from the light source at the same angle as shadows
    const numRays = 8;
    const rayLength = 200;
    const rayWidth = 12;
    const raySpread = 60; // Spread rays around the light source
    
    for (let i = 0; i < numRays; i++) {
      // Create plane geometry for each ray beam
      const geometry = new THREE.PlaneGeometry(rayWidth, rayLength, 1, 32);
      
      // Add organic variation to ray shape
      const positionAttribute = geometry.getAttribute('position');
      const positions = positionAttribute.array as Float32Array;
      
      for (let j = 0; j < positions.length; j += 3) {
        const x = positions[j];
        const y = positions[j + 1];
        const z = positions[j + 2];
        
        // Add subtle wave to make rays feel more organic
        const wave = Math.sin(y * 0.01) * Math.cos(x * 0.05) * 0.5;
        positions[j] += wave;
      }
      
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
      
      const ray = new THREE.Mesh(geometry, this.lightRayMaterial.clone());
      
      // Position rays around the light source (like sun rays through clouds)
      const angle = (i / numRays) * Math.PI * 2;
      const offsetX = Math.cos(angle) * raySpread;
      const offsetZ = Math.sin(angle) * raySpread;
      
      // Start position near the light source
      const startPosition = lightPosition.clone();
      startPosition.x += offsetX;
      startPosition.z += offsetZ;
      startPosition.y -= 20; // Start slightly below light source
      
      // End position extending in the light direction (matching shadow direction)
      const endPosition = startPosition.clone();
      endPosition.add(lightDirection.clone().multiplyScalar(rayLength));
      
      // Position ray between start and end
      const midPosition = startPosition.clone().add(endPosition).multiplyScalar(0.5);
      ray.position.copy(midPosition);
      
      // Orient ray along light direction (same as shadow direction)
      const lookDirection = endPosition.clone().sub(startPosition).normalize();
      ray.lookAt(ray.position.clone().add(lookDirection));
      
      // Calculate distance from light source for shader
      const rayDistance = startPosition.distanceTo(lightPosition);
      
      // Update material uniforms for this ray
      const material = ray.material as THREE.ShaderMaterial;
      material.uniforms.rayDistance.value = rayDistance;
      
      // Store ray data for shadow calculations
      (ray as any).rayIndex = i;
      (ray as any).startPosition = startPosition.clone();
      (ray as any).endPosition = endPosition.clone();
      (ray as any).lightDirection = lightDirection.clone();
      
      this.lightRays.push(ray);
      this.scene.add(ray);
    }
    
    console.log(`🌅 Created ${this.lightRays.length} volumetric light rays from light source at correct angle`);
  }
  
  private calculateShadowFactor(rayPosition: THREE.Vector3, lightDirection: THREE.Vector3): number {
    if (!this.physicsManager) return 1.0;
    
    // Use the correct physics method that exists (checkRayCollision instead of raycast)
    const collision = this.physicsManager.checkRayCollision(
      rayPosition, 
      lightDirection.clone().negate(), // Ray from position toward light
      100, // Distance to check
      ['player'] // Exclude player from collision
    );
    
    if (collision) {
      const distanceToObstacle = collision.distance;
      
      // Create shadow falloff based on distance to obstacle
      if (distanceToObstacle < 50) {
        return Math.max(0.1, 1.0 - (50 - distanceToObstacle) / 50);
      }
    }
    
    return 1.0; // No shadows
  }
  
  public updateCelestialPositions(sunPosition: THREE.Vector3, moonPosition: THREE.Vector3): void {
    this.sunPosition.copy(sunPosition);
    this.moonPosition.copy(moonPosition);
  }
  
  public update(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    this.timeOfDay = timeOfDay;
    
    // Determine active light source based on time of day (matching shadow system)
    const isNightTime = timeOfDay < 0.25 || timeOfDay > 0.75;
    const activeLightPosition = isNightTime ? this.moonPosition : this.sunPosition;
    
    // Only show rays if the light source is above horizon (like shadows)
    if (activeLightPosition.y <= 0) {
      // Hide all rays when light is below horizon
      this.lightRays.forEach(ray => {
        ray.visible = false;
      });
      return;
    }
    
    // Recreate rays if light position changed significantly or no rays exist
    const lightPositionChanged = activeLightPosition.distanceTo(this.lastPlayerPosition) > 0.1;
    const playerMoved = playerPosition.distanceTo(this.lastPlayerPosition) > 30;
    
    if (lightPositionChanged || playerMoved || this.lightRays.length === 0) {
      this.createLightRayGeometry(activeLightPosition, playerPosition);
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    // Calculate light direction FROM light source TO ground (matching shadows)
    const lightDirection = new THREE.Vector3();
    lightDirection.copy(activeLightPosition).normalize();
    lightDirection.y = -Math.abs(lightDirection.y); // Always point downward like shadows
    
    // Calculate light intensity based on celestial body elevation (matching shadow system)
    const lightElevation = Math.max(0, activeLightPosition.y);
    const lightIntensity = Math.min(1.0, lightElevation / 100.0);
    
    // Update each light ray
    this.lightRays.forEach((ray, index) => {
      ray.visible = true; // Make sure rays are visible
      
      const material = ray.material as THREE.ShaderMaterial;
      const rayData = ray as any;
      
      // Calculate shadow factor for this ray position
      const shadowFactor = this.calculateShadowFactor(rayData.startPosition, rayData.lightDirection);
      
      // Update material uniforms
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.lightDirection.value.copy(lightDirection);
        material.uniforms.lightPosition.value.copy(activeLightPosition);
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.lightIntensity.value = lightIntensity;
        material.uniforms.shadowFactor.value = shadowFactor;
        
        // Adjust atmospheric density based on time and light elevation
        const baseDensity = isNightTime ? 0.08 : 0.20;
        material.uniforms.atmosphericDensity.value = baseDensity * lightIntensity;
        material.uniforms.scatteringFactor.value = 0.9; // Increase visibility
      }
    });
    
    console.log(`🌅 Updated ${this.lightRays.length} rays - Light elevation: ${lightElevation.toFixed(1)}, Intensity: ${lightIntensity.toFixed(2)}`);
  }
  
  public setIntensity(intensity: number): void {
    this.lightRays.forEach(ray => {
      const material = ray.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.scatteringFactor.value = intensity;
      }
    });
  }
  
  public dispose(): void {
    this.lightRays.forEach(ray => {
      this.scene.remove(ray);
      if (ray.geometry) ray.geometry.dispose();
      if (ray.material) (ray.material as THREE.Material).dispose();
    });
    this.lightRays = [];
    
    this.shadowVolumes.forEach(volume => {
      this.scene.remove(volume);
      if (volume.geometry) volume.geometry.dispose();
      if (volume.material) (volume.material as THREE.Material).dispose();
    });
    this.shadowVolumes = [];
    
    if (this.lightRayMaterial) this.lightRayMaterial.dispose();
    
    console.log("VolumetricLightRaySystem disposed");
  }
}
