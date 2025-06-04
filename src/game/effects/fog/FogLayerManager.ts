
import * as THREE from 'three';
import { FogMaterialFactory } from './FogMaterials';
import { FogGeometryFactory } from './FogGeometryFactory';

export interface LayerConfig {
  distances?: number[];
  heights?: number[];
  sizes?: number[];
  densities?: number[];
  count?: number;
}

export class FogLayerManager {
  private scene: THREE.Scene;
  private fogLayers: THREE.Mesh[] = [];
  private fogWallLayers: THREE.Mesh[] = [];
  private atmosphericLayers: THREE.Mesh[] = [];
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createMainFogLayers(): void {
    const fogConfigs = [
      { size: 180, y: 1, density: 0.2 },
      { size: 140, y: 4, density: 0.15 },
      { size: 100, y: 8, density: 0.1 }
    ];
    
    fogConfigs.forEach((config, index) => {
      const geometry = FogGeometryFactory.createFogGeometry({
        size: config.size,
        segments: 16,
        displacement: 1.5,
        type: 'plane'
      });
      
      const material = FogMaterialFactory.createUnifiedFogMaterial(0);
      material.uniforms.fogDensity.value = config.density;
      
      const fogLayer = new THREE.Mesh(geometry, material);
      fogLayer.position.y = config.y;
      fogLayer.rotation.x = -Math.PI / 2;
      
      this.fogLayers.push(fogLayer);
      this.scene.add(fogLayer);
    });
    
    console.log(`Created ${this.fogLayers.length} optimized main fog layers`);
  }

  public createFogWalls(): void {
    const layerConfigs: LayerConfig[] = [
      { distances: [25, 45, 70, 100, 140, 190], heights: [15, 18, 22, 25, 28, 30] },
      { distances: [35, 60, 90, 130, 180, 240], heights: [12, 15, 18, 20, 22, 25] },
      { distances: [50, 80, 120, 170, 230, 300], heights: [10, 12, 15, 18, 20, 22] }
    ];
    
    layerConfigs.forEach((layerConfig, layerIndex) => {
      layerConfig.distances!.forEach((distance, distanceIndex) => {
        const wallHeight = layerConfig.heights![distanceIndex];
        const wallWidth = 400 + distanceIndex * 100;
        
        // Reduced wall count for better performance
        for (let i = 0; i < 16; i++) {
          const geometry = FogGeometryFactory.createFogGeometry({
            size: wallWidth,
            height: wallHeight,
            segments: 16,
            displacement: 1.5,
            type: 'wall'
          });
          
          const material = FogMaterialFactory.createFogWallMaterial();
          const wall = new THREE.Mesh(geometry, material);
          
          const angle = (i / 16) * Math.PI * 2;
          wall.position.x = Math.cos(angle) * distance;
          wall.position.z = Math.sin(angle) * distance;
          wall.position.y = wallHeight / 2 - 2;
          wall.rotation.y = angle + Math.PI / 2;
          
          const wallDensity = 0.02 + (distanceIndex * 0.008) + (layerIndex * 0.005);
          material.uniforms.fogDensity.value = wallDensity;
          material.uniforms.layerDepth.value = layerIndex * 0.3;
          material.uniforms.fogWallHeight.value = wallHeight;
          
          // Store metadata for updates
          (wall as any).baseDistance = distance;
          (wall as any).wallIndex = i;
          (wall as any).layerIndex = layerIndex;
          (wall as any).distanceIndex = distanceIndex;
          
          this.fogWallLayers.push(wall);
          this.scene.add(wall);
        }
      });
    });
    
    console.log(`Created ${this.fogWallLayers.length} optimized fog walls`);
  }

  public createAtmosphericLayers(): void {
    const atmosphericConfigs = [
      { distance: 200, size: 600, height: 20, density: 0.04 },
      { distance: 300, size: 800, height: 28, density: 0.055 },
      { distance: 400, size: 1000, height: 36, density: 0.07 }
    ];
    
    atmosphericConfigs.forEach((config, index) => {
      const geometry = FogGeometryFactory.createFogGeometry({
        size: config.size,
        segments: 12,
        displacement: 0.8,
        type: 'plane'
      });
      
      const material = FogMaterialFactory.createAtmosphericFogMaterial();
      material.uniforms.atmosphericDensity.value = config.density;
      material.uniforms.maxAtmosphericDistance.value = config.distance + 100;
      
      const atmosphericFog = new THREE.Mesh(geometry, material);
      atmosphericFog.position.y = config.height;
      atmosphericFog.rotation.x = -Math.PI / 2;
      
      this.atmosphericLayers.push(atmosphericFog);
      this.scene.add(atmosphericFog);
    });
    
    console.log(`Created ${this.atmosphericLayers.length} optimized atmospheric layers`);
  }

  public updateLayers(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3): void {
    const updateData = this.calculateUpdateData(timeOfDay);
    
    // Update main fog layers
    this.updateMainFogLayers(deltaTime, timeOfDay, playerPosition, updateData);
    
    // Update fog walls
    this.updateFogWalls(deltaTime, timeOfDay, playerPosition, updateData);
    
    // Update atmospheric layers
    this.updateAtmosphericLayers(deltaTime, timeOfDay, playerPosition, updateData);
  }

  private calculateUpdateData(timeOfDay: number) {
    const darknessFactor = this.getDarknessFactor(timeOfDay);
    const transitionFactor = this.getTransitionFactor(timeOfDay);
    
    return {
      densityMultiplier: 1.0 + (darknessFactor * 1.8) + (transitionFactor * 0.3),
      maxDistance: 300 - (darknessFactor * 100),
      maxOpacity: 0.35 + (darknessFactor * 0.3),
      blendingAlpha: darknessFactor * (1.0 - transitionFactor * 0.3)
    };
  }

  private getDarknessFactor(timeOfDay: number): number {
    if (timeOfDay >= 0.35 && timeOfDay <= 0.65) {
      return 0.0;
    } else if (timeOfDay >= 0.25 && timeOfDay < 0.35) {
      const factor = (timeOfDay - 0.25) / 0.1;
      return 1.0 - this.smoothStep(0.0, 1.0, factor);
    } else if (timeOfDay > 0.65 && timeOfDay <= 0.75) {
      const factor = (timeOfDay - 0.65) / 0.1;
      return this.smoothStep(0.0, 1.0, factor);
    } else {
      return 1.0;
    }
  }

  private getTransitionFactor(timeOfDay: number): number {
    if ((timeOfDay >= 0.2 && timeOfDay <= 0.4) || (timeOfDay >= 0.6 && timeOfDay <= 0.8)) {
      if (timeOfDay >= 0.2 && timeOfDay <= 0.4) {
        const center = 0.3;
        const distance = Math.abs(timeOfDay - center);
        return 1.0 - (distance / 0.1);
      } else {
        const center = 0.7;
        const distance = Math.abs(timeOfDay - center);
        return 1.0 - (distance / 0.1);
      }
    }
    return 0.0;
  }

  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  private updateMainFogLayers(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3, updateData: any): void {
    this.fogLayers.forEach((layer, index) => {
      const material = layer.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.fogDensityMultiplier.value = updateData.densityMultiplier * 0.8;
        material.uniforms.maxFogDistance.value = updateData.maxDistance;
        material.uniforms.maxFogOpacity.value = updateData.maxOpacity * 0.7;
        material.uniforms.blendingAlpha.value = updateData.blendingAlpha;
      }
      
      const lagFactor = 0.7 - index * 0.1;
      layer.position.x = THREE.MathUtils.lerp(layer.position.x, playerPosition.x, lagFactor * deltaTime);
      layer.position.z = THREE.MathUtils.lerp(layer.position.z, playerPosition.z, lagFactor * deltaTime);
    });
  }

  private updateFogWalls(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3, updateData: any): void {
    this.fogWallLayers.forEach(wall => {
      const material = wall.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.fogDensityMultiplier.value = updateData.densityMultiplier * 0.6;
        material.uniforms.maxFogDistance.value = updateData.maxDistance;
        material.uniforms.maxFogOpacity.value = updateData.maxOpacity * 0.5;
        material.uniforms.blendingAlpha.value = updateData.blendingAlpha;
      }
      
      const wallData = wall as any;
      const baseDistance = wallData.baseDistance;
      const wallIndex = wallData.wallIndex;
      
      const angle = (wallIndex / 16) * Math.PI * 2;
      wall.position.x = playerPosition.x + Math.cos(angle) * baseDistance;
      wall.position.z = playerPosition.z + Math.sin(angle) * baseDistance;
    });
  }

  private updateAtmosphericLayers(deltaTime: number, timeOfDay: number, playerPosition: THREE.Vector3, updateData: any): void {
    this.atmosphericLayers.forEach(layer => {
      const material = layer.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value += deltaTime;
        material.uniforms.timeOfDay.value = timeOfDay;
        material.uniforms.playerPosition.value.copy(playerPosition);
        material.uniforms.atmosphericMultiplier.value = updateData.densityMultiplier * 0.4;
      }
      
      layer.position.x = playerPosition.x;
      layer.position.z = playerPosition.z;
    });
  }

  public dispose(): void {
    this.fogLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    
    this.atmosphericLayers.forEach(layer => {
      this.scene.remove(layer);
      if (layer.geometry) layer.geometry.dispose();
      if (layer.material) (layer.material as THREE.Material).dispose();
    });
    
    this.fogLayers = [];
    this.fogWallLayers = [];
    this.atmosphericLayers = [];
    
    FogGeometryFactory.clearCache();
    
    console.log("Optimized fog system disposed");
  }
}
