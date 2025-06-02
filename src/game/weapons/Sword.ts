import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from './BaseWeapon';
import { TextureGenerator } from '../utils/graphics/TextureGenerator';
import { StandardSwordBehavior } from './systems/StandardSwordBehavior';

export class Sword extends BaseWeapon {
  private bladeMesh: THREE.Mesh | null = null;
  private standardBehavior: StandardSwordBehavior | null = null;

  constructor(config: WeaponConfig) {
    super(config);
  }

  public createMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    swordGroup.rotation.order = 'XYZ';

    const metalTexture = TextureGenerator.createMetalTexture();
    const woodTexture = TextureGenerator.createWoodTexture();

    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 12);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xCD853F,
      shininess: 30,
      map: woodTexture,
      normalScale: new THREE.Vector2(0.3, 0.3)
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0);
    handle.rotation.x = Math.PI / 2;
    handle.castShadow = true;
    swordGroup.add(handle);

    // Cross guard
    const guardGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.08);
    const guardMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x9A9A9A,
      shininess: 100,
      specular: 0xffffff,
      map: metalTexture
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0, -0.3);
    guard.castShadow = true;
    swordGroup.add(guard);

    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.05, 0.02, 1.8);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFFFFFF,
      shininess: 150,
      specular: 0xffffff,
      reflectivity: 0.8,
      map: metalTexture
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0, -1.2);
    blade.castShadow = true;
    swordGroup.add(blade);

    this.bladeMesh = blade;

    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.06, 12, 8);
    const pommelMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xCD853F,
      shininess: 80,
      map: woodTexture
    });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, 0, 0.3);
    pommel.castShadow = true;
    swordGroup.add(pommel);

    swordGroup.position.set(0, -0.2, -0.3);
    swordGroup.rotation.x = -Math.PI / 6;

    this.mesh = swordGroup;
    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    // Delegate to standardized behavior if available
    if (this.standardBehavior) {
      return this.standardBehavior.createHitBox();
    }
    
    // Fallback to basic hitbox
    const fallbackGeometry = new THREE.BoxGeometry(0.4, 0.4, 2.2);
    const fallbackMaterial = new THREE.MeshBasicMaterial({ visible: false });
    return new THREE.Mesh(fallbackGeometry, fallbackMaterial);
  }

  public initializeStandardBehavior(weaponSwing: any, playerBody: any, effectsManager?: any): void {
    this.standardBehavior = new StandardSwordBehavior(
      weaponSwing,
      playerBody,
      this,
      effectsManager
    );
    
    console.log('🗡️ [Sword] Initialized with standardized behavior system');
  }

  // Delegate methods to standard behavior
  public updateHitBoxPosition(playerPosition: THREE.Vector3, playerRotation?: number, swingProgress?: number): void {
    if (this.standardBehavior && playerRotation !== undefined && swingProgress !== undefined) {
      this.standardBehavior.updateHitBoxPosition(playerPosition, playerRotation, swingProgress);
    } else {
      super.updateHitBoxPosition(playerPosition, playerRotation, swingProgress);
    }
  }

  public resetHitBoxPosition(): void {
    if (this.standardBehavior) {
      this.standardBehavior.resetHitBoxPosition();
    }
  }

  public getDebugHitBox(): THREE.LineSegments | null {
    return this.standardBehavior?.getDebugHitBox() || null;
  }

  public setDebugMode(enabled: boolean): void {
    if (this.standardBehavior) {
      this.standardBehavior.setDebugMode(enabled);
    }
  }

  public isDebugMode(): boolean {
    return this.standardBehavior?.isDebugMode() || false;
  }

  public showHitBoxDebug(): void {
    if (this.standardBehavior) {
      this.standardBehavior.showHitBoxDebug();
    }
  }

  public hideHitBoxDebug(): void {
    if (this.standardBehavior) {
      this.standardBehavior.hideHitBoxDebug();
    }
  }

  public getHitBoxMesh(): THREE.Mesh | null {
    return this.standardBehavior?.getHitBoxMesh() || null;
  }

  public updateAnimation(): void {
    if (this.standardBehavior) {
      this.standardBehavior.updateAnimation();
    }
  }

  public getBladeReference(): THREE.Mesh {
    if (!this.bladeMesh) {
      throw new Error('Blade mesh not created. Call createMesh() first.');
    }
    return this.bladeMesh;
  }
}
