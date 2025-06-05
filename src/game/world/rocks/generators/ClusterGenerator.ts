
import * as THREE from 'three';
import { 
  ClusterConfiguration, 
  ClusterRock, 
  ClusterTier, 
  EnvironmentalDetail 
} from '../types/ClusterTypes';
import { RockInstance, RockShapeType, RockVariation } from '../types/RockTypes';
import { RockShapeFactory } from './RockShapeFactory';
import { StackingPhysics } from '../physics/StackingPhysics';

export class ClusterGenerator {
  private shapeFactory: RockShapeFactory;
  private stackingPhysics: StackingPhysics;
  
  constructor() {
    this.shapeFactory = new RockShapeFactory();
    this.stackingPhysics = new StackingPhysics();
  }
  
  public generateCluster(config: ClusterConfiguration): {
    rocks: ClusterRock[];
    environmentalDetails: EnvironmentalDetail[];
  } {
    const rocks: ClusterRock[] = [];
    
    // Generate foundation rocks (40% of cluster)
    this.generateTierRocks('foundation', config.foundationCount, config, rocks);
    
    // Generate support rocks (40% of cluster)
    this.generateTierRocks('support', config.supportCount, config, rocks);
    
    // Generate accent rocks (20% of cluster)
    this.generateTierRocks('accent', config.accentCount, config, rocks);
    
    // Generate environmental details if enabled
    const environmentalDetails = config.environmentalDetails 
      ? this.generateEnvironmentalDetails(config, rocks)
      : [];
    
    return { rocks, environmentalDetails };
  }
  
  public generateClusterFromVariation(variation: RockVariation, position: THREE.Vector3): THREE.Group {
    const cluster = new THREE.Group();
    const clusterSize = variation.clusterSize || [3, 5];
    const rockCount = Math.floor(Math.random() * (clusterSize[1] - clusterSize[0] + 1)) + clusterSize[0];
    
    // Calculate tier counts (40% foundation, 40% support, 20% accent)
    const foundationCount = Math.ceil(rockCount * 0.4);
    const supportCount = Math.ceil(rockCount * 0.4);
    const accentCount = rockCount - foundationCount - supportCount;
    
    const radius = variation.sizeRange[1] * 5;
    const voronoiPoints = this.generateVoronoiPoints(rockCount, radius);
    
    let rockIndex = 0;
    
    // Generate foundation rocks
    for (let i = 0; i < foundationCount; i++) {
      const size = variation.sizeRange[1] * (0.8 + Math.random() * 0.2);
      const shapeType = this.selectShapeForTier('foundation');
      
      const rockInstance = this.shapeFactory.createRock(shapeType, {
        shapeType,
        sizeRange: { min: size, max: size },
        materialVariation: 0.3,
        weatheringRange: { min: 0.1, max: 0.4 },
        variation,
        shape: this.shapeFactory.getShapeForType ? this.shapeFactory.getShapeForType(shapeType) : undefined
      });
      
      const pos = voronoiPoints[rockIndex++];
      pos.y = 0;
      
      this.stackingPhysics.positionFoundationRock(rockInstance.mesh, pos, size);
      cluster.add(rockInstance.mesh);
    }
    
    // Generate support rocks
    for (let i = 0; i < supportCount; i++) {
      const size = variation.sizeRange[1] * (0.5 + Math.random() * 0.3);
      const shapeType = this.selectShapeForTier('support');
      
      const rockInstance = this.shapeFactory.createRock(shapeType, {
        shapeType,
        sizeRange: { min: size, max: size },
        materialVariation: 0.3,
        weatheringRange: { min: 0.1, max: 0.4 },
        variation
      });
      
      const pos = voronoiPoints[rockIndex++];
      this.stackingPhysics.positionSupportRock(rockInstance.mesh, pos, size, cluster.children);
      cluster.add(rockInstance.mesh);
    }
    
    // Generate accent rocks
    for (let i = 0; i < accentCount; i++) {
      const size = variation.sizeRange[1] * (0.2 + Math.random() * 0.3);
      const shapeType = this.selectShapeForTier('accent');
      
      const rockInstance = this.shapeFactory.createRock(shapeType, {
        shapeType,
        sizeRange: { min: size, max: size },
        materialVariation: 0.3,
        weatheringRange: { min: 0.1, max: 0.4 },
        variation
      });
      
      const pos = voronoiPoints[rockIndex++];
      this.stackingPhysics.positionAccentRock(rockInstance.mesh, pos, size, cluster.children);
      cluster.add(rockInstance.mesh);
    }
    
    // Add environmental details
    this.addEnvironmentalDetails(cluster, radius);
    
    cluster.position.copy(position);
    return cluster;
  }
  
  private generateVoronoiPoints(count: number, radius: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      points.push(new THREE.Vector3(
        Math.cos(angle) * dist, 
        0, 
        Math.sin(angle) * dist
      ));
    }
    
    return points;
  }
  
  private addEnvironmentalDetails(cluster: THREE.Group, radius: number): void {
    // Add sediment/debris (6-14 particles)
    const debrisCount = 6 + Math.floor(Math.random() * 9);
    for (let i = 0; i < debrisCount; i++) {
      const debris = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 6, 4),
        new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(0x8B7355).lerp(new THREE.Color(0x654321), Math.random()),
          roughness: 0.9 
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.5 + Math.random() * 0.5);
      debris.position.set(
        Math.cos(angle) * dist, 
        -0.02, // Slightly embedded
        Math.sin(angle) * dist
      );
      
      cluster.add(debris);
    }
    
    // Add vegetation (2-7 plants, north side preference)
    const plantCount = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < plantCount; i++) {
      const plant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.2 + Math.random() * 0.3, 8),
        new THREE.MeshStandardMaterial({ 
          color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, 0.4)
        })
      );
      
      // Prefer north side (negative Z direction) for shelter
      const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI;
      const dist = radius * (0.3 + Math.random() * 0.4);
      plant.position.set(
        Math.cos(angle) * dist, 
        0.15, 
        Math.sin(angle) * dist
      );
      
      cluster.add(plant);
    }
  }
  
  private generateTierRocks(
    tier: ClusterTier,
    count: number,
    config: ClusterConfiguration,
    existingRocks: ClusterRock[]
  ): void {
    const tierConfig = this.getTierConfiguration(tier);
    
    for (let i = 0; i < count; i++) {
      // Select appropriate shape for tier
      const shapeType = this.selectShapeForTier(tier);
      
      // Generate rock instance with proper config including shapeType
      const rockInstance = this.shapeFactory.createRock(shapeType, {
        shapeType,
        sizeRange: this.getSizeRangeForTier(tier, config.radius),
        materialVariation: 0.3,
        weatheringRange: { min: 0.1, max: 0.4 }
      });
      
      // Calculate position using stacking physics
      const position = StackingPhysics.calculateStackingPosition(
        rockInstance,
        tier,
        existingRocks,
        config.centerPosition
      );
      
      // Verify position is stable
      if (StackingPhysics.isPositionStable(position, rockInstance, existingRocks)) {
        const clusterRock: ClusterRock = {
          instance: rockInstance,
          tier,
          position,
          supportedBy: this.findSupportingRocks(position, rockInstance, existingRocks),
          supporting: []
        };
        
        // Update supporting relationships
        this.updateSupportingRelationships(clusterRock, existingRocks);
        
        existingRocks.push(clusterRock);
      }
    }
  }
  
  private getTierConfiguration(tier: ClusterTier) {
    // Configuration for each tier type
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
  
  private getSizeRangeForTier(tier: ClusterTier, clusterRadius: number) {
    const config = this.getTierConfiguration(tier);
    const baseSize = clusterRadius * 0.15; // 15% of cluster radius as base
    
    return {
      min: baseSize * (config.sizePercentage.min / 100),
      max: baseSize * (config.sizePercentage.max / 100)
    };
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
      
      // Check if this rock is close enough and below to provide support
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
    // Update the supporting arrays of rocks that this new rock is supported by
    for (const supportingRock of newRock.supportedBy) {
      if (!supportingRock.supporting.includes(newRock)) {
        supportingRock.supporting.push(newRock);
      }
    }
  }
  
  private generateEnvironmentalDetails(
    config: ClusterConfiguration,
    rocks: ClusterRock[]
  ): EnvironmentalDetail[] {
    const details: EnvironmentalDetail[] = [];
    
    // Generate sediment accumulation (6-14 particles)
    const sedimentCount = 6 + Math.floor(Math.random() * 9);
    for (let i = 0; i < sedimentCount; i++) {
      details.push(this.createSedimentDetail(config, rocks));
    }
    
    // Generate vegetation (2-7 plants, north side preference)
    const vegetationCount = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < vegetationCount; i++) {
      details.push(this.createVegetationDetail(config, rocks));
    }
    
    // Generate debris field (8-20 small fragments)
    const debrisCount = 8 + Math.floor(Math.random() * 13);
    for (let i = 0; i < debrisCount; i++) {
      details.push(this.createDebrisDetail(config, rocks));
    }
    
    return details;
  }
  
  private createSedimentDetail(config: ClusterConfiguration, rocks: ClusterRock[]): EnvironmentalDetail {
    // Create small sediment particles
    const size = 0.05 + Math.random() * 0.1;
    const geometry = new THREE.SphereGeometry(size, 6, 4);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color(0x8B7355).lerp(new THREE.Color(0x654321), Math.random())
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position in low spots around rocks
    const position = this.findLowSpotNearRocks(config, rocks);
    
    return {
      type: 'sediment',
      position,
      mesh
    };
  }
  
  private createVegetationDetail(config: ClusterConfiguration, rocks: ClusterRock[]): EnvironmentalDetail {
    // Create small vegetation
    const size = 0.1 + Math.random() * 0.2;
    const geometry = new THREE.SphereGeometry(size, 8, 6);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, 0.4)
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position on north side of rocks (preference)
    const position = this.findShelterSpotNearRocks(config, rocks);
    
    return {
      type: 'vegetation',
      position,
      mesh
    };
  }
  
  private createDebrisDetail(config: ClusterConfiguration, rocks: ClusterRock[]): EnvironmentalDetail {
    // Create small rock fragments
    const size = 0.03 + Math.random() * 0.05;
    const geometry = new THREE.OctahedronGeometry(size, 0);
    const material = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color(0x666666)
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position randomly around cluster base
    const angle = Math.random() * Math.PI * 2;
    const distance = config.radius * (0.8 + Math.random() * 0.4);
    const position = new THREE.Vector3(
      config.centerPosition.x + Math.cos(angle) * distance,
      0,
      config.centerPosition.z + Math.sin(angle) * distance
    );
    
    return {
      type: 'debris',
      position,
      mesh
    };
  }
  
  private findLowSpotNearRocks(config: ClusterConfiguration, rocks: ClusterRock[]): THREE.Vector3 {
    // Find a spot between rocks where sediment would naturally accumulate
    const angle = Math.random() * Math.PI * 2;
    const distance = config.radius * (0.3 + Math.random() * 0.4);
    
    return new THREE.Vector3(
      config.centerPosition.x + Math.cos(angle) * distance,
      -0.02, // Slightly below ground level
      config.centerPosition.z + Math.sin(angle) * distance
    );
  }
  
  private findShelterSpotNearRocks(config: ClusterConfiguration, rocks: ClusterRock[]): THREE.Vector3 {
    // Prefer north side (negative Z direction) for shelter
    const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI; // North-ish direction
    const distance = config.radius * (0.5 + Math.random() * 0.3);
    
    return new THREE.Vector3(
      config.centerPosition.x + Math.cos(angle) * distance,
      0.01,
      config.centerPosition.z + Math.sin(angle) * distance
    );
  }
}
