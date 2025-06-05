
import * as THREE from 'three';

export type RockShapeType = 
  | 'boulder'
  | 'spire' 
  | 'slab'
  | 'angular'
  | 'weathered'
  | 'flattened'
  | 'jagged'
  | 'cluster';

export type RockSizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'massive';

export interface RockVariation {
  category: RockSizeCategory;
  sizeRange: [number, number];
  weight: number;
  isCluster: boolean;
  clusterSize?: [number, number];
  shapePersonality: 'character' | 'basic';
}

export const ROCK_VARIATIONS: RockVariation[] = [
  { 
    category: 'tiny', 
    sizeRange: [0.05, 0.15], 
    weight: 70, 
    isCluster: false, 
    shapePersonality: 'character' 
  },
  { 
    category: 'small', 
    sizeRange: [0.15, 0.4], 
    weight: 20, 
    isCluster: false, 
    shapePersonality: 'character' 
  },
  { 
    category: 'medium', 
    sizeRange: [0.4, 1.2], 
    weight: 8, 
    isCluster: false, 
    shapePersonality: 'basic' 
  },
  { 
    category: 'large', 
    sizeRange: [2.0, 4.0], 
    weight: 0.8, 
    isCluster: true, 
    clusterSize: [3, 5], 
    shapePersonality: 'character' 
  },
  { 
    category: 'massive', 
    sizeRange: [4.0, 8.0], 
    weight: 0.1, 
    isCluster: true, 
    clusterSize: [4, 7], 
    shapePersonality: 'character' 
  }
];

export interface RockShape {
  type: RockShapeType;
  baseGeometry: 'icosahedron' | 'sphere' | 'dodecahedron' | 'custom';
  deformationIntensity: number;
  weatheringLevel: number;
  shapeModifier: 'erode' | 'stretch' | 'flatten' | 'fracture' | 'none';
}

export const ROCK_SHAPES: RockShape[] = [
  { 
    type: 'boulder', 
    baseGeometry: 'icosahedron', 
    deformationIntensity: 0.3, 
    weatheringLevel: 0.6, 
    shapeModifier: 'erode' 
  },
  { 
    type: 'spire', 
    baseGeometry: 'icosahedron', 
    deformationIntensity: 0.35, 
    weatheringLevel: 0.3, 
    shapeModifier: 'stretch' 
  },
  { 
    type: 'slab', 
    baseGeometry: 'sphere', 
    deformationIntensity: 0.2, 
    weatheringLevel: 0.8, 
    shapeModifier: 'flatten' 
  },
  { 
    type: 'angular', 
    baseGeometry: 'dodecahedron', 
    deformationIntensity: 0.4, 
    weatheringLevel: 0.4, 
    shapeModifier: 'fracture' 
  },
  { 
    type: 'weathered', 
    baseGeometry: 'sphere', 
    deformationIntensity: 0.35, 
    weatheringLevel: 0.9, 
    shapeModifier: 'erode' 
  },
  { 
    type: 'flattened', 
    baseGeometry: 'sphere', 
    deformationIntensity: 0.3, 
    weatheringLevel: 0.7, 
    shapeModifier: 'flatten' 
  },
  { 
    type: 'jagged', 
    baseGeometry: 'icosahedron', 
    deformationIntensity: 0.4, 
    weatheringLevel: 0.5, 
    shapeModifier: 'fracture' 
  },
  { 
    type: 'cluster', 
    baseGeometry: 'custom', 
    deformationIntensity: 0.3, 
    weatheringLevel: 0.6, 
    shapeModifier: 'none' 
  }
];

export interface RockProperties {
  shapeType: RockShapeType;
  sizeCategory: RockSizeCategory;
  baseSize: number;
  material: THREE.Material;
  weatheringLevel: number; // 0-1
  stability: number; // 0-1, affects stacking physics
  variation: RockVariation;
  shape: RockShape;
}

export interface RockInstance {
  mesh: THREE.Object3D;
  properties: RockProperties;
  boundingRadius: number;
  contactPoints: THREE.Vector3[];
}

export interface RockGenerationConfig {
  shapeType: RockShapeType;
  sizeRange: { min: number; max: number };
  materialVariation: number;
  weatheringRange: { min: number; max: number };
  variation?: RockVariation;
  shape?: RockShape;
}

// Utility functions for weighted selection
export class RockVariationSelector {
  private static totalWeight: number = ROCK_VARIATIONS.reduce((sum, variation) => sum + variation.weight, 0);
  
  public static selectRandomVariation(): RockVariation {
    const random = Math.random() * this.totalWeight;
    let currentWeight = 0;
    
    for (const variation of ROCK_VARIATIONS) {
      currentWeight += variation.weight;
      if (random <= currentWeight) {
        return variation;
      }
    }
    
    // Fallback to tiny if somehow no variation is selected
    return ROCK_VARIATIONS[0];
  }
  
  public static getShapeForType(shapeType: RockShapeType): RockShape {
    const shape = ROCK_SHAPES.find(s => s.type === shapeType);
    if (!shape) {
      console.warn(`Unknown rock shape type: ${shapeType}, falling back to boulder`);
      return ROCK_SHAPES[0]; // Default to boulder
    }
    return shape;
  }
  
  public static getVariationStats(): { [key in RockSizeCategory]: number } {
    const stats = {} as { [key in RockSizeCategory]: number };
    const totalWeight = this.totalWeight;
    
    ROCK_VARIATIONS.forEach(variation => {
      stats[variation.category] = (variation.weight / totalWeight) * 100;
    });
    
    return stats;
  }
}
