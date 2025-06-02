
import * as THREE from 'three';
import { PlayerStats } from '../../types/GameTypes';

export interface WeaponStats {
  damage: number;
  attackSpeed: number;
  range: number;
  durability: number;
  weight: number;
}

export interface WeaponConfig {
  id: string;
  name: string;
  type: 'sword' | 'axe' | 'mace' | 'bow';
  handRequirement: 'one-handed' | 'two-handed';
  stats: WeaponStats;
  swingAnimation?: {
    duration: number;
    phases: {
      windup: number;
      slash: number;
      recovery: number;
    };
    rotations: {
      neutral: { x: number; y: number; z: number };
      windup: { x: number; y: number; z: number };
      slash: { x: number; y: number; z: number };
    };
  };
}

export abstract class BaseWeapon {
  protected config: WeaponConfig;
  protected mesh: THREE.Group;
  protected hitBox: THREE.Mesh;
  protected isEquipped: boolean = false;

  constructor(config: WeaponConfig) {
    this.config = config;
    this.mesh = new THREE.Group();
    this.hitBox = this.createHitBox();
  }

  abstract createMesh(): THREE.Group;
  abstract createHitBox(): THREE.Mesh;
  abstract getBladeReference(): THREE.Mesh;

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public getHitBox(): THREE.Mesh {
    return this.hitBox;
  }

  public getConfig(): WeaponConfig {
    return this.config;
  }

  public getStats(): WeaponStats {
    return this.config.stats;
  }

  public getHandRequirement(): 'one-handed' | 'two-handed' {
    return this.config.handRequirement;
  }

  public equip(scene: THREE.Scene): void {
    if (!this.isEquipped) {
      this.mesh = this.createMesh();
      this.isEquipped = true;
      scene.add(this.hitBox);
    }
  }

  public unequip(scene: THREE.Scene): void {
    if (this.isEquipped) {
      this.mesh.clear();
      this.isEquipped = false;
      scene.remove(this.hitBox);
    }
  }

  public isWeaponEquipped(): boolean {
    return this.isEquipped;
  }

  // Updated method signature to support dynamic positioning (backward compatible)
  public updateHitBoxPosition(
    worldPosition: THREE.Vector3, 
    playerRotation?: number, 
    swingProgress?: number
  ): void {
    this.hitBox.position.copy(worldPosition);
  }

  // New methods for dynamic sword functionality (default implementations)
  public resetHitBoxPosition?(): void {
    // Optional method - only implemented by weapons that need it
  }

  public getDebugHitBox?(): THREE.LineSegments | null {
    // Optional method - only implemented by weapons that need it
    return null;
  }

  public setDebugMode?(enabled: boolean): void {
    // Optional method - only implemented by weapons that need it
  }

  public showHitBoxDebug?(): void {
    // Optional method - only implemented by weapons that need it
  }

  public hideHitBoxDebug?(): void {
    // Optional method - only implemented by weapons that need it
  }

  public getHitBoxMesh?(): THREE.Mesh | null {
    // Optional method - only implemented by weapons that need it
    return this.hitBox;
  }

  public dispose(): void {
    this.mesh.clear();
    this.hitBox.geometry.dispose();
    if (Array.isArray(this.hitBox.material)) {
      this.hitBox.material.forEach(material => material.dispose());
    } else {
      this.hitBox.material.dispose();
    }
  }
}
