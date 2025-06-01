import * as THREE from 'three';
import { Arrow } from '../../entities/projectiles/Arrow';
import { Player } from '../../entities/characters/Player';
import { Enemy } from '../../entities/characters/Enemy';
import { EffectsManager } from '../../core/EffectsManager';
import { AudioManager } from '../../core/AudioManager';
import { PhysicsManager } from '../../core/PhysicsManager';

export class ProjectileSystem {
  private arrows: Arrow[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private enemies: Enemy[] = [];
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private physicsManager: PhysicsManager;

  constructor(
    scene: THREE.Scene,
    player: Player,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    physicsManager: PhysicsManager
  ) {
    this.scene = scene;
    this.player = player;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.physicsManager = physicsManager;
  }

  public shootArrow(
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number
  ): void {
    const normalizedDirection = direction.clone().normalize();
    
    try {
      const arrow = new Arrow(
        this.scene,
        startPosition,
        normalizedDirection,
        speed,
        damage,
        this.effectsManager,
        this.audioManager,
        this.physicsManager
      );
      
      this.arrows.push(arrow);
      console.log(`🏹 Arrow fired - Total arrows: ${this.arrows.length}`);
    } catch (error) {
      console.error("🏹 Error creating arrow:", error);
    }
  }

  public update(deltaTime: number): void {
    if (this.arrows.length === 0 || deltaTime <= 0) {
      return;
    }
    
    const activeArrowsBefore = this.arrows.length;
    
    this.arrows = this.arrows.filter(arrow => {
      const isActive = arrow.update(deltaTime);
      
      if (arrow.isArrowActive()) {
        this.checkArrowCollisions(arrow);
      }
      
      if (!isActive) {
        arrow.dispose();
      }
      
      return isActive;
    });
    
    if (activeArrowsBefore !== this.arrows.length) {
      console.log(`🏹 Arrow count changed: ${activeArrowsBefore} -> ${this.arrows.length}`);
    }
  }

  private checkArrowCollisions(arrow: Arrow): void {
    const arrowPosition = arrow.getPosition();
    const arrowBox = new THREE.Box3();
    arrowBox.setFromCenterAndSize(arrowPosition, new THREE.Vector3(0.2, 0.2, 0.2));
    
    this.enemies.forEach(enemy => {
      if (enemy.isDead()) return;
      
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      if (arrowBox.intersectsBox(enemyBox)) {
        const damage = arrow.getDamage();
        enemy.takeDamage(damage, arrowPosition);
        
        this.audioManager.play('arrow_hit');
        
        const direction = new THREE.Vector3(0, 0, 1);
        this.effectsManager.createBloodEffect(arrowPosition, direction);
        
        arrow.dispose();
        this.arrows = this.arrows.filter(a => a !== arrow);
        
        console.log(`🏹 Arrow hit enemy for ${damage} damage`);
        
        if (enemy.isDead()) {
          this.player.addExperience(enemy.getExperienceReward());
        }
      }
    });
  }

  public setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;
  }

  public getArrowCount(): number {
    return this.arrows.length;
  }

  public clear(): void {
    this.arrows.forEach(arrow => arrow.dispose());
    this.arrows = [];
  }

  public dispose(): void {
    this.clear();
  }
}
