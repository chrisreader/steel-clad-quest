
import * as THREE from 'three';

interface Cloud {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  opacity: number;
  targetOpacity: number;
  fadeSpeed: number;
  age: number;
  maxAge: number;
  baseOpacity: number;
}

export class DynamicCloudSystem {
  private scene: THREE.Scene;
  private clouds: Cloud[] = [];
  private cloudShaderMaterial: THREE.ShaderMaterial;
  private time: number = 0;
  private windDirection: THREE.Vector3;
  private spawnTimer: number = 0;
  private spawnInterval: number = 3000;
  
  // Distance-based fade settings - adjusted for better visibility
  private fadeInDistance: number = 150;
  private fadeOutDistance: number = 250;
  
  // Player starting position for better cloud positioning
  private readonly PLAYER_START_POSITION = new THREE.Vector3(17, 1, 14);
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.windDirection = new THREE.Vector3(1.0, 0, 0.5).normalize();
    
    // Create custom shader material for realistic cloud rendering
    this.cloudShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        opacity: { value: 1.0 },
        cloudColor: { value: new THREE.Color(0xffffff) },
        fogColor: { value: new THREE.Color(0x87ceeb) }, // Sky blue
        radius: { value: 20.0 }, // Dynamic radius for proper feathering
        featherWidth: { value: 4.0 } // Reduced feather width for better visibility
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromCenter;
        
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          
          // Calculate distance from center of the sphere for feathering
          vDistanceFromCenter = length(position);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 cloudColor;
        uniform vec3 fogColor;
        uniform float radius;
        uniform float featherWidth;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromCenter;
        
        // Simple noise function for cloud texture
        float noise(vec3 p) {
          return sin(p.x * 0.5) * sin(p.y * 0.3) * sin(p.z * 0.7) * 0.5 + 0.5;
        }
        
        void main() {
          // Create feathered edges based on distance from center using dynamic radius
          float edgeFactor = 1.0 - smoothstep(radius - featherWidth, radius, vDistanceFromCenter);
          
          // Add some noise for more realistic cloud texture
          vec3 noisePos = vPosition * 0.02 + time * 0.001; // Reduced noise frequency for larger clouds
          float cloudNoise = noise(noisePos) * 0.4 + 0.6;
          
          // Combine edge feathering with noise
          float finalAlpha = edgeFactor * cloudNoise * opacity;
          
          // Add subtle color variation with distance
          vec3 finalColor = mix(fogColor, cloudColor, 0.85);
          
          // Use normal for subtle lighting effect
          float lighting = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.2 + 0.8;
          finalColor *= lighting;
          
          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      alphaTest: 0.01,
      fog: false
    });
    
    console.log('DynamicCloudSystem initialized with improved visibility settings');
  }
  
  public initialize(): void {
    // Create initial clouds positioned near player starting position
    for (let i = 0; i < 6; i++) {
      this.createCloud(true);
    }
    console.log(`Visible cloud system initialized with ${this.clouds.length} clouds near player start position`);
  }
  
  private createCloud(isInitial: boolean = false): void {
    const cloudGroup = new THREE.Group();
    
    // Create fewer but larger cloud puffs
    const puffCount = 3 + Math.floor(Math.random() * 3); // 3-5 puffs
    for (let i = 0; i < puffCount; i++) {
      // Large geometry for realistic cloud size
      const puffRadius = 15 + Math.random() * 10; // 15-25 units
      const puffGeometry = new THREE.SphereGeometry(
        puffRadius,
        8, 6 // Keep lower poly count for softer appearance
      );
      
      // Clone the shader material and set radius for proper feathering
      const puffMaterial = this.cloudShaderMaterial.clone();
      puffMaterial.uniforms.radius.value = puffRadius;
      puffMaterial.uniforms.featherWidth.value = puffRadius * 0.2; // Reduced to 20% for better visibility
      
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // Better spacing for larger clouds
      puffMesh.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 25
      );
      
      // Larger scale range for substantial clouds
      const scale = 1.0 + Math.random() * 1.0; // 1.0 to 2.0 scale
      puffMesh.scale.set(scale, scale * 0.8, scale); // Slightly flatten for more natural look
      
      // Add slight random rotation for more natural appearance
      puffMesh.rotation.set(
        Math.random() * Math.PI * 0.2,
        Math.random() * Math.PI * 0.2,
        Math.random() * Math.PI * 0.2
      );
      
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky - adjusted for better visibility
    const cloudHeight = 35 + Math.random() * 15;
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: spawn near player starting position for immediate visibility
      const angle = (Math.random() * Math.PI * 2);
      const distance = 30 + Math.random() * 50; // Closer to player: 30-80 units
      spawnX = this.PLAYER_START_POSITION.x + Math.cos(angle) * distance;
      spawnZ = this.PLAYER_START_POSITION.z + Math.sin(angle) * distance;
      console.log(`Creating initial cloud at distance ${distance.toFixed(1)} from player start position`);
    } else {
      // New clouds: spawn outside visible range but closer than before
      const spawnDistance = 200; // Reduced from 250
      spawnX = this.PLAYER_START_POSITION.x - this.windDirection.x * spawnDistance + (Math.random() - 0.5) * 80;
      spawnZ = this.PLAYER_START_POSITION.z - this.windDirection.z * spawnDistance + (Math.random() - 0.5) * 80;
    }
    
    cloudGroup.position.set(spawnX, cloudHeight, spawnZ);
    
    // Increased base opacity for much better visibility
    const baseOpacity = 0.4 + Math.random() * 0.3; // 0.4 to 0.7 range for better visibility
    
    const cloud: Cloud = {
      mesh: cloudGroup,
      velocity: new THREE.Vector3(
        this.windDirection.x * 2.5,
        0,
        this.windDirection.z * 2.5
      ),
      opacity: isInitial ? 0.3 : 0, // Higher initial opacity for immediate visibility
      targetOpacity: baseOpacity,
      fadeSpeed: 0.015 + Math.random() * 0.01,
      age: 0,
      maxAge: 50000 + Math.random() * 25000,
      baseOpacity: baseOpacity
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    // Enhanced logging for debugging visibility
    const distanceFromPlayer = isInitial ? cloudGroup.position.distanceTo(this.PLAYER_START_POSITION) : 'N/A';
    console.log(`Created visible cloud at position (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)}) with baseOpacity ${baseOpacity.toFixed(3)}, distance from player: ${distanceFromPlayer}`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Update shader time uniform for animated effects
    this.cloudShaderMaterial.uniforms.time.value = this.time;
    
    // Spawn new clouds periodically
    if (this.spawnTimer >= this.spawnInterval && this.clouds.length < 10) {
      this.createCloud(false);
      this.spawnTimer = 0;
    }
    
    // Update existing clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      
      // Update position
      const movement = cloud.velocity.clone().multiplyScalar(deltaTime);
      cloud.mesh.position.add(movement);
      
      // Update age
      cloud.age += deltaTime * 1000;
      
      // Calculate distance-based opacity with improved logging
      let distanceFactor = 1.0;
      let distance = 0;
      if (playerPosition) {
        distance = cloud.mesh.position.distanceTo(playerPosition);
        
        if (distance > this.fadeOutDistance) {
          distanceFactor = 0;
        } else if (distance > this.fadeInDistance) {
          const fadeRange = this.fadeOutDistance - this.fadeInDistance;
          const fadeProgress = (distance - this.fadeInDistance) / fadeRange;
          distanceFactor = 1 - fadeProgress;
        } else {
          distanceFactor = 1.0;
        }
      }
      
      // Age-based fade
      let ageFactor = 1.0;
      if (cloud.age < 8000) { // Fade-in period
        ageFactor = cloud.age / 8000;
      } else if (cloud.age > cloud.maxAge - 12000) { // Fade-out period
        const fadeProgress = (cloud.age - (cloud.maxAge - 12000)) / 12000;
        ageFactor = 1 - fadeProgress;
      }
      
      // Combine factors for final opacity
      cloud.targetOpacity = cloud.baseOpacity * distanceFactor * ageFactor;
      
      // Higher minimum visibility threshold
      if (playerPosition && distance <= this.fadeInDistance && ageFactor > 0.2) {
        cloud.targetOpacity = Math.max(cloud.targetOpacity, 0.25); // Increased minimum visibility
      }
      
      // Smooth opacity transition
      const opacityDiff = cloud.targetOpacity - cloud.opacity;
      cloud.opacity += opacityDiff * cloud.fadeSpeed * (deltaTime * 60);
      cloud.opacity = Math.max(0, Math.min(1, cloud.opacity));
      
      // Update shader material opacity for all cloud puffs
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
          child.material.uniforms.opacity.value = cloud.opacity;
          child.material.needsUpdate = true;
        }
      });
      
      // Enhanced debug logging for visibility issues
      if (i === 0 && Math.random() < 0.1) { // More frequent logging for debugging
        console.log(`Visible Cloud Debug:`, {
          position: `(${cloud.mesh.position.x.toFixed(1)}, ${cloud.mesh.position.z.toFixed(1)})`,
          distance: playerPosition ? distance.toFixed(1) : 'N/A',
          opacity: cloud.opacity.toFixed(4),
          targetOpacity: cloud.targetOpacity.toFixed(4),
          baseOpacity: cloud.baseOpacity.toFixed(3),
          distanceFactor: distanceFactor.toFixed(3),
          ageFactor: ageFactor.toFixed(3),
          withinFadeIn: playerPosition ? (distance <= this.fadeInDistance) : 'N/A'
        });
      }
      
      // Remove clouds that are too old or invisible
      if (cloud.age > cloud.maxAge || cloud.opacity <= 0.001) {
        this.scene.remove(cloud.mesh);
        cloud.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        this.clouds.splice(i, 1);
        console.log('Removed cloud due to age or invisibility');
      }
      
      // Remove distant clouds for cleanup
      else if (playerPosition) {
        const distanceFromPlayer = cloud.mesh.position.distanceTo(playerPosition);
        if (distanceFromPlayer > 400) {
          this.scene.remove(cloud.mesh);
          cloud.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material instanceof THREE.Material) {
                child.material.dispose();
              }
            }
          });
          this.clouds.splice(i, 1);
          console.log(`Removed distant cloud at distance ${distanceFromPlayer.toFixed(1)}`);
        }
      }
    }
  }
  
  public dispose(): void {
    // Clean up all clouds
    this.clouds.forEach(cloud => {
      this.scene.remove(cloud.mesh);
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    });
    this.clouds = [];
    
    if (this.cloudShaderMaterial) {
      this.cloudShaderMaterial.dispose();
    }
    
    console.log('Improved DynamicCloudSystem disposed');
  }
}
