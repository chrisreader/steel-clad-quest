
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
  private trailOpacities: number[] = [];
  private maxTrailLength: number = 40;
  
  private flightTime: number = 0;
  private minFlightTime: number = 0.2;
  private maxFlightTime: number = 10.0;
  private hasMovedSignificantly: boolean = false;
  private initialPosition: THREE.Vector3;

  // Wind effect properties
  private windOffset: number = 0;
  private windSpeed: number = 2.0;
  private windStrength: number = 0.5;

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
    this.createWindTrailEffect();
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

  private createWindTrailEffect(): void {
    // Initialize trail positions and opacities arrays
    this.trailPositions = [];
    this.trailOpacities = [];
    
    for (let i = 0; i < this.maxTrailLength; i++) {
      this.trailPositions.push(this.position.clone());
      this.trailOpacities.push(0);
    }
    
    // Create line geometry for wind trail
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
    
    // Add opacity attribute for varying transparency
    const opacities = new Float32Array(this.maxTrailLength);
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    // Use shader material for wind-like effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vOpacity = opacity;
          vPosition = position;
          
          // Add subtle wind displacement
          vec3 pos = position;
          pos.x += sin(time * 2.0 + position.z * 0.5) * 0.15;
          pos.y += cos(time * 1.5 + position.x * 0.3) * 0.08;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 5.0 + sin(time + position.z) * 2.0;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          // Create flowing wind-like pattern
          float windPattern = sin(time * 3.0 + vPosition.z * 2.0) * 0.5 + 0.5;
          float finalOpacity = vOpacity * windPattern * 1.0;
          
          // Brighter blue-white color for better visibility
          vec3 windColor = mix(vec3(0.8, 0.95, 1.0), vec3(1.0, 1.0, 1.0), windPattern);
          
          gl_FragColor = vec4(windColor, finalOpacity);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
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
    this.windOffset += this.windSpeed * safeDeltatime;
    
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
    
    // Update wind trail with bounds checking
    if (this.trail && distanceFromStart < 100) {
      this.updateWindTrail();
    } else if (this.trail && distanceFromStart >= 100) {
      this.removeTrail();
    }
    
    // Ground collision - improved logic for direct downward shots
    const groundPlaneY = 0.0;
    const canHitGround = this.flightTime >= this.minFlightTime && this.hasMovedSignificantly;
    
    // Check if arrow has reached or passed through ground level
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

  private updateWindTrail(): void {
    if (!this.trail) return;
    
    // Shift trail positions and opacities
    for (let i = this.trailPositions.length - 1; i > 0; i--) {
      this.trailPositions[i].copy(this.trailPositions[i - 1]);
      this.trailOpacities[i] = this.trailOpacities[i - 1] * 0.98; // Slower fade for longer trail
    }
    
    // Add current position with wind displacement to front
    const windDisplacement = new THREE.Vector3(
      Math.sin(this.windOffset * 2 + this.position.z * 0.1) * this.windStrength,
      Math.cos(this.windOffset * 1.5 + this.position.x * 0.05) * this.windStrength * 0.5,
      0
    );
    
    this.trailPositions[0].copy(this.position).add(windDisplacement);
    this.trailOpacities[0] = 1.0;
    
    // Update geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
    
    // Update opacity attribute with enhanced visibility
    const opacities = new Float32Array(this.maxTrailLength);
    for (let i = 0; i < this.maxTrailLength; i++) {
      // Create smooth fade from front to back with wind variation
      const fadeRatio = 1 - (i / this.maxTrailLength);
      const windVariation = Math.sin(this.windOffset + i * 0.3) * 0.3 + 0.9; // Increased base opacity
      opacities[i] = this.trailOpacities[i] * fadeRatio * windVariation * 1.2; // Increased overall opacity
    }
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    // Update shader time uniform
    if (this.trail.material instanceof THREE.ShaderMaterial) {
      this.trail.material.uniforms.time.value = this.windOffset;
    }
    
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
    
    // Ensure arrow lands exactly at ground level
    this.position.y = 0.0;
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
