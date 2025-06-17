
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
        
        // Fix lighting on tree materials
        this.enhanceTreeLighting(tree);
        
        this.treeModels.push(tree);
      }
    }
    
    console.log(`🌲 Created ${this.treeModels.length} realistic tree variations with enhanced lighting`);
  }

  private enhanceTreeLighting(tree: THREE.Object3D): void {
    tree.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          // Handle both single materials and material arrays
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
              // Brighten the material to improve visibility
              if (material.color) {
                // Increase the base color brightness for better lighting response
                material.color.multiplyScalar(1.4);
                
                // Ensure the material responds well to lighting
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.roughness = Math.min(material.roughness || 0.8, 0.9);
                  material.metalness = Math.max(material.metalness || 0, 0.1);
                }
              }
              
              // Enable shadows for better depth
              material.shadowSide = THREE.DoubleSide;
              material.needsUpdate = true;
            } else if (material instanceof THREE.MeshLambertMaterial) {
              // Convert Lambert materials to Standard for better lighting
              const standardMaterial = new THREE.MeshStandardMaterial({
                color: material.color.clone().multiplyScalar(1.4),
                map: material.map,
                roughness: 0.8,
                metalness: 0.1
              });
              
              child.material = standardMaterial;
              material.dispose(); // Clean up old material
            }
          });
        }
        
        // Enable shadow casting and receiving for better lighting interaction
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
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
        
        // Enhance lighting for this tree instance
        this.enhanceTreeLighting(tree);
        
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
      
      // Enhance lighting for this tree instance
      this.enhanceTreeLighting(tree);
      
      const scale = 0.8 + Math.random() * 0.4;
      tree.scale.set(scale, scale, scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      
      return tree;
    }
  }

  public createSpecificTree(species: TreeSpeciesType, position: THREE.Vector3): THREE.Object3D {
    const tree = this.realisticTreeGenerator.createTree(species, position);
    
    // Enhance lighting for this tree instance
    this.enhanceTreeLighting(tree);
    
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
