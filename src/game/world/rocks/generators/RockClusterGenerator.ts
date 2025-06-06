
import * as THREE from 'three';
import { RockVariation, RockShape, GeometryProcessor, ClusterRole, RockCategory } from '../types/RockTypes';
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
    
    // Use proper 40/40/20 distribution
    const counts = RockGenerationUtils.calculateClusterCounts(minClusterSize, maxClusterSize);
    const scatterRadius = this.calculateScatterRadius(variation.category, maxSize);
    
    console.log(`🪨 Creating ${variation.category} cluster: ${counts.total} rocks (${counts.foundationCount}F/${counts.supportCount}S/${counts.accentCount}A) with radius ${scatterRadius.toFixed(1)}`);
    
    // Store positions for collision avoidance
    const existingPositions: Array<{ position: THREE.Vector3; size: number }> = [];
    
    // Generate foundation rocks first (largest, most stable)
    const foundationPositions = RockGenerationUtils.generateClusterLayout({
      count: counts.foundationCount,
      radiusRange: [0, scatterRadius * 0.6],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'foundation'
    });

    foundationPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2); // 80-100% of max size
      const rock = this.createEnhancedClusterRock(
        rockSize, 
        variation, 
        i, 
        'foundation',
        geometryProcessor
      );
      
      // Apply stacking physics for foundation
      const finalPosition = StackingPhysics.calculateRealisticStackingPosition({
        basePosition: position,
        rockSize,
        baseSize: rockSize,
        role: 'foundation',
        category: variation.category
      });
      
      rock.position.copy(finalPosition);
      rockGroup.add(rock);
      
      existingPositions.push({ position: finalPosition, size: rockSize });
    });

    // Generate support rocks (lean against foundation)
    const supportPositions = RockGenerationUtils.generateClusterLayout({
      count: counts.supportCount,
      radiusRange: [scatterRadius * 0.3, scatterRadius],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'support'
    });

    supportPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3); // 50-80% of max size
      const rock = this.createEnhancedClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount, 
        'support',
        geometryProcessor
      );
      
      // Find nearest foundation rock for leaning physics
      const nearestFoundation = this.findNearestFoundationRock(position, existingPositions);
      
      let finalPosition: THREE.Vector3;
      if (nearestFoundation) {
        finalPosition = StackingPhysics.calculateRealisticStackingPosition({
          basePosition: nearestFoundation.position,
          rockSize,
          baseSize: nearestFoundation.size,
          role: 'support',
          category: variation.category
        });
      } else {
        finalPosition = position.clone();
        finalPosition.y = rockSize * 0.1;
      }
      
      // Avoid collision overlap
      finalPosition = StackingPhysics.avoidCollisionOverlap(finalPosition, rockSize, existingPositions);
      
      rock.position.copy(finalPosition);
      rockGroup.add(rock);
      
      existingPositions.push({ position: finalPosition, size: rockSize });
    });

    // Generate accent rocks (top layer, gaps, dramatic spires)
    const accentPositions = RockGenerationUtils.generateClusterLayout({
      count: counts.accentCount,
      radiusRange: [0, scatterRadius * 0.8],
      centerPosition: new THREE.Vector3(0, 0, 0),
      role: 'accent'
    });

    accentPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3); // 20-50% of max size
      const rock = this.createEnhancedClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount + counts.supportCount, 
        'accent',
        geometryProcessor
      );
      
      // Accent rocks can stack on top or fill gaps
      const nearestBase = this.findNearestBaseRock(position, existingPositions);
      
      let finalPosition: THREE.Vector3;
      if (nearestBase && Math.random() < 0.4) {
        // 40% chance to stack on top
        finalPosition = StackingPhysics.calculateRealisticStackingPosition({
          basePosition: nearestBase.position,
          rockSize,
          baseSize: nearestBase.size,
          role: 'accent',
          category: variation.category
        });
      } else {
        // Fill gaps or scatter around
        finalPosition = position.clone();
        finalPosition.y = rockSize * 0.05;
      }
      
      // Avoid collision overlap
      finalPosition = StackingPhysics.avoidCollisionOverlap(finalPosition, rockSize, existingPositions);
      
      rock.position.copy(finalPosition);
      rockGroup.add(rock);
    });
    
    console.log(`🏔️ Created realistic ${variation.category} cluster with proper stacking physics and role distribution`);
  }

  /**
   * Create enhanced cluster rock using all new systems
   */
  private createEnhancedClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole,
    geometryProcessor: GeometryProcessor
  ): THREE.Object3D {
    // Select shape based on role with proper restrictions
    const rockShape = RockGenerationUtils.selectShapeByRole(this.rockShapes, role, index);
    
    // Create geometry using enhanced processor
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    // Apply enhanced character deformation with category awareness
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape, variation.category);
    
    // Enhanced validation
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    // Create enhanced role-based material
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply enhanced properties and rotation
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, role);
    RockGenerationUtils.applyRoleBasedRotation(rock, role, rockShape, variation.category);
    
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

  /**
   * Find nearest foundation rock for support stacking
   */
  private findNearestFoundationRock(
    position: THREE.Vector3, 
    existingPositions: Array<{ position: THREE.Vector3; size: number }>
  ): { position: THREE.Vector3; size: number } | null {
    let nearest = null;
    let nearestDistance = Infinity;
    
    for (const existing of existingPositions) {
      const distance = position.distanceTo(existing.position);
      if (distance < nearestDistance && existing.size > 0.5) { // Assume foundation rocks are larger
        nearestDistance = distance;
        nearest = existing;
      }
    }
    
    return nearestDistance < 10 ? nearest : null; // Within reasonable stacking distance
  }

  /**
   * Find nearest base rock for accent stacking
   */
  private findNearestBaseRock(
    position: THREE.Vector3, 
    existingPositions: Array<{ position: THREE.Vector3; size: number }>
  ): { position: THREE.Vector3; size: number } | null {
    let nearest = null;
    let nearestDistance = Infinity;
    
    for (const existing of existingPositions) {
      const distance = position.distanceTo(existing.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = existing;
      }
    }
    
    return nearestDistance < 5 ? nearest : null; // Within close stacking distance
  }
}
