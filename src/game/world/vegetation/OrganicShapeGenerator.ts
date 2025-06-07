
import * as THREE from 'three';

export class OrganicShapeGenerator {
  private static noise3D(x: number, y: number, z: number): number {
    // Multi-octave noise for smoother organic displacement
    let value = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    // Use multiple octaves for more natural noise
    for (let i = 0; i < 4; i++) {
      value += Math.sin(x * frequency * 2.5 + y * frequency * 1.7 + z * frequency * 3.1) * amplitude * 0.3;
      value += Math.sin(x * frequency * 5.2 + y * frequency * 3.4 + z * frequency * 2.8) * amplitude * 0.2;
      value += Math.sin(x * frequency * 8.1 + y * frequency * 6.3 + z * frequency * 4.7) * amplitude * 0.1;
      
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue * 0.5;
  }

  private static smoothNoise3D(x: number, y: number, z: number, scale: number = 1): number {
    // Smooth interpolated noise for organic shapes
    const scaledX = x * scale;
    const scaledY = y * scale;
    const scaledZ = z * scale;
    
    return this.noise3D(scaledX, scaledY, scaledZ) * 
           Math.sin(scaledX * 0.7) * Math.cos(scaledY * 0.8) * Math.sin(scaledZ * 0.6) * 0.3 +
           this.noise3D(scaledX * 2, scaledY * 2, scaledZ * 2) * 0.2 +
           this.noise3D(scaledX * 4, scaledY * 4, scaledZ * 4) * 0.1;
  }

  public static createOrganicGeometry(
    baseRadius: number,
    deformationIntensity: number = 0.3,
    deformationScale: number = 2.0
  ): THREE.BufferGeometry {
    // Use higher subdivision for smoother geometry - adaptive based on size
    const subdivisionLevel = Math.min(5, Math.max(3, Math.floor(baseRadius * 8)));
    const geometry = new THREE.IcosahedronGeometry(baseRadius, subdivisionLevel);
    
    if (deformationIntensity === 0) return geometry;

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const vertices: THREE.Vector3[] = [];

    // Store original vertices for smoothing
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      vertices.push(vertex.clone());
    }

    // Apply organic deformation with smooth noise
    for (let i = 0; i < positions.count; i++) {
      const originalVertex = vertices[i];
      vertex.copy(originalVertex);
      
      // Use smooth multi-octave noise for organic displacement
      const noise = this.smoothNoise3D(
        vertex.x * deformationScale,
        vertex.y * deformationScale,
        vertex.z * deformationScale,
        1.0
      );
      
      // Apply deformation along the vertex normal with smooth falloff
      const normalizedVertex = vertex.clone().normalize();
      const displacementAmount = noise * deformationIntensity * baseRadius;
      
      // Add smooth radial variation for more organic shape
      const radialVariation = Math.sin(Math.atan2(vertex.z, vertex.x) * 3) * 
                             Math.cos(Math.asin(vertex.y / vertex.length()) * 2) * 0.1;
      
      const totalDisplacement = (displacementAmount + radialVariation) * deformationIntensity;
      const displacement = normalizedVertex.multiplyScalar(totalDisplacement);
      
      vertex.add(displacement);
      
      // Reduced random variation for smoother result
      const randomVariation = new THREE.Vector3(
        (Math.random() - 0.5) * deformationIntensity * 0.1,
        (Math.random() - 0.5) * deformationIntensity * 0.1,
        (Math.random() - 0.5) * deformationIntensity * 0.1
      );
      
      vertex.add(randomVariation);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Apply Laplacian smoothing to reduce sharp edges
    this.applyLaplacianSmoothing(geometry, 2);

    // Recalculate normals with smooth angle threshold for better lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }

  private static applyLaplacianSmoothing(geometry: THREE.BufferGeometry, iterations: number): void {
    const positions = geometry.attributes.position;
    const vertices: THREE.Vector3[] = [];
    
    // Store current positions
    for (let i = 0; i < positions.count; i++) {
      vertices.push(new THREE.Vector3().fromBufferAttribute(positions, i));
    }
    
    // Build adjacency list for smoothing
    const adjacency: number[][] = new Array(positions.count).fill(null).map(() => []);
    
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
    
    // Apply smoothing iterations
    for (let iter = 0; iter < iterations; iter++) {
      const smoothedVertices = vertices.map((vertex, index) => {
        if (adjacency[index].length === 0) return vertex.clone();
        
        const avgPosition = new THREE.Vector3();
        const neighbors = [...new Set(adjacency[index])]; // Remove duplicates
        
        for (const neighborIndex of neighbors) {
          avgPosition.add(vertices[neighborIndex]);
        }
        
        avgPosition.divideScalar(neighbors.length);
        
        // Blend with original position (0.3 = 30% smoothing, 70% original)
        return vertex.clone().lerp(avgPosition, 0.3);
      });
      
      // Update vertices array
      for (let i = 0; i < vertices.length; i++) {
        vertices[i].copy(smoothedVertices[i]);
      }
    }
    
    // Apply smoothed positions back to geometry
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, vertices[i].x, vertices[i].y, vertices[i].z);
    }
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
