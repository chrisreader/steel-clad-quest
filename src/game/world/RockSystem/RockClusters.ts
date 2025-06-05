
import * as THREE from 'three';
import { RockVariation } from './RockVariations';
import { RockGeometry } from './RockGeometry';
import { RockMaterials } from './RockMaterials';
import { RockFeatures } from './RockFeatures';

export interface ClusterFormation {
  foundationRocks: THREE.Mesh[];
  supportRocks: THREE.Mesh[];
  accentRocks: THREE.Mesh[];
}

export class RockClusters {
  static createCluster(
    variation: RockVariation,
    position: THREE.Vector3,
    scene: THREE.Scene
  ): ClusterFormation {
    const formation: ClusterFormation = {
      foundationRocks: [],
      supportRocks: [],
      accentRocks: []
    };

    if (!variation.isCluster || !variation.clusterSize) {
      return formation;
    }

    const clusterSize = variation.clusterSize.min + 
      Math.floor(Math.random() * (variation.clusterSize.max - variation.clusterSize.min + 1));

    // Create foundation rocks (largest)
    const foundationCount = Math.max(1, Math.floor(clusterSize * 0.4));
    for (let i = 0; i < foundationCount; i++) {
      const rock = this.createFoundationRock(variation, position, i, foundationCount);
      formation.foundationRocks.push(rock);
      scene.add(rock);
    }

    // Create support rocks (medium)
    const supportCount = Math.floor(clusterSize * 0.4);
    for (let i = 0; i < supportCount; i++) {
      const rock = this.createSupportRock(variation, position, formation.foundationRocks);
      formation.supportRocks.push(rock);
      scene.add(rock);
    }

    // Create accent rocks (smallest)
    const accentCount = clusterSize - foundationCount - supportCount;
    for (let i = 0; i < accentCount; i++) {
      const rock = this.createAccentRock(variation, position, [...formation.foundationRocks, ...formation.supportRocks]);
      formation.accentRocks.push(rock);
      scene.add(rock);
    }

    // Add cluster-wide features
    this.addClusterFeatures(formation, variation, scene);

    return formation;
  }

  private static createFoundationRock(
    variation: RockVariation,
    basePosition: THREE.Vector3,
    index: number,
    totalCount: number
  ): THREE.Mesh {
    const shape = this.selectShapeForRole('foundation');
    const geometry = RockGeometry.createRockGeometry(variation, shape);
    const material = RockMaterials.createRockMaterial(variation, shape);
    
    const rock = new THREE.Mesh(geometry, material);
    
    // Position foundation rocks in a rough circle
    const angle = (index / totalCount) * Math.PI * 2;
    const radius = Math.random() * variation.sizeRange.max * 0.3;
    
    rock.position.set(
      basePosition.x + Math.cos(angle) * radius,
      basePosition.y,
      basePosition.z + Math.sin(angle) * radius
    );
    
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Add surface features
    RockFeatures.addSurfaceFeatures(rock, variation, shape);
    RockFeatures.addWeathering(rock, variation);
    
    return rock;
  }

  private static createSupportRock(
    variation: RockVariation,
    basePosition: THREE.Vector3,
    foundationRocks: THREE.Mesh[]
  ): THREE.Mesh {
    const shape = this.selectShapeForRole('support');
    
    // Scale down for support rocks
    const scaledVariation = { ...variation };
    scaledVariation.sizeRange = {
      min: variation.sizeRange.min * 0.6,
      max: variation.sizeRange.max * 0.8
    };
    
    const geometry = RockGeometry.createRockGeometry(scaledVariation, shape);
    const material = RockMaterials.createRockMaterial(scaledVariation, shape);
    
    const rock = new THREE.Mesh(geometry, material);
    
    // Position support rocks near foundation rocks, potentially stacked
    if (foundationRocks.length > 0) {
      const targetFoundation = foundationRocks[Math.floor(Math.random() * foundationRocks.length)];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * variation.sizeRange.max,
        Math.random() * variation.sizeRange.max * 0.5,
        (Math.random() - 0.5) * variation.sizeRange.max
      );
      
      rock.position.copy(targetFoundation.position).add(offset);
    } else {
      rock.position.copy(basePosition);
    }
    
    rock.rotation.set(
      (Math.random() - 0.5) * Math.PI * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 0.3
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    RockFeatures.addSurfaceFeatures(rock, scaledVariation, shape);
    
    return rock;
  }

  private static createAccentRock(
    variation: RockVariation,
    basePosition: THREE.Vector3,
    existingRocks: THREE.Mesh[]
  ): THREE.Mesh {
    const shape = this.selectShapeForRole('accent');
    
    // Scale down significantly for accent rocks
    const scaledVariation = { ...variation };
    scaledVariation.sizeRange = {
      min: variation.sizeRange.min * 0.3,
      max: variation.sizeRange.max * 0.5
    };
    
    const geometry = RockGeometry.createRockGeometry(scaledVariation, shape);
    const material = RockMaterials.createRockMaterial(scaledVariation, shape);
    
    const rock = new THREE.Mesh(geometry, material);
    
    // Position accent rocks scattered around the cluster
    if (existingRocks.length > 0) {
      const targetRock = existingRocks[Math.floor(Math.random() * existingRocks.length)];
      const distance = variation.sizeRange.max * (0.8 + Math.random() * 0.6);
      const angle = Math.random() * Math.PI * 2;
      
      rock.position.set(
        targetRock.position.x + Math.cos(angle) * distance,
        targetRock.position.y + Math.random() * variation.sizeRange.max * 0.3,
        targetRock.position.z + Math.sin(angle) * distance
      );
    } else {
      rock.position.copy(basePosition);
    }
    
    rock.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  private static selectShapeForRole(role: 'foundation' | 'support' | 'accent'): string {
    const shapesByRole = {
      foundation: ['angular', 'weathered', 'stratified', 'fractured'],
      support: ['rounded', 'smooth', 'weathered'],
      accent: ['crystalline', 'jagged', 'angular', 'smooth']
    };
    
    const shapes = shapesByRole[role];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  private static addClusterFeatures(
    formation: ClusterFormation,
    variation: RockVariation,
    scene: THREE.Scene
  ): void {
    // Add sediment accumulation around the cluster
    this.addClusterSediment(formation, variation, scene);
    
    // Add vegetation growth in realistic spots
    this.addClusterVegetation(formation, variation, scene);
  }

  private static addClusterSediment(
    formation: ClusterFormation,
    variation: RockVariation,
    scene: THREE.Scene
  ): void {
    const allRocks = [...formation.foundationRocks, ...formation.supportRocks, ...formation.accentRocks];
    
    if (allRocks.length === 0) return;
    
    // Calculate cluster bounds
    const bounds = new THREE.Box3();
    allRocks.forEach(rock => bounds.expandByObject(rock));
    
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.z);
    
    // Create sediment ring
    const sedimentGeometry = new THREE.RingGeometry(
      maxDimension * 0.8,
      maxDimension * 1.5,
      16
    );
    
    const sedimentMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B7765,
      transparent: true,
      opacity: 0.4,
      roughness: 1.0
    });
    
    const sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterial);
    sediment.rotation.x = -Math.PI / 2;
    sediment.position.set(center.x, center.y - variation.sizeRange.max * 0.3, center.z);
    sediment.receiveShadow = true;
    
    scene.add(sediment);
  }

  private static addClusterVegetation(
    formation: ClusterFormation,
    variation: RockVariation,
    scene: THREE.Scene
  ): void {
    if (Math.random() > 0.4) return;
    
    const allRocks = [...formation.foundationRocks, ...formation.supportRocks];
    
    allRocks.forEach(rock => {
      if (Math.random() > 0.6) return;
      
      // Add small vegetation near rocks
      const vegCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < vegCount; i++) {
        const vegGeometry = new THREE.ConeGeometry(0.02, 0.1, 4);
        const vegMaterial = new THREE.MeshStandardMaterial({
          color: 0x228B22
        });
        
        const vegetation = new THREE.Mesh(vegGeometry, vegMaterial);
        
        const angle = Math.random() * Math.PI * 2;
        const distance = variation.sizeRange.max * (0.5 + Math.random() * 0.5);
        
        vegetation.position.set(
          rock.position.x + Math.cos(angle) * distance,
          rock.position.y - variation.sizeRange.max * 0.4,
          rock.position.z + Math.sin(angle) * distance
        );
        
        scene.add(vegetation);
      }
    });
  }
}
