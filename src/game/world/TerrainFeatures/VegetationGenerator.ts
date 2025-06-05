
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';

export class VegetationGenerator {
  private treeModels: THREE.Object3D[] = [];
  private bushModels: THREE.Object3D[] = [];

  constructor() {
    this.createTreeModels();
    this.createBushModels();
  }

  private createTreeModels(): void {
    for (let i = 0; i < 3; i++) {
      const treeHeight = 8;
      const treeWidth = 0.3 + Math.random() * 0.3;
      
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(treeWidth, treeWidth * 1.2, treeHeight, 12),
        new THREE.MeshLambertMaterial({ 
          color: 0x8B7355,
          map: TextureGenerator.createWoodTexture()
        })
      );
      trunk.position.y = treeHeight/2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      
      const tree = new THREE.Group();
      tree.add(trunk);
      
      // Tree leaves (3 layers)
      for (let layer = 0; layer < 3; layer++) {
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
      
      this.treeModels.push(tree);
    }
  }

  private createBushModels(): void {
    for (let i = 0; i < 4; i++) {
      const bushGroup = new THREE.Group();
      const mainBushSize = 0.5 + Math.random() * 0.4;
      const clusterCount = 3 + Math.floor(Math.random() * 4);
      
      const bushColors = [
        new THREE.Color().setHSL(0.25, 0.6, 0.4),
        new THREE.Color().setHSL(0.3, 0.7, 0.5),
        new THREE.Color().setHSL(0.2, 0.5, 0.45),
        new THREE.Color().setHSL(0.28, 0.8, 0.4)
      ];
      
      const bushMaterial = new THREE.MeshStandardMaterial({
        color: bushColors[i % bushColors.length],
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
      
      for (let j = 0; j < clusterCount; j++) {
        const clusterSize = mainBushSize * (0.6 + Math.random() * 0.6);
        const cluster = new THREE.Mesh(
          new THREE.SphereGeometry(clusterSize, 8, 6),
          bushMaterial.clone()
        );
        
        const angle = (j / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = mainBushSize * (0.2 + Math.random() * 0.3);
        cluster.position.set(
          Math.cos(angle) * distance,
          0.3 + Math.random() * 0.2,
          Math.sin(angle) * distance
        );
        
        cluster.scale.set(
          0.8 + Math.random() * 0.4,
          0.6 + Math.random() * 0.3,
          0.8 + Math.random() * 0.4
        );
        
        cluster.castShadow = true;
        cluster.receiveShadow = true;
        bushGroup.add(cluster);
      }
      
      this.bushModels.push(bushGroup);
    }
  }

  public spawnTree(position: THREE.Vector3): THREE.Object3D {
    const modelIndex = Math.floor(Math.random() * this.treeModels.length);
    const tree = this.treeModels[modelIndex].clone();
    
    tree.position.copy(position);
    tree.rotation.y = Math.random() * Math.PI * 2;
    
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale, scale);
    
    return tree;
  }

  public spawnBush(position: THREE.Vector3): THREE.Object3D {
    const modelIndex = Math.floor(Math.random() * this.bushModels.length);
    const bush = this.bushModels[modelIndex].clone();
    
    bush.position.copy(position);
    bush.rotation.y = Math.random() * Math.PI * 2;
    
    const scale = 0.8 + Math.random() * 0.4;
    bush.scale.set(scale, scale, scale);
    
    return bush;
  }

  public dispose(): void {
    // Clean up models
    [...this.treeModels, ...this.bushModels].forEach(model => {
      model.traverse(child => {
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
    this.bushModels.length = 0;
  }
}
