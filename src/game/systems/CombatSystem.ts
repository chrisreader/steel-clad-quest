import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Gold } from '../entities/Gold';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { PhysicsManager } from '../engine/PhysicsManager';
import { ProjectileSystem } from './ProjectileSystem';
import { BaseBow } from '../weapons';

export class CombatSystem {
  private player: Player;
  private enemies: Enemy[] = [];
  private birds: any[] = []; // Store birds for combat detection
  private gold: Gold[] = [];
  private scene: THREE.Scene;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private physicsManager: PhysicsManager;
  private projectileSystem: ProjectileSystem;
  private camera: THREE.PerspectiveCamera;
  
  // Combat parameters
  private pickupRange: number = 2;
  private attackCooldownMs: number = 768;
  private lastAttackTime: number = 0;
  
  // FPS-style bow mechanics
  private bowReadyToFire: boolean = false;
  
  // Debug hitbox visualization
  private debugHitboxEnabled: boolean = true; // Enable by default for testing
  
  constructor(
    scene: THREE.Scene,
    player: Player,
    effectsManager: EffectsManager,
    audioManager: AudioManager,
    camera: THREE.PerspectiveCamera,
    physicsManager: PhysicsManager
  ) {
    this.scene = scene;
    this.player = player;
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    this.camera = camera;
    this.physicsManager = physicsManager;
    this.projectileSystem = new ProjectileSystem(scene, player, effectsManager, audioManager, physicsManager);
    
    // Enable debug mode for sword hitbox
    this.setupHitboxDebugVisualization();
  }
  
  private setupHitboxDebugVisualization(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any; // Cast to access Sword methods
      if (sword.setDebugMode) {
        sword.setDebugMode(this.debugHitboxEnabled);
        
        // Add debug hitbox to scene if it exists
        const debugHitBox = sword.getDebugHitBox();
        if (debugHitBox && !this.scene.getObjectById(debugHitBox.id)) {
          this.scene.add(debugHitBox);
          console.log("🔧 [CombatSystem] Added debug hitbox to scene");
        }
      }
    }
  }
  
  public update(deltaTime: number): void {
    this.lastAttackTime += deltaTime;
    
    this.projectileSystem.setEnemies(this.enemies);
    this.projectileSystem.setBirds(this.birds);
    this.projectileSystem.update(deltaTime);
    
    // FIXED: Use transferGold to avoid destroying active arrows
    const projectileGold = this.projectileSystem.transferGold();
    if (projectileGold.length > 0) {
      this.gold.push(...projectileGold);
      console.log(`💰 [CombatSystem] Merged ${projectileGold.length} gold drops from arrows`);
    }
    
    // FIXED: Only check attacks during slash phase with dynamic hitbox positioning
    if (this.player.isAttacking() && !this.bowReadyToFire && (this.enemies.length > 0 || this.birds.length > 0)) {
      this.checkDynamicSwordAttacks();
      this.checkBirdAttacks();
    }
    
    if (this.gold.length > 0) {
      this.checkGoldPickups();
    }
    
    if (this.enemies.length > 0) {
      this.cleanupEntities();
    }
  }
  
  public startPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    if (currentWeapon && currentWeapon.getConfig().type === 'bow') {
      this.bowReadyToFire = true;
      this.player.startBowDraw();
    } else {
      this.startMeleeAttack();
    }
  }
  
  public stopPlayerAttack(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    
    if (currentWeapon && currentWeapon.getConfig().type === 'bow' && this.bowReadyToFire) {
      this.player.stopBowDraw();
      this.fireIndependentArrow();
    }
    
    this.bowReadyToFire = false;
  }
  
  private fireIndependentArrow(): void {
    if (!this.player || !this.camera) {
      console.error("🏹 [CombatSystem] Cannot fire arrow: missing player or camera");
      return;
    }
    
    const currentWeapon = this.player.getEquippedWeapon();
    if (!currentWeapon || currentWeapon.getConfig().type !== 'bow') {
      console.warn("🏹 [CombatSystem] Cannot fire - no bow equipped");
      return;
    }
    
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    const playerPosition = this.player.getPosition();
    const arrowStartPos = playerPosition.clone()
      .add(new THREE.Vector3(0, 1.2, 0))
      .add(cameraDirection.clone().multiplyScalar(1.0));
    
    const damage = currentWeapon.getConfig().stats.damage;
    const speed = 50;
    
    console.log(`🏹 [CombatSystem] Firing arrow with collision detection - damage: ${damage}, speed: ${speed}`);
    
    this.projectileSystem.shootArrow(arrowStartPos, cameraDirection, speed, damage);
    
    this.audioManager.play('bow_release');
  }
  
  private startMeleeAttack(): void {
    const now = Date.now();
    const timeSinceLastAttack = now - this.lastAttackTime;
    
    if (timeSinceLastAttack < this.attackCooldownMs) {
      return;
    }
    
    this.lastAttackTime = now;
    
    try {
      this.player.startSwordSwing();
      
      // Show debug hitbox when attack starts
      this.showDebugHitBox();
      
      // Hide debug hitbox after attack duration
      setTimeout(() => {
        this.hideDebugHitBox();
      }, 600); // Hide after 600ms (typical sword swing duration)
      
      console.log("⚔️ [CombatSystem] Melee attack started - hitbox debug visualization active");
    } catch (error) {
      console.error("⚔️ [CombatSystem] Error calling player.startSwordSwing()", error);
    }
  }
  
  private showDebugHitBox(): void {
    if (!this.debugHitboxEnabled) return;
    
    const currentWeapon = this.player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.showHitBoxDebug) {
        sword.showHitBoxDebug();
        console.log("🔧 [CombatSystem] Debug hitbox activated for attack");
      }
    }
  }
  
  private hideDebugHitBox(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.hideHitBoxDebug) {
        sword.hideHitBoxDebug();
        console.log("🔧 [CombatSystem] Debug hitbox deactivated");
      }
    }
  }
  
  public toggleDebugHitbox(): void {
    this.debugHitboxEnabled = !this.debugHitboxEnabled;
    const currentWeapon = this.player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.setDebugMode) {
        sword.setDebugMode(this.debugHitboxEnabled);
      }
    }
    console.log(`🔧 [CombatSystem] Debug hitbox ${this.debugHitboxEnabled ? 'enabled' : 'disabled'}`);
  }
  
  private checkDynamicSwordAttacks(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    if (!currentWeapon || !['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      return;
    }

    // Get swing progress from player animation
    const swingData = this.player.getSwordSwing();
    if (!swingData || !swingData.isActive) {
      return;
    }

    // Calculate swing progress (0 = start, 1 = end)
    const elapsed = swingData.clock.getElapsedTime() - swingData.startTime;
    const slashStart = swingData.phases.windup;
    const slashEnd = swingData.phases.windup + swingData.phases.slash;
    
    // FIXED: Only check collisions during the actual slash phase
    if (elapsed < slashStart || elapsed > slashEnd) {
      // Reset hitbox position when not in slash phase
      const sword = currentWeapon as any;
      if (sword.resetHitBoxPosition) {
        sword.resetHitBoxPosition();
      }
      return;
    }

    // Calculate swing progress within slash phase (0 to 1)
    const slashProgress = (elapsed - slashStart) / swingData.phases.slash;
    
    // Update dynamic hitbox position based on swing progress
    const playerPosition = this.player.getPosition();
    const playerRotation = this.player.getRotation();
    
    const sword = currentWeapon as any;
    if (sword.updateHitBoxPosition) {
      sword.updateHitBoxPosition(playerPosition, playerRotation, slashProgress);
    }

    // Now check for collisions with the updated hitbox
    const swordHitBox = this.player.getSwordHitBox();
    const swordBox = new THREE.Box3().setFromObject(swordHitBox);
    
    const attackPower = this.player.getAttackPower();
    
    let enemyHit = false;
    
    console.log(`🔧 [CombatSystem] Dynamic sword hitbox collision check - slash progress: ${(slashProgress * 100).toFixed(1)}%`);
    
    this.enemies.forEach(enemy => {
      if (enemy.isDead()) return;
      
      if (this.player.hasHitEnemy(enemy)) return;
      
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      if (swordBox.intersectsBox(enemyBox)) {
        enemyHit = true;
        
        const enemyPosition = enemy.getPosition();
        const slashDirection = enemyPosition.clone().sub(playerPosition).normalize();
        
        // Apply damage and create blood effect
        enemy.takeDamage(attackPower, playerPosition);
        
        // Create realistic blood effect ONLY when hitting enemy
        const damageIntensity = Math.min(attackPower / 50, 2);
        this.effectsManager.createRealisticBloodEffect(enemyPosition, slashDirection, damageIntensity);
        
        this.player.addEnemy(enemy);
        
        this.audioManager.play('sword_hit');
        
        if (enemy.isDead()) {
          this.spawnGold(enemy.getPosition(), enemy.getGoldReward());
          this.player.addExperience(enemy.getExperienceReward());
        }
        
        console.log("⚔️ [CombatSystem] Enemy hit with dynamic sword hitbox during slash phase");
      }
    });
    
    if (!enemyHit) {
      console.log(`⚔️ [CombatSystem] No enemies hit - dynamic hitbox at ${(slashProgress * 100).toFixed(1)}% slash progress`);
    }
  }
  
  private checkBirdAttacks(): void {
    const currentWeapon = this.player.getEquippedWeapon();
    if (!currentWeapon || !['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      return;
    }

    // Get swing progress from player animation
    const swingData = this.player.getSwordSwing();
    if (!swingData || !swingData.isActive) {
      return;
    }

    // Calculate swing progress (0 = start, 1 = end)
    const elapsed = swingData.clock.getElapsedTime() - swingData.startTime;
    const slashStart = swingData.phases.windup;
    const slashEnd = swingData.phases.windup + swingData.phases.slash;
    
    // Only check collisions during the actual slash phase
    if (elapsed < slashStart || elapsed > slashEnd) {
      return;
    }

    // Check sword hitbox against bird hitboxes - ENHANCED for aerial combat
    const swordHitBox = this.player.getSwordHitBox();
    const swordBox = new THREE.Box3().setFromObject(swordHitBox);
    
    let birdHit = false;
    
    this.birds.forEach(bird => {
      if (bird.isDead) return; // Skip dead birds
      
      const birdHitBox = bird.getHitBox();
      if (!birdHitBox) return;
      
      try {
        const birdPosition = bird.getPosition();
        
        // CRITICAL: Get hitbox world position 
        const hitboxWorldPosition = new THREE.Vector3();
        birdHitBox.getWorldPosition(hitboxWorldPosition);
        
        // Create bounding box from hitbox world position
        const hitboxSize = new THREE.Vector3(1.2, 0.8, 1.2); // Match hitbox size
        const birdBox = new THREE.Box3().setFromCenterAndSize(hitboxWorldPosition, hitboxSize);
        
        // Debug logging for aerial birds
        if (birdPosition.y > 5) {
          console.log(`⚔️🐦 [CombatSystem] AERIAL MELEE CHECK - Bird altitude: ${birdPosition.y.toFixed(1)}m`);
          console.log(`⚔️🐦 [CombatSystem] Bird at ${birdPosition.x.toFixed(1)}, ${birdPosition.y.toFixed(1)}, ${birdPosition.z.toFixed(1)}`);
          console.log(`⚔️🐦 [CombatSystem] Hitbox at ${hitboxWorldPosition.x.toFixed(1)}, ${hitboxWorldPosition.y.toFixed(1)}, ${hitboxWorldPosition.z.toFixed(1)}`);
          console.log(`⚔️🐦 [CombatSystem] Sword box:`, swordBox);
          console.log(`⚔️🐦 [CombatSystem] Bird box:`, birdBox);
          console.log(`⚔️🐦 [CombatSystem] Boxes intersect:`, swordBox.intersectsBox(birdBox));
        }
        
        if (swordBox.intersectsBox(birdBox)) {
          birdHit = true;
          
          // Deal 1 damage (instant kill for birds)
          bird.takeDamage(1);
          
          // Create feather burst effect instead of blood
          const playerPosition = this.player.getPosition();
          const hitDirection = birdPosition.clone().sub(playerPosition).normalize();
          
          this.effectsManager.createFeatherBurst(birdPosition, hitDirection);
          this.audioManager.play('sword_hit');
          
          console.log(`🪶⚔️ [CombatSystem] SUCCESSFUL MELEE HIT! Bird hit at altitude ${birdPosition.y.toFixed(1)}m - feather burst created`);
        }
      } catch (error) {
        console.error(`⚔️🐦 [CombatSystem] Error in bird melee collision:`, error);
      }
    });
    
    if (birdHit) {
      console.log(`⚔️🐦 [CombatSystem] Bird combat collision detected`);
    }
  }
  
  public handlePlayerDamage(damage: number, damageSource: THREE.Vector3): void {
    const playerPosition = this.player.getPosition();
    const damageDirection = damageSource.clone().sub(playerPosition).normalize();
    const intensity = Math.min(damage / 30, 2);
    
    // Create player damage effect
    this.effectsManager.createPlayerDamageEffect(damageDirection, intensity);
    
    // Apply damage to player
    // Note: This would need to be connected to player health system
    console.log(`Player takes ${damage} damage from direction:`, damageDirection);
  }
  
  public handleArrowHit(enemy: Enemy, arrowPosition: THREE.Vector3, arrowDirection: THREE.Vector3, damage: number): void {
    // Create arrow-specific blood effect
    this.effectsManager.createArrowBloodEffect(arrowPosition, arrowDirection, damage);
    
    // Apply damage
    enemy.takeDamage(damage, arrowPosition);
    
    this.audioManager.play('arrow_hit');
    
    // FIXED: Consistent gold and XP rewards for arrow kills
    if (enemy.isDead()) {
      this.spawnGold(enemy.getPosition(), enemy.getGoldReward());
      this.player.addExperience(enemy.getExperienceReward());
      console.log(`🏹 [CombatSystem] Enemy killed by arrow - rewards handled`);
    }
  }
  
  private checkGoldPickups(): void {
    const playerPosition = this.player.getPosition();
    
    this.gold.forEach(gold => {
      if (gold.isInRange(playerPosition, this.pickupRange)) {
        this.player.addGold(gold.getValue());
        
        gold.dispose();
        this.gold = this.gold.filter(g => g !== gold);
      }
    });
  }
  
  private cleanupEntities(): void {
    this.enemies = this.enemies.filter(enemy => {
      if (enemy.isDeadFor(30000)) {
        enemy.dispose();
        return false;
      }
      return true;
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
  
  public addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }
  
  public setBirds(birds: any[]): void {
    this.birds = birds.filter(bird => !bird.isDead); // Only track living birds
  }
  
  public getEnemies(): Enemy[] {
    return this.enemies;
  }
  
  public getEnemiesCount(): number {
    return this.enemies.filter(enemy => !enemy.isDead()).length;
  }
  
  public getGold(): Gold[] {
    return this.gold;
  }
  
  public getGoldCount(): number {
    return this.gold.length;
  }
  
  public clear(): void {
    this.enemies.forEach(enemy => enemy.dispose());
    this.enemies = [];
    
    this.gold.forEach(gold => gold.dispose());
    this.gold = [];
    
    this.projectileSystem.clear();
  }
  
  public spawnRandomEnemies(count: number, playerPosition: THREE.Vector3, difficulty: number = 1): void {
    for (let i = 0; i < count; i++) {
      const enemy = Enemy.createRandomEnemy(
        this.scene,
        playerPosition,
        this.effectsManager,
        this.audioManager,
        difficulty
      );
      this.enemies.push(enemy);
    }
  }
  
  public getClosestEnemy(position: THREE.Vector3): Enemy | null {
    const aliveEnemies = this.enemies.filter(enemy => !enemy.isDead());
    if (aliveEnemies.length === 0) return null;
    
    let closest = aliveEnemies[0];
    let closestDistance = closest.getPosition().distanceTo(position);
    
    for (let i = 1; i < aliveEnemies.length; i++) {
      const distance = aliveEnemies[i].getPosition().distanceTo(position);
      if (distance < closestDistance) {
        closest = aliveEnemies[i];
        closestDistance = distance;
      }
    }
    
    return closest;
  }
  
  public getEnemiesInRange(position: THREE.Vector3, range: number): Enemy[] {
    return this.enemies.filter(
      enemy => !enemy.isDead() && enemy.getPosition().distanceTo(position) <= range
    );
  }
  
  public dispose(): void {
    this.clear();
    this.projectileSystem.dispose();
  }
}
