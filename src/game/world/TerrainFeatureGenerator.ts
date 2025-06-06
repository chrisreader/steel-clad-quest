
import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';

export class TerrainFeatureGenerator {
  private ringSystem: RingQuadrantSystem;
  private scene: THREE.Scene;
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    // Generate terrain features for the region
    console.log(`Generating terrain features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const centerPosition = this.ringSystem.getRegionCenter(region);
    
    // Generate rock clusters with environmental details
    this.generateRockClusters(centerPosition);
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    // Cleanup terrain features for the region
    console.log(`Cleaning up terrain features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
  }

  private generateRockClusters(basePosition: THREE.Vector3): void {
    const clusterCount = Math.floor(2 + Math.random() * 4);
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterPosition = new THREE.Vector3(
        basePosition.x + (Math.random() - 0.5) * 100,
        basePosition.y,
        basePosition.z + (Math.random() - 0.5) * 100
      );
      
      this.createRockCluster(clusterPosition);
    }
  }

  private createRockCluster(basePosition: THREE.Vector3): void {
    const clusterGroup = new THREE.Group();
    const rockCount = Math.floor(3 + Math.random() * 5);
    
    // Create main rocks
    for (let i = 0; i < rockCount; i++) {
      const rock = this.createSingleRock(basePosition);
      clusterGroup.add(rock);
    }
    
    // Add environmental details
    this.addTerrainFeatures(clusterGroup, basePosition, 1.0);
    
    this.scene.add(clusterGroup);
    
    // Register for collision if callback is set
    if (this.collisionRegistrationCallback) {
      this.collisionRegistrationCallback(clusterGroup);
    }
  }

  private createSingleRock(basePosition: THREE.Vector3): THREE.Mesh {
    const size = 0.3 + Math.random() * 0.8;
    const geometry = new THREE.BoxGeometry(
      size * (0.8 + Math.random() * 0.4),
      size * (0.6 + Math.random() * 0.8),
      size * (0.7 + Math.random() * 0.6)
    );
    
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.1 + Math.random() * 0.05, 0.3 + Math.random() * 0.2, 0.4 + Math.random() * 0.3)
    });
    
    const rock = new THREE.Mesh(geometry, material);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 2;
    rock.position.set(
      basePosition.x + Math.cos(angle) * distance,
      basePosition.y + Math.random() * 0.2,
      basePosition.z + Math.sin(angle) * distance
    );
    
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  public addTerrainFeatures(rockGroup: THREE.Group, basePosition: THREE.Vector3, intensity: number): void {
    this.addDebrisField(rockGroup, basePosition, intensity);
    this.addSedimentAccumulation(rockGroup, basePosition, intensity);
  }

  private addDebrisField(rockGroup: THREE.Group, basePosition: THREE.Vector3, intensity: number): void {
    const debrisCount = Math.floor(8 + Math.random() * 12) * intensity;
    
    for (let i = 0; i < debrisCount; i++) {
      // Create varied debris types
      const debrisType = Math.random();
      let debrisSize: number;
      let debrisMaterial: THREE.Material;
      let debrisGeometry: THREE.BufferGeometry;
      
      if (debrisType < 0.4) {
        // Flat rock debris (beige colored)
        debrisSize = 0.03 + Math.random() * 0.05;
        debrisGeometry = new THREE.BoxGeometry(
          debrisSize * (2 + Math.random()), 
          debrisSize * 0.3, // Very flat
          debrisSize * (1.5 + Math.random())
        );
        debrisMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.12 + Math.random() * 0.03, 0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.15) // Beige tones
        });
      } else if (debrisType < 0.7) {
        // Small rounded rocks (beige/tan colored)
        debrisSize = 0.02 + Math.random() * 0.04;
        debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
        debrisMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.11 + Math.random() * 0.04, 0.25 + Math.random() * 0.25, 0.55 + Math.random() * 0.2) // Tan/beige
        });
      } else {
        // Tiny angular fragments
        debrisSize = 0.01 + Math.random() * 0.02;
        debrisGeometry = new THREE.OctahedronGeometry(debrisSize, 0);
        debrisMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.10 + Math.random() * 0.05, 0.2 + Math.random() * 0.3, 0.5 + Math.random() * 0.25) // Varied beige
        });
      }
      
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Position around cluster base with realistic scattering
      const angle = Math.random() * Math.PI * 2;
      const distance = (0.3 + Math.random() * 0.8) * intensity;
      const heightVariation = Math.random() * 0.05;
      
      debris.position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + heightVariation,
        basePosition.z + Math.sin(angle) * distance
      );
      
      // Random rotation for natural look
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      
      debris.castShadow = true;
      debris.receiveShadow = true;
      
      rockGroup.add(debris);
    }
    
    // Add clustered tiny rocks for extra detail
    this.addClusteredTinyRocks(rockGroup, basePosition, intensity);
  }
  
  private addClusteredTinyRocks(rockGroup: THREE.Group, basePosition: THREE.Vector3, intensity: number): void {
    const clusterCount = Math.floor(2 + Math.random() * 3) * intensity;
    
    for (let cluster = 0; cluster < clusterCount; cluster++) {
      // Each cluster has 3-7 tiny rocks
      const rocksInCluster = 3 + Math.floor(Math.random() * 5);
      
      // Cluster center position
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = (0.4 + Math.random() * 0.6) * intensity;
      const clusterCenter = new THREE.Vector3(
        basePosition.x + Math.cos(clusterAngle) * clusterDistance,
        basePosition.y,
        basePosition.z + Math.sin(clusterAngle) * clusterDistance
      );
      
      for (let i = 0; i < rocksInCluster; i++) {
        const tinySize = 0.015 + Math.random() * 0.025;
        
        // Varied tiny rock shapes
        let geometry: THREE.BufferGeometry;
        const shapeType = Math.random();
        
        if (shapeType < 0.3) {
          // Small flat pebbles
          geometry = new THREE.CylinderGeometry(tinySize, tinySize * 0.8, tinySize * 0.4, 6);
        } else if (shapeType < 0.6) {
          // Rounded pebbles
          geometry = new THREE.SphereGeometry(tinySize, 5, 3);
        } else {
          // Angular fragments
          geometry = new THREE.BoxGeometry(
            tinySize * (0.8 + Math.random() * 0.4),
            tinySize * (0.5 + Math.random() * 0.3),
            tinySize * (0.7 + Math.random() * 0.5)
          );
        }
        
        // Beige/tan material with variation
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(
            0.10 + Math.random() * 0.06, // Beige/tan hue range
            0.2 + Math.random() * 0.3,   // Low to medium saturation
            0.5 + Math.random() * 0.3    // Medium to light brightness
          )
        });
        
        const tinyRock = new THREE.Mesh(geometry, material);
        
        // Position within cluster with tight grouping
        const inClusterAngle = Math.random() * Math.PI * 2;
        const inClusterDistance = Math.random() * tinySize * 3;
        
        tinyRock.position.set(
          clusterCenter.x + Math.cos(inClusterAngle) * inClusterDistance,
          clusterCenter.y + Math.random() * 0.02,
          clusterCenter.z + Math.sin(inClusterAngle) * inClusterDistance
        );
        
        tinyRock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI
        );
        
        tinyRock.castShadow = true;
        tinyRock.receiveShadow = true;
        
        rockGroup.add(tinyRock);
      }
    }
  }
  
  private addSedimentAccumulation(rockGroup: THREE.Group, basePosition: THREE.Vector3, intensity: number): void {
    const sedimentCount = Math.floor(6 + Math.random() * 8) * intensity;
    
    for (let i = 0; i < sedimentCount; i++) {
      // Create varied sediment particles - mix of sand-like and small debris
      const particleType = Math.random();
      let particleSize: number;
      let particleMaterial: THREE.Material;
      let particleGeometry: THREE.BufferGeometry;
      
      if (particleType < 0.5) {
        // Fine sediment particles (very small and flat)
        particleSize = 0.008 + Math.random() * 0.015;
        particleGeometry = new THREE.CylinderGeometry(
          particleSize, 
          particleSize * 0.9, 
          particleSize * 0.2, 
          4
        );
        particleMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.13 + Math.random() * 0.02, 0.4 + Math.random() * 0.1, 0.65 + Math.random() * 0.1) // Sandy beige
        });
      } else {
        // Small weathered fragments
        particleSize = 0.01 + Math.random() * 0.02;
        particleGeometry = new THREE.SphereGeometry(particleSize, 4, 3);
        particleMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.11 + Math.random() * 0.04, 0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.15) // Weathered beige
        });
      }
      
      const sediment = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Position in low spots and crevices around rocks
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 0.4 * intensity;
      
      // Bias towards lower positions (accumulated in depressions)
      const heightOffset = -Math.random() * 0.03;
      
      sediment.position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + heightOffset,
        basePosition.z + Math.sin(angle) * distance
      );
      
      // Minimal rotation for settled appearance
      sediment.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      
      sediment.castShadow = true;
      sediment.receiveShadow = true;
      
      rockGroup.add(sediment);
    }
  }

  public dispose(): void {
    // Clean up any resources
    console.log("TerrainFeatureGenerator disposed");
  }
}
