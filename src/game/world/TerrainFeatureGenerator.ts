import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { StructureGenerator } from './StructureGenerator';
import { BuildingManager } from '../buildings/BuildingManager';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { ROCK_VARIATIONS } from './rocks/config/RockVariationConfig';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private noise: SimplexNoise;
  private buildingManager: BuildingManager | null = null;
  private rockClusterGenerator: RockClusterGenerator;
  private rockShapeFactory: RockShapeFactory;
  private collisionRegistrationCallback: ((object: THREE.Object3D) => void) | null = null;

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.noise = new SimplexNoise();
    this.rockClusterGenerator = new RockClusterGenerator();
    this.rockShapeFactory = new RockShapeFactory();
  }

  public setBuildingManager(buildingManager: BuildingManager): void {
    this.buildingManager = buildingManager;
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  private getTerrainHeightAtPosition(x: number, z: number): number {
    // Simple height calculation based on ring system
    const distance = Math.sqrt(x * x + z * z);
    return Math.sin(distance * 0.1) * 2;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    console.log(`🌱 Generating features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);

    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Generate ring-based features with intensity based on ring characteristics
    const rings = [
      { 
        radius: ringDef.outerRadius * 0.8, 
        intensity: Math.max(0.3, 1.0 - region.ringIndex * 0.2) 
      }
    ];

    rings.forEach((ring, index) => {
      const featureCount = Math.floor(ring.intensity * 4);

      for (let i = 0; i < featureCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = ring.radius * Math.sqrt(Math.random());

        const x = centerPosition.x + Math.cos(angle) * radius;
        const z = centerPosition.z + Math.sin(angle) * radius;

        // Weighted random choice for feature type
        const choice = Math.random();

        if (choice < 0.25 * ring.intensity) {
          this.addTree(x, z, ring.intensity, index);
        } else if (choice < 0.4 * ring.intensity) {
          this.addRockFormations(x, z, ring.intensity, index);
        } else if (choice < 0.7 * ring.intensity) {
          this.addDebrisField(x, z, ring.intensity, index);
        } else if (choice < 0.9 && ring.intensity > 0.6 && this.buildingManager) {
          this.addBuilding(x, z, ring.intensity, index);
        } else {
          this.addBush(x, z, ring.intensity, index);
        }
      }
    });

    console.log(`Features generated for region ${region.ringIndex}-${region.quadrant}`);
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    console.log(`🧹 Cleaning up features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    // Implementation for cleanup if needed
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

    if (this.collisionRegistrationCallback) {
      this.collisionRegistrationCallback(tree);
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

    if (this.collisionRegistrationCallback) {
      this.collisionRegistrationCallback(bush);
    }
  }

  private addBuilding(x: number, z: number, intensity: number, ringIndex: number, collisionCallback?: (object: THREE.Object3D) => void): void {
    if (!this.buildingManager) return;

    const terrainHeight = this.getTerrainHeightAtPosition(x, z);
    const building = this.buildingManager.createBuilding({
      type: 'tavern',
      position: new THREE.Vector3(x, terrainHeight, z)
    });

    if (building && collisionCallback) {
      const buildingGroup = building.getBuildingGroup();
      buildingGroup.traverse((object) => {
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

      if (this.collisionRegistrationCallback) {
        this.collisionRegistrationCallback(debris);
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
      
      // Create clustered rock formation using simple geometry for now
      const variation = ROCK_VARIATIONS[Math.floor(Math.random() * ROCK_VARIATIONS.length)];
      const rockGroup = new THREE.Group();
      
      // Add rock metadata for collision system
      rockGroup.userData.isRock = true;
      rockGroup.userData.rockType = 'formation';
      rockGroup.userData.variation = variation.category;
      
      // Create simple rock cluster
      const rockCount = 3 + Math.floor(Math.random() * 4);
      for (let r = 0; r < rockCount; r++) {
        const rockSize = 0.5 + Math.random() * 1.5;
        const rockGeometry = new THREE.SphereGeometry(rockSize, 8, 6);
        const rockMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color(0.6, 0.55, 0.5)
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(
          (Math.random() - 0.5) * 4,
          rockSize * 0.5,
          (Math.random() - 0.5) * 4
        );
        rock.userData.isRock = true;
        rock.userData.rockType = 'cluster_member';
        rock.userData.size = rockSize;
        
        rockGroup.add(rock);
      }
      
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

      if (this.collisionRegistrationCallback) {
        this.collisionRegistrationCallback(rockGroup);
        
        // Also register collision for individual rocks in the cluster
        rockGroup.children.forEach(rock => {
          if (rock instanceof THREE.Mesh) {
            rock.userData.isRock = true;
            rock.userData.rockType = 'cluster_member';
            rock.userData.parentFormation = rockGroup.uuid;
            this.collisionRegistrationCallback!(rock);
          }
        });
      }
    }
  }

  public dispose(): void {
    console.log('TerrainFeatureGenerator disposed');
  }
}
