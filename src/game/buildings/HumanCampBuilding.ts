import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TentComponent } from './components/TentComponent';
import { CampFurnitureComponent } from './components/CampFurnitureComponent';
import { FireplaceComponent } from './components/FireplaceComponent';
import { TreasureChest } from '../world/objects/TreasureChest';
import { AudioManager } from '../engine/AudioManager';
import { EffectsManager } from '../engine/EffectsManager';
import { CampNPC } from '../entities/humanoid/CampNPC';
import { ChestInteractionSystem } from '../systems/ChestInteractionSystem';

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
  private campKeeper: CampNPC | null = null;
  private furniture: THREE.Group[] = [];
  private chestInteractionSystem: ChestInteractionSystem | null = null;

  constructor(scene: THREE.Scene, physicsManager: any, position: THREE.Vector3, config?: Partial<CampConfig>) {
    super(scene, physicsManager, position);
    
    // Generate random camp configuration
    this.config = this.generateCampConfig(config);
    
    console.log(`🏕️ [HumanCampBuilding] Creating ${this.config.size} human camp with camp keeper`);
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  public setEffectsManager(effectsManager: EffectsManager): void {
    this.effectsManager = effectsManager;
  }

  public setChestInteractionSystem(chestInteractionSystem: ChestInteractionSystem): void {
    this.chestInteractionSystem = chestInteractionSystem;
  }

  protected createStructure(): void {
    console.log(`🏕️ [HumanCampBuilding] Creating camp structure at position:`, this.position);

    // 1. Create central fireplace
    this.createEnhancedFireplace();

    // 2. Create tents around the fireplace
    this.createCampTents();

    // 3. Add furniture (logs, tables, stools)
    this.createCampFurniture();

    // 4. Add treasure chests
    this.createCampChests();

    // 5. Add scattered firewood and supplies
    this.createCampSupplies();

    // 6. Create camp keeper
    console.log('🏕️ [HumanCampBuilding] About to create camp keeper');
    this.createCampKeeper();
    console.log('🏕️ [HumanCampBuilding] Camp keeper creation finished');

    console.log(`🏕️ [HumanCampBuilding] Camp structure complete with ${this.components.length} components`);
  }

  private generateCampConfig(config?: Partial<CampConfig>): CampConfig {
    const baseConfigs = {
      small: { npcCount: 1, tentCount: 1, hasRareChest: false },
      medium: { npcCount: 1, tentCount: 2, hasRareChest: Math.random() < 0.2 },
      large: { npcCount: 1, tentCount: 2, hasRareChest: Math.random() < 0.4 }
    };

    const size = config?.size || (['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as 'small' | 'medium' | 'large');
    const baseConfig = baseConfigs[size];

    return {
      size,
      npcCount: 1, // Always single camp keeper
      hasRareChest: config?.hasRareChest !== undefined ? config.hasRareChest : baseConfig.hasRareChest,
      tentCount: config?.tentCount || baseConfig.tentCount
    };
  }

  private createEnhancedFireplace(): void {
    if (!this.audioManager) {
      console.warn('🔥 AudioManager not set for HumanCampBuilding. Creating fireplace without audio.');
      // Create a mock audio manager for now
      this.audioManager = {} as AudioManager;
    }

    this.fireplaceComponent = new FireplaceComponent(
      this.scene,
      this.physicsManager,
      this.audioManager,
      this.position.clone(), // Pass world position for fire effects
      'camp_fireplace_' + this.position.x.toFixed(0) + '_' + this.position.z.toFixed(0), // Unique but consistent ID
      false // Time-based: on at sunset (19:00), off at sunrise (6:00)
    );
    
    const fireplaceGroup = this.fireplaceComponent.create();
    this.buildingGroup.add(fireplaceGroup);
    
    // Register fireplace collisions
    this.fireplaceComponent.registerCollisions('human_camp');
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
    
    // PERFORMANCE: Reduced furniture count to minimize render load
    const furnitureCount = this.config.size === 'small' ? 1 : this.config.size === 'medium' ? 2 : 3;
    
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
    console.log('💰 [HumanCampBuilding] Creating camp chests - START');
    console.log('💰 [HumanCampBuilding] Camp position:', this.position);
    console.log('💰 [HumanCampBuilding] ChestInteractionSystem available:', !!this.chestInteractionSystem);
    
    if (!this.chestInteractionSystem) {
      console.warn('💰 [HumanCampBuilding] ChestInteractionSystem not available, skipping chest creation');
      return;
    }
    
    // Always have at least one common chest - positioned close to fireplace
    const commonChestPosition = this.position.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 4, // Reduced from 6 to 4 units
        0, // Y=0 to ensure floor level
        (Math.random() - 0.5) * 4  // Reduced from 6 to 4 units
      )
    );
    
    console.log('💰 [HumanCampBuilding] Common chest position:', commonChestPosition);
    
    const commonChest = this.chestInteractionSystem.createChest({
      type: 'common',
      position: commonChestPosition,
      id: `camp_common_chest_${this.position.x.toFixed(0)}_${this.position.z.toFixed(0)}_${Date.now()}`
    });
    
    this.chests.push(commonChest);
    this.addComponent(commonChest.getGroup(), 'common_chest', 'wood');
    console.log('💰 [HumanCampBuilding] Common chest created successfully');
    
    // Maybe add rare chest
    if (this.config.hasRareChest) {
      const rareChestPosition = this.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 5, // Reduced from 8 to 5 units
          0, // Y=0 to ensure floor level
          (Math.random() - 0.5) * 5  // Reduced from 8 to 5 units
        )
      );
      
      console.log('💰 [HumanCampBuilding] Rare chest position:', rareChestPosition);
      
      const rareChest = this.chestInteractionSystem.createChest({
        type: 'rare',
        position: rareChestPosition,
        id: `camp_rare_chest_${this.position.x.toFixed(0)}_${this.position.z.toFixed(0)}_${Date.now()}`
      });
      
      this.chests.push(rareChest);
      this.addComponent(rareChest.getGroup(), 'rare_chest', 'metal');
      
      console.log('💰 [HumanCampBuilding] Rare chest created successfully');
    }
    
    console.log(`💰 [HumanCampBuilding] Camp chest creation COMPLETE - ${this.chests.length} chest(s) for camp`);
  }

  private createCampSupplies(): void {
    console.log('📦 Creating camp supplies');
    
    // PERFORMANCE: Reduced supply count to minimize render load
    const firewoodCount = this.config.size === 'small' ? 1 : this.config.size === 'medium' ? 1 : 2;
    
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

  private createCampKeeper(): void {
    if (!this.audioManager || !this.effectsManager) {
      console.warn('🏕️ [HumanCampBuilding] AudioManager or EffectsManager not set. Cannot create camp keeper.');
      return;
    }

    try {
      // Position the camp keeper near the fireplace
      const keeperPosition = new THREE.Vector3(2, 0, 1);
      // Adjust position to be relative to camp position
      keeperPosition.add(this.position);
      
      this.campKeeper = CampNPC.createCampKeeper(
        this.scene,
        keeperPosition,
        this.position, // Pass camp center position for waypoint calculations
        this.effectsManager,
        this.audioManager
      );
      
      if (this.campKeeper) {
        // Add to building group for proper management
        if (this.campKeeper && 'getGroup' in this.campKeeper && typeof this.campKeeper.getGroup === 'function') {
          const npcGroup = this.campKeeper.getGroup();
          if (npcGroup) {
            this.buildingGroup.add(npcGroup);
          }
        }
      }
    } catch (error) {
      console.error('👤❌ [HumanCampBuilding] Error creating camp keeper:', error);
    }
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
    
    // Update camp keeper
    if (this.campKeeper) {
      this.campKeeper.update(deltaTime, playerPosition);
    }
    
    // NPC Recovery System: Try to create missing NPCs if managers are now available
    if (!this.campKeeper && this.audioManager && this.effectsManager) {
      this.createCampKeeper();
    }
  }

  public updateTimeOfDay(gameTime: number, timePhases: any): void {
    if (this.fireplaceComponent) {
      this.fireplaceComponent.updateTimeOfDay(gameTime, timePhases);
    }
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
    
    // Dispose camp keeper
    if (this.campKeeper) {
      this.campKeeper.dispose();
      this.campKeeper = null;
    }
    
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

  public getCampKeeper(): CampNPC | null {
    return this.campKeeper;
  }

  public getCampConfig(): CampConfig {
    return { ...this.config };
  }
}