import * as THREE from 'three';

/**
 * Generic object pool for reusing objects and reducing garbage collection
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private readonly maxSize: number;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  public get(): T {
    let obj: T;
    
    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      obj = this.createFn();
    }
    
    this.inUse.add(obj);
    return obj;
  }

  public release(obj: T): void {
    if (!this.inUse.has(obj)) return;
    
    this.inUse.delete(obj);
    
    if (this.resetFn) {
      this.resetFn(obj);
    }
    
    // Only keep up to maxSize objects in pool
    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  public clear(): void {
    this.available.length = 0;
    this.inUse.clear();
  }

  public getStats(): { available: number; inUse: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size
    };
  }
}

/**
 * Specialized pools for common game objects
 */
export class GameObjectPools {
  private static vector3Pool = new ObjectPool(
    () => new THREE.Vector3(),
    (v) => v.set(0, 0, 0),
    50
  );

  private static quaternionPool = new ObjectPool(
    () => new THREE.Quaternion(),
    (q) => q.set(0, 0, 0, 1),
    30
  );

  private static matrix4Pool = new ObjectPool(
    () => new THREE.Matrix4(),
    (m) => m.identity(),
    20
  );

  public static getVector3(): THREE.Vector3 {
    return this.vector3Pool.get();
  }

  public static releaseVector3(vector: THREE.Vector3): void {
    this.vector3Pool.release(vector);
  }

  public static getQuaternion(): THREE.Quaternion {
    return this.quaternionPool.get();
  }

  public static releaseQuaternion(quaternion: THREE.Quaternion): void {
    this.quaternionPool.release(quaternion);
  }

  public static getMatrix4(): THREE.Matrix4 {
    return this.matrix4Pool.get();
  }

  public static releaseMatrix4(matrix: THREE.Matrix4): void {
    this.matrix4Pool.release(matrix);
  }

  public static getStats(): Record<string, { available: number; inUse: number }> {
    return {
      vector3: this.vector3Pool.getStats(),
      quaternion: this.quaternionPool.getStats(),
      matrix4: this.matrix4Pool.getStats()
    };
  }

  public static clearAll(): void {
    this.vector3Pool.clear();
    this.quaternionPool.clear();
    this.matrix4Pool.clear();
  }
}
