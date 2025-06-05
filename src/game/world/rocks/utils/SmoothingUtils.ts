
import * as THREE from 'three';

export class SmoothingUtils {
  /**
   * Apply Catmull-Clark subdivision smoothing to geometry
   */
  static applyCatmullClarkSmoothing(geometry: THREE.BufferGeometry, iterations: number = 1): THREE.BufferGeometry {
    // Simple approximation of Catmull-Clark using vertex averaging
    for (let iter = 0; iter < iterations; iter++) {
      const positions = geometry.attributes.position;
      const positionArray = positions.array as Float32Array;
      const smoothedPositions = new Float32Array(positionArray.length);
      
      // Copy original positions
      for (let i = 0; i < positionArray.length; i++) {
        smoothedPositions[i] = positionArray[i];
      }
      
      // Apply smoothing by averaging neighboring vertices
      for (let i = 0; i < positionArray.length; i += 3) {
        const vertex = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
        const neighbors = this.findNeighborVertices(geometry, i / 3);
        
        if (neighbors.length > 0) {
          const avgPosition = new THREE.Vector3();
          neighbors.forEach(neighborPos => avgPosition.add(neighborPos));
          avgPosition.divideScalar(neighbors.length);
          
          // Blend original position with smoothed position
          vertex.lerp(avgPosition, 0.5);
          
          smoothedPositions[i] = vertex.x;
          smoothedPositions[i + 1] = vertex.y;
          smoothedPositions[i + 2] = vertex.z;
        }
      }
      
      // Update geometry
      for (let i = 0; i < positionArray.length; i++) {
        positionArray[i] = smoothedPositions[i];
      }
      positions.needsUpdate = true;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }
  
  /**
   * Apply Laplacian smoothing to reduce faceting
   */
  static applyLaplacianSmoothing(geometry: THREE.BufferGeometry, intensity: number = 0.5): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    const smoothedPositions = new Float32Array(positionArray.length);
    
    // Initialize with original positions
    for (let i = 0; i < positionArray.length; i++) {
      smoothedPositions[i] = positionArray[i];
    }
    
    // Apply Laplacian smoothing
    for (let i = 0; i < positionArray.length; i += 3) {
      const vertex = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
      const neighbors = this.findNeighborVertices(geometry, i / 3);
      
      if (neighbors.length > 0) {
        const laplacian = new THREE.Vector3();
        neighbors.forEach(neighborPos => laplacian.add(neighborPos));
        laplacian.divideScalar(neighbors.length);
        laplacian.sub(vertex);
        
        // Apply smoothing
        vertex.add(laplacian.multiplyScalar(intensity));
        
        smoothedPositions[i] = vertex.x;
        smoothedPositions[i + 1] = vertex.y;
        smoothedPositions[i + 2] = vertex.z;
      }
    }
    
    // Update geometry
    for (let i = 0; i < positionArray.length; i++) {
      positionArray[i] = smoothedPositions[i];
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  /**
   * Add multi-layer noise for natural surface variation
   */
  static addMultiLayerNoise(geometry: THREE.BufferGeometry, baseIntensity: number = 0.1): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const z = positionArray[i + 2];
      
      // Three octaves of noise for natural variation
      const noise1 = this.smoothNoise3D(x * 2, y * 2, z * 2) * baseIntensity;
      const noise2 = this.smoothNoise3D(x * 5, y * 5, z * 5) * baseIntensity * 0.5;
      const noise3 = this.smoothNoise3D(x * 10, y * 10, z * 10) * baseIntensity * 0.25;
      
      const totalNoise = noise1 + noise2 + noise3;
      
      // Apply noise in vertex normal direction
      const vertex = new THREE.Vector3(x, y, z);
      const length = vertex.length();
      if (length > 0) {
        vertex.normalize();
        vertex.multiplyScalar(length + totalNoise);
        
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
   * Get adaptive subdivision level based on rock size
   */
  static getSubdivisionLevel(size: number): number {
    if (size < 0.5) return 2;      // Small rocks: 80 triangles
    if (size < 1.0) return 3;      // Medium rocks: 320 triangles
    if (size < 2.0) return 4;      // Large rocks: 1280 triangles
    return 5;                      // Massive rocks: 5120 triangles
  }
  
  private static findNeighborVertices(geometry: THREE.BufferGeometry, vertexIndex: number): THREE.Vector3[] {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    const neighbors: THREE.Vector3[] = [];
    
    const vertex = new THREE.Vector3(
      positionArray[vertexIndex * 3],
      positionArray[vertexIndex * 3 + 1],
      positionArray[vertexIndex * 3 + 2]
    );
    
    // Find nearby vertices (simplified neighbor detection)
    const threshold = 0.5;
    for (let i = 0; i < positionArray.length; i += 3) {
      if (i / 3 === vertexIndex) continue;
      
      const neighbor = new THREE.Vector3(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
      if (vertex.distanceTo(neighbor) < threshold) {
        neighbors.push(neighbor);
      }
    }
    
    return neighbors;
  }
  
  private static smoothNoise3D(x: number, y: number, z: number): number {
    // Improved smooth noise function using cubic interpolation
    const noise = Math.sin(x * 0.5) * Math.cos(y * 0.7) * Math.sin(z * 0.3) +
                  Math.sin(x * 1.2) * Math.cos(y * 0.9) * Math.sin(z * 1.1) * 0.5 +
                  Math.sin(x * 2.1) * Math.cos(y * 1.7) * Math.sin(z * 1.9) * 0.25;
    
    // Apply cubic smoothing
    const smoothed = noise / 1.75;
    return smoothed * smoothed * (3 - 2 * Math.abs(smoothed));
  }
}
