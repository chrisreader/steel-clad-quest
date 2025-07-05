
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TREE_CONFIG } from './VegetationConfig';
import { RealisticTreeGenerator } from './RealisticTreeGenerator';
import { ForestBiomeManager, ForestBiomeType } from './ForestBiomeManager';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';
import { BillboardManager } from '../../engine/BillboardManager';

export class TreeGenerator {
  private treeModels: THREE.Object3D[] = [];
  private realisticTreeGenerator: RealisticTreeGenerator;
  private billboardManager: BillboardManager | null = null;

  constructor() {
    this.realisticTreeGenerator = new RealisticTreeGenerator();
    this.loadTreeModels();
  }

  public setBillboardManager(billboardManager: BillboardManager): void {
    this.billboardManager = billboardManager;
    console.log('🌲 [TreeGenerator] Billboard manager integrated for smart LOD');
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
        
        // Register with billboard manager for smart LOD
        if (this.billboardManager) {
          this.billboardManager.registerTree(tree, species);
        }
        
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
      
      // Register with billboard manager for smart LOD
      if (this.billboardManager) {
        this.billboardManager.registerTree(tree, species);
      }
      
      return tree;
    }
  }

  public createSpecificTree(species: TreeSpeciesType, position: THREE.Vector3): THREE.Object3D {
    const tree = this.realisticTreeGenerator.createTree(species, position);
    
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale, scale);
    tree.rotation.y = Math.random() * Math.PI * 2;
    
    // Register with billboard manager for smart LOD
    if (this.billboardManager) {
      this.billboardManager.registerTree(tree, species);
    }
    
    return tree;
  }

  /**
   * Update all tree foliage materials for day/night lighting
   */
  public updateDayNightLighting(dayFactor: number, nightFactor: number): void {
    this.realisticTreeGenerator.updateDayNightLighting(dayFactor, nightFactor);
  }

  /**
   * Get all active foliage materials for external updates
   */
  public getFoliageMaterials(): Set<THREE.MeshStandardMaterial> {
    return this.realisticTreeGenerator.getFoliageMaterials();
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
