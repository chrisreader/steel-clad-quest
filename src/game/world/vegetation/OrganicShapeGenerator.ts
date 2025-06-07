
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates an organic geometry by applying multi-octave noise deformation
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 16,
    noiseIntensity: number = 0.05,
    noiseFrequency: number = 4.0,
    growthPattern: 'compact' | 'sprawling' | 'upright' | 'wild' = 'wild'
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    
    this.applyAdvancedBushNoise(geometry, noiseIntensity, noiseFrequency, growthPattern);
    
    return geometry;
  }

  /**
   * Applies advanced multi-octave noise deformation with growth patterns
   */
  static applyAdvancedBushNoise(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.05,
    frequency: number = 4.0,
    growthPattern: 'compact' | 'sprawling' | 'upright' | 'wild' = 'wild'
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Multi-octave noise for complex surface detail
      const noise1 = Math.sin(vertex.x * frequency + vertex.y * 3.3) * 
                     Math.cos(vertex.z * frequency * 1.2);
      
      const noise2 = Math.sin(vertex.x * frequency * 2.5 + vertex.y * 4.1) * 
                     Math.cos(vertex.z * frequency * 1.8) * 0.5;
      
      const noise3 = Math.sin(vertex.x * frequency * 4.2 + vertex.y * 5.7) * 
                     Math.cos(vertex.z * frequency * 3.1) * 0.25;
      
      // Combine multiple noise octaves
      let totalNoise = (noise1 + noise2 + noise3) * intensity;
      
      // Apply growth pattern modifications
      totalNoise *= this.getGrowthPatternMultiplier(vertex, growthPattern);
      
      // Apply noise along the normal direction
      const normal = vertex.clone().normalize();
      vertex.addScaledVector(normal, totalNoise);
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Gets growth pattern multiplier based on vertex position and pattern type
   */
  static getGrowthPatternMultiplier(
    vertex: THREE.Vector3, 
    pattern: 'compact' | 'sprawling' | 'upright' | 'wild'
  ): number {
    const normalizedVertex = vertex.clone().normalize();
    
    switch (pattern) {
      case 'compact':
        // Less deformation for compact, dense growth
        return 0.7;
      
      case 'sprawling':
        // More horizontal deformation, less vertical
        return Math.abs(normalizedVertex.y) < 0.5 ? 1.3 : 0.8;
      
      case 'upright':
        // More vertical growth, controlled horizontal spread
        return Math.abs(normalizedVertex.y) > 0.3 ? 1.2 : 0.9;
      
      case 'wild':
        // Random, irregular deformation
        return 0.8 + Math.random() * 0.6;
      
      default:
        return 1.0;
    }
  }

  /**
   * Creates enhanced asymmetric scaling based on growth pattern
   */
  static createPatternBasedScale(growthPattern: 'compact' | 'sprawling' | 'upright' | 'wild'): THREE.Vector3 {
    switch (growthPattern) {
      case 'compact':
        return new THREE.Vector3(
          0.9 + Math.random() * 0.2,  // 0.9 - 1.1
          0.8 + Math.random() * 0.2,  // 0.8 - 1.0
          0.9 + Math.random() * 0.2   // 0.9 - 1.1
        );
      
      case 'sprawling':
        return new THREE.Vector3(
          1.0 + Math.random() * 0.4,  // 1.0 - 1.4 (wider)
          0.6 + Math.random() * 0.3,  // 0.6 - 0.9 (shorter)
          1.0 + Math.random() * 0.4   // 1.0 - 1.4 (wider)
        );
      
      case 'upright':
        return new THREE.Vector3(
          0.7 + Math.random() * 0.3,  // 0.7 - 1.0 (narrower)
          1.1 + Math.random() * 0.3,  // 1.1 - 1.4 (taller)
          0.7 + Math.random() * 0.3   // 0.7 - 1.0 (narrower)
        );
      
      case 'wild':
      default:
        return new THREE.Vector3(
          0.7 + Math.random() * 0.6,  // 0.7 - 1.3
          0.7 + Math.random() * 0.6,  // 0.7 - 1.3
          0.7 + Math.random() * 0.6   // 0.7 - 1.3
        );
    }
  }

  /**
   * Applies enhanced droop effect with pattern consideration
   */
  static applyPatternBasedDroop(
    geometry: THREE.BufferGeometry, 
    intensity: number = 0.1,
    growthPattern: 'compact' | 'sprawling' | 'upright' | 'wild' = 'wild'
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    // Adjust droop intensity based on growth pattern
    let patternIntensity = intensity;
    switch (growthPattern) {
      case 'compact':
        patternIntensity *= 0.5; // Less droop for compact bushes
        break;
      case 'sprawling':
        patternIntensity *= 1.5; // More droop for sprawling bushes
        break;
      case 'upright':
        patternIntensity *= 0.7; // Moderate droop for upright bushes
        break;
      case 'wild':
        patternIntensity *= 1.0 + (Math.random() - 0.5) * 0.5; // Variable droop
        break;
    }

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // Apply droop based on vertical position and pattern
      const droopFactor = Math.max(0, vertex.y) * patternIntensity;
      const horizontalDistance = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      vertex.y -= droopFactor * horizontalDistance * 0.15;
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Creates environmental lean based on terrain slope simulation
   */
  static applyEnvironmentalLean(object: THREE.Object3D, position: THREE.Vector3): void {
    // Simulate terrain slope influence
    const slopeX = Math.sin(position.x * 0.1) * 0.1;
    const slopeZ = Math.cos(position.z * 0.1) * 0.1;
    
    object.rotation.x += slopeX;
    object.rotation.z += slopeZ;
  }
}
