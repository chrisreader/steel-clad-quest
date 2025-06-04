import * as THREE from 'three';
import { EnemyHumanoid } from './EnemyHumanoid';
import { EffectsManager } from '../../managers/EffectsManager';
import { AudioManager } from '../../managers/AudioManager';

export class OrcEnemy extends EnemyHumanoid {
  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1
  ) {
    super(scene, 'orc', position, effectsManager, audioManager, difficulty);
    this.health = 75 + (difficulty * 25);
    this.speed = 0.75;
    this.attackDamage = 15 + (difficulty * 5);
    this.attackRange = 2;
    this.experienceReward = 30 + (difficulty * 10);
    this.goldReward = 15 + (difficulty * 5);
    this.name = 'Orc';
    this.mesh.scale.set(1.1, 1.1, 1.1);
    
    // Adjust model color for variation
    const model = this.mesh.getObjectByName('Orc') as THREE.SkinnedMesh;
    if (model && model.material instanceof THREE.MeshStandardMaterial) {
      model.material.color.set(new THREE.Color(0.4, 0.6, 0.4)); // Dark green
    }
  }
  
  public static createOrc(
    scene: THREE.Scene,
    position: THREE.Vector3,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    difficulty: number = 1
  ): OrcEnemy {
    return new OrcEnemy(scene, position, effectsManager, audioManager, difficulty);
  }
}
