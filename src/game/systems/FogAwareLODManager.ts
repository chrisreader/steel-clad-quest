import * as THREE from 'three';
import { FogSynchronizedRenderConfig } from '../config/FogSynchronizedRenderConfig';

export interface FogLODObject {
  id: string;
  object: THREE.Object3D;
  position: THREE.Vector3;
  originalMaterial?: THREE.Material | THREE.Material[];
  simplifiedMaterial?: THREE.Material | THREE.Material[];
  currentQuality: 'ultra' | 'high' | 'medium' | 'low' | 'culled';
  isVisible: boolean;
  distanceFromPlayer: number;
  objectType: 'vegetation' | 'rocks' | 'enemies' | 'effects' | 'clouds' | 'birds';
}

export interface FogRing {
  minDistance: number;
  maxDistance: number;
  quality: 'ultra' | 'high' | 'medium' | 'low';
  objects: Set<FogLODObject>;
  densityMultiplier: number;
}

export class FogAwareLODManager {
  private objects: Map<string, FogLODObject> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private scene: THREE.Scene;
  
  // FOG RINGS - Different quality levels at different fog depths
  private fogRings: FogRing[] = [
    {
      minDistance: 0,
      maxDistance: 50,
      quality: 'ultra',
      objects: new Set(),
      densityMultiplier: 2.0
    },
    {
      minDistance: 50,
      maxDistance: 100,
      quality: 'high',
      objects: new Set(),
      densityMultiplier: 1.5
    },
    {
      minDistance: 100,
      maxDistance: 200,
      quality: 'medium',
      objects: new Set(),
      densityMultiplier: 1.0
    },
    {
      minDistance: 200,
      maxDistance: 300,
      quality: 'low',
      objects: new Set(),
      densityMultiplier: 0.3
    }
  ];

  // PERFORMANCE TRACKING
  private lastUpdateTime = 0;
  private updateInterval = 16; // 60fps updates
  private culledObjectCount = 0;
  private visibleObjectCount = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🌫️ [FogLOD] Fog-Aware LOD Manager initialized with fog rings');
  }

  public addObject(
    id: string,
    object: THREE.Object3D,
    position: THREE.Vector3,
    objectType: FogLODObject['objectType']
  ): void {
    // Store original materials for quality switching
    let originalMaterial: THREE.Material | THREE.Material[] | undefined;
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !originalMaterial) {
        originalMaterial = Array.isArray(child.material) ? [...child.material] : child.material.clone();
      }
    });

    const fogObject: FogLODObject = {
      id,
      object,
      position: position.clone(),
      originalMaterial,
      currentQuality: 'ultra',
      isVisible: true,
      distanceFromPlayer: 0,
      objectType
    };

    this.objects.set(id, fogObject);
    this.updateObjectLOD(fogObject);
    
    console.log(`🌫️ [FogLOD] Added ${objectType} object ${id} to fog-aware management`);
  }

  public removeObject(id: string): void {
    const fogObject = this.objects.get(id);
    if (fogObject) {
      // Remove from fog rings
      this.fogRings.forEach(ring => ring.objects.delete(fogObject));
      
      // Dispose simplified materials if created
      if (fogObject.simplifiedMaterial) {
        if (Array.isArray(fogObject.simplifiedMaterial)) {
          fogObject.simplifiedMaterial.forEach(mat => mat.dispose());
        } else {
          fogObject.simplifiedMaterial.dispose();
        }
      }
      
      this.objects.delete(id);
      console.log(`🌫️ [FogLOD] Removed ${fogObject.objectType} object ${id}`);
    }
  }

  public updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
  }

  public update(deltaTime: number): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    // Update performance-adaptive fog system
    FogSynchronizedRenderConfig.updatePerformanceLevel(deltaTime);

    // Reset counters
    this.culledObjectCount = 0;
    this.visibleObjectCount = 0;

    // Clear fog rings
    this.fogRings.forEach(ring => ring.objects.clear());

    // Update all objects
    for (const fogObject of this.objects.values()) {
      this.updateObjectDistance(fogObject);
      this.updateObjectLOD(fogObject);
      this.assignToFogRing(fogObject);
    }

    // Batch update fog rings
    this.updateFogRings();
  }

  private updateObjectDistance(fogObject: FogLODObject): void {
    fogObject.distanceFromPlayer = fogObject.position.distanceTo(this.playerPosition);
  }

  private updateObjectLOD(fogObject: FogLODObject): void {
    const distance = fogObject.distanceFromPlayer;
    const renderDistance = FogSynchronizedRenderConfig.getRenderDistance(fogObject.objectType);
    
    // FOG-BASED CULLING - If beyond fog, completely cull
    if (FogSynchronizedRenderConfig.shouldCull(distance) || distance > renderDistance) {
      if (fogObject.isVisible) {
        fogObject.object.visible = false;
        fogObject.isVisible = false;
        fogObject.currentQuality = 'culled';
        this.culledObjectCount++;
        console.log(`🌫️ [FogLOD] Culled ${fogObject.objectType} ${fogObject.id} at distance ${distance.toFixed(1)}`);
      }
      return;
    }

    // Determine quality level
    const newQuality = FogSynchronizedRenderConfig.getQualityLevel(distance);
    
    // Update quality if changed
    if (newQuality !== fogObject.currentQuality && newQuality !== 'culled') {
      this.applyQualityLevel(fogObject, newQuality);
      fogObject.currentQuality = newQuality;
    }

    // Ensure visibility
    if (!fogObject.isVisible) {
      fogObject.object.visible = true;
      fogObject.isVisible = true;
      console.log(`🌫️ [FogLOD] Made ${fogObject.objectType} ${fogObject.id} visible at distance ${distance.toFixed(1)}`);
    }

    this.visibleObjectCount++;
  }

  private applyQualityLevel(fogObject: FogLODObject, quality: 'ultra' | 'high' | 'medium' | 'low'): void {
    const materialQuality = FogSynchronizedRenderConfig.getMaterialQuality(fogObject.distanceFromPlayer);
    
    fogObject.object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Apply shadow settings
        child.castShadow = materialQuality.shadows;
        child.receiveShadow = materialQuality.shadows;
        
        // Switch materials based on quality
        if (quality === 'ultra' || quality === 'high') {
          // Use original material
          if (fogObject.originalMaterial) {
            child.material = fogObject.originalMaterial;
          }
        } else {
          // Use simplified material
          if (!fogObject.simplifiedMaterial && fogObject.originalMaterial) {
            fogObject.simplifiedMaterial = this.createSimplifiedMaterial(fogObject.originalMaterial);
          }
          
          if (fogObject.simplifiedMaterial) {
            child.material = fogObject.simplifiedMaterial;
          }
        }
        
        // Apply transparency settings
        if (child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          if ('transparent' in material) {
            material.transparent = materialQuality.transparency;
            
            // Apply fog-based fade
            const fadeDistances = FogSynchronizedRenderConfig.getFadeDistances();
            if (fogObject.distanceFromPlayer > fadeDistances.FADE_IN_START) {
              const fadeProgress = (fogObject.distanceFromPlayer - fadeDistances.FADE_IN_START) / 
                                 (fadeDistances.FADE_OUT_COMPLETE - fadeDistances.FADE_IN_START);
              const opacity = Math.max(0.1, 1.0 - fadeProgress);
              
              if ('opacity' in material) {
                material.opacity = opacity;
                material.transparent = true;
              }
            }
          }
        }
      }
    });
  }

  private createSimplifiedMaterial(originalMaterial: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
    if (Array.isArray(originalMaterial)) {
      return originalMaterial.map(mat => this.createSingleSimplifiedMaterial(mat));
    } else {
      return this.createSingleSimplifiedMaterial(originalMaterial);
    }
  }

  private createSingleSimplifiedMaterial(material: THREE.Material): THREE.Material {
    // Create simplified material based on original type
    if (material instanceof THREE.MeshStandardMaterial) {
      return new THREE.MeshLambertMaterial({
        color: material.color,
        map: material.map,
        transparent: material.transparent,
        opacity: material.opacity * 0.8 // Slightly more transparent for distance
      });
    } else if (material instanceof THREE.MeshPhysicalMaterial) {
      return new THREE.MeshLambertMaterial({
        color: material.color,
        transparent: true,
        opacity: 0.6 // More aggressive simplification
      });
    } else {
      // Return cloned material with reduced opacity
      const simplified = material.clone();
      if ('opacity' in simplified) {
        simplified.opacity *= 0.7;
        simplified.transparent = true;
      }
      return simplified;
    }
  }

  private assignToFogRing(fogObject: FogLODObject): void {
    if (!fogObject.isVisible) return;
    
    const distance = fogObject.distanceFromPlayer;
    
    for (const ring of this.fogRings) {
      if (distance >= ring.minDistance && distance < ring.maxDistance) {
        ring.objects.add(fogObject);
        break;
      }
    }
  }

  private updateFogRings(): void {
    // Log ring statistics periodically
    const now = performance.now();
    if (now % 3000 < 100) { // Every 3 seconds
      let ringStats = '';
      this.fogRings.forEach((ring, index) => {
        ringStats += `Ring${index}(${ring.quality}): ${ring.objects.size} objects, `;
      });
      
      console.log(`🌫️ [FogLOD] ${ringStats}Culled: ${this.culledObjectCount}, Visible: ${this.visibleObjectCount}`);
    }
  }

  // BATCH OPERATIONS FOR PERFORMANCE
  public batchUpdateObjects(objectIds: string[]): void {
    const positions = objectIds.map(id => {
      const obj = this.objects.get(id);
      return obj ? obj.position : new THREE.Vector3();
    });
    
    const cullResults = FogSynchronizedRenderConfig.batchCullCheck(positions, this.playerPosition);
    
    objectIds.forEach((id, index) => {
      const fogObject = this.objects.get(id);
      if (fogObject && cullResults[index]) {
        fogObject.object.visible = false;
        fogObject.isVisible = false;
        fogObject.currentQuality = 'culled';
      }
    });
  }

  // PERFORMANCE METRICS
  public getPerformanceMetrics(): {
    totalObjects: number;
    visibleObjects: number;
    culledObjects: number;
    fogRingDistribution: { [key: string]: number };
  } {
    const ringDistribution: { [key: string]: number } = {};
    this.fogRings.forEach((ring, index) => {
      ringDistribution[`${ring.quality}_ring`] = ring.objects.size;
    });
    
    return {
      totalObjects: this.objects.size,
      visibleObjects: this.visibleObjectCount,
      culledObjects: this.culledObjectCount,
      fogRingDistribution: ringDistribution
    };
  }

  public dispose(): void {
    // Dispose all simplified materials
    for (const fogObject of this.objects.values()) {
      if (fogObject.simplifiedMaterial) {
        if (Array.isArray(fogObject.simplifiedMaterial)) {
          fogObject.simplifiedMaterial.forEach(mat => mat.dispose());
        } else {
          fogObject.simplifiedMaterial.dispose();
        }
      }
    }
    
    this.objects.clear();
    this.fogRings.forEach(ring => ring.objects.clear());
    
    console.log('🌫️ [FogLOD] Fog-Aware LOD Manager disposed');
  }
}