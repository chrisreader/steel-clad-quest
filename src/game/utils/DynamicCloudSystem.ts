
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
  
  // Distance-based fade settings
  private fadeInDistance: number = 150;
  private fadeOutDistance: number = 250;
  
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
        featherWidth: { value: 8.0 } // Proportional feather width
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
    
    console.log('DynamicCloudSystem initialized with larger, more realistic clouds');
  }
  
  public initialize(): void {
    // Create initial clouds positioned within visible range
    for (let i = 0; i < 6; i++) { // Reduced from 8 to 6 since clouds are larger
      this.createCloud(true);
    }
    console.log(`Realistic cloud system initialized with ${this.clouds.length} larger clouds`);
  }
  
  private createCloud(isInitial: boolean = false): void {
    const cloudGroup = new THREE.Group();
    
    // Create fewer but larger cloud puffs
    const puffCount = 3 + Math.floor(Math.random() * 3); // 3-5 puffs (reduced from 4-7)
    for (let i = 0; i < puffCount; i++) {
      // Much larger geometry for realistic cloud size
      const puffRadius = 15 + Math.random() * 10; // 15-25 units (increased from 4-10)
      const puffGeometry = new THREE.SphereGeometry(
        puffRadius,
        8, 6 // Keep lower poly count for softer appearance
      );
      
      // Clone the shader material and set radius for proper feathering
      const puffMaterial = this.cloudShaderMaterial.clone();
      puffMaterial.uniforms.radius.value = puffRadius;
      puffMaterial.uniforms.featherWidth.value = puffRadius * 0.4; // Proportional feather width
      
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // Better spacing for larger clouds - increased spread
      puffMesh.position.set(
        (Math.random() - 0.5) * 40, // Increased from 20 to 40
        (Math.random() - 0.5) * 15, // Increased from 8 to 15
        (Math.random() - 0.5) * 25  // Increased from 12 to 25
      );
      
      // Larger scale range for substantial clouds
      const scale = 1.0 + Math.random() * 1.0; // 1.0 to 2.0 scale (increased from 0.6-1.4)
      puffMesh.scale.set(scale, scale * 0.8, scale); // Slightly flatten for more natural look
      
      // Add slight random rotation for more natural appearance
      puffMesh.rotation.set(
        Math.random() * Math.PI * 0.2,
        Math.random() * Math.PI * 0.2,
        Math.random() * Math.PI * 0.2
      );
      
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky
    const cloudHeight = 35 + Math.random() * 15;
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: spawn within visible range
      const angle = (Math.random() * Math.PI * 2);
      const distance = 60 + Math.random() * 80; // Increased distance for larger clouds
      spawnX = Math.cos(angle) * distance;
      spawnZ = Math.sin(angle) * distance;
    } else {
      // New clouds: spawn outside visible range
      const spawnDistance = 250; // Increased from 220
      spawnX = -this.windDirection.x * spawnDistance + (Math.random() - 0.5) * 120;
      spawnZ = -this.windDirection.z * spawnDistance + (Math.random() - 0.5) * 120;
    }
    
    cloudGroup.position.set(spawnX, cloudHeight, spawnZ);
    
    // Increased base opacity for better visibility while maintaining realism
    const baseOpacity = 0.3 + Math.random() * 0.3; // 0.3 to 0.6 range (increased from 0.1-0.3)
    
    const cloud: Cloud = {
      mesh: cloudGroup,
      velocity: new THREE.Vector3(
        this.windDirection.x * 2.5, // Slightly slower for larger clouds
        0,
        this.windDirection.z * 2.5
      ),
      opacity: isInitial ? 0.15 : 0, // Higher initial opacity
      targetOpacity: baseOpacity,
      fadeSpeed: 0.015 + Math.random() * 0.01, // Slightly slower fade for larger clouds
      age: 0,
      maxAge: 50000 + Math.random() * 25000, // Longer lifespan for larger clouds
      baseOpacity: baseOpacity
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    console.log(`Created larger realistic cloud at position (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)}) with baseOpacity ${baseOpacity.toFixed(3)}`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Update shader time uniform for animated effects
    this.cloudShaderMaterial.uniforms.time.value = this.time;
    
    // Spawn new clouds periodically (reduced max count since clouds are larger)
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
      
      // Calculate distance-based opacity
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
      if (cloud.age < 8000) { // Longer fade-in for larger clouds
        ageFactor = cloud.age / 8000;
      } else if (cloud.age > cloud.maxAge - 12000) { // Longer fade-out
        const fadeProgress = (cloud.age - (cloud.maxAge - 12000)) / 12000;
        ageFactor = 1 - fadeProgress;
      }
      
      // Combine factors for final opacity
      cloud.targetOpacity = cloud.baseOpacity * distanceFactor * ageFactor;
      
      // Higher minimum visibility for larger clouds
      if (playerPosition && distance <= this.fadeInDistance && ageFactor > 0.2) {
        cloud.targetOpacity = Math.max(cloud.targetOpacity, 0.15); // Increased from 0.05
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
      
      // Debug logging (less frequent)
      if (i === 0 && Math.random() < 0.05) {
        console.log(`Large Realistic Cloud 0:`, {
          position: `(${cloud.mesh.position.x.toFixed(1)}, ${cloud.mesh.position.z.toFixed(1)})`,
          distance: playerPosition ? distance.toFixed(1) : 'N/A',
          opacity: cloud.opacity.toFixed(4),
          targetOpacity: cloud.targetOpacity.toFixed(4)
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
      }
      
      // Remove distant clouds for cleanup (increased distance for larger clouds)
      else if (playerPosition) {
        const distanceFromPlayer = cloud.mesh.position.distanceTo(playerPosition);
        if (distanceFromPlayer > 400) { // Increased from 300
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
    
    console.log('Large Realistic DynamicCloudSystem disposed');
  }
}
