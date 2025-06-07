
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates a subtly organic geometry by applying gentle noise deformation to a sphere
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 14,
    noiseIntensity: number = 0.08,
    noiseFrequency: number = 2.0
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    this.applySubtleBushNoise(geometry, noiseIntensity, noiseFrequency);
    this.applyGentleAsymmetricDeformation(geometry, radius);
    this.applySubtleBulges(geometry, radius);
    this.applyMinorIrregularities(geometry, radius);
    
    return geometry;
  }

  /**
   * Applies subtle multi-layer noise deformation for gently organic shapes
   */
  static applySubtleBushNoise(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.08,
    frequency: number = 2.0
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Primary large-scale noise for overall organic shape - much more subtle
      const noise1 = Math.sin(vertex.x * frequency + vertex.y * 2.2) * 
                     Math.cos(vertex.z * frequency * 1.2) * 0.6; // Reduced from 1.2 to 0.6
      
      // Secondary medium-scale noise for surface detail - gentler
      const noise2 = Math.sin(vertex.x * frequency * 2.5 + vertex.y * 4.0) * 
                     Math.cos(vertex.z * frequency * 1.8) * 0.4; // Reduced from 0.8 to 0.4
      
      // Fine detail noise for texture - more subtle
      const noise3 = Math.sin(vertex.x * frequency * 4.0) * 
                     Math.cos(vertex.y * frequency * 3.5) * 
                     Math.sin(vertex.z * frequency * 5.0) * 0.2; // Reduced from 0.5 to 0.2
      
      // Combine noise layers with much reduced intensity
      const totalNoise = (noise1 + noise2 + noise3) * intensity * 0.8; // Reduced from 1.5 to 0.8
      
      // Apply noise along the normal direction with less variation
      const normal = vertex.clone().normalize();
      const noiseMultiplier = 1.0 + (Math.random() - 0.5) * 0.3; // Reduced from 0.6 to 0.3
      
      vertex.addScaledVector(normal, totalNoise * noiseMultiplier);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Applies gentle asymmetric deformation for natural growth patterns
   */
  static applyGentleAsymmetricDeformation(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create more subtle asymmetric scaling factors
    const scaleX = 0.85 + Math.random() * 0.3; // Reduced from 0.7-1.3 to 0.85-1.15
    const scaleY = 0.8 + Math.random() * 0.25;  // Reduced from 0.6-1.1 to 0.8-1.05
    const scaleZ = 0.85 + Math.random() * 0.3; // Reduced from 0.7-1.3 to 0.85-1.15

    // Add gentle twist effect
    const twistIntensity = (Math.random() - 0.5) * 0.15; // Reduced from 0.3 to 0.15

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply asymmetric scaling
      vertex.x *= scaleX;
      vertex.y *= scaleY;
      vertex.z *= scaleZ;
      
      // Add gentle twist deformation
      const heightRatio = (vertex.y + baseRadius) / (baseRadius * 2);
      const twistAngle = heightRatio * twistIntensity;
      const newX = vertex.x * Math.cos(twistAngle) - vertex.z * Math.sin(twistAngle);
      const newZ = vertex.x * Math.sin(twistAngle) + vertex.z * Math.cos(twistAngle);
      vertex.x = newX;
      vertex.z = newZ;
      
      // Subtle droop effect
      const droopFactor = Math.max(0, vertex.y / baseRadius) * 0.15; // Reduced from 0.3 to 0.15
      vertex.y -= droopFactor * (Math.abs(vertex.x) + Math.abs(vertex.z)) * 0.08; // Reduced from 0.15 to 0.08
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Adds subtle bulges and indentations for gently irregular shapes
   */
  static applySubtleBulges(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create 2-4 random bulge points for subtle variation
    const bulgeCount = 2 + Math.floor(Math.random() * 3); // Reduced from 3-6 to 2-4
    const bulges: Array<{center: THREE.Vector3, intensity: number, radius: number}> = [];
    
    for (let b = 0; b < bulgeCount; b++) {
      bulges.push({
        center: new THREE.Vector3(
          (Math.random() - 0.5) * baseRadius * 2.0, // Reduced from 2.5 to 2.0
          (Math.random() - 0.5) * baseRadius * 1.5, // Reduced from 2.0 to 1.5
          (Math.random() - 0.5) * baseRadius * 2.0  // Reduced from 2.5 to 2.0
        ),
        intensity: (Math.random() - 0.5) * 0.2, // Reduced from 0.5 to 0.2
        radius: baseRadius * (0.4 + Math.random() * 0.4) // Reduced from 0.5-1.1 to 0.4-0.8
      });
    }

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply subtle bulge effects
      bulges.forEach(bulge => {
        const distance = vertex.distanceTo(bulge.center);
        if (distance < bulge.radius) {
          const influence = 1.0 - (distance / bulge.radius);
          const smoothInfluence = influence * influence * (3.0 - 2.0 * influence);
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
   * Adds minor irregularities and surface variations
   */
  static applyMinorIrregularities(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Add subtle surface variations
      const surfaceNoise = (Math.random() - 0.5) * 0.05; // Reduced from 0.1 to 0.05
      const normal = vertex.clone().normalize();
      vertex.addScaledVector(normal, surfaceNoise);
      
      // Add gentle directional growth bias
      const growthBias = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02, // Reduced from 0.05 to 0.02
        Math.random() * 0.015, // Reduced from 0.03 to 0.015
        (Math.random() - 0.5) * 0.02  // Reduced from 0.05 to 0.02
      );
      vertex.add(growthBias);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
