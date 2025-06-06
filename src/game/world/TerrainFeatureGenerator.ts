import * as THREE from 'three';
import { Noise } from 'noisejs';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private collisionCallback?: (object: THREE.Object3D) => void;
  private createdObjects: THREE.Object3D[] = [];
  private noise: Noise;

  // Enhanced material variants for beige debris and sediment
  private beigeRockMaterials: THREE.MeshLambertMaterial[] = [];
  private sedimentMaterials: THREE.MeshLambertMaterial[] = [];
  private flatRockMaterials: THREE.MeshLambertMaterial[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.noise = new Noise(Math.random());
    this.createEnhancedMaterials();
  }

  private createEnhancedMaterials(): void {
    // Beige weathered rock colors
    const beigeColors = [
      0xD2B48C, // Tan
      0xC4A47A, // Light brown
      0xB8A082, // Weathered beige
      0xDDC3A0, // Light tan
      0xA0826D  // Darker beige
    ];

    // Create beige rock materials
    beigeColors.forEach(color => {
      this.beigeRockMaterials.push(new THREE.MeshLambertMaterial({
        color: color,
        transparent: false
      }));
    });

    // Sediment materials (finer particles)
    const sedimentColors = [
      0xE6D3B7, // Light sediment beige
      0xD4C4A8, // Weathered sediment
      0xCBB99C, // Sandy beige
      0xB8A88A  // Darker sediment
    ];

    sedimentColors.forEach(color => {
      this.sedimentMaterials.push(new THREE.MeshLambertMaterial({
        color: color,
        transparent: false
      }));
    });

    // Flat rock materials (weathered surfaces)
    const flatRockColors = [
      0xC8B99C, // Weathered flat stone
      0xB5A082, // Aged beige
      0xD0C0A0, // Light weathered
      0xA89070  // Darker flat stone
    ];

    flatRockColors.forEach(color => {
      this.flatRockMaterials.push(new THREE.MeshLambertMaterial({
        color: color,
        transparent: false
      }));
    });
  }

  setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionCallback = callback;
  }

  generateFeaturesForRegion(centerX: number, centerZ: number, size: number): void {
    const featureCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < featureCount; i++) {
      const x = centerX + (Math.random() - 0.5) * size;
      const z = centerZ + (Math.random() - 0.5) * size;
      
      // Determine feature type based on noise
      const noiseValue = Math.abs(this.noise.simplex2(x * 0.01, z * 0.01));
      
      if (noiseValue > 0.7) {
        this.createRockFormation(x, z, 'massive');
      } else if (noiseValue > 0.5) {
        this.createRockFormation(x, z, 'large');
      } else if (noiseValue > 0.3) {
        this.createRockFormation(x, z, 'medium');
      } else {
        this.createRockFormation(x, z, 'small');
      }
    }
  }

  private createRockFormation(x: number, z: number, formationType: 'small' | 'medium' | 'large' | 'massive'): void {
    const cluster = new THREE.Group();
    cluster.position.set(x, 0, z);
    
    let rockCount = 1;
    let maxSize = 0.5;
    
    switch (formationType) {
      case 'massive':
        rockCount = 8 + Math.floor(Math.random() * 5);
        maxSize = 2.0;
        break;
      case 'large':
        rockCount = 5 + Math.floor(Math.random() * 4);
        maxSize = 1.5;
        break;
      case 'medium':
        rockCount = 3 + Math.floor(Math.random() * 3);
        maxSize = 1.0;
        break;
      case 'small':
        rockCount = 1 + Math.floor(Math.random() * 2);
        maxSize = 0.7;
        break;
    }
    
    for (let i = 0; i < rockCount; i++) {
      const rockSize = maxSize * (0.4 + Math.random() * 0.6);
      const rockGeometry = this.createRockGeometry(rockSize);
      
      const rockMaterial = new THREE.MeshLambertMaterial({
        color: 0x888888 + Math.floor(Math.random() * 0x222222),
        transparent: false
      });
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      // Position rocks in a cluster
      const angle = Math.random() * Math.PI * 2;
      const distance = i === 0 ? 0 : Math.random() * rockSize * 1.5;
      
      rock.position.x = Math.cos(angle) * distance;
      rock.position.z = Math.sin(angle) * distance;
      rock.position.y = this.getGroundHeight(x + rock.position.x, z + rock.position.z);
      
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.rotation.x = Math.random() * 0.5;
      rock.rotation.z = Math.random() * 0.5;
      
      cluster.add(rock);
      this.createdObjects.push(rock);
      
      if (this.collisionCallback) {
        this.collisionCallback(rock);
      }
    }
    
    this.scene.add(cluster);
    this.createdObjects.push(cluster);

    // Enhanced large formation features
    if (formationType === 'large' || formationType === 'massive') {
      this.generateEnhancedDebrisAndSediment(cluster, x, z);
    }
  }

  private generateEnhancedDebrisAndSediment(cluster: THREE.Group, centerX: number, centerZ: number): void {
    const clusterRadius = this.calculateClusterRadius(cluster);
    
    // Enhanced sediment accumulation (6-14 particles)
    this.generateBeigeSedeiment(cluster, clusterRadius, centerX, centerZ);
    
    // Flat rock debris (part of 8-20 debris fragments)
    this.generateFlatRockDebris(cluster, clusterRadius, centerX, centerZ);
    
    // Clustered tiny rocks (part of debris system)
    this.generateClusteredTinyRocks(cluster, clusterRadius, centerX, centerZ);
    
    // Enhanced scattered debris
    this.generateEnhancedScatteredDebris(cluster, clusterRadius, centerX, centerZ);
  }

  private generateBeigeSedeiment(cluster: THREE.Group, radius: number, centerX: number, centerZ: number): void {
    const sedimentCount = 6 + Math.floor(Math.random() * 9); // 6-14 particles
    
    for (let i = 0; i < sedimentCount; i++) {
      // Position in low spots around cluster
      const angle = (i / sedimentCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const distance = radius * 0.8 + Math.random() * radius * 0.6;
      
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      const y = this.getGroundHeight(x, z) - 0.02; // Slightly embedded
      
      // Create flattened sediment particle
      const sedimentGeometry = new THREE.SphereGeometry(
        0.05 + Math.random() * 0.08, // 0.05-0.13 size
        8, 6
      );
      sedimentGeometry.scale(1, 0.3 + Math.random() * 0.4, 1); // Flatten vertically
      
      const material = this.sedimentMaterials[Math.floor(Math.random() * this.sedimentMaterials.length)];
      const sediment = new THREE.Mesh(sedimentGeometry, material);
      
      sediment.position.set(x, y, z);
      sediment.rotation.y = Math.random() * Math.PI * 2;
      sediment.rotation.x = (Math.random() - 0.5) * 0.3;
      
      cluster.add(sediment);
      this.createdObjects.push(sediment);
    }
  }

  private generateFlatRockDebris(cluster: THREE.Group, radius: number, centerX: number, centerZ: number): void {
    const flatRockCount = 4 + Math.floor(Math.random() * 7); // 4-10 flat rocks
    
    for (let i = 0; i < flatRockCount; i++) {
      // Scatter around cluster base
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * 0.6 + Math.random() * radius * 0.8;
      
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      const y = this.getGroundHeight(x, z);
      
      // Create flat rock piece
      const flatRockGeometry = this.createFlatRockGeometry();
      const material = this.flatRockMaterials[Math.floor(Math.random() * this.flatRockMaterials.length)];
      const flatRock = new THREE.Mesh(flatRockGeometry, material);
      
      flatRock.position.set(x, y, z);
      flatRock.rotation.y = Math.random() * Math.PI * 2;
      flatRock.rotation.x = (Math.random() - 0.5) * 0.4;
      flatRock.rotation.z = (Math.random() - 0.5) * 0.3;
      
      cluster.add(flatRock);
      this.createdObjects.push(flatRock);
      
      if (this.collisionCallback) {
        this.collisionCallback(flatRock);
      }
    }
  }

  private createFlatRockGeometry(): THREE.BufferGeometry {
    const size = 0.1 + Math.random() * 0.15; // 0.1-0.25 size
    const geometry = new THREE.BoxGeometry(size, size * 0.2, size * 0.8);
    
    // Add some irregular shaping
    const vertices = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] += (Math.random() - 0.5) * size * 0.3;     // X variation
      vertices[i + 1] += (Math.random() - 0.5) * size * 0.2; // Y variation (keep flat)
      vertices[i + 2] += (Math.random() - 0.5) * size * 0.3; // Z variation
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  private generateClusteredTinyRocks(cluster: THREE.Group, radius: number, centerX: number, centerZ: number): void {
    const clusterCount = 2 + Math.floor(Math.random() * 4); // 2-5 tiny rock clusters
    
    for (let c = 0; c < clusterCount; c++) {
      // Position for each cluster
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = radius * 0.7 + Math.random() * radius * 0.6;
      
      const clusterX = centerX + Math.cos(clusterAngle) * clusterDistance;
      const clusterZ = centerZ + Math.sin(clusterAngle) * clusterDistance;
      
      // Generate 3-7 tiny rocks in this cluster
      const rocksInCluster = 3 + Math.floor(Math.random() * 5);
      
      for (let r = 0; r < rocksInCluster; r++) {
        // Tight clustering
        const rockAngle = Math.random() * Math.PI * 2;
        const rockDistance = Math.random() * 0.15; // Very close together
        
        const x = clusterX + Math.cos(rockAngle) * rockDistance;
        const z = clusterZ + Math.sin(rockAngle) * rockDistance;
        const y = this.getGroundHeight(x, z);
        
        // Create tiny rock
        const tinyRockGeometry = new THREE.SphereGeometry(
          0.02 + Math.random() * 0.04, // 0.02-0.06 size
          6, 4
        );
        
        // Slightly irregular shape
        const vertices = tinyRockGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < vertices.length; i += 3) {
          const variation = 0.3 + Math.random() * 0.4;
          vertices[i] *= variation;
          vertices[i + 1] *= variation;
          vertices[i + 2] *= variation;
        }
        tinyRockGeometry.attributes.position.needsUpdate = true;
        tinyRockGeometry.computeVertexNormals();
        
        const material = this.beigeRockMaterials[Math.floor(Math.random() * this.beigeRockMaterials.length)];
        const tinyRock = new THREE.Mesh(tinyRockGeometry, material);
        
        tinyRock.position.set(x, y, z);
        tinyRock.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        
        cluster.add(tinyRock);
        this.createdObjects.push(tinyRock);
      }
    }
  }

  private generateEnhancedScatteredDebris(cluster: THREE.Group, radius: number, centerX: number, centerZ: number): void {
    const debrisCount = 6 + Math.floor(Math.random() * 8); // 6-13 additional debris pieces
    
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * 0.5 + Math.random() * radius * 1.2;
      
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      const y = this.getGroundHeight(x, z);
      
      // Mix of different debris types
      const debrisType = Math.random();
      let debrisGeometry: THREE.BufferGeometry;
      
      if (debrisType < 0.4) {
        // Irregular rock chunk
        debrisGeometry = new THREE.SphereGeometry(
          0.06 + Math.random() * 0.08,
          6, 4
        );
      } else if (debrisType < 0.7) {
        // Angular fragment
        debrisGeometry = new THREE.BoxGeometry(
          0.05 + Math.random() * 0.1,
          0.03 + Math.random() * 0.08,
          0.04 + Math.random() * 0.09
        );
      } else {
        // Elongated chip
        debrisGeometry = new THREE.CylinderGeometry(
          0.02 + Math.random() * 0.03,
          0.03 + Math.random() * 0.04,
          0.08 + Math.random() * 0.12,
          6
        );
      }
      
      // Add irregularity
      const vertices = debrisGeometry.attributes.position.array as Float32Array;
      for (let v = 0; v < vertices.length; v += 3) {
        const factor = 0.7 + Math.random() * 0.6;
        vertices[v] *= factor;
        vertices[v + 1] *= factor;
        vertices[v + 2] *= factor;
      }
      debrisGeometry.attributes.position.needsUpdate = true;
      debrisGeometry.computeVertexNormals();
      
      const material = this.beigeRockMaterials[Math.floor(Math.random() * this.beigeRockMaterials.length)];
      const debris = new THREE.Mesh(debrisGeometry, material);
      
      debris.position.set(x, y, z);
      debris.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      cluster.add(debris);
      this.createdObjects.push(debris);
      
      if (this.collisionCallback) {
        this.collisionCallback(debris);
      }
    }
  }

  private calculateClusterRadius(cluster: THREE.Group): number {
    const box = new THREE.Box3().setFromObject(cluster);
    const size = box.getSize(new THREE.Vector3());
    return Math.max(size.x, size.z) * 0.5;
  }

  private getGroundHeight(x: number, z: number): number {
    // Simple ground height calculation
    return this.noise.perlin2(x * 0.01, z * 0.01) * 2;
  }

  private createRockGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(size, 8, 6);
    
    // Deform the sphere to make it look more like a rock
    const vertices = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] *= 0.8 + Math.random() * 0.4;
      vertices[i + 1] *= 0.8 + Math.random() * 0.4;
      vertices[i + 2] *= 0.8 + Math.random() * 0.4;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  cleanupFeaturesForRegion(centerX: number, centerZ: number, size: number): void {
    const objectsToRemove: THREE.Object3D[] = [];
    
    this.createdObjects.forEach(object => {
      const distance = Math.sqrt(
        Math.pow(object.position.x - centerX, 2) +
        Math.pow(object.position.z - centerZ, 2)
      );
      
      if (distance > size * 1.5) {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(object => {
      this.scene.remove(object);
      
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
      
      const index = this.createdObjects.indexOf(object);
      if (index !== -1) {
        this.createdObjects.splice(index, 1);
      }
    });
  }

  dispose(): void {
    this.createdObjects.forEach(object => {
      this.scene.remove(object);
      
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    this.createdObjects = [];
    
    // Dispose new materials
    this.beigeRockMaterials.forEach(material => material.dispose());
    this.sedimentMaterials.forEach(material => material.dispose());
    this.flatRockMaterials.forEach(material => material.dispose());
  }
}
