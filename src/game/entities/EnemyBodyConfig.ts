
import { EnemyType } from '../../types/GameTypes';
import { EnemyBodyMetrics, EnemyBodyMetricsCalculator } from './EnemyBodyMetrics';

export interface EnemyConfiguration {
  type: EnemyType;
  metrics: EnemyBodyMetrics;
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
      metrics: EnemyBodyMetricsCalculator.calculateOrcMetrics(),
      features: {
        hasEyes: true,
        hasTusks: true,
        hasWeapon: true,
        eyeConfig: {
          radius: 0.12, // Larger eyes for intimidation
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
      metrics: EnemyBodyMetricsCalculator.calculateGoblinMetrics(),
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
