
import * as THREE from 'three';
import { BUSH_CONFIG } from './VegetationConfig';

export class BushGenerator {
  private bushModels: THREE.Object3D[] = [];

  constructor() {
    this.loadBushModels();
  }

  private loadBushModels(): void {
    // IMPROVED Bush models (4 variations with organic shapes and better materials)
    for (let i = 0; i < 4; i++) {
      const bushGroup = new THREE.Group();
      const bushType = i % 2;
      
      // Create bush with multiple organic clusters
      const mainBushSize = BUSH_CONFIG.sizeRange[0] + Math.random() * (BUSH_CONFIG.sizeRange[1] - BUSH_CONFIG.sizeRange[0]);
      const clusterCount = BUSH_CONFIG.clusterCountRange[0] + Math.floor(Math.random() * (BUSH_CONFIG.clusterCountRange[1] - BUSH_CONFIG.clusterCountRange[0] + 1));
      
      const bushMaterial = new THREE.MeshStandardMaterial({
        color: BUSH_CONFIG.colors[i % BUSH_CONFIG.colors.length],
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      });
      
      // Create organic bush shape with multiple spheres
      for (let j = 0; j < clusterCount; j++) {
        const clusterSize = mainBushSize * (0.6 + Math.random() * 0.6);
        const cluster = new THREE.Mesh(
          new THREE.SphereGeometry(clusterSize, 8, 6),
          bushMaterial.clone()
        );
        
        // Position clusters organically
        const angle = (j / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = mainBushSize * (0.2 + Math.random() * 0.3);
        cluster.position.set(
          Math.cos(angle) * distance,
          0.3 + Math.random() * 0.2,
          Math.sin(angle) * distance
        );
        
        // Deform clusters for organic look
        cluster.scale.set(
          0.8 + Math.random() * 0.4,
          0.6 + Math.random() * 0.3,
          0.8 + Math.random() * 0.4
        );
        
        cluster.castShadow = true;
        cluster.receiveShadow = true;
        bushGroup.add(cluster);
      }
      
      // Add simple stem/branch structure
      if (Math.random() < BUSH_CONFIG.stemChance) {
        this.addStem(bushGroup, mainBushSize);
      }
      
      // Add berries or flowers
      if (Math.random() < BUSH_CONFIG.berryChance) {
        this.addBerries(bushGroup, mainBushSize);
      }
      
      this.bushModels.push(bushGroup);
    }
    
    console.log(`🌿 Created ${this.bushModels.length} bush variations`);
  }

  private addStem(bushGroup: THREE.Group, mainBushSize: number): void {
    const stemHeight = mainBushSize * 0.8;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, stemHeight, 6),
      new THREE.MeshStandardMaterial({
        color: 0x4A4A2A,
        roughness: 0.9,
        metalness: 0.0
      })
    );
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    stem.receiveShadow = true;
    bushGroup.add(stem);
  }

  private addBerries(bushGroup: THREE.Group, mainBushSize: number): void {
    const berryCount = 3 + Math.floor(Math.random() * 5);
    for (let k = 0; k < berryCount; k++) {
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 4, 3),
        new THREE.MeshStandardMaterial({
          color: Math.random() < 0.5 ? 0xFF6B6B : 0x4ECDC4, // Red berries or blue flowers
          roughness: 0.3,
          metalness: 0.0
        })
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = mainBushSize * (0.7 + Math.random() * 0.3);
      berry.position.set(
        Math.cos(angle) * distance,
        0.5 + Math.random() * 0.3,
        Math.sin(angle) * distance
      );
      bushGroup.add(berry);
    }
  }

  public getBushModels(): THREE.Object3D[] {
    return this.bushModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    if (this.bushModels.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * this.bushModels.length);
    const model = this.bushModels[modelIndex].clone();
    
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(scale, scale, scale);
    
    model.position.copy(position);
    
    return model;
  }

  public dispose(): void {
    this.bushModels.forEach(bush => {
      bush.traverse(child => {
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
    this.bushModels.length = 0;
  }
}
