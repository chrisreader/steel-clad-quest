import { HumanoidConfig, BodyScale } from './EnemyHumanoid';
import { EnemyType } from '../../../types/GameTypes';

export interface HumanNPCConfig {
  name: string;
  skinColor: number;
  clothingColor: number;
  hairColor?: number;
  scale: number;
  role: 'tavern_keeper' | 'merchant' | 'guard' | 'citizen';
}

export class HumanBodyConfig {
  /**
   * Creates a realistic human body configuration optimized for NPCs
   * More refined proportions compared to enemy orcs/goblins
   */
  public static createHumanConfig(npcConfig: HumanNPCConfig): HumanoidConfig {
    // Human proportions - more refined than enemies
    const scale = npcConfig.scale;
    const bodyScale: BodyScale = {
      body: { radius: 0.28 * scale, height: 1.2 * scale },
      head: { radius: 0.24 * scale },
      arm: { radius: [0.12 * scale, 0.14 * scale], length: 0.95 * scale },
      forearm: { radius: [0.10 * scale, 0.12 * scale], length: 0.8 * scale },
      leg: { radius: [0.15 * scale, 0.18 * scale], length: 0.85 * scale },
      shin: { radius: [0.12 * scale, 0.14 * scale], length: 0.7 * scale }
    };

    // Human-appropriate colors (no green/gray skin tones)
    const colors = {
      skin: npcConfig.skinColor,
      muscle: this.darkenColor(npcConfig.skinColor, 0.15), // Slightly darker for muscle definition
      accent: npcConfig.clothingColor // Clothing/fabric color
    };

    return {
      type: EnemyType.ORC, // Reuse the sophisticated body generation system
      health: 100, // NPCs don't actually take damage, but required for interface
      maxHealth: 100,
      speed: 1.2,
      damage: 0, // No combat damage
      goldReward: 0,
      experienceReward: 0,
      attackRange: 0,
      damageRange: 0,
      attackCooldown: 0,
      points: 0,
      knockbackResistance: 1.0,
      
      bodyScale,
      colors,
      
      features: {
        hasEyes: true,
        hasTusks: false, // Humans don't have tusks
        hasWeapon: false, // Peaceful NPCs don't carry weapons
        eyeConfig: {
          radius: 0.06,
          color: 0x4A4A4A, // Normal human eyes (dark brown/gray)
          emissiveIntensity: 0, // No glowing eyes for humans
          offsetX: 0.12,
          offsetY: 0.05,
          offsetZ: 0.8
        }
      }
    };
  }

  /**
   * Creates a tavern keeper specific configuration
   */
  public static createTavernKeeperConfig(): HumanoidConfig {
    return this.createHumanConfig({
      name: 'Tavern Keeper',
      skinColor: 0xFFDBAE, // Light human skin tone
      clothingColor: 0x8B4513, // Brown apron/clothing
      hairColor: 0x654321, // Brown hair
      scale: 1.0,
      role: 'tavern_keeper'
    });
  }

  /**
   * Creates different human variants for variety
   */
  public static createMerchantConfig(): HumanoidConfig {
    return this.createHumanConfig({
      name: 'Merchant',
      skinColor: 0xF4C2A1, // Medium skin tone
      clothingColor: 0x4A148C, // Purple merchant robes
      hairColor: 0x2E2E2E, // Dark hair
      scale: 0.95,
      role: 'merchant'
    });
  }

  public static createGuardConfig(): HumanoidConfig {
    return this.createHumanConfig({
      name: 'Guard',
      skinColor: 0xE8B893, // Tanned skin
      clothingColor: 0x424242, // Gray armor/uniform
      hairColor: 0x8B4513, // Brown hair
      scale: 1.1,
      role: 'guard'
    });
  }

  /**
   * Utility function to darken a color by a percentage
   */
  private static darkenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));
    
    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Gets appropriate clothing colors for different roles
   */
  public static getClothingColorForRole(role: string): number {
    switch (role) {
      case 'tavern_keeper':
        return 0x8B4513; // Brown apron
      case 'merchant':
        return 0x4A148C; // Purple robes
      case 'guard':
        return 0x424242; // Gray armor
      case 'citizen':
        return 0x556B2F; // Olive clothing
      default:
        return 0x8B4513; // Default brown
    }
  }

  /**
   * Gets variety of human skin tones
   */
  public static getRandomSkinTone(): number {
    const skinTones = [
      0xFFDBAE, // Light
      0xF4C2A1, // Medium light
      0xE8B893, // Medium
      0xDCA876, // Medium tan
      0xC19A68, // Tan
      0xA68B5B  // Dark tan
    ];
    return skinTones[Math.floor(Math.random() * skinTones.length)];
  }
}