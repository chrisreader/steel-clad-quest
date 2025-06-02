
import { EnemyType } from '../../types/GameTypes';
import { HumanoidType, HumanoidBodyMetrics, HumanoidBodyMetricsCalculator } from './humanoid/HumanoidBodyMetrics';
import { HumanoidConfig, HumanoidConfiguration } from './humanoid/HumanoidConfig';

// Legacy interface for backwards compatibility
export interface EnemyConfiguration {
  type: EnemyType;
  metrics: HumanoidBodyMetrics; // Now uses humanoid metrics
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
    // Map EnemyType to HumanoidType and use humanoid configs
    const orcHumanoidConfig = HumanoidConfig.getConfig(HumanoidType.ORC);
    this.configs.set(EnemyType.ORC, {
      type: EnemyType.ORC,
      metrics: HumanoidBodyMetricsCalculator.calculateMetrics(HumanoidType.ORC),
      features: orcHumanoidConfig.features
    });

    const goblinHumanoidConfig = HumanoidConfig.getConfig(HumanoidType.GOBLIN);
    this.configs.set(EnemyType.GOBLIN, {
      type: EnemyType.GOBLIN,
      metrics: HumanoidBodyMetricsCalculator.calculateMetrics(HumanoidType.GOBLIN),
      features: goblinHumanoidConfig.features
    });
  }

  public static getConfig(type: EnemyType): EnemyConfiguration {
    const config = this.configs.get(type);
    if (!config) {
      throw new Error(`No configuration found for enemy type: ${type}`);
    }
    console.log(`🎭 [EnemyBodyConfig] Retrieved config for ${type} using humanoid system`);
    return config;
  }

  public static getAllConfigs(): EnemyConfiguration[] {
    return Array.from(this.configs.values());
  }
}
