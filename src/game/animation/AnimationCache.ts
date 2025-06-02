
import * as THREE from 'three';

interface CachedAnimation {
  jointRotations: Map<string, THREE.Euler>;
  timestamp: number;
  phase: number;
}

export class AnimationCache {
  private cache: Map<string, CachedAnimation> = new Map();
  private readonly maxCacheSize = 100;
  private readonly cacheTimeout = 5000; // 5 seconds

  // Vector3 object pool to reduce garbage collection
  private vectorPool: THREE.Vector3[] = [];
  private eulerPool: THREE.Euler[] = [];
  private poolIndex = 0;
  private readonly poolSize = 50;

  constructor() {
    this.initializePools();
  }

  private initializePools(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.vectorPool.push(new THREE.Vector3());
      this.eulerPool.push(new THREE.Euler());
    }
  }

  public getPooledVector3(): THREE.Vector3 {
    const vector = this.vectorPool[this.poolIndex % this.poolSize];
    this.poolIndex++;
    return vector.set(0, 0, 0);
  }

  public getPooledEuler(): THREE.Euler {
    const euler = this.eulerPool[this.poolIndex % this.poolSize];
    this.poolIndex++;
    return euler.set(0, 0, 0);
  }

  public getCachedAnimation(key: string, phase: number, tolerance: number = 0.01): CachedAnimation | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cached animation is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    // Check if phase is close enough
    if (Math.abs(cached.phase - phase) <= tolerance) {
      return cached;
    }

    return null;
  }

  public cacheAnimation(key: string, jointRotations: Map<string, THREE.Euler>, phase: number): void {
    // Clean old cache entries if we're at the limit
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanOldEntries();
    }

    const cached: CachedAnimation = {
      jointRotations: new Map(jointRotations),
      timestamp: Date.now(),
      phase
    };

    this.cache.set(key, cached);
  }

  private cleanOldEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove oldest entries
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.floor(this.maxCacheSize * 0.3))
      .forEach(([key]) => this.cache.delete(key));
  }

  public clear(): void {
    this.cache.clear();
  }
}
