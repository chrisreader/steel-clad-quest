
import * as THREE from 'three';

interface FeatureData {
  meshes: THREE.Object3D[];
  regionKey: string;
}

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private generatedFeatures: Map<string, FeatureData> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🌲 [TerrainFeatureGenerator] Initialized');
  }

  public generateFeaturesForRegion(regionKey: string, centerX: number, centerZ: number): THREE.Object3D[] {
    if (this.generatedFeatures.has(regionKey)) {
      console.log(`🌲 [TerrainFeatureGenerator] Features already exist for region ${regionKey}`);
      return this.generatedFeatures.get(regionKey)!.meshes;
    }

    console.log(`🌲 [TerrainFeatureGenerator] Generating features for region ${regionKey} at (${centerX}, ${centerZ})`);
    
    const features: THREE.Object3D[] = [];
    
    // Generate trees
    const treeCount = 15 + Math.floor(Math.random() * 10);
    for (let i = 0; i < treeCount; i++) {
      const tree = this.createTree(centerX, centerZ);
      if (tree) {
        features.push(tree);
        this.scene.add(tree);
      }
    }
    
    // Generate rocks
    const rockCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < rockCount; i++) {
      const rock = this.createRock(centerX, centerZ);
      if (rock) {
        features.push(rock);
        this.scene.add(rock);
      }
    }
    
    // Generate bushes
    const bushCount = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < bushCount; i++) {
      const bush = this.createBush(centerX, centerZ);
      if (bush) {
        features.push(bush);
        this.scene.add(bush);
      }
    }

    const featureData: FeatureData = {
      meshes: features,
      regionKey
    };
    
    this.generatedFeatures.set(regionKey, featureData);
    
    console.log(`🌲 [TerrainFeatureGenerator] Generated ${features.length} features for region ${regionKey}`);
    return features;
  }

  private createTree(centerX: number, centerZ: number): THREE.Group | null {
    const tree = new THREE.Group();
    
    // Random position within the region
    const offsetX = (Math.random() - 0.5) * 800;
    const offsetZ = (Math.random() - 0.5) * 800;
    const x = centerX + offsetX;
    const z = centerZ + offsetZ;
    
    // Skip if too close to center (tavern area)
    if (Math.abs(x) < 15 && Math.abs(z) < 15) {
      return null;
    }
    
    // Tree trunk
    const trunkHeight = 6 + Math.random() * 4;
    const trunkRadius = 0.3 + Math.random() * 0.3;
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(0.08, 0.6, 0.3 + Math.random() * 0.2)
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    // Tree leaves (multiple layers for realism)
    for (let layer = 0; layer < 3; layer++) {
      const leavesRadius = 2.5 - layer * 0.4 + Math.random() * 0.5;
      const leavesGeometry = new THREE.ConeGeometry(leavesRadius, 3 + Math.random(), 8);
      const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.35 + Math.random() * 0.3);
      const leavesMaterial = new THREE.MeshLambertMaterial({ 
        color: leavesColor,
        transparent: true,
        opacity: 0.9
      });
      
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = trunkHeight - 1 + layer * 1.5;
      leaves.rotation.y = Math.random() * Math.PI * 2;
      leaves.castShadow = true;
      leaves.receiveShadow = true;
      tree.add(leaves);
    }
    
    tree.position.set(x, 0, z);
    
    // Add slight random rotation
    tree.rotation.y = Math.random() * Math.PI * 2;
    
    return tree;
  }

  private createRock(centerX: number, centerZ: number): THREE.Mesh | null {
    // Random position within the region
    const offsetX = (Math.random() - 0.5) * 900;
    const offsetZ = (Math.random() - 0.5) * 900;
    const x = centerX + offsetX;
    const z = centerZ + offsetZ;
    
    // Skip if too close to center (tavern area)
    if (Math.abs(x) < 12 && Math.abs(z) < 12) {
      return null;
    }
    
    const rockSize = 0.5 + Math.random() * 1.0;
    const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
    
    // Add some deformation for natural look
    const vertices = rockGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      const scale = 0.9 + Math.random() * 0.2;
      vertices[i] *= scale;
      vertices[i + 1] *= scale;
      vertices[i + 2] *= scale;
    }
    rockGeometry.attributes.position.needsUpdate = true;
    rockGeometry.computeVertexNormals();
    
    const rockMaterial = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(0, 0, 0.4 + Math.random() * 0.3)
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, rockSize / 2, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  private createBush(centerX: number, centerZ: number): THREE.Mesh | null {
    // Random position within the region
    const offsetX = (Math.random() - 0.5) * 850;
    const offsetZ = (Math.random() - 0.5) * 850;
    const x = centerX + offsetX;
    const z = centerZ + offsetZ;
    
    // Skip if too close to center (tavern area)
    if (Math.abs(x) < 14 && Math.abs(z) < 14) {
      return null;
    }
    
    const bushSize = 0.6 + Math.random() * 0.4;
    const bushGeometry = new THREE.SphereGeometry(bushSize, 8, 6);
    const bushMaterial = new THREE.MeshLambertMaterial({ 
      color: new THREE.Color().setHSL(0.25, 0.6, 0.4 + Math.random() * 0.3)
    });
    
    const bush = new THREE.Mesh(bushGeometry, bushMaterial);
    bush.position.set(x, bushSize * 0.7, z);
    bush.scale.y = 0.7 + Math.random() * 0.3;
    bush.castShadow = true;
    bush.receiveShadow = true;
    
    return bush;
  }

  public removeFeaturesForRegion(regionKey: string): void {
    const featureData = this.generatedFeatures.get(regionKey);
    if (featureData) {
      for (const mesh of featureData.meshes) {
        this.scene.remove(mesh);
        
        // Dispose geometry and materials
        if (mesh instanceof THREE.Mesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        } else if (mesh instanceof THREE.Group) {
          mesh.traverse((child) => {
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
        }
      }
      
      this.generatedFeatures.delete(regionKey);
      console.log(`🌲 [TerrainFeatureGenerator] Removed features for region ${regionKey}`);
    }
  }

  public dispose(): void {
    for (const regionKey of this.generatedFeatures.keys()) {
      this.removeFeaturesForRegion(regionKey);
    }
    console.log('🌲 [TerrainFeatureGenerator] Disposed all features');
  }
}
