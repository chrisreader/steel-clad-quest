
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
  private smokeSystem: EmberParticleSystem;
  private time: number = 0;
  private intensity: number = 1.0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    this.flameGroup = new THREE.Group();
    this.flameGroup.position.copy(this.position);
    
    // Only create animated flame geometry - no static visuals
    this.createAnimatedFlames();
    
    // Create organic particle systems - reduced counts
    this.emberSystem = new EmberParticleSystem(scene, position, 6, 'embers'); // Reduced from 15
    this.smokeSystem = new EmberParticleSystem(scene, position, 4, 'smoke'); // Reduced from 8
    
    this.scene.add(this.flameGroup);
    console.log('🔥 Organic fire particle generator created with animated flames only');
  }

  private createAnimatedFlames(): void {
    const flameTypes = FlameGeometry.getFlameTypes();
    const flameCount = 6; // Further reduced from 12 to 6 (50% reduction)
    
    for (let i = 0; i < flameCount; i++) {
      const flameType = flameTypes[i % flameTypes.length];
      const geometry = FlameGeometry.createFlameGeometry(flameType);
      
      // Create gradient colors for each flame with more variation
      const hue = 0.08 + Math.random() * 0.05; // Orange to red range
      const saturation = 0.9 + Math.random() * 0.1;
      const lightness = 0.5 + Math.random() * 0.3;
      
      const baseColor = new THREE.Color().setHSL(hue, saturation, lightness);
      const tipColor = new THREE.Color().setHSL(hue - 0.02, saturation + 0.1, lightness - 0.2);
      
      const material = createFlameMaterial(baseColor, tipColor);
      this.materials.push(material);
      
      const flame = new THREE.Mesh(geometry, material);
      
      // Position flames in organic clusters
      const angle = (i / flameCount) * Math.PI * 2;
      const radius = 0.1 + Math.random() * 0.3;
      flame.position.set(
        Math.cos(angle) * radius,
        Math.random() * 0.1, // Slight height variation
        Math.sin(angle) * radius
      );
      
      // Add rotation and scale variation
      flame.rotation.y = angle + (Math.random() - 0.5) * 0.8;
      flame.scale.multiplyScalar(0.7 + Math.random() * 0.6);
      
      this.flames.push(flame);
      this.flameGroup.add(flame);
    }
    
    console.log(`🔥 Created ${flameCount} animated flame instances (no static visuals)`);
  }

  public addParticleType(name: string, config: FireParticleConfig): void {
    console.log(`🔥 Particle type '${name}' configuration applied to organic systems`);
    
    if (name === 'flames') {
      this.intensity = config.opacity;
    }
  }

  private updateCounter = 0;
  private cachedSinValues: number[] = [];

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.updateCounter++;
    
    // Update cached sin values less frequently for performance
    if (this.updateCounter % 5 === 0) {
      this.cachedSinValues = this.materials.map((_, i) => Math.sin(this.time * 2 + i));
    }
    
    // Update flame materials with cached calculations
    for (let i = 0; i < this.materials.length; i++) {
      const material = this.materials[i];
      material.uniforms.uTime.value = this.time;
      // Use cached sin values for performance
      const cachedSin = this.cachedSinValues[i] || 0;
      material.uniforms.uIntensity.value = this.intensity * (0.8 + cachedSin * 0.2);
      material.uniforms.uWindStrength.value = 0.6 + cachedSin * 0.2; // Simplified wind
    }
    
    // Update flame positions less frequently
    if (this.updateCounter % 3 === 0) {
      for (let i = 0; i < this.flames.length; i++) {
        const flame = this.flames[i];
        flame.position.y = Math.sin(this.time * 3 + i * 0.8) * 0.03; // Reduced movement
        flame.rotation.z = Math.sin(this.time * 1.5 + i) * 0.05; // Reduced rotation
      }
    }
    
    // Update particle systems
    this.emberSystem.update(deltaTime);
    this.smokeSystem.update(deltaTime);
    
    // Simplified group movement
    if (this.updateCounter % 10 === 0) {
      this.flameGroup.rotation.y += Math.sin(this.time * 0.4) * 0.002 * deltaTime;
    }
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
    this.smokeSystem.dispose();
    
    this.flames = [];
    this.materials = [];
    
    console.log('🔥 Organic fire particle generator disposed');
  }
}
