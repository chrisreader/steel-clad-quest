
import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { EffectsManager } from '../../engine/EffectsManager';
import { AudioManager } from '../../engine/AudioManager';
import { TextureGenerator } from '../../utils';
import { EnemyHumanoid, HumanoidConfig } from './EnemyHumanoid';

export class OrcEnemy extends EnemyHumanoid {
  private static readonly ORC_CONFIG: HumanoidConfig = {
    type: EnemyType.ORC,
    health: 60,
    maxHealth: 60,
    speed: 3,
    damage: 20,
    goldReward: 50,
    experienceReward: 25,
    attackRange: 3.5,
    damageRange: 2.5,
    attackCooldown: 2000,
    points: 50,
    knockbackResistance: 0.7,
    
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
  };

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    super(scene, OrcEnemy.ORC_CONFIG, position, effectsManager, audioManager);
    console.log("🗡️ [OrcEnemy] Created enhanced orc with preserved functionality");
  }

  protected createWeapon(woodTexture: THREE.Texture, metalTexture: THREE.Texture): THREE.Group {
    const weapon = new THREE.Group();

    // Large battle axe for orcs
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 16);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A2C17,
      shininess: 40,
      map: woodTexture
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.9;
    handle.castShadow = true;
    weapon.add(handle);

    // Double-headed axe blade
    const bladeGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.1);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      shininess: 100,
      specular: 0xFFFFFF,
      map: metalTexture
    });

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.position.set(0.25, 1.5, 0);
    blade1.rotation.z = Math.PI / 6;
    blade1.castShadow = true;
    weapon.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial.clone());
    blade2.position.set(-0.25, 1.5, 0);
    blade2.rotation.z = -Math.PI / 6;
    blade2.castShadow = true;
    weapon.add(blade2);

    return weapon;
  }

  public static create(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ): OrcEnemy {
    return new OrcEnemy(scene, position, effectsManager, audioManager);
  }
}
