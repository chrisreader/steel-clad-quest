
import * as THREE from 'three';

export class MemoryManager {
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private cleanupInterval: number = 30000; // 30 seconds
  private lastCleanup: number = 0;
  private usageTracking: Map<string, number> = new Map();

  public getGeometry(key: string, createFn: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geometry = this.geometryCache.get(key);
    if (!geometry) {
      geometry = createFn();
      this.geometryCache.set(key, geometry);
    }
    this.trackUsage(key);
    return geometry;
  }

  public getMaterial(key: string, createFn: () => THREE.Material): THREE.Material {
    let material = this.materialCache.get(key);
    if (!material) {
      material = createFn();
      this.materialCache.set(key, material);
    }
    this.trackUsage(key);
    return material.clone();
  }

  public getTexture(key: string, createFn: () => THREE.Texture): THREE.Texture {
    let texture = this.textureCache.get(key);
    if (!texture) {
      texture = createFn();
      this.textureCache.set(key, texture);
    }
    this.trackUsage(key);
    return texture;
  }

  private trackUsage(key: string): void {
    const currentUsage = this.usageTracking.get(key) || 0;
    this.usageTracking.set(key, currentUsage + 1);
  }

  public update(): void {
    const now = performance.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup();
      this.lastCleanup = now;
    }
  }

  private cleanup(): void {
    // Clean up unused resources
    const threshold = 5; // Minimum usage count to keep
    
    for (const [key, usage] of this.usageTracking.entries()) {
      if (usage < threshold) {
        // Remove from caches
        const geometry = this.geometryCache.get(key);
        if (geometry) {
          geometry.dispose();
          this.geometryCache.delete(key);
        }
        
        const material = this.materialCache.get(key);
        if (material) {
          material.dispose();
          this.materialCache.delete(key);
        }
        
        const texture = this.textureCache.get(key);
        if (texture) {
          texture.dispose();
          this.textureCache.delete(key);
        }
        
        this.usageTracking.delete(key);
      }
    }
    
    // Reset usage counts
    for (const [key] of this.usageTracking.entries()) {
      this.usageTracking.set(key, 0);
    }
    
    console.log(`🧹 Memory cleanup completed. Cached: ${this.geometryCache.size} geometries, ${this.materialCache.size} materials, ${this.textureCache.size} textures`);
  }

  public getStats(): { geometries: number; materials: number; textures: number } {
    return {
      geometries: this.geometryCache.size,
      materials: this.materialCache.size,
      textures: this.textureCache.size
    };
  }

  public dispose(): void {
    // Dispose all cached resources
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    
    this.geometryCache.clear();
    this.materialCache.clear();
    this.textureCache.clear();
    this.usageTracking.clear();
  }
}
