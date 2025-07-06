import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TentComponent } from './components/TentComponent';
import { CampFurnitureComponent } from './components/CampFurnitureComponent';
import { FireplaceComponent } from './components/FireplaceComponent';
import { TreasureChest } from '../world/objects/TreasureChest';
import { AudioManager } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';
import { HumanNPC } from '../entities/humanoid/HumanNPC';

export interface CampConfig {
  size: 'small' | 'medium' | 'large';
  npcCount: number;
  hasRareChest: boolean;
  tentCount: number;
}

export class HumanCampBuilding extends BaseBuilding {
  private config: CampConfig;
  private audioManager: AudioManager | null = null;
  private effectsManager: EffectsManager | null = null;
  private fireplaceComponent: FireplaceComponent | null = null;
  private tents: THREE.Group[] = [];
  private chests: TreasureChest[] = [];
  private npcs: HumanNPC[] = [];
  private furniture: THREE.Group[] = [];

  constructor(scene: THREE.Scene, physicsManager: any, position: THREE.Vector3, config?: Partial<CampConfig>) {
    super(scene, physicsManager, position);
    
    // Generate random camp configuration
    this.config = this.generateCampConfig(config);
    
    console.log(`🏕️ [HumanCampBuilding] Creating ${this.config.size} human camp with ${this.config.npcCount} NPCs`);
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  public setEffectsManager(effectsManager: EffectsManager): void {
    this.effectsManager = effectsManager;
  }

  protected createStructure(): void {
    console.log(`🏕️ [HumanCampBuilding] Creating camp structure at position:`, this.position);

    // 1. Create central fireplace
    this.createCampFireplace();

    // 2. Create tents around the fireplace
    this.createCampTents();

    // 3. Add furniture (logs, tables, stools)
    this.createCampFurniture();

    // 4. Add treasure chests
    this.createCampChests();

    // 5. Add scattered firewood and supplies
    this.createCampSupplies();

    // 6. Create NPCs
    this.createCampNPCs();

    console.log(`🏕️ [HumanCampBuilding] Camp structure complete with ${this.components.length} components`);
  }

  private generateCampConfig(config?: Partial<CampConfig>): CampConfig {
    const baseConfigs = {
      small: { npcCount: 2, tentCount: 1, hasRareChest: false },
      medium: { npcCount: 3, tentCount: 2, hasRareChest: Math.random() < 0.3 },
      large: { npcCount: 4 + Math.floor(Math.random() * 2), tentCount: 3, hasRareChest: Math.random() < 0.6 }
    };

    const size = config?.size || (['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as 'small' | 'medium' | 'large');
    const baseConfig = baseConfigs[size];

    return {
      size,
      npcCount: config?.npcCount || baseConfig.npcCount,
      hasRareChest: config?.hasRareChest !== undefined ? config.hasRareChest : baseConfig.hasRareChest,
      tentCount: config?.tentCount || baseConfig.tentCount
    };
  }

  private createCampFireplace(): void {
    if (!this.audioManager) {
      console.warn('🔥 AudioManager not set for HumanCampBuilding. Creating fireplace without audio.');
      this.audioManager = {} as AudioManager;
    }

    console.log('🔥 Creating camp fireplace');
    
    this.fireplaceComponent = new FireplaceComponent(
      this.scene,
      this.physicsManager,
      this.audioManager,
      new THREE.Vector3(0, 0, 0), // Center of camp
      `camp_fireplace_${Date.now()}`
    );
    
    const fireplaceGroup = this.fireplaceComponent.create();
    this.buildingGroup.add(fireplaceGroup);
    
    // Register fireplace collisions
    this.fireplaceComponent.registerCollisions('human_camp');
    
    console.log('🔥 Camp fireplace created successfully');
  }

  private createCampTents(): void {
    console.log(`⛺ Creating ${this.config.tentCount} tents for camp`);
    
    const tentPositions = this.generateTentPositions(this.config.tentCount);
    
    for (let i = 0; i < this.config.tentCount; i++) {
      const position = tentPositions[i];
      const tentComponent = new TentComponent(this.scene, position);
      const tent = tentComponent.createRandomCampTent();
      
      // Random rotation for natural look
      tent.rotation.y = Math.random() * Math.PI * 2;
      
      this.buildingGroup.add(tent);
      this.tents.push(tent);
      this.addComponent(tent, `tent_${i + 1}`, 'fabric');
      
      console.log(`⛺ Created tent ${i + 1} at position:`, position);
    }
  }

  private generateTentPositions(tentCount: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const campRadius = this.config.size === 'small' ? 4 : this.config.size === 'medium' ? 6 : 8;
    
    for (let i = 0; i < tentCount; i++) {
      const angle = (i / tentCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = campRadius * (0.6 + Math.random() * 0.4);
      
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      positions.push(position);
    }
    
    return positions;
  }

  private createCampFurniture(): void {
    console.log('🪑 Creating camp furniture');
    
    const furnitureCount = this.config.size === 'small' ? 2 : this.config.size === 'medium' ? 4 : 6;
    
    for (let i = 0; i < furnitureCount; i++) {
      const angle = (i / furnitureCount) * Math.PI * 2 + Math.random() * 0.8;
      const distance = 2.5 + Math.random() * 1.5;
      
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      const furnitureComponent = new CampFurnitureComponent(this.scene, position);
      
      let furniture: THREE.Group;
      const rand = Math.random();
      
      if (rand < 0.5) {
        furniture = furnitureComponent.createLogSeat();
      } else if (rand < 0.8) {
        furniture = furnitureComponent.createCampStool();
      } else {
        furniture = furnitureComponent.createCampTable();
      }
      
      // Random rotation
      furniture.rotation.y = Math.random() * Math.PI * 2;
      
      this.buildingGroup.add(furniture);
      this.furniture.push(furniture);
      this.addComponent(furniture, `furniture_${i + 1}`, 'wood');
    }
    
    console.log(`🪑 Created ${furnitureCount} pieces of camp furniture`);
  }

  private createCampChests(): void {
    console.log('💰 Creating camp chests');
    
    // Always have at least one common chest
    const commonChestPosition = this.position.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        0,
        (Math.random() - 0.5) * 6
      )
    );
    
    const commonChest = new TreasureChest({
      type: 'common',
      position: commonChestPosition,
      id: `camp_common_chest_${Date.now()}`
    });
    
    this.scene.add(commonChest.getGroup());
    this.chests.push(commonChest);
    this.addComponent(commonChest.getGroup(), 'common_chest', 'wood');
    
    // Maybe add rare chest
    if (this.config.hasRareChest) {
      const rareChestPosition = this.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          0,
          (Math.random() - 0.5) * 8
        )
      );
      
      const rareChest = new TreasureChest({
        type: 'rare',
        position: rareChestPosition,
        id: `camp_rare_chest_${Date.now()}`
      });
      
      this.scene.add(rareChest.getGroup());
      this.chests.push(rareChest);
      this.addComponent(rareChest.getGroup(), 'rare_chest', 'metal');
      
      console.log('💰 Added rare chest to camp');
    }
    
    console.log(`💰 Created ${this.chests.length} chest(s) for camp`);
  }

  private createCampSupplies(): void {
    console.log('📦 Creating camp supplies');
    
    // Add firewood piles
    const firewoodCount = this.config.size === 'small' ? 1 : this.config.size === 'medium' ? 2 : 3;
    
    for (let i = 0; i < firewoodCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 3 + Math.random() * 2;
      
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      const furnitureComponent = new CampFurnitureComponent(this.scene, position);
      const firewood = furnitureComponent.createFirewoodPile(6 + Math.floor(Math.random() * 6));
      
      this.buildingGroup.add(firewood);
      this.addComponent(firewood, `firewood_pile_${i + 1}`, 'wood');
    }
    
    console.log(`📦 Created ${firewoodCount} firewood pile(s)`);
  }

  private createCampNPCs(): void {
    if (!this.effectsManager || !this.audioManager) {
      console.warn('🏕️ [HumanCampBuilding] AudioManager or EffectsManager not set. Cannot create NPCs.');
      return;
    }

    console.log(`👥 Creating ${this.config.npcCount} camp NPCs`);
    
    for (let i = 0; i < this.config.npcCount; i++) {
      const angle = (i / this.config.npcCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 2 + Math.random() * 3;
      
      const npcPosition = this.position.clone().add(
        new THREE.Vector3(
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        )
      );
      
      const npc = HumanNPC.createCampNPC(
        this.scene,
        npcPosition,
        this.effectsManager,
        this.audioManager,
        i
      );
      
      this.npcs.push(npc);
      console.log(`👤 Created camp NPC ${i + 1} at position:`, npcPosition);
    }
    
    console.log(`👥 Created ${this.npcs.length} camp NPCs successfully`);
  }

  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // Update fireplace
    if (this.fireplaceComponent) {
      this.fireplaceComponent.update(deltaTime);
    }
    
    // Update chests
    this.chests.forEach(chest => {
      chest.update(deltaTime);
    });
    
    // Update NPCs
    this.npcs.forEach(npc => {
      npc.update(deltaTime, playerPosition);
    });
  }

  public dispose(): void {
    // Dispose fireplace
    if (this.fireplaceComponent) {
      this.fireplaceComponent.dispose();
      this.fireplaceComponent = null;
    }
    
    // Dispose chests
    this.chests.forEach(chest => {
      this.scene.remove(chest.getGroup());
      chest.dispose();
    });
    this.chests.length = 0;
    
    // Dispose NPCs
    this.npcs.forEach(npc => {
      npc.dispose();
    });
    this.npcs.length = 0;
    
    // Dispose tents and furniture
    this.tents.length = 0;
    this.furniture.length = 0;
    
    super.dispose();
    console.log('🏕️ [HumanCampBuilding] Disposed human camp building');
  }

  protected getBuildingName(): string {
    return `Human Camp (${this.config.size})`;
  }

  public getChests(): TreasureChest[] {
    return [...this.chests];
  }

  public getNPCs(): HumanNPC[] {
    return [...this.npcs];
  }

  public getCampConfig(): CampConfig {
    return { ...this.config };
  }
}