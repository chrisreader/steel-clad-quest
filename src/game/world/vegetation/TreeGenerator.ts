import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TREE_CONFIG } from './VegetationConfig';
import { EnhancedTreeGenerator, TreeSpecies } from './EnhancedTreeGenerator';
import { BiomeType } from '../../vegetation/core/GrassConfig';

export class TreeGenerator {
  private enhancedGenerator: EnhancedTreeGenerator;
  private legacyModels: THREE.Object3D[] = [];

  constructor() {
    // Initialize enhanced tree generator
    this.enhancedGenerator = new EnhancedTreeGenerator();
    
    // Keep legacy models for backward compatibility
    this.loadLegacyTreeModels();
    
    console.log(`🌳 TreeGenerator: Enhanced system with 5 realistic species initialized`);
  }

  private loadLegacyTreeModels(): void {
    // Keep existing simple tree models for fallback
    for (let i = 0; i < 3; i++) {
      const treeHeight = TREE_CONFIG.height;
      const treeWidth = TREE_CONFIG.trunkRadius + Math.random() * 0.3;
      
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(treeWidth, treeWidth * TREE_CONFIG.trunkRadiusBottom, treeHeight, 12),
        new THREE.MeshLambertMaterial({ 
          color: TREE_CONFIG.trunkColor,
          map: TextureGenerator.createWoodTexture()
        })
      );
      trunk.position.y = treeHeight/2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      const tree = new THREE.Group();
      tree.add(trunk);
      
      // Legacy leaf layers
      for (let layer = 0; layer < TREE_CONFIG.layerCount; layer++) {
        const leavesGeometry = new THREE.ConeGeometry(2.5 - layer * 0.3, 4, 8);
        const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.5 + Math.random() * 0.3);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
          color: leavesColor,
          transparent: true,
          opacity: 0.9
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 7 + layer * 1.5;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);
      }
      
      this.legacyModels.push(tree);
    }
  }

  public getTreeModels(): THREE.Object3D[] {
    // Return enhanced models
    return this.enhancedGenerator.getTreeModels();
  }

  public createTree(position: THREE.Vector3, biomeType?: BiomeType): THREE.Object3D | null {
    // Use enhanced tree generation
    const enhancedTree = this.enhancedGenerator.createTree(position, biomeType);
    
    if (enhancedTree) {
      console.log(`🌳 Created enhanced tree at (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) for biome: ${biomeType || 'default'}`);
      return enhancedTree;
    }
    
    // Fallback to legacy if needed
    if (this.legacyModels.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * this.legacyModels.length);
    const model = this.legacyModels[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(scale, scale, scale);
    
    model.position.copy(position);
    
    console.log(`🌳 Created legacy fallback tree at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    return model;
  }

  public createSpecificTree(species: TreeSpecies, position: THREE.Vector3): THREE.Object3D | null {
    // Direct species creation for specific use cases
    const tree = this.enhancedGenerator.createTree(position);
    return tree;
  }

  public dispose(): void {
    // Dispose enhanced generator
    this.enhancedGenerator.dispose();
    
    // Dispose legacy models
    this.legacyModels.forEach(tree => {
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
    this.legacyModels.length = 0;
    
    console.log('🌳 TreeGenerator disposed');
  }
}
