
import { RockShape } from '../types/RockTypes';

export const ROCK_SHAPES: RockShape[] = [
  { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.15, weatheringLevel: 0.6, shapeModifier: 'erode' },
  { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.4, weatheringLevel: 0.3, shapeModifier: 'stretch' },
  { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.8, shapeModifier: 'flatten' },
  { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.2, weatheringLevel: 0.4, shapeModifier: 'fracture' },
  { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.9, shapeModifier: 'erode' },
  { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.15, weatheringLevel: 0.7, shapeModifier: 'flatten' },
  { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.2, weatheringLevel: 0.5, shapeModifier: 'fracture' },
  { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.2, weatheringLevel: 0.6, shapeModifier: 'none' }
];
