import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';
import { ROCK_VARIATIONS } from './rocks/config/RockVariationConfig';
import { ROCK_SHAPES } from './rocks/config/RockShapeConfig';
import { RockShapeFactory } from './rocks/generators/RockShapeFactory';
import { RockClusterGenerator } from './rocks/generators/RockClusterGenerator';
import { RockMaterialGenerator } from './rocks/materials/RockMaterialGenerator';
import { EnhancedRockDistributionSystem } from './rocks/systems/EnhancedRockDistributionSystem';

export class TerrainFeatureGenerator {
  private scene: THREE.Scene;
  private ringSystem: RingQuadrantSystem;
  private rockClusterGenerator: RockClusterGenerator;
  private enhancedRockSystem: EnhancedRockDistributionSystem;
  
  // Feature tracking
  private regionFeatures: Map<string, THREE.Object3D[]> = new Map();
  private collisionRegistrationCallback?: (object: THREE.Object3D) => void;

  constructor(ringSystem: RingQuadrantSystem, scene: THREE.Scene) {
    this.ringSystem = ringSystem;
    this.scene = scene;
    this.rockClusterGenerator = new RockClusterGenerator();
    this.enhancedRockSystem = new EnhancedRockDistributionSystem();
    
    console.log("🌍 TerrainFeatureGenerator initialized with enhanced rock distribution system");
  }

  public setCollisionRegistrationCallback(callback: (object: THREE.Object3D) => void): void {
    this.collisionRegistrationCallback = callback;
  }

  public generateFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.regionFeatures.has(regionKey)) {
      return;
    }

    console.log(`🪨 Generating enhanced features for region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);

    const centerPosition = this.ringSystem.getRegionCenter(region);
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const regionSize = region.ringIndex === 0 ? ringDef.outerRadius * 2 : 100;

    // Generate rocks using enhanced distribution system
    const rockPlacements = this.enhancedRockSystem.generateRockDistribution(
      region,
      centerPosition,
      regionSize
    );

    const features: THREE.Object3D[] = [];

    // Create actual rock objects from placement data
    for (let i = 0; i < rockPlacements.length; i++) {
      const placement = rockPlacements[i];
      
      if (placement.variation.isCluster) {
        // Create cluster using existing cluster generator
        const clusterGroup = new THREE.Group();
        clusterGroup.position.copy(placement.position);
        
        this.rockClusterGenerator.createVariedRockCluster(
          clusterGroup,
          placement.variation,
          i,
          this.createCharacterBaseGeometry.bind(this),
          this.applyShapeModifications.bind(this),
          this.applyCharacterDeformation.bind(this),
          this.validateAndEnhanceGeometry.bind(this)
        );
        
        features.push(clusterGroup);
        this.scene.add(clusterGroup);
        
        if (this.collisionRegistrationCallback) {
          this.collisionRegistrationCallback(clusterGroup);
        }
      } else {
        // Create individual rock
        const rock = this.createIndividualRock(placement, i);
        if (rock) {
          features.push(rock);
          this.scene.add(rock);
          
          if (this.collisionRegistrationCallback) {
            this.collisionRegistrationCallback(rock);
          }
        }
      }
    }

    this.regionFeatures.set(regionKey, features);
    
    console.log(`✅ Generated ${features.length} enhanced rock features for region ${regionKey}`);
    
    // Log discovery zones for this region
    const discoveryZones = this.enhancedRockSystem.getDiscoveryZones(region);
    console.log(`🗺️ Region ${regionKey} has ${discoveryZones.length} discovery zones for future development`);
  }

  private createIndividualRock(placement: any, index: number): THREE.Object3D | null {
    const variation = placement.variation;
    const rockShape = ROCK_SHAPES[index % ROCK_SHAPES.length];
    
    const [minSize, maxSize] = variation.sizeRange;
    const rockSize = minSize + Math.random() * (maxSize - minSize);
    
    // Create base geometry
    let geometry = this.createCharacterBaseGeometry(rockShape, rockSize);
    
    // Apply modifications
    this.applyShapeModifications(geometry, rockShape, rockSize);
    this.applyCharacterDeformation(geometry, rockShape.deformationIntensity, rockSize, rockShape);
    this.validateAndEnhanceGeometry(geometry);
    
    // Create material with special properties for navigational rocks
    let material;
    if (placement.isLandmark) {
      // Landmarks get special materials to make them more visible
      material = RockMaterialGenerator.createEnhancedRockMaterial('landmark', rockShape, index);
      const currentColor = material.color;
      currentColor.lerp(new THREE.Color(0x8B7355), 0.3); // Slightly different hue
    } else if (placement.isCorridorMarker) {
      // Corridor markers are more weathered/distinctive
      material = RockMaterialGenerator.createEnhancedRockMaterial('marker', rockShape, index);
      material.roughness = Math.min(1.0, material.roughness + 0.2);
    } else {
      material = RockMaterialGenerator.createEnhancedRockMaterial(variation.category, rockShape, index);
    }
    
    const rock = new THREE.Mesh(geometry, material);
    rock.position.copy(placement.position);
    
    // Apply natural rotation
    rock.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    return rock;
  }

  private createCharacterBaseGeometry(rockShape: any, rockSize: number): THREE.BufferGeometry {
    let baseGeometry: THREE.BufferGeometry;
    
    switch (rockShape.baseGeometry) {
      case 'icosahedron':
        baseGeometry = new THREE.IcosahedronGeometry(rockSize, 2);
        break;
      case 'sphere':
        baseGeometry = new THREE.SphereGeometry(rockSize, 16, 12);
        break;
      case 'dodecahedron':
        baseGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
        break;
      default:
        baseGeometry = new THREE.IcosahedronGeometry(rockSize, 2);
    }
    
    return baseGeometry;
  }

  private applyShapeModifications(geometry: THREE.BufferGeometry, rockShape: any, rockSize: number): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      switch (rockShape.shapeModifier) {
        case 'stretch':
          vertex.y *= 1.5 + Math.random() * 0.5;
          break;
        case 'flatten':
          vertex.y *= 0.4 + Math.random() * 0.3;
          break;
        case 'fracture':
          const fracture = Math.sin(vertex.x * 5) * Math.sin(vertex.z * 5) * 0.1;
          vertex.y += fracture;
          break;
        case 'erode':
          const erosion = Math.random() * 0.1;
          vertex.normalize().multiplyScalar(vertex.length() - erosion);
          break;
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private applyCharacterDeformation(geometry: THREE.BufferGeometry, intensity: number, rockSize: number, rockShape: any): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      const noise = Math.sin(vertex.x * 3) * Math.cos(vertex.y * 3) * Math.sin(vertex.z * 3);
      const deformation = noise * intensity * 0.2;
      
      vertex.normalize().multiplyScalar(vertex.length() + deformation);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private validateAndEnhanceGeometry(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
  }

  public cleanupFeaturesForRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const features = this.regionFeatures.get(regionKey);
    
    if (!features) return;
    
    for (const feature of features) {
      this.scene.remove(feature);
      
      if (feature instanceof THREE.Mesh) {
        if (feature.geometry) feature.geometry.dispose();
        if (feature.material) {
          if (Array.isArray(feature.material)) {
            feature.material.forEach(m => m.dispose());
          } else {
            feature.material.dispose();
          }
        }
      } else if (feature instanceof THREE.Group) {
        feature.traverse((child) => {
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
    
    this.regionFeatures.delete(regionKey);
    console.log(`🧹 Cleaned up enhanced features for region ${regionKey}`);
  }

  public dispose(): void {
    for (const [regionKey, features] of this.regionFeatures.entries()) {
      const region = this.parseRegionKey(regionKey);
      if (region) {
        this.cleanupFeaturesForRegion(region);
      }
    }
    this.regionFeatures.clear();
    console.log("🧹 TerrainFeatureGenerator disposed");
  }

  private parseRegionKey(regionKey: string): RegionCoordinates | null {
    const parts = regionKey.split('-');
    if (parts.length === 2) {
      return {
        ringIndex: parseInt(parts[0]),
        quadrant: parseInt(parts[1])
      };
    }
    return null;
  }

  // Public access to discovery zone data for future development
  public getAllDiscoveryZones() {
    return this.enhancedRockSystem.getAllDiscoveryZones();
  }

  public getBuildableZones() {
    return this.enhancedRockSystem.getZonesForBuilding();
  }
}
