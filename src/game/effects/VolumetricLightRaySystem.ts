
import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export class VolumetricLightRaySystem {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private lightRays: THREE.Mesh[] = [];
  private shadowVolumes: THREE.Mesh[] = [];
  private rayGroup: THREE.Group;
  private isEnabled: boolean = true;
  
  // Ray configuration
  private readonly RAY_COUNT = 12;
  private readonly RAY_LENGTH = 100;
  private readonly RAY_RADIUS = 0.5;
  private readonly RAY_SPREAD = 8; // degrees
  private readonly COLLISION_RAY_COUNT = 8;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.rayGroup = new THREE.Group();
    this.rayGroup.name = 'VolumetricLightRays';
    this.scene.add(this.rayGroup);
    
    console.log('🌟 VolumetricLightRaySystem initialized - realistic sun/moon rays with collision shadows');
  }
  
  public update(
    sunPosition: THREE.Vector3,
    moonPosition: THREE.Vector3,
    timeOfDay: number,
    playerPosition: THREE.Vector3
  ): void {
    if (!this.isEnabled) return;
    
    // Clear existing rays
    this.clearRays();
    
    // Determine which celestial body is active
    const sunElevation = this.calculateElevation(sunPosition);
    const moonElevation = this.calculateElevation(moonPosition);
    
    if (sunElevation > 0) {
      // Sun is above horizon - create sun rays
      this.createSunRays(sunPosition, timeOfDay, playerPosition);
    } else if (moonElevation > 0) {
      // Moon is above horizon - create moon rays
      this.createMoonRays(moonPosition, timeOfDay, playerPosition);
    }
  }
  
  private createSunRays(sunPosition: THREE.Vector3, timeOfDay: number, playerPosition: THREE.Vector3): void {
    const sunDirection = sunPosition.clone().normalize();
    const elevation = this.calculateElevation(sunPosition);
    
    // Sun ray color based on time of day
    let rayColor: THREE.Color;
    if (timeOfDay < 0.25 || timeOfDay > 0.75) {
      // Sunrise/sunset - warm golden orange
      rayColor = new THREE.Color(0xFF8C42);
    } else {
      // Midday - bright white/yellow
      rayColor = new THREE.Color(0xFFFACD);
    }
    
    // Ray intensity based on elevation
    const intensity = Math.max(0.1, elevation * 0.8);
    
    this.createRayCluster(sunPosition, sunDirection, rayColor, intensity, playerPosition, 'sun');
  }
  
  private createMoonRays(moonPosition: THREE.Vector3, timeOfDay: number, playerPosition: THREE.Vector3): void {
    const moonDirection = moonPosition.clone().normalize();
    const elevation = this.calculateElevation(moonPosition);
    
    // Moon ray color - cool blue/silver
    const rayColor = new THREE.Color(0x87CEEB);
    
    // Moon rays are much dimmer
    const intensity = Math.max(0.05, elevation * 0.3);
    
    this.createRayCluster(moonPosition, moonDirection, rayColor, intensity, playerPosition, 'moon');
  }
  
  private createRayCluster(
    celestialPosition: THREE.Vector3,
    direction: THREE.Vector3,
    color: THREE.Color,
    intensity: number,
    playerPosition: THREE.Vector3,
    type: 'sun' | 'moon'
  ): void {
    // Create multiple rays spread around the celestial body direction
    for (let i = 0; i < this.RAY_COUNT; i++) {
      const angle = (i / this.RAY_COUNT) * Math.PI * 2;
      const spreadX = Math.cos(angle) * this.RAY_SPREAD * (Math.PI / 180);
      const spreadZ = Math.sin(angle) * this.RAY_SPREAD * (Math.PI / 180);
      
      // Create slightly angled ray direction
      const rayDirection = direction.clone();
      rayDirection.x += spreadX;
      rayDirection.z += spreadZ;
      rayDirection.normalize();
      
      // Start ray from high altitude position
      const rayStart = celestialPosition.clone().multiplyScalar(50);
      const rayEnd = rayStart.clone().add(rayDirection.clone().multiplyScalar(-this.RAY_LENGTH));
      
      // Check for collisions along this ray path
      const shadowData = this.calculateRayShadows(rayStart, rayEnd, playerPosition);
      
      // Create the light ray geometry
      this.createSingleRay(rayStart, rayEnd, color, intensity, shadowData, type);
    }
  }
  
  private calculateRayShadows(rayStart: THREE.Vector3, rayEnd: THREE.Vector3, playerPosition: THREE.Vector3): any[] {
    const shadowSegments: any[] = [];
    const rayDirection = rayEnd.clone().sub(rayStart).normalize();
    const rayDistance = rayStart.distanceTo(rayEnd);
    
    // Cast multiple collision rays to detect blocking objects
    for (let i = 0; i < this.COLLISION_RAY_COUNT; i++) {
      const testDistance = (i / this.COLLISION_RAY_COUNT) * rayDistance;
      const testPosition = rayStart.clone().add(rayDirection.clone().multiplyScalar(testDistance));
      
      // Use PhysicsManager's raycasting to detect collisions
      const raycaster = new THREE.Raycaster(testPosition, rayDirection, 0, rayDistance - testDistance);
      
      // Check collision with environment objects
      const collisionObjects = Array.from(this.physicsManager.getCollisionObjects().values());
      const intersectableMeshes = collisionObjects
        .filter(obj => obj.type !== 'player' && obj.type !== 'projectile')
        .map(obj => obj.mesh)
        .filter(mesh => mesh instanceof THREE.Mesh || mesh instanceof THREE.Group);
      
      if (intersectableMeshes.length > 0) {
        const intersections = raycaster.intersectObjects(intersectableMeshes, true);
        
        if (intersections.length > 0) {
          const hit = intersections[0];
          const shadowStart = testDistance;
          const shadowEnd = Math.min(testDistance + 5, rayDistance); // 5 unit shadow length
          
          shadowSegments.push({
            start: shadowStart,
            end: shadowEnd,
            object: hit.object,
            position: hit.point
          });
          
          console.log(`🌫️ Ray shadow cast by ${hit.object.name || 'object'} at distance ${testDistance.toFixed(1)}`);
        }
      }
    }
    
    return shadowSegments;
  }
  
  private createSingleRay(
    rayStart: THREE.Vector3,
    rayEnd: THREE.Vector3,
    color: THREE.Color,
    intensity: number,
    shadowData: any[],
    type: 'sun' | 'moon'
  ): void {
    const rayDirection = rayEnd.clone().sub(rayStart);
    const rayLength = rayDirection.length();
    rayDirection.normalize();
    
    // Create ray geometry (cylinder along ray path)
    const geometry = new THREE.CylinderGeometry(this.RAY_RADIUS, this.RAY_RADIUS * 1.5, rayLength, 8);
    
    // Create ray material with transparency and glow
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity * 0.3,
      fog: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const ray = new THREE.Mesh(geometry, material);
    
    // Position ray
    const midPoint = rayStart.clone().add(rayEnd).multiplyScalar(0.5);
    ray.position.copy(midPoint);
    
    // Orient ray along direction
    ray.lookAt(rayEnd);
    ray.rotateX(Math.PI / 2); // Cylinder default is Y-up, we want Z-forward
    
    // Apply shadows by modifying opacity along ray
    this.applyShadowsToRay(ray, shadowData, rayLength);
    
    ray.userData = {
      type: `${type}_ray`,
      celestialBody: type,
      intensity: intensity,
      originalOpacity: material.opacity
    };
    
    this.lightRays.push(ray);
    this.rayGroup.add(ray);
  }
  
  private applyShadowsToRay(ray: THREE.Mesh, shadowData: any[], rayLength: number): void {
    // If there are shadows, reduce opacity in those areas
    if (shadowData.length > 0) {
      const material = ray.material as THREE.MeshBasicMaterial;
      
      // Calculate average shadow coverage
      let shadowCoverage = 0;
      shadowData.forEach(shadow => {
        const shadowLength = shadow.end - shadow.start;
        shadowCoverage += shadowLength / rayLength;
      });
      
      // Reduce opacity based on shadow coverage
      shadowCoverage = Math.min(shadowCoverage, 0.8); // Max 80% shadow
      material.opacity *= (1 - shadowCoverage);
      
      console.log(`🌫️ Applied ${(shadowCoverage * 100).toFixed(1)}% shadow coverage to ${ray.userData.celestialBody} ray`);
    }
  }
  
  private calculateElevation(position: THREE.Vector3): number {
    // Calculate elevation angle from horizon (0 = horizon, 1 = zenith)
    const normalized = position.clone().normalize();
    return Math.max(0, normalized.y);
  }
  
  private clearRays(): void {
    // Remove all existing rays and shadows
    this.lightRays.forEach(ray => {
      if (ray.geometry) ray.geometry.dispose();
      if (ray.material) {
        if (Array.isArray(ray.material)) {
          ray.material.forEach(mat => mat.dispose());
        } else {
          ray.material.dispose();
        }
      }
      this.rayGroup.remove(ray);
    });
    
    this.shadowVolumes.forEach(shadow => {
      if (shadow.geometry) shadow.geometry.dispose();
      if (shadow.material) {
        if (Array.isArray(shadow.material)) {
          shadow.material.forEach(mat => mat.dispose());
        } else {
          shadow.material.dispose();
        }
      }
      this.rayGroup.remove(shadow);
    });
    
    this.lightRays = [];
    this.shadowVolumes = [];
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.rayGroup.visible = enabled;
    
    if (!enabled) {
      this.clearRays();
    }
    
    console.log(`🌟 VolumetricLightRaySystem ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  public dispose(): void {
    this.clearRays();
    this.scene.remove(this.rayGroup);
    console.log('🌟 VolumetricLightRaySystem disposed');
  }
}
