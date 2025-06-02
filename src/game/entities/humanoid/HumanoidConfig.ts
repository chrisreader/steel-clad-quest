
import { HumanoidType } from './HumanoidBodyMetrics';
import { HumanoidFeatures } from './HumanoidBody';

export interface HumanoidConfiguration {
  type: HumanoidType;
  features: HumanoidFeatures;
}

export class HumanoidConfig {
  private static configs: Map<HumanoidType, HumanoidConfiguration> = new Map();

  static {
    // Initialize ORC configuration
    this.configs.set(HumanoidType.ORC, {
      type: HumanoidType.ORC,
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
    this.configs.set(HumanoidType.GOBLIN, {
      type: HumanoidType.GOBLIN,
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
    this.configs.set(HumanoidType.HUMAN, {
      type: HumanoidType.HUMAN,
      features: {
        hasEyes: true,
        hasTusks: false,
        hasWeapon: true,
        eyeConfig: {
          radius: 0.06,
          color: 0x0066CC,
          emissiveIntensity: 0.2,
          offsetX: 0.12,
          offsetY: 0.02,
          offsetZ: 0.9
        }
      }
    });
  }

  public static getConfig(type: HumanoidType): HumanoidConfiguration {
    const config = this.configs.get(type);
    if (!config) {
      throw new Error(`No configuration found for humanoid type: ${type}`);
    }
    return config;
  }

  public static getAllConfigs(): HumanoidConfiguration[] {
    return Array.from(this.configs.values());
  }
}
