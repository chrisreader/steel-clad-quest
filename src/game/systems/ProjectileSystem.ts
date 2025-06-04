
import * as THREE from 'three';
import { Arrow } from '../entities/Arrow';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from '../managers/EffectsManager';
import { AudioManager } from '../managers/AudioManager';
import { PhysicsManager } from '../engine/PhysicsManager';

export class ProjectileSystem {
  private arrows: Arrow[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private enemies: Enemy[] = [];
  private gold: Gold[] = [];
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
    
    // SAFETY LOG: Verify terrain collision integrity before arrow creation
    const terrainCollisionsBefore = Array.from(this.physicsManager.getCollisionObjects().values())
      .filter(obj => obj.type === 'terrain');
    console.log(`🏹 BEFORE ARROW CREATION: ${terrainCollisionsBefore.length} terrain collision objects`);
    
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
      
      // SAFETY LOG: Verify terrain collision integrity after arrow creation
      const terrainCollisionsAfter = Array.from(this.physicsManager.getCollisionObjects().values())
        .filter(obj => obj.type === 'terrain');
      console.log(`🏹 AFTER ARROW CREATION: ${terrainCollisionsAfter.length} terrain collision objects`);
      
      if (terrainCollisionsBefore.length !== terrainCollisionsAfter.length) {
        console.error('🏹 ❌ TERRAIN COLLISION CORRUPTION during arrow creation!');
      }
      
    } catch (error) {
      console.error("🏹 Error creating arrow:", error);
    }
  }

  public update(deltaTime: number): void {
    if (this.arrows.length === 0 || deltaTime <= 0) {
      return;
    }
    
    const activeArrowsBefore = this.arrows.length;
    
    // SAFETY LOG: Verify terrain collision integrity before arrow updates
    const terrainCollisionsBefore = Array.from(this.physicsManager.getCollisionObjects().values())
      .filter(obj => obj.type === 'terrain');
    
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
    
    // SAFETY LOG: Verify terrain collision integrity after arrow updates
    const terrainCollisionsAfter = Array.from(this.physicsManager.getCollisionObjects().values())
      .filter(obj => obj.type === 'terrain');
    
    if (terrainCollisionsBefore.length !== terrainCollisionsAfter.length) {
      console.error('🏹 ❌ TERRAIN COLLISION CORRUPTION during arrow updates!');
      console.error(`Before: ${terrainCollisionsBefore.length}, After: ${terrainCollisionsAfter.length}`);
    }
    
    if (activeArrowsBefore !== this.arrows.length) {
      console.log(`🏹 Arrow count changed: ${activeArrowsBefore} -> ${this.arrows.length}`);
    }
  }

  private checkArrowCollisions(arrow: Arrow): void {
    const arrowPosition = arrow.getPosition();
    const arrowDirection = arrow.getDirection();
    const arrowBox = new THREE.Box3();
    arrowBox.setFromCenterAndSize(arrowPosition, new THREE.Vector3(0.2, 0.2, 0.2));
    
    this.enemies.forEach(enemy => {
      if (enemy.isDead()) return;
      
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      if (arrowBox.intersectsBox(enemyBox)) {
        const damage = arrow.getDamage();
        const enemyPosition = enemy.getPosition();
        
        // Create realistic arrow blood effect
        this.effectsManager.createArrowBloodEffect(arrowPosition, arrowDirection, damage);
        
        // Apply damage to enemy
        enemy.takeDamage(damage, arrowPosition);
        
        this.audioManager.play('arrow_hit');
        
        // Handle gold and experience rewards when enemy dies from arrow
        if (enemy.isDead()) {
          this.spawnGold(enemyPosition, enemy.getGoldReward());
          this.player.addExperience(enemy.getExperienceReward());
          console.log(`🏹 Enemy killed by arrow - spawned ${enemy.getGoldReward()} gold and ${enemy.getExperienceReward()} XP`);
        }
        
        // Dispose of arrow properly without affecting terrain collision
        arrow.dispose();
        this.arrows = this.arrows.filter(a => a !== arrow);
        
        console.log(`🏹 Arrow hit enemy for ${damage} damage with realistic blood effect`);
      }
    });
  }

  private spawnGold(position: THREE.Vector3, value: number): void {
    if (value <= 25) {
      const gold = Gold.createGoldDrop(this.scene, position, value);
      this.gold.push(gold);
    } else if (value <= 50) {
      const halfValue = Math.floor(value / 2);
      for (let i = 0; i < 2; i++) {
        const gold = Gold.createGoldDrop(this.scene, position, halfValue);
        this.gold.push(gold);
      }
    } else {
      const coinCount = Math.min(5, Math.ceil(value / 20));
      const coinValue = Math.floor(value / coinCount);
      
      for (let i = 0; i < coinCount; i++) {
        const gold = Gold.createGoldDrop(this.scene, position, coinValue);
        this.gold.push(gold);
      }
    }
  }

  public setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies;
  }

  public getArrowCount(): number {
    return this.arrows.length;
  }

  public getGold(): Gold[] {
    return this.gold;
  }

  public transferGold(): Gold[] {
    const goldToTransfer = [...this.gold];
    this.gold = []; // Clear only the gold array
    console.log(`💰 [ProjectileSystem] Transferred ${goldToTransfer.length} gold drops to CombatSystem`);
    return goldToTransfer;
  }

  public clear(): void {
    this.arrows.forEach(arrow => arrow.dispose());
    this.arrows = [];
    
    this.gold.forEach(gold => gold.dispose());
    this.gold = [];
  }

  public dispose(): void {
    this.clear();
  }
}
