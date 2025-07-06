import * as THREE from 'three';
import { TreasureChest, ChestConfig, ChestLoot } from '../world/objects/TreasureChest';
import { Player } from '../entities/Player';

export class ChestInteractionSystem {
  private chests: Map<string, TreasureChest> = new Map();
  private scene: THREE.Scene;
  private player: Player;
  private nearbyChest: TreasureChest | null = null;
  private interactionPromptCallback?: (show: boolean, chestType?: 'common' | 'rare') => void;
  private chestOpenCallback?: (chest: TreasureChest, loot: ChestLoot) => void;

  constructor(scene: THREE.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    console.log('💰 [ChestInteractionSystem] Initialized');
  }

  public setInteractionPromptCallback(callback: (show: boolean, chestType?: 'common' | 'rare') => void): void {
    this.interactionPromptCallback = callback;
  }

  public setChestOpenCallback(callback: (chest: TreasureChest, loot: ChestLoot) => void): void {
    this.chestOpenCallback = callback;
  }

  public createChest(config: ChestConfig): TreasureChest {
    if (this.chests.has(config.id)) {
      console.warn(`💰 [ChestInteractionSystem] Chest with id ${config.id} already exists`);
      return this.chests.get(config.id)!;
    }

    const chest = new TreasureChest(config);
    this.chests.set(config.id, chest);
    this.scene.add(chest.getGroup());

    console.log(`💰 [ChestInteractionSystem] Created ${config.type} chest at:`, config.position, `ID: ${config.id}`);
    return chest;
  }

  public removeChest(id: string): void {
    const chest = this.chests.get(id);
    if (chest) {
      this.scene.remove(chest.getGroup());
      chest.dispose();
      this.chests.delete(id);
      console.log(`💰 [ChestInteractionSystem] Removed chest: ${id}`);
    }
  }

  public handleInteraction(): boolean {
    if (!this.nearbyChest) {
      return false;
    }

    const loot = this.nearbyChest.interact();
    if (loot && this.chestOpenCallback) {
      console.log(`💰 [ChestInteractionSystem] Player opened ${this.nearbyChest.getType()} chest`, loot);
      this.chestOpenCallback(this.nearbyChest, loot);
      return true;
    }

    return false;
  }

  public update(deltaTime: number): void {
    const playerPosition = this.player.getPosition();
    let foundNearbyChest = false;

    // Update all chests
    for (const chest of this.chests.values()) {
      chest.update(deltaTime);

      // Check for nearby chest interaction
      if (chest.canInteract(playerPosition)) {
        if (this.nearbyChest !== chest) {
          this.nearbyChest = chest;
          foundNearbyChest = true;
          
          // Show interaction prompt
          if (this.interactionPromptCallback) {
            this.interactionPromptCallback(true, chest.getType());
          }
          
          console.log(`💰 [ChestInteractionSystem] Player near ${chest.getType()} chest - press E to interact`);
        } else {
          foundNearbyChest = true;
        }
        break; // Only handle one chest at a time
      }
    }

    // Hide interaction prompt if no chest nearby
    if (!foundNearbyChest && this.nearbyChest) {
      this.nearbyChest = null;
      if (this.interactionPromptCallback) {
        this.interactionPromptCallback(false);
      }
    }
  }

  public getNearbyChest(): TreasureChest | null {
    return this.nearbyChest;
  }

  public getAllChests(): TreasureChest[] {
    return Array.from(this.chests.values());
  }

  public getChestById(id: string): TreasureChest | null {
    return this.chests.get(id) || null;
  }

  public dispose(): void {
    for (const chest of this.chests.values()) {
      this.scene.remove(chest.getGroup());
      chest.dispose();
    }
    this.chests.clear();
    this.nearbyChest = null;
    console.log('💰 [ChestInteractionSystem] Disposed');
  }
}