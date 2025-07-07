
import * as THREE from 'three';
import { RENDER_DISTANCES } from '../config/RenderDistanceConfig';

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
  private baseSpawnInterval: number = 4000; // Base spawn interval
  private currentSpawnInterval: number = 4000;
  
  // Player-centered system variables - IMPROVED VALUES
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerMovementThreshold: number = 3; // Reduced from 10 to 3 for more responsive following
  private playerMovementSpeed: number = 0; // Track player movement speed
  
  // Distance-based fade settings - EXPANDED for better coverage
  private fadeInDistance: number = RENDER_DISTANCES.LOD_FAR; // Use unified config - 600 units
  private fadeOutDistance: number = RENDER_DISTANCES.CLOUDS; // Use unified config - 800 units  
  private maxCloudDistance: number = RENDER_DISTANCES.CLEANUP.CLOUDS; // Use unified config - 1000 units
  
  // Spawn zone settings - EXPANDED
  private minSpawnDistance: number = 150; // Minimum distance from player to spawn
  private maxSpawnDistance: number = 350; // Maximum distance from player to spawn
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Unified wind direction - all clouds move the same way
    this.windDirection = new THREE.Vector3(1.0, 0, 0.5).normalize();
    
    // Create cloud material with reduced opacity for realism
    this.cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      fog: false
    });
    
    console.log('DynamicCloudSystem initialized with IMPROVED player-centered spawning');
    console.log('Movement threshold:', this.playerMovementThreshold, 'units');
    console.log('Spawn zone:', this.minSpawnDistance, '-', this.maxSpawnDistance, 'units from player');
  }
  
  public initialize(playerPosition?: THREE.Vector3): void {
    // Set initial player position if provided
    if (playerPosition) {
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    // Create initial clouds positioned around the player
    for (let i = 0; i < 6; i++) {
      this.createCloud(true, playerPosition);
    }
    console.log(`IMPROVED player-centered cloud sky initialized with ${this.clouds.length} clouds around player`);
  }
  
  private createCloud(isInitial: boolean = false, playerPosition?: THREE.Vector3): void {
    // Create simplified cloud geometry
    const cloudGroup = new THREE.Group();
    
    // Fewer puffs per cloud for realistic individual formations
    const puffCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffCount; i++) {
      const puffGeometry = new THREE.SphereGeometry(
        12 + Math.random() * 10,
        16, 12
      );
      const puffMaterial = this.cloudMaterial.clone();
      const puffMesh = new THREE.Mesh(puffGeometry, puffMaterial);
      
      puffMesh.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 20
      );
      
      puffMesh.scale.y = 0.5;
      puffMesh.scale.x = 1.2;
      cloudGroup.add(puffMesh);
    }
    
    // Position cloud in sky RELATIVE TO PLAYER - IMPROVED DISTRIBUTION
    const cloudHeight = 35 + Math.random() * 15;
    let spawnX, spawnZ;
    
    // FIXED: Require valid player position - no more fallback to spawn point
    if (!playerPosition) {
      console.error('❌ [DynamicCloudSystem] No player position provided for cloud creation');
      playerPosition = new THREE.Vector3(0, 0, 0); // Last resort fallback with warning
    }
    
    // Use player position as the center of the cloud spawning area
    const centerX = playerPosition.x;
    const centerZ = playerPosition.z;
    
    if (isInitial) {
      // Initial clouds: distribute in a circle around the player
      const angle = (Math.random() * Math.PI * 2);
      const distance = this.minSpawnDistance + Math.random() * (this.maxSpawnDistance - this.minSpawnDistance);
      spawnX = centerX + Math.cos(angle) * distance;
      spawnZ = centerZ + Math.sin(angle) * distance;
      console.log(`Initial cloud spawned at distance ${distance.toFixed(1)} from player (${centerX.toFixed(1)}, ${centerZ.toFixed(1)})`);
    } else {
      // New clouds: spawn around player in expanded zone with bias toward upwind
      const angle = Math.random() * Math.PI * 2;
      let distance = this.minSpawnDistance + Math.random() * (this.maxSpawnDistance - this.minSpawnDistance);
      
      // Bias toward upwind direction (opposite of wind) for natural flow
      const upwindBias = Math.random() * 0.5; // 50% chance for upwind bias
      if (upwindBias > 0.3) {
        const upwindAngle = Math.atan2(-this.windDirection.z, -this.windDirection.x);
        const biasedAngle = upwindAngle + (Math.random() - 0.5) * Math.PI; // ±90° from upwind
        spawnX = centerX + Math.cos(biasedAngle) * distance;
        spawnZ = centerZ + Math.sin(biasedAngle) * distance;
        console.log(`New cloud spawned UPWIND at distance ${distance.toFixed(1)} from player (${centerX.toFixed(1)}, ${centerZ.toFixed(1)})`);
      } else {
        spawnX = centerX + Math.cos(angle) * distance;
        spawnZ = centerZ + Math.sin(angle) * distance;
        console.log(`New cloud spawned at distance ${distance.toFixed(1)} from player (${centerX.toFixed(1)}, ${centerZ.toFixed(1)})`);
      }
    }
    
    cloudGroup.position.set(spawnX, cloudHeight, spawnZ);
    
    // Base opacity range for realistic appearance
    const baseOpacity = 0.2 + Math.random() * 0.2;
    
    // Create cloud object
    const cloud: Cloud = {
      mesh: cloudGroup,
      velocity: new THREE.Vector3(
        this.windDirection.x * 3.0,
        0,
        this.windDirection.z * 3.0
      ),
      opacity: isInitial ? 0.05 : 0,
      targetOpacity: baseOpacity,
      fadeSpeed: 0.02 + Math.random() * 0.01,
      age: 0,
      maxAge: 25000 + Math.random() * 15000, // 25-40 seconds
      baseOpacity: baseOpacity,
      fadedOutTime: 0
    };
    
    this.clouds.push(cloud);
    this.scene.add(cloudGroup);
    
    console.log(`Created PLAYER-CENTERED cloud at (${spawnX.toFixed(1)}, ${cloudHeight.toFixed(1)}, ${spawnZ.toFixed(1)})`);
  }
  
  private spawnCloudsAroundPlayer(playerPosition: THREE.Vector3, count: number = 2): void {
    console.log(`IMMEDIATE spawn of ${count} clouds around new player position`);
    for (let i = 0; i < count; i++) {
      this.createCloud(false, playerPosition);
    }
  }
  
  private repositionDistantClouds(playerPosition: THREE.Vector3): void {
    let repositioned = 0;
    this.clouds.forEach(cloud => {
      const distance = cloud.mesh.position.distanceTo(playerPosition);
      if (distance > this.maxCloudDistance * 0.8) { // Reposition clouds at 80% of max distance
        // Move cloud to new position around player
        const angle = Math.random() * Math.PI * 2;
        const newDistance = this.minSpawnDistance + Math.random() * (this.maxSpawnDistance - this.minSpawnDistance);
        
        cloud.mesh.position.x = playerPosition.x + Math.cos(angle) * newDistance;
        cloud.mesh.position.z = playerPosition.z + Math.sin(angle) * newDistance;
        cloud.age = 0; // Reset age for repositioned cloud
        cloud.opacity = 0; // Start faded out and fade in
        repositioned++;
      }
    });
    
    if (repositioned > 0) {
      console.log(`Repositioned ${repositioned} distant clouds around new player position`);
    }
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    this.time += deltaTime;
    this.spawnTimer += deltaTime * 1000;
    
    // Track player movement and adjust spawn behavior
    let shouldRepositionSpawning = false;
    if (playerPosition) {
      const playerMovement = playerPosition.distanceTo(this.lastPlayerPosition);
      this.playerMovementSpeed = playerMovement / deltaTime; // Units per second
      
      if (playerMovement > this.playerMovementThreshold) {
        shouldRepositionSpawning = true;
        console.log(`Player moved ${playerMovement.toFixed(1)} units (speed: ${this.playerMovementSpeed.toFixed(1)} u/s) - REPOSITIONING cloud zone`);
        
        // Immediate response: spawn clouds around new position and reposition distant ones
        this.spawnCloudsAroundPlayer(playerPosition, 2);
        this.repositionDistantClouds(playerPosition);
        
        this.lastPlayerPosition.copy(playerPosition);
      }
      
      // Dynamic spawn rate based on movement speed
      const baseInterval = this.baseSpawnInterval;
      if (this.playerMovementSpeed > 10) {
        // Player moving fast - spawn more frequently
        this.currentSpawnInterval = baseInterval * 0.6; // 40% faster
      } else if (this.playerMovementSpeed > 5) {
        // Player moving moderately - spawn slightly more frequently  
        this.currentSpawnInterval = baseInterval * 0.8; // 20% faster
      } else {
        // Player stationary or slow - normal spawn rate
        this.currentSpawnInterval = baseInterval;
      }
    }
    
    // Spawn new clouds based on dynamic interval - RELATIVE TO PLAYER
    if (this.spawnTimer >= this.currentSpawnInterval && this.clouds.length < 8) {
      this.createCloud(false, playerPosition);
      this.spawnTimer = 0;
      console.log(`Spawned cloud (interval: ${this.currentSpawnInterval}ms), total: ${this.clouds.length}`);
    }
    
    // Update existing clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      
      // Update position - movement happens with wind (INDEPENDENT OF PLAYER)
      const movement = cloud.velocity.clone().multiplyScalar(deltaTime);
      cloud.mesh.position.add(movement);
      
      // Update age
      cloud.age += deltaTime * 1000;
      
      // Calculate distance-based opacity relative to PLAYER POSITION
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
      if (cloud.age < 3000) {
        // Fade in over first 3 seconds
        ageFactor = cloud.age / 3000;
      } else if (cloud.age > cloud.maxAge - 6000) {
        // Fade out over last 6 seconds
        const fadeProgress = (cloud.age - (cloud.maxAge - 6000)) / 6000;
        ageFactor = 1 - fadeProgress;
      }
      
      // Combine distance and age factors
      cloud.targetOpacity = cloud.baseOpacity * distanceFactor * ageFactor;
      
      // Smooth opacity transition
      const opacityDiff = cloud.targetOpacity - cloud.opacity;
      cloud.opacity += opacityDiff * cloud.fadeSpeed * (deltaTime * 60);
      
      // Clamp opacity
      cloud.opacity = Math.max(0, Math.min(1, cloud.opacity));
      
      // Track fade-out time for efficient removal
      if (cloud.opacity <= 0.001) {
        cloud.fadedOutTime += deltaTime * 1000;
      } else {
        cloud.fadedOutTime = 0;
      }
      
      // Update material opacity for all child meshes
      cloud.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = cloud.opacity;
          child.material.transparent = true;
          child.material.needsUpdate = true;
        }
      });
      
      // IMPROVED REMOVAL LOGIC - More aggressive cleanup for player-following
      let shouldRemove = false;
      let removeReason = '';
      
      // 1. Remove clouds that are too far from player (PRIORITY)
      if (playerPosition) {
        const distanceFromPlayer = cloud.mesh.position.distanceTo(playerPosition);
        if (distanceFromPlayer > this.maxCloudDistance) {
          shouldRemove = true;
          removeReason = 'too-far-from-player';
        }
      }
      
      // 2. Remove clouds that have been faded for more than 2 seconds
      if (!shouldRemove && cloud.fadedOutTime > 2000) {
        shouldRemove = true;
        removeReason = 'faded-out-timeout';
      }
      
      // 3. Remove clouds that exceed their maximum age
      if (!shouldRemove && cloud.age > cloud.maxAge) {
        shouldRemove = true;
        removeReason = 'max-age';
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
        console.log(`Removed cloud (${removeReason}) - remaining: ${this.clouds.length}`);
      }
    }
    
    // Debug logging
    if (Math.random() < 0.02) { // Occasional logging
      const activeCloudCount = this.clouds.filter(c => c.opacity > 0.1).length;
      console.log(`PLAYER-CENTERED Cloud System: ${activeCloudCount}/${this.clouds.length} visible clouds, spawn interval: ${this.currentSpawnInterval}ms`);
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
    
    console.log('IMPROVED DynamicCloudSystem disposed');
  }
}
