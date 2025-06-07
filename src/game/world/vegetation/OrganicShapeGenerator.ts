
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates an extremely organic geometry by applying enhanced noise deformation to a sphere
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 16,
    noiseIntensity: number = 0.25,
    noiseFrequency: number = 3.0
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    this.applyIntenseBushNoise(geometry, noiseIntensity, noiseFrequency);
    this.applyStrongAsymmetricDeformation(geometry, radius);
    this.applyDramaticBulges(geometry, radius);
    this.applyNaturalIrregularities(geometry, radius);
    
    return geometry;
  }

  /**
   * Applies intense multi-layer noise deformation for highly organic shapes
   */
  static applyIntenseBushNoise(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.25,
    frequency: number = 3.0
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Primary large-scale noise for overall organic shape - much more intense
      const noise1 = Math.sin(vertex.x * frequency + vertex.y * 2.8) * 
                     Math.cos(vertex.z * frequency * 1.4) * 1.2;
      
      // Secondary medium-scale noise for surface detail - enhanced
      const noise2 = Math.sin(vertex.x * frequency * 3.2 + vertex.y * 5.1) * 
                     Math.cos(vertex.z * frequency * 2.3) * 0.8;
      
      // Fine detail noise for texture - more pronounced
      const noise3 = Math.sin(vertex.x * frequency * 6.0) * 
                     Math.cos(vertex.y * frequency * 5.5) * 
                     Math.sin(vertex.z * frequency * 7.0) * 0.5;
      
      // Additional chaotic noise for natural irregularity
      const noise4 = Math.sin(vertex.x * frequency * 8.0 + vertex.z * 3.0) * 
                     Math.cos(vertex.y * frequency * 6.5) * 0.4;
      
      // Combine all noise layers with enhanced intensity
      const totalNoise = (noise1 + noise2 + noise3 + noise4) * intensity * 1.5;
      
      // Apply noise along the normal direction with more variation
      const normal = vertex.clone().normalize();
      const noiseMultiplier = 1.0 + (Math.random() - 0.5) * 0.6; // ±30% variation
      
      vertex.addScaledVector(normal, totalNoise * noiseMultiplier);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Applies strong asymmetric deformation for natural growth patterns
   */
  static applyStrongAsymmetricDeformation(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create more dramatic asymmetric scaling factors
    const scaleX = 0.7 + Math.random() * 0.6; // 0.7-1.3
    const scaleY = 0.6 + Math.random() * 0.5;  // 0.6-1.1 (bushes tend to be shorter)
    const scaleZ = 0.7 + Math.random() * 0.6; // 0.7-1.3

    // Add twist effect
    const twistIntensity = (Math.random() - 0.5) * 0.3;

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply asymmetric scaling
      vertex.x *= scaleX;
      vertex.y *= scaleY;
      vertex.z *= scaleZ;
      
      // Add twist deformation
      const heightRatio = (vertex.y + baseRadius) / (baseRadius * 2);
      const twistAngle = heightRatio * twistIntensity;
      const newX = vertex.x * Math.cos(twistAngle) - vertex.z * Math.sin(twistAngle);
      const newZ = vertex.x * Math.sin(twistAngle) + vertex.z * Math.cos(twistAngle);
      vertex.x = newX;
      vertex.z = newZ;
      
      // Enhanced droop effect
      const droopFactor = Math.max(0, vertex.y / baseRadius) * 0.3;
      vertex.y -= droopFactor * (Math.abs(vertex.x) + Math.abs(vertex.z)) * 0.15;
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Adds dramatic bulges and indentations for highly irregular shapes
   */
  static applyDramaticBulges(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create 3-6 random bulge points for more variation
    const bulgeCount = 3 + Math.floor(Math.random() * 4);
    const bulges: Array<{center: THREE.Vector3, intensity: number, radius: number}> = [];
    
    for (let b = 0; b < bulgeCount; b++) {
      bulges.push({
        center: new THREE.Vector3(
          (Math.random() - 0.5) * baseRadius * 2.5,
          (Math.random() - 0.5) * baseRadius * 2.0,
          (Math.random() - 0.5) * baseRadius * 2.5
        ),
        intensity: (Math.random() - 0.5) * 0.5, // Stronger bulges/indents
        radius: baseRadius * (0.5 + Math.random() * 0.6)
      });
    }

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply bulge effects
      bulges.forEach(bulge => {
        const distance = vertex.distanceTo(bulge.center);
        if (distance < bulge.radius) {
          const influence = 1.0 - (distance / bulge.radius);
          const smoothInfluence = influence * influence * (3.0 - 2.0 * influence); // Smooth curve
          const bulgeDirection = vertex.clone().sub(bulge.center).normalize();
          vertex.addScaledVector(bulgeDirection, bulge.intensity * smoothInfluence);
        }
      });
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Adds natural irregularities and surface variations
   */
  static applyNaturalIrregularities(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Add random surface variations
      const surfaceNoise = (Math.random() - 0.5) * 0.1;
      const normal = vertex.clone().normalize();
      vertex.addScaledVector(normal, surfaceNoise);
      
      // Add directional growth bias (bushes often lean slightly)
      const growthBias = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        Math.random() * 0.03, // Slight upward bias
        (Math.random() - 0.5) * 0.05
      );
      vertex.add(growthBias);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
