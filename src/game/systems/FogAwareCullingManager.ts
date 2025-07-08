import * as THREE from 'three';

export interface FogAwareLODSettings {
  closeRange: number;      // 0-100 units: Full detail
  mediumRange: number;     // 100-200 units: Medium detail
  farRange: number;        // 200-fog limit: Low detail
  cullRange: number;       // Beyond fog: Complete removal
  fogDensityFactor: number; // Multiplier for fog-based adjustments
}

export interface PerformanceMetrics {
  currentFPS: number;
  targetFPS: number;
  lastFPSCheck: number;
  frameCount: number;
}

export class FogAwareCullingManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  // Fog-synchronized settings
  private lodSettings: FogAwareLODSettings = {
    closeRange: 100,
    mediumRange: 200,
    farRange: 300,
    cullRange: 400,
    fogDensityFactor: 1.0
  };
  
  // Performance tracking
  private performanceMetrics: PerformanceMetrics = {
    currentFPS: 60,
    targetFPS: 50,
    lastFPSCheck: 0,
    frameCount: 0
  };
  
  // Culled objects pool for recycling
  private culledObjects: Map<string, THREE.Object3D[]> = new Map();
  private activeObjects: Map<string, THREE.Object3D[]> = new Map();
  
  // Dynamic fog control
  private baseFogNear: number = 10;
  private baseFogFar: number = 400;
  private adaptiveFogEnabled: boolean = true;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    
    // Initialize fog if not present
    if (!this.scene.fog) {
      this.scene.fog = new THREE.Fog(0x87CEEB, this.baseFogNear, this.baseFogFar);
    }
    
    this.extractBaseFogSettings();
    console.log('🌫️ [FogAwareCullingManager] Initialized with fog-synchronized LOD system');
  }
  
  private extractBaseFogSettings(): void {
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.baseFogNear = this.scene.fog.near;
      this.baseFogFar = this.scene.fog.far;
      
      // Sync LOD ranges with fog distances
      this.lodSettings.farRange = this.baseFogFar * 0.75; // Objects start degrading before fog
      this.lodSettings.cullRange = this.baseFogFar * 1.0; // Objects disappear at fog limit
      this.lodSettings.mediumRange = this.lodSettings.farRange * 0.67;
      this.lodSettings.closeRange = this.lodSettings.mediumRange * 0.5;
    }
  }
  
  public updateFogBasedCulling(playerPosition: THREE.Vector3, deltaTime: number): void {
    this.updatePerformanceMetrics(deltaTime);
    
    if (this.adaptiveFogEnabled) {
      this.updateAdaptiveFog();
    }
    
    this.performFogAwareCulling(playerPosition);
  }
  
  private updatePerformanceMetrics(deltaTime: number): void {
    this.performanceMetrics.frameCount++;
    const now = performance.now();
    
    // Calculate FPS every second
    if (now - this.performanceMetrics.lastFPSCheck > 1000) {
      this.performanceMetrics.currentFPS = this.performanceMetrics.frameCount;
      this.performanceMetrics.frameCount = 0;
      this.performanceMetrics.lastFPSCheck = now;
    }
  }
  
  private updateAdaptiveFog(): void {
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) return;
    
    const fps = this.performanceMetrics.currentFPS;
    const target = this.performanceMetrics.targetFPS;
    
    // Dynamically adjust fog distance based on performance
    if (fps < target - 10) {
      // Performance is poor - reduce fog distance aggressively
      const reductionFactor = 0.9;
      this.scene.fog.far = Math.max(this.baseFogFar * 0.5, this.scene.fog.far * reductionFactor);
      this.lodSettings.cullRange = this.scene.fog.far;
      this.lodSettings.farRange = this.scene.fog.far * 0.75;
    } else if (fps > target + 15) {
      // Performance is excellent - cautiously increase fog distance
      const increaseFactor = 1.02;
      this.scene.fog.far = Math.min(this.baseFogFar * 1.2, this.scene.fog.far * increaseFactor);
      this.lodSettings.cullRange = this.scene.fog.far;
      this.lodSettings.farRange = this.scene.fog.far * 0.75;
    }
  }
  
  private performFogAwareCulling(playerPosition: THREE.Vector3): void {
    this.scene.traverse((object) => {
      if (this.shouldCullObject(object)) {
        const distance = playerPosition.distanceTo(object.position);
        
        if (distance > this.lodSettings.cullRange) {
          this.cullObject(object);
        } else {
          this.updateObjectLOD(object, distance);
        }
      }
    });
  }
  
  private shouldCullObject(object: THREE.Object3D): boolean {
    // Don't cull cameras, lights, or essential objects
    if (object instanceof THREE.Camera || 
        object instanceof THREE.Light ||
        object.userData.essential) {
      return false;
    }
    
    // Only cull renderable objects
    return object instanceof THREE.Mesh || 
           object instanceof THREE.InstancedMesh ||
           object instanceof THREE.Group;
  }
  
  private cullObject(object: THREE.Object3D): void {
    if (object.visible) {
      object.visible = false;
      
      // Store for potential recycling
      const type = object.userData.type || 'generic';
      if (!this.culledObjects.has(type)) {
        this.culledObjects.set(type, []);
      }
      this.culledObjects.get(type)!.push(object);
    }
  }
  
  private updateObjectLOD(object: THREE.Object3D, distance: number): void {
    if (!object.visible) {
      object.visible = true;
    }
    
    // Apply fog-based material quality
    if (object instanceof THREE.Mesh && object.material) {
      this.updateMaterialLOD(object.material, distance);
    }
    
    // Scale instance count for InstancedMesh based on fog visibility
    if (object instanceof THREE.InstancedMesh) {
      this.updateInstancedMeshLOD(object, distance);
    }
  }
  
  private updateMaterialLOD(material: THREE.Material | THREE.Material[], distance: number): void {
    const materials = Array.isArray(material) ? material : [material];
    
    materials.forEach(mat => {
      if (mat instanceof THREE.ShaderMaterial || mat instanceof THREE.MeshStandardMaterial) {
        // Reduce quality in fog
        const fogFactor = this.calculateFogFactor(distance);
        
        if (mat.transparent !== undefined) {
          mat.transparent = fogFactor < 0.9;
        }
        
        // Reduce material complexity at distance
        if (distance > this.lodSettings.mediumRange) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = Math.min(1.0, mat.roughness + 0.2);
            mat.metalness = Math.max(0.0, mat.metalness - 0.1);
          }
        }
      }
    });
  }
  
  private updateInstancedMeshLOD(instancedMesh: THREE.InstancedMesh, distance: number): void {
    const originalCount = instancedMesh.userData.originalCount || instancedMesh.count;
    instancedMesh.userData.originalCount = originalCount;
    
    let lodFactor = 1.0;
    if (distance > this.lodSettings.closeRange) {
      lodFactor = Math.max(0.1, 1.0 - (distance - this.lodSettings.closeRange) / this.lodSettings.farRange);
    }
    
    const targetCount = Math.floor(originalCount * lodFactor);
    if (instancedMesh.count !== targetCount) {
      instancedMesh.count = targetCount;
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }
  
  private calculateFogFactor(distance: number): number {
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) return 1.0;
    
    const fogNear = this.scene.fog.near;
    const fogFar = this.scene.fog.far;
    
    return Math.max(0.0, Math.min(1.0, (fogFar - distance) / (fogFar - fogNear)));
  }
  
  // Public API
  public setAdaptiveFog(enabled: boolean): void {
    this.adaptiveFogEnabled = enabled;
  }
  
  public setTargetFPS(fps: number): void {
    this.performanceMetrics.targetFPS = fps;
  }
  
  public getFogSettings(): FogAwareLODSettings {
    return { ...this.lodSettings };
  }
  
  public getPerformanceInfo(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  public getCullStatistics(): { culled: number; active: number } {
    let culledCount = 0;
    let activeCount = 0;
    
    this.culledObjects.forEach(objects => culledCount += objects.length);
    this.activeObjects.forEach(objects => activeCount += objects.length);
    
    return { culled: culledCount, active: activeCount };
  }
  
  public dispose(): void {
    this.culledObjects.clear();
    this.activeObjects.clear();
  }
}