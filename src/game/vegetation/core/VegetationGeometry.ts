
import * as THREE from 'three';
import { GrassBladeConfig, FlowerConfig } from './GrassConfig';

export class VegetationGeometry {
  private static geometryCache = new Map<string, THREE.BufferGeometry>();
  private static flowerCache = new Map<string, THREE.BufferGeometry>();

  // Create wildflower geometry
  public static createWildflowerGeometry(config: FlowerConfig): THREE.BufferGeometry {
    const cacheKey = `flower_${config.type}_${config.size}`;
    
    if (this.flowerCache.has(cacheKey)) {
      return this.flowerCache.get(cacheKey)!.clone();
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Create flower petals
    const petalCount = config.petalCount;
    const centerRadius = config.size * 0.2;
    const petalLength = config.size * 0.8;
    
    // Flower center
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * centerRadius;
      const z = Math.sin(angle) * centerRadius;
      vertices.push(x, config.stemHeight, z);
      uvs.push(0.5 + x / config.size, 0.5 + z / config.size);
      normals.push(0, 1, 0);
    }
    
    // Petals
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2;
      const petalAngle = Math.PI / 6; // Petal spread
      
      for (let i = 0; i <= 3; i++) {
        const t = i / 3;
        const radius = centerRadius + (petalLength - centerRadius) * t;
        const width = config.size * 0.3 * (1 - t * 0.7); // Taper petals
        
        for (let side = -1; side <= 1; side += 2) {
          const sideAngle = angle + side * petalAngle * t;
          const x = Math.cos(sideAngle) * radius;
          const z = Math.sin(sideAngle) * radius;
          const y = config.stemHeight + Math.sin(t * Math.PI) * 0.02; // Slight curve
          
          vertices.push(x, y, z);
          uvs.push(0.5 + x / config.size, 0.5 + z / config.size);
          normals.push(0, 1, 0);
        }
      }
    }
    
    // Create indices for flower geometry
    let vertexIndex = 0;
    
    // Center indices
    for (let i = 0; i < 6; i++) {
      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex++;
    }
    vertexIndex += 2; // Skip last center vertices
    
    // Petal indices
    for (let p = 0; p < petalCount; p++) {
      for (let i = 0; i < 3; i++) {
        const base = vertexIndex + i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
      vertexIndex += 8; // 4 segments * 2 sides
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    this.flowerCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  // Create reed grass geometry (tall, thick blades)
  public static createReedGeometry(config: GrassBladeConfig): THREE.BufferGeometry {
    const cacheKey = `reed_${config.height}_${config.width}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    const segments = config.segments + 2; // More segments for reeds
    const width = config.width * 1.5; // Thicker than normal grass
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = config.height * t;
      
      // Less curve for reeds, more vertical
      const bendFactor = Math.sin(t * Math.PI * 0.3) * config.curve * 0.5;
      
      // Slight taper
      const widthFactor = 1.0 - (t * t * config.taper * 0.3);
      const currentWidth = width * widthFactor;
      
      const leftX = -currentWidth * 0.5;
      const rightX = currentWidth * 0.5;
      
      vertices.push(leftX + bendFactor, y, 0);
      vertices.push(rightX + bendFactor, y, 0);
      
      uvs.push(0, t);
      uvs.push(1, t);
      
      normals.push(0, 0, 1);
      normals.push(0, 0, 1);
      
      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  // Create fern-like vegetation
  public static createFernGeometry(config: GrassBladeConfig): THREE.BufferGeometry {
    const cacheKey = `fern_${config.height}_${config.width}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Create main frond
    const segments = config.segments;
    let vertexIndex = 0;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = config.height * t;
      
      // Curved frond shape
      const bendFactor = Math.sin(t * Math.PI * 0.8) * config.curve;
      
      // Frond width varies along length
      const widthFactor = Math.sin(t * Math.PI) * (1.0 - t * config.taper);
      const currentWidth = config.width * widthFactor;
      
      // Create leaflets along the frond
      const leafletCount = Math.floor(t * 6) + 2;
      for (let l = 0; l < leafletCount; l++) {
        const leafletAngle = (l / leafletCount - 0.5) * Math.PI * 0.3;
        const leafletX = Math.sin(leafletAngle) * currentWidth;
        const leafletZ = Math.cos(leafletAngle) * currentWidth * 0.2;
        
        vertices.push(leafletX + bendFactor, y, leafletZ);
        uvs.push(l / leafletCount, t);
        normals.push(0, 1, 0);
        
        if (i > 0 && l > 0) {
          const current = vertexIndex;
          const prev = vertexIndex - leafletCount;
          indices.push(prev, current, prev + 1);
          indices.push(current, current + 1, prev + 1);
        }
        vertexIndex++;
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  // Create crystal grass with ethereal properties
  public static createCrystalGrassGeometry(config: GrassBladeConfig): THREE.BufferGeometry {
    const cacheKey = `crystal_${config.height}_${config.width}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    const segments = config.segments;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = config.height * t;
      
      // Gentle ethereal sway
      const bendFactor = Math.sin(t * Math.PI * 0.4) * config.curve * 0.3;
      
      // Crystal-like faceted edges
      const widthFactor = 1.0 - (t * t * config.taper);
      const currentWidth = config.width * widthFactor;
      
      // Create multiple edges for crystal effect
      const edgeCount = 6;
      for (let e = 0; e < edgeCount; e++) {
        const angle = (e / edgeCount) * Math.PI * 2;
        const x = Math.cos(angle) * currentWidth * 0.5 + bendFactor;
        const z = Math.sin(angle) * currentWidth * 0.3;
        
        vertices.push(x, y, z);
        uvs.push(e / edgeCount, t);
        
        // Calculate normals for crystal facets
        const normal = new THREE.Vector3(Math.cos(angle), 0.5, Math.sin(angle)).normalize();
        normals.push(normal.x, normal.y, normal.z);
      }
      
      if (i < segments) {
        const base = i * edgeCount;
        for (let e = 0; e < edgeCount; e++) {
          const next = (e + 1) % edgeCount;
          indices.push(base + e, base + next, base + edgeCount + e);
          indices.push(base + next, base + edgeCount + next, base + edgeCount + e);
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  // Create shrub/bush geometry
  public static createShrubGeometry(config: GrassBladeConfig): THREE.BufferGeometry {
    const cacheKey = `shrub_${config.height}_${config.width}`;
    
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!.clone();
    }

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Create clustered branch structure
    const branchCount = 8;
    let vertexIndex = 0;
    
    for (let b = 0; b < branchCount; b++) {
      const branchAngle = (b / branchCount) * Math.PI * 2;
      const branchLength = config.height * (0.7 + Math.random() * 0.6);
      const segments = 3;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = branchLength * t;
        
        const branchRadius = config.width * (1.0 - t * 0.5);
        const x = Math.cos(branchAngle) * branchRadius;
        const z = Math.sin(branchAngle) * branchRadius;
        
        // Add some branch leaves
        for (let l = 0; l < 3; l++) {
          const leafAngle = branchAngle + (l - 1) * 0.3;
          const leafX = x + Math.cos(leafAngle) * 0.02;
          const leafZ = z + Math.sin(leafAngle) * 0.02;
          
          vertices.push(leafX, y, leafZ);
          uvs.push(b / branchCount, t);
          normals.push(0, 1, 0);
          
          if (i > 0 && l > 0) {
            indices.push(vertexIndex - 3, vertexIndex, vertexIndex - 2);
          }
          vertexIndex++;
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    this.geometryCache.set(cacheKey, geometry);
    return geometry.clone();
  }

  public static dispose(): void {
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    for (const geometry of this.flowerCache.values()) {
      geometry.dispose();
    }
    this.geometryCache.clear();
    this.flowerCache.clear();
  }
}
