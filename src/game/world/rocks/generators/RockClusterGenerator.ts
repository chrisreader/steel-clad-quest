import * as THREE from 'three';
import { RockVariation, RockShape, GeometryProcessor, ClusterRole } from '../types/RockTypes';
import { ROCK_SHAPES } from '../config/RockShapeConfig';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { RockGenerationUtils } from '../utils/RockGenerationUtils';
import { GeologicalStackingSystem } from '../utils/GeologicalStackingSystem';

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
    
    const counts = this.calculateDynamicClusterCounts(variation.category, minClusterSize, maxClusterSize);
    
    console.log(`🪨 Creating sequential geological ${variation.category} cluster: ${counts.total} rocks`);
    
    const existingRocks: THREE.Object3D[] = [];
    const centerPosition = new THREE.Vector3(0, 0, 0);
    let rockIndex = 0;

    // Create foundation rocks sequentially
    console.log(`🏔️ Placing ${counts.foundationCount} foundation rocks`);
    for (let i = 0; i < counts.foundationCount; i++) {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      
      const stackingPos = GeologicalStackingSystem.calculateSequentialStackingPosition(
        existingRocks,
        rockSize,
        'foundation',
        variation.category,
        centerPosition,
        rockIndex
      );
      
      const rock = this.createStandardizedClusterRock(
        rockSize, 
        variation, 
        i, 
        'foundation',
        geometryProcessor,
        counts.foundationCount
      );
      
      rock.position.copy(stackingPos.position);
      rockGroup.add(rock);
      existingRocks.push(rock);
      rockIndex++;
      
      console.log(`🏔️ Foundation rock ${i + 1}: (${rock.position.x.toFixed(1)}, ${rock.position.y.toFixed(1)}, ${rock.position.z.toFixed(1)})`);
    }

    // Create support rocks sequentially with aggressive stacking
    console.log(`🗻 Placing ${counts.supportCount} support rocks`);
    for (let i = 0; i < counts.supportCount; i++) {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      
      const stackingPos = GeologicalStackingSystem.calculateSequentialStackingPosition(
        existingRocks,
        rockSize,
        'support',
        variation.category,
        centerPosition,
        rockIndex
      );
      
      const rock = this.createStandardizedClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount, 
        'support',
        geometryProcessor,
        counts.supportCount
      );
      
      rock.position.copy(stackingPos.position);
      rockGroup.add(rock);
      existingRocks.push(rock);
      rockIndex++;
      
      console.log(`🗻 Support rock ${i + 1}: (${rock.position.x.toFixed(1)}, ${rock.position.y.toFixed(1)}, ${rock.position.z.toFixed(1)})`);
    }

    // Create accent rocks sequentially with maximum stacking preference
    console.log(`⛰️ Placing ${counts.accentCount} accent rocks`);
    let spirePairPending = false;
    let spirePairPosition: THREE.Vector3 | null = null;
    
    for (let i = 0; i < counts.accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      
      const stackingPos = GeologicalStackingSystem.calculateSequentialStackingPosition(
        existingRocks,
        rockSize,
        'accent',
        variation.category,
        centerPosition,
        rockIndex
      );
      
      const rock = this.createStandardizedClusterRock(
        rockSize, 
        variation, 
        i,
        'accent',
        geometryProcessor,
        counts.accentCount
      );
      
      // Handle spire pairing
      const isSpire = rock.userData.rockShape?.type === 'spire';
      if (isSpire && !spirePairPending && RockGenerationUtils.shouldCreateSpirePair()) {
        console.log('🗻 Creating spire pair');
        spirePairPending = true;
        spirePairPosition = stackingPos.position.clone();
        
        const pairOffset = new THREE.Vector3(
          (Math.random() - 0.5) * rockSize * 1.2,
          Math.random() * rockSize * 0.2,
          (Math.random() - 0.5) * rockSize * 1.2
        );
        spirePairPosition.add(pairOffset);
      } else if (spirePairPending && spirePairPosition) {
        rock.position.copy(spirePairPosition);
        spirePairPending = false;
        spirePairPosition = null;
        console.log(`🗻 Spire pair completed at height ${rock.position.y.toFixed(1)}`);
      } else {
        rock.position.copy(stackingPos.position);
      }
      
      rockGroup.add(rock);
      existingRocks.push(rock);
      rockIndex++;
      
      console.log(`⛰️ Accent rock ${i + 1}: (${rock.position.x.toFixed(1)}, ${rock.position.y.toFixed(1)}, ${rock.position.z.toFixed(1)})`);
    }
    
    console.log(`🏔️ Sequential cluster complete: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent rocks`);
    console.log(`🏔️ Height range: ${Math.min(...existingRocks.map(r => r.position.y)).toFixed(1)} to ${Math.max(...existingRocks.map(r => r.position.y)).toFixed(1)}`);
    
    // Calculate final cluster footprint
    const positions = existingRocks.map(r => r.position);
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minZ = Math.min(...positions.map(p => p.z));
    const maxZ = Math.max(...positions.map(p => p.z));
    const footprint = Math.max(maxX - minX, maxZ - minZ);
    console.log(`🏔️ Cluster footprint: ${footprint.toFixed(1)} units`);
  }

  /**
   * Create cluster rock using standardized pipeline
   */
  private createStandardizedClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole,
    geometryProcessor: GeometryProcessor,
    totalRoleCount?: number
  ): THREE.Object3D {
    const rockShape = RockGenerationUtils.selectShapeByRole(
      this.rockShapes, 
      role, 
      index, 
      variation.category,
      role === 'accent' ? totalRoleCount : undefined
    );
    
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, role);
    RockGenerationUtils.randomizeRotation(rock, role, rockShape);
    
    rock.userData.rockShape = rockShape;
    
    return rock;
  }

  private calculateDynamicClusterCounts(category: string, minClusterSize: number, maxClusterSize: number) {
    const totalRocks = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    let foundationCount, supportCount, accentCount;
    
    switch (category) {
      case 'massive':
        foundationCount = Math.max(2, Math.floor(totalRocks * 0.4));
        supportCount = Math.floor(totalRocks * 0.4);
        accentCount = totalRocks - foundationCount - supportCount;
        break;
        
      case 'large':
        foundationCount = Math.max(1, Math.floor(totalRocks * 0.35));
        supportCount = Math.floor(totalRocks * 0.45);
        accentCount = totalRocks - foundationCount - supportCount;
        break;
        
      case 'medium':
        foundationCount = Math.max(1, Math.floor(totalRocks * 0.3));
        supportCount = Math.floor(totalRocks * 0.4);
        accentCount = totalRocks - foundationCount - supportCount;
        break;
        
      default:
        return RockGenerationUtils.calculateClusterCounts(minClusterSize, maxClusterSize);
    }
    
    return {
      foundationCount,
      supportCount, 
      accentCount,
      total: totalRocks
    };
  }
}
