
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates an organic geometry by applying noise deformation to a sphere
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 16,
    noiseIntensity: number = 0.05,
    noiseFrequency: number = 4.0
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    this.applyBushNoise(geometry, noiseIntensity, noiseFrequency);
    
    return geometry;
  }

  /**
   * Applies natural noise deformation to geometry vertices
   */
  static applyBushNoise(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.05,
    frequency: number = 4.0
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Primary noise for overall organic shape
      const noise1 = Math.sin(vertex.x * frequency + vertex.y * 3.3) * 
                     Math.cos(vertex.z * frequency * 1.2);
      
      // Secondary noise for fine detail
      const noise2 = Math.sin(vertex.x * frequency * 2.5 + vertex.y * 4.1) * 
                     Math.cos(vertex.z * frequency * 1.8) * 0.5;
      
      // Combine noises
      const totalNoise = (noise1 + noise2) * intensity;
      
      // Apply noise along the normal direction
      const normal = vertex.clone().normalize();
      vertex.addScaledVector(normal, totalNoise);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Creates asymmetric scaling for natural growth patterns
   */
  static createAsymmetricScale(): THREE.Vector3 {
    return new THREE.Vector3(
      0.8 + Math.random() * 0.4,  // 0.8 - 1.2
      0.7 + Math.random() * 0.3,  // 0.7 - 1.0 (bushes are generally shorter)
      0.8 + Math.random() * 0.4   // 0.8 - 1.2
    );
  }

  /**
   * Applies droop effect to simulate natural settling
   */
  static applyDroopEffect(geometry: THREE.BufferGeometry, intensity: number = 0.1): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply droop based on vertical position
      const droopFactor = Math.max(0, vertex.y) * intensity;
      vertex.y -= droopFactor * Math.abs(vertex.x + vertex.z) * 0.1;
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
