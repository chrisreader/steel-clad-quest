import * as THREE from 'three';
import { FOG_CONFIG, RENDER_DISTANCES } from '../config/RenderDistanceConfig';

export interface LODFeature {
  object: THREE.Object3D;
  position: THREE.Vector3;
  type: 'tree' | 'rock' | 'bush' | 'building' | 'other';
  originalMaterial?: THREE.Material | THREE.Material[];
  highDetailMaterial?: THREE.Material | THREE.Material[];
  mediumDetailMaterial?: THREE.Material | THREE.Material[];
  lowDetailMaterial?: THREE.Material | THREE.Material[];
  billboard?: THREE.Sprite;
  isActive: boolean;
  currentLOD: 'high' | 'medium' | 'low' | 'billboard' | 'culled';
  lastDistance: number;
}

export class EnhancedLODManager {
  private features: Map<string, LODFeature> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private scene: THREE.Scene;
  private frameCount: number = 0;
  
  // Performance tracking
  private lastFPS: number = 60;
  private qualityScale: number = 1.0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🎯 [EnhancedLODManager] Fog-synchronized LOD system initialized');
  }

  public addFeature(
    id: string,
    object: THREE.Object3D,
    position: THREE.Vector3,
    type: LODFeature['type']
  ): void {
    const feature: LODFeature = {
      object,
      position: position.clone(),
      type,
      originalMaterial: this.extractMaterial(object),
      isActive: true,
      currentLOD: 'high',
      lastDistance: 0
    };

    // Create LOD materials based on type
    this.createLODMaterials(feature);
    
    this.features.set(id, feature);
    console.log(`🎯 [LOD] Added ${type} feature ${id} with multi-level LOD`);
  }

  private extractMaterial(object: THREE.Object3D): THREE.Material | THREE.Material[] | undefined {
    if (object instanceof THREE.Mesh) {
      return object.material;
    }
    
    // For groups, extract material from first mesh child
    const mesh = object.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
    return mesh?.material;
  }

  private createLODMaterials(feature: LODFeature): void {
    if (!feature.originalMaterial) return;

    // High detail: Original material
    feature.highDetailMaterial = feature.originalMaterial;

    // Medium detail: Reduced quality material
    feature.mediumDetailMaterial = this.createMediumDetailMaterial(feature.originalMaterial);

    // Low detail: Ultra-basic material
    feature.lowDetailMaterial = this.createLowDetailMaterial(feature.originalMaterial);

    // Create billboard for ultra-distant objects
    this.createBillboard(feature);
  }

  private createMediumDetailMaterial(original: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
    if (Array.isArray(original)) {
      return original.map(mat => this.simplifyMaterial(mat, 0.7));
    }
    return this.simplifyMaterial(original, 0.7);
  }

  private createLowDetailMaterial(original: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
    if (Array.isArray(original)) {
      return original.map(mat => this.simplifyMaterial(mat, 0.3));
    }
    return this.simplifyMaterial(original, 0.3);
  }

  private simplifyMaterial(material: THREE.Material, quality: number): THREE.Material {
    if (material instanceof THREE.MeshStandardMaterial) {
      const simplified = material.clone();
      simplified.roughness = Math.min(1.0, material.roughness + (1 - quality) * 0.5);
      simplified.metalness = material.metalness * quality;
      
      // Remove expensive effects at lower quality
      if (quality < 0.5) {
        simplified.normalMap = null;
        simplified.roughnessMap = null;
        simplified.metalnessMap = null;
      }
      
      return simplified;
    }
    
    return material.clone();
  }

  private createBillboard(feature: LODFeature): void {
    // Create a simple billboard sprite for ultra-distant rendering
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Draw simple representation based on feature type
    switch (feature.type) {
      case 'tree':
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(28, 40, 8, 24);
        ctx.fillStyle = '#2d5a3d';
        ctx.beginPath();
        ctx.arc(32, 30, 20, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'rock':
        ctx.fillStyle = '#666666';
        ctx.fillRect(16, 40, 32, 16);
        break;
      case 'bush':
        ctx.fillStyle = '#5a7c4a';
        ctx.beginPath();
        ctx.arc(32, 45, 12, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      fog: true 
    });
    
    feature.billboard = new THREE.Sprite(material);
    feature.billboard.scale.setScalar(feature.type === 'tree' ? 8 : 4);
    feature.billboard.position.copy(feature.position);
  }

  public updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
  }

  public updateFPS(fps: number): void {
    this.lastFPS = fps;
    
    // Dynamic quality scaling based on performance
    if (fps < RENDER_DISTANCES.QUALITY_SCALE_THRESHOLD) {
      this.qualityScale = Math.max(0.3, this.qualityScale - 0.1);
      console.log(`🎯 [LOD] Quality reduced to ${(this.qualityScale * 100).toFixed(0)}% due to low FPS (${fps.toFixed(1)})`);
    } else if (fps > RENDER_DISTANCES.FPS_TARGET && this.qualityScale < 1.0) {
      this.qualityScale = Math.min(1.0, this.qualityScale + 0.05);
    }
  }

  public update(): void {
    this.frameCount++;
    
    // Update features less frequently for performance
    if (this.frameCount % 3 !== 0) return;

    for (const [id, feature] of this.features.entries()) {
      const distance = this.playerPosition.distanceTo(feature.position);
      feature.lastDistance = distance;

      // Determine appropriate LOD level
      const newLOD = this.calculateLODLevel(distance);
      
      if (newLOD !== feature.currentLOD) {
        this.applyLOD(feature, newLOD);
        feature.currentLOD = newLOD;
      }

      // Update visibility based on fog
      this.updateFogVisibility(feature, distance);
    }
  }

  private calculateLODLevel(distance: number): LODFeature['currentLOD'] {
    const { LOD_ZONES } = RENDER_DISTANCES;
    const adjustedDistance = distance / this.qualityScale; // Quality scaling

    if (adjustedDistance > LOD_ZONES.CULLED) {
      return 'culled';
    } else if (adjustedDistance > LOD_ZONES.LOW_DETAIL.min) {
      return 'billboard';
    } else if (adjustedDistance > LOD_ZONES.MEDIUM_DETAIL.min) {
      return 'low';
    } else if (adjustedDistance > LOD_ZONES.HIGH_DETAIL.max) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private applyLOD(feature: LODFeature, lod: LODFeature['currentLOD']): void {
    // Hide billboard and main object first
    if (feature.billboard) {
      feature.billboard.visible = false;
      if (feature.billboard.parent) {
        this.scene.remove(feature.billboard);
      }
    }
    feature.object.visible = false;

    switch (lod) {
      case 'high':
        feature.object.visible = true;
        this.applyMaterial(feature.object, feature.highDetailMaterial);
        feature.object.castShadow = true;
        feature.object.receiveShadow = true;
        break;

      case 'medium':
        feature.object.visible = true;
        this.applyMaterial(feature.object, feature.mediumDetailMaterial);
        feature.object.castShadow = feature.lastDistance < RENDER_DISTANCES.QUALITY_ZONES.SHADOWS_CUTOFF;
        feature.object.receiveShadow = true;
        break;

      case 'low':
        feature.object.visible = true;
        this.applyMaterial(feature.object, feature.lowDetailMaterial);
        feature.object.castShadow = false;
        feature.object.receiveShadow = false;
        break;

      case 'billboard':
        if (feature.billboard) {
          feature.billboard.visible = true;
          feature.billboard.position.copy(feature.position);
          this.scene.add(feature.billboard);
        }
        break;

      case 'culled':
        // Both object and billboard are already hidden
        break;
    }
  }

  private applyMaterial(object: THREE.Object3D, material?: THREE.Material | THREE.Material[]): void {
    if (!material) return;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });
  }

  private updateFogVisibility(feature: LODFeature, distance: number): void {
    // DISABLED: Fog visibility was making close objects transparent
    // Only apply fog effects to distant objects to prevent bush transparency near player
    if (distance < FOG_CONFIG.NEAR + 20) {
      // Keep objects close to player fully opaque
      feature.object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if ('opacity' in mat) {
                mat.transparent = false;
                mat.opacity = 1.0;
              }
            });
          } else if ('opacity' in child.material) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }
        }
      });
      return;
    }
    
    // Only apply fog effects to distant objects
    const fogFactor = this.calculateFogFactor(distance);
    
    feature.object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if ('opacity' in mat) {
              mat.transparent = true;
              mat.opacity = fogFactor;
            }
          });
        } else if ('opacity' in child.material) {
          child.material.transparent = true;
          child.material.opacity = fogFactor;
        }
      }
    });

    if (feature.billboard && feature.currentLOD === 'billboard') {
      const spriteMaterial = feature.billboard.material as THREE.SpriteMaterial;
      spriteMaterial.opacity = fogFactor;
    }
  }

  private calculateFogFactor(distance: number): number {
    const { NEAR, FAR } = FOG_CONFIG;
    if (distance <= NEAR) return 1.0;
    if (distance >= FAR) return 0.0;
    
    // Exponential fog falloff
    const factor = (FAR - distance) / (FAR - NEAR);
    return Math.pow(factor, 1.5); // Slightly non-linear for more natural look
  }

  public removeFeature(id: string): void {
    const feature = this.features.get(id);
    if (feature) {
      if (feature.billboard) {
        this.scene.remove(feature.billboard);
        if (feature.billboard.material instanceof THREE.Material) {
          feature.billboard.material.dispose();
        }
      }
      this.features.delete(id);
    }
  }

  public getStats(): { total: number; high: number; medium: number; low: number; billboard: number; culled: number } {
    const stats = { total: 0, high: 0, medium: 0, low: 0, billboard: 0, culled: 0 };
    
    for (const feature of this.features.values()) {
      stats.total++;
      stats[feature.currentLOD]++;
    }
    
    return stats;
  }

  public dispose(): void {
    for (const feature of this.features.values()) {
      if (feature.billboard) {
        this.scene.remove(feature.billboard);
        if (feature.billboard.material instanceof THREE.Material) {
          feature.billboard.material.dispose();
        }
      }
    }
    this.features.clear();
    console.log('🎯 [EnhancedLODManager] Disposed');
  }
}