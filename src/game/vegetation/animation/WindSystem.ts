
import * as THREE from 'three';

export class WindSystem {
  private time: number = 0;

  public update(deltaTime: number): void {
    this.time += deltaTime;
  }

  public updateMaterialWind(
    material: THREE.ShaderMaterial,
    isGroundGrass: boolean = false
  ): void {
    const baseWindStrength = 0.2 + Math.sin(this.time * 0.3) * 0.1;
    const gustIntensity = 0.1 + Math.sin(this.time * 0.8) * 0.08;
    
    if (material.uniforms.time) {
      material.uniforms.time.value = this.time;
    }
    
    if (material.uniforms.windStrength) {
      const windStrength = isGroundGrass ? baseWindStrength * 0.8 : baseWindStrength;
      material.uniforms.windStrength.value = windStrength;
    }
    
    if (material.uniforms.gustIntensity) {
      const gust = isGroundGrass ? gustIntensity * 0.6 : gustIntensity;
      material.uniforms.gustIntensity.value = gust;
    }
    
    if (material.uniforms.windDirection) {
      const windAngle = this.time * 0.1;
      material.uniforms.windDirection.value.set(
        Math.cos(windAngle),
        Math.sin(windAngle) * 0.5
      );
    }
  }

  public getTime(): number {
    return this.time;
  }
}
