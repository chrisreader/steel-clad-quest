import * as THREE from 'three';

export interface PoolableObject {
  reset(): void;
  dispose(): void;
  isActive(): boolean;
  setActive(active: boolean): void;
}

export class ObjectPool<T extends PoolableObject> {
  private objects: T[] = [];
  private factory: () => T;
  private maxSize: number;
  private activeCount: number = 0;
  
  constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj.setActive(false);
      this.objects.push(obj);
    }
    
    console.log(`🏊 [ObjectPool] Created pool with ${initialSize} objects (max: ${maxSize})`);
  }
  
  public acquire(): T | null {
    // Find inactive object
    for (const obj of this.objects) {
      if (!obj.isActive()) {
        obj.setActive(true);
        obj.reset();
        this.activeCount++;
        return obj;
      }
    }
    
    // Create new object if under max size
    if (this.objects.length < this.maxSize) {
      const obj = this.factory();
      obj.setActive(true);
      this.objects.push(obj);
      this.activeCount++;
      return obj;
    }
    
    console.warn('🏊 [ObjectPool] Pool exhausted, cannot acquire new object');
    return null;
  }
  
  public release(obj: T): void {
    if (obj.isActive()) {
      obj.setActive(false);
      obj.reset();
      this.activeCount--;
    }
  }
  
  public getStats(): { total: number; active: number; available: number } {
    return {
      total: this.objects.length,
      active: this.activeCount,
      available: this.objects.length - this.activeCount
    };
  }
  
  public dispose(): void {
    this.objects.forEach(obj => obj.dispose());
    this.objects = [];
    this.activeCount = 0;
    console.log('🏊 [ObjectPool] Disposed all objects');
  }
}

// Concrete implementations for common game objects

export class PooledParticle implements PoolableObject {
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public sprite: THREE.Sprite;
  private active: boolean = false;
  
  constructor() {
    const material = new THREE.SpriteMaterial({ transparent: true });
    this.sprite = new THREE.Sprite(material);
  }
  
  public reset(): void {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.sprite.position.copy(this.position);
    this.sprite.visible = false;
  }
  
  public dispose(): void {
    if (this.sprite.material) {
      this.sprite.material.dispose();
    }
  }
  
  public isActive(): boolean {
    return this.active;
  }
  
  public setActive(active: boolean): void {
    this.active = active;
    this.sprite.visible = active;
  }
}

export class PooledCloudPuff implements PoolableObject {
  public mesh: THREE.Mesh;
  private active: boolean = false;
  
  constructor() {
    const geometry = new THREE.SphereGeometry(10, 16, 12);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0xffffff, 
      transparent: true 
    });
    this.mesh = new THREE.Mesh(geometry, material);
  }
  
  public reset(): void {
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
    this.mesh.visible = false;
    if (this.mesh.material instanceof THREE.MeshLambertMaterial) {
      this.mesh.material.opacity = 0.4;
    }
  }
  
  public dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
  
  public isActive(): boolean {
    return this.active;
  }
  
  public setActive(active: boolean): void {
    this.active = active;
    this.mesh.visible = active;
  }
}

// Global pool manager
export class PoolManager {
  private static instance: PoolManager;
  private pools: Map<string, ObjectPool<any>> = new Map();
  
  public static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }
  
  public createPool<T extends PoolableObject>(
    name: string, 
    factory: () => T, 
    initialSize: number = 10, 
    maxSize: number = 100
  ): ObjectPool<T> {
    const pool = new ObjectPool(factory, initialSize, maxSize);
    this.pools.set(name, pool);
    return pool;
  }
  
  public getPool<T extends PoolableObject>(name: string): ObjectPool<T> | null {
    return this.pools.get(name) || null;
  }
  
  public getStats(): Record<string, { total: number; active: number; available: number }> {
    const stats: Record<string, any> = {};
    for (const [name, pool] of this.pools.entries()) {
      stats[name] = pool.getStats();
    }
    return stats;
  }
  
  public dispose(): void {
    this.pools.forEach(pool => pool.dispose());
    this.pools.clear();
    console.log('🏊 [PoolManager] Disposed all pools');
  }
}