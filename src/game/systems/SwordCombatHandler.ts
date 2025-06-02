
import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { STANDARD_SWORD_CONFIG } from '../weapons/configs/StandardSwordConfig';

export class SwordCombatHandler {
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  
  constructor(effectsManager: EffectsManager, audioManager: AudioManager) {
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    console.log('⚔️ [SwordCombatHandler] Specialized sword combat handler initialized');
  }

  public checkDynamicSwordAttacks(
    player: Player,
    enemies: Enemy[],
    playerPosition: THREE.Vector3,
    playerRotation: number
  ): void {
    const currentWeapon = player.getEquippedWeapon();
    if (!currentWeapon || !['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      return;
    }

    const swingData = player.getSwordSwing();
    if (!swingData || !swingData.isActive) {
      return;
    }

    const elapsed = swingData.clock.getElapsedTime() - swingData.startTime;
    const { phases } = STANDARD_SWORD_CONFIG.animation;
    const slashStart = phases.windup;
    const slashEnd = phases.windup + phases.slash;
    
    // Only check collisions during slash phase
    if (elapsed < slashStart || elapsed > slashEnd) {
      const sword = currentWeapon as any;
      if (sword.resetHitBoxPosition) {
        sword.resetHitBoxPosition();
      }
      return;
    }

    // Calculate swing progress within slash phase
    const slashProgress = (elapsed - slashStart) / phases.slash;
    
    // Update dynamic hitbox position
    const sword = currentWeapon as any;
    if (sword.updateHitBoxPosition) {
      sword.updateHitBoxPosition(playerPosition, playerRotation, slashProgress);
    }

    // Check for collisions
    const swordHitBox = player.getSwordHitBox();
    const swordBox = new THREE.Box3().setFromObject(swordHitBox);
    const attackPower = player.getAttackPower();
    
    let enemyHit = false;
    
    enemies.forEach(enemy => {
      if (enemy.isDead() || player.hasHitEnemy(enemy)) return;
      
      const enemyMesh = enemy.getMesh();
      const enemyBox = new THREE.Box3().setFromObject(enemyMesh);
      
      if (swordBox.intersectsBox(enemyBox)) {
        enemyHit = true;
        
        const enemyPosition = enemy.getPosition();
        const slashDirection = enemyPosition.clone().sub(playerPosition).normalize();
        
        // Apply damage and effects
        enemy.takeDamage(attackPower, playerPosition);
        
        const damageIntensity = Math.min(attackPower / 50, 2);
        this.effectsManager.createRealisticBloodEffect(enemyPosition, slashDirection, damageIntensity);
        
        player.addEnemy(enemy);
        this.audioManager.play('sword_hit');
        
        console.log("⚔️ [SwordCombatHandler] Enemy hit with standardized sword system");
      }
    });
    
    if (!enemyHit) {
      console.log(`⚔️ [SwordCombatHandler] No enemies hit - progress: ${(slashProgress * 100).toFixed(1)}%`);
    }
  }

  public setupHitboxDebugVisualization(player: Player, scene: THREE.Scene): void {
    const currentWeapon = player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.setDebugMode) {
        sword.setDebugMode(STANDARD_SWORD_CONFIG.effects.debugConfig.enabled);
        
        const debugHitBox = sword.getDebugHitBox();
        if (debugHitBox && !scene.getObjectById(debugHitBox.id)) {
          scene.add(debugHitBox);
          console.log("🔧 [SwordCombatHandler] Added standardized debug hitbox to scene");
        }
      }
    }
  }

  public showDebugHitBox(player: Player): void {
    const currentWeapon = player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.showHitBoxDebug) {
        sword.showHitBoxDebug();
      }
    }
  }

  public hideDebugHitBox(player: Player): void {
    const currentWeapon = player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.hideHitBoxDebug) {
        sword.hideHitBoxDebug();
      }
    }
  }

  public toggleDebugHitbox(player: Player): void {
    const currentWeapon = player.getEquippedWeapon();
    if (currentWeapon && ['sword', 'axe', 'mace'].includes(currentWeapon.getConfig().type)) {
      const sword = currentWeapon as any;
      if (sword.setDebugMode && sword.isDebugMode) {
        const newState = !sword.isDebugMode();
        sword.setDebugMode(newState);
        console.log(`🔧 [SwordCombatHandler] Debug hitbox ${newState ? 'enabled' : 'disabled'}`);
      }
    }
  }
}
