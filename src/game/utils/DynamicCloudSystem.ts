
import * as THREE from 'three';

interface Cloud {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  opacity: number;
  targetOpacity: number;
  fadeSpeed: number;
  age: number;
  maxAge: number;
  baseOpacity: number; // Store base opacity for distance calculations
  fadedOutTime: number; // Track how long cloud has been fully faded
}

export class DynamicCloudSystem {
  private scene: THREE.Scene;
  private clouds: Cloud[] = [];
  private cloudMaterial: THREE.MeshLambertMaterial;
  private time: number = 0;
  private windDirection: THREE.Vector3;
  private spawnTimer: number = 0;
  private spawnInterval: number = 5500; // Reduced from 8000 to 5500ms for more frequent spawning
  
  // Distance-based fade settings - adjusted for better visibility
  private fadeInDistance: number = 150; // Increased for larger visible zone
  private fadeOutDistance: number = 250; // Increased for larger visible zone
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Unified wind direction - all clouds move the same way
    this.windDirection = new THREE.Vector3(1.0, 0, 0.5).normalize();
    
    // Create cloud material with reduced opacity for realism
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4, // Reduced from 0.8 for more realistic appearance
      fog: false // Don't let fog affect clouds
    });
    
    console.log('DynamicCloudSystem initialized with continuous spawning settings');
    console.log('Spawn interval:', this.spawnInterval, 'ms');
  }
  
  public initialize(): void {
    // Create fewer initial clouds positioned across a wider area for realistic distribution
    for (let i = 0; i < 5; i++) { // Reduced from 8 to 5 initial clouds
      this.createCloud(true);
    }
    console.log(`Continuous cloud sky initialized with ${this.clouds.length} distributed clouds`);
  }
  
  private createCloud(isInitial: boolean = false): void {
    // Create simplified cloud geometry - fewer puffs for individual cloud formations
    const cloudGroup = new THREE.Group();
    
    // Fewer puffs per cloud for realistic individual formations
    const puffCount = 1 + Math.floor(Math.random() * 3); // Reduced from 4-8 to 1-3 puffs
    for (let i = 0; i < puffCount; i++) {
      const puffGeometry = new THREE.SphereGeometry(
        12 + Math.random() * 10, // Keep large radius for visibility: 12-22 units
        16, 12
      );
      // Clone material for each puff to allow individual opacity control
      const puffMaterial = this.cloudMaterial.clone();
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // Create more elongated, natural cloud shapes with better horizontal spread
      puffMesh.position.set(
        (Math.random() - 0.5) * 30, // Increased horizontal spread for elongated clouds
        (Math.random() - 0.5) * 8,  // Reduced vertical spread for flatter clouds
        (Math.random() - 0.5) * 20  // Moderate depth spread
      );
      
      puffMesh.scale.y = 0.5; // More flattened for realistic cumulus appearance
      puffMesh.scale.x = 1.2; // Slightly stretched horizontally
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky with better distribution
    const cloudHeight = 35 + Math.random() * 15; // Lower height for better visibility
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: distribute across a much wider area for realistic spacing
      const angle = (Math.random() * Math.PI * 2);
      const distance = 60 + Math.random() * 120; // Wider distribution: 60-180 units
      spawnX = Math.cos(angle) * distance;
      spawnZ = Math.sin(angle) * distance;
      console.log(`Initial cloud spawned at distance ${distance.toFixed(1)} from origin`);
    } else {
      // New clouds: spawn further away with better spacing
      const spawnDistance = 240; // Increased spawn distance for better distribution
      // Spawn upwind with more variation for natural appearance
      spawnX = -this.windDirection.x * spawnDistance + (Math.random() - 0.5) * 150;
      spawnZ = -this.windDirection.z * spawnDistance + (Math.random() - 0.5) * 150;
      console.log(`New continuous cloud spawned upwind at distance ${spawnDistance}`);
    }
    
    cloudGroup.position.set(spawnX, cloudHeight, spawnZ);
    
    // Reduced base opacity range for more realistic appearance (50% reduction)
    const baseOpacity = 0.2 + Math.random() * 0.2; // 0.2 to 0.4 range (was 0.4-0.8)
    
    // Create cloud object
    const cloud: Cloud = {
      mesh: cloudGroup,
      // Faster velocity for more noticeable movement
      velocity: new THREE.Vector3(
        this.windDirection.x * 3.0, // Increased from 1.2 to 3.0
        0,
        this.windDirection.z * 3.0
      ),
      opacity: isInitial ? 0.05 : 0, // Start initial clouds with very low opacity
      targetOpacity: baseOpacity,
      fadeSpeed: 0.02 + Math.random() * 0.01, // Faster fade transitions
      age: 0,
      maxAge: 30000 + Math.random() * 20000, // Reduced lifespan: 30-50 seconds for faster turnover
      baseOpacity: baseOpacity,
      fadedOutTime: 0 // Initialize fade-out tracking
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    console.log(`Created continuous cloud (${puffCount} puffs) at (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)}) - lifespan: ${(cloud.maxAge/1000).toFixed(1)}s`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Spawn new clouds more frequently to maintain continuous flow
    if (this.spawnTimer >= this.spawnInterval && this.clouds.length < 7) { // Keep max at 7
      this.createCloud(false);
      this.spawnTimer = 0;
      console.log(`Spawned continuous cloud, total clouds: ${this.clouds.length}`);
    }
    
    // Update existing clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      
      // Update position - movement happens here with faster speed
      const movement = cloud.velocity.clone().multiplyScalar(deltaTime);
      cloud.mesh.position.add(movement);
      
      // Update age
      cloud.age += deltaTime * 1000;
      
      // Calculate distance-based opacity if player position is provided
      let distanceFactor = 1.0;
      let distance = 0;
      if (playerPosition) {
        distance = cloud.mesh.position.distanceTo(playerPosition);
        
        if (distance > this.fadeOutDistance) {
          // Fade out when far from player
          distanceFactor = 0;
        } else if (distance > this.fadeInDistance) {
          // Gradual fade between fadeIn and fadeOut distances
          const fadeRange = this.fadeOutDistance - this.fadeInDistance;
          const fadeProgress = (distance - this.fadeInDistance) / fadeRange;
          distanceFactor = 1 - fadeProgress;
        } else {
          // Fully visible when close to player
          distanceFactor = 1.0;
        }
      }
      
      // Handle age-based fade in/out
      let ageFactor = 1.0;
      if (cloud.age < 5000) {
        // Fade in over first 5 seconds
        ageFactor = cloud.age / 5000;
      } else if (cloud.age > cloud.maxAge - 8000) {
        // Fade out over last 8 seconds
        const fadeProgress = (cloud.age - (cloud.maxAge - 8000)) / 8000;
        ageFactor = 1 - fadeProgress;
      }
      
      // Combine distance and age factors
      cloud.targetOpacity = cloud.baseOpacity * distanceFactor * ageFactor;
      
      // Safety check - ensure minimum visibility when in visible range (but with reduced opacity)
      if (playerPosition && distance <= this.fadeInDistance && ageFactor > 0.1) {
        cloud.targetOpacity = Math.max(cloud.targetOpacity, 0.1); // Reduced minimum visible opacity
      }
      
      // Smooth opacity transition
      const opacityDiff = cloud.targetOpacity - cloud.opacity;
      cloud.opacity += opacityDiff * cloud.fadeSpeed * (deltaTime * 60); // 60fps normalized
      
      // Clamp opacity
      cloud.opacity = Math.max(0, Math.min(1, cloud.opacity));
      
      // Track fade-out time for efficient removal
      if (cloud.opacity <= 0.001) {
        cloud.fadedOutTime += deltaTime * 1000;
      } else {
        cloud.fadedOutTime = 0; // Reset if cloud becomes visible again
      }
      
      // Update material opacity for all child meshes
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = cloud.opacity;
          child.material.transparent = true;
          child.material.needsUpdate = true;
        }
      });
      
      // Enhanced debug logging for continuous flow tracking
      if (i === 0 && Math.random() < 0.05) { // Occasional logging for debugging
        console.log(`Cloud 0 CONTINUOUS:`, {
          position: `(${cloud.mesh.position.x.toFixed(1)}, ${cloud.mesh.position.z.toFixed(1)})`,
          distance: playerPosition ? distance.toFixed(1) : 'N/A',
          opacity: cloud.opacity.toFixed(3),
          age: `${(cloud.age/1000).toFixed(1)}s/${(cloud.maxAge/1000).toFixed(1)}s`,
          fadedOutTime: `${(cloud.fadedOutTime/1000).toFixed(1)}s`,
          totalClouds: this.clouds.length
        });
      }
      
      // IMPROVED REMOVAL LOGIC - Remove clouds efficiently for continuous spawning
      let shouldRemove = false;
      let removeReason = '';
      
      // 1. Remove clouds that have been fully faded for more than 3 seconds
      if (cloud.fadedOutTime > 3000) {
        shouldRemove = true;
        removeReason = 'faded-out-timeout';
      }
      // 2. Remove clouds that exceed their maximum age
      else if (cloud.age > cloud.maxAge) {
        shouldRemove = true;
        removeReason = 'max-age';
      }
      // 3. Remove clouds that are completely invisible (immediate removal for efficiency)
      else if (cloud.opacity <= 0 && cloud.targetOpacity <= 0) {
        shouldRemove = true;
        removeReason = 'fully-invisible';
      }
      // 4. Remove clouds that are too far away (cleanup for performance)
      else if (playerPosition) {
        const distanceFromPlayer = cloud.mesh.position.distanceTo(playerPosition);
        if (distanceFromPlayer > 350) { // Increased cleanup distance slightly
          shouldRemove = true;
          removeReason = 'too-distant';
        }
      }
      
      if (shouldRemove) {
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
        console.log(`Removed cloud (${removeReason}) - age: ${(cloud.age/1000).toFixed(1)}s, fadedOut: ${(cloud.fadedOutTime/1000).toFixed(1)}s, remaining: ${this.clouds.length}`);
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
    
    if (this.cloudMaterial) {
      this.cloudMaterial.dispose();
    }
    
    console.log('DynamicCloudSystem disposed');
  }
}
