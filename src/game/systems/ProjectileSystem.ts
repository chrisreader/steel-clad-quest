
import * as THREE from 'three';
import { Arrow } from '../entities/Arrow';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { PhysicsManager } from '../engine/PhysicsManager';

export class ProjectileSystem {
  private arrows: Arrow[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private enemies: Enemy[] = [];
  private birds: any[] = [];
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
    
    // Check enemy collisions
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
    
    // Check bird collisions - ENHANCED for aerial combat
    this.birds.forEach(bird => {
      if (bird.isDead) return;
      
      console.log(`🏹🐦 [ProjectileSystem] Checking bird: altitude=${bird.getPosition().y.toFixed(1)}m, isDead=${bird.isDead}`);
      
      const birdHitBox = bird.getHitBox();
      if (!birdHitBox) {
        console.log(`🏹🐦 [ProjectileSystem] Bird has no hitbox - skipping collision`);
        return;
      }
      
      try {
        // Get current bird position
        const birdPosition = bird.getPosition();
        
        // CRITICAL: Get hitbox world position by checking its actual world position
        const hitboxWorldPosition = new THREE.Vector3();
        birdHitBox.getWorldPosition(hitboxWorldPosition);
        
        console.log(`🏹🐦 [ProjectileSystem] Bird at ${birdPosition.x.toFixed(1)}, ${birdPosition.y.toFixed(1)}, ${birdPosition.z.toFixed(1)}`);
        console.log(`🏹🐦 [ProjectileSystem] Hitbox at ${hitboxWorldPosition.x.toFixed(1)}, ${hitboxWorldPosition.y.toFixed(1)}, ${hitboxWorldPosition.z.toFixed(1)}`);
        
        // Create bounding box from hitbox world position
        const hitboxSize = new THREE.Vector3(1.2, 0.8, 1.2); // Match hitbox size
        const birdBox = new THREE.Box3().setFromCenterAndSize(hitboxWorldPosition, hitboxSize);
        
        // Debug logging for aerial birds
        if (birdPosition.y > 5) {
          console.log(`🏹🐦 [ProjectileSystem] AERIAL COLLISION CHECK - Bird altitude: ${birdPosition.y.toFixed(1)}m`);
          console.log(`🏹🐦 [ProjectileSystem] Arrow box min:`, arrowBox.min, `max:`, arrowBox.max);
          console.log(`🏹🐦 [ProjectileSystem] Bird box min:`, birdBox.min, `max:`, birdBox.max);
          console.log(`🏹🐦 [ProjectileSystem] Boxes intersect:`, arrowBox.intersectsBox(birdBox));
        }
        
        if (arrowBox.intersectsBox(birdBox)) {
          const damage = arrow.getDamage();
          
          // Create feather burst effect for bird
          this.effectsManager.createFeatherBurst(birdPosition, arrowDirection);
          
          // Apply damage to bird (1 HP = instant kill)
          bird.takeDamage(damage);
          
          this.audioManager.play('arrow_hit');
          
          console.log(`🪶🏹 [ProjectileSystem] SUCCESSFUL HIT! Arrow hit bird at altitude ${birdPosition.y.toFixed(1)}m - feather burst created`);
          
          // Dispose of arrow properly
          arrow.dispose();
          this.arrows = this.arrows.filter(a => a !== arrow);
        }
      } catch (error) {
        console.error(`🏹🐦 [ProjectileSystem] Error in bird collision detection:`, error);
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
  
  public setBirds(birds: any[]): void {
    this.birds = birds.filter(bird => !bird.isDead);
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
    // Removed high-frequency log for performance
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
