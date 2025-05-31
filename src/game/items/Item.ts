
export interface ItemConfig {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'material';
  value: number;
  description: string;
}

export class Item {
  protected config: ItemConfig;
  public quantity: number = 1;
  
  constructor(config: ItemConfig) {
    this.config = config;
  }
  
  public getId(): string {
    return this.config.id;
  }
  
  public getName(): string {
    return this.config.name;
  }
  
  public getType(): string {
    return this.config.type;
  }
  
  public getValue(): number {
    return this.config.value;
  }
  
  public getDescription(): string {
    return this.config.description;
  }
}
