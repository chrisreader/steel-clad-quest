import * as THREE from 'three';

export class SmoothingUtils {
  /**
   * Apply Laplacian smoothing to geometry for organic appearance
   */
  public static smoothGeometry(geometry: THREE.BufferGeometry, iterations: number = 2): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const newPositions = new Float32Array(positions.length);
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < vertexCount; i++) {
        let sumX = 0, sumY = 0, sumZ = 0, count = 0;
        const index = i * 3;
        
        // Find neighboring vertices within threshold distance
        for (let j = 0; j < vertexCount; j++) {
          if (i !== j) {
            const dist = Math.sqrt(
              Math.pow(positions[index] - positions[j * 3], 2) +
              Math.pow(positions[index + 1] - positions[j * 3 + 1], 2) +
              Math.pow(positions[index + 2] - positions[j * 3 + 2], 2)
            );
            
            if (dist < 0.1) { // Neighborhood threshold
              sumX += positions[j * 3];
              sumY += positions[j * 3 + 1];
              sumZ += positions[j * 3 + 2];
              count++;
            }
          }
        }
        
        // Apply smoothing or keep original position
        newPositions[index] = count > 0 ? sumX / count : positions[index];
        newPositions[index + 1] = count > 0 ? sumY / count : positions[index + 1];
        newPositions[index + 2] = count > 0 ? sumZ / count : positions[index + 2];
      }
      
      // Update positions for next iteration
      positions.set(newPositions);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  /**
   * Weld vertices that are closer than threshold to eliminate gaps
   */
  public static weldVertices(geometry: THREE.BufferGeometry, threshold: number = 0.01): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const mergeMap: number[] = new Array(vertexCount).fill(0).map((_, i) => i);
    
    // Find vertices to merge
    for (let i = 0; i < vertexCount; i++) {
      for (let j = i + 1; j < vertexCount; j++) {
        const dist = Math.sqrt(
          Math.pow(positions[i * 3] - positions[j * 3], 2) +
          Math.pow(positions[i * 3 + 1] - positions[j * 3 + 1], 2) +
          Math.pow(positions[i * 3 + 2] - positions[j * 3 + 2], 2)
        );
        
        if (dist < threshold) {
          mergeMap[j] = i; // Merge j into i
        }
      }
    }
    
    // Create new vertex array with merged vertices
    const newPositions: number[] = [];
    const remap: number[] = [];
    
    for (let i = 0; i < vertexCount; i++) {
      if (mergeMap[i] === i) {
        // This vertex is kept
        remap[i] = newPositions.length / 3;
        newPositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      } else {
        // This vertex is merged with another
        remap[i] = remap[mergeMap[i]];
      }
    }
    
    // Update geometry with new positions
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    // Update indices if they exist
    const indices = geometry.index ? geometry.index.array as Uint16Array : null;
    if (indices) {
      const newIndices: number[] = [];
      for (let i = 0; i < indices.length; i++) {
        newIndices.push(remap[indices[i]]);
      }
      geometry.setIndex(newIndices);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
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
