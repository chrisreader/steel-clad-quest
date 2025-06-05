import * as THREE from 'three';
import { 
  ClusterConfiguration, 
  ClusterRock, 
  ClusterTier, 
  EnvironmentalDetail 
} from '../types/ClusterTypes';
import { RockInstance, RockShapeType } from '../types/RockTypes';
import { RockShapeFactory } from './RockShapeFactory';
import { StackingPhysics } from '../physics/StackingPhysics';

export class ClusterGenerator {
  private shapeFactory: RockShapeFactory;
  
  constructor() {
    this.shapeFactory = new RockShapeFactory();
  }
  
  public generateCluster(config: ClusterConfiguration): {
    rocks: ClusterRock[];
    environmentalDetails: EnvironmentalDetail[];
  } {
    const rocks: ClusterRock[] = [];
    
    console.log(`🏔️ Generating MASSIVE cluster at (${config.centerPosition.x.toFixed(1)}, ${config.centerPosition.z.toFixed(1)}) with radius ${config.radius}`);
    
    // Generate foundation rocks (larger, more stable base)
    this.generateTierRocks('foundation', config.foundationCount, config, rocks);
    console.log(`🏔️ Generated ${config.foundationCount} foundation rocks`);
    
    // Generate support rocks (medium size, stacked on foundation)
    this.generateTierRocks('support', config.supportCount, config, rocks);
    console.log(`🏔️ Generated ${config.supportCount} support rocks`);
    
    // Generate accent rocks (smaller, final details)
    this.generateTierRocks('accent', config.accentCount, config, rocks);
    console.log(`🏔️ Generated ${config.accentCount} accent rocks`);
    
    // Generate extensive environmental details
    const environmentalDetails = config.environmentalDetails 
      ? this.generateEnhancedEnvironmentalDetails(config, rocks)
      : [];
    
    console.log(`🏔️ Generated ${environmentalDetails.length} environmental details`);
    console.log(`🏔️ MASSIVE cluster complete: ${rocks.length} total rocks`);
    
    return { rocks, environmentalDetails };
  }
  
  private generateTierRocks(
    tier: ClusterTier,
    count: number,
    config: ClusterConfiguration,
    existingRocks: ClusterRock[]
  ): void {
    const tierConfig = this.getTierConfiguration(tier);
    
    for (let i = 0; i < count; i++) {
      const shapeType = this.selectShapeForTier(tier);
      
      // Create rock with enhanced size ranges
      const rockInstance = this.shapeFactory.createRock(shapeType, {
        shapeType,
        sizeRange: this.getEnhancedSizeRangeForTier(tier, config.radius),
        materialVariation: 0.3,
        weatheringRange: { min: 0.1, max: 0.4 }
      });
      
      // Calculate realistic stacking position
      const position = StackingPhysics.calculateStackingPosition(
        rockInstance,
        tier,
        existingRocks,
        config.centerPosition
      );
      
      // Verify position stability with enhanced physics
      if (StackingPhysics.isPositionStable(position, rockInstance, existingRocks)) {
        const clusterRock: ClusterRock = {
          instance: rockInstance,
          tier,
          position,
          supportedBy: this.findSupportingRocks(position, rockInstance, existingRocks),
          supporting: []
        };
        
        this.updateSupportingRelationships(clusterRock, existingRocks);
        existingRocks.push(clusterRock);
        
        console.log(`🏔️ Added ${tier} rock (${shapeType}) at height ${position.y.toFixed(2)}, size ${rockInstance.boundingRadius.toFixed(2)}`);
      } else {
        console.log(`🏔️ Rejected unstable ${tier} rock position`);
      }
    }
  }
  
  // Enhanced size ranges for truly massive rocks
  private getEnhancedSizeRangeForTier(tier: ClusterTier, clusterRadius: number) {
    const scaleFactor = Math.max(1.0, clusterRadius / 30); // Scale with cluster size
    
    switch (tier) {
      case 'foundation':
        return {
          min: 1.5 * scaleFactor,  // Much larger foundation rocks
          max: 4.0 * scaleFactor
        };
      case 'support':
        return {
          min: 1.0 * scaleFactor,  // Substantial support rocks
          max: 3.0 * scaleFactor
        };
      case 'accent':
        return {
          min: 0.5 * scaleFactor,  // Visible accent rocks
          max: 2.0 * scaleFactor
        };
      default:
        return { min: 0.5, max: 1.0 };
    }
  }
  
  private getTierConfiguration(tier: ClusterTier) {
    const configs = {
      foundation: {
        sizePercentage: { min: 80, max: 100 },
        allowedShapes: ['boulder', 'weathered', 'slab'],
        stabilityRequired: 0.9
      },
      support: {
        sizePercentage: { min: 50, max: 80 },
        allowedShapes: ['boulder', 'angular', 'weathered', 'slab'],
        stabilityRequired: 0.7
      },
      accent: {
        sizePercentage: { min: 20, max: 50 },
        allowedShapes: ['angular', 'jagged', 'flattened', 'spire'],
        stabilityRequired: 0.5
      }
    };
    
    return configs[tier];
  }
  
  private selectShapeForTier(tier: ClusterTier): RockShapeType {
    const config = this.getTierConfiguration(tier);
    const shapes = config.allowedShapes;
    return shapes[Math.floor(Math.random() * shapes.length)] as RockShapeType;
  }
  
  private findSupportingRocks(
    position: THREE.Vector3,
    rock: RockInstance,
    existingRocks: ClusterRock[]
  ): ClusterRock[] {
    const supporting: ClusterRock[] = [];
    
    for (const existing of existingRocks) {
      const distance = position.distanceTo(existing.position);
      const supportRange = rock.boundingRadius + existing.instance.boundingRadius;
      
      if (distance < supportRange * 1.2 && existing.position.y < position.y) {
        supporting.push(existing);
      }
    }
    
    return supporting;
  }
  
  private updateSupportingRelationships(
    newRock: ClusterRock,
    existingRocks: ClusterRock[]
  ): void {
    for (const supportingRock of newRock.supportedBy) {
      if (!supportingRock.supporting.includes(newRock)) {
        supportingRock.supporting.push(newRock);
      }
    }
  }
  
  private generateEnhancedEnvironmentalDetails(
    config: ClusterConfiguration,
    rocks: ClusterRock[]
  ): EnvironmentalDetail[] {
    const details: EnvironmentalDetail[] = [];
    const clusterScale = config.radius / 25; // Scale details with cluster size
    
    // Enhanced sediment accumulation (scaled with cluster size)
    const sedimentCount = Math.floor(15 + Math.random() * 25 * clusterScale);
    for (let i = 0; i < sedimentCount; i++) {
      details.push(this.createEnhancedSedimentDetail(config, rocks, clusterScale));
    }
    
    // Larger vegetation patches (north side preference)
    const vegetationCount = Math.floor(8 + Math.random() * 15 * clusterScale);
    for (let i = 0; i < vegetationCount; i++) {
      details.push(this.createEnhancedVegetationDetail(config, rocks, clusterScale));
    }
    
    // Extensive debris field (rock fragments)
    const debrisCount = Math.floor(25 + Math.random() * 40 * clusterScale);
    for (let i = 0; i < debrisCount; i++) {
      details.push(this.createEnhancedDebrisDetail(config, rocks, clusterScale));
    }
    
    // Add weathering streaks on large rocks
    const weatheringCount = Math.floor(5 + Math.random() * 10 * clusterScale);
    for (let i = 0; i < weatheringCount; i++) {
      details.push(this.createWeatheringStreakDetail(config, rocks, clusterScale));
    }
    
    console.log(`🏔️ Enhanced environmental details: ${sedimentCount} sediment, ${vegetationCount} vegetation, ${debrisCount} debris, ${weatheringCount} weathering`);
    
    return details;
  }
  
  private createEnhancedSedimentDetail(config: ClusterConfiguration, rocks: ClusterRock[], scale: number): EnvironmentalDetail {
    const size = (0.08 + Math.random() * 0.15) * scale;
    const geometry = new THREE.SphereGeometry(size, 8, 6);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color(0x8B7355).lerp(new THREE.Color(0x654321), Math.random())
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const position = this.findRealisticSedimentPosition(config, rocks, scale);
    
    return {
      type: 'sediment',
      position,
      mesh
    };
  }
  
  private createEnhancedVegetationDetail(config: ClusterConfiguration, rocks: ClusterRock[], scale: number): EnvironmentalDetail {
    const size = (0.15 + Math.random() * 0.3) * scale;
    const geometry = new THREE.SphereGeometry(size, 12, 8);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.8, 0.3 + Math.random() * 0.2)
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const position = this.findRealisticVegetationPosition(config, rocks, scale);
    
    return {
      type: 'vegetation',
      position,
      mesh
    };
  }
  
  private createEnhancedDebrisDetail(config: ClusterConfiguration, rocks: ClusterRock[], scale: number): EnvironmentalDetail {
    const size = (0.05 + Math.random() * 0.12) * scale;
    const geometry = new THREE.OctahedronGeometry(size, Math.random() < 0.3 ? 1 : 0);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color(0x555555).lerp(new THREE.Color(0x888888), Math.random())
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Scatter debris realistically around cluster base
    const angle = Math.random() * Math.PI * 2;
    const distance = config.radius * (0.6 + Math.random() * 0.8);
    const position = new THREE.Vector3(
      config.centerPosition.x + Math.cos(angle) * distance,
      -0.01 + Math.random() * 0.02,
      config.centerPosition.z + Math.sin(angle) * distance
    );
    
    return {
      type: 'debris',
      position,
      mesh
    };
  }
  
  private createWeatheringStreakDetail(config: ClusterConfiguration, rocks: ClusterRock[], scale: number): EnvironmentalDetail {
    // Create small weathering marks near large foundation rocks
    const size = (0.03 + Math.random() * 0.08) * scale;
    const geometry = new THREE.PlaneGeometry(size * 2, size * 0.5);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color(0x444444),
      transparent: true,
      opacity: 0.6
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Find a large foundation rock to place weathering near
    const foundationRocks = rocks.filter(r => r.tier === 'foundation');
    if (foundationRocks.length > 0) {
      const targetRock = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * targetRock.instance.boundingRadius * 2,
        targetRock.instance.boundingRadius * 0.3,
        (Math.random() - 0.5) * targetRock.instance.boundingRadius * 2
      );
      
      const position = targetRock.position.clone().add(offset);
      
      return {
        type: 'debris',
        position,
        mesh
      };
    }
    
    // Fallback position
    return this.createEnhancedDebrisDetail(config, rocks, scale);
  }
  
  private findRealisticSedimentPosition(config: ClusterConfiguration, rocks: ClusterRock[], scale: number): THREE.Vector3 {
    // Sediment accumulates in low spots between rocks
    const foundationRocks = rocks.filter(r => r.tier === 'foundation');
    
    if (foundationRocks.length >= 2) {
      // Find space between two foundation rocks
      const rock1 = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
      const rock2 = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
      
      if (rock1 !== rock2) {
        const midpoint = rock1.position.clone().lerp(rock2.position, 0.5);
        midpoint.y = -0.03; // Slightly embedded
        return midpoint;
      }
    }
    
    // Fallback: random position near cluster edge
    const angle = Math.random() * Math.PI * 2;
    const distance = config.radius * (0.4 + Math.random() * 0.3);
    return new THREE.Vector3(
      config.centerPosition.x + Math.cos(angle) * distance,
      -0.02,
      config.centerPosition.z + Math.sin(angle) * distance
    );
  }
  
  private findRealisticVegetationPosition(config: ClusterConfiguration, rocks: ClusterRock[], scale: number): THREE.Vector3 {
    // Vegetation grows in sheltered spots, preferably north side
    const baseAngle = -Math.PI/2; // North direction
    const angleVariation = (Math.random() - 0.5) * Math.PI * 0.8; // ±72 degrees
    const angle = baseAngle + angleVariation;
    
    const distance = config.radius * (0.6 + Math.random() * 0.4);
    
    return new THREE.Vector3(
      config.centerPosition.x + Math.cos(angle) * distance,
      0.02,
      config.centerPosition.z + Math.sin(angle) * distance
    );
  }
}
