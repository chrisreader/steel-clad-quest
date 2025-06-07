
import * as THREE from 'three';
import { noise } from 'noisejs';

export class OrganicBushGeometry {
  private noise: any;

  constructor() {
    this.noise = noise;
    this.noise.seed(Math.random());
  }

  public createOrganicBushGeometry(
    baseRadius: number,
    height: number,
    complexity: number = 16,
    irregularity: number = 0.3
  ): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(baseRadius, complexity, Math.max(8, complexity / 2));
    
    // Get position attribute for vertex manipulation
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;
    
    // Apply organic deformation using noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Convert to spherical coordinates for better noise distribution
      const radius = Math.sqrt(x * x + y * y + z * z);
      const theta = Math.atan2(z, x);
      const phi = Math.acos(y / radius);
      
      // Apply multiple octaves of noise for organic variation
      const noiseScale1 = 0.8;
      const noiseScale2 = 1.6;
      const noiseScale3 = 3.2;
      
      const noise1 = this.noise.perlin3(x * noiseScale1, y * noiseScale1, z * noiseScale1);
      const noise2 = this.noise.perlin3(x * noiseScale2, y * noiseScale2, z * noiseScale2) * 0.5;
      const noise3 = this.noise.perlin3(x * noiseScale3, y * noiseScale3, z * noiseScale3) * 0.25;
      
      const combinedNoise = (noise1 + noise2 + noise3) * irregularity;
      
      // Apply gravity effect - make bottom more droopy
      const gravityEffect = Math.max(0, -y / baseRadius) * 0.2;
      
      // Calculate new radius with organic variation
      const newRadius = radius * (1 + combinedNoise - gravityEffect);
      
      // Convert back to cartesian coordinates
      positions[i] = newRadius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = newRadius * Math.cos(phi) * (1 - gravityEffect * 0.5);
      positions[i + 2] = newRadius * Math.sin(phi) * Math.sin(theta);
    }
    
    // Update the geometry
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  public createFoliageCluster(
    radius: number,
    asymmetry: number = 0.4,
    bumpiness: number = 0.3
  ): THREE.BufferGeometry {
    const segments = Math.max(8, Math.min(16, Math.floor(radius * 20)));
    const geometry = new THREE.IcosahedronGeometry(radius, 2);
    
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Create asymmetric, bumpy surface
      const noiseValue = this.noise.perlin3(x * 4, y * 4, z * 4) * bumpiness;
      const asymmetryValue = (x * asymmetry + y * asymmetry * 0.5) * 0.1;
      
      const distortion = 1 + noiseValue + asymmetryValue;
      
      positions[i] = x * distortion;
      positions[i + 1] = y * distortion * (1 - Math.abs(y) * 0.1); // Slight vertical compression
      positions[i + 2] = z * distortion;
    }
    
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  public createBranchGeometry(
    startRadius: number,
    endRadius: number,
    length: number,
    segments: number = 8
  ): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(endRadius, startRadius, length, segments);
    
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;
    
    // Add organic curves and bumps to branches
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Add slight curvature and surface bumps
      const heightFactor = (y + length / 2) / length; // 0 to 1 from bottom to top
      const noise = this.noise.perlin3(x * 8, y * 8, z * 8) * 0.05;
      const curve = Math.sin(heightFactor * Math.PI) * 0.1;
      
      positions[i] = x + noise + curve * heightFactor;
      positions[i + 2] = z + noise * 0.5;
    }
    
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }
}
