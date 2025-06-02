
import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { EnemyType } from '../../types/GameTypes';

// Define interfaces locally to avoid circular imports
export interface EnemyBodyParts {
  body: THREE.Mesh | undefined;
  head: THREE.Mesh | undefined;
  leftArm: THREE.Mesh | undefined;
  rightArm: THREE.Mesh | undefined;
  leftElbow: THREE.Mesh | undefined;
  rightElbow: THREE.Mesh | undefined;
  leftWrist: THREE.Mesh | undefined;
  rightWrist: THREE.Mesh | undefined;
  leftLeg: THREE.Mesh | undefined;
  rightLeg: THREE.Mesh | undefined;
  leftKnee: THREE.Mesh | undefined;
  rightKnee: THREE.Mesh | undefined;
  leftShoulder: THREE.Mesh | undefined;
  rightShoulder: THREE.Mesh | undefined;
  leftHip: THREE.Mesh | undefined;
  rightHip: THREE.Mesh | undefined;
  leftFoot: THREE.Mesh | undefined;
  rightFoot: THREE.Mesh | undefined;
  weapon: THREE.Group | undefined;
  hitBox: THREE.Mesh | undefined;
  // NEW: Enhanced anatomical body parts
  chest: THREE.Mesh | undefined;
  pelvis: THREE.Mesh | undefined;
}

export interface EnemyBodyMetrics {
  scale: any;
  positions: any;
  neutralPoses: any;
  animationMetrics: any;
  colors: {
    skin: number;
    muscle: number;
    accent: number;
  };
}

export interface EnemyBodyResult {
  group: THREE.Group;
  bodyParts: EnemyBodyParts;
  metrics: EnemyBodyMetrics;
}

// Legacy re-exports for backward compatibility  
export { EnemyBodyBuilder } from './EnemyBodyConfig';
