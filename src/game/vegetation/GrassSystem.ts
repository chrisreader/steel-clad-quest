import * as THREE from 'three';
import { GrassGeometry, GrassBladeConfig } from './GrassGeometry';
import { GrassShader } from './GrassShader';
import { RegionCoordinates } from '../world/RingQuadrantSystem';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES } from '../config/DayNightConfig';

export interface GrassConfig {
  baseDensity: number;
  patchDensity: number;
  patchCount: number;
  maxDistance: number;
  lodLevels: number[];
}

export class GrassSystem {
  private scene: THREE.Scene;
  private grassInstances: Map<string, THREE.InstancedMesh> = new Map();
  private grassMaterials: Map<number, THREE.ShaderMaterial> = new Map();
  private grassGeometries: THREE.BufferGeometry[] = [];
  private renderDistance: number = 150; // Reduced for better performance
  private time: number = 0;
  private renderEngine: any; // Reference to register grass instances
  
  private config: GrassConfig = {
    baseDensity: 0.8, // Slightly reduced for performance
    patchDensity: 2.5, // Reduced from 3
    patchCount: 5, // Reduced from 6
    maxDistance: 150, // Reduced from 200
    lodLevels: [1.0, 0.7, 0.4, 0.15] // More aggressive LOD
  };
  
  constructor(scene: THREE.Scene, renderEngine?: any) {
    this.scene = scene;
    this.renderEngine = renderEngine;
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
    
    console.log(`🌱 Generating optimized grass for region ${region.ringIndex}-${region.quadrant}`);
    
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
    
    // Create instanced mesh with optimized settings
    const geometry = this.grassGeometries[region.ringIndex % this.grassGeometries.length];
    const instancedMesh = new THREE.InstancedMesh(geometry, material, grassData.positions.length);
    
    // Set instance data with improved positioning
    for (let i = 0; i < grassData.positions.length; i++) {
      const matrix = new THREE.Matrix4();
      
      // Ensure grass is properly positioned above ground
      const adjustedPosition = grassData.positions[i].clone();
      adjustedPosition.y = Math.max(0.05, adjustedPosition.y);
      
      matrix.compose(
        adjustedPosition,
        grassData.rotations[i],
        grassData.scales[i]
      );
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = false; // Disable for performance
    instancedMesh.receiveShadow = true;
    instancedMesh.userData.isGrass = true; // Mark as grass for special handling
    instancedMesh.userData.regionKey = regionKey;
    
    // Register with render engine for optimized culling
    if (this.renderEngine && this.renderEngine.registerGrassInstance) {
      this.renderEngine.registerGrassInstance(instancedMesh);
    }
    
    this.scene.add(instancedMesh);
    this.grassInstances.set(regionKey, instancedMesh);
    
    console.log(`✅ Generated ${grassData.positions.length} optimized grass blades for region ${regionKey}`);
  }
  
  private generateGrassDistribution(centerPosition: THREE.Vector3, size: number, region: RegionCoordinates) {
    const positions: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const scales: THREE.Vector3[] = [];
    
    const halfSize = size / 2;
    const baseSpacing = 1.2 / Math.sqrt(this.config.baseDensity); // Slightly increased spacing
    
    // Generate sparse base grass coverage with optimized density
    for (let x = -halfSize; x < halfSize; x += baseSpacing) {
      for (let z = -halfSize; z < halfSize; z += baseSpacing) {
        if (Math.random() < 0.65) { // Reduced from 0.7
          const pos = new THREE.Vector3(
            centerPosition.x + x + (Math.random() - 0.5) * baseSpacing * 0.8,
            0.15 + region.ringIndex * 0.008, // Slightly reduced base height
            centerPosition.z + z + (Math.random() - 0.5) * baseSpacing * 0.8
          );
          
          positions.push(pos);
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.random() * Math.PI * 2
          ));
          
          // Optimized grass scales for better performance and appearance
          scales.push(new THREE.Vector3(
            1.2 + Math.random() * 0.4, // Slightly smaller
            0.8 + Math.random() * 0.4, // Reduced height variation
            1.2 + Math.random() * 0.4
          ));
        }
      }
    }
    
    // Generate dense patches with reduced count for performance
    for (let p = 0; p < this.config.patchCount; p++) {
      const patchCenter = new THREE.Vector3(
        centerPosition.x + (Math.random() - 0.5) * size * 0.8,
        0.15 + region.ringIndex * 0.008,
        centerPosition.z + (Math.random() - 0.5) * size * 0.8
      );
      
      const patchRadius = 3.5 + Math.random() * 2; // Slightly smaller patches
      const patchDensity = this.config.baseDensity * this.config.patchDensity;
      const patchSpacing = 1 / Math.sqrt(patchDensity);
      
      for (let x = -patchRadius; x < patchRadius; x += patchSpacing) {
        for (let z = -patchRadius; z < patchRadius; z += patchSpacing) {
          const distance = Math.sqrt(x * x + z * z);
          if (distance < patchRadius && Math.random() < 0.85) { // Reduced from 0.9
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
            
            // Optimized dense patch grass
            scales.push(new THREE.Vector3(
              1.6 + Math.random() * 0.4, // Reduced from 2.0
              1.0 + Math.random() * 0.6, // Reduced height
              1.6 + Math.random() * 0.4
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
    
    // Create brighter, more visible grass color
    const grassR = Math.max(0, Math.min(255, r - 20)) / 255;
    const grassG = Math.max(0, Math.min(255, g + 20)) / 255; // Brighter green
    const grassB = Math.max(0, Math.min(255, b - 40)) / 255;
    
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
  
  public update(deltaTime: number, playerPosition: THREE.Vector3, gameTime?: number): void {
    this.time += deltaTime;
    
    // Calculate day/night factors if game time is provided
    let nightFactor = 0;
    let dayFactor = 1;
    
    if (gameTime !== undefined) {
      nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
      dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
    }
    
    // Update wind animation and day/night cycle for all grass materials
    for (const material of this.grassMaterials.values()) {
      GrassShader.updateWindAnimation(material, this.time, 0.15 + Math.sin(this.time * 0.3) * 0.05);
      GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
    }
    
    // Remove manual fog updates - let Three.js handle it automatically
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
