import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TREE_CONFIG } from './VegetationConfig';

export class TreeGenerator {
  private treeModels: THREE.Object3D[] = [];

  constructor() {
    this.loadTreeModels();
  }

  private loadTreeModels(): void {
    // Tree models (3 variations) - Keep existing tree graphics
    for (let i = 0; i < 3; i++) {
      const treeHeight = TREE_CONFIG.height;
      const treeWidth = TREE_CONFIG.trunkRadius + Math.random() * 0.3; // 0.3-0.6 radius
      
      // Tree trunk (larger than before)
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
      
      // Tree leaves (3 layers like original)
      for (let layer = 0; layer < TREE_CONFIG.layerCount; layer++) {
        const leavesGeometry = new THREE.ConeGeometry(2.5 - layer * 0.3, 4, 8);
        const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.5 + Math.random() * 0.3);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
          color: leavesColor,
          transparent: true,
          opacity: 0.9
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 7 + layer * 1.5; // Heights: 7, 8.5, 10
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);
      }
      
      this.treeModels.push(tree);
    }
    
    console.log(`🌲 Created ${this.treeModels.length} tree variations`);
  }

  public getTreeModels(): THREE.Object3D[] {
    return this.treeModels;
  }

  public createTree(position: THREE.Vector3): THREE.Object3D | null {
    if (this.treeModels.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * this.treeModels.length);
    const model = this.treeModels[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(scale, scale, scale);
    
    model.position.copy(position);
    
    return model;
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
  }
}
