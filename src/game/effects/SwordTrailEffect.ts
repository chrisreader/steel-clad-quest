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
    
    console.log("🌪️ [SwordTrailEffect] Creating SLASH PHASE trail from sword path with", swordPath.length, "points");
    console.log("🌪️ [SwordTrailEffect] Trail follows blade during active slashing motion");
    
    // Create main sword trail following the exact slash path
    this.createMainTrail(swordPath);
    
    // Create secondary air displacement trails during slash
    this.createAirDisplacementTrails(swordPath, swingDirection);
    
    // Extended cleanup time to let trail be visible after slash completes
    setTimeout(() => {
      this.dispose();
    }, this.trailLifetime * 1.2); // Visible after slash ends
  }
  
  private createMainTrail(swordPath: THREE.Vector3[]): void {
    // Create geometry from sword slash path points
    const geometry = new THREE.BufferGeometry().setFromPoints(swordPath);
    
    // Enhanced material for slash trail visibility
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.95, // High opacity for clear slash visibility
      blending: THREE.AdditiveBlending,
      linewidth: 6  // Wider trail for better slash effect
    });
    
    // Create the slash trail line
    const trail = new THREE.Line(geometry, material);
    this.scene.add(trail);
    this.trails.push(trail);
    this.trailMaterials.push(material);
    
    // Animate fade out after slash completes
    this.animateTrailFadeOut(material, 0);
    
    console.log("🌪️ [SwordTrailEffect] Main slash trail created following blade path");
  }
  
  private createAirDisplacementTrails(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    // Create secondary trails that follow the main slash
    const numSecondaryTrails = 3; // Focused trails for slash effect
    
    for (let i = 0; i < numSecondaryTrails; i++) {
      // Create offset paths parallel to the main slash path
      const offset = (i + 1) * 0.03;
      const offsetDirection = new THREE.Vector3(-swingDirection.z, 0, swingDirection.x).normalize();
      const sign = i % 2 === 0 ? 1 : -1;
      
      const offsetPath = swordPath.map(point => {
        return point.clone().add(offsetDirection.clone().multiplyScalar(offset * sign));
      });
      
      // Create geometry for offset slash trail
      const geometry = new THREE.BufferGeometry().setFromPoints(offsetPath);
      
      // Material with decreasing intensity for depth
      const material = new THREE.LineBasicMaterial({
        color: i < 1 ? 0xF8F8FF : 0xF0F0F0,
        transparent: true,
        opacity: 0.8 - (i * 0.15), // Decreasing opacity
        blending: THREE.AdditiveBlending,
        linewidth: 4 - (i * 0.7) // Decreasing width
      });
      
      // Create the secondary slash trail
      const trail = new THREE.Line(geometry, material);
      this.scene.add(trail);
      this.trails.push(trail);
      this.trailMaterials.push(material);
      
      // Staggered fade animation
      this.animateTrailFadeOut(material, (i + 1) * 25);
    }
    
    console.log("🌪️ [SwordTrailEffect] Secondary slash trails created for air displacement effect");
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
