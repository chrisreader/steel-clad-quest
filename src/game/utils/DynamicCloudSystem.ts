
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
  private spawnInterval: number = 2000; // 2 seconds
  
  // Distance-based fade settings
  private fadeInDistance: number = 150;
  private fadeOutDistance: number = 200;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Unified wind direction - all clouds move the same way
    this.windDirection = new THREE.Vector3(0.8, 0, 0.3).normalize();
    
    // Create cloud material with much higher transparency
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2, // Much more transparent
      fog: false // Don't let fog affect clouds
    });
    
    console.log('DynamicCloudSystem initialized with unified movement and distance fading');
  }
  
  public initialize(): void {
    // Create initial clouds
    for (let i = 0; i < 8; i++) {
      this.createCloud();
    }
  }
  
  private createCloud(): void {
    // Create cloud geometry using multiple spheres
    const cloudGroup = new THREE.Group();
    
    // Create multiple cloud puffs
    const puffCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffCount; i++) {
      const puffGeometry = new THREE.SphereGeometry(
        8 + Math.random() * 6, // Random size
        16, 12
      );
      const puffMesh = new THREE.Mesh(puffGeometry, this.cloudMaterial.clone());
      
      // Position puffs to create cloud shape
      puffMesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 12
      );
      
      puffMesh.scale.y = 0.6; // Flatten clouds slightly
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky
    const cloudHeight = 40 + Math.random() * 20;
    const spawnDistance = 200;
    cloudGroup.position.set(
      (Math.random() - 0.5) * spawnDistance * 2,
      cloudHeight,
      (Math.random() - 0.5) * spawnDistance * 2
    );
    
    // Base opacity is much lower and more consistent
    const baseOpacity = 0.1 + Math.random() * 0.2; // 0.1 to 0.3 range
    
    // Create cloud object
    const cloud: Cloud = {
      mesh: cloudGroup,
      // Unified velocity - all clouds move in same direction at same speed
      velocity: new THREE.Vector3(
        this.windDirection.x * 0.7, // Consistent speed
        0,
        this.windDirection.z * 0.7
      ),
      opacity: 0,
      targetOpacity: baseOpacity,
      fadeSpeed: 0.002 + Math.random() * 0.003,
      age: 0,
      maxAge: 30000 + Math.random() * 20000, // 30-50 seconds
      baseOpacity: baseOpacity
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Spawn new clouds periodically
    if (this.spawnTimer >= this.spawnInterval && this.clouds.length < 12) {
      this.createCloud();
      this.spawnTimer = 0;
    }
    
    // Update existing clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      
      // Update position
      cloud.mesh.position.add(cloud.velocity.clone().multiplyScalar(deltaTime));
      
      // Update age
      cloud.age += deltaTime * 1000;
      
      // Calculate distance-based opacity if player position is provided
      let distanceFactor = 1.0;
      if (playerPosition) {
        const distance = cloud.mesh.position.distanceTo(playerPosition);
        
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
      if (cloud.age < 3000) {
        // Fade in
        ageFactor = cloud.age / 3000;
      } else if (cloud.age > cloud.maxAge - 5000) {
        // Fade out
        const fadeProgress = (cloud.age - (cloud.maxAge - 5000)) / 5000;
        ageFactor = 1 - fadeProgress;
      }
      
      // Combine distance and age factors
      cloud.targetOpacity = cloud.baseOpacity * distanceFactor * ageFactor;
      
      // Smooth opacity transition
      const opacityDiff = cloud.targetOpacity - cloud.opacity;
      cloud.opacity += opacityDiff * cloud.fadeSpeed * (deltaTime * 1000);
      
      // Update material opacity for all child meshes
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = Math.max(0, Math.min(1, cloud.opacity));
        }
      });
      
      // Remove old clouds
      if (cloud.age > cloud.maxAge || cloud.opacity <= 0.01) {
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
      
      // Remove clouds that are too far away
      const distanceFromCenter = cloud.mesh.position.length();
      if (distanceFromCenter > 300) {
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
