
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates a balanced organic geometry by applying moderate noise deformation to a sphere
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 16,
    noiseIntensity: number = 0.12,
    noiseFrequency: number = 2.5
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    this.applyBalancedBushNoise(geometry, noiseIntensity, noiseFrequency);
    this.applyModerateAsymmetricDeformation(geometry, radius);
    this.applyBalancedBulges(geometry, radius);
    this.applyEnhancedIrregularities(geometry, radius);
    
    return geometry;
  }

  /**
   * Applies balanced multi-layer noise deformation for naturally organic shapes
   */
  static applyBalancedBushNoise(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.12,
    frequency: number = 2.5
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Primary large-scale noise for overall organic shape - balanced
      const noise1 = Math.sin(vertex.x * frequency + vertex.y * 2.2) * 
                     Math.cos(vertex.z * frequency * 1.2) * 0.8; // Increased from 0.6
      
      // Secondary medium-scale noise for surface detail - enhanced
      const noise2 = Math.sin(vertex.x * frequency * 2.5 + vertex.y * 4.0) * 
                     Math.cos(vertex.z * frequency * 1.8) * 0.6; // Increased from 0.4
      
      // Fine detail noise for texture - more prominent
      const noise3 = Math.sin(vertex.x * frequency * 4.0) * 
                     Math.cos(vertex.y * frequency * 3.5) * 
                     Math.sin(vertex.z * frequency * 5.0) * 0.3; // Increased from 0.2
      
      // Combine noise layers with balanced intensity
      const totalNoise = (noise1 + noise2 + noise3) * intensity * 1.0; // Increased from 0.8
      
      // Apply noise along the normal direction with moderate variation
      const normal = vertex.clone().normalize();
      const noiseMultiplier = 1.0 + (Math.random() - 0.5) * 0.4; // Increased from 0.3
      
      vertex.addScaledVector(normal, totalNoise * noiseMultiplier);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Applies moderate asymmetric deformation for balanced natural growth patterns
   */
  static applyModerateAsymmetricDeformation(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create balanced asymmetric scaling factors
    const scaleX = 0.80 + Math.random() * 0.4; // Increased range: 0.80-1.20
    const scaleY = 0.75 + Math.random() * 0.35; // Increased range: 0.75-1.10
    const scaleZ = 0.80 + Math.random() * 0.4; // Increased range: 0.80-1.20

    // Add moderate twist effect
    const twistIntensity = (Math.random() - 0.5) * 0.20; // Increased from 0.15

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply asymmetric scaling
      vertex.x *= scaleX;
      vertex.y *= scaleY;
      vertex.z *= scaleZ;
      
      // Add moderate twist deformation
      const heightRatio = (vertex.y + baseRadius) / (baseRadius * 2);
      const twistAngle = heightRatio * twistIntensity;
      const newX = vertex.x * Math.cos(twistAngle) - vertex.z * Math.sin(twistAngle);
      const newZ = vertex.x * Math.sin(twistAngle) + vertex.z * Math.cos(twistAngle);
      vertex.x = newX;
      vertex.z = newZ;
      
      // Balanced droop effect
      const droopFactor = Math.max(0, vertex.y / baseRadius) * 0.20; // Increased from 0.15
      vertex.y -= droopFactor * (Math.abs(vertex.x) + Math.abs(vertex.z)) * 0.12; // Increased from 0.08
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Adds balanced bulges and indentations for naturally irregular shapes
   */
  static applyBalancedBulges(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create 2-4 random bulge points for balanced variation
    const bulgeCount = 2 + Math.floor(Math.random() * 3); // Keep at 2-4
    const bulges: Array<{center: THREE.Vector3, intensity: number, radius: number}> = [];
    
    for (let b = 0; b < bulgeCount; b++) {
      bulges.push({
        center: new THREE.Vector3(
          (Math.random() - 0.5) * baseRadius * 2.2, // Slightly increased
          (Math.random() - 0.5) * baseRadius * 1.8, // Slightly increased
          (Math.random() - 0.5) * baseRadius * 2.2  // Slightly increased
        ),
        intensity: (Math.random() - 0.5) * 0.3, // Increased from 0.2
        radius: baseRadius * (0.4 + Math.random() * 0.5) // Slightly increased range
      });
    }

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply balanced bulge effects
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
   * Adds enhanced irregularities and surface variations
   */
  static applyEnhancedIrregularities(geometry: THREE.BufferGeometry, baseRadius: number): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Add enhanced surface variations
      const surfaceNoise = (Math.random() - 0.5) * 0.08; // Increased from 0.05
      const normal = vertex.clone().normalize();
      vertex.addScaledVector(normal, surfaceNoise);
      
      // Add enhanced directional growth bias
      const growthBias = new THREE.Vector3(
        (Math.random() - 0.5) * 0.03, // Increased from 0.02
        Math.random() * 0.025, // Increased from 0.015
        (Math.random() - 0.5) * 0.03  // Increased from 0.02
      );
      vertex.add(growthBias);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
