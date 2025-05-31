
export interface PlayerAnimations {
  idle?: THREE.AnimationClip;
  walk?: THREE.AnimationClip;
  run?: THREE.AnimationClip;
  attack?: THREE.AnimationClip;
  die?: THREE.AnimationClip;
}

export interface AnimationConfig {
  idle: string;
  walk: string;
  run: string;
  attack: string;
  die: string;
}

export interface WeaponAnimationConfig {
  type: 'sword' | 'bow' | 'axe' | 'mace' | 'emptyHands';
  drawStages?: {
    idle: number;
    early: number;
    mid: number;
    full: number;
  };
}
