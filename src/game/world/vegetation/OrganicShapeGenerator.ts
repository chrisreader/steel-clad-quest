
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates an organic geometry by applying noise deformation to a sphere
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 16,
    noiseIntensity: number = 0.15,
    noiseFrequency: number = 4.0
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    this.applyEnhancedBushNoise(geometry, noiseIntensity, noiseFrequency);
    this.applyAsymmetricDeformation(geometry, radius);
    this.applyNaturalBulges(geometry, radius);
    
    return geometry;
  }

  /**
   * Applies enhanced multi-layer noise deformation for natural organic shapes
   */
  static applyEnhancedBushNoise(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.15,
    frequency: number = 4.0
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Primary large-scale noise for overall organic shape
      const noise1 = Math.sin(vertex.x * frequency + vertex.y * 3.3) * 
                     Math.cos(vertex.z * frequency * 1.2);
      
      // Secondary medium-scale noise for surface detail
      const noise2 = Math.sin(vertex.x * frequency * 2.5 + vertex.y * 4.1) * 
                     Math.cos(vertex.z * frequency * 1.8) * 0.6;
      
      // Fine detail noise for texture
      const noise3 = Math.sin(vertex.x * frequency * 5.0) * 
                     Math.cos(vertex.y * frequency * 4.5) * 
                     Math.sin(vertex.z * frequency * 6.0) * 0.3;
      
      // Combine all noise layers
      const totalNoise = (noise1 + noise2 + noise3) * intensity;
      
      // Apply noise along the normal direction with variation
      const normal = vertex.clone().normalize();
      const radiusFromCenter = vertex.length();
      const noiseMultiplier = 1.0 + (Math.random() - 0.5) * 0.3; // ±15% variation
      
      vertex.addScaledVector(normal, totalNoise * noiseMultiplier);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Applies asymmetric deformation for natural growth patterns
   */
  static applyAsymmetricDeformation(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create random asymmetric scaling factors
    const scaleX = 0.85 + Math.random() * 0.3; // 0.85-1.15
    const scaleY = 0.7 + Math.random() * 0.4;  // 0.7-1.1 (bushes tend to be shorter)
    const scaleZ = 0.85 + Math.random() * 0.3; // 0.85-1.15

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply asymmetric scaling
      vertex.x *= scaleX;
      vertex.y *= scaleY;
      vertex.z *= scaleZ;
      
      // Add slight droop effect based on position
      const droopFactor = Math.max(0, vertex.y / baseRadius) * 0.2;
      vertex.y -= droopFactor * (Math.abs(vertex.x) + Math.abs(vertex.z)) * 0.1;
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Adds natural bulges and indentations to break up sphere shape
   */
  static applyNaturalBulges(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create 2-4 random bulge points
    const bulgeCount = 2 + Math.floor(Math.random() * 3);
    const bulges: Array<{center: THREE.Vector3, intensity: number, radius: number}> = [];
    
    for (let b = 0; b < bulgeCount; b++) {
      bulges.push({
        center: new THREE.Vector3(
          (Math.random() - 0.5) * baseRadius * 2,
          (Math.random() - 0.5) * baseRadius * 1.5,
          (Math.random() - 0.5) * baseRadius * 2
        ),
        intensity: (Math.random() - 0.5) * 0.3, // Can be positive (bulge) or negative (indent)
        radius: baseRadius * (0.6 + Math.random() * 0.4)
      });
    }

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply bulge effects
      bulges.forEach(bulge => {
        const distance = vertex.distanceTo(bulge.center);
        if (distance < bulge.radius) {
          const influence = 1.0 - (distance / bulge.radius);
          const bulgeDirection = vertex.clone().sub(bulge.center).normalize();
          vertex.addScaledVector(bulgeDirection, bulge.intensity * influence);
        }
      });
      
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
