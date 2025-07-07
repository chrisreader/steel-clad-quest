
import * as THREE from 'three';
import { SpawnableEntity, EntityLifecycleState } from '../../types/SpawnableEntity';

export class CloudEntity implements SpawnableEntity {
  public id: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public age: number = 0;
  public maxAge: number;
  public state: EntityLifecycleState = EntityLifecycleState.SPAWNING;
  public distanceFromPlayer: number = 0;
  
  // Cloud-specific properties
  public velocity: THREE.Vector3;
  public opacity: number = 0;
  public targetOpacity: number;
  public fadeSpeed: number;
  public baseOpacity: number;
  public fadedOutTime: number = 0;
  
  private cloudMaterial: THREE.MeshLambertMaterial;
  
  constructor(cloudMaterial: THREE.MeshLambertMaterial) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.cloudMaterial = cloudMaterial;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.maxAge = 25000 + Math.random() * 15000; // 25-40 seconds
    this.fadeSpeed = 0.02 + Math.random() * 0.01;
    this.baseOpacity = 0.2 + Math.random() * 0.2;
    this.targetOpacity = this.baseOpacity;
  }
  
  public initialize(position: THREE.Vector3): void {
    this.position.copy(position);
    this.mesh.position.copy(position);
    
    // Create cloud geometry
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
      this.mesh.add(puffMesh);
    }
    
    // Set wind velocity
    const windDirection = new THREE.Vector3(1.0, 0, 0.5).normalize();
    this.velocity.copy(windDirection.multiplyScalar(3.0));
    
    this.state = EntityLifecycleState.ACTIVE;
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Update age
    this.age += deltaTime * 1000;
    
    // Move with wind
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    this.mesh.position.add(movement);
    this.position.copy(this.mesh.position);
    
    // Calculate distance-based opacity
    const fadeInDistance = 200;
    const fadeOutDistance = 300;
    
    let distanceFactor = 1.0;
    if (this.distanceFromPlayer > fadeOutDistance) {
      distanceFactor = 0;
    } else if (this.distanceFromPlayer > fadeInDistance) {
      const fadeRange = fadeOutDistance - fadeInDistance;
      const fadeProgress = (this.distanceFromPlayer - fadeInDistance) / fadeRange;
      distanceFactor = 1 - fadeProgress;
    }
    
    // Handle age-based fade
    let ageFactor = 1.0;
    if (this.age < 3000) {
      ageFactor = this.age / 3000;
    } else if (this.age > this.maxAge - 6000) {
      const fadeProgress = (this.age - (this.maxAge - 6000)) / 6000;
      ageFactor = 1 - fadeProgress;
    }
    
    // Combine factors
    this.targetOpacity = this.baseOpacity * distanceFactor * ageFactor;
    
    // Smooth opacity transition
    const opacityDiff = this.targetOpacity - this.opacity;
    this.opacity += opacityDiff * this.fadeSpeed * (deltaTime * 60);
    this.opacity = Math.max(0, Math.min(1, this.opacity));
    
    // Track fade-out time
    if (this.opacity <= 0.001) {
      this.fadedOutTime += deltaTime * 1000;
      if (this.fadedOutTime > 2000) {
        this.state = EntityLifecycleState.DEAD;
      }
    } else {
      this.fadedOutTime = 0;
    }
    
    // Update material opacity
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        child.material.opacity = this.opacity;
        child.material.transparent = true;
        child.material.needsUpdate = true;
      }
    });
    
    // Check if should be removed
    if (this.age > this.maxAge) {
      this.state = EntityLifecycleState.DEAD;
    }
  }
  
  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.mesh.clear();
  }
}
