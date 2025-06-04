
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
    super(scene, 'orc', position, effectsManager, audioManager);
    
    // Set orc-specific stats
    this.health = 75 + (difficulty * 25);
    this.maxHealth = this.health;
    this.damage = 15 + (difficulty * 5);
    this.goldReward = 15 + (difficulty * 5);
    this.experienceReward = 30 + (difficulty * 10);
    
    this.mesh.scale.set(1.1, 1.1, 1.1);
    
    // Adjust model color for variation
    const model = this.mesh.getObjectByName('Orc') as THREE.SkinnedMesh;
    if (model && model.material instanceof THREE.MeshStandardMaterial) {
      model.material.color.set(new THREE.Color(0.4, 0.6, 0.4)); // Dark green
    }
  }

  protected createWeapon(): THREE.Group {
    // Create a simple orc weapon
    const weaponGroup = new THREE.Group();
    
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    
    const bladeGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.05);
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.8;
    
    weaponGroup.add(handle);
    weaponGroup.add(blade);
    
    return weaponGroup;
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
