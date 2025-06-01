
import * as THREE from 'three';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';

export class Arrow {
  private mesh: THREE.Group;
  private velocity: THREE.Vector3;
  private position: THREE.Vector3;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private isActive: boolean = true;
  private isGrounded: boolean = false;
  private groundTimer: number = 0;
  private maxGroundTime: number = 60000; // 60 seconds
  private gravity: number = -9.8; // Standard gravity
  private damage: number;
  private trail: THREE.Points | null = null;
  
  // Enhanced flight tracking
  private flightTime: number = 0;
  private minFlightTime: number = 0.2; // Increased minimum flight time
  private maxFlightTime: number = 10.0; // Maximum flight time before cleanup
  private hasMovedSignificantly: boolean = false;
  private initialPosition: THREE.Vector3;
  
  // Debug visualization
  private debugArrow: THREE.ArrowHelper | null = null;
  private debugSpheres: THREE.Mesh[] = [];
  private debug: boolean = true; // Enable for troubleshooting

  constructor(
    scene: THREE.Scene,
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.damage = damage;
    
    // Fix #1: Ensure direction is normalized before applying speed
    if (direction.lengthSq() < 0.001) {
      console.error("🏹 [Arrow] Direction vector is too small!");
      direction = new THREE.Vector3(0, 0, -1); // Default forward direction
    }
    
    // Normalize and scale by speed to get velocity
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    
    // Fix starting position - ensure it's well above ground
    this.position = startPosition.clone();
    this.initialPosition = startPosition.clone();
    if (this.position.y < 0) {
      this.position.y = 1.5; // Ensure it starts well above ground
    }
    
    console.log("🏹 [Arrow] *** CREATING ARROW WITH FIXED ORIENTATION ***");
    console.log("🏹 [Arrow] Start position:", this.position);
    console.log("🏹 [Arrow] Direction:", direction);
    console.log("🏹 [Arrow] Speed:", speed);
    console.log("🏹 [Arrow] Initial velocity:", this.velocity);
    console.log("🏹 [Arrow] Velocity magnitude:", this.velocity.length());
    
    this.mesh = this.createArrowMesh();
    this.createTrailEffect();
    this.scene.add(this.mesh);
    
    // Position and orient the arrow
    this.mesh.position.copy(this.position);
    this.updateRotationWithQuaternion();
    
    // Create debug visualization
    if (this.debug) {
      this.createDebugVisualization(direction);
    }
    
    console.log("🏹 [Arrow] ✅ ARROW CREATED WITH FIXED ORIENTATION AND DEBUG");
    
    // Play arrow shoot sound
    this.audioManager.play('arrow_shoot');
  }

  private createArrowMesh(): THREE.Group {
    const arrowGroup = new THREE.Group();
    
    const scale = 0.8;
    
    // Arrow shaft - FIXED: align along Z-axis instead of X-axis
    const shaftGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 1.0 * scale);
    const shaftMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      emissive: 0x2d1810,
      emissiveIntensity: 0.1
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2; // FIXED: rotate to align with Z-axis
    arrowGroup.add(shaft);
    
    // Arrow head - FIXED: position along Z-axis
    const headGeometry = new THREE.ConeGeometry(0.08 * scale, 0.2 * scale);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xC0C0C0,
      emissive: 0x333333,
      emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.z = 0.5 * scale; // FIXED: position at front along Z-axis
    head.rotation.x = -Math.PI / 2; // Point forward along Z-axis
    arrowGroup.add(head);
    
    // Fletching - positioned at back of arrow
    const fletchingGeometry = new THREE.PlaneGeometry(0.15 * scale, 0.2 * scale);
    const fletchingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x654321,
      side: THREE.DoubleSide,
      emissive: 0x1a1105,
      emissiveIntensity: 0.1
    });
    
    for (let i = 0; i < 3; i++) {
      const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
      fletching.position.z = -0.4 * scale; // FIXED: position at back along Z-axis
      fletching.rotation.y = (i * Math.PI * 2) / 3;
      arrowGroup.add(fletching);
    }
    
    // Nock
    const nockGeometry = new THREE.SphereGeometry(0.03 * scale, 6, 6);
    const nockMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      emissive: 0x2d1810,
      emissiveIntensity: 0.1
    });
    const nock = new THREE.Mesh(nockGeometry, nockMaterial);
    nock.position.z = -0.5 * scale; // FIXED: position at back along Z-axis
    arrowGroup.add(nock);
    
    return arrowGroup;
  }

  private createTrailEffect(): void {
    const particleCount = 50;
    const particles = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      particles[i * 3] = 0;
      particles[i * 3 + 1] = 0;
      particles[i * 3 + 2] = 0;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    
    this.trail = new THREE.Points(geometry, material);
    this.scene.add(this.trail);
  }

  // NEW: Quaternion-based rotation update method
  private updateRotationWithQuaternion(): void {
    // Only update rotation if we have meaningful velocity
    if (this.velocity.lengthSq() > 0.01) {
      // The default "forward" for our arrow model is along positive Z-axis
      const defaultForward = new THREE.Vector3(0, 0, 1);
      
      // Get quaternion to rotate from default forward to our velocity direction
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(defaultForward, this.velocity.clone().normalize());
      
      // Apply the quaternion to the arrow
      this.mesh.quaternion.copy(quaternion);
      
      if (this.debug) {
        console.log(`🏹 [Arrow] Quaternion rotation applied for velocity:`, this.velocity);
      }
    }
  }

  // Create debug visualization
  private createDebugVisualization(direction: THREE.Vector3): void {
    // Create debug arrow helper
    this.debugArrow = new THREE.ArrowHelper(
      direction.clone().normalize(),
      this.position.clone(),
      2.0, // Length
      0xff0000, // Red color
      0.5, // Head length
      0.3  // Head width
    );
    this.scene.add(this.debugArrow);
    
    console.log("🏹 [Arrow] Debug arrow helper created");
  }

  // Add debug sphere at current position
  private addDebugSphere(): void {
    if (!this.debug) return;
    
    const sphereGeometry = new THREE.SphereGeometry(0.05);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(this.position);
    this.scene.add(sphere);
    this.debugSpheres.push(sphere);
    
    // Remove sphere after 5 seconds
    setTimeout(() => {
      this.scene.remove(sphere);
      const index = this.debugSpheres.indexOf(sphere);
      if (index > -1) {
        this.debugSpheres.splice(index, 1);
      }
    }, 5000);
  }

  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;
    
    // Fix #1: Better deltaTime handling - cap it but don't reset small values
    const safeDeltatime = Math.min(deltaTime, 0.1); // Cap at 100ms to prevent huge jumps
    
    // Only process if arrow is active and not grounded
    if (this.isGrounded) {
      this.groundTimer += safeDeltatime * 1000;
      if (this.groundTimer >= this.maxGroundTime) {
        console.log("🏹 [Arrow] Ground timer expired, disposing arrow");
        this.dispose();
        return false;
      }
      return true;
    }
    
    // Increment flight time
    this.flightTime += safeDeltatime;
    
    // Debug logging for first 3 seconds
    if (this.flightTime < 3.0) {
      console.log(`🏹 [Arrow] FLIGHT [${(this.flightTime * 1000).toFixed(0)}ms] pos:(${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)}) vel:(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`);
    }
    
    // Store previous position to track movement
    const previousPosition = this.position.clone();
    
    // Apply physics (simplified for initial testing)
    this.velocity.y += this.gravity * safeDeltatime;
    
    // Update position based on velocity
    const deltaPosition = this.velocity.clone().multiplyScalar(safeDeltatime);
    this.position.add(deltaPosition);
    
    // Track if arrow has moved significantly from start
    const distanceFromStart = this.position.distanceTo(this.initialPosition);
    if (distanceFromStart > 0.5) {
      this.hasMovedSignificantly = true;
    }
    
    // Update mesh position immediately
    this.mesh.position.copy(this.position);
    
    // Update arrow rotation to match trajectory
    this.updateRotationWithQuaternion();
    
    // Update trail effect
    this.updateTrail();
    
    // Update debug visualization
    if (this.debug) {
      if (this.debugArrow) {
        this.debugArrow.position.copy(this.position);
        this.debugArrow.setDirection(this.velocity.clone().normalize());
      }
      
      // Add debug sphere every 10 frames
      if (Math.floor(this.flightTime * 60) % 10 === 0) {
        this.addDebugSphere();
      }
    }
    
    // Fix #2: Improved ground collision check
    const groundPlaneY = -1.0;
    const canHitGround = this.flightTime >= this.minFlightTime && this.hasMovedSignificantly;
    if (canHitGround && this.position.y <= groundPlaneY) {
      console.log(`🏹 [Arrow] Hit ground after ${(this.flightTime * 1000).toFixed(0)}ms flight at Y:${this.position.y}`);
      this.hitGround();
      return true;
    }
    
    // Check for max flight time
    if (this.flightTime > this.maxFlightTime) {
      console.log("🏹 [Arrow] Max flight time reached, disposing arrow");
      this.dispose();
      return false;
    }
    
    // Verify movement occurred
    const movementDistance = this.position.distanceTo(previousPosition);
    if (this.flightTime < 3.0 && movementDistance > 0) {
      console.log(`🏹 [Arrow] ✅ MOVED ${movementDistance.toFixed(4)} units this frame`);
    } else if (this.flightTime < 3.0 && movementDistance === 0) {
      console.warn(`🏹 [Arrow] ⚠️ NO MOVEMENT this frame - potential issue!`);
    }
    
    return true;
  }

  private updateTrail(): void {
    if (!this.trail) return;
    
    const positions = this.trail.geometry.attributes.position.array as Float32Array;
    
    // Shift trail positions
    for (let i = positions.length - 3; i > 2; i -= 3) {
      positions[i] = positions[i - 3];
      positions[i + 1] = positions[i - 2];
      positions[i + 2] = positions[i - 1];
    }
    
    // Add current position to trail
    positions[0] = this.position.x;
    positions[1] = this.position.y;
    positions[2] = this.position.z;
    
    this.trail.geometry.attributes.position.needsUpdate = true;
  }

  private hitGround(): void {
    console.log("🏹 [Arrow] *** ARROW HIT GROUND ***");
    console.log("🏹 [Arrow] Final position:", this.position);
    console.log("🏹 [Arrow] Flight duration:", this.flightTime);
    
    this.isGrounded = true;
    this.velocity.set(0, 0, 0);
    this.position.y = -1.0;
    this.mesh.position.copy(this.position);
    
    // Remove trail effect
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail = null;
    }
    
    // Play impact sound
    this.audioManager.play('arrow_impact');
    
    // Create dust effect
    this.effectsManager.createDustCloud(this.position);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getDamage(): number {
    return this.damage;
  }

  public isArrowActive(): boolean {
    return this.isActive && !this.isGrounded;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public dispose(): void {
    this.isActive = false;
    
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail.geometry.dispose();
      if (Array.isArray(this.trail.material)) {
        this.trail.material.forEach(material => material.dispose());
      } else {
        this.trail.material.dispose();
      }
    }
    
    // Clean up debug objects
    if (this.debugArrow) {
      this.scene.remove(this.debugArrow);
      this.debugArrow = null;
    }
    
    this.debugSpheres.forEach(sphere => {
      this.scene.remove(sphere);
    });
    this.debugSpheres = [];
  }
}
