
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  private activeObjects: Set<T> = new Set();

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  public acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }
    
    this.activeObjects.add(obj);
    return obj;
  }

  public release(obj: T): void {
    if (!this.activeObjects.has(obj)) return;
    
    this.activeObjects.delete(obj);
    this.resetFn(obj);
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  public releaseAll(): void {
    for (const obj of this.activeObjects) {
      this.resetFn(obj);
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
    this.activeObjects.clear();
  }

  public getStats(): { poolSize: number; activeCount: number } {
    return {
      poolSize: this.pool.length,
      activeCount: this.activeObjects.size
    };
  }
}
