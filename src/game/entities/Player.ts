import * as THREE from 'three';
import { WeaponManager } from '../weapons/WeaponManager';
import { Enemy } from './Enemy';
import { PlayerBody } from '../../types/GameTypes';
import { EffectsManager } from '../engine/EffectsManager';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { AudioManager } from '../engine/AudioManager';
import { BowAnimationController } from '../animation/bow/BowAnimationController';
import { WeaponAnimationSystem } from '../animation/WeaponAnimationSystem';

export class Player {
  private mesh: THREE.Group;
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private speed: number = 3;
  private weaponManager: WeaponManager;
  private hitEnemies: Set<Enemy> = new Set();
  private isAttackingState: boolean = false;
  private playerBody: PlayerBody;
  private swordHitBox: THREE.Mesh;
  private health: number = 100;
  private maxHealth: number = 100;
  private gold: number = 0;
  private experience: number = 0;
  private level: number = 1;
  private attackPower: number = 25;
  private effectsManager: EffectsManager;
  private audioManager: AudioManager;
  private bowController: BowAnimationController;
  private weaponAnimationSystem: WeaponAnimationSystem;

  constructor(scene: THREE.Scene, effectsManager: EffectsManager, audioManager: AudioManager) {
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.effectsManager = effectsManager;
    this.audioManager = audioManager;
    
    this.createPlayerBody();
    this.createSwordHitBox();
    
    scene.add(this.mesh);
    
    this.weaponManager = new WeaponManager(scene, this.playerBody);
    this.bowController = new BowAnimationController(this.playerBody);
    this.weaponAnimationSystem = new WeaponAnimationSystem(this.playerBody);
  }

  private createPlayerBody(): void {
    this.mesh = new THREE.Group();
    
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.6, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAA });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.85;
    
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAA });
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 6;
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, 1.2, 0);
    leftArm.rotation.z = Math.PI / 6;
    
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x4A4A4A });
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.4, 0);
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.4, 0);
    
    const rightElbow = new THREE.Group();
    const rightElbowGeometry = new THREE.SphereGeometry(0.06, 6, 6);
    const rightElbowMesh = new THREE.Mesh(rightElbowGeometry, armMaterial);
    rightElbow.add(rightElbowMesh);
    rightElbow.position.set(0, -0.15, 0);
    rightArm.add(rightElbow);
    
    const rightForearm = new THREE.Mesh(armGeometry.clone(), armMaterial);
    rightForearm.scale.y = 0.7;
    rightForearm.position.set(0, -0.25, 0);
    rightElbow.add(rightForearm);
    
    const rightWrist = new THREE.Group();
    const rightWristGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const rightWristMesh = new THREE.Mesh(rightWristGeometry, armMaterial);
    rightWrist.add(rightWristMesh);
    rightWrist.position.set(0, -0.25, 0);
    rightElbow.add(rightWrist);
    
    this.mesh.add(body, head, rightArm, leftArm, rightLeg, leftLeg);
    
    this.playerBody = {
      body,
      head,
      rightArm,
      leftArm,
      rightLeg,
      leftLeg,
      rightElbow,
      rightWrist
    };
  }

  private createSwordHitBox(): void {
    const hitBoxGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0 
    });
    
    this.swordHitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    this.swordHitBox.position.set(0.8, 1.2, 0);
    this.swordHitBox.visible = false;
    this.mesh.add(this.swordHitBox);
  }

  public startSwordSwing(): void {
    console.log('⚔️ [Player] *** SWORD SWING STARTED *** - NO effects created here');
    
    this.isAttackingState = true;
    this.hitEnemies.clear();
    this.swordHitBox.visible = true;
    
    // Start weapon swing animation
    this.weaponAnimationSystem.startWeaponSwing();
    
    // IMPORTANT: Do NOT create any effects here
    // Effects are handled by CombatSystem based on hit/miss
    console.log('⚔️ [Player] Sword swing animation started, effects handled by CombatSystem');
  }

  public update(deltaTime: number): void {
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.mesh.position.copy(this.position);
    
    this.weaponAnimationSystem.update();
    this.bowController.update(deltaTime);
    
    if (this.isAttackingState && !this.weaponAnimationSystem.isSwinging()) {
      this.isAttackingState = false;
      this.swordHitBox.visible = false;
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.mesh.position.copy(this.position);
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  public setVelocity(velocity: THREE.Vector3): void {
    this.velocity.copy(velocity);
  }

  public getSpeed(): number {
    return this.speed;
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public getPlayerBody(): PlayerBody {
    return this.playerBody;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getWeaponManager(): WeaponManager {
    return this.weaponManager;
  }

  public equipWeapon(weaponId: string): boolean {
    return this.weaponManager.equipWeapon(weaponId);
  }

  public getEquippedWeapon(): BaseWeapon | null {
    return this.weaponManager.getEquippedWeapon();
  }

  public addEnemy(enemy: Enemy): void {
    this.hitEnemies.add(enemy);
  }

  public hasHitEnemy(enemy: Enemy): boolean {
    return this.hitEnemies.has(enemy);
  }

  public isAttacking(): boolean {
    return this.isAttackingState;
  }

  public getSwordHitBox(): THREE.Mesh {
    return this.swordHitBox;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public getGold(): number {
    return this.gold;
  }

  public addGold(amount: number): void {
    this.gold += amount;
  }

  public getExperience(): number {
    return this.experience;
  }

  public addExperience(amount: number): void {
    this.experience += amount;
    this.checkLevelUp();
  }

  private checkLevelUp(): void {
    const requiredXP = this.level * 100;
    if (this.experience >= requiredXP) {
      this.level++;
      this.experience -= requiredXP;
      this.maxHealth += 10;
      this.health = this.maxHealth;
      this.attackPower += 5;
      
      this.effectsManager.createLevelUpEffect(this.position);
      console.log(`Player leveled up to ${this.level}!`);
    }
  }

  public getLevel(): number {
    return this.level;
  }

  public getAttackPower(): number {
    return this.attackPower;
  }

  public takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage);
    console.log(`Player takes ${damage} damage. Health: ${this.health}/${this.maxHealth}`);
  }

  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public startBowDraw(): void {
    this.bowController.startDraw();
  }

  public stopBowDraw(): void {
    this.bowController.stopDraw();
  }

  public dispose(): void {
    this.weaponManager.dispose();
  }
}
