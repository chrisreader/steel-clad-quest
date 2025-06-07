
import * as THREE from 'three';
import { FlameGeometry, FlameConfig } from '../geometry/FlameGeometry';
import { createFlameMaterial } from '../shaders/FlameShader';
import { EmberParticleSystem } from './EmberParticleSystem';
import { FireParticleConfig } from '../types/FireTypes';

export class OrganicFireParticleGenerator {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private flameGroup: THREE.Group;
  private flames: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private emberSystem: EmberParticleSystem;
  private time: number = 0;
  private intensity: number = 1.0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    this.flameGroup = new THREE.Group();
    this.flameGroup.position.copy(this.position);
    
    this.createFlameInstances();
    this.emberSystem = new EmberParticleSystem(scene, position, 15);
    
    this.scene.add(this.flameGroup);
    console.log('🔥 Organic fire particle generator created');
  }

  private createFlameInstances(): void {
    const flameTypes = FlameGeometry.getFlameTypes();
    const flameCount = 25;
    
    for (let i = 0; i < flameCount; i++) {
      const flameType = flameTypes[i % flameTypes.length];
      const geometry = FlameGeometry.createFlameGeometry(flameType);
      
      // Create gradient colors for each flame
      const baseColor = new THREE.Color(0xFF6600).multiplyScalar(0.8 + Math.random() * 0.4);
      const tipColor = new THREE.Color(0xFF2200).multiplyScalar(0.6 + Math.random() * 0.4);
      
      const material = createFlameMaterial(baseColor, tipColor);
      this.materials.push(material);
      
      const flame = new THREE.Mesh(geometry, material);
      
      // Position flames in a circle around the fire center
      const angle = (i / flameCount) * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.4;
      flame.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      
      // Add slight random rotation
      flame.rotation.y = angle + (Math.random() - 0.5) * 0.5;
      flame.scale.multiplyScalar(0.8 + Math.random() * 0.4);
      
      this.flames.push(flame);
      this.flameGroup.add(flame);
    }
    
    console.log(`🔥 Created ${flameCount} organic flame instances`);
  }

  public addParticleType(name: string, config: FireParticleConfig): void {
    // This method maintains compatibility with the existing system
    console.log(`🔥 Particle type '${name}' configuration applied to organic flames`);
    
    // Adjust flame intensity based on config
    if (name === 'flames') {
      this.intensity = config.opacity;
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update all flame materials with time and intensity
    for (const material of this.materials) {
      material.uniforms.uTime.value = this.time;
      material.uniforms.uIntensity.value = this.intensity;
      material.uniforms.uWindStrength.value = 0.8 + Math.sin(this.time * 0.5) * 0.4;
    }
    
    // Update ember system
    this.emberSystem.update(deltaTime);
    
    // Add subtle group rotation for more organic movement
    this.flameGroup.rotation.y += Math.sin(this.time * 0.3) * 0.01 * deltaTime;
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
    for (const material of this.materials) {
      material.uniforms.uIntensity.value = intensity;
    }
  }

  public dispose(): void {
    console.log('🔥 Disposing organic fire particle generator');
    
    this.scene.remove(this.flameGroup);
    
    for (const flame of this.flames) {
      if (flame.geometry) flame.geometry.dispose();
    }
    
    for (const material of this.materials) {
      material.dispose();
    }
    
    this.emberSystem.dispose();
    
    this.flames = [];
    this.materials = [];
    
    console.log('🔥 Organic fire particle generator disposed');
  }
}
