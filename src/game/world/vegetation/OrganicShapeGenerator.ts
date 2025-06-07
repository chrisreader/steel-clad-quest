import * as THREE from 'three';

export class OrganicShapeGenerator {
  private static multiOctaveNoise3D(x: number, y: number, z: number): number {
    // Multi-octave noise for smoother, more natural displacement
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    // Use 4 octaves for smooth organic variation
    for (let i = 0; i < 4; i++) {
      const noise = (
        Math.sin(x * frequency * 2.5 + y * frequency * 1.7 + z * frequency * 3.1) * 0.3 +
        Math.sin(x * frequency * 5.2 + y * frequency * 3.4 + z * frequency * 2.8) * 0.2 +
        Math.sin(x * frequency * 8.1 + y * frequency * 6.3 + z * frequency * 4.7) * 0.1
      ) * 0.5;
      
      value += noise * amplitude;
      maxValue += amplitude;
      
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }

  private static smoothInterpolation(t: number): number {
    // Smooth step function for gentler transitions
    return t * t * (3 - 2 * t);
  }

  private static applyLaplacianSmoothing(geometry: THREE.BufferGeometry, iterations: number = 2): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    const vertexCount = positions.count;
    
    // Build adjacency list for smoothing
    const adjacency: number[][] = Array.from({ length: vertexCount }, () => []);
    
    if (geometry.index) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];
        
        adjacency[a].push(b, c);
        adjacency[b].push(a, c);
        adjacency[c].push(a, b);
      }
    }
    
    // Apply Laplacian smoothing
    for (let iter = 0; iter < iterations; iter++) {
      const newPositions = new Float32Array(positionArray.length);
      
      for (let i = 0; i < vertexCount; i++) {
        const neighbors = [...new Set(adjacency[i])]; // Remove duplicates
        
        if (neighbors.length > 0) {
          let avgX = 0, avgY = 0, avgZ = 0;
          
          for (const neighborIndex of neighbors) {
            avgX += positionArray[neighborIndex * 3];
            avgY += positionArray[neighborIndex * 3 + 1];
            avgZ += positionArray[neighborIndex * 3 + 2];
          }
          
          avgX /= neighbors.length;
          avgY /= neighbors.length;
          avgZ /= neighbors.length;
          
          // Blend with original position (smoothing factor)
          const smoothingFactor = 0.3;
          newPositions[i * 3] = positionArray[i * 3] * (1 - smoothingFactor) + avgX * smoothingFactor;
          newPositions[i * 3 + 1] = positionArray[i * 3 + 1] * (1 - smoothingFactor) + avgY * smoothingFactor;
          newPositions[i * 3 + 2] = positionArray[i * 3 + 2] * (1 - smoothingFactor) + avgZ * smoothingFactor;
        } else {
          // Keep original position if no neighbors
          newPositions[i * 3] = positionArray[i * 3];
          newPositions[i * 3 + 1] = positionArray[i * 3 + 1];
          newPositions[i * 3 + 2] = positionArray[i * 3 + 2];
        }
      }
      
      // Update positions
      for (let i = 0; i < positionArray.length; i++) {
        positionArray[i] = newPositions[i];
      }
    }
    
    positions.needsUpdate = true;
  }

  public static createOrganicGeometry(
    baseRadius: number,
    deformationIntensity: number = 0.3,
    deformationScale: number = 2.0
  ): THREE.BufferGeometry {
    // Increase subdivision to 4 for much smoother geometry (1,280 triangles)
    // Larger bushes get even more subdivision for ultra-smooth surfaces
    const subdivisionLevel = baseRadius > 1.0 ? 5 : 4;
    const geometry = new THREE.IcosahedronGeometry(baseRadius, subdivisionLevel);
    
    if (deformationIntensity === 0) return geometry;

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    // Apply smooth organic deformation to each vertex
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Calculate multi-octave noise-based displacement
      const noise = this.multiOctaveNoise3D(
        vertex.x * deformationScale,
        vertex.y * deformationScale,
        vertex.z * deformationScale
      );
      
      // Apply smooth interpolation to the noise
      const smoothNoise = this.smoothInterpolation(Math.abs(noise)) * Math.sign(noise);
      
      // Apply gentler deformation along the vertex normal
      const normalizedVertex = vertex.clone().normalize();
      const displacement = normalizedVertex.multiplyScalar(smoothNoise * deformationIntensity * baseRadius * 0.8);
      
      vertex.add(displacement);
      
      // Add subtle random variation for organic feel (reduced intensity)
      const randomVariation = new THREE.Vector3(
        (Math.random() - 0.5) * deformationIntensity * 0.15,
        (Math.random() - 0.5) * deformationIntensity * 0.15,
        (Math.random() - 0.5) * deformationIntensity * 0.15
      );
      
      vertex.add(randomVariation);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Apply Laplacian smoothing to eliminate sharp edges
    this.applyLaplacianSmoothing(geometry, 2);

    // Recalculate normals for smooth lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }

  public static createAsymmetricScale(asymmetryFactor: number): THREE.Vector3 {
    const baseScale = 0.8 + Math.random() * 0.4;
    
    return new THREE.Vector3(
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor),
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor * 0.5), // Less Y variation
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor)
    );
  }

  public static applyDroopEffect(position: THREE.Vector3, droopFactor: number, clusterIndex: number): THREE.Vector3 {
    const droopedPosition = position.clone();
    
    // Apply drooping effect based on distance from center and height
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    const droopAmount = droopFactor * distanceFromCenter * 0.5;
    
    // Lower clusters droop more
    droopedPosition.y -= droopAmount * (1 + clusterIndex * 0.2);
    
    return droopedPosition;
  }
}
