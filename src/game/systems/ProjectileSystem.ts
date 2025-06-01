import * as THREE from 'three';
import { Arrow } from '../entities/Arrow';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';

export class ProjectileSystem {
  private arrows: Arrow[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private enemies: Enemy[] = [];
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;

  constructor(
    scene: THREE.Scene,
    player: Player,
    effectsManager: EffectsManager,
    audioManager: AudioManager
  ) {
    this.scene = scene;
    this.player = player;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    console.log("🏹 [ProjectileSystem] Initialized with enhanced debug logging");
  }

  public shootArrow(
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number
  ): void {
    console.log("🏹 [ProjectileSystem] *** SHOOT ARROW CALLED ***");
    console.log("🏹 [ProjectileSystem] Start position:", startPosition);
    console.log("🏹 [ProjectileSystem] Direction:", direction);
    console.log("🏹 [ProjectileSystem] Speed:", speed);
    console.log("🏹 [ProjectileSystem] Damage:", damage);
    
    try {
      const arrow = new Arrow(
        this.scene,
        startPosition,
        direction,
        speed,
        damage,
        this.effectsManager,
        this.audioManager
      );
      
      this.arrows.push(arrow);
      console.log(`🏹 [ProjectileSystem] ✅ ARROW CREATED SUCCESSFULLY - Total arrows: ${this.arrows.length}`);
    } catch (error) {
      console.error("🏹 [ProjectileSystem] ❌ ERROR CREATING ARROW:", error);
    }
  }

  public update(deltaTime: number): void {
    // Update all arrows
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
  }

  private checkArrowCollisions(arrow: Arrow): void {
    const arrowPosition = arrow.getPosition();
    const arrowBox = new THREE.Box3();
    arrowBox.setFromCenterAndSize(arrowPosition, new THREE.Vector3(0.1, 0.1, 0.1));
    
    // Check collision with enemies
    this.enemies.forEach(enemy => {
      if (enemy.isDead()) return;
      
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      if (arrowBox.intersectsBox(enemyBox)) {
        // Hit enemy
        const damage = arrow.getDamage();
        enemy.takeDamage(damage, arrowPosition);
        
        // Play hit sound
        this.audioManager.play('arrow_hit');
        
        // Create blood effect with direction - added missing direction parameter
        const direction = new THREE.Vector3(0, 0, 1); // Simple forward direction
        this.effectsManager.createBloodEffect(arrowPosition, direction);
        
        // Remove arrow
        arrow.dispose();
        this.arrows = this.arrows.filter(a => a !== arrow);
        
        console.log(`🏹 [ProjectileSystem] Arrow hit enemy for ${damage} damage`);
        
        // Add experience if enemy dies
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
