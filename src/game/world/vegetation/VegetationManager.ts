
import * as THREE from 'three';
import { BushGenerator } from './BushGenerator';
import { TreeGenerator } from './TreeGenerator';
import { logger } from '../../core/Logger';
import { LOGGING_CONSTANTS } from '../../core/GameConstants';

export class VegetationManager {
  private scene: THREE.Scene;
  private bushGenerator: BushGenerator;
  private treeGenerator: TreeGenerator;
  private vegetationGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.bushGenerator = new BushGenerator();
    this.treeGenerator = new TreeGenerator();
    this.vegetationGroup = new THREE.Group();
    this.vegetationGroup.name = 'VegetationGroup';
    this.scene.add(this.vegetationGroup);
    
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, '🌿 VegetationManager initialized with enhanced bush system');
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    const bush = this.bushGenerator.createBush(position);
    if (bush) {
      this.vegetationGroup.add(bush);
      logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, `🌿 Bush created at position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    }
    return bush;
  }

  public createTree(position: THREE.Vector3): THREE.Object3D | null {
    const tree = this.treeGenerator.createTree(position);
    if (tree) {
      this.vegetationGroup.add(tree);
      logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, `🌲 Tree created at position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    }
    return tree;
  }

  public generateVegetationPatch(center: THREE.Vector3, radius: number, density: number = 0.3): void {
    const bushCount = Math.floor(density * radius * 2);
    const treeCount = Math.floor(density * radius * 0.5);
    
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, `🌿 Generating vegetation patch: ${bushCount} bushes, ${treeCount} trees`);
    
    // Generate bushes
    for (let i = 0; i < bushCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const position = new THREE.Vector3(
        center.x + Math.cos(angle) * distance,
        center.y,
        center.z + Math.sin(angle) * distance
      );
      this.createBush(position);
    }
    
    // Generate trees (less dense)
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const position = new THREE.Vector3(
        center.x + Math.cos(angle) * distance,
        center.y,
        center.z + Math.sin(angle) * distance
      );
      this.createTree(position);
    }
  }

  public dispose(): void {
    this.bushGenerator.dispose();
    this.scene.remove(this.vegetationGroup);
    logger.info(LOGGING_CONSTANTS.MODULES.BUILDING, '🌿 VegetationManager disposed');
  }
}
