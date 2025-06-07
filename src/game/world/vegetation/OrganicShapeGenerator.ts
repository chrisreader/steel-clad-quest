import * as THREE from 'three';

export class OrganicShapeGenerator {
  private static generateNoise3D(x: number, y: number, z: number, scale: number): number {
    // Multi-octave 3D noise for organic displacement
    const octave1 = Math.sin(x * scale) * Math.cos(y * scale) * Math.sin(z * scale);
    const octave2 = Math.sin(x * scale * 2) * Math.cos(y * scale * 2) * Math.sin(z * scale * 2) * 0.5;
    const octave3 = Math.sin(x * scale * 4) * Math.cos(y * scale * 4) * Math.sin(z * scale * 4) * 0.25;
    const octave4 = Math.sin(x * scale * 8) * Math.cos(y * scale * 8) * Math.sin(z * scale * 8) * 0.125;
    
    return (octave1 + octave2 + octave3 + octave4) / 1.875; // Normalized
  }

  private static createBranchingPattern(vertex: THREE.Vector3, branchingIntensity: number): number {
    // Create branch-like protrusions with constrained displacement
    const angle1 = Math.atan2(vertex.z, vertex.x);
    const angle2 = Math.acos(Math.max(-1, Math.min(1, vertex.y / Math.max(0.001, vertex.length()))));
    
    const branchNoise = Math.sin(angle1 * 3) * Math.cos(angle2 * 4) * 
                       Math.sin(vertex.length() * 8) * branchingIntensity;
    
    return Math.max(0, branchNoise * 0.3); // Reduced displacement to prevent gaps
  }

  private static weldVertices(geometry: THREE.BufferGeometry, tolerance: number = 0.01): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    const vertexCount = positions.count;
    
    // Create vertex map for welding nearby vertices
    const vertexMap = new Map<string, number>();
    const mergedVertices: number[] = [];
    const indexMapping: number[] = new Array(vertexCount);
    
    for (let i = 0; i < vertexCount; i++) {
      const x = Math.round(positionArray[i * 3] / tolerance) * tolerance;
      const y = Math.round(positionArray[i * 3 + 1] / tolerance) * tolerance;
      const z = Math.round(positionArray[i * 3 + 2] / tolerance) * tolerance;
      
      const key = `${x},${y},${z}`;
      
      if (vertexMap.has(key)) {
        indexMapping[i] = vertexMap.get(key)!;
      } else {
        const newIndex = mergedVertices.length / 3;
        vertexMap.set(key, newIndex);
        indexMapping[i] = newIndex;
        
        mergedVertices.push(
          positionArray[i * 3],
          positionArray[i * 3 + 1],
          positionArray[i * 3 + 2]
        );
      }
    }
    
    // Update geometry with merged vertices
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(mergedVertices, 3));
    
    // Update indices if they exist
    if (geometry.index) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i++) {
        indices[i] = indexMapping[indices[i]];
      }
      geometry.index.needsUpdate = true;
    }
  }

  private static applySmoothingFilter(geometry: THREE.BufferGeometry, iterations: number = 2): void {
    const positions = geometry.attributes.position;
    const positionArray = positions.array as Float32Array;
    const vertexCount = positions.count;
    
    // Build vertex neighborhood map more efficiently
    const neighbors: Set<number>[] = Array.from({ length: vertexCount }, () => new Set());
    
    if (geometry.index) {
      const indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];
        
        neighbors[a].add(b);
        neighbors[a].add(c);
        neighbors[b].add(a);
        neighbors[b].add(c);
        neighbors[c].add(a);
        neighbors[c].add(b);
      }
    }
    
    // Apply Laplacian smoothing with constrained movement
    for (let iter = 0; iter < iterations; iter++) {
      const smoothedPositions = new Float32Array(positionArray.length);
      
      for (let i = 0; i < vertexCount; i++) {
        const neighborArray = Array.from(neighbors[i]);
        
        if (neighborArray.length > 0) {
          let avgX = 0, avgY = 0, avgZ = 0;
          
          for (const neighborIndex of neighborArray) {
            avgX += positionArray[neighborIndex * 3];
            avgY += positionArray[neighborIndex * 3 + 1];
            avgZ += positionArray[neighborIndex * 3 + 2];
          }
          
          avgX /= neighborArray.length;
          avgY /= neighborArray.length;
          avgZ /= neighborArray.length;
          
          // Conservative smoothing to prevent gaps
          const smoothingFactor = 0.15; // Reduced from 0.2
          smoothedPositions[i * 3] = positionArray[i * 3] * (1 - smoothingFactor) + avgX * smoothingFactor;
          smoothedPositions[i * 3 + 1] = positionArray[i * 3 + 1] * (1 - smoothingFactor) + avgY * smoothingFactor;
          smoothedPositions[i * 3 + 2] = positionArray[i * 3 + 2] * (1 - smoothingFactor) + avgZ * smoothingFactor;
        } else {
          smoothedPositions[i * 3] = positionArray[i * 3];
          smoothedPositions[i * 3 + 1] = positionArray[i * 3 + 1];
          smoothedPositions[i * 3 + 2] = positionArray[i * 3 + 2];
        }
      }
      
      // Update positions
      for (let i = 0; i < positionArray.length; i++) {
        positionArray[i] = smoothedPositions[i];
      }
    }
    
    positions.needsUpdate = true;
  }

  public static createDenseBushGeometry(
    baseRadius: number,
    height: number,
    bushType: string,
    variation: number = 0
  ): THREE.BufferGeometry {
    // Use IcosahedronGeometry for uniform vertex distribution (no poles)
    const subdivisionLevel = 4; // Higher level for smoother surface
    const geometry = new THREE.IcosahedronGeometry(baseRadius, subdivisionLevel);
    
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const colors: number[] = [];
    
    // Type-specific parameters with constrained displacement
    let verticalStretch = 1.0;
    let noiseScale = 2.0;
    let branchingIntensity = 0.0;
    let bulgeIntensity = 0.2; // Reduced to prevent gaps
    let maxDisplacement = baseRadius * 0.25; // Maximum displacement constraint
    
    switch (bushType) {
      case 'low_shrub':
        verticalStretch = 0.6;
        noiseScale = 3.0;
        bulgeIntensity = 0.15;
        maxDisplacement = baseRadius * 0.2;
        break;
      case 'medium_bush':
        verticalStretch = 1.0;
        noiseScale = 2.5;
        branchingIntensity = 0.08; // Reduced
        bulgeIntensity = 0.2;
        maxDisplacement = baseRadius * 0.25;
        break;
      case 'tall_bush':
        verticalStretch = 1.4;
        noiseScale = 2.0;
        branchingIntensity = 0.12; // Reduced
        bulgeIntensity = 0.25;
        maxDisplacement = baseRadius * 0.3;
        break;
    }
    
    // Apply constrained procedural displacement
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Store original vertex for constraint calculation
      const originalLength = vertex.length();
      
      // Apply vertical stretching first
      vertex.y *= verticalStretch;
      
      // Generate constrained noise displacement
      const noiseValue = this.generateNoise3D(
        vertex.x + variation * 100,
        vertex.y + variation * 100,
        vertex.z + variation * 100,
        noiseScale
      );
      
      // Create organic bulges with surface-following displacement
      const bulgeNoise = this.generateNoise3D(
        vertex.x * 1.5,
        vertex.y * 1.5,
        vertex.z * 1.5,
        1.0
      );
      
      // Add constrained branching pattern
      const branchDisplacement = this.createBranchingPattern(vertex, branchingIntensity);
      
      // Combine displacement effects with constraints
      let totalDisplacement = (noiseValue * bulgeIntensity + 
                              bulgeNoise * 0.15 + 
                              branchDisplacement) * baseRadius;
      
      // Apply displacement constraint to prevent gaps
      totalDisplacement = Math.max(-maxDisplacement * 0.5, Math.min(maxDisplacement, totalDisplacement));
      
      // Apply displacement along surface normal (not vertex normal to avoid gaps)
      const surfaceNormal = vertex.clone().normalize();
      const displacedVertex = vertex.clone().add(surfaceNormal.multiplyScalar(totalDisplacement));
      
      // Ensure minimum distance from origin to prevent inward collapse
      const minRadius = baseRadius * 0.7;
      if (displacedVertex.length() < minRadius) {
        displacedVertex.normalize().multiplyScalar(minRadius);
      }
      
      // Apply small asymmetric variation
      displacedVertex.x += (Math.random() - 0.5) * baseRadius * 0.05; // Reduced
      displacedVertex.z += (Math.random() - 0.5) * baseRadius * 0.05; // Reduced
      
      positions.setXYZ(i, displacedVertex.x, displacedVertex.y, displacedVertex.z);
      
      // Generate vertex colors for natural variation
      const colorVariation = 0.6 + (noiseValue + 1) * 0.2; // More conservative range
      colors.push(colorVariation, colorVariation * 0.95, colorVariation * 0.85);
    }
    
    // Add vertex colors
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Apply vertex welding to close micro-gaps
    this.weldVertices(geometry, 0.005);
    
    // Apply conservative smoothing to maintain surface integrity
    this.applySmoothingFilter(geometry, 1);
    
    // Recalculate normals for proper lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }

  public static createAsymmetricScale(asymmetryFactor: number, bushType: string): THREE.Vector3 {
    const baseScale = 0.9 + Math.random() * 0.2;
    
    // Type-specific scaling
    let scaleVariation = asymmetryFactor;
    if (bushType === 'low_shrub') {
      scaleVariation *= 0.7; // Less asymmetry for ground cover
    }
    
    return new THREE.Vector3(
      baseScale * (1 + (Math.random() - 0.5) * scaleVariation),
      baseScale * (1 + (Math.random() - 0.5) * scaleVariation * 0.3), // Less Y variation
      baseScale * (1 + (Math.random() - 0.5) * scaleVariation)
    );
  }

  public static applyGroundHugging(position: THREE.Vector3, bushType: string): THREE.Vector3 {
    const adjustedPosition = position.clone();
    
    // Make bushes sit naturally on the ground
    if (bushType === 'low_shrub') {
      adjustedPosition.y = Math.max(0.1, adjustedPosition.y * 0.8);
    } else if (bushType === 'medium_bush') {
      adjustedPosition.y = Math.max(0.2, adjustedPosition.y * 0.9);
    }
    
    return adjustedPosition;
  }
}
