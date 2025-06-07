import * as THREE from 'three';
import { BushSpeciesConfig, BushSpeciesManager } from './BushSpecies';
import { SmallBushSpeciesConfig, SmallBushSpeciesManager } from './SmallBushSpecies';
import { NaturalGrowthSimulator } from './NaturalGrowthSimulator';

export interface BushCluster {
  centerPosition: THREE.Vector3;
  bushes: Array<{
    position: THREE.Vector3;
    species: BushSpeciesConfig | SmallBushSpeciesConfig;
    scale: number;
    isSmall: boolean;
  }>;
  clusterType: 'family' | 'mixed' | 'tree_base' | 'rock_side';
}

export class BushClusterGenerator {
  /**
   * Creates a natural cluster of bushes around a center point
   */
  static createBushCluster(
    centerPosition: THREE.Vector3,
    clusterType: 'family' | 'mixed' | 'tree_base' | 'rock_side' = 'mixed',
    maxRadius: number = 3.0
  ): BushCluster {
    const cluster: BushCluster = {
      centerPosition: centerPosition.clone(),
      bushes: [],
      clusterType
    };

    switch (clusterType) {
      case 'family':
        this.createFamilyCluster(cluster, maxRadius);
        break;
      case 'tree_base':
        this.createTreeBaseCluster(cluster, maxRadius);
        break;
      case 'rock_side':
        this.createRockSideCluster(cluster, maxRadius);
        break;
      default:
        this.createMixedCluster(cluster, maxRadius);
    }

    return cluster;
  }

  /**
   * Creates a cluster where bushes are the same species (family grouping)
   */
  private static createFamilyCluster(cluster: BushCluster, maxRadius: number): void {
    const species = BushSpeciesManager.getRandomSpecies();
    const bushCount = 3 + Math.floor(Math.random() * 5); // 3-7 bushes
    
    // One "mother bush" at the center, larger than others
    cluster.bushes.push({
      position: cluster.centerPosition.clone(),
      species,
      scale: 1.1 + Math.random() * 0.3, // 1.1-1.4 scale
      isSmall: false
    });

    // Smaller "offspring" bushes around the mother bush
    for (let i = 0; i < bushCount - 1; i++) {
      const angle = (i / (bushCount - 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 1.0 + Math.random() * (maxRadius - 1.0);
      
      const position = new THREE.Vector3(
        cluster.centerPosition.x + Math.cos(angle) * distance,
        cluster.centerPosition.y,
        cluster.centerPosition.z + Math.sin(angle) * distance
      );

      cluster.bushes.push({
        position,
        species,
        scale: 0.6 + Math.random() * 0.4, // 0.6-1.0 scale (smaller than mother)
        isSmall: false
      });
    }
  }

  /**
   * Creates small bushes clustered around tree bases
   */
  private static createTreeBaseCluster(cluster: BushCluster, maxRadius: number): void {
    const species = SmallBushSpeciesManager.getRandomSmallSpecies('tree_base');
    const bushCount = species.clusterSize[0] + 
      Math.floor(Math.random() * (species.clusterSize[1] - species.clusterSize[0] + 1));

    for (let i = 0; i < bushCount; i++) {
      // Cluster around the tree base with some randomness
      const angle = Math.random() * Math.PI * 2;
      const distance = species.spacingRange[0] + 
        Math.random() * (species.spacingRange[1] - species.spacingRange[0]);
      
      // Keep bushes within tree radius but not too close to trunk
      const actualDistance = Math.min(distance, maxRadius * 0.8);
      
      const position = new THREE.Vector3(
        cluster.centerPosition.x + Math.cos(angle) * actualDistance,
        cluster.centerPosition.y,
        cluster.centerPosition.z + Math.sin(angle) * actualDistance
      );

      cluster.bushes.push({
        position,
        species,
        scale: 0.8 + Math.random() * 0.4, // 0.8-1.2 scale
        isSmall: true
      });
    }
  }

  /**
   * Creates bushes that hug rock formations
   */
  private static createRockSideCluster(cluster: BushCluster, maxRadius: number): void {
    const species = SmallBushSpeciesManager.getRandomSmallSpecies('rock_side');
    const bushCount = species.clusterSize[0] + 
      Math.floor(Math.random() * (species.clusterSize[1] - species.clusterSize[0] + 1));

    for (let i = 0; i < bushCount; i++) {
      // Position bushes at the "base" of rocks, simulating protection
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.3 + Math.random() * 0.8; // Close to rock
      
      const position = new THREE.Vector3(
        cluster.centerPosition.x + Math.cos(angle) * distance,
        cluster.centerPosition.y,
        cluster.centerPosition.z + Math.sin(angle) * distance
      );

      cluster.bushes.push({
        position,
        species,
        scale: 0.7 + Math.random() * 0.5, // 0.7-1.2 scale
        isSmall: true
      });
    }
  }

  /**
   * Creates a mixed cluster with different species
   */
  private static createMixedCluster(cluster: BushCluster, maxRadius: number): void {
    const bushCount = 4 + Math.floor(Math.random() * 6); // 4-9 bushes
    
    for (let i = 0; i < bushCount; i++) {
      const useSmallBush = Math.random() < 0.4; // 40% chance for small bush
      const species = useSmallBush ? 
        SmallBushSpeciesManager.getRandomSmallSpecies('open_ground') :
        BushSpeciesManager.getRandomSpecies();

      const angle = Math.random() * Math.PI * 2;
      const distance = 0.5 + Math.random() * (maxRadius - 0.5);
      
      const position = new THREE.Vector3(
        cluster.centerPosition.x + Math.cos(angle) * distance,
        cluster.centerPosition.y,
        cluster.centerPosition.z + Math.sin(angle) * distance
      );

      cluster.bushes.push({
        position,
        species,
        scale: 0.8 + Math.random() * 0.4, // 0.8-1.2 scale
        isSmall: useSmallBush
      });
    }
  }

  /**
   * Creates natural clearings by removing bushes from certain areas
   */
  static createClearing(
    clusters: BushCluster[],
    clearingCenter: THREE.Vector3,
    clearingRadius: number
  ): BushCluster[] {
    return clusters.map(cluster => ({
      ...cluster,
      bushes: cluster.bushes.filter(bush => 
        bush.position.distanceTo(clearingCenter) > clearingRadius
      )
    })).filter(cluster => cluster.bushes.length > 0);
  }

  /**
   * Applies environmental effects to cluster positioning
   */
  static applyEnvironmentalEffects(cluster: BushCluster): void {
    cluster.bushes.forEach(bush => {
      const environment = NaturalGrowthSimulator.generateEnvironment(bush.position);
      const modifiers = NaturalGrowthSimulator.simulateGrowth(
        bush.species as any, 
        bush.position, 
        environment
      );

      // Apply size modifications based on environment
      bush.scale *= modifiers.sizeMultiplier;
      
      // Apply positional adjustments for realistic growth
      if (modifiers.leanDirection && modifiers.leanAngle > 0) {
        const leanOffset = modifiers.leanDirection.clone()
          .multiplyScalar(modifiers.leanAngle * 0.5);
        bush.position.add(leanOffset);
      }
    });
  }
}
