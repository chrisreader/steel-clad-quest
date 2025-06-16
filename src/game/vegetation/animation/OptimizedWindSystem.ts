
import * as THREE from 'three';
import { PerformanceOptimizer } from '../../core/PerformanceOptimizer';

export class OptimizedWindSystem {
  private time: number = 0;
  private windDirection: THREE.Vector2 = new THREE.Vector2(1, 0.5);
  private windStrength: number = 0.5;
  private lastUpdateTime: number = 0;
  
  // Cache wind values to avoid recalculation
  private cachedWindValues: {
    time: number;
    direction: THREE.Vector2;
    strength: number;
  } = {
    time: 0,
    direction: new THREE.Vector2(),
    strength: 0
  };
  
  private readonly UPDATE_THRESHOLD = 0.016; // ~60fps minimum update rate
  
  public update(deltaTime: number): void {
    // Only update wind if performance optimizer allows it
    if (!PerformanceOptimizer.shouldUpdateWind()) {
      return;
    }
    
    this.time += deltaTime;
    this.lastUpdateTime = performance.now();
    
    // Update cached wind values
    this.cachedWindValues.time = this.time;
    this.cachedWindValues.direction.copy(this.windDirection);
    this.cachedWindValues.strength = this.windStrength + Math.sin(this.time * 0.5) * 0.2;
  }
  
  public updateMaterialWind(material: THREE.ShaderMaterial, isGroundGrass: boolean = false): void {
    if (!material.uniforms) return;
    
    // Use cached values instead of recalculating
    if (material.uniforms.time) {
      material.uniforms.time.value = this.cachedWindValues.time;
    }
    
    if (material.uniforms.windDirection) {
      material.uniforms.windDirection.value.copy(this.cachedWindValues.direction);
    }
    
    if (material.uniforms.windStrength) {
      const strengthMultiplier = isGroundGrass ? 0.3 : 1.0;
      material.uniforms.windStrength.value = this.cachedWindValues.strength * strengthMultiplier;
    }
  }
  
  public getWindData(): { time: number; direction: THREE.Vector2; strength: number } {
    return { ...this.cachedWindValues };
  }
}
