
import * as THREE from 'three';

export class SwordTrailEffect {
  private scene: THREE.Scene;
  private trails: THREE.Line[] = [];
  private trailMaterials: THREE.LineBasicMaterial[] = [];
  private maxTrails: number = 5; // Increased for progressive building
  private trailLifetime: number = 200; // Reduced for more frequent updates
  private creationTime: number;
  private activeTrail: THREE.Line | null = null; // Track the main continuous trail
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.creationTime = Date.now();
  }
  
  public createTrailFromPath(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    if (swordPath.length < 2) {
      console.log("🌪️ [SwordTrailEffect] Insufficient path points for trail");
      return;
    }
    
    console.log("🌪️ [SwordTrailEffect] Creating PROGRESSIVE trail with", swordPath.length, "points");
    
    // UPDATED: Remove old trails before creating new ones for smooth progression
    this.clearOldTrails();
    
    // Create main progressive trail following the sword path
    this.createProgressiveMainTrail(swordPath);
    
    // Create lighter secondary trails for depth
    this.createProgressiveSecondaryTrails(swordPath, swingDirection);
    
    // Shorter cleanup time for more frequent updates
    setTimeout(() => {
      this.dispose();
    }, this.trailLifetime);
  }
  
  private clearOldTrails(): void {
    // Remove trails older than a certain threshold to prevent buildup
    const currentTime = Date.now();
    const maxAge = 100; // 100ms max age for old trails
    
    this.trails.forEach((trail, index) => {
      if (trail.userData.creationTime && currentTime - trail.userData.creationTime > maxAge) {
        this.scene.remove(trail);
        if (trail.geometry) {
          trail.geometry.dispose();
        }
        this.trailMaterials[index]?.dispose();
      }
    });
    
    // Filter out disposed trails
    this.trails = this.trails.filter(trail => trail.parent === this.scene);
    this.trailMaterials = this.trailMaterials.filter(material => !material.disposed);
  }
  
  private createProgressiveMainTrail(swordPath: THREE.Vector3[]): void {
    // Create geometry from progressive sword path points
    const geometry = new THREE.BufferGeometry().setFromPoints(swordPath);
    
    // Enhanced material for progressive trail visibility
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9, // Slightly reduced for smoother blending
      blending: THREE.AdditiveBlending,
      linewidth: 5  // Slightly thinner for more refined look
    });
    
    // Create the progressive trail line
    const trail = new THREE.Line(geometry, material);
    trail.userData.creationTime = Date.now(); // Track creation time
    this.scene.add(trail);
    this.trails.push(trail);
    this.trailMaterials.push(material);
    this.activeTrail = trail;
    
    // Quick fade out for continuous effect
    this.animateTrailFadeOut(material, 0);
    
    console.log("🌪️ [SwordTrailEffect] Progressive main trail created with", swordPath.length, "points");
  }
  
  private createProgressiveSecondaryTrails(swordPath: THREE.Vector3[], swingDirection: THREE.Vector3): void {
    // Create fewer, more focused secondary trails for progressive effect
    const numSecondaryTrails = 2; // Reduced for cleaner look
    
    for (let i = 0; i < numSecondaryTrails; i++) {
      // Create offset paths parallel to the progressive trail
      const offset = (i + 1) * 0.025; // Slightly smaller offset
      const offsetDirection = new THREE.Vector3(-swingDirection.z, 0, swingDirection.x).normalize();
      const sign = i % 2 === 0 ? 1 : -1;
      
      const offsetPath = swordPath.map(point => {
        return point.clone().add(offsetDirection.clone().multiplyScalar(offset * sign));
      });
      
      // Create geometry for offset progressive trail
      const geometry = new THREE.BufferGeometry().setFromPoints(offsetPath);
      
      // Material with decreasing intensity for depth
      const material = new THREE.LineBasicMaterial({
        color: i < 1 ? 0xF8F8FF : 0xF0F0F0,
        transparent: true,
        opacity: 0.6 - (i * 0.2), // More subtle opacity
        blending: THREE.AdditiveBlending,
        linewidth: 3 - (i * 0.5) // Thinner secondary trails
      });
      
      // Create the secondary progressive trail
      const trail = new THREE.Line(geometry, material);
      trail.userData.creationTime = Date.now(); // Track creation time
      this.scene.add(trail);
      this.trails.push(trail);
      this.trailMaterials.push(material);
      
      // Staggered fade animation for depth
      this.animateTrailFadeOut(material, (i + 1) * 15);
    }
    
    console.log("🌪️ [SwordTrailEffect] Progressive secondary trails created for continuous effect");
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
      
      // Faster fade out for continuous effect
      material.opacity = startOpacity * (1 - progress * progress * progress);
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
    this.activeTrail = null;
    
    console.log("🌪️ [SwordTrailEffect] Progressive trail effect disposed");
  }
}
