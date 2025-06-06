
import * as THREE from 'three';
import { RockVariation, RockShape, GeometryProcessor, ClusterRole } from '../types/RockTypes';
import { ROCK_SHAPES } from '../config/RockShapeConfig';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { RockGenerationUtils } from '../utils/RockGenerationUtils';

export class RockClusterGenerator {
  private rockShapes: RockShape[] = ROCK_SHAPES;

  public createVariedRockCluster(
    rockGroup: THREE.Group, 
    variation: RockVariation, 
    index: number,
    geometryProcessor: GeometryProcessor
  ): void {
    const [minSize, maxSize] = variation.sizeRange;
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    
    const counts = RockGenerationUtils.calculateClusterCounts(minClusterSize, maxClusterSize);
    
    // Create foundation rocks (largest, most stable)
    const foundationRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < counts.foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i, 
        'foundation',
        geometryProcessor
      );
      
      // Position foundation rocks
      const angle = (i / counts.foundationCount) * Math.PI * 2 + Math.random() * 0.5;
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
    const supportRocks: THREE.Object3D[] = [];
    
    for (let i = 0; i < counts.supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount, 
        'support',
        geometryProcessor
      );
      
      // Position against foundation rocks with realistic stacking
      const foundationRock = foundationRocks[i % foundationRocks.length];
      const stackPosition = RockGenerationUtils.calculateRealisticStackingPosition(
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
    for (let i = 0; i < counts.accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount + counts.supportCount, 
        'accent',
        geometryProcessor
      );
      
      // Position accent rocks in gaps or on top
      const baseRocks = [...foundationRocks, ...supportRocks];
      const baseRock = baseRocks[Math.floor(Math.random() * baseRocks.length)];
      const stackPosition = RockGenerationUtils.calculateRealisticStackingPosition(
        baseRock.position,
        rockSize,
        maxSize * 0.6,
        'accent'
      );
      rock.position.copy(stackPosition);
      
      rockGroup.add(rock);
    }
    
    console.log(`🏔️ Created varied cluster with ${counts.total} rocks: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent`);
  }

  private createClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole,
    geometryProcessor: GeometryProcessor
  ): THREE.Object3D {
    // Select shape based on role
    const rockShape = RockGenerationUtils.selectShapeByRole(this.rockShapes, role, index);
    
    // Create base geometry
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    
    // Apply role-specific modifications
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    // Apply deformation based on role
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    // Validate geometry
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    // Create material with role-based weathering
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply role-specific rotation
    RockGenerationUtils.applyRoleBasedRotation(rock, role);
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
}
