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
    
    // Create unique cluster ID for spire tracking
    const clusterId = `cluster_${variation.category}_${index}_${Date.now()}`;
    RockGenerationUtils.resetClusterSpireCount(clusterId);
    
    const counts = this.calculateDynamicClusterCounts(variation.category, minClusterSize, maxClusterSize);
    const scatterRadius = this.calculateScatterRadius(variation.category, maxSize);
    
    console.log(`🪨 Creating ${variation.category} cluster: ${counts.total} rocks (realistic spire system)`);
    
    // Generate cluster positions using enhanced utility
    const foundationPositions = RockGenerationUtils.generateRandomClusterLayout({
      count: counts.foundationCount,
      radiusRange: [0, scatterRadius * 0.6],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'foundation'
    });

    const supportPositions = RockGenerationUtils.generateRandomClusterLayout({
      count: counts.supportCount,
      radiusRange: [scatterRadius * 0.3, scatterRadius],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'support'
    });

    const accentPositions = RockGenerationUtils.generateRandomClusterLayout({
      count: counts.accentCount,
      radiusRange: [0, scatterRadius * 0.8],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'accent'
    });

    // Create foundation rocks with realistic spire selection
    foundationPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      const rock = this.createRealisticClusterRock(
        rockSize, 
        variation, 
        i, 
        'foundation',
        geometryProcessor,
        clusterId
      );
      
      rock.position.copy(position);
      rock.position.y = rockSize * 0.15;
      rockGroup.add(rock);
    });

    // Create support rocks with realistic spire selection
    supportPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      const rock = this.createRealisticClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount, 
        'support',
        geometryProcessor,
        clusterId
      );
      
      rock.position.copy(position);
      rock.position.y = rockSize * 0.1;
      rockGroup.add(rock);
    });

    // Create accent rocks with realistic spire selection
    accentPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createRealisticClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount + counts.supportCount, 
        'accent',
        geometryProcessor,
        clusterId
      );
      
      rock.position.copy(position);
      rock.position.y = rockSize * 0.05;
      rockGroup.add(rock);
    });
    
    console.log(`🏔️ Created realistic ${variation.category} cluster with natural spire distribution`);
  }

  /**
   * Create cluster rock using realistic spire selection system
   */
  private createRealisticClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole,
    geometryProcessor: GeometryProcessor,
    clusterId: string
  ): THREE.Object3D {
    // Use weighted shape selection with cluster spire limiting
    const rockShape = RockGenerationUtils.selectShapeByRole(this.rockShapes, role, index, clusterId);
    
    // Create geometry using standardized processor
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    // Create material and mesh
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Mark spire rocks for special handling
    if (rockShape.type === 'spire') {
      rock.userData.spireType = true;
      console.log(`🗿 Created realistic spire in ${variation.category} cluster`);
    }
    
    // Apply realistic rock properties and rotation
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, role);
    RockGenerationUtils.randomizeRotation(rock, role);
    
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

  private calculateScatterRadius(category: string, maxSize: number): number {
    switch (category) {
      case 'massive':
        return (Math.random() * 3.5 + 2.0) * maxSize;
      case 'large':
        return (Math.random() * 2.8 + 1.5) * maxSize;
      case 'medium':
        return (Math.random() * 2.2 + 1.2) * maxSize;
      default:
        return Math.random() * 2.5 + 1;
    }
  }
}
