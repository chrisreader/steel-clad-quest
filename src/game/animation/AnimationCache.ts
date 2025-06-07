
import * as THREE from 'three';
import { logger } from '../core/Logger';
import { LOGGING_CONSTANTS, PERFORMANCE_CONSTANTS } from '../core/GameConstants';
import { GameObjectPools } from '../performance/ObjectPool';

interface CachedAnimation {
  jointRotations: Map<string, THREE.Euler>;
  timestamp: number;
  phase: number;
}

export class AnimationCache {
  private cache: Map<string, CachedAnimation> = new Map();
  private readonly maxCacheSize = PERFORMANCE_CONSTANTS.ANIMATION_CACHE_SIZE;
  private readonly cacheTimeout = PERFORMANCE_CONSTANTS.ANIMATION_CACHE_TIMEOUT;

  // Performance tracking
  private hitCount = 0;
  private missCount = 0;
  private lastCleanup = 0;
  private cleanupInterval = 5000; // 5 seconds

  constructor() {
    console.log(`🎯 [AnimationCache] Initialized with object pooling and enhanced caching`);
  }

  public getCachedAnimation(key: string, phase: number, tolerance: number = 0.01): CachedAnimation | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.missCount++;
      return null;
    }

    // Check if cached animation is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Check if phase is close enough
    if (Math.abs(cached.phase - phase) <= tolerance) {
      this.hitCount++;
      return cached;
    }

    this.missCount++;
    return null;
  }

  public cacheAnimation(key: string, jointRotations: Map<string, THREE.Euler>, phase: number): void {
    // Perform cleanup if needed
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.performMaintenance();
      this.lastCleanup = now;
    }

    // Clean old cache entries if we're at the limit
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanOldEntries();
    }

    // Create cached animation using pooled objects where possible
    const cached: CachedAnimation = {
      jointRotations: new Map(),
      timestamp: now,
      phase
    };

    // Copy rotations using pooled Euler objects when possible
    for (const [joint, rotation] of jointRotations.entries()) {
      const pooledEuler = GameObjectPools.euler3Pool.acquire();
      pooledEuler.copy(rotation);
      cached.jointRotations.set(joint, pooledEuler);
    }

    this.cache.set(key, cached);
  }

  private cleanOldEntries(): void {
    const startTime = performance.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove oldest entries (30% of cache)
    const entriesToRemove = Math.floor(this.maxCacheSize * 0.3);
    const removedEntries = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove);

    // Return pooled objects before removing entries
    for (const [key, cached] of removedEntries) {
      for (const euler of cached.jointRotations.values()) {
        GameObjectPools.euler3Pool.release(euler);
      }
      this.cache.delete(key);
    }
    
    logger.performance(LOGGING_CONSTANTS.MODULES.ANIMATION, `cleanOldEntries (removed ${entriesToRemove} entries)`, startTime);
  }

  private performMaintenance(): void {
    const startTime = performance.now();
    
    // Remove expired entries and return pooled objects
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        expiredKeys.push(key);
        // Return pooled objects
        for (const euler of cached.jointRotations.values()) {
          GameObjectPools.euler3Pool.release(euler);
        }
      }
    }
    
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, `Maintenance: removed ${expiredKeys.length} expired entries`);
    }
    
    logger.performance(LOGGING_CONSTANTS.MODULES.ANIMATION, `performMaintenance`, startTime);
  }

  public clear(): void {
    // Return all pooled objects before clearing
    for (const cached of this.cache.values()) {
      for (const euler of cached.jointRotations.values()) {
        GameObjectPools.euler3Pool.release(euler);
      }
    }
    
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    logger.debug(LOGGING_CONSTANTS.MODULES.ANIMATION, 'Animation cache cleared');
  }

  public getStats(): { 
    size: number; 
    hitRate: number; 
    totalRequests: number;
    poolStats: any;
  } {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      totalRequests,
      poolStats: GameObjectPools.euler3Pool.getStats()
    };
  }
}
