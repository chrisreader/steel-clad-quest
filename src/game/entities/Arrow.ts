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
  private gravity: number = -9.8;
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
    this.velocity = direction.clone().multiplyScalar(speed);
    this.damage = damage;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    this.mesh = this.createArrowMesh();
    this.createTrailEffect();
    this.scene.add(this.mesh);
    
    // Play arrow shoot sound
    this.audioManager.play('arrow_shoot');
  }

  private createArrowMesh(): THREE.Group {
    const arrowGroup = new THREE.Group();
    
    // Arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
    const shaftMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.z = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head
    const headGeometry = new THREE.ConeGeometry(0.05, 0.15);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 0.475;
    head.rotation.z = -Math.PI / 2;
    arrowGroup.add(head);
    
    // Fletching (feathers)
    const fletchingGeometry = new THREE.PlaneGeometry(0.1, 0.15);
    const fletchingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    
    for (let i = 0; i < 3; i++) {
      const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
      fletching.position.x = -0.3;
      fletching.rotation.y = (i * Math.PI * 2) / 3;
      arrowGroup.add(fletching);
    }
    
    return arrowGroup;
  }

  private createTrailEffect(): void {
    const particleCount = 20;
    const particles = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      particles[i * 3] = 0;
      particles[i * 3 + 1] = 0;
      particles[i * 3 + 2] = 0;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });
    
    this.trail = new THREE.Points(geometry, material);
    this.scene.add(this.trail);
  }

  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;
    
    if (this.isGrounded) {
      this.groundTimer += deltaTime * 1000;
      if (this.groundTimer >= this.maxGroundTime) {
        this.dispose();
        return false;
      }
      return true;
    }
    
    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;
    
    // Update position
    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
    this.position.add(deltaPosition);
    
    // Update mesh position and rotation
    this.mesh.position.copy(this.position);
    
    // Point arrow in direction of travel
    const direction = this.velocity.clone().normalize();
    this.mesh.lookAt(this.position.clone().add(direction));
    
    // Update trail effect
    this.updateTrail();
    
    // Check ground collision (simple y = 0 ground)
    if (this.position.y <= 0) {
      this.hitGround();
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
    this.isGrounded = true;
    this.velocity.set(0, 0, 0);
    this.position.y = 0;
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
