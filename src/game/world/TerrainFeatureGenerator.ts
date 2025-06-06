import * as THREE from 'three';
import { Noise } from 'noisejs';

interface TerrainFeature {
  type: 'rock' | 'cluster' | 'structure';
  position: THREE.Vector3;
  size: number;
  meshes: THREE.Mesh[];
}

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private noise: Noise;
  private features: TerrainFeature[] = [];
  private materials: {
    rock: THREE.MeshLambertMaterial[];
    sediment: THREE.MeshLambertMaterial[];
    debris: THREE.MeshLambertMaterial[];
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.noise = new Noise(Math.random());
    this.materials = this.createMaterials();
  }

  private createMaterials() {
    // Enhanced rock materials with more variation
    const rockMaterials = [
      new THREE.MeshLambertMaterial({ color: 0x8B7D6B }),
      new THREE.MeshLambertMaterial({ color: 0x9A8B73 }),
      new THREE.MeshLambertMaterial({ color: 0x7A6F5D }),
      new THREE.MeshLambertMaterial({ color: 0x6B5B4F }),
      new THREE.MeshLambertMaterial({ color: 0x958679 })
    ];

    // Beige weathered sediment materials
    const sedimentMaterials = [
      new THREE.MeshLambertMaterial({ color: 0xC4A484 }), // Light beige
      new THREE.MeshLambertMaterial({ color: 0xB8956A }), // Medium beige
      new THREE.MeshLambertMaterial({ color: 0xA0855B }), // Darker beige
      new THREE.MeshLambertMaterial({ color: 0xD4B896 }), // Very light beige
      new THREE.MeshLambertMaterial({ color: 0x9C7F5F })  // Brown-beige
    ];

    // Weathered debris materials with beige tones
    const debrisMaterials = [
      new THREE.MeshLambertMaterial({ color: 0xC4A484 }), // Light weathered
      new THREE.MeshLambertMaterial({ color: 0xB8956A }), // Medium weathered
      new THREE.MeshLambertMaterial({ color: 0xA0855B }), // Dark weathered
      new THREE.MeshLambertMaterial({ color: 0xD0B088 }), // Pale weathered
      new THREE.MeshLambertMaterial({ color: 0x8B7D6B })  // Gray-beige weathered
    ];

    return {
      rock: rockMaterials,
      sediment: sedimentMaterials,
      debris: debrisMaterials
    };
  }

  public generateFeaturesForRegion(centerX: number, centerZ: number, size: number): void {
    const featureCount = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < featureCount; i++) {
      const x = centerX + (Math.random() - 0.5) * size * 0.8;
      const z = centerZ + (Math.random() - 0.5) * size * 0.8;
      
      const featureSize = 1 + Math.random() * 5;
      const rockCount = Math.floor(3 + Math.random() * 7);
      
      const feature = this.createRockCluster(x, z, featureSize, rockCount);
      this.features.push(feature);
    }
  }

  public cleanupFeaturesForRegion(centerX: number, centerZ: number, size: number): void {
    const halfSize = size / 2;
    const minX = centerX - halfSize;
    const maxX = centerX + halfSize;
    const minZ = centerZ - halfSize;
    const maxZ = centerZ + halfSize;
    
    const featuresToRemove: TerrainFeature[] = [];
    
    for (const feature of this.features) {
      const pos = feature.position;
      if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ) {
        featuresToRemove.push(feature);
      }
    }
    
    for (const feature of featuresToRemove) {
      this.removeFeature(feature);
      const index = this.features.indexOf(feature);
      if (index !== -1) {
        this.features.splice(index, 1);
      }
    }
  }

  private createSingleRock(size: number, complexity: number = 0.3): THREE.Mesh {
    const geometry = new THREE.IcosahedronGeometry(size, 1);
    const vertices = geometry.attributes.position;
    
    // Deform the geometry for a more natural rock look
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const y = vertices.getY(i);
      const z = vertices.getZ(i);
      
      const noise = this.noise.perlin3(x * complexity, y * complexity, z * complexity) * 0.3;
      
      vertices.setX(i, x * (1 + noise));
      vertices.setY(i, y * (1 + noise));
      vertices.setZ(i, z * (1 + noise));
    }
    
    geometry.computeVertexNormals();
    
    const material = this.materials.rock[Math.floor(Math.random() * this.materials.rock.length)];
    return new THREE.Mesh(geometry, material);
  }

  private createRockCluster(
    centerX: number,
    centerZ: number,
    baseSize: number,
    rockCount: number
  ): TerrainFeature {
    const meshes: THREE.Mesh[] = [];
    const clusterPosition = new THREE.Vector3(centerX, 0, centerZ);

    // Main cluster rocks
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.random() * baseSize * 0.8;
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      
      const rockSize = baseSize * (0.3 + Math.random() * 0.7) * (1 - distance / (baseSize * 0.8) * 0.3);
      const rock = this.createSingleRock(rockSize);
      
      const y = this.getGroundHeight(x, z) + rockSize * 0.3;
      rock.position.set(x, y, z);
      
      meshes.push(rock);
      this.scene.add(rock);
    }

    const feature: TerrainFeature = {
      type: 'cluster',
      position: clusterPosition,
      size: baseSize,
      meshes: meshes
    };

    // Add environmental details for large formations
    if (baseSize > 4) {
      this.addSedimentAccumulation(centerX, centerZ, baseSize, feature);
      this.addDebrisField(centerX, centerZ, baseSize, feature);
      this.addClusteredTinyRocks(centerX, centerZ, baseSize, feature);
      this.addVegetationToCluster(centerX, centerZ, baseSize, feature);
      this.addWeatheringStains(centerX, centerZ, baseSize, feature);
    }

    return feature;
  }

  private addSedimentAccumulation(centerX: number, centerZ: number, baseSize: number, feature: TerrainFeature): void {
    const sedimentCount = 6 + Math.floor(Math.random() * 9); // 6-14 particles
    
    for (let i = 0; i < sedimentCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * 0.6 + Math.random() * baseSize * 0.8;
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      
      // Create varied sediment geometries
      let geometry: THREE.BufferGeometry;
      const sedimentType = Math.random();
      
      if (sedimentType < 0.4) {
        // Flat sediment patches using flattened cylinders
        geometry = new THREE.CylinderGeometry(
          0.1 + Math.random() * 0.15, // top radius
          0.08 + Math.random() * 0.12, // bottom radius
          0.02 + Math.random() * 0.03, // height (very flat)
          6 + Math.floor(Math.random() * 6) // segments
        );
      } else if (sedimentType < 0.7) {
        // Layered accumulation using planes
        geometry = new THREE.PlaneGeometry(
          0.15 + Math.random() * 0.2,
          0.15 + Math.random() * 0.2
        );
      } else {
        // Small irregular mounds
        geometry = new THREE.SphereGeometry(
          0.05 + Math.random() * 0.1,
          4 + Math.floor(Math.random() * 4),
          3 + Math.floor(Math.random() * 3)
        );
      }
      
      const material = this.materials.sediment[Math.floor(Math.random() * this.materials.sediment.length)];
      const sediment = new THREE.Mesh(geometry, material);
      
      const y = this.getGroundHeight(x, z) + 0.01;
      sediment.position.set(x, y, z);
      
      // Random rotation for natural look
      sediment.rotation.y = Math.random() * Math.PI * 2;
      if (sedimentType >= 0.4 && sedimentType < 0.7) {
        // Lay flat patches on ground
        sediment.rotation.x = -Math.PI / 2;
      }
      
      feature.meshes.push(sediment);
      this.scene.add(sediment);
    }
  }

  private addDebrisField(centerX: number, centerZ: number, baseSize: number, feature: TerrainFeature): void {
    const debrisCount = 8 + Math.floor(Math.random() * 13); // 8-20 fragments
    
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * 0.8 + Math.random() * baseSize * 1.2;
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      
      // Create varied debris geometries
      let geometry: THREE.BufferGeometry;
      const debrisType = Math.random();
      const size = 0.08 + Math.random() * 0.15;
      
      if (debrisType < 0.3) {
        // Flat rock slabs using scaled boxes
        geometry = new THREE.BoxGeometry(
          size * (1.5 + Math.random() * 1.0), // wider
          size * (0.2 + Math.random() * 0.3), // thin/flat
          size * (0.8 + Math.random() * 0.7)  // medium depth
        );
      } else if (debrisType < 0.5) {
        // Flat weathered stones using flattened cylinders
        geometry = new THREE.CylinderGeometry(
          size * 0.8,
          size * 0.6,
          size * 0.4, // flat
          5 + Math.floor(Math.random() * 3)
        );
      } else if (debrisType < 0.7) {
        // Angular fragments using dodecahedrons
        geometry = new THREE.DodecahedronGeometry(size);
      } else if (debrisType < 0.85) {
        // Irregular chunks using icosahedrons
        geometry = new THREE.IcosahedronGeometry(size, 0);
      } else {
        // Small rounded stones
        geometry = new THREE.SphereGeometry(size, 6, 4);
      }
      
      const material = this.materials.debris[Math.floor(Math.random() * this.materials.debris.length)];
      const debris = new THREE.Mesh(geometry, material);
      
      const y = this.getGroundHeight(x, z) + size * 0.3;
      debris.position.set(x, y, z);
      
      // Random rotation for natural scatter
      debris.rotation.x = Math.random() * Math.PI * 2;
      debris.rotation.y = Math.random() * Math.PI * 2;
      debris.rotation.z = Math.random() * Math.PI * 2;
      
      feature.meshes.push(debris);
      this.scene.add(debris);
    }
  }

  private addClusteredTinyRocks(centerX: number, centerZ: number, baseSize: number, feature: TerrainFeature): void {
    const clusterCount = 3 + Math.floor(Math.random() * 4); // 3-6 clusters
    
    for (let c = 0; c < clusterCount; c++) {
      // Position each cluster around the formation
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = baseSize * 0.9 + Math.random() * baseSize * 0.8;
      const clusterX = centerX + Math.cos(clusterAngle) * clusterDistance;
      const clusterZ = centerZ + Math.sin(clusterAngle) * clusterDistance;
      
      // Create 3-7 tiny rocks in this cluster
      const rocksInCluster = 3 + Math.floor(Math.random() * 5);
      
      for (let r = 0; r < rocksInCluster; r++) {
        const localAngle = Math.random() * Math.PI * 2;
        const localDistance = Math.random() * 0.3; // tight clustering
        const x = clusterX + Math.cos(localAngle) * localDistance;
        const z = clusterZ + Math.sin(localAngle) * localDistance;
        
        // Create tiny rock geometries
        let geometry: THREE.BufferGeometry;
        const tinyType = Math.random();
        const tinySize = 0.02 + Math.random() * 0.04;
        
        if (tinyType < 0.4) {
          // Tiny chips using scaled boxes
          geometry = new THREE.BoxGeometry(
            tinySize * (1.2 + Math.random() * 0.8),
            tinySize * (0.3 + Math.random() * 0.4),
            tinySize * (0.6 + Math.random() * 0.6)
          );
        } else if (tinyType < 0.7) {
          // Small pebbles using spheres
          geometry = new THREE.SphereGeometry(tinySize, 4, 3);
        } else {
          // Tiny irregular stones using tetrahedrons
          geometry = new THREE.TetrahedronGeometry(tinySize);
        }
        
        const material = this.materials.debris[Math.floor(Math.random() * this.materials.debris.length)];
        const tinyRock = new THREE.Mesh(geometry, material);
        
        const y = this.getGroundHeight(x, z) + tinySize * 0.5;
        tinyRock.position.set(x, y, z);
        
        // Random rotation
        tinyRock.rotation.x = Math.random() * Math.PI * 2;
        tinyRock.rotation.y = Math.random() * Math.PI * 2;
        tinyRock.rotation.z = Math.random() * Math.PI * 2;
        
        feature.meshes.push(tinyRock);
        this.scene.add(tinyRock);
      }
    }
  }

  private addVegetationToCluster(centerX: number, centerZ: number, baseSize: number, feature: TerrainFeature): void {
    // Add some vegetation around the rocks
    const vegetationCount = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < vegetationCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * 0.5 + Math.random() * baseSize * 0.5;
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      
      // Simple vegetation using cones
      const height = 0.2 + Math.random() * 0.3;
      const geometry = new THREE.ConeGeometry(height * 0.3, height, 5);
      const material = new THREE.MeshLambertMaterial({ color: 0x2D5F2D });
      const vegetation = new THREE.Mesh(geometry, material);
      
      const y = this.getGroundHeight(x, z);
      vegetation.position.set(x, y, z);
      
      feature.meshes.push(vegetation);
      this.scene.add(vegetation);
    }
  }

  private addWeatheringStains(centerX: number, centerZ: number, baseSize: number, feature: TerrainFeature): void {
    // Add weathering stains on some rocks
    const mainRocks = feature.meshes.filter(mesh => mesh.scale.x > baseSize * 0.2);
    
    for (const rock of mainRocks) {
      if (Math.random() > 0.6) {
        // Create a stain using a decal or texture
        const stainSize = rock.scale.x * 0.7;
        const stainGeometry = new THREE.PlaneGeometry(stainSize, stainSize);
        const stainMaterial = new THREE.MeshBasicMaterial({
          color: 0x8B7355,
          transparent: true,
          opacity: 0.3,
          depthWrite: false
        });
        
        const stain = new THREE.Mesh(stainGeometry, stainMaterial);
        
        // Position the stain on the rock surface
        const randomDir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() * 0.8, // Mostly on top
          Math.random() - 0.5
        ).normalize();
        
        stain.position.copy(rock.position).add(randomDir.multiplyScalar(rock.scale.x * 0.5));
        stain.lookAt(stain.position.clone().add(randomDir));
        
        feature.meshes.push(stain);
        this.scene.add(stain);
      }
    }
  }

  private getGroundHeight(x: number, z: number): number {
    // Simple ground height function
    return this.noise.perlin2(x * 0.1, z * 0.1) * 0.5;
  }

  private removeFeature(feature: TerrainFeature): void {
    for (const mesh of feature.meshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  }

  public cleanup(): void {
    for (const feature of this.features) {
      this.removeFeature(feature);
    }
    this.features = [];
  }
}
