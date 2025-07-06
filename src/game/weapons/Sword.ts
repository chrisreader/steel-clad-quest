import * as THREE from 'three';
import { BaseWeapon, WeaponConfig } from './BaseWeapon';
import { TextureGenerator } from '../utils/graphics/TextureGenerator';

export class Sword extends BaseWeapon {
  protected bladeMesh: THREE.Mesh | null = null;
  private hitBoxMesh: THREE.Mesh | null = null;
  private debugHitBox: THREE.LineSegments | null = null;
  private debugMode: boolean = false;

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

    // Store blade reference
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

    // FIXED: Sword orientation for forward-pointing blade with proper slashing motion
    swordGroup.position.set(0, -0.2, -0.3); // Adjusted position for new rotation
    swordGroup.rotation.x = -Math.PI / 6; // Tilt blade forward and down (~-30°) so tip points forward

    this.mesh = swordGroup;
    return swordGroup;
  }

  public createHitBox(): THREE.Mesh {
    // FIXED: Create smaller, sword-appropriate hitbox (was 3.5x3.5x4, now 0.4x0.4x2.2)
    const swordHitBoxGeometry = new THREE.BoxGeometry(0.4, 0.4, 2.2);
    const swordHitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(swordHitBoxGeometry, swordHitBoxMaterial);
    
    this.hitBoxMesh = hitBox;
    
    // Create debug visualization with new smaller size
    this.createDebugHitBox(swordHitBoxGeometry);
    
    console.log("🗡️ [Sword] Created smaller dynamic hitbox (0.4x0.4x2.2) for realistic sword reach");
    
    return hitBox;
  }

  private createDebugHitBox(geometry: THREE.BoxGeometry): void {
    // Create wireframe geometry for debug visualization
    const edges = new THREE.EdgesGeometry(geometry);
    const debugMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff0000, // Red color
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    
    this.debugHitBox = new THREE.LineSegments(edges, debugMaterial);
    this.debugHitBox.visible = false; // Hidden by default
    
    console.log("🔧 [Sword] Debug hitbox visualization created with smaller size");
  }

  public updateHitBoxPosition(playerPosition: THREE.Vector3, playerRotation: number, swingProgress: number): void {
    if (!this.hitBoxMesh) return;

    // Calculate swing arc position based on swing progress (0 = start, 1 = end)
    // Swing goes from right side to left side in front of player
    const swingAngle = THREE.MathUtils.lerp(-Math.PI / 3, Math.PI / 3, swingProgress); // -60° to +60°
    const forwardDistance = 1.5; // Distance in front of player
    
    // Calculate position in front of player following swing arc
    const swingX = Math.sin(playerRotation + swingAngle) * forwardDistance;
    const swingZ = Math.cos(playerRotation + swingAngle) * forwardDistance;
    
    // Position hitbox in swing arc
    this.hitBoxMesh.position.set(
      playerPosition.x + swingX,
      playerPosition.y + 0.5, // Chest height
      playerPosition.z + swingZ
    );
    
    // Rotate hitbox to face the swing direction
    this.hitBoxMesh.rotation.y = playerRotation + swingAngle;
    
    // Update debug hitbox position if it exists
    if (this.debugHitBox) {
      this.debugHitBox.position.copy(this.hitBoxMesh.position);
      this.debugHitBox.rotation.copy(this.hitBoxMesh.rotation);
    }
    
    console.log(`🗡️ [Sword] Updated dynamic hitbox position - swing progress: ${(swingProgress * 100).toFixed(1)}%, angle: ${(swingAngle * 180 / Math.PI).toFixed(1)}°`);
  }

  public resetHitBoxPosition(): void {
    if (!this.hitBoxMesh) return;
    
    // Reset hitbox to neutral position (will be hidden anyway)
    this.hitBoxMesh.position.set(0, 0, 0);
    this.hitBoxMesh.rotation.set(0, 0, 0);
    
    if (this.debugHitBox) {
      this.debugHitBox.position.copy(this.hitBoxMesh.position);
      this.debugHitBox.rotation.copy(this.hitBoxMesh.rotation);
    }
    
    console.log("🗡️ [Sword] Reset hitbox to neutral position");
  }

  public getDebugHitBox(): THREE.LineSegments | null {
    return this.debugHitBox;
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (this.debugHitBox) {
      this.debugHitBox.visible = enabled;
      console.log(`🔧 [Sword] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  public isDebugMode(): boolean {
    return this.debugMode;
  }

  public showHitBoxDebug(): void {
    if (this.debugHitBox && this.debugMode) {
      this.debugHitBox.visible = true;
      console.log("🔧 [Sword] Debug hitbox shown during attack");
    }
  }

  public hideHitBoxDebug(): void {
    if (this.debugHitBox) {
      this.debugHitBox.visible = false;
      console.log("🔧 [Sword] Debug hitbox hidden");
    }
  }

  public getBladeReference(): THREE.Mesh {
    if (!this.bladeMesh) {
      throw new Error('Blade mesh not created. Call createMesh() first.');
    }
    return this.bladeMesh;
  }

  public getHitBoxMesh(): THREE.Mesh | null {
    return this.hitBoxMesh;
  }
}
