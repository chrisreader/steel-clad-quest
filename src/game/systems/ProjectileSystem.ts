
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
    console.log("🏹 [ProjectileSystem] Initialized for independent arrow entities");
  }

  public shootArrow(
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number
  ): void {
    console.log("🏹 [ProjectileSystem] *** CREATING INDEPENDENT ARROW ***");
    console.log("🏹 [ProjectileSystem] Start position:", startPosition);
    console.log("🏹 [ProjectileSystem] Direction:", direction);
    console.log("🏹 [ProjectileSystem] Speed:", speed);
    console.log("🏹 [ProjectileSystem] Damage:", damage);
    
    // Ensure direction is normalized for consistent behavior
    const normalizedDirection = direction.clone().normalize();
    console.log("🏹 [ProjectileSystem] Normalized direction:", normalizedDirection);
    
    try {
      // Create truly independent arrow entity
      const arrow = new Arrow(
        this.scene,
        startPosition,
        normalizedDirection,
        speed,
        damage,
        this.effectsManager,
        this.audioManager
      );
      
      this.arrows.push(arrow);
      console.log(`🏹 [ProjectileSystem] ✅ INDEPENDENT ARROW CREATED - Total arrows: ${this.arrows.length}`);
      console.log(`🏹 [ProjectileSystem] ✅ ARROW SHOULD FLY INDEPENDENTLY AT ${speed} UNITS/SECOND`);
    } catch (error) {
      console.error("🏹 [ProjectileSystem] ❌ ERROR CREATING INDEPENDENT ARROW:", error);
    }
  }

  public update(deltaTime: number): void {
    // Validate deltaTime for all arrows
    if (deltaTime <= 0 || deltaTime > 0.1) {
      console.warn(`🏹 [ProjectileSystem] ⚠️ Invalid deltaTime: ${deltaTime}, using 0.016`);
      deltaTime = 0.016;
    }
    
    // Update all independent arrows
    const activeArrowsBefore = this.arrows.length;
    
    this.arrows = this.arrows.filter(arrow => {
      // Each arrow updates independently
      const isActive = arrow.update(deltaTime);
      
      // Check collisions only for active arrows
      if (arrow.isArrowActive()) {
        this.checkArrowCollisions(arrow);
      }
      
      // Clean up inactive arrows
      if (!isActive) {
        arrow.dispose();
      }
      
      return isActive;
    });
    
    // Log arrow lifecycle for debugging
    if (activeArrowsBefore !== this.arrows.length) {
      console.log(`🏹 [ProjectileSystem] Arrow count changed: ${activeArrowsBefore} -> ${this.arrows.length}`);
    }
  }

  private checkArrowCollisions(arrow: Arrow): void {
    const arrowPosition = arrow.getPosition();
    const arrowBox = new THREE.Box3();
    arrowBox.setFromCenterAndSize(arrowPosition, new THREE.Vector3(0.2, 0.2, 0.2));
    
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
        
        // Create blood effect
        const direction = new THREE.Vector3(0, 0, 1);
        this.effectsManager.createBloodEffect(arrowPosition, direction);
        
        // Remove arrow
        arrow.dispose();
        this.arrows = this.arrows.filter(a => a !== arrow);
        
        console.log(`🏹 [ProjectileSystem] Independent arrow hit enemy for ${damage} damage`);
        
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
    console.log(`🏹 [ProjectileSystem] Clearing ${this.arrows.length} arrows`);
    this.arrows.forEach(arrow => arrow.dispose());
    this.arrows = [];
  }

  public dispose(): void {
    this.clear();
  }
}
