
import { EnemyType } from '../../types/GameTypes';

export interface EnemyConfiguration {
  type: EnemyType;
  metrics: any;
  features: {
    hasEyes: boolean;
    hasTusks: boolean;
    hasWeapon: boolean;
    eyeConfig?: {
      radius: number;
      color: number;
      emissiveIntensity: number;
      offsetX: number;
      offsetY: number;
      offsetZ: number;
    };
    tuskConfig?: {
      radius: number;
      height: number;
      color: number;
      offsetX: number;
      offsetY: number;
      offsetZ: number;
    };
  };
}

export class EnemyBodyConfig {
  private static configs: Map<EnemyType, EnemyConfiguration> = new Map();

  static {
    // Initialize ORC configuration
    this.configs.set(EnemyType.ORC, {
      type: EnemyType.ORC,
      metrics: {
        bodyScale: {
          body: { radius: 0.55, height: 1.4 },
          head: { radius: 0.5 },
          arm: { radius: [0.18, 0.22], length: 1.1 },
          forearm: { radius: [0.16, 0.18], length: 0.9 },
          leg: { radius: [0.22, 0.26], length: 0.7 },
          shin: { radius: [0.18, 0.20], length: 0.65 }
        },
        colors: {
          skin: 0x4A5D23,
          muscle: 0x5D7A2A,
          accent: 0x3A4D1A
        }
      },
      features: {
        hasEyes: true,
        hasTusks: true,
        hasWeapon: true,
        eyeConfig: {
          radius: 0.12,
          color: 0xFF0000,
          emissiveIntensity: 0.4,
          offsetX: 0.2,
          offsetY: 0.05,
          offsetZ: 0.85
        },
        tuskConfig: {
          radius: 0.08,
          height: 0.35,
          color: 0xFFFACD,
          offsetX: 0.2,
          offsetY: -0.15,
          offsetZ: 0.85
        }
      }
    });

    // Initialize GOBLIN configuration
    this.configs.set(EnemyType.GOBLIN, {
      type: EnemyType.GOBLIN,
      metrics: {
        bodyScale: {
          body: { radius: 0.35, height: 1.2 },
          head: { radius: 0.35 },
          arm: { radius: [0.1, 0.12], length: 0.8 },
          forearm: { radius: [0.08, 0.1], length: 0.6 },
          leg: { radius: [0.12, 0.15], length: 0.8 },
          shin: { radius: [0.1, 0.12], length: 0.5 }
        },
        colors: {
          skin: 0x4A7C4A,
          muscle: 0x6B8E6B,
          accent: 0x3A5A3A
        }
      },
      features: {
        hasEyes: true,
        hasTusks: false,
        hasWeapon: true,
        eyeConfig: {
          radius: 0.08,
          color: 0xFF0000,
          emissiveIntensity: 0.3,
          offsetX: 0.15,
          offsetY: 0.05,
          offsetZ: 0.8
        }
      }
    });

    // Initialize HUMAN configuration
    this.configs.set(EnemyType.HUMAN, {
      type: EnemyType.HUMAN,
      metrics: {
        bodyScale: {
          body: { radius: 0.3, height: 1.0 },
          head: { radius: 0.25 },
          arm: { radius: [0.08, 0.1], length: 0.5 },
          forearm: { radius: [0.06, 0.08], length: 0.42 },
          leg: { radius: [0.1, 0.12], length: 0.6 },
          shin: { radius: [0.08, 0.1], length: 0.55 }
        },
        colors: {
          skin: 0xFFDBAE,
          muscle: 0xE6C2A6,
          accent: 0xD4AF8C
        }
      },
      features: {
        hasEyes: true,
        hasTusks: false,
        hasWeapon: false,
        eyeConfig: {
          radius: 0.08,
          color: 0xFFFFFF,
          emissiveIntensity: 0.0,
          offsetX: 0.12,
          offsetY: 0.05,
          offsetZ: 0.9
        }
      }
    });
  }

  public static getConfig(type: EnemyType): EnemyConfiguration {
    const config = this.configs.get(type);
    if (!config) {
      throw new Error(`No configuration found for enemy type: ${type}`);
    }
    return config;
  }

  public static getAllConfigs(): EnemyConfiguration[] {
    return Array.from(this.configs.values());
  }
}
