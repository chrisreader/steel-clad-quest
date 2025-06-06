
import { RockVariation } from '../types/RockTypes';

export const ROCK_VARIATIONS: RockVariation[] = [
  { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false, shapePersonality: 'character' },
  { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false, shapePersonality: 'character' },
  { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false, shapePersonality: 'basic' },
  { category: 'large', sizeRange: [2.0, 4.0], weight: 3.0, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' },
  { category: 'massive', sizeRange: [4.0, 8.0], weight: 1.0, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' }
];
