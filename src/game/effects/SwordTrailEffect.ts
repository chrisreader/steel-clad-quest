
import * as THREE from 'three';

export class SwordTrailEffect {
  private scene: THREE.Scene;
  private trails: THREE.Line[] = [];
  private trailMaterials: THREE.LineBasicMaterial[] = [];
  private maxTrails: number = 3;
  private trailLifetime: number = 300; // milliseconds
  private creationTime: number;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.creationTime = Date.now();
  }
  
  public createTrailFromPath(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    if (swordPath.length < 2) {
      console.log("🌪️ [SwordTrailEffect] Insufficient path points for trail");
      return;
    }
    
    console.log("🌪️ [SwordTrailEffect] Creating continuous trail from sword path with", swordPath.length, "points");
    
    // Create main sword trail following the exact path
    this.createMainTrail(swordPath);
    
    // Create secondary air displacement trails
    this.createAirDisplacementTrails(swordPath, swingDirection);
    
    // Schedule cleanup
    setTimeout(() => {
      this.dispose();
    }, this.trailLifetime);
  }
  
  private createMainTrail(swordPath: THREE.Vector3[]): void {
    // Create geometry from sword path points
    const geometry = new THREE.BufferGeometry().setFromPoints(swordPath);
    
    // Create material with white color and transparency
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      linewidth: 3
    });
    
    // Create the trail line
    const trail = new THREE.Line(geometry, material);
    this.scene.add(trail);
    this.trails.push(trail);
    this.trailMaterials.push(material);
    
    // Animate fade out
    this.animateTrailFadeOut(material, 0);
    
    console.log("🌪️ [SwordTrailEffect] Main trail created following sword path");
  }
  
  private createAirDisplacementTrails(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    const numSecondaryTrails = 2;
    
    for (let i = 0; i < numSecondaryTrails; i++) {
      // Create offset paths parallel to the main sword path
      const offset = (i + 1) * 0.05; // Small offset distance
      const offsetDirection = new THREE.Vector3(-swingDirection.z, 0, swingDirection.x).normalize();
      const sign = i % 2 === 0 ? 1 : -1;
      
      const offsetPath = swordPath.map(point => {
        return point.clone().add(offsetDirection.clone().multiplyScalar(offset * sign));
      });
      
      // Create geometry for offset trail
      const geometry = new THREE.BufferGeometry().setFromPoints(offsetPath);
      
      // Create material with slightly different properties
      const material = new THREE.LineBasicMaterial({
        color: 0xF0F0F0, // Slightly gray-white
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        linewidth: 2
      });
      
      // Create the trail line
      const trail = new THREE.Line(geometry, material);
      this.scene.add(trail);
      this.trails.push(trail);
      this.trailMaterials.push(material);
      
      // Animate fade out with slight delay
      this.animateTrailFadeOut(material, (i + 1) * 50);
    }
    
    console.log("🌪️ [SwordTrailEffect] Air displacement trails created");
  }
  
  private animateTrailFadeOut(material: THREE.LineBasicMaterial, delay: number): void {
    const startOpacity = material.opacity;
    const startTime = Date.now() + delay;
    const fadeDuration = this.trailLifetime - delay;
    
    const fadeAnimation = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(fadeAnimation);
        return;
      }
      
      const progress = elapsed / fadeDuration;
      
      if (progress >= 1) {
        material.opacity = 0;
        return;
      }
      
      // Smooth fade out curve
      material.opacity = startOpacity * (1 - progress * progress);
      requestAnimationFrame(fadeAnimation);
    };
    
    requestAnimationFrame(fadeAnimation);
  }
  
  public dispose(): void {
    // Remove all trails from scene and dispose materials
    this.trails.forEach(trail => {
      this.scene.remove(trail);
      if (trail.geometry) {
        trail.geometry.dispose();
      }
    });
    
    this.trailMaterials.forEach(material => {
      material.dispose();
    });
    
    this.trails = [];
    this.trailMaterials = [];
    
    console.log("🌪️ [SwordTrailEffect] Trail effect disposed");
  }
}
