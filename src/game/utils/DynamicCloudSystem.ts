
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
        fogColor: { value: new THREE.Color(0x87ceeb) } // Sky blue
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
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromCenter;
        
        // Simple noise function for cloud texture
        float noise(vec3 p) {
          return sin(p.x * 0.5) * sin(p.y * 0.3) * sin(p.z * 0.7) * 0.5 + 0.5;
        }
        
        void main() {
          // Create feathered edges based on distance from center
          float radius = 6.0; // Base sphere radius
          float featherWidth = 2.0; // How soft the edges are
          float edgeFactor = 1.0 - smoothstep(radius - featherWidth, radius, vDistanceFromCenter);
          
          // Add some noise for more realistic cloud texture
          vec3 noisePos = vPosition * 0.1 + time * 0.001;
          float cloudNoise = noise(noisePos) * 0.3 + 0.7;
          
          // Combine edge feathering with noise
          float finalAlpha = edgeFactor * cloudNoise * opacity;
          
          // Add subtle color variation with distance
          vec3 finalColor = mix(fogColor, cloudColor, 0.8);
          
          // Use normal for subtle lighting effect
          float lighting = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.3 + 0.7;
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
    
    console.log('DynamicCloudSystem initialized with realistic feathered clouds');
  }
  
  public initialize(): void {
    // Create initial clouds positioned within visible range
    for (let i = 0; i < 8; i++) {
      this.createCloud(true);
    }
    console.log(`Realistic cloud system initialized with ${this.clouds.length} feathered clouds`);
  }
  
  private createCloud(isInitial: boolean = false): void {
    const cloudGroup = new THREE.Group();
    
    // Create multiple cloud puffs with more varied positioning
    const puffCount = 4 + Math.floor(Math.random() * 4); // 4-7 puffs for more variety
    for (let i = 0; i < puffCount; i++) {
      // Use lower poly geometry for softer appearance
      const puffGeometry = new THREE.SphereGeometry(
        4 + Math.random() * 6, // Varied sizes: 4-10 units
        8, 6 // Lower poly count for softer appearance
      );
      
      // Clone the shader material for each puff
      const puffMaterial = this.cloudShaderMaterial.clone();
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // More varied positioning for irregular cloud shapes
      puffMesh.position.set(
        (Math.random() - 0.5) * 20, // Increased spread
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 12
      );
      
      // Varied scaling for more natural appearance
      const scale = 0.6 + Math.random() * 0.8; // 0.6 to 1.4 scale
      puffMesh.scale.set(scale, scale * 0.7, scale); // Flatten slightly
      
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky
    const cloudHeight = 35 + Math.random() * 15;
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: spawn within visible range
      const angle = (Math.random() * Math.PI * 2);
      const distance = 50 + Math.random() * 70;
      spawnX = Math.cos(angle) * distance;
      spawnZ = Math.sin(angle) * distance;
    } else {
      // New clouds: spawn outside visible range
      const spawnDistance = 220;
      spawnX = -this.windDirection.x * spawnDistance + (Math.random() - 0.5) * 100;
      spawnZ = -this.windDirection.z * spawnDistance + (Math.random() - 0.5) * 100;
    }
    
    cloudGroup.position.set(spawnX, cloudHeight, spawnZ);
    
    // Much lower base opacity for realistic atmospheric clouds
    const baseOpacity = 0.1 + Math.random() * 0.2; // 0.1 to 0.3 range
    
    const cloud: Cloud = {
      mesh: cloudGroup,
      velocity: new THREE.Vector3(
        this.windDirection.x * 3.0,
        0,
        this.windDirection.z * 3.0
      ),
      opacity: isInitial ? 0.05 : 0, // Start very transparent
      targetOpacity: baseOpacity,
      fadeSpeed: 0.02 + Math.random() * 0.01,
      age: 0,
      maxAge: 40000 + Math.random() * 20000,
      baseOpacity: baseOpacity
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    console.log(`Created realistic cloud at position (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)}) with baseOpacity ${baseOpacity.toFixed(3)}`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Update shader time uniform for animated effects
    this.cloudShaderMaterial.uniforms.time.value = this.time;
    
    // Spawn new clouds periodically
    if (this.spawnTimer >= this.spawnInterval && this.clouds.length < 12) {
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
      if (cloud.age < 5000) {
        ageFactor = cloud.age / 5000;
      } else if (cloud.age > cloud.maxAge - 8000) {
        const fadeProgress = (cloud.age - (cloud.maxAge - 8000)) / 8000;
        ageFactor = 1 - fadeProgress;
      }
      
      // Combine factors for final opacity
      cloud.targetOpacity = cloud.baseOpacity * distanceFactor * ageFactor;
      
      // Minimum visibility when in range (much lower threshold)
      if (playerPosition && distance <= this.fadeInDistance && ageFactor > 0.1) {
        cloud.targetOpacity = Math.max(cloud.targetOpacity, 0.05);
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
        console.log(`Realistic Cloud 0:`, {
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
      
      // Remove distant clouds for cleanup
      else if (playerPosition) {
        const distanceFromPlayer = cloud.mesh.position.distanceTo(playerPosition);
        if (distanceFromPlayer > 300) {
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
    
    console.log('Realistic DynamicCloudSystem disposed');
  }
}
