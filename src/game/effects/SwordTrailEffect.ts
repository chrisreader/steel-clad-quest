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
    
    console.log("🌪️ [SwordTrailEffect] Creating EXTENDED trail from sword path with", swordPath.length, "points");
    console.log("🌪️ [SwordTrailEffect] Path covers entire swing from top-right to bottom-left");
    
    // Create main sword trail following the exact path - EXTENDED duration
    this.createMainTrail(swordPath);
    
    // Create secondary air displacement trails - MORE trails for better effect
    this.createAirDisplacementTrails(swordPath, swingDirection);
    
    // EXTENDED cleanup time to let trail be visible longer
    setTimeout(() => {
      this.dispose();
    }, this.trailLifetime * 1.5); // 50% longer visibility
  }
  
  private createMainTrail(swordPath: THREE.Vector3[]): void {
    // Create geometry from sword path points
    const geometry = new THREE.BufferGeometry().setFromPoints(swordPath);
    
    // ENHANCED material with better visibility and wider trail
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9, // Increased from 0.8 for better visibility
      blending: THREE.AdditiveBlending,
      linewidth: 5  // Increased from 3 for more prominent trail
    });
    
    // Create the trail line
    const trail = new THREE.Line(geometry, material);
    this.scene.add(trail);
    this.trails.push(trail);
    this.trailMaterials.push(material);
    
    // Animate fade out with longer duration
    this.animateTrailFadeOut(material, 0);
    
    console.log("🌪️ [SwordTrailEffect] ENHANCED main trail created following complete sword path");
  }
  
  private createAirDisplacementTrails(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    // INCREASED number of secondary trails for more dramatic effect
    const numSecondaryTrails = 4; // Increased from 2
    
    for (let i = 0; i < numSecondaryTrails; i++) {
      // Create offset paths parallel to the main sword path
      const offset = (i + 1) * 0.04; // Slightly smaller offset for tighter grouping
      const offsetDirection = new THREE.Vector3(-swingDirection.z, 0, swingDirection.x).normalize();
      const sign = i % 2 === 0 ? 1 : -1;
      
      const offsetPath = swordPath.map(point => {
        return point.clone().add(offsetDirection.clone().multiplyScalar(offset * sign));
      });
      
      // Create geometry for offset trail
      const geometry = new THREE.BufferGeometry().setFromPoints(offsetPath);
      
      // ENHANCED material with varying properties
      const material = new THREE.LineBasicMaterial({
        color: i < 2 ? 0xF8F8FF : 0xF0F0F0, // Slightly different whites
        transparent: true,
        opacity: 0.7 - (i * 0.1), // Decreasing opacity for depth
        blending: THREE.AdditiveBlending,
        linewidth: 3 - (i * 0.5) // Decreasing width for depth
      });
      
      // Create the trail line
      const trail = new THREE.Line(geometry, material);
      this.scene.add(trail);
      this.trails.push(trail);
      this.trailMaterials.push(material);
      
      // Animate fade out with staggered delays
      this.animateTrailFadeOut(material, (i + 1) * 30);
    }
    
    console.log("🌪️ [SwordTrailEffect] ENHANCED air displacement trails created with", numSecondaryTrails, "secondary trails");
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
