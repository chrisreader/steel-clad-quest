
import * as THREE from 'three';

export interface GrassBladeConfig {
  height: number;
  width: number;
  segments: number;
  curve: number;
  color: THREE.Color;
}

export class GrassGeometry {
  // Create different grass blade types with better visibility
  public static createGrassBladeGeometry(config: GrassBladeConfig): THREE.BufferGeometry {
    const { height, width, segments, curve } = config;
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Create curved grass blade using multiple segments
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * t;
      
      // Apply curve to make grass bend naturally
      const bendOffset = Math.sin(t * Math.PI * 0.5) * curve;
      
      // Left and right vertices for each segment - wider for visibility
      const leftX = -width * 0.5 * (1 - t * 0.6); // Less tapering for more visible grass
      const rightX = width * 0.5 * (1 - t * 0.6);
      
      vertices.push(leftX + bendOffset, y, 0);
      vertices.push(rightX + bendOffset, y, 0);
      
      uvs.push(0, t);
      uvs.push(1, t);
      
      // Create triangles
      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  // Create grass clump for dense patches
  public static createGrassClumpGeometry(bladeCount: number = 5, radius: number = 0.3): THREE.BufferGeometry {
    // Just return a single blade geometry for now - clumping will be handled by the instance system
    return this.createGrassBladeGeometry({
      height: 0.6 + Math.random() * 0.3, // Reduced from 1.2 + Math.random() * 0.6
      width: 0.15 + Math.random() * 0.05, // Keep width the same
      segments: 4, // More segments for smoother curves
      curve: 0.3 + Math.random() * 0.2,
      color: new THREE.Color(0x2d5016)
    });
  }
  
  // Predefined grass types - reduced heights
  public static getGrassTypes(): GrassBladeConfig[] {
    return [
      {
        height: 0.3, // Reduced from 0.6
        width: 0.12, // Keep width the same
        segments: 3,
        curve: 0.15,
        color: new THREE.Color(0x4a7c59)
      },
      {
        height: 0.5, // Reduced from 1.0
        width: 0.18, // Keep width the same
        segments: 4,
        curve: 0.25,
        color: new THREE.Color(0x2d5016)
      },
      {
        height: 0.7, // Reduced from 1.4
        width: 0.22, // Keep width the same
        segments: 5,
        curve: 0.3,
        color: new THREE.Color(0x1e3a0f)
      }
    ];
  }
}
