
import * as THREE from 'three';
import { RockInstance, RockSizeCategory } from './RockTypes';

export type ClusterTier = 'foundation' | 'support' | 'accent';

export interface ClusterConfiguration {
  centerPosition: THREE.Vector3;
  radius: number;
  foundationCount: number; // 40% of cluster
  supportCount: number;    // 40% of cluster
  accentCount: number;     // 20% of cluster
  environmentalDetails: boolean;
}

export interface TierDefinition {
  tier: ClusterTier;
  sizePercentage: { min: number; max: number };
  allowedShapes: string[];
  stackingRules: StackingRule[];
}

export interface StackingRule {
  supportedBy: ClusterTier[];
  maxHeight: number;
  stabilityRequired: number;
  contactMethod: 'ground' | 'lean' | 'stack';
}

export interface ClusterRock {
  instance: RockInstance;
  tier: ClusterTier;
  position: THREE.Vector3;
  supportedBy: ClusterRock[];
  supporting: ClusterRock[];
}

export interface EnvironmentalDetail {
  type: 'sediment' | 'vegetation' | 'debris';
  position: THREE.Vector3;
  mesh: THREE.Object3D;
}
