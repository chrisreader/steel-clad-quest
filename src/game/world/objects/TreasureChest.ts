import * as THREE from 'three';
import { Item } from '../../../types/GameTypes';
import { TextureGenerator } from '../../utils';

export interface ChestConfig {
  type: 'common' | 'rare';
  position: THREE.Vector3;
  id: string;
}

export interface ChestLoot {
  items: Item[];
  gold: number;
}

export class TreasureChest {
  private group: THREE.Group;
  private lid: THREE.Group;
  private base: THREE.Mesh;
  private config: ChestConfig;
  private isOpen: boolean = false;
  private isAnimating: boolean = false;
  private openRotation: number = Math.PI / 3; // 60 degrees open
  private animationDuration: number = 0.5;
  private animationStartTime: number = 0;
  private loot: ChestLoot;
  private hasBeenLooted: boolean = false;
  private glowEffect?: THREE.PointLight;

  constructor(config: ChestConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.lid = new THREE.Group();
    this.base = new THREE.Mesh();
    
    this.generateLoot();
    this.createChestModel();
    this.setupPosition();
    
    if (config.type === 'rare') {
      this.addGlowEffect();
    }
    
    console.log(`💰 [TreasureChest] Created ${config.type} chest at position:`, config.position);
  }

  private generateLoot(): void {
    const lootTable = this.config.type === 'common' ? this.getCommonLoot() : this.getRareLoot();
    this.loot = lootTable;
    console.log(`💰 [TreasureChest] Generated loot for ${this.config.type} chest:`, this.loot);
  }

  private getCommonLoot(): ChestLoot {
    const items: Item[] = [];
    const goldAmount = Math.floor(Math.random() * 40) + 10; // 10-50 gold

    // 1-3 health potions
    const potionCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < potionCount; i++) {
      items.push({
        id: `health_potion_${Date.now()}_${i}`,
        name: 'Health Potion',
        type: 'potion',
        value: 25,
        description: 'Restores 50 health points',
        quantity: 1,
        tier: 'common',
        stats: { health: 50 }
      });
    }

    // Chance for a common weapon
    if (Math.random() < 0.3) { // 30% chance
      items.push({
        id: `wooden_sword_${Date.now()}`,
        name: 'Wooden Sword',
        type: 'weapon',
        subtype: 'sword',
        value: 50,
        description: 'A basic wooden training sword',
        quantity: 1,
        tier: 'common',
        equipmentSlot: 'primary',
        weaponId: 'wooden_sword',
        stats: { attackPower: 15 }
      });
    }

    return { items, gold: goldAmount };
  }

  private getRareLoot(): ChestLoot {
    const items: Item[] = [];
    const goldAmount = Math.floor(Math.random() * 400) + 100; // 100-500 gold

    // 3-5 rare items
    const itemCount = Math.floor(Math.random() * 3) + 3;
    
    // Superior health potions
    for (let i = 0; i < 2; i++) {
      items.push({
        id: `superior_health_potion_${Date.now()}_${i}`,
        name: 'Superior Health Potion',
        type: 'potion',
        value: 75,
        description: 'Restores 100 health points',
        quantity: 1,
        tier: 'rare',
        stats: { health: 100 }
      });
    }

    // Guaranteed rare weapon
    const rareWeapons = [
      {
        id: `steel_sword_${Date.now()}`,
        name: 'Steel Sword',
        type: 'weapon' as const,
        subtype: 'sword' as const,
        value: 200,
        description: 'A well-crafted steel blade',
        quantity: 1,
        tier: 'rare' as const,
        equipmentSlot: 'primary' as const,
        weaponId: 'steel_sword',
        stats: { attackPower: 35 }
      },
      {
        id: `hunting_bow_${Date.now()}`,
        name: 'Hunting Bow',
        type: 'weapon' as const,
        subtype: 'bow' as const,
        value: 180,
        description: 'A finely crafted hunting bow',
        quantity: 1,
        tier: 'rare' as const,
        equipmentSlot: 'secondary' as const,
        weaponId: 'hunting_bow',
        stats: { attackPower: 30 }
      }
    ];

    const randomWeapon = rareWeapons[Math.floor(Math.random() * rareWeapons.length)];
    items.push(randomWeapon);

    return { items, gold: goldAmount };
  }

  private createChestModel(): void {
    const isRare = this.config.type === 'rare';
    
    if (isRare) {
      this.createRareTreasureChest();
    } else {
      this.createCommonWoodenChest();
    }
  }

  private createCommonWoodenChest(): void {
    // Create realistic wooden plank chest
    const plankTexture = TextureGenerator.createWoodenPlankTexture(0x8B4513);
    
    // Main chest body - more rectangular, realistic proportions
    const baseGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const baseMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      map: plankTexture
    });
    this.base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.base.position.y = 0.4;
    this.group.add(this.base);

    // Chest lid with proper proportions
    const lidGeometry = new THREE.BoxGeometry(1.25, 0.15, 0.85);
    const lidMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      map: plankTexture
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = 0.075;
    lid.position.z = 0.35; // Hinge point at front
    this.lid.add(lid);

    // Position lid for proper hinge rotation
    this.lid.position.set(0, 0.8, -0.35);
    this.group.add(this.lid);

    // Add steel reinforcements
    this.addSteelReinforcementsCommon();
  }

  private createRareTreasureChest(): void {
    // Create traditional treasure chest with curved top
    const goldColor = 0xDAA520;
    const darkWood = 0x654321;
    
    // Main chest body - wider and more robust
    const baseGeometry = new THREE.BoxGeometry(1.4, 0.9, 1.0);
    const baseMaterial = new THREE.MeshLambertMaterial({
      color: darkWood,
      map: TextureGenerator.createWoodenPlankTexture(darkWood)
    });
    this.base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.base.position.y = 0.45;
    this.group.add(this.base);

    // Curved treasure chest lid using cylinder geometry
    const lidRadius = 0.7;
    const lidGeometry = new THREE.CylinderGeometry(lidRadius, lidRadius, 1.05, 16, 1, false, 0, Math.PI);
    const lidMaterial = new THREE.MeshLambertMaterial({
      color: darkWood,
      map: TextureGenerator.createWoodenPlankTexture(darkWood)
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0;
    lid.position.z = 0.4; // Hinge point at front
    this.lid.add(lid);

    // Position lid for proper hinge rotation
    this.lid.position.set(0, 0.9, -0.4);
    this.group.add(this.lid);

    // Add ornate gold decorations
    this.addGoldOrnamentation();
  }

  private addSteelReinforcementsCommon(): void {
    const steelMaterial = new THREE.MeshLambertMaterial({
      color: 0x708090,
      map: TextureGenerator.createSteelTexture()
    });

    // Corner reinforcements on base
    const cornerGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.08);
    const cornerPositions = [
      [-0.56, 0.4, -0.36], [0.56, 0.4, -0.36],
      [-0.56, 0.4, 0.36], [0.56, 0.4, 0.36]
    ];

    cornerPositions.forEach(pos => {
      const corner = new THREE.Mesh(cornerGeometry, steelMaterial);
      corner.position.set(pos[0], pos[1], pos[2]);
      this.group.add(corner);
    });

    // Steel bands around chest
    const bandGeometry = new THREE.BoxGeometry(1.3, 0.05, 0.85);
    const topBand = new THREE.Mesh(bandGeometry, steelMaterial);
    topBand.position.set(0, 0.75, 0);
    this.group.add(topBand);

    const bottomBand = new THREE.Mesh(bandGeometry, steelMaterial);
    bottomBand.position.set(0, 0.1, 0);
    this.group.add(bottomBand);

    // Hinges - properly attached to both base and lid
    const hingeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8);
    
    const leftHinge = new THREE.Mesh(hingeGeometry, steelMaterial);
    leftHinge.rotation.z = Math.PI / 2;
    leftHinge.position.set(-0.5, 0.8, 0.35); // Hinge at front
    this.group.add(leftHinge);

    const rightHinge = new THREE.Mesh(hingeGeometry, steelMaterial);
    rightHinge.rotation.z = Math.PI / 2;
    rightHinge.position.set(0.5, 0.8, 0.35); // Hinge at front
    this.group.add(rightHinge);

    // Lock mechanism
    const lockBodyGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.1);
    const lockBody = new THREE.Mesh(lockBodyGeometry, steelMaterial);
    lockBody.position.set(0, 0.5, 0.45);
    this.group.add(lockBody);

    const keyholeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8);
    const keyhole = new THREE.Mesh(keyholeGeometry, new THREE.MeshLambertMaterial({ color: 0x000000 }));
    keyhole.rotation.z = Math.PI / 2;
    keyhole.position.set(0, 0.5, 0.46);
    this.group.add(keyhole);
  }

  private addGoldOrnamentation(): void {
    const goldMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFD700,
      emissive: 0x332200
    });

    // Ornate corner decorations on base
    const ornateCornerGeometry = new THREE.BoxGeometry(0.12, 0.9, 0.12);
    const ornateCornerPositions = [
      [-0.64, 0.45, -0.44], [0.64, 0.45, -0.44],
      [-0.64, 0.45, 0.44], [0.64, 0.45, 0.44]
    ];

    ornateCornerPositions.forEach(pos => {
      const corner = new THREE.Mesh(ornateCornerGeometry, goldMaterial);
      corner.position.set(pos[0], pos[1], pos[2]);
      this.group.add(corner);
    });

    // Decorative gold bands with engravings
    const decorativeBandGeometry = new THREE.BoxGeometry(1.5, 0.08, 1.05);
    
    const topBand = new THREE.Mesh(decorativeBandGeometry, goldMaterial);
    topBand.position.set(0, 0.85, 0);
    this.group.add(topBand);

    const middleBand = new THREE.Mesh(decorativeBandGeometry, goldMaterial);
    middleBand.position.set(0, 0.45, 0);
    this.group.add(middleBand);

    const bottomBand = new THREE.Mesh(decorativeBandGeometry, goldMaterial);
    bottomBand.position.set(0, 0.05, 0);
    this.group.add(bottomBand);

    // Ornate hinges
    const ornateHingeGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12);
    
    const leftHinge = new THREE.Mesh(ornateHingeGeometry, goldMaterial);
    leftHinge.rotation.z = Math.PI / 2;
    leftHinge.position.set(-0.6, 0.9, 0.4); // Hinge at front
    this.group.add(leftHinge);

    const rightHinge = new THREE.Mesh(ornateHingeGeometry, goldMaterial);
    rightHinge.rotation.z = Math.PI / 2;
    rightHinge.position.set(0.6, 0.9, 0.4); // Hinge at front
    this.group.add(rightHinge);

    // Elaborate lock with gems
    const lockBaseGeometry = new THREE.BoxGeometry(0.3, 0.25, 0.15);
    const lockBase = new THREE.Mesh(lockBaseGeometry, goldMaterial);
    lockBase.position.set(0, 0.6, 0.55);
    this.group.add(lockBase);

    // Add decorative gems
    const gemMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFF0000,
      emissive: 0x440000 
    });
    const gemGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    
    const gem1 = new THREE.Mesh(gemGeometry, gemMaterial);
    gem1.position.set(-0.08, 0.65, 0.56);
    this.group.add(gem1);

    const gem2 = new THREE.Mesh(gemGeometry, gemMaterial);
    gem2.position.set(0.08, 0.65, 0.56);
    this.group.add(gem2);

    // Central keyhole
    const keyholeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8);
    const keyhole = new THREE.Mesh(keyholeGeometry, new THREE.MeshLambertMaterial({ color: 0x000000 }));
    keyhole.rotation.z = Math.PI / 2;
    keyhole.position.set(0, 0.6, 0.56);
    this.group.add(keyhole);
  }


  private addGlowEffect(): void {
    this.glowEffect = new THREE.PointLight(0xFFD700, 0.3, 3, 2);
    this.glowEffect.position.set(0, 1, 0);
    this.group.add(this.glowEffect);
  }

  private setupPosition(): void {
    this.group.position.copy(this.config.position);
  }

  public canInteract(playerPosition: THREE.Vector3): boolean {
    const distance = this.group.position.distanceTo(playerPosition);
    return distance <= 2.5 && !this.isAnimating;
  }

  public interact(): ChestLoot | null {
    if (this.isOpen || this.isAnimating || this.hasBeenLooted) {
      return null;
    }

    this.openChest();
    this.hasBeenLooted = true;
    return { ...this.loot };
  }

  public isChestOpen(): boolean {
    return this.isOpen;
  }

  public openChest(): void {
    if (this.isOpen || this.isAnimating) return;

    this.isAnimating = true;
    this.animationStartTime = Date.now();
    console.log(`💰 [TreasureChest] Opening ${this.config.type} chest`);
  }

  public closeChest(): void {
    if (!this.isOpen || this.isAnimating) return;

    this.isAnimating = true;
    this.animationStartTime = Date.now();
    console.log(`💰 [TreasureChest] Closing ${this.config.type} chest`);
  }

  public update(deltaTime: number): void {
    if (this.isAnimating) {
      const elapsed = (Date.now() - this.animationStartTime) / 1000;
      const progress = Math.min(elapsed / this.animationDuration, 1);

      // Smooth easing function
      const easedProgress = progress * progress * (3 - 2 * progress);

      if (this.isOpen) {
        // Closing animation
        const rotation = -this.openRotation * (1 - easedProgress);
        this.lid.rotation.x = rotation;
      } else {
        // Opening animation  
        const rotation = -this.openRotation * easedProgress;
        this.lid.rotation.x = rotation;
      }

      if (progress >= 1) {
        this.isAnimating = false;
        this.isOpen = !this.isOpen;
        console.log(`💰 [TreasureChest] Animation complete - chest is now ${this.isOpen ? 'open' : 'closed'}`);
      }
    }

    // Gentle glow animation for rare chests
    if (this.glowEffect && this.config.type === 'rare') {
      const time = Date.now() * 0.002;
      this.glowEffect.intensity = 0.2 + Math.sin(time) * 0.1;
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public getId(): string {
    return this.config.id;
  }

  public getType(): 'common' | 'rare' {
    return this.config.type;
  }

  public getLoot(): ChestLoot {
    return { ...this.loot };
  }

  public dispose(): void {
    if (this.glowEffect) {
      this.group.remove(this.glowEffect);
    }
    
    // Dispose geometries and materials
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    console.log(`💰 [TreasureChest] Disposed ${this.config.type} chest`);
  }
}