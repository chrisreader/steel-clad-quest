import * as THREE from 'three';
import { RockVariation, RockShape, GeometryProcessor, ClusterRole } from '../types/RockTypes';
import { ROCK_SHAPES } from '../config/RockShapeConfig';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { RockGenerationUtils } from '../utils/RockGenerationUtils';
import { StackingPhysics } from '../utils/StackingPhysics';

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
    
    const clusterId = `cluster_${variation.category}_${index}_${Date.now()}`;
    RockGenerationUtils.resetClusterSpireCount(clusterId);
    
    const counts = this.calculateRealisticClusterCounts(variation.category, minClusterSize, maxClusterSize);
    const scatterRadius = this.calculateScatterRadius(variation.category, maxSize);
    
    console.log(`🪨 Creating realistic ${variation.category} cluster: ${counts.total} rocks with proper role distribution`);
    console.log(`🪨 Role distribution: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent`);
    
    const existingRocks: Array<{ position: THREE.Vector3; size: number }> = [];
    
    // Create foundation rocks (40% - stable base)
    const foundationPositions = RockGenerationUtils.generateRandomClusterLayout({
      count: counts.foundationCount,
      radiusRange: [0, scatterRadius * 0.4],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'foundation'
    });

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
      
      const stackedPosition = StackingPhysics.calculateRealisticStackingPosition(
        position, rockSize, rockSize, 'foundation', variation.category
      );
      rock.position.copy(stackedPosition);
      
      rockGroup.add(rock);
      existingRocks.push({ position: stackedPosition, size: rockSize });
    });

    // Create support rocks (40% - leaning against foundation)
    const supportPositions = RockGenerationUtils.generateRandomClusterLayout({
      count: counts.supportCount,
      radiusRange: [scatterRadius * 0.2, scatterRadius * 0.8],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'support'
    });

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
      
      const stackedPosition = StackingPhysics.findStablePlacement(
        position, rockSize, 'support', existingRocks
      ) || position;
      
      rock.position.copy(stackedPosition);
      rockGroup.add(rock);
      existingRocks.push({ position: stackedPosition, size: rockSize });
    });

    // Create accent rocks (20% - top layer with spires)
    const accentPositions = RockGenerationUtils.generateRandomClusterLayout({
      count: counts.accentCount,
      radiusRange: [0, scatterRadius],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'accent'
    });

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
      
      const stackedPosition = StackingPhysics.findStablePlacement(
        position, rockSize, 'accent', existingRocks
      ) || position;
      
      rock.position.copy(stackedPosition);
      rockGroup.add(rock);
      existingRocks.push({ position: stackedPosition, size: rockSize });
    });
    
    console.log(`🏔️ Created realistic ${variation.category} cluster with proper role distribution and stacking physics`);
  }

  /**
   * Create cluster rock using realistic role-based system with enhanced materials
   */
  private createRealisticClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole,
    geometryProcessor: GeometryProcessor,
    clusterId: string
  ): THREE.Object3D {
    // Use proper role-based shape selection
    const rockShape = RockGenerationUtils.selectShapeByRole(this.rockShapes, role, index, clusterId);
    
    // Create geometry using standardized processor with enhanced deformation
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    const deformationIntensity = this.calculateRoleBasedDeformation(role, rockShape);
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    // Create enhanced role-based material
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Mark spire rocks for special handling
    if (rockShape.type === 'spire') {
      rock.userData.spireType = true;
      console.log(`🗿 Created realistic ${role} spire in ${variation.category} cluster`);
    }
    
    // Apply realistic rock properties and enhanced rotation
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, role);
    RockGenerationUtils.randomizeRotation(rock, role, variation.category);
    
    return rock;
  }

  /**
   * Calculate realistic cluster counts with proper 40/40/20 distribution
   */
  private calculateRealisticClusterCounts(category: string, minClusterSize: number, maxClusterSize: number) {
    const totalRocks = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Proper role distribution: 40% foundation, 40% support, 20% accent
    const foundationCount = Math.max(1, Math.floor(totalRocks * 0.4));
    const supportCount = Math.max(1, Math.floor(totalRocks * 0.4));
    const accentCount = Math.max(1, totalRocks - foundationCount - supportCount);
    
    return {
      foundationCount,
      supportCount,
      accentCount,
      total: totalRocks
    };
  }

  /**
   * Calculate role-based deformation intensity
   */
  private calculateRoleBasedDeformation(role: ClusterRole, rockShape: RockShape): number {
    let baseIntensity = rockShape.deformationIntensity;
    
    switch (role) {
      case 'foundation':
        return baseIntensity * 0.8; // Less deformation for stability
      case 'support':
        return baseIntensity; // Standard deformation
      case 'accent':
        return baseIntensity * 1.2; // More deformation for character
      default:
        return baseIntensity;
    }
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
