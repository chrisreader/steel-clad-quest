
import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { 
  RockSpawning, 
  RockMaterials,
  type RockSpawnConfig 
} from './RockSystem';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  private collisionRegistrationCallback: ((object: THREE.Object3D) => void) | null = null;
  
  // Regional tracking for cleanup
  private regionalFeatures: Map<string, THREE.Object3D[]> = new Map();
  
  // Rock spawning configuration
  private readonly rockConfig: RockSpawnConfig = {
    density: 0.8,
    minDistance: 2.0,
    maxDistance: 15.0,
    tavernExclusionRadius: 8,
    minimumLargeRockDistance: 150
  };

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    
    // Initialize rock spawning system
    RockSpawning.initialize();
    
    console.log('🪨 TerrainFeatureGenerator initialized with modular rock system');
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.regionalFeatures.has(regionKey)) {
      console.log(`Features already generated for region ${regionKey}`);
      return;
    }

    console.log(`🌍 Generating terrain features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    let regionSize: number;
    if (region.ringIndex === 0) {
      regionSize = ringDef.outerRadius * 2;
    } else {
      regionSize = (ringDef.outerRadius - ringDef.innerRadius) * 1.2;
    }

    const features: THREE.Object3D[] = [];
    
    // Generate rocks using the new modular system
    const rocks = RockSpawning.spawnRocksInRegion(
      centerPosition,
      regionSize,
      this.rockConfig,
      this.scene,
      this.collisionRegistrationCallback
    );
    
    features.push(...rocks);
    
    // Generate other terrain features
    this.generateVegetation(centerPosition, regionSize, features);
    this.generateBoulderFormations(centerPosition, regionSize, features);
    
    this.regionalFeatures.set(regionKey, features);
    
    console.log(`✅ Generated ${features.length} terrain features for region ${regionKey}`);
  }

  private generateVegetation(center: THREE.Vector3, size: number, features: THREE.Object3D[]): void {
    const vegetationCount = Math.floor(size * size * 0.0003);
    
    for (let i = 0; i < vegetationCount; i++) {
      const position = new THREE.Vector3(
        center.x + (Math.random() - 0.5) * size,
        0,
        center.z + (Math.random() - 0.5) * size
      );
      
      // Skip if too close to tavern
      if (position.distanceTo(new THREE.Vector3(0, 0, 0)) < 12) {
        continue;
      }
      
      const vegetation = this.createVegetation(position);
      this.scene.add(vegetation);
      features.push(vegetation);
      
      if (this.collisionRegistrationCallback) {
        this.collisionRegistrationCallback(vegetation);
      }
    }
  }

  private createVegetation(position: THREE.Vector3): THREE.Group {
    const vegetationGroup = new THREE.Group();
    
    // Create small bush or grass clump
    const bushCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < bushCount; i++) {
      const bushGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 6, 4);
      const bushMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3, 0.6 + Math.random() * 0.3, 0.3 + Math.random() * 0.2),
        roughness: 1.0
      });
      
      const bush = new THREE.Mesh(bushGeometry, bushMaterial);
      bush.position.set(
        (Math.random() - 0.5) * 0.3,
        0.05 + Math.random() * 0.05,
        (Math.random() - 0.5) * 0.3
      );
      bush.castShadow = true;
      bush.receiveShadow = true;
      
      vegetationGroup.add(bush);
    }
    
    vegetationGroup.position.copy(position);
    return vegetationGroup;
  }

  private generateBoulderFormations(center: THREE.Vector3, size: number, features: THREE.Object3D[]): void {
    // Occasional large boulder formations (rare)
    if (Math.random() > 0.95) {
      const boulderPosition = new THREE.Vector3(
        center.x + (Math.random() - 0.5) * size * 0.8,
        0,
        center.z + (Math.random() - 0.5) * size * 0.8
      );
      
      // Skip if too close to tavern
      if (boulderPosition.distanceTo(new THREE.Vector3(0, 0, 0)) < 15) {
        return;
      }
      
      const boulderFormation = this.createBoulderFormation(boulderPosition);
      features.push(...boulderFormation);
    }
  }

  private createBoulderFormation(position: THREE.Vector3): THREE.Mesh[] {
    const boulders: THREE.Mesh[] = [];
    const boulderCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < boulderCount; i++) {
      const boulderSize = 1.5 + Math.random() * 2.0;
      const boulderGeometry = new THREE.SphereGeometry(boulderSize, 8, 6);
      
      // Deform the boulder
      const positions = boulderGeometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const x = positions.getX(j);
        const y = positions.getY(j);
        const z = positions.getZ(j);
        
        const noise = (Math.random() - 0.5) * 0.4;
        positions.setXYZ(j, x + noise, y + noise, z + noise);
      }
      boulderGeometry.computeVertexNormals();
      
      const boulderMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.8,
        metalness: 0.1
      });
      
      const boulder = new THREE.Mesh(boulderGeometry, boulderMaterial);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 3;
      boulder.position.set(
        position.x + Math.cos(angle) * distance,
        boulderSize * 0.5,
        position.z + Math.sin(angle) * distance
      );
      
      boulder.rotation.set(
        (Math.random() - 0.5) * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * Math.PI * 0.3
      );
      
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      
      this.scene.add(boulder);
      boulders.push(boulder);
      
      if (this.collisionRegistrationCallback) {
        this.collisionRegistrationCallback(boulder);
      }
    }
    
    return boulders;
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.regionalFeatures.get(regionKey);
    
    if (!features) {
      return;
    }
    
    console.log(`🧹 Cleaning up ${features.length} terrain features for region ${regionKey}`);
    
    features.forEach(feature => {
      this.scene.remove(feature);
      
      if (feature instanceof THREE.Mesh) {
        if (feature.geometry) feature.geometry.dispose();
        if (feature.material) {
          if (Array.isArray(feature.material)) {
            feature.material.forEach(mat => mat.dispose());
          } else {
            feature.material.dispose();
          }
        }
      } else if (feature instanceof THREE.Group) {
        feature.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    });
    
    // Clear from rock spawning tracking
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const regionSize = region.ringIndex === 0 ? ringDef.outerRadius * 2 : (ringDef.outerRadius - ringDef.innerRadius) * 1.2;
    
    RockSpawning.clearRegion(centerPosition, regionSize);
    
    this.regionalFeatures.delete(regionKey);
  }

  public dispose(): void {
    console.log('🧹 Disposing TerrainFeatureGenerator and modular rock system');
    
    // Clean up all regional features
    for (const [regionKey, features] of this.regionalFeatures.entries()) {
      features.forEach(feature => {
        this.scene.remove(feature);
        
        if (feature instanceof THREE.Mesh) {
          if (feature.geometry) feature.geometry.dispose();
          if (feature.material) {
            if (Array.isArray(feature.material)) {
              feature.material.forEach(mat => mat.dispose());
            } else {
              feature.material.dispose();
            }
          }
        }
      });
    }
    
    this.regionalFeatures.clear();
    
    // Dispose rock materials cache
    RockMaterials.dispose();
    
    console.log('✅ TerrainFeatureGenerator disposed');
  }
}
