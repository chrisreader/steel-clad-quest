
import * as THREE from 'three';

export class OrganicShapeGenerator {
  private static noise3D(x: number, y: number, z: number): number {
    // Simple 3D noise function using sine waves
    return (
      Math.sin(x * 2.5 + y * 1.7 + z * 3.1) * 0.3 +
      Math.sin(x * 5.2 + y * 3.4 + z * 2.8) * 0.2 +
      Math.sin(x * 8.1 + y * 6.3 + z * 4.7) * 0.1
    ) * 0.5;
  }

  public static createOrganicGeometry(
    baseRadius: number,
    deformationIntensity: number = 0.3,
    deformationScale: number = 2.0
  ): THREE.BufferGeometry {
    // Start with icosahedron for more organic base than sphere
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 2);
    
    if (deformationIntensity === 0) return geometry;

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    // Apply organic deformation to each vertex
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Calculate noise-based displacement
      const noise = this.noise3D(
        vertex.x * deformationScale,
        vertex.y * deformationScale,
        vertex.z * deformationScale
      );
      
      // Apply deformation along the vertex normal
      const normalizedVertex = vertex.clone().normalize();
      const displacement = normalizedVertex.multiplyScalar(noise * deformationIntensity * baseRadius);
      
      vertex.add(displacement);
      
      // Add some random variation for more organic feel
      const randomVariation = new THREE.Vector3(
        (Math.random() - 0.5) * deformationIntensity * 0.3,
        (Math.random() - 0.5) * deformationIntensity * 0.3,
        (Math.random() - 0.5) * deformationIntensity * 0.3
      );
      
      vertex.add(randomVariation);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Recalculate normals for proper lighting
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
