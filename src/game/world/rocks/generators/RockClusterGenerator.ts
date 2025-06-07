
import * as THREE from 'three';
import { RockVariation } from '../config/RockVariationConfig';
import { RockShape, ROCK_SHAPES } from '../config/RockShapeConfig';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';

export class RockClusterGenerator {
  private rockShapes: RockShape[] = ROCK_SHAPES;

  public createVariedRockCluster(
    rockGroup: THREE.Group, 
    variation: RockVariation, 
    index: number,
    createCharacterBaseGeometry: (rockShape: RockShape, rockSize: number) => THREE.BufferGeometry,
    applyShapeModifications: (geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number) => void,
    applyCharacterDeformation: (geometry: THREE.BufferGeometry, intensity: number, rockSize: number, rockShape: RockShape) => void,
    validateAndEnhanceGeometry: (geometry: THREE.BufferGeometry) => void
  ): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Create foundation rocks (largest, most stable)
    const foundationCount = Math.min(2, Math.floor(clusterCount * 0.4));
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i, 
        'foundation',
        createCharacterBaseGeometry,
        applyShapeModifications,
        applyCharacterDeformation,
        validateAndEnhanceGeometry
      );
      
      // Position foundation rocks
      const angle = (i / foundationCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = rockSize * 0.3;
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.15,
        Math.sin(angle) * distance
      );
      
      foundationRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create supporting rocks (medium size)
    const supportCount = Math.floor(clusterCount * 0.4);
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i + foundationCount, 
        'support',
        createCharacterBaseGeometry,
        applyShapeModifications,
        applyCharacterDeformation,
        validateAndEnhanceGeometry
      );
      
      // Position against foundation rocks with realistic stacking
      const foundationRock = foundationRocks[i % foundationRocks.length];
      const stackPosition = this.calculateRealisticStackingPosition(
        foundationRock.position, 
        rockSize, 
        maxSize * 0.9,
        'support'
      );
      rock.position.copy(stackPosition);
      
      supportRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create accent rocks (smallest, most varied shapes)
    const accentCount = clusterCount - foundationCount - supportCount;
    
    for (let i = 0; i < accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i + foundationCount + supportCount, 
        'accent',
        createCharacterBaseGeometry,
        applyShapeModifications,
        applyCharacterDeformation,
        validateAndEnhanceGeometry
      );
      
      // Position accent rocks in gaps or on top
      const baseRocks = [...foundationRocks, ...supportRocks];
      const baseRock = baseRocks[Math.floor(Math.random() * baseRocks.length)];
      const stackPosition = this.calculateRealisticStackingPosition(
        baseRock.position,
        rockSize,
        maxSize * 0.6,
        'accent'
      );
      rock.position.copy(stackPosition);
      
      rockGroup.add(rock);
    }
    
    console.log(`🏔️ Created varied cluster with ${clusterCount} rocks: ${foundationCount} foundation, ${supportCount} support, ${accentCount} accent`);
  }

  private createClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: 'foundation' | 'support' | 'accent',
    createCharacterBaseGeometry: (rockShape: RockShape, rockSize: number) => THREE.BufferGeometry,
    applyShapeModifications: (geometry: THREE.BufferGeometry, rockShape: RockShape, rockSize: number) => void,
    applyCharacterDeformation: (geometry: THREE.BufferGeometry, intensity: number, rockSize: number, rockShape: RockShape) => void,
    validateAndEnhanceGeometry: (geometry: THREE.BufferGeometry) => void
  ): THREE.Object3D {
    // Select shape based on role
    let rockShape: RockShape;
    
    switch (role) {
      case 'foundation':
        const foundationShapes = this.rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        rockShape = foundationShapes[index % foundationShapes.length];
        break;
        
      case 'support':
        const supportShapes = this.rockShapes.filter(s => 
          s.type !== 'spire'
        );
        rockShape = supportShapes[index % supportShapes.length];
        break;
        
      case 'accent':
        rockShape = this.rockShapes[index % this.rockShapes.length];
        break;
        
      default:
        rockShape = this.rockShapes[index % this.rockShapes.length];
    }
    
    // Create base geometry
    let geometry = createCharacterBaseGeometry(rockShape, rockSize);
    
    // Apply role-specific modifications
    applyShapeModifications(geometry, rockShape, rockSize);
    
    // Apply deformation based on role
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    // Validate geometry
    validateAndEnhanceGeometry(geometry);
    
    // Create material with role-based weathering
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply role-specific rotation
    if (role === 'foundation') {
      rock.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
    } else {
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
    }
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  private calculateRealisticStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: 'support' | 'accent'
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (role === 'support') {
      // Support rocks lean against base rocks
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize + rockSize) * 0.4;
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.3 + Math.random() * baseSize * 0.2,
        basePosition.z + Math.sin(angle) * distance
      );
    } else {
      // Accent rocks can be on top or in gaps
      if (Math.random() < 0.6) {
        // On top
        const offsetX = (Math.random() - 0.5) * baseSize * 0.3;
        const offsetZ = (Math.random() - 0.5) * baseSize * 0.3;
        
        position.set(
          basePosition.x + offsetX,
          basePosition.y + baseSize * 0.6 + rockSize * 0.3,
          basePosition.z + offsetZ
        );
      } else {
        // In gaps around base
        const angle = Math.random() * Math.PI * 2;
        const distance = baseSize * (0.8 + Math.random() * 0.4);
        
        position.set(
          basePosition.x + Math.cos(angle) * distance,
          basePosition.y + rockSize * 0.2,
          basePosition.z + Math.sin(angle) * distance
        );
      }
    }
    
    return position;
  }
}
