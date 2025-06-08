
export class BatchProcessor<T> {
  private items: T[] = [];
  private processFn: (item: T, deltaTime: number) => void;
  private batchSize: number;
  private currentIndex: number = 0;
  private lastProcessTime: number = 0;
  private readonly maxProcessTime: number = 2; // Max 2ms per frame

  constructor(
    processFn: (item: T, deltaTime: number) => void,
    batchSize: number = 10
  ) {
    this.processFn = processFn;
    this.batchSize = batchSize;
  }

  public addItem(item: T): void {
    if (!this.items.includes(item)) {
      this.items.push(item);
    }
  }

  public removeItem(item: T): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
      if (this.currentIndex > index) {
        this.currentIndex--;
      }
    }
  }

  public process(deltaTime: number): void {
    if (this.items.length === 0) return;

    const startTime = performance.now();
    let processed = 0;

    while (processed < this.batchSize && performance.now() - startTime < this.maxProcessTime) {
      if (this.currentIndex >= this.items.length) {
        this.currentIndex = 0;
      }

      const item = this.items[this.currentIndex];
      if (item) {
        this.processFn(item, deltaTime);
      }

      this.currentIndex++;
      processed++;
    }
  }

  public clear(): void {
    this.items = [];
    this.currentIndex = 0;
  }

  public getStats(): { totalItems: number; currentIndex: number } {
    return {
      totalItems: this.items.length,
      currentIndex: this.currentIndex
    };
  }
}
