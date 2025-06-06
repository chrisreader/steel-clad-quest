import * as THREE from 'three';
import { noise } from 'noisejs';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private waterLevel: number;

  constructor(scene: THREE.Scene, waterLevel: number) {
    this.scene = scene;
    this.waterLevel = waterLevel;
  }

  generateRock(position: THREE.Vector3): void {
    const rockHeight = 3 + Math.random() * 4;
    const rockRadius = 1.5 + Math.random() * 2;

    // Main rock body
    const rockGeometry = new THREE.CylinderGeometry(rockRadius, rockRadius * 0.6, rockHeight, 12);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x808080, flatShading: true });
    const rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
    rockMesh.position.copy(position);
    rockMesh.position.y = this.waterLevel + rockHeight / 2;
    this.scene.add(rockMesh);

    this.addDebrisField(rockMesh, position);
  }

  private createOrganicGeometry(baseGeometry: THREE.BufferGeometry, irregularityFactor: number = 0.3): THREE.BufferGeometry {
    const geometry = baseGeometry.clone();
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;

    // Add organic deformation to vertices
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Use noise to create organic deformation
      const noiseScale = 0.1;
      const deformation = noise.perlin3(x * noiseScale, y * noiseScale, z * noiseScale) * irregularityFactor;
      
      // Apply deformation in random directions
      const randomDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      positions[i] += randomDirection.x * deformation;
      positions[i + 1] += randomDirection.y * deformation;
      positions[i + 2] += randomDirection.z * deformation;
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }

  private createIrregularStone(scale: number): THREE.BufferGeometry {
    // Start with a basic shape and make it irregular
    const segments = 6 + Math.floor(Math.random() * 6); // 6-12 segments for variety
    const baseGeometry = new THREE.SphereGeometry(scale, segments, segments);
    
    // Apply heavy organic deformation
    return this.createOrganicGeometry(baseGeometry, 0.4 + Math.random() * 0.3);
  }

  private createIrregularSlab(width: number, height: number, depth: number): THREE.BufferGeometry {
    // Create a subdivided box for more vertices to deform
    const baseGeometry = new THREE.BoxGeometry(width, height, depth, 3, 2, 3);
    
    // Apply moderate organic deformation to make it look like a weathered rock slab
    return this.createOrganicGeometry(baseGeometry, 0.2 + Math.random() * 0.2);
  }

  private addDebrisField(rockMesh: THREE.Mesh, position: THREE.Vector3): void {
    const debrisGroup = new THREE.Group();
    const debrisCount = 8 + Math.floor(Math.random() * 12);

    for (let i = 0; i < debrisCount; i++) {
      let geometry: THREE.BufferGeometry;
      let material: THREE.Material;
      
      const debrisType = Math.random();
      const scale = 0.1 + Math.random() * 0.3;

      if (debrisType < 0.6) {
        // Sediment pebbles - organic oval shapes
        if (Math.random() < 0.4) {
          // Irregular flat stones
          const width = scale * (1.5 + Math.random());
          const height = scale * 0.3;
          const depth = scale * (0.8 + Math.random() * 0.4);
          geometry = this.createIrregularSlab(width, height, depth);
        } else if (Math.random() < 0.6) {
          // Organic elongated pebbles
          geometry = this.createIrregularStone(scale);
          geometry.scale(1.5 + Math.random(), 0.6 + Math.random() * 0.4, 1 + Math.random() * 0.3);
        } else {
          // Round organic pebbles
          geometry = this.createIrregularStone(scale);
          geometry.scale(1 + Math.random() * 0.3, 0.7 + Math.random() * 0.3, 1 + Math.random() * 0.3);
        }
        
        // Beige sediment colors
        const sedimentColors = [0xC4A484, 0xB8956A, 0xA0855B, 0xD2B48C, 0xBDB76B];
        material = new THREE.MeshLambertMaterial({ 
          color: sedimentColors[Math.floor(Math.random() * sedimentColors.length)],
          roughness: 0.8
        });
      } else {
        // Rock fragments - more angular but still organic
        if (Math.random() < 0.5) {
          // Irregular angular chunks
          geometry = this.createIrregularStone(scale);
          // Make more angular by scaling unevenly
          geometry.scale(
            0.7 + Math.random() * 0.6,
            0.5 + Math.random() * 0.8,
            0.8 + Math.random() * 0.4
          );
        } else {
          // Weathered slab fragments
          const width = scale * (1.2 + Math.random() * 0.8);
          const height = scale * (0.2 + Math.random() * 0.3);
          const depth = scale * (0.6 + Math.random() * 0.6);
          geometry = this.createIrregularSlab(width, height, depth);
        }
        
        // Weathered rock material (darker, more muted)
        material = new THREE.MeshLambertMaterial({ 
          color: new THREE.Color().setHSL(0.1, 0.2, 0.35 + Math.random() * 0.15),
          roughness: 0.9
        });
      }

      const debris = new THREE.Mesh(geometry, material);
      
      // Position around the rock with some clustering
      const angle = Math.random() * Math.PI * 2;
      const distance = 1 + Math.random() * 2;
      debris.position.set(
        Math.cos(angle) * distance,
        -0.5 + Math.random() * 0.3,
        Math.sin(angle) * distance
      );
      
      // Add natural rotation
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      debrisGroup.add(debris);
    }

    // Add tiny clustered pebbles for micro-detail
    const tinyPebbleCount = 15 + Math.floor(Math.random() * 20);
    for (let i = 0; i < tinyPebbleCount; i++) {
      const tinyScale = 0.03 + Math.random() * 0.07;
      const geometry = this.createIrregularStone(tinyScale);
      
      const material = new THREE.MeshLambertMaterial({ 
        color: Math.random() < 0.7 ? 0xC4A484 : 0xA0855B
      });
      
      const pebble = new THREE.Mesh(geometry, material);
      
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = 0.5 + Math.random() * 1.5;
      pebble.position.set(
        Math.cos(clusterAngle) * clusterDistance,
        -0.6 + Math.random() * 0.2,
        Math.sin(clusterAngle) * clusterDistance
      );
      
      pebble.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      debrisGroup.add(pebble);
    }

    debrisGroup.position.copy(position);
    this.scene.add(debrisGroup);
  }

  generateTerrainFeature(position: THREE.Vector3, featureType: string): void {
    if (featureType === 'rock') {
      this.generateRock(position);
    }
  }
}
