
import * as THREE from 'three';

export interface FlameConfig {
  height: number;
  width: number;
  segments: number;
  curve: number;
  taper: number;
  color: THREE.Color;
}

export class FlameGeometry {
  public static createFlameGeometry(config: FlameConfig): THREE.BufferGeometry {
    const { height, width, segments, curve, taper } = config;
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Create organic flame shape using multiple segments
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = height * t;
      
      // Apply curve for natural flame bending
      const bendOffset = Math.sin(t * Math.PI * 0.7) * curve * t;
      
      // Taper width from base to tip (flame gets narrower)
      const widthMultiplier = 1 - (t * taper);
      const currentWidth = width * widthMultiplier;
      
      // Left and right vertices for each segment
      const leftX = -currentWidth * 0.5 + bendOffset;
      const rightX = currentWidth * 0.5 + bendOffset;
      
      vertices.push(leftX, y, 0);
      vertices.push(rightX, y, 0);
      
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
  
  public static getFlameTypes(): FlameConfig[] {
    return [
      {
        height: 0.8,
        width: 0.3,
        segments: 6,
        curve: 0.2,
        taper: 0.8,
        color: new THREE.Color(0xFF6600)
      },
      {
        height: 1.2,
        width: 0.4,
        segments: 8,
        curve: 0.3,
        taper: 0.9,
        color: new THREE.Color(0xFF4400)
      },
      {
        height: 0.6,
        width: 0.25,
        segments: 5,
        curve: 0.15,
        taper: 0.7,
        color: new THREE.Color(0xFF8800)
      }
    ];
  }
}
