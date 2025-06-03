import * as THREE from 'three';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { PhysicsManager } from '../engine/PhysicsManager';

export class Arrow {
  private mesh: THREE.Group;
  private velocity: THREE.Vector3;
  private position: THREE.Vector3;
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private physicsManager: PhysicsManager;
  private isActive: boolean = true;
  private isGrounded: boolean = false;
  private isStuck: boolean = false;
  private stuckInObject: string | null = null;
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
  private maxFlightTime: number = 60.0;
  private hasMovedSignificantly: boolean = false;
  private initialPosition: THREE.Vector3;

  private windOffset: number = 0;
  private windSpeed: number = 2.0;
  private windStrength: number = 0.5;

  private environmentCollisionManager: any = null;

  constructor(
    scene: THREE.Scene,
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    physicsManager: PhysicsManager
  ) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.physicsManager = physicsManager;
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

  public setEnvironmentCollisionManager(manager: any): void {
    this.environmentCollisionManager = manager;
    console.log('🏹 Arrow connected to EnvironmentCollisionManager');
  }

  private createArrowMesh(): THREE.Group {
    const arrowGroup = new THREE.Group();
    
    const scale = 0.8;
    
    const shaftGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 1.0 * scale);
    const shaftMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      emissive: 0x2d1810,
      emissiveIntensity: 0.1
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);
    
    const headGeometry = new THREE.ConeGeometry(0.08 * scale, 0.2 * scale);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xC0C0C0,
      emissive: 0x333333,
      emissiveIntensity: 0.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.z = 0.5 * scale;
    head.rotation.x = Math.PI / 2;
    arrowGroup.add(head);
    
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
    this.trailPositions = [];
    this.trailOpacities = [];
    
    for (let i = 0; i < this.maxTrailLength; i++) {
      this.trailPositions.push(this.position.clone());
      this.trailOpacities.push(0);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
    
    const opacities = new Float32Array(this.maxTrailLength);
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
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
          float windPattern = sin(time * 3.0 + vPosition.z * 2.0) * 0.5 + 0.5;
          float finalOpacity = vOpacity * windPattern * 1.0;
          
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
    
    if (this.isGrounded || this.isStuck) {
      this.groundTimer += safeDeltatime * 1000;
      if (this.groundTimer >= this.maxGroundTime) {
        this.dispose();
        return false;
      }
      return true;
    }
    
    this.flightTime += safeDeltatime;
    this.windOffset += this.windSpeed * safeDeltatime;
    
    this.velocity.y += this.gravity * safeDeltatime;
    
    const deltaPosition = this.velocity.clone().multiplyScalar(safeDeltatime);
    const nextPosition = this.position.clone().add(deltaPosition);
    
    // ENHANCED: Check for collision with complete terrain protection
    const collision = this.physicsManager.checkRayCollision(
      this.position,
      this.velocity.clone().normalize(),
      deltaPosition.length(),
      ['player'] // Only exclude player collisions for arrows
    );
    
    if (collision) {
      // CRITICAL: Enable complete terrain protection before any terrain impact
      if (collision.object.type === 'terrain') {
        console.log('🏹 🔒 CRITICAL: Enabling complete terrain protection for arrow impact');
        
        // Enable protection in both systems
        this.physicsManager.enableTerrainProtection();
        
        if (this.environmentCollisionManager) {
          this.environmentCollisionManager.lockTerrainCollisions();
          this.environmentCollisionManager.setArrowImpactActive(true);
        }
        
        // Validate terrain before impact
        this.physicsManager.validateTerrainCollisions();
      }
      
      // Handle the collision
      if (collision.object.type === 'terrain') {
        this.hitTerrainObject(collision);
      } else {
        this.hitEnvironmentObject(collision);
      }
      
      // CRITICAL: Extended protection period after terrain impact
      if (collision.object.type === 'terrain') {
        setTimeout(() => {
          console.log('🏹 🔓 CRITICAL: Disabling terrain protection after extended delay');
          
          // Validate terrain before disabling protection
          this.physicsManager.validateTerrainCollisions();
          
          // Disable protection in both systems
          this.physicsManager.disableTerrainProtection();
          
          if (this.environmentCollisionManager) {
            this.environmentCollisionManager.setArrowImpactActive(false);
            this.environmentCollisionManager.unlockTerrainCollisions();
          }
          
          // Final validation after disabling protection
          setTimeout(() => {
            this.physicsManager.validateTerrainCollisions();
          }, 1000);
          
        }, 3000); // Extended 3-second protection period
      }
      
      return true;
    }
    
    this.position.copy(nextPosition);
    
    const distanceFromStart = this.position.distanceTo(this.initialPosition);
    if (distanceFromStart > 0.5) {
      this.hasMovedSignificantly = true;
    }
    
    this.mesh.position.copy(this.position);
    
    this.updateRotationWithQuaternion();
    
    if (this.trail && distanceFromStart < 100) {
      this.updateWindTrail();
    } else if (this.trail && distanceFromStart >= 100) {
      this.removeTrail();
    }
    
    const groundPlaneY = 0.0;
    const canHitGround = this.flightTime >= this.minFlightTime && this.hasMovedSignificantly;
    
    if (canHitGround && this.position.y <= groundPlaneY) {
      this.hitGround();
      return true;
    }
    
    if (this.flightTime > this.maxFlightTime) {
      this.dispose();
      return false;
    }
    
    return true;
  }

  private hitTerrainObject(collision: { object: any; distance: number; point: THREE.Vector3 }): void {
    console.log('🏹 ⛰️ Arrow hit terrain - PROTECTED terrain collision handling');
    
    this.isStuck = true;
    this.stuckInObject = collision.object.id;
    this.velocity.set(0, 0, 0);
    
    this.position.copy(collision.point);
    this.mesh.position.copy(this.position);
    
    this.removeTrail();
    
    this.audioManager.play('arrow_impact');
    
    this.createTerrainImpactEffect(collision.point);
    
    console.log(`🏹 Arrow stuck in PROTECTED terrain at:`, collision.point);
  }

  private hitEnvironmentObject(collision: { object: any; distance: number; point: THREE.Vector3 }): void {
    this.isStuck = true;
    this.stuckInObject = collision.object.id;
    this.velocity.set(0, 0, 0);
    
    this.position.copy(collision.point);
    this.mesh.position.copy(this.position);
    
    this.removeTrail();
    
    const material = this.physicsManager.getCollisionMaterial(collision.object.id);
    this.playMaterialImpactSound(material);
    
    this.createMaterialImpactEffect(collision.point, material);
    
    console.log(`🏹 Arrow stuck in ${material} object at:`, collision.point);
  }

  private createTerrainImpactEffect(position: THREE.Vector3): void {
    const distanceFromOrigin = position.distanceTo(this.initialPosition);
    if (distanceFromOrigin > 50) return;

    const particleCount = 10;
    const terrainColor = 0x8B7355;
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.04, 6, 6);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: terrainColor,
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 0.4;
      particle.position.y += (Math.random() - 0.5) * 0.4;
      particle.position.z += (Math.random() - 0.5) * 0.4;
      
      this.scene.add(particle);
      
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 1000;
        
        if (progress >= 1) {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
          return;
        }
        
        particle.position.y -= 0.01;
        particle.material.opacity = 0.9 * (1 - progress);
        
        requestAnimationFrame(animate);
      };
      
      setTimeout(animate, i * 40);
    }
  }

  private playMaterialImpactSound(material: 'wood' | 'stone' | 'metal' | 'fabric' | null): void {
    switch (material) {
      case 'wood':
        this.audioManager.play('arrow_impact');
        break;
      case 'stone':
        this.audioManager.play('arrow_impact');
        break;
      case 'metal':
        this.audioManager.play('arrow_impact');
        break;
      default:
        this.audioManager.play('arrow_impact');
    }
  }

  private createMaterialImpactEffect(position: THREE.Vector3, material: 'wood' | 'stone' | 'metal' | 'fabric' | null): void {
    const distanceFromOrigin = position.distanceTo(this.initialPosition);
    if (distanceFromOrigin > 50) return;

    const particleCount = 8;
    const particleColor = this.getMaterialParticleColor(material);
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.03, 6, 6);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 0.3;
      particle.position.y += (Math.random() - 0.5) * 0.3;
      particle.position.z += (Math.random() - 0.5) * 0.3;
      
      this.scene.add(particle);
      
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 800;
        
        if (progress >= 1) {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
          return;
        }
        
        particle.position.y -= 0.008;
        particle.material.opacity = 0.8 * (1 - progress);
        
        requestAnimationFrame(animate);
      };
      
      setTimeout(animate, i * 30);
    }
  }

  private getMaterialParticleColor(material: 'wood' | 'stone' | 'metal' | 'fabric' | null): number {
    switch (material) {
      case 'wood':
        return 0x8B4513;
      case 'stone':
        return 0x808080;
      case 'metal':
        return 0xC0C0C0;
      case 'fabric':
        return 0xF5F5DC;
      default:
        return 0x8B7355;
    }
  }

  private updateWindTrail(): void {
    if (!this.trail) return;
    
    for (let i = this.trailPositions.length - 1; i > 0; i--) {
      this.trailPositions[i].copy(this.trailPositions[i - 1]);
      this.trailOpacities[i] = this.trailOpacities[i - 1] * 0.98;
    }
    
    const windDisplacement = new THREE.Vector3(
      Math.sin(this.windOffset * 2 + this.position.z * 0.1) * this.windStrength,
      Math.cos(this.windOffset * 1.5 + this.position.x * 0.05) * this.windStrength * 0.5,
      0
    );
    
    this.trailPositions[0].copy(this.position).add(windDisplacement);
    this.trailOpacities[0] = 1.0;
    
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trailPositions);
    
    const opacities = new Float32Array(this.maxTrailLength);
    for (let i = 0; i < this.maxTrailLength; i++) {
      const fadeRatio = 1 - (i / this.maxTrailLength);
      const windVariation = Math.sin(this.windOffset + i * 0.3) * 0.3 + 0.9;
      opacities[i] = this.trailOpacities[i] * fadeRatio * windVariation * 1.2;
    }
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
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
    
    this.position.y = 0.0;
    this.mesh.position.copy(this.position);
    
    this.removeTrail();
    
    this.audioManager.play('arrow_impact');
    
    this.createSimpleImpactEffect();
  }

  private createSimpleImpactEffect(): void {
    const distanceFromOrigin = this.position.distanceTo(this.initialPosition);
    if (distanceFromOrigin > 50) {
      return;
    }

    for (let i = 0; i < 6; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B7355,
        transparent: true,
        opacity: 0.7
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(this.position);
      particle.position.x += (Math.random() - 0.5) * 0.5;
      particle.position.z += (Math.random() - 0.5) * 0.5;
      particle.position.y += Math.random() * 0.3;
      
      this.scene.add(particle);
      
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 1000;
        
        if (progress >= 1) {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
          return;
        }
        
        particle.position.y -= 0.01;
        particle.material.opacity = 0.7 * (1 - progress);
        
        requestAnimationFrame(animate);
      };
      
      setTimeout(animate, i * 50);
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getDirection(): THREE.Vector3 {
    return this.velocity.clone().normalize();
  }

  public getDamage(): number {
    return this.damage;
  }

  public isArrowActive(): boolean {
    return this.isActive && !this.isGrounded && !this.isStuck;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public dispose(): void {
    this.isActive = false;
    
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
