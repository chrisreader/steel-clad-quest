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
  private renderDistance: number = 200;
  private time: number = 0;
  
  // Performance optimization variables
  private updateCounter: number = 0;
  private lastFogUpdate: number = 0;
  private cachedFogValues: { color: THREE.Color; near: number; far: number } | null = null;
  private readonly MATERIAL_UPDATE_INTERVAL: number = 3; // Update materials every 3rd frame
  private readonly FOG_CHECK_INTERVAL: number = 100; // Check fog changes every 100ms
  
  private config: GrassConfig = {
    baseDensity: 0.8, // Slightly reduced for performance
    patchDensity: 2.5, // Reduced from 3
    patchCount: 5, // Reduced from 6
    maxDistance: 180, // Reduced from 200
    lodLevels: [1.0, 0.5, 0.25, 0.1] // More aggressive LOD
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
    
    if (this.grassInstances.has(regionKey)) return;
    
    console.log(`🌱 Generating optimized grass for region ${region.ringIndex}-${region.quadrant}`);
    
    // Create or get material for this ring
    let material = this.grassMaterials.get(region.ringIndex);
    if (!material) {
      const grassColor = this.getGrassColorForRing(terrainColor, region.ringIndex);
      material = GrassShader.createGrassMaterial(grassColor, region.ringIndex);
      this.grassMaterials.set(region.ringIndex, material);
    }
    
    // Generate grass with distance-based LOD
    const playerDistance = centerPosition.length();
    const lodLevel = this.getLODLevel(playerDistance);
    const grassData = this.generateOptimizedGrassDistribution(centerPosition, size, region, lodLevel);
    
    if (grassData.positions.length === 0) return;
    
    // Create instanced mesh
    const geometry = this.grassGeometries[region.ringIndex % this.grassGeometries.length];
    const instancedMesh = new THREE.InstancedMesh(geometry, material, grassData.positions.length);
    
    // Set instance data
    for (let i = 0; i < grassData.positions.length; i++) {
      const matrix = new THREE.Matrix4();
      const adjustedPosition = grassData.positions[i].clone();
      adjustedPosition.y = Math.max(0.1, adjustedPosition.y);
      
      matrix.compose(
        adjustedPosition,
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
    
    console.log(`✅ Generated ${grassData.positions.length} grass blades for region ${regionKey} (LOD: ${lodLevel})`);
  }
  
  private getLODLevel(distance: number): number {
    if (distance < 50) return this.config.lodLevels[0];
    if (distance < 100) return this.config.lodLevels[1];
    if (distance < 150) return this.config.lodLevels[2];
    return this.config.lodLevels[3];
  }
  
  private generateOptimizedGrassDistribution(
    centerPosition: THREE.Vector3, 
    size: number, 
    region: RegionCoordinates,
    lodMultiplier: number
  ) {
    const positions: THREE.Vector3[] = [];
    const rotations: THREE.Quaternion[] = [];
    const scales: THREE.Vector3[] = [];
    
    const halfSize = size / 2;
    const adjustedDensity = this.config.baseDensity * lodMultiplier;
    const baseSpacing = 1 / Math.sqrt(adjustedDensity);
    
    // Generate base grass with LOD
    for (let x = -halfSize; x < halfSize; x += baseSpacing) {
      for (let z = -halfSize; z < halfSize; z += baseSpacing) {
        if (Math.random() < 0.6 * lodMultiplier) { // Adjusted probability with LOD
          const pos = new THREE.Vector3(
            centerPosition.x + x + (Math.random() - 0.5) * baseSpacing * 0.8,
            0.15 + region.ringIndex * 0.01,
            centerPosition.z + z + (Math.random() - 0.5) * baseSpacing * 0.8
          );
          
          positions.push(pos);
          rotations.push(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.random() * Math.PI * 2
          ));
          
          scales.push(new THREE.Vector3(
            1.2 + Math.random() * 0.4,
            0.8 + Math.random() * 0.4, // Reduced height for performance
            1.2 + Math.random() * 0.4
          ));
        }
      }
    }
    
    // Generate patches with LOD
    const adjustedPatchCount = Math.floor(this.config.patchCount * lodMultiplier);
    for (let p = 0; p < adjustedPatchCount; p++) {
      const patchCenter = new THREE.Vector3(
        centerPosition.x + (Math.random() - 0.5) * size * 0.7,
        0.15 + region.ringIndex * 0.01,
        centerPosition.z + (Math.random() - 0.5) * size * 0.7
      );
      
      const patchRadius = 3 + Math.random() * 2;
      const patchDensity = adjustedDensity * this.config.patchDensity;
      const patchSpacing = 1 / Math.sqrt(patchDensity);
      
      for (let x = -patchRadius; x < patchRadius; x += patchSpacing) {
        for (let z = -patchRadius; z < patchRadius; z += patchSpacing) {
          const distance = Math.sqrt(x * x + z * z);
          if (distance < patchRadius && Math.random() < 0.8 * lodMultiplier) {
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
            
            scales.push(new THREE.Vector3(
              1.6 + Math.random() * 0.4,
              1.0 + Math.random() * 0.6,
              1.6 + Math.random() * 0.4
            ));
          }
        }
      }
    }
    
    return { positions, rotations, scales };
  }
  
  private getGrassColorForRing(terrainColor: number, ringIndex: number): THREE.Color {
    const r = (terrainColor >> 16) & 255;
    const g = (terrainColor >> 8) & 255;
    const b = terrainColor & 255;
    
    const grassR = Math.max(0, Math.min(255, r - 20)) / 255;
    const grassG = Math.max(0, Math.min(255, g + 15)) / 255;
    const grassB = Math.max(0, Math.min(255, b - 35)) / 255;
    
    return new THREE.Color(grassR, grassG, grassB);
  }
  
  private checkFogChanges(): boolean {
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) return false;
    
    const now = performance.now();
    if (now - this.lastFogUpdate < this.FOG_CHECK_INTERVAL) return false;
    
    const currentFog = {
      color: this.scene.fog.color.clone(),
      near: this.scene.fog.near,
      far: this.scene.fog.far
    };
    
    if (!this.cachedFogValues || 
        !this.cachedFogValues.color.equals(currentFog.color) ||
        this.cachedFogValues.near !== currentFog.near ||
        this.cachedFogValues.far !== currentFog.far) {
      
      this.cachedFogValues = currentFog;
      this.lastFogUpdate = now;
      return true;
    }
    
    return false;
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
    this.updateCounter++;
    
    // Only update materials every few frames for performance
    if (this.updateCounter % this.MATERIAL_UPDATE_INTERVAL === 0) {
      // Calculate day/night factors
      let nightFactor = 0;
      let dayFactor = 1;
      
      if (gameTime !== undefined) {
        nightFactor = TimeUtils.getSynchronizedNightFactor(gameTime, TIME_PHASES);
        dayFactor = TimeUtils.getDayFactor(gameTime, TIME_PHASES);
      }
      
      // Update wind animation and day/night cycle
      const windStrength = 0.15 + Math.sin(this.time * 0.4) * 0.08; // Reduced for performance
      
      for (const material of this.grassMaterials.values()) {
        GrassShader.updateWindAnimation(material, this.time, windStrength);
        GrassShader.updateDayNightCycle(material, nightFactor, dayFactor);
      }
      
      // Update fog uniforms only when fog actually changes
      if (this.checkFogChanges() && this.cachedFogValues) {
        for (const material of this.grassMaterials.values()) {
          if (material.uniforms.fogColor) {
            material.uniforms.fogColor.value.copy(this.cachedFogValues.color);
          }
          if (material.uniforms.fogNear) {
            material.uniforms.fogNear.value = this.cachedFogValues.near;
          }
          if (material.uniforms.fogFar) {
            material.uniforms.fogFar.value = this.cachedFogValues.far;
          }
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
