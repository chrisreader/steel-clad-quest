import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { StructureGenerator } from '../structures/StructureGenerator';
import { BuildingManager } from '../buildings/BuildingManager';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockShapeFactory } from './rocks/RockShapeFactory';
import { ROCK_VARIATIONS } from './rocks/config/RockVariationConfig';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private terrainSize: number;
  private heightData: number[][];
  private noise: SimplexNoise;
  private structureGenerator: StructureGenerator;
  private buildingManager: BuildingManager;
  private rockClusterGenerator: RockClusterGenerator;
  private rockShapeFactory: RockShapeFactory;

  constructor(
    scene: THREE.Scene,
    terrainSize: number,
    heightData: number[][],
    structureGenerator: StructureGenerator,
    buildingManager: BuildingManager
  ) {
    this.scene = scene;
    this.terrainSize = terrainSize;
    this.heightData = heightData;
    this.noise = new SimplexNoise();
    this.structureGenerator = structureGenerator;
    this.buildingManager = buildingManager;
    this.rockClusterGenerator = new RockClusterGenerator();
    this.rockShapeFactory = new RockShapeFactory();
  }

  private getTerrainHeightAtPosition(x: number, z: number): number {
    const xRatio = (x + this.terrainSize / 2) / this.terrainSize;
    const zRatio = (z + this.terrainSize / 2) / this.terrainSize;

    if (xRatio < 0 || xRatio > 1 || zRatio < 0 || zRatio > 1) {
      return 0;
    }

    const xIndex = Math.floor(xRatio * (this.heightData.length - 1));
    const zIndex = Math.floor(zRatio * (this.heightData[0].length - 1));

    return this.heightData[xIndex][zIndex];
  }

  public generateFeatures(rings: { radius: number; intensity: number }[], collisionCallback?: (object: THREE.Object3D) => void): void {
    console.log('🌱 Generating terrain features...');

    rings.forEach((ring, index) => {
      const featureCount = Math.floor(ring.intensity * 4);

      for (let i = 0; i < featureCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = ring.radius * Math.sqrt(Math.random());

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Weighted random choice for feature type
        const choice = Math.random();

        if (choice < 0.25 * ring.intensity) {
          this.addTree(x, z, ring.intensity, index, collisionCallback);
        } else if (choice < 0.4 * ring.intensity) {
          this.addRockFormations(x, z, ring.intensity, index, collisionCallback);
        } else if (choice < 0.7 * ring.intensity) {
          this.addDebrisField(x, z, ring.intensity, index, collisionCallback);
        } else if (choice < 0.9 && ring.intensity > 0.6) {
          // Ensure building placement only in higher intensity rings
          this.addBuilding(x, z, ring.intensity, index, collisionCallback);
        } else {
          this.addBush(x, z, ring.intensity, index, collisionCallback);
        }
      }
    });

    console.log('Terrain feature generation complete.');
  }

  private addTree(x: number, z: number, intensity: number, ringIndex: number, collisionCallback?: (object: THREE.Object3D) => void): void {
    const treeSize = 2 + Math.random() * 3;
    const treeGeometry = new THREE.CylinderGeometry(0.5, 1, treeSize, 8);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3424 });
    const tree = new THREE.Mesh(treeGeometry, treeMaterial);

    const crownSize = 3 + Math.random() * 2;
    const crownGeometry = new THREE.SphereGeometry(crownSize, 8, 6);
    const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = treeSize / 2 + crownSize / 2;
    tree.add(crown);

    const terrainHeight = this.getTerrainHeightAtPosition(x, z);
    tree.position.set(x, terrainHeight, z);
    tree.castShadow = true;
    tree.receiveShadow = true;

    this.scene.add(tree);

    if (collisionCallback) {
      collisionCallback(tree);
    }
  }

  private addBush(x: number, z: number, intensity: number, ringIndex: number, collisionCallback?: (object: THREE.Object3D) => void): void {
    const bushSize = 0.5 + Math.random() * 1;
    const bushGeometry = new THREE.SphereGeometry(bushSize, 6, 5);
    const bushMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const bush = new THREE.Mesh(bushGeometry, bushMaterial);

    const terrainHeight = this.getTerrainHeightAtPosition(x, z);
    bush.position.set(x, terrainHeight + bushSize / 2, z);
    bush.castShadow = true;
    bush.receiveShadow = true;

    this.scene.add(bush);

    if (collisionCallback) {
      collisionCallback(bush);
    }
  }

  private addBuilding(x: number, z: number, intensity: number, ringIndex: number, collisionCallback?: (object: THREE.Object3D) => void): void {
    const terrainHeight = this.getTerrainHeightAtPosition(x, z);
    const building = this.buildingManager.createBuilding('tavern', x, terrainHeight, z);

    if (building && collisionCallback) {
      building.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          collisionCallback(object);
        }
      });
    }
  }

  private addDebrisField(x: number, z: number, intensity: number, ringIndex: number, collisionCallback?: (object: THREE.Object3D) => void): void {
    console.log(`🏔️ Adding debris field at (${x}, ${z}) with intensity ${intensity} for ring ${ringIndex}`);
    
    const debrisCount = Math.floor(intensity * (8 + Math.random() * 6));
    
    for (let i = 0; i < debrisCount; i++) {
      const offsetX = x + (Math.random() - 0.5) * 15;
      const offsetZ = z + (Math.random() - 0.5) * 15;
      
      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAtPosition(offsetX, offsetZ);
      
      const debrisSize = 0.1 + Math.random() * 0.4; // Range of debris sizes
      const debrisType = Math.floor(Math.random() * 3); // 0, 1, or 2
      let debrisGeometry: THREE.BufferGeometry;
      
      switch (debrisType) {
        case 0: // Oval-shaped debris (compressed sphere)
          debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
          const ovalScale = new THREE.Vector3(
            1 + Math.random() * 0.5,
            0.3 + Math.random() * 0.4,
            0.7 + Math.random() * 0.6
          );
          debrisGeometry.scale(ovalScale.x, ovalScale.y, ovalScale.z);
          break;
          
        case 1: // Organic diamond-like elongated pebbles (FIXED - no more perfect pills)
          debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
          // Create organic diamond-like proportions
          const diamondScale = new THREE.Vector3(
            0.4 + Math.random() * 0.3,  // Narrow width
            0.3 + Math.random() * 0.2,  // Squashed height
            1.8 + Math.random() * 0.8   // Elongated depth for diamond shape
          );
          debrisGeometry.scale(diamondScale.x, diamondScale.y, diamondScale.z);
          
          // Apply organic deformation to break perfect shape
          const positions = debrisGeometry.attributes.position.array as Float32Array;
          for (let j = 0; j < positions.length; j += 3) {
            const x = positions[j];
            const y = positions[j + 1];
            const z = positions[j + 2];
            
            // Create organic diamond-like deformation
            const length = Math.sqrt(x * x + y * y + z * z);
            if (length > 0) {
              // Add gentle irregularity to create organic diamond shape
              const organicNoise = Math.sin(x * 8) * Math.cos(z * 6) * 0.15;
              const edgeVariation = Math.sin(y * 10) * Math.cos(x * 8) * 0.1;
              
              const totalDeformation = organicNoise + edgeVariation;
              const normalX = x / length;
              const normalY = y / length;
              const normalZ = z / length;
              
              positions[j] += normalX * totalDeformation * debrisSize;
              positions[j + 1] += normalY * totalDeformation * debrisSize;
              positions[j + 2] += normalZ * totalDeformation * debrisSize;
            }
          }
          debrisGeometry.attributes.position.needsUpdate = true;
          debrisGeometry.computeVertexNormals();
          break;
          
        case 2: // Round flat pebbles
          debrisGeometry = new THREE.SphereGeometry(debrisSize, 8, 6);
          const flatScale = new THREE.Vector3(
            0.8 + Math.random() * 0.4,
            0.2 + Math.random() * 0.3,
            0.8 + Math.random() * 0.4
          );
          debrisGeometry.scale(flatScale.x, flatScale.y, flatScale.z);
          break;
          
        default:
          debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
      }
      
      // Create debris material with subtle variations
      const grayLevel = 0.6 + Math.random() * 0.3;
      const debrisMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(grayLevel * 0.9, grayLevel * 0.85, grayLevel * 0.8)
      });
      
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Add rock metadata for collision system
      debris.userData.isRock = true;
      debris.userData.rockType = 'debris';
      debris.userData.size = debrisSize;
      
      debris.position.set(offsetX, terrainHeight + debrisSize * 0.3, offsetZ);
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      
      debris.castShadow = true;
      debris.receiveShadow = true;
      
      this.scene.add(debris);
      
      // Register collision if callback provided
      if (collisionCallback) {
        collisionCallback(debris);
      }
    }
  }

  private addRockFormations(x: number, z: number, intensity: number, ringIndex: number, collisionCallback?: (object: THREE.Object3D) => void): void {
    console.log(`🪨 Adding rock formations at (${x}, ${z}) with intensity ${intensity} for ring ${ringIndex}`);
    
    const formationCount = Math.floor(intensity * (2 + Math.random() * 3));
    
    for (let i = 0; i < formationCount; i++) {
      const offsetX = x + (Math.random() - 0.5) * 20;
      const offsetZ = z + (Math.random() - 0.5) * 20;
      
      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAtPosition(offsetX, offsetZ);
      
      // Create clustered rock formation using RockClusterGenerator
      const variation = ROCK_VARIATIONS[Math.floor(Math.random() * ROCK_VARIATIONS.length)];
      const rockGroup = new THREE.Group();
      
      // Add rock metadata for collision system
      rockGroup.userData.isRock = true;
      rockGroup.userData.rockType = 'formation';
      rockGroup.userData.variation = variation.category;
      
      this.rockClusterGenerator.createVariedRockCluster(
        rockGroup,
        variation,
        i,
        this.rockShapeFactory.createCharacterBaseGeometry.bind(this.rockShapeFactory),
        this.rockShapeFactory.applyShapeModifications.bind(this.rockShapeFactory),
        this.rockShapeFactory.applyCharacterDeformation.bind(this.rockShapeFactory),
        this.rockShapeFactory.validateAndEnhanceGeometry.bind(this.rockShapeFactory)
      );
      
      rockGroup.position.set(offsetX, terrainHeight, offsetZ);
      this.scene.add(rockGroup);
      
      // Register collision for the entire rock formation if callback provided
      if (collisionCallback) {
        collisionCallback(rockGroup);
        
        // Also register collision for individual rocks in the cluster
        rockGroup.children.forEach(rock => {
          if (rock instanceof THREE.Mesh) {
            rock.userData.isRock = true;
            rock.userData.rockType = 'cluster_member';
            rock.userData.parentFormation = rockGroup.uuid;
            collisionCallback(rock);
          }
        });
      }
    }
  }
}
