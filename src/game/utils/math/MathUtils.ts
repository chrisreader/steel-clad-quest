
import * as THREE from 'three';

export class MathUtils {
  /**
   * Linearly interpolate between two values
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Convert degrees to radians
   */
  static degToRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
  
  /**
   * Convert radians to degrees
   */
  static radToDeg(radians: number): number {
    return radians * 180 / Math.PI;
  }
  
  /**
   * Get random integer between min and max (inclusive)
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Get random float between min and max
   */
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * Get random item from array
   */
  static randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Get random position within radius around center
   */
  static randomPositionInRadius(center: THREE.Vector3, minRadius: number, maxRadius: number): THREE.Vector3 {
    const radius = this.randomFloat(minRadius, maxRadius);
    const angle = Math.random() * Math.PI * 2;
    
    return new THREE.Vector3(
      center.x + Math.cos(angle) * radius,
      center.y,
      center.z + Math.sin(angle) * radius
    );
  }
  
  /**
   * Check if two objects are colliding using their bounding boxes
   */
  static areColliding(obj1: THREE.Object3D, obj2: THREE.Object3D): boolean {
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);
    
    return box1.intersectsBox(box2);
  }
  
  /**
   * Get distance between two points
   */
  static distance(p1: THREE.Vector3, p2: THREE.Vector3): number {
    return p1.distanceTo(p2);
  }
  
  /**
   * Get direction vector from p1 to p2
   */
  static direction(p1: THREE.Vector3, p2: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3().subVectors(p2, p1).normalize();
  }
  
  /**
   * Smoothly interpolate between two values (cubic)
   */
  static smoothStep(x: number, min: number, max: number): number {
    x = this.clamp((x - min) / (max - min), 0, 1);
    return x * x * (3 - 2 * x);
  }
  
  /**
   * Smoothly interpolate between two angles (in radians)
   */
  static lerpAngle(a: number, b: number, t: number): number {
    const delta = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + delta * t;
  }
  
  /**
   * Easing function: Ease in
   */
  static easeIn(t: number): number {
    return t * t;
  }
  
  /**
   * Easing function: Ease out
   */
  static easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
  
  /**
   * Easing function: Ease in and out
   */
  static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  /**
   * Generate a height map for terrain
   */
  static generateHeightMap(width: number, height: number, scale: number = 0.1, octaves: number = 4): number[][] {
    const heightMap: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      heightMap[y] = [];
      for (let x = 0; x < width; x++) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
          const sampleX = x * scale * frequency;
          const sampleY = y * scale * frequency;
          
          // Simple noise function (could be replaced with a better one)
          const noise = Math.sin(sampleX) * Math.cos(sampleY) * 0.5 + 0.5;
          
          value += noise * amplitude;
          maxValue += amplitude;
          
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        // Normalize
        value /= maxValue;
        heightMap[y][x] = value;
      }
    }
    
    return heightMap;
  }
}
