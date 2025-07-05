
import * as THREE from 'three';

export class WindSystem {
  private time: number = 0;
  private updateCounter: number = 0;
  private cachedWindValues: Map<string, { windStrength: number; gustIntensity: number; windDirection: THREE.Vector2 }> = new Map();
  private lastPlayerMoving: boolean = false;
  private readonly WIND_UPDATE_INTERVAL: number = 3; // Update every 3 frames instead of every frame

  public update(deltaTime: number, isPlayerMoving: boolean = true): void {
    this.updateCounter++;
    
    // Only update wind time when player is moving or periodically
    if (isPlayerMoving || this.updateCounter % 10 === 0) {
      this.time += deltaTime;
      this.lastPlayerMoving = isPlayerMoving;
    }
  }

  public updateMaterialWind(
    material: THREE.ShaderMaterial,
    isGroundGrass: boolean = false,
    materialKey: string = 'default'
  ): void {
    // Skip updates if player isn't moving and we have recent cached values
    if (!this.lastPlayerMoving && this.updateCounter % this.WIND_UPDATE_INTERVAL !== 0) {
      const cached = this.cachedWindValues.get(materialKey);
      if (cached) {
        // Use cached values for better performance
        if (material.uniforms.windStrength) material.uniforms.windStrength.value = cached.windStrength;
        if (material.uniforms.gustIntensity) material.uniforms.gustIntensity.value = cached.gustIntensity;
        if (material.uniforms.windDirection) material.uniforms.windDirection.value.copy(cached.windDirection);
        return;
      }
    }
    
    // Calculate new values only when needed
    const baseWindStrength = 0.2 + Math.sin(this.time * 0.3) * 0.1;
    const gustIntensity = 0.1 + Math.sin(this.time * 0.8) * 0.08;
    const windStrength = isGroundGrass ? baseWindStrength * 0.8 : baseWindStrength;
    const gust = isGroundGrass ? gustIntensity * 0.6 : gustIntensity;
    const windAngle = this.time * 0.1;
    const windDirection = new THREE.Vector2(Math.cos(windAngle), Math.sin(windAngle) * 0.5);
    
    // Cache the calculated values
    this.cachedWindValues.set(materialKey, {
      windStrength,
      gustIntensity: gust,
      windDirection
    });
    
    // Update material uniforms
    if (material.uniforms.time) {
      material.uniforms.time.value = this.time;
    }
    
    if (material.uniforms.windStrength) {
      material.uniforms.windStrength.value = windStrength;
    }
    
    if (material.uniforms.gustIntensity) {
      material.uniforms.gustIntensity.value = gust;
    }
    
    if (material.uniforms.windDirection) {
      material.uniforms.windDirection.value.copy(windDirection);
    }
  }

  public getTime(): number {
    return this.time;
  }
}
