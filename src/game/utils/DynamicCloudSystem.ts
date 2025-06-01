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
}

export class DynamicCloudSystem {
  private scene: THREE.Scene;
  private clouds: Cloud[] = [];
  private cloudMaterial: THREE.MeshLambertMaterial;
  private time: number = 0;
  private windDirection: THREE.Vector3;
  private spawnTimer: number = 0;
  private spawnInterval: number = 3000; // 3 seconds
  
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
    
    console.log('DynamicCloudSystem initialized with realistic settings');
    console.log('Fade distances - In:', this.fadeInDistance, 'Out:', this.fadeOutDistance);
  }
  
  public initialize(): void {
    // Create initial clouds positioned within visible range for immediate demonstration
    for (let i = 0; i < 8; i++) {
      this.createCloud(true);
    }
    console.log(`Cloud system initialized with ${this.clouds.length} clouds in visible range`);
  }
  
  private createCloud(isInitial: boolean = false): void {
    // Create cloud geometry using multiple spheres - larger for more realistic appearance
    const cloudGroup = new THREE.Group();
    
    // Create multiple cloud puffs with shared material
    const puffCount = 4 + Math.floor(Math.random() * 4); // More puffs for fuller clouds
    for (let i = 0; i < puffCount; i++) {
      const puffGeometry = new THREE.SphereGeometry(
        12 + Math.random() * 10, // Much larger radius: 12-22 units (was 6-10)
        16, 12
      );
      // Clone material for each puff to allow individual opacity control
      const puffMaterial = this.cloudMaterial.clone();
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // Position puffs to create larger cloud shape
      puffMesh.position.set(
        (Math.random() - 0.5) * 25, // Wider spread for larger clouds
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 18
      );
      
      puffMesh.scale.y = 0.6; // Flatten clouds for more realistic shape
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky
    const cloudHeight = 35 + Math.random() * 15; // Lower height for better visibility
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: spawn within visible range (50-120 units from origin)
      const angle = (Math.random() * Math.PI * 2);
      const distance = 50 + Math.random() * 70; // Within fade-in distance for immediate visibility
      spawnX = Math.cos(angle) * distance;
      spawnZ = Math.sin(angle) * distance;
      console.log(`Initial cloud spawned at distance ${distance.toFixed(1)} from origin`);
    } else {
      // New clouds: spawn at edge of system and move toward visible zone
      const spawnDistance = 220; // Outside fadeOut distance
      // Spawn upwind so they move toward player area
      spawnX = -this.windDirection.x * spawnDistance + (Math.random() - 0.5) * 100;
      spawnZ = -this.windDirection.z * spawnDistance + (Math.random() - 0.5) * 100;
      console.log(`New cloud spawned at distance ${spawnDistance} (outside visible range)`);
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
      maxAge: 40000 + Math.random() * 20000, // 40-60 seconds
      baseOpacity: baseOpacity
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    console.log(`Created larger cloud at position (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)}) with reduced baseOpacity ${baseOpacity.toFixed(2)}`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Spawn new clouds periodically
    if (this.spawnTimer >= this.spawnInterval && this.clouds.length < 12) {
      this.createCloud(false);
      this.spawnTimer = 0;
      console.log(`Spawned new cloud, total clouds: ${this.clouds.length}`);
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
      
      // Update material opacity for all child meshes
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = cloud.opacity;
          child.material.transparent = true;
          child.material.needsUpdate = true;
        }
      });
      
      // Enhanced debug logging for visibility tracking
      if (i === 0 && Math.random() < 0.1) { // More frequent logging for debugging
        console.log(`Cloud 0 DEBUG:`, {
          position: `(${cloud.mesh.position.x.toFixed(1)}, ${cloud.mesh.position.z.toFixed(1)})`,
          distance: playerPosition ? distance.toFixed(1) : 'N/A',
          opacity: cloud.opacity.toFixed(3),
          targetOpacity: cloud.targetOpacity.toFixed(3),
          distanceFactor: distanceFactor.toFixed(2),
          ageFactor: ageFactor.toFixed(2),
          inVisibleRange: playerPosition ? distance <= this.fadeInDistance : 'N/A'
        });
      }
      
      // Remove old or invisible clouds
      if (cloud.age > cloud.maxAge || cloud.opacity <= 0.005) {
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
        console.log(`Removed cloud (age/opacity), remaining: ${this.clouds.length}`);
      }
      
      // Remove clouds that are too far away (cleanup)
      else if (playerPosition) {
        const distanceFromPlayer = cloud.mesh.position.distanceTo(playerPosition);
        if (distanceFromPlayer > 300) { // Increased cleanup distance
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
          console.log(`Removed distant cloud at ${distanceFromPlayer.toFixed(1)} units, remaining: ${this.clouds.length}`);
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
    
    if (this.cloudMaterial) {
      this.cloudMaterial.dispose();
    }
    
    console.log('DynamicCloudSystem disposed');
  }
}
