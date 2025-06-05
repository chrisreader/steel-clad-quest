
import * as THREE from 'three';
import { GrassGeometry, GrassBladeConfig } from './GrassGeometry';
import { GrassShader } from './GrassShader';
import { RegionCoordinates } from '../world/RingQuadrantSystem';

export interface GrassConfig {
  baseDensity: number; // grass blades per square unit for sparse coverage
  patchDensity: number; // multiplier for dense patches
  patchCount: number; // number of dense patches per region
  maxDistance: number; // max render distance
  lodLevels: number[]; // density at different distances
}

export class GrassSystem {
  private scene: THREE.Scene;
  private grassInstances: Map<string, THREE.InstancedMesh> = new Map();
  private grassMaterials: Map<number, THREE.ShaderMaterial> = new Map();
  private grassGeometries: THREE.BufferGeometry[] = [];
  private renderDistance: number = 200;
  private time: number = 0;
  
  private config: GrassConfig = {
    baseDensity: 0.5, // 0.5 grass blades per square unit
    patchDensity: 4, // 4x more grass in patches
    patchCount: 8, // 8 dense patches per region
    maxDistance: 200,
    lodLevels: [1.0, 0.6, 0.3, 0.1] // density at 0-50, 50-100, 100-150, 150-200
  };
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeGrassGeometries();
  }
  
  private initializeGrassGeometries(): void {
    const grassTypes = GrassGeometry.getGrassTypes();
    
    for (const grassType of grassTypes) {
      const geometry = GrassGeometry.createGrassBladeGeometry(grassType);
      this.grassGeometries.push(geometry);
    }
    
    console.log('🌱 Grass geometries initialized:', this.grassGeometries.length, 'types');
  }
  
  public generateGrassForRegion(
    region: RegionCoordinates, 
    centerPosition: THREE.Vector3, 
    size: number,
    terrainColor: number
  ): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    
    // Skip if already generated
    if (this.grassInstances.has(regionKey)) return;
    
    console.log(`🌱 Generating grass for region ${region.ringIndex}-${region.quadrant}`);
    
    // Create or get material for this ring
    let material = this.grassMaterials.get(region.ringIndex);
    if (!material) {
      const grassColor = this.getGrassColorForRing(terrainColor, region.ringIndex);
      material = GrassShader.createGrassMaterial(grassColor, region.ringIndex);
      this.grassMaterials.set(region.ringIndex, material);
    }
    
    // Generate grass positions and properties
    const grassData = this.generateGrassDistribution(centerPosition, size, region);
    
    if (grassData.positions.length === 0) return;
    
    // Create instanced mesh
    const geometry = this.grassGeometries[region.ringIndex % this.grassGeometries.length];
    const instancedMesh = new THREE.InstancedMesh(geometry, material, grassData.positions.length);
    
    // Set instance data
    for (let i = 0; i < grassData.positions.length; i++) {
      const matrix = new THREE.Matrix4();
      matrix.compose(
        grassData.positions[i],
        grassData.rotations[i],
        grassData.scales[i]
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    
    this.scene.add(instancedMesh);
    this.grassInstances.set(regionKey, instancedMesh);
    
    console.log(`✅ Generated ${grassData.positions.length} grass blades for region ${regionKey}`);
  }
  
  private generateGrassDistribution(centerPosition: THREE.Vector3, size: number, region: RegionCoordinates) {
    const positions: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const scales: THREE.Vector3[] = [];
    
    const halfSize = size / 2;
    const baseSpacing = 1 / Math.sqrt(this.config.baseDensity);
    
    // Generate sparse base grass coverage
    for (let x = -halfSize; x < halfSize; x += baseSpacing) {
      for (let z = -halfSize; z < halfSize; z += baseSpacing) {
        if (Math.random() < 0.6) { // 60% chance for base grass
          const pos = new THREE.Vector3(
            centerPosition.x + x + (Math.random() - 0.5) * baseSpacing * 0.8,
            centerPosition.y + 0.01 + region.ringIndex * 0.005,
            centerPosition.z + z + (Math.random() - 0.5) * baseSpacing * 0.8
          );
          
          positions.push(pos);
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.random() * Math.PI * 2
          ));
          scales.push(new THREE.Vector3(
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4
          ));
        }
      }
    }
    
    // Generate dense patches
    for (let p = 0; p < this.config.patchCount; p++) {
      const patchCenter = new THREE.Vector3(
        centerPosition.x + (Math.random() - 0.5) * size * 0.8,
        centerPosition.y + 0.01 + region.ringIndex * 0.005,
        centerPosition.z + (Math.random() - 0.5) * size * 0.8
      );
      
      const patchRadius = 3 + Math.random() * 4;
      const patchDensity = this.config.baseDensity * this.config.patchDensity;
      const patchSpacing = 1 / Math.sqrt(patchDensity);
      
      for (let x = -patchRadius; x < patchRadius; x += patchSpacing) {
        for (let z = -patchRadius; z < patchRadius; z += patchSpacing) {
          const distance = Math.sqrt(x * x + z * z);
          if (distance < patchRadius && Math.random() < 0.8) {
            const pos = new THREE.Vector3(
              patchCenter.x + x + (Math.random() - 0.5) * patchSpacing * 0.5,
              patchCenter.y,
              patchCenter.z + z + (Math.random() - 0.5) * patchSpacing * 0.5
            );
            
            positions.push(pos);
            rotations.push(new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              Math.random() * Math.PI * 2
            ));
            
            // Slightly larger grass in dense patches
            scales.push(new THREE.Vector3(
              1.0 + Math.random() * 0.3,
              1.0 + Math.random() * 0.3,
              1.0 + Math.random() * 0.3
            ));
          }
        }
      }
    }
    
    return { positions, rotations, scales };
  }
  
  private getGrassColorForRing(terrainColor: number, ringIndex: number): THREE.Color {
    // Extract RGB from terrain color
    const r = (terrainColor >> 16) & 255;
    const g = (terrainColor >> 8) & 255;
    const b = terrainColor & 255;
    
    // Create slightly darker, more saturated grass color
    const grassR = Math.max(0, (r - 40)) / 255;
    const grassG = Math.min(255, (g - 20)) / 255;
    const grassB = Math.max(0, (b - 60)) / 255;
    
    return new THREE.Color(grassR, grassG, grassB);
  }
  
  public removeGrassForRegion(region: RegionCoordinates): void {
    const regionKey = `grass_r${region.ringIndex}_q${region.quadrant}`;
    const instancedMesh = this.grassInstances.get(regionKey);
    
    if (instancedMesh) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
      this.grassInstances.delete(regionKey);
      console.log(`🌱 Removed grass for region ${regionKey}`);
    }
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.time += deltaTime;
    
    // Update wind animation for all grass materials
    for (const material of this.grassMaterials.values()) {
      GrassShader.updateWindAnimation(material, this.time, 0.2 + Math.sin(this.time * 0.5) * 0.1);
    }
    
    // Update fog uniforms if scene has fog
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      for (const material of this.grassMaterials.values()) {
        if (material.uniforms.fogColor) {
          material.uniforms.fogColor.value.copy(this.scene.fog.color);
        }
        if (material.uniforms.fogNear) {
          material.uniforms.fogNear.value = this.scene.fog.near;
        }
        if (material.uniforms.fogFar) {
          material.uniforms.fogFar.value = this.scene.fog.far;
        }
      }
    }
  }
  
  public dispose(): void {
    // Clean up all grass instances
    for (const [regionKey, instancedMesh] of this.grassInstances.entries()) {
      this.scene.remove(instancedMesh);
      instancedMesh.geometry.dispose();
    }
    this.grassInstances.clear();
    
    // Clean up materials
    for (const material of this.grassMaterials.values()) {
      material.dispose();
    }
    this.grassMaterials.clear();
    
    // Clean up geometries
    for (const geometry of this.grassGeometries) {
      geometry.dispose();
    }
    this.grassGeometries.length = 0;
    
    console.log('🌱 GrassSystem disposed');
  }
}
