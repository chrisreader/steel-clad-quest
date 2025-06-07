
import * as THREE from 'three';

export class OrganicShapeGenerator {
  /**
   * Creates an organic geometry by applying noise deformation to a sphere
   */
  static createOrganicSphere(
    radius: number,
    segments: number = 20, // Increased default for finer detail
    noiseIntensity: number = 0.05,
    noiseFrequency: number = 4.0
  ): THREE.BufferGeometry {
    // Ensure segments are within the fine-detail range
    const clampedSegments = Math.max(16, Math.min(24, segments));
    const geometry = new THREE.SphereGeometry(radius, clampedSegments, clampedSegments);
    
    // Apply 2-pass noise for primary + secondary deformation
    this.applyBushNoise(geometry, noiseIntensity, noiseFrequency);
    this.applySecondaryNoise(geometry, noiseIntensity * 0.5, noiseFrequency * 2);
    
    return geometry;
  }

  /**
   * Applies natural noise deformation to geometry vertices (primary pass)
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
   * Applies secondary fine-detail noise deformation
   */
  static applySecondaryNoise(
    geometry: THREE.BufferGeometry,
    intensity: number = 0.025,
    frequency: number = 8.0
  ): void {
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      
      // High-frequency detail noise
      const detailNoise = Math.sin(vertex.x * frequency + vertex.z * frequency * 0.7) * 
                         Math.cos(vertex.y * frequency * 1.1) * 0.3;
      
      // Apply detail noise
      const normal = vertex.clone().normalize();
      vertex.addScaledVector(normal, detailNoise * intensity);
      
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

  /**
   * Creates an alpha-textured leaf plane with natural-looking silhouette
   */
  static createLeafGeometry(size: number = 0.1): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(size, size * 1.2);
    return geometry;
  }

  /**
   * Generates a procedural leaf texture with natural edge fade
   */
  static createLeafTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Clear with transparent background
    ctx.clearRect(0, 0, 64, 64);
    
    // Create radial gradient for natural leaf shape
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(60, 120, 40, 1)');
    gradient.addColorStop(0.6, 'rgba(40, 100, 30, 0.8)');
    gradient.addColorStop(0.85, 'rgba(30, 80, 20, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    // Draw leaf shape
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(32, 32, 28, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add leaf vein detail
    ctx.strokeStyle = 'rgba(20, 60, 10, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 10);
    ctx.lineTo(32, 54);
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }
}
