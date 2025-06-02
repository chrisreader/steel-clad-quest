
import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { EnemyType } from '../../types/GameTypes';
import { EnemyBodyConfig } from './EnemyBodyConfig';

export type { EnemyBodyParts, EnemyBodyResult } from './humanoid/EnemyHumanoid';

// Legacy re-exports for backward compatibility  
export { EnemyBodyBuilder } from './EnemyBodyConfig';
