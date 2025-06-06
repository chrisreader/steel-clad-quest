
import * as THREE from 'three';

export class GeometryUtils {
  /**
   * Add organic noise to geometry vertices for natural rock appearance
   */
  static addVertexNoise(geometry: THREE.BufferGeometry, intensity: number = 0.3): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Create noise based on position
      const noise = this.perlinNoise3D(x * 3, y * 3, z * 3) * intensity;
      const radialNoise = this.perlinNoise3D(x * 5, y * 5, z * 5) * intensity * 0.5;
      
      // Apply noise in the direction of the vertex normal
      const vertex = new THREE.Vector3(x, y, z);
      const length = vertex.length();
      if (length > 0) {
        vertex.normalize();
        vertex.multiplyScalar(length + noise + radialNoise);
        
        positionArray[i] = vertex.x;
        positionArray[i + 1] = vertex.y;
        positionArray[i + 2] = vertex.z;
      }
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    
    return geometry;
  }
  
  /**
   * Add weathering effects - rounded edges and erosion patterns
   */
  static addWeatheringEffects(geometry: THREE.BufferGeometry, weatheringLevel: number): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Create weathering patterns - more erosion on exposed surfaces
      const erosionFactor = weatheringLevel * 0.2;
      const exposureFactor = Math.max(0, y) / 2; // More weathering on top surfaces
      
      const weatheringNoise = this.perlinNoise3D(x * 2, y * 2, z * 2) * erosionFactor * (1 + exposureFactor);
      
      const vertex = new THREE.Vector3(x, y, z);
      const length = vertex.length();
      if (length > 0) {
        vertex.normalize();
        vertex.multiplyScalar(length - Math.abs(weatheringNoise));
        
        positionArray[i] = vertex.x;
        positionArray[i + 1] = vertex.y;
        positionArray[i + 2] = vertex.z;
      }
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  /**
   * Create fracture lines for angular rocks
   */
  static addFractureLines(geometry: THREE.BufferGeometry, intensity: number = 0.5): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    // Create fracture planes
    const fracturePlanes = [
      new THREE.Vector3(1, 0.3, 0.2).normalize(),
      new THREE.Vector3(-0.5, 1, 0.7).normalize(),
      new THREE.Vector3(0.8, -0.2, 1).normalize()
    ];
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const vertex = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
      
      // Apply fractures
      fracturePlanes.forEach(plane => {
        const distance = vertex.dot(plane);
        if (Math.abs(distance) < 0.3) {
          const fracture = Math.sin(distance * 10) * intensity * 0.1;
          vertex.add(plane.clone().multiplyScalar(fracture));
        }
      });
      
      positionArray[i] = vertex.x;
      positionArray[i + 1] = vertex.y;
      positionArray[i + 2] = vertex.z;
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  /**
   * Simple Perlin noise implementation for organic variation
   */
  private static perlinNoise3D(x: number, y: number, z: number): number {
    // Simplified noise function for organic variation
    const noise = Math.sin(x * 0.5) * Math.cos(y * 0.7) * Math.sin(z * 0.3) +
                  Math.sin(x * 1.2) * Math.cos(y * 0.9) * Math.sin(z * 1.1) * 0.5 +
                  Math.sin(x * 2.1) * Math.cos(y * 1.7) * Math.sin(z * 1.9) * 0.25;
    
    return noise / 1.75; // Normalize
  }
  
  /**
   * Ensure geometry has proper grounding - flatten bottom and add realistic base
   */
  static addRealisticGrounding(geometry: THREE.BufferGeometry, embedDepth: number = 0.1): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    // Find the lowest point
    let minY = Infinity;
    for (let i = 1; i < positionArray.length; i += 3) {
      minY = Math.min(minY, positionArray[i]);
    }
    
    // Adjust vertices for realistic grounding
    for (let i = 0; i < positionArray.length; i += 3) {
      const y = positionArray[i + 1];
      
      // Flatten bottom area and add slight embedding
      if (y < minY + 0.2) {
        const flattenFactor = 1 - ((y - minY) / 0.2);
        positionArray[i + 1] = y - (flattenFactor * embedDepth);
      }
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
}
