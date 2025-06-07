
import * as THREE from 'three';
import { logger } from '../core/Logger';
import { LOGGING_CONSTANTS, PERFORMANCE_CONSTANTS } from '../core/GameConstants';

interface CachedAnimation {
  jointRotations: Map<string, THREE.Euler>;
  timestamp: number;
  phase: number;
}

export class AnimationCache {
  private cache: Map<string, CachedAnimation> = new Map();
  private readonly maxCacheSize = PERFORMANCE_CONSTANTS.ANIMATION_CACHE_SIZE;
  private readonly cacheTimeout = PERFORMANCE_CONSTANTS.ANIMATION_CACHE_TIMEOUT;

  // Object pools to reduce garbage collection
  private vectorPool: THREE.Vector3[] = [];
  private eulerPool: THREE.Euler[] = [];
  private poolIndex = 0;
  private readonly poolSize = PERFORMANCE_CONSTANTS.OBJECT_POOL_SIZE;

  constructor() {
    this.initializePools();
  }

  private initializePools(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.vectorPool.push(new THREE.Vector3());
      this.eulerPool.push(new THREE.Euler());
    }
    logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, `Initialized object pools with ${this.poolSize} objects each`);
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
    const startTime = performance.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove oldest entries (30% of cache)
    const entriesToRemove = Math.floor(this.maxCacheSize * 0.3);
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove)
      .forEach(([key]) => this.cache.delete(key));
    
    logger.performance(LOGGING_CONSTANTS.MODULES.ANIMATION, `cleanOldEntries (removed ${entriesToRemove} entries)`, startTime);
  }

  public clear(): void {
    this.cache.clear();
    logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, 'Animation cache cleared');
  }

  public getStats(): { size: number; poolUsage: number } {
    return {
      size: this.cache.size,
      poolUsage: this.poolIndex % this.poolSize
    };
  }
}
