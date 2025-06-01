
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
  private fadeInDistance: number = 100;
  private fadeOutDistance: number = 180;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Unified wind direction - all clouds move the same way
    this.windDirection = new THREE.Vector3(1.0, 0, 0.5).normalize();
    
    // Create cloud material with better visibility
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6, // Higher base opacity
      fog: false // Don't let fog affect clouds
    });
    
    console.log('DynamicCloudSystem initialized with enhanced visibility and spawn/fade system');
  }
  
  public initialize(): void {
    // Create initial clouds positioned for demonstration
    for (let i = 0; i < 6; i++) {
      this.createCloud(true);
    }
    console.log(`Cloud system initialized with ${this.clouds.length} clouds`);
  }
  
  private createCloud(isInitial: boolean = false): void {
    // Create cloud geometry using multiple spheres
    const cloudGroup = new THREE.Group();
    
    // Create multiple cloud puffs with shared material
    const puffCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffCount; i++) {
      const puffGeometry = new THREE.SphereGeometry(
        6 + Math.random() * 4, // Slightly smaller but more visible
        16, 12
      );
      // Clone material for each puff to allow individual opacity control
      const puffMaterial = this.cloudMaterial.clone();
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      // Position puffs to create cloud shape
      puffMesh.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 10
      );
      
      puffMesh.scale.y = 0.7; // Flatten clouds slightly
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky
    const cloudHeight = 35 + Math.random() * 15; // Lower height for better visibility
    let spawnX, spawnZ;
    
    if (isInitial) {
      // Initial clouds: spread around player for immediate visibility
      const angle = (Math.random() * Math.PI * 2);
      const distance = 50 + Math.random() * 80; // Within visible range
      spawnX = Math.cos(angle) * distance;
      spawnZ = Math.sin(angle) * distance;
    } else {
      // New clouds: spawn at edge of render distance and move in
      const spawnDistance = 200;
      // Spawn upwind so they move toward player area
      spawnX = -this.windDirection.x * spawnDistance + (Math.random() - 0.5) * 100;
      spawnZ = -this.windDirection.z * spawnDistance + (Math.random() - 0.5) * 100;
    }
    
    cloudGroup.position.set(spawnX, cloudHeight, spawnZ);
    
    // Better base opacity range for visibility
    const baseOpacity = 0.3 + Math.random() * 0.3; // 0.3 to 0.6 range
    
    // Create cloud object
    const cloud: Cloud = {
      mesh: cloudGroup,
      // Consistent velocity for all clouds
      velocity: new THREE.Vector3(
        this.windDirection.x * 1.2, // Faster movement for visibility
        0,
        this.windDirection.z * 1.2
      ),
      opacity: 0,
      targetOpacity: baseOpacity,
      fadeSpeed: 0.015 + Math.random() * 0.01, // Faster fade transitions
      age: 0,
      maxAge: 40000 + Math.random() * 20000, // 40-60 seconds
      baseOpacity: baseOpacity
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    console.log(`Created cloud at position (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)}) with baseOpacity ${baseOpacity.toFixed(2)}`);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Spawn new clouds periodically
    if (this.spawnTimer >= this.spawnInterval && this.clouds.length < 10) {
      this.createCloud(false);
      this.spawnTimer = 0;
      console.log(`Spawned new cloud, total clouds: ${this.clouds.length}`);
    }
    
    // Update existing clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      
      // Update position - movement happens here
      const movement = cloud.velocity.clone().multiplyScalar(deltaTime);
      cloud.mesh.position.add(movement);
      
      // Update age
      cloud.age += deltaTime * 1000;
      
      // Calculate distance-based opacity if player position is provided
      let distanceFactor = 1.0;
      if (playerPosition) {
        const distance = cloud.mesh.position.distanceTo(playerPosition);
        
        console.log(`Cloud ${i} distance from player: ${distance.toFixed(1)}, fadeIn: ${this.fadeInDistance}, fadeOut: ${this.fadeOutDistance}`);
        
        if (distance > this.fadeOutDistance) {
          // Fade out when far from player
          distanceFactor = 0;
        } else if (distance > this.fadeInDistance) {
          // Gradual fade between fadeIn and fadeOut distances
          const fadeRange = this.fadeOutDistance - this.fadeInDistance;
          const fadeProgress = (distance - this.fadeInDistance) / fadeRange;
          distanceFactor = 1 - fadeProgress;
        }
        // If distance <= fadeInDistance, distanceFactor remains 1.0 (fully visible)
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
      
      // Debug logging for first cloud
      if (i === 0 && Math.random() < 0.05) { // Occasional logging
        console.log(`Cloud 0 - Position: (${cloud.mesh.position.x.toFixed(1)}, ${cloud.mesh.position.z.toFixed(1)}), Distance: ${playerPosition ? cloud.mesh.position.distanceTo(playerPosition).toFixed(1) : 'N/A'}, Opacity: ${cloud.opacity.toFixed(3)}, Target: ${cloud.targetOpacity.toFixed(3)}, DistFactor: ${distanceFactor.toFixed(2)}, AgeFactor: ${ageFactor.toFixed(2)}`);
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
        if (distanceFromPlayer > 250) {
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
          console.log(`Removed distant cloud, remaining: ${this.clouds.length}`);
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
