import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { EffectsManager } from '../engine/EffectsManager';
import { AudioManager } from '../engine/AudioManager';
import { PhysicsManager } from '../engine/PhysicsManager';

export class CombatSystem {
  private scene: THREE.Scene;
  private player: Player;
  private enemies: Enemy[] = [];
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private camera: THREE.PerspectiveCamera;
  private physicsManager: PhysicsManager;
  
  // Player weapon and attack state
  private isPlayerAttacking: boolean = false;
  private playerAttackCooldown: number = 0;
  private playerAttackRange: number = 3;
  private playerDamage: number = 20;
  
  // Raycasting for attack detection
  private raycaster: THREE.Raycaster;
  
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
    this.raycaster = new THREE.Raycaster();
    
    console.log("🗡️ [CombatSystem] Initialized with physics manager");
  }
  
  public registerEnemy(enemy: Enemy): void {
    if (!this.enemies.includes(enemy)) {
      this.enemies.push(enemy);
      console.log("🗡️ [CombatSystem] Enemy registered, total enemies:", this.enemies.length);
    }
  }
  
  public unregisterEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
      console.log("🗡️ [CombatSystem] Enemy unregistered, remaining enemies:", this.enemies.length);
    }
  }
  
  public startPlayerAttack(): void {
    if (this.isPlayerAttacking) return;
    
    this.isPlayerAttacking = true;
    this.playerAttackCooldown = 500; // Cooldown in milliseconds
    
    // Play sword swing sound
    this.audioManager.play('sword_swing');
    
    // Trigger attack animation
    this.player.attack();
    
    // Raycasting from camera
    this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
    
    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Filter and process the intersections
    for (const intersect of intersects) {
      if (intersect.object.parent && intersect.object.parent.type === 'Group') {
        const enemyMesh = intersect.object.parent as THREE.Group;
        
        // Find the corresponding enemy
        const enemy = this.enemies.find(e => e.getMesh() === enemyMesh);
        
        if (enemy) {
          // Calculate hit position
          const hitPosition = intersect.point.clone();
          
          // Apply damage to the enemy
          enemy.takeDamage(this.playerDamage, this.player.getPosition());
          
          // Break out after hitting the first valid enemy
          break;
        }
      }
    }
  }
  
  public stopPlayerAttack(): void {
    this.isPlayerAttacking = false;
  }
  
  public update(deltaTime: number): void {
    // Update player attack cooldown
    if (this.playerAttackCooldown > 0) {
      this.playerAttackCooldown -= deltaTime * 1000;
    }
    
    // Check for enemy deaths and remove them
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDeadFor(5000)) {
        this.unregisterEnemy(enemy);
      }
    }
  }
  
  public dispose(): void {
    console.log("🗡️ [CombatSystem] Disposing combat system");
  }
}
