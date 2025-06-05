
import * as THREE from 'three';
import { RockVariation, RockShape, ROCK_VARIATIONS, ROCK_SHAPES } from './RockVariations';
import { RockMaterialPool } from './RockMaterials';
import { RockGeometryPool } from './RockGeometry';

export class RockGenerator {
  private materialPool: RockMaterialPool;
  private geometryPool: RockGeometryPool;
  private largeFormations: THREE.Vector3[] = [];
  private minimumLargeRockDistance: number = 75; // Reduced from 150

  constructor() {
    this.materialPool = RockMaterialPool.getInstance();
    this.geometryPool = RockGeometryPool.getInstance();
  }

  public generateRock(position: THREE.Vector3, forceVariation?: RockVariation): THREE.Object3D | null {
    const variation = forceVariation || this.selectRockVariation();
    
    console.log(`🪨 [RockGenerator] Generating ${variation.category} rock at position:`, position);
    
    // Check distance for large formations
    if ((variation.category === 'large' || variation.category === 'massive') && 
        this.isTooCloseToLargeFormation(position)) {
      console.log(`🚫 [RockGenerator] ${variation.category} rock rejected - too close to existing large formation`);
      return null;
    }

    if (variation.isCluster) {
      console.log(`🏔️ [RockGenerator] Creating ${variation.category} cluster with ${variation.clusterSize?.[0]}-${variation.clusterSize?.[1]} rocks`);
      return this.createRockCluster(variation, position);
    } else {
      console.log(`🪨 [RockGenerator] Creating single ${variation.category} rock`);
      return this.createSingleRock(variation, position);
    }
  }

  private selectRockVariation(): RockVariation {
    const totalWeight = ROCK_VARIATIONS.reduce((sum, variation) => sum + variation.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const variation of ROCK_VARIATIONS) {
      if (random < variation.weight) {
        console.log(`🎲 [RockGenerator] Selected ${variation.category} rock (weight: ${variation.weight}/${totalWeight})`);
        return variation;
      }
      random -= variation.weight;
    }
    
    return ROCK_VARIATIONS[2]; // Default to medium
  }

  private createSingleRock(variation: RockVariation, position: THREE.Vector3): THREE.Object3D {
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    const rockShape = ROCK_SHAPES[Math.floor(Math.random() * ROCK_SHAPES.length)];
    const geometry = this.geometryPool.createRockGeometry(rockShape, rockSize);
    const material = this.materialPool.getMaterial(variation.category, rockShape.weatheringLevel);
    
    const rock = new THREE.Mesh(geometry, material);
    rock.position.copy(position);
    rock.position.y += rockSize * 0.1; // Slight embedding
    
    // Random rotation
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    
    // Scale variation
    const scaleVariation = 0.8 + Math.random() * 0.4;
    rock.scale.set(scaleVariation, scaleVariation, scaleVariation);
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  private createRockCluster(variation: RockVariation, position: THREE.Vector3): THREE.Object3D {
    const group = new THREE.Group();
    const [minClusterSize, maxClusterSize] = variation.clusterSize || [3, 5];
    const clusterCount = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    console.log(`🏔️ [RockGenerator] Creating cluster of ${clusterCount} rocks for ${variation.category}`);
    
    // Create main rock (largest)
    const mainRock = this.createSingleRock(variation, new THREE.Vector3(0, 0, 0));
    group.add(mainRock);
    
    // Add supporting rocks
    for (let i = 1; i < clusterCount; i++) {
      const subVariation: RockVariation = {
        ...variation,
        sizeRange: [variation.sizeRange[0] * 0.5, variation.sizeRange[1] * 0.8],
        isCluster: false
      };
      
      const angle = (i / (clusterCount - 1)) * Math.PI * 2;
      const distance = variation.sizeRange[1] * (0.3 + Math.random() * 0.4);
      const subPosition = new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      const subRock = this.createSingleRock(subVariation, subPosition);
      group.add(subRock);
    }
    
    group.position.copy(position);
    
    // Track large formations
    if (variation.category === 'large' || variation.category === 'massive') {
      this.largeFormations.push(position.clone());
      console.log(`📍 [RockGenerator] Registered ${variation.category} formation at:`, position, `(total formations: ${this.largeFormations.length})`);
    }
    
    return group;
  }

  private isTooCloseToLargeFormation(position: THREE.Vector3): boolean {
    const tooClose = this.largeFormations.some(formation => {
      const distance = formation.distanceTo(position);
      return distance < this.minimumLargeRockDistance;
    });
    
    if (tooClose) {
      console.log(`🚫 [RockGenerator] Position too close to existing large formation (min distance: ${this.minimumLargeRockDistance})`);
    }
    
    return tooClose;
  }

  public clearLargeFormations(): void {
    this.largeFormations.length = 0;
  }

  public dispose(): void {
    this.materialPool.dispose();
    this.geometryPool.dispose();
    this.clearLargeFormations();
  }
}
