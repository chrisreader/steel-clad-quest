
import * as THREE from 'three';
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
  weapon: THREE.Group | undefined;
  hitBox: THREE.Mesh | undefined;
}

export interface EnemyBodyResult {
  group: THREE.Group;
  bodyParts: EnemyBodyParts;
  metrics: any;
}
