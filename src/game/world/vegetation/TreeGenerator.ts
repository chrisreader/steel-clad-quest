
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TREE_CONFIG } from './VegetationConfig';
import { RealisticTreeGenerator } from './RealisticTreeGenerator';
import { ForestBiomeManager, ForestBiomeType } from './ForestBiomeManager';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';

export class TreeGenerator {
  private treeModels: THREE.Object3D[] = [];
  private realisticTreeGenerator: RealisticTreeGenerator;

  constructor() {
    this.realisticTreeGenerator = new RealisticTreeGenerator();
    this.loadTreeModels();
  }

  private loadTreeModels(): void {
    // Create 3 variations of each tree species for diversity
    const allSpecies = TreeSpeciesManager.getAllSpecies();
    
    for (const species of allSpecies) {
      for (let variation = 0; variation < 3; variation++) {
        const tree = this.realisticTreeGenerator.createTree(
          species, 
          new THREE.Vector3(0, 0, 0)
        );
        this.treeModels.push(tree);
      }
    }
    
    console.log(`🌲 Created ${this.treeModels.length} realistic tree variations across ${allSpecies.length} species`);
  }

  public getTreeModels(): THREE.Object3D[] {
    return this.treeModels;
  }

  public createTree(position: THREE.Vector3): THREE.Object3D | null {
    // Check for forest biome at this position
    const forestBiome = ForestBiomeManager.getForestBiomeAtPosition(position);
    
    if (forestBiome) {
      // Use forest biome tree selection
      if (ForestBiomeManager.shouldSpawnTree(forestBiome, position)) {
        const species = ForestBiomeManager.selectTreeSpecies(forestBiome);
        const tree = this.realisticTreeGenerator.createTree(species, position);
        
        // Add slight random variations
        const scale = 0.8 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        return tree;
      }
      return null;
    } else {
      // Fallback to original tree generation for non-forest areas
      if (this.treeModels.length === 0) return null;
      
      // Use mixed species for scattered trees in grass biomes
      const species = Math.random() < 0.6 ? TreeSpeciesType.OAK : 
                     Math.random() < 0.8 ? TreeSpeciesType.BIRCH : TreeSpeciesType.DEAD;
      
      const tree = this.realisticTreeGenerator.createTree(species, position);
      
      const scale = 0.8 + Math.random() * 0.4;
      tree.scale.set(scale, scale, scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      
      return tree;
    }
  }

  public createSpecificTree(species: TreeSpeciesType, position: THREE.Vector3): THREE.Object3D {
    const tree = this.realisticTreeGenerator.createTree(species, position);
    
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    
    return tree;
  }

  public dispose(): void {
    this.treeModels.forEach(tree => {
      tree.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.treeModels.length = 0;
    
    if (this.realisticTreeGenerator) {
      this.realisticTreeGenerator.dispose();
    }
  }
}
