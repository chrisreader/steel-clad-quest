
import * as THREE from 'three';

export interface FogGeometryConfig {
  size: number;
  height?: number;
  segments?: number;
  displacement?: number;
  type: 'plane' | 'wall';
}

export class FogGeometryFactory {
  private static geometryCache = new Map<string, THREE.BufferGeometry>();

  public static createFogGeometry(config: FogGeometryConfig): THREE.BufferGeometry {
    const cacheKey = `${config.type}_${config.size}_${config.height || 0}_${config.segments || 16}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    let geometry: THREE.BufferGeometry;

    if (config.type === 'plane') {
      geometry = this.createPlaneGeometry(config);
    } else {
      geometry = this.createWallGeometry(config);
    }

    this.geometryCache.set(cacheKey, geometry.clone());
    return geometry;
  }

  private static createPlaneGeometry(config: FogGeometryConfig): THREE.PlaneGeometry {
    const segments = config.segments || 16;
    const geometry = new THREE.PlaneGeometry(config.size, config.size, segments, segments);
    
    if (config.displacement && config.displacement > 0) {
      this.applyPlaneDisplacement(geometry, config.displacement);
    }

    return geometry;
  }

  private static createWallGeometry(config: FogGeometryConfig): THREE.PlaneGeometry {
    const wallWidth = config.size;
    const wallHeight = config.height || 25;
    const segments = Math.max(12, Math.min(20, config.segments || 16));
    
    const geometry = new THREE.PlaneGeometry(wallWidth, wallHeight, segments, Math.floor(segments / 2));
    
    if (config.displacement && config.displacement > 0) {
      this.applyWallDisplacement(geometry, config.displacement, wallHeight);
    }

    return geometry;
  }

  private static applyPlaneDisplacement(geometry: THREE.PlaneGeometry, displacement: number): void {
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += (Math.random() - 0.5) * displacement;
    }
    
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private static applyWallDisplacement(geometry: THREE.PlaneGeometry, displacement: number, wallHeight: number): void {
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      const organicDisplacement = Math.sin(x * 0.02) * Math.cos(y * 0.03) * displacement;
      const heightFactor = (y + wallHeight / 2) / wallHeight;
      
      positions[i] += organicDisplacement * 0.2;
      positions[i + 1] += organicDisplacement * heightFactor * 0.8;
      positions[i + 2] += organicDisplacement * 0.15;
    }
    
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  public static clearCache(): void {
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
  }

  public static getCacheSize(): number {
    return this.geometryCache.size;
  }
}
