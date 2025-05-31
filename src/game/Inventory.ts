
import { Item } from './items/Item';

export class Inventory {
  private items: Item[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }
  
  public addItem(item: Item): boolean {
    if (this.items.length >= this.maxSize) {
      return false;
    }
    this.items.push(item);
    return true;
  }
  
  public removeItem(item: Item): boolean {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }
  
  public getItems(): Item[] {
    return [...this.items];
  }
  
  public hasSpace(): boolean {
    return this.items.length < this.maxSize;
  }
}
