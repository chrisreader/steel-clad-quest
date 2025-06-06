import * as THREE from 'three';
import { RockVariation, RockShape, GeometryProcessor, ClusterRole } from '../types/RockTypes';
import { ROCK_SHAPES } from '../config/RockShapeConfig';
import { RockMaterialGenerator } from '../materials/RockMaterialGenerator';
import { RockGenerationUtils } from '../utils/RockGenerationUtils';
import { DramaticRockShapeGenerator } from './DramaticRockShapeGenerator';

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
    const scatterRadius = this.calculateScatterRadius(variation.category, maxSize);
    
    console.log(`🪨 Creating ${variation.category} cluster: ${counts.total} rocks with scatter radius ${scatterRadius.toFixed(1)}`);
    
    // Check if this is a large or massive cluster that should use dramatic shapes
    const useDramaticShapes = variation.category === 'large' || variation.category === 'massive';
    
    if (useDramaticShapes) {
      console.log(`🗿 Using dramatic shapes for ${variation.category} cluster`);
    }
    
    // Generate cluster positions using new utility
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

    // Create foundation rocks
    foundationPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.8 + Math.random() * 0.2);
      
      let rock: THREE.Object3D;
      if (useDramaticShapes) {
        rock = this.createDramaticClusterRock(rockSize, variation, i, 'foundation');
      } else {
        rock = this.createStandardizedClusterRock(rockSize, variation, i, 'foundation', geometryProcessor);
      }
      
      rock.position.copy(position);
      rock.position.y = rockSize * 0.15;
      rockGroup.add(rock);
      
      // Add vertical stacking for dramatic shapes
      if (useDramaticShapes && Math.random() < 0.3) {
        const material = (rock as THREE.Mesh).material as THREE.Material;
        DramaticRockShapeGenerator.createVerticalStack(rock, rockGroup, rockSize, material);
      }
    });

    // Create support rocks
    supportPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.5 + Math.random() * 0.3);
      
      let rock: THREE.Object3D;
      if (useDramaticShapes) {
        rock = this.createDramaticClusterRock(rockSize, variation, i + counts.foundationCount, 'support');
      } else {
        rock = this.createStandardizedClusterRock(rockSize, variation, i + counts.foundationCount, 'support', geometryProcessor);
      }
      
      rock.position.copy(position);
      rock.position.y = rockSize * 0.1;
      rockGroup.add(rock);
      
      // Add vertical stacking for dramatic shapes
      if (useDramaticShapes && Math.random() < 0.3) {
        const material = (rock as THREE.Mesh).material as THREE.Material;
        DramaticRockShapeGenerator.createVerticalStack(rock, rockGroup, rockSize, material);
      }
    });

    // Create accent rocks
    accentPositions.forEach((position, i) => {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      
      let rock: THREE.Object3D;
      if (useDramaticShapes) {
        rock = this.createDramaticClusterRock(rockSize, variation, i + counts.foundationCount + counts.supportCount, 'accent');
      } else {
        rock = this.createStandardizedClusterRock(rockSize, variation, i + counts.foundationCount + counts.supportCount, 'accent', geometryProcessor);
      }
      
      rock.position.copy(position);
      rock.position.y = rockSize * 0.05;
      rockGroup.add(rock);
      
      // Add vertical stacking for dramatic shapes (lower chance for accent rocks)
      if (useDramaticShapes && Math.random() < 0.15) {
        const material = (rock as THREE.Mesh).material as THREE.Material;
        DramaticRockShapeGenerator.createVerticalStack(rock, rockGroup, rockSize, material);
      }
    });
    
    if (useDramaticShapes) {
      console.log(`🏔️ Created dramatic ${variation.category} cluster: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent rocks with vertical stacking`);
    } else {
      console.log(`🏔️ Created ${variation.category} cluster: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent rocks`);
    }
  }

  /**
   * Create dramatic cluster rock using new shape system
   */
  private createDramaticClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole
  ): THREE.Object3D {
    // Choose dramatic shape type using weighted selection
    const shapeType = DramaticRockShapeGenerator.chooseWeightedShapeType();
    
    // Generate the dramatic geometry
    const geometry = DramaticRockShapeGenerator.generateDramaticShapeGeometry(shapeType, rockSize);
    
    // Apply organic noise if not a pure cone
    if (shapeType !== 'coneFracture') {
      DramaticRockShapeGenerator.applyOrganicNoise(geometry, rockSize * 0.15);
    }
    
    // Select appropriate rock shape for material generation
    const rockShape = RockGenerationUtils.selectShapeByRole(this.rockShapes, role, index);
    
    // Create material
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    
    // Create mesh
    const rock = new THREE.Mesh(geometry, material);
    
    // Apply standardized properties
    RockGenerationUtils.applyStandardRockProperties(rock, variation.category, role);
    RockGenerationUtils.randomizeRotation(rock, role);
    
    // Set shadow properties
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Add metadata
    rock.userData = {
      type: 'rock',
      category: variation.category,
      role: role,
      shapeType: shapeType,
      originalSize: rockSize,
      isDramatic: true
    };
    
    console.log(`🗿 Created dramatic ${shapeType} rock (${role}) with size ${rockSize.toFixed(1)}`);
    
    return rock;
  }

  /**
   * Create cluster rock using standardized pipeline
   */
  private createStandardizedClusterRock(
    rockSize: number, 
    variation: RockVariation, 
    index: number, 
    role: ClusterRole,
    geometryProcessor: GeometryProcessor
  ): THREE.Object3D {
    // Select shape based on role
    const rockShape = RockGenerationUtils.selectShapeByRole(this.rockShapes, role, index);
    
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
