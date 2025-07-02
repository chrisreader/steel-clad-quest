import * as THREE from 'three';

// Smart caching system for frequently calculated values
export class PerformanceCache {
  private static distanceCache = new Map<string, { value: number; timestamp: number }>();
  private static vectorPool: THREE.Vector3[] = [];
  private static matrixPool: THREE.Matrix4[] = [];
  private static quaternionPool: THREE.Quaternion[] = [];
  private static readonly CACHE_DURATION = 100; // ms
  private static readonly POOL_SIZE = 100;

  // Initialize object pools
  static {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.vectorPool.push(new THREE.Vector3());
      this.matrixPool.push(new THREE.Matrix4());
      this.quaternionPool.push(new THREE.Quaternion());
    }
  }

  // Cached distance calculation
  public static getCachedDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
    const key = `${pos1.x.toFixed(1)},${pos1.y.toFixed(1)},${pos1.z.toFixed(1)}-${pos2.x.toFixed(1)},${pos2.y.toFixed(1)},${pos2.z.toFixed(1)}`;
    const cached = this.distanceCache.get(key);
    const now = performance.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.value;
    }
    
    const distance = pos1.distanceTo(pos2);
    this.distanceCache.set(key, { value: distance, timestamp: now });
    
    // Cleanup old cache entries
    if (this.distanceCache.size > 500) {
      for (const [k, v] of this.distanceCache.entries()) {
        if ((now - v.timestamp) > this.CACHE_DURATION * 2) {
          this.distanceCache.delete(k);
        }
      }
    }
    
    return distance;
  }

  // Object pooling for Vector3
  public static getVector3(): THREE.Vector3 {
    return this.vectorPool.pop() || new THREE.Vector3();
  }

  public static returnVector3(vector: THREE.Vector3): void {
    if (this.vectorPool.length < this.POOL_SIZE) {
      vector.set(0, 0, 0);
      this.vectorPool.push(vector);
    }
  }

  // Object pooling for Matrix4
  public static getMatrix4(): THREE.Matrix4 {
    return this.matrixPool.pop() || new THREE.Matrix4();
  }

  public static returnMatrix4(matrix: THREE.Matrix4): void {
    if (this.matrixPool.length < this.POOL_SIZE) {
      matrix.identity();
      this.matrixPool.push(matrix);
    }
  }

  // Object pooling for Quaternion
  public static getQuaternion(): THREE.Quaternion {
    return this.quaternionPool.pop() || new THREE.Quaternion();
  }

  public static returnQuaternion(quaternion: THREE.Quaternion): void {
    if (this.quaternionPool.length < this.POOL_SIZE) {
      quaternion.set(0, 0, 0, 1);
      this.quaternionPool.push(quaternion);
    }
  }

  // Clear all caches
  public static clearAll(): void {
    this.distanceCache.clear();
  }
}