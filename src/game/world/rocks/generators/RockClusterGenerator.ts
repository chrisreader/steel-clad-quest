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
    
    console.log(`🪨 Creating geological ${variation.category} cluster: ${counts.total} rocks`);
    
    // Use geological positioning instead of random scatter
    const geologicalLayout = GeologicalStackingSystem.generateGeologicalClusterLayout(
      counts.total,
      variation.category,
      new THREE.Vector3(0, 0, 0),
      maxSize
    );

    const existingRocks: THREE.Object3D[] = [];

    // Create foundation rocks with tight clustering
    geologicalLayout.foundationPositions.forEach((basePosition, i) => {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      
      // Use geological stacking for realistic positioning
      const stackingPos = GeologicalStackingSystem.calculateStableStackingPosition(
        existingRocks,
        rockSize,
        'foundation',
        variation.category,
        basePosition
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
      
      console.log(`🏔️ Foundation rock ${i + 1}: (${rock.position.x.toFixed(1)}, ${rock.position.y.toFixed(1)}, ${rock.position.z.toFixed(1)})`);
    });

    // Create support rocks with vertical stacking preference
    geologicalLayout.supportPositions.forEach((basePosition, i) => {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      
      // Use geological stacking for realistic positioning
      const stackingPos = GeologicalStackingSystem.calculateStableStackingPosition(
        existingRocks,
        rockSize,
        'support',
        variation.category,
        basePosition
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
      
      console.log(`🏔️ Support rock ${i + 1}: (${rock.position.x.toFixed(1)}, ${rock.position.y.toFixed(1)}, ${rock.position.z.toFixed(1)})`);
    });

    // Create accent rocks with enhanced stacking and spire pairing
    let spirePairPending = false;
    let spirePairPosition: THREE.Vector3 | null = null;
    
    geologicalLayout.accentPositions.forEach((basePosition, i) => {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      
      // Use geological stacking for realistic positioning
      const stackingPos = GeologicalStackingSystem.calculateStableStackingPosition(
        existingRocks,
        rockSize,
        'accent',
        variation.category,
        basePosition
      );
      
      const rock = this.createStandardizedClusterRock(
        rockSize, 
        variation, 
        i,
        'accent',
        geometryProcessor,
        counts.accentCount
      );
      
      // Enhanced spire pairing with geological positioning
      const isSpire = rock.userData.rockShape?.type === 'spire';
      if (isSpire && !spirePairPending && RockGenerationUtils.shouldCreateSpirePair()) {
        console.log('🗻 Creating geological spire pair');
        spirePairPending = true;
        spirePairPosition = stackingPos.position.clone();
        
        // Geological spire pairing - place nearby with realistic spacing
        const pairOffset = new THREE.Vector3(
          (Math.random() - 0.5) * rockSize * 1.5, // Closer spacing for realism
          Math.random() * rockSize * 0.3,         // Slight height variation
          (Math.random() - 0.5) * rockSize * 1.5
        );
        spirePairPosition.add(pairOffset);
      } else if (spirePairPending && spirePairPosition) {
        // Place second spire of the geological pair
        rock.position.copy(spirePairPosition);
        spirePairPending = false;
        spirePairPosition = null;
        console.log(`🗻 Geological spire pair completed at height ${rock.position.y.toFixed(1)}`);
      } else {
        rock.position.copy(stackingPos.position);
      }
      
      rockGroup.add(rock);
      existingRocks.push(rock);
      
      console.log(`🏔️ Accent rock ${i + 1}: (${rock.position.x.toFixed(1)}, ${rock.position.y.toFixed(1)}, ${rock.position.z.toFixed(1)})`);
    });
    
    console.log(`🏔️ Geological cluster complete: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent rocks`);
    console.log(`🏔️ Height range: ${Math.min(...existingRocks.map(r => r.position.y)).toFixed(1)} to ${Math.max(...existingRocks.map(r => r.position.y)).toFixed(1)}`);
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
    // Select shape based on role with spire support and fixed percentage for accents
    const rockShape = RockGenerationUtils.selectShapeByRole(
      this.rockShapes, 
      role, 
      index, 
      variation.category,
      role === 'accent' ? totalRoleCount : undefined
    );
    
    // Create geometry using standardized processor
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    // Use standardized validation
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    // Create material and mesh
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply standardized properties
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, role);
    
    // Apply spire-aware rotation
    RockGenerationUtils.randomizeRotation(rock, role, rockShape);
    
    // Store rock shape in userData for pairing detection
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
