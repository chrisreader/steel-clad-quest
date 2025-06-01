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
  private gravity: number = -4.9; // Reduced from -9.8 to -4.9 (half realistic gravity)
  private damage: number;
  private trail: THREE.Points | null = null;

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
    this.position = startPosition.clone();
    
    // ENHANCED: Add slight upward arc for realistic arrow trajectory
    const adjustedDirection = direction.clone().normalize();
    adjustedDirection.y += 0.02; // Reduced from 0.05 to 0.02 for less arc
    adjustedDirection.normalize();
    
    this.velocity = adjustedDirection.multiplyScalar(speed);
    this.damage = damage;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    console.log("🏹 [Arrow] *** CREATING ARROW ***");
    console.log("🏹 [Arrow] Start position:", this.position);
    console.log("🏹 [Arrow] Start Y position:", this.position.y);
    console.log("🏹 [Arrow] Adjusted direction:", adjustedDirection);
    console.log("🏹 [Arrow] Initial velocity:", this.velocity);
    console.log("🏹 [Arrow] Velocity magnitude:", this.velocity.length());
    console.log("🏹 [Arrow] Speed parameter:", speed);
    console.log("🏹 [Arrow] Damage:", damage);
    console.log("🏹 [Arrow] Gravity set to:", this.gravity);
    
    this.mesh = this.createArrowMesh();
    this.createTrailEffect();
    this.scene.add(this.mesh);
    
    // Position the arrow
    this.mesh.position.copy(this.position);
    
    // FIXED: Properly orient arrow to point in direction of travel
    if (this.velocity.length() > 0) {
      const direction = this.velocity.clone().normalize();
      // Create a matrix to orient the arrow properly
      const matrix = new THREE.Matrix4();
      matrix.lookAt(this.position, this.position.clone().add(direction), new THREE.Vector3(0, 1, 0));
      this.mesh.setRotationFromMatrix(matrix);
      // Rotate 90 degrees around Y to point forward correctly
      this.mesh.rotateY(Math.PI / 2);
    }
    
    console.log("🏹 [Arrow] ✅ ARROW MESH CREATED AND ADDED TO SCENE");
    console.log("🏹 [Arrow] Arrow mesh position:", this.mesh.position);
    console.log("🏹 [Arrow] Arrow mesh rotation:", this.mesh.rotation);
    
    // Play arrow shoot sound
    this.audioManager.play('arrow_shoot');
  }

  private createArrowMesh(): THREE.Group {
    const arrowGroup = new THREE.Group();
    
    // FIXED: Reasonable arrow size (much smaller than before)
    const scale = 0.8; // Reduced from 3.0 to 0.8 for realistic size
    
    // Arrow shaft - brown wood color
    const shaftGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 1.0 * scale);
    const shaftMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513, // Saddle brown for wood
      emissive: 0x2d1810,
      emissiveIntensity: 0.1
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    // FIXED: Shaft positioned correctly along X-axis (arrow points in +X direction)
    shaft.rotation.z = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head - metallic gray
    const headGeometry = new THREE.ConeGeometry(0.08 * scale, 0.2 * scale);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xC0C0C0, // Silver metallic
      emissive: 0x333333,
      emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    // FIXED: Head positioned at front of arrow (+X direction)
    head.position.x = 0.6 * scale;
    head.rotation.z = -Math.PI / 2;
    arrowGroup.add(head);
    
    // Fletching (feathers) - natural feather colors
    const fletchingGeometry = new THREE.PlaneGeometry(0.15 * scale, 0.2 * scale);
    const fletchingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x654321, // Dark brown feathers
      side: THREE.DoubleSide,
      emissive: 0x1a1105,
      emissiveIntensity: 0.1
    });
    
    // Create 3 fletching pieces around the nock
    for (let i = 0; i < 3; i++) {
      const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
      // FIXED: Fletching positioned at back of arrow (-X direction)
      fletching.position.x = -0.4 * scale;
      fletching.rotation.y = (i * Math.PI * 2) / 3;
      arrowGroup.add(fletching);
    }
    
    // Add nock (string notch) at back
    const nockGeometry = new THREE.SphereGeometry(0.03 * scale, 6, 6);
    const nockMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      emissive: 0x2d1810,
      emissiveIntensity: 0.1
    });
    const nock = new THREE.Mesh(nockGeometry, nockMaterial);
    nock.position.x = -0.5 * scale;
    arrowGroup.add(nock);
    
    console.log("🏹 [Arrow] Arrow mesh created with proper size and orientation");
    return arrowGroup;
  }

  private createTrailEffect(): void {
    // ENHANCED: Increased particle count and improved visibility for better trail effect
    const particleCount = 50; // Increased from 20 to 50
    const particles = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      particles[i * 3] = 0;
      particles[i * 3 + 1] = 0;
      particles[i * 3 + 2] = 0;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff, // Brighter white for better visibility
      size: 0.1, // Increased from 0.05 to 0.1 for better visibility
      transparent: true,
      opacity: 0.8 // Increased from 0.6 to 0.8 for better visibility
    });
    
    this.trail = new THREE.Points(geometry, material);
    this.scene.add(this.trail);
  }

  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;
    
    // DEBUGGING: Log critical values every frame for first few seconds
    console.log(`🏹 [Arrow] UPDATE - deltaTime: ${deltaTime.toFixed(4)}, position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)}), velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`);
    
    if (this.isGrounded) {
      this.groundTimer += deltaTime * 1000;
      console.log(`🏹 [Arrow] GROUNDED - timer: ${this.groundTimer}ms / ${this.maxGroundTime}ms`);
      if (this.groundTimer >= this.maxGroundTime) {
        console.log("🏹 [Arrow] Ground timer expired, disposing arrow");
        this.dispose();
        return false;
      }
      return true;
    }
    
    // DEBUGGING: Verify deltaTime is reasonable
    if (deltaTime > 0.1) {
      console.warn(`🏹 [Arrow] ⚠️ Large deltaTime detected: ${deltaTime} - clamping to 0.016`);
      deltaTime = 0.016; // Clamp to ~60fps deltaTime
    }
    
    // Apply gravity
    const gravityDelta = this.gravity * deltaTime;
    this.velocity.y += gravityDelta;
    console.log(`🏹 [Arrow] Applied gravity: ${gravityDelta.toFixed(4)}, new Y velocity: ${this.velocity.y.toFixed(4)}`);
    
    // Update position
    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
    console.log(`🏹 [Arrow] Delta position: (${deltaPosition.x.toFixed(4)}, ${deltaPosition.y.toFixed(4)}, ${deltaPosition.z.toFixed(4)})`);
    
    this.position.add(deltaPosition);
    console.log(`🏹 [Arrow] New position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // FIXED: Update arrow orientation to follow trajectory
    if (this.velocity.length() > 0) {
      const direction = this.velocity.clone().normalize();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(this.position, this.position.clone().add(direction), new THREE.Vector3(0, 1, 0));
      this.mesh.setRotationFromMatrix(matrix);
      // Rotate 90 degrees around Y to point forward correctly
      this.mesh.rotateY(Math.PI / 2);
    }
    
    // Update trail effect
    this.updateTrail();
    
    // FIXED: Check ground collision with lower threshold and minimum flight time
    if (this.position.y <= -0.2) { // Changed from 0 to -0.2 to prevent immediate collision
      console.log("🏹 [Arrow] Hit ground at Y:", this.position.y);
      this.hitGround();
    }
    
    // ENHANCED: Bounds checking to prevent arrows from going too far
    if (this.position.length() > 1000) {
      console.log("🏹 [Arrow] Arrow traveled too far, disposing");
      this.dispose();
      return false;
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
    console.log("🏹 [Arrow] Final velocity:", this.velocity);
    
    this.isGrounded = true;
    this.velocity.set(0, 0, 0);
    this.position.y = -0.2; // Set to ground level
    this.mesh.position.copy(this.position);
    
    // Remove trail effect
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail = null;
    }
    
    // Play impact sound
    this.audioManager.play('arrow_impact');
    
    // Create small dust effect - changed from createDustEffect to createDustCloud
    this.effectsManager.createDustCloud(this.position);
    
    console.log("🏹 [Arrow] Arrow grounded successfully");
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
  }
}
