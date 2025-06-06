
import { RockVariation } from '../types/RockTypes';

export const ROCK_VARIATIONS: RockVariation[] = [
  { category: 'tiny', sizeRange: [0.05, 0.15], weight: 50, isCluster: false, shapePersonality: 'character' },
  { category: 'small', sizeRange: [0.15, 0.4], weight: 25, isCluster: false, shapePersonality: 'character' },
  { category: 'medium', sizeRange: [0.4, 1.2], weight: 15, isCluster: true, clusterSize: [3, 5], shapePersonality: 'basic' },
  { category: 'large', sizeRange: [2.0, 4.0], weight: 12, isCluster: true, clusterSize: [2, 3], shapePersonality: 'character' },
  { category: 'massive', sizeRange: [4.0, 8.0], weight: 6, isCluster: true, clusterSize: [3, 4], shapePersonality: 'character' }
];
