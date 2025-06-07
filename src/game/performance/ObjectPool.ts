
import * as THREE from 'three';

export class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10, maxSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  public acquire(): T {
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
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.resetFn(obj);

      // Only return to pool if under max size
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    }
  }

  public getStats(): { available: number; inUse: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size
    };
  }

  public clear(): void {
    this.available.length = 0;
    this.inUse.clear();
  }
}

// Common object pools
export class GameObjectPools {
  public static vector3Pool = new ObjectPool(
    () => new THREE.Vector3(),
    (v) => v.set(0, 0, 0),
    50,
    200
  );

  public static euler3Pool = new ObjectPool(
    () => new THREE.Euler(),
    (e) => e.set(0, 0, 0),
    50,
    200
  );

  public static matrix4Pool = new ObjectPool(
    () => new THREE.Matrix4(),
    (m) => m.identity(),
    20,
    100
  );

  public static quaternionPool = new ObjectPool(
    () => new THREE.Quaternion(),
    (q) => q.set(0, 0, 0, 1),
    50,
    200
  );

  public static clearAll(): void {
    this.vector3Pool.clear();
    this.euler3Pool.clear();
    this.matrix4Pool.clear();
    this.quaternionPool.clear();
  }
}
