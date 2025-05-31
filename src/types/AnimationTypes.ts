
import * as THREE from 'three';

export interface WeaponAnimationState {
  mesh: THREE.Group;
  mixer: THREE.AnimationMixer;
  clock: THREE.Clock;
}

export interface PlayerAnimationConfig {
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  scale: THREE.Vector3;
}

export interface BowDrawAnimation {
  isActive: boolean;
  chargeLevel: number;
  stage: 'idle' | 'drawing1' | 'drawing2' | 'drawing3' | 'drawing4';
}

export interface WeaponAnimationData {
  weaponType: 'melee' | 'bow' | 'empty';
  isMoving: boolean;
  isAttacking: boolean;
  bowDrawing?: BowDrawAnimation;
}
