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
  private maxGroundTime: number = 60000;
  private gravity: number = -9.8;
  private damage: number;
  private trail: THREE.Line | null = null;
  private trailPositions: THREE.Vector3[] = [];
  private maxTrailLength: number = 15;
  
  private flightTime: number = 0;
  private minFlightTime: number = 0.2;
  private maxFlightTime: number = 10.0;
  private hasMovedSignificantly: boolean = false;
  private initialPosition: THREE.Vector3;

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
    
    if (direction.lengthSq() < 0.001) {
      direction = new THREE.Vector3(0, 0, -1);
    }
    
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    
    this.position = startPosition.clone();
    this.initialPosition = startPosition.clone();
    if (this.position.y < 0) {
      this.position.y = 1.5;
    }
    
    this.mesh = this.createArrowMesh();
    this.createTrailEffect();
    this.scene.add(this.mesh);
    
    this.mesh.position.copy(this.position);
    this.updateRotationWithQuaternion();
    
    this.audioManager.play('arrow_shoot');
  }

  private createArrowMesh(): THREE.Group {
    const arrowGroup = new THREE.Group();
    
    const scale = 0.8;
    
    // Arrow shaft - aligned along Z-axis
    const shaftGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 1.0 * scale);
    const shaftMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      emissive: 0x2d1810,
      emissiveIntensity: 0.1
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head - positioned along Z-axis and flipped to point forward
    const headGeometry = new THREE.ConeGeometry(0.08 * scale, 0.2 * scale);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xC0C0C0,
      emissive: 0x333333,
      emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.z = 0.5 * scale;
    head.rotation.x = Math.PI / 2; // Flipped to point forward
    arrowGroup.add(head);
    
    // Fletching
    const fletchingGeometry = new THREE.PlaneGeometry(0.15 * scale, 0.2 * scale);
    const fletchingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x654321,
      side: THREE.DoubleSide,
      emissive: 0x1a1105,
      emissiveIntensity: 0.1
    });
    
    for (let i = 0; i < 3; i++) {
      const fletching = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
      fletching.position.z = -0.4 * scale;
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
    nock.position.z = -0.5 * scale;
    arrowGroup.add(nock);
    
    return arrowGroup;
  }

  private createTrailEffect(): void {
    // Initialize trail positions array
    this.trailPositions = [];
    for (let i = 0; i < this.maxTrailLength; i++) {
      this.trailPositions.push(this.position.clone());
    }
    
    // Create line geometry for trail
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
    
    // Use a subtle gray color instead of white to reduce visibility of artifacts
    const material = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.6,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending // Use normal blending instead of additive
    });
    
    this.trail = new THREE.Line(geometry, material);
    this.scene.add(this.trail);
  }

  private updateRotationWithQuaternion(): void {
    if (this.velocity.lengthSq() > 0.01) {
      const defaultForward = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(defaultForward, this.velocity.clone().normalize());
      this.mesh.quaternion.copy(quaternion);
    }
  }

  public update(deltaTime: number): boolean {
    if (!this.isActive) return false;
    
    const safeDeltatime = Math.min(deltaTime, 0.1);
    
    if (this.isGrounded) {
      this.groundTimer += safeDeltatime * 1000;
      if (this.groundTimer >= this.maxGroundTime) {
        this.dispose();
        return false;
      }
      return true;
    }
    
    this.flightTime += safeDeltatime;
    
    // Apply physics
    this.velocity.y += this.gravity * safeDeltatime;
    
    // Update position
    const deltaPosition = this.velocity.clone().multiplyScalar(safeDeltatime);
    this.position.add(deltaPosition);
    
    const distanceFromStart = this.position.distanceTo(this.initialPosition);
    if (distanceFromStart > 0.5) {
      this.hasMovedSignificantly = true;
    }
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Update rotation
    this.updateRotationWithQuaternion();
    
    // Update trail with bounds checking
    if (this.trail && distanceFromStart < 100) { // Only update trail if not too far
      this.updateTrail();
    } else if (this.trail && distanceFromStart >= 100) {
      // Remove trail if arrow is too far to prevent distant artifacts
      this.removeTrail();
    }
    
    // Ground collision - fixed to match player floor level
    const groundPlaneY = 0.0; // Changed from -1.0 to 0.0 to match player ground level
    const canHitGround = this.flightTime >= this.minFlightTime && this.hasMovedSignificantly;
    if (canHitGround && this.position.y <= groundPlaneY) {
      this.hitGround();
      return true;
    }
    
    // Max flight time
    if (this.flightTime > this.maxFlightTime) {
      this.dispose();
      return false;
    }
    
    return true;
  }

  private updateTrail(): void {
    if (!this.trail) return;
    
    // Shift trail positions
    for (let i = this.trailPositions.length - 1; i > 0; i--) {
      this.trailPositions[i].copy(this.trailPositions[i - 1]);
    }
    
    // Add current position to front
    this.trailPositions[0].copy(this.position);
    
    // Update geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
    this.trail.geometry.dispose();
    this.trail.geometry = geometry;
  }

  private removeTrail(): void {
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail.geometry.dispose();
      if (Array.isArray(this.trail.material)) {
        this.trail.material.forEach(material => material.dispose());
      } else {
        this.trail.material.dispose();
      }
      this.trail = null;
    }
  }

  private hitGround(): void {
    this.isGrounded = true;
    this.velocity.set(0, 0, 0);
    this.position.y = 0.0; // Changed from -1.0 to 0.0 to match ground level
    this.mesh.position.copy(this.position);
    
    // Remove trail when hitting ground
    this.removeTrail();
    
    this.audioManager.play('arrow_impact');
    
    // Replace the problematic createDustCloud with a simple, safe impact effect
    this.createSimpleImpactEffect();
  }

  private createSimpleImpactEffect(): void {
    // Only create effect if arrow is within reasonable distance from origin (prevent distant artifacts)
    const distanceFromOrigin = this.position.distanceTo(this.initialPosition);
    if (distanceFromOrigin > 50) {
      return; // Don't create effects too far away
    }

    // Create a few small, simple particles using basic geometry
    for (let i = 0; i < 6; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B7355, // Dirt brown color
        transparent: true,
        opacity: 0.7
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(this.position);
      particle.position.x += (Math.random() - 0.5) * 0.5;
      particle.position.z += (Math.random() - 0.5) * 0.5;
      particle.position.y += Math.random() * 0.3;
      
      this.scene.add(particle);
      
      // Animate and remove the particle
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 1000; // 1 second duration
        
        if (progress >= 1) {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
          return;
        }
        
        // Simple gravity and fade animation
        particle.position.y -= 0.01;
        particle.material.opacity = 0.7 * (1 - progress);
        
        requestAnimationFrame(animate);
      };
      
      // Start animation after a small random delay
      setTimeout(animate, i * 50);
    }
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
    
    // Remove trail first
    this.removeTrail();
    
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
  }
}
