
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
    
    // Calculate dynamic cluster counts based on requested sizing
    const counts = this.calculateDynamicClusterCounts(variation.category, minClusterSize, maxClusterSize);
    
    // Calculate scatter radius based on rock category for organic spread
    const scatterRadius = this.calculateScatterRadius(variation.category, maxSize);
    
    console.log(`🪨 Creating ${variation.category} cluster: ${counts.total} rocks with scatter radius ${scatterRadius.toFixed(1)}`);
    
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
      
      // Position foundation rocks with wider organic spacing
      const angle = (i / counts.foundationCount) * Math.PI * 2 + Math.random() * 0.8;
      const distance = (Math.random() * scatterRadius * 0.6) + (rockSize * 0.2);
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.15,
        Math.sin(angle) * distance
      );
      
      foundationRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create supporting rocks (medium size) with wider scatter
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
      
      // Position with expanded organic scatter pattern
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * scatterRadius + rockSize * 0.3;
      const baseX = Math.cos(angle) * distance;
      const baseZ = Math.sin(angle) * distance;
      
      // Add some clustering tendency toward foundation rocks but with wider spread
      if (foundationRocks.length > 0 && Math.random() < 0.4) {
        const nearFoundation = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
        const clusterOffset = scatterRadius * 0.3 * (Math.random() - 0.5);
        rock.position.set(
          nearFoundation.position.x + baseX * 0.5 + clusterOffset,
          rockSize * 0.1,
          nearFoundation.position.z + baseZ * 0.5 + clusterOffset
        );
      } else {
        rock.position.set(baseX, rockSize * 0.1, baseZ);
      }
      
      supportRocks.push(rock);
      rockGroup.add(rock);
    }
    
    // Create accent rocks (smallest, most varied shapes) with full scatter
    for (let i = 0; i < counts.accentCount; i++) {
      const rockSize = maxSize * (0.2 + Math.random() * 0.3);
      const rock = this.createClusterRock(
        rockSize, 
        variation, 
        i + counts.foundationCount + counts.supportCount, 
        'accent',
        geometryProcessor
      );
      
      // Position accent rocks with full organic scatter
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * scatterRadius * 0.8;
      rock.position.set(
        Math.cos(angle) * distance,
        rockSize * 0.05,
        Math.sin(angle) * distance
      );
      
      rockGroup.add(rock);
    }
    
    console.log(`🏔️ Created ${variation.category} cluster: ${counts.foundationCount} foundation, ${counts.supportCount} support, ${counts.accentCount} accent rocks`);
  }

  private calculateDynamicClusterCounts(category: string, minClusterSize: number, maxClusterSize: number) {
    // Use the actual cluster size range for total count
    const totalRocks = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    let foundationCount, supportCount, accentCount;
    
    switch (category) {
      case 'massive':
        // 6-10 rocks: more foundation rocks for impressive scale
        foundationCount = Math.max(2, Math.floor(totalRocks * 0.4));
        supportCount = Math.floor(totalRocks * 0.4);
        accentCount = totalRocks - foundationCount - supportCount;
        break;
        
      case 'large':
        // 5-8 rocks: balanced distribution
        foundationCount = Math.max(1, Math.floor(totalRocks * 0.35));
        supportCount = Math.floor(totalRocks * 0.45);
        accentCount = totalRocks - foundationCount - supportCount;
        break;
        
      case 'medium':
        // 3-5 rocks: more support and accent for variety
        foundationCount = Math.max(1, Math.floor(totalRocks * 0.3));
        supportCount = Math.floor(totalRocks * 0.4);
        accentCount = totalRocks - foundationCount - supportCount;
        break;
        
      default:
        // Fallback to original logic
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
        // Widest scatter for massive formations
        return (Math.random() * 3.5 + 2.0) * maxSize;
        
      case 'large':
        // Good spread for large formations  
        return (Math.random() * 2.8 + 1.5) * maxSize;
        
      case 'medium':
        // Moderate scatter for medium clusters
        return (Math.random() * 2.2 + 1.2) * maxSize;
        
      default:
        // Fallback
        return Math.random() * 2.5 + 1;
    }
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
    
    let geometry = geometryProcessor.createCharacterBaseGeometry(rockShape, rockSize);
    
    geometryProcessor.applyShapeModifications(geometry, rockShape, rockSize);
    
    const deformationIntensity = role === 'accent' ? 
      rockShape.deformationIntensity : rockShape.deformationIntensity * 0.7;
    geometryProcessor.applyCharacterDeformation(geometry, deformationIntensity, rockSize, rockShape);
    
    geometryProcessor.validateAndEnhanceGeometry(geometry);
    
    const material = RockMaterialGenerator.createRoleBasedMaterial(variation.category, rockShape, index, role);
    const rock = new THREE.Mesh(geometry, material);
    
    RockGenerationUtils.applyRoleBasedRotation(rock, role);
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }
}
