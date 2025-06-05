
import * as THREE from 'three';
import { noise } from 'noisejs';

export interface RockShape {
  geometry: THREE.BufferGeometry;
  scale: number;
  rotation: THREE.Euler;
}

export class RockShapeFactory {
  private static noise = new noise.Noise(Math.random());

  static generateRock(
    type: 'boulder' | 'angular' | 'flat',
    size: number = 1,
    complexity: number = 0.5
  ): RockShape {
    let geometry: THREE.BufferGeometry;
    
    switch (type) {
      case 'boulder':
        geometry = this.createBoulderGeometry(size, complexity);
        break;
      case 'angular':
        geometry = this.createAngularGeometry(size, complexity);
        break;
      case 'flat':
        geometry = this.createFlatGeometry(size, complexity);
        break;
      default:
        geometry = this.createBoulderGeometry(size, complexity);
    }

    // Apply topology-aware smoothing and validation
    this.validateAndRepairGeometry(geometry);
    this.applyNeighborhoodAwareSmoothing(geometry, type);

    return {
      geometry,
      scale: 0.8 + Math.random() * 0.4,
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
    };
  }

  private static createBoulderGeometry(size: number, complexity: number): THREE.BufferGeometry {
    // Use multiple overlapping spheres for organic shape
    const baseGeometry = new THREE.SphereGeometry(size, 16, 12);
    
    // Create organic shape using multi-sphere approach
    this.applyMultiSphereDeformation(baseGeometry, complexity);
    this.applyConstrainedNoiseDeformation(baseGeometry, complexity * 0.3);
    
    return baseGeometry;
  }

  private static createAngularGeometry(size: number, complexity: number): THREE.BufferGeometry {
    // Higher subdivision for better topology
    const baseGeometry = new THREE.DodecahedronGeometry(size, 2);
    
    // Apply controlled angular deformation
    this.applyConstrainedAngularDeformation(baseGeometry, complexity);
    this.applyConstrainedNoiseDeformation(baseGeometry, complexity * 0.2);
    
    return baseGeometry;
  }

  private static createFlatGeometry(size: number, complexity: number): THREE.BufferGeometry {
    // Start with a cylinder for flat base shape
    const baseGeometry = new THREE.CylinderGeometry(size, size * 0.8, size * 0.4, 12, 2);
    
    // Apply controlled flattening with topology preservation
    this.applyConstrainedFlatteningDeformation(baseGeometry, complexity);
    this.applyConstrainedNoiseDeformation(baseGeometry, complexity * 0.25);
    
    return baseGeometry;
  }

  private static applyMultiSphereDeformation(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Create influence spheres for organic shaping
    const influenceSpheres = [
      { center: new THREE.Vector3(0.3, 0.2, 0.1), radius: 0.8, strength: intensity },
      { center: new THREE.Vector3(-0.2, 0.4, -0.3), radius: 0.6, strength: intensity * 0.7 },
      { center: new THREE.Vector3(0.1, -0.3, 0.4), radius: 0.5, strength: intensity * 0.8 }
    ];

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const originalVertex = vertex.clone();
      
      // Apply influence from multiple spheres
      for (const sphere of influenceSpheres) {
        const distance = vertex.distanceTo(sphere.center);
        const influence = Math.max(0, 1 - (distance / sphere.radius));
        const deformation = influence * sphere.strength * 0.3;
        
        // Apply non-uniform scaling instead of displacement
        const direction = vertex.clone().sub(sphere.center).normalize();
        vertex.add(direction.multiplyScalar(deformation));
      }
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private static applyConstrainedNoiseDeformation(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const neighbors = this.buildNeighborMap(geometry);
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Calculate neighborhood-aware displacement
      const neighborPositions = neighbors[i].map(idx => {
        const neighbor = new THREE.Vector3();
        neighbor.fromBufferAttribute(positions, idx);
        return neighbor;
      });
      
      // Calculate centroid of neighbors
      const centroid = new THREE.Vector3();
      neighborPositions.forEach(pos => centroid.add(pos));
      centroid.divideScalar(neighborPositions.length);
      
      // Limit displacement based on neighbor distance
      const maxDisplacement = this.calculateMaxDisplacement(vertex, neighborPositions) * 0.5;
      
      const noiseValue = this.noise.perlin3(
        vertex.x * 3,
        vertex.y * 3,
        vertex.z * 3
      );
      
      const displacement = Math.min(
        Math.abs(noiseValue * intensity * 0.3),
        maxDisplacement
      ) * Math.sign(noiseValue);
      
      vertex.normalize().multiplyScalar(vertex.length() + displacement);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private static applyConstrainedAngularDeformation(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const neighbors = this.buildNeighborMap(geometry);
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Get neighbor constraints
      const neighborPositions = neighbors[i].map(idx => {
        const neighbor = new THREE.Vector3();
        neighbor.fromBufferAttribute(positions, idx);
        return neighbor;
      });
      
      const maxDisplacement = this.calculateMaxDisplacement(vertex, neighborPositions) * 0.4;
      
      // Apply controlled angular modification
      const facetDirection = this.calculateFacetDirection(vertex);
      const displacement = Math.min(intensity * 0.4, maxDisplacement);
      
      vertex.add(facetDirection.multiplyScalar(displacement));
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private static applyConstrainedFlatteningDeformation(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const neighbors = this.buildNeighborMap(geometry);
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Get neighbor constraints
      const neighborPositions = neighbors[i].map(idx => {
        const neighbor = new THREE.Vector3();
        neighbor.fromBufferAttribute(positions, idx);
        return neighbor;
      });
      
      const maxDisplacement = this.calculateMaxDisplacement(vertex, neighborPositions) * 0.3;
      
      // Apply controlled flattening
      const flatteningFactor = Math.min(intensity * 0.5, maxDisplacement);
      vertex.y *= (1 - flatteningFactor * 0.5);
      
      // Add controlled surface variation
      const surfaceNoise = this.noise.perlin2(vertex.x * 2, vertex.z * 2) * flatteningFactor;
      vertex.y += surfaceNoise;
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private static buildNeighborMap(geometry: THREE.BufferGeometry): number[][] {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    const neighbors: number[][] = Array.from({ length: positions.count }, () => []);
    
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        // Add neighbors for each vertex in the triangle
        if (!neighbors[a].includes(b)) neighbors[a].push(b);
        if (!neighbors[a].includes(c)) neighbors[a].push(c);
        if (!neighbors[b].includes(a)) neighbors[b].push(a);
        if (!neighbors[b].includes(c)) neighbors[b].push(c);
        if (!neighbors[c].includes(a)) neighbors[c].push(a);
        if (!neighbors[c].includes(b)) neighbors[c].push(b);
      }
    }
    
    return neighbors;
  }

  private static calculateMaxDisplacement(vertex: THREE.Vector3, neighbors: THREE.Vector3[]): number {
    if (neighbors.length === 0) return 0.1;
    
    let minDistance = Infinity;
    for (const neighbor of neighbors) {
      const distance = vertex.distanceTo(neighbor);
      minDistance = Math.min(minDistance, distance);
    }
    
    // Limit displacement to 30% of minimum neighbor distance
    return minDistance * 0.3;
  }

  private static calculateFacetDirection(vertex: THREE.Vector3): THREE.Vector3 {
    // Create controlled angular direction without using Math.sign
    const direction = vertex.clone().normalize();
    
    // Apply smooth directional modification
    const modifier = new THREE.Vector3(
      Math.sin(vertex.x * 2) * 0.5,
      Math.cos(vertex.y * 2) * 0.5,
      Math.sin(vertex.z * 2) * 0.5
    );
    
    return direction.add(modifier).normalize();
  }

  private static validateAndRepairGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    
    if (!indices) return;
    
    // Check for degenerate triangles and remove them
    const validTriangles: number[] = [];
    const vertex1 = new THREE.Vector3();
    const vertex2 = new THREE.Vector3();
    const vertex3 = new THREE.Vector3();
    
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i);
      const b = indices.getX(i + 1);
      const c = indices.getX(i + 2);
      
      vertex1.fromBufferAttribute(positions, a);
      vertex2.fromBufferAttribute(positions, b);
      vertex3.fromBufferAttribute(positions, c);
      
      // Calculate triangle area to detect degenerate triangles
      const edge1 = vertex2.clone().sub(vertex1);
      const edge2 = vertex3.clone().sub(vertex1);
      const area = edge1.cross(edge2).length() * 0.5;
      
      // Only keep triangles with reasonable area
      if (area > 0.001) {
        validTriangles.push(a, b, c);
      }
    }
    
    // Update indices with valid triangles only
    geometry.setIndex(validTriangles);
    geometry.computeVertexNormals();
  }

  private static applyNeighborhoodAwareSmoothing(geometry: THREE.BufferGeometry, type: string): void {
    const positions = geometry.attributes.position;
    const neighbors = this.buildNeighborMap(geometry);
    const vertex = new THREE.Vector3();
    const smoothedPositions: THREE.Vector3[] = [];
    
    // Determine smoothing intensity based on rock type
    const smoothingIntensity = type === 'angular' ? 0.1 : 0.3;
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      if (neighbors[i].length > 0) {
        // Calculate Laplacian smoothing
        const centroid = new THREE.Vector3();
        for (const neighborIdx of neighbors[i]) {
          const neighbor = new THREE.Vector3();
          neighbor.fromBufferAttribute(positions, neighborIdx);
          centroid.add(neighbor);
        }
        centroid.divideScalar(neighbors[i].length);
        
        // Apply smoothing with intensity control
        const smoothed = vertex.clone().lerp(centroid, smoothingIntensity);
        smoothedPositions.push(smoothed);
      } else {
        smoothedPositions.push(vertex.clone());
      }
    }
    
    // Update geometry with smoothed positions using proper method
    for (let i = 0; i < smoothedPositions.length; i++) {
      const pos = smoothedPositions[i];
      positions.setXYZ(i, pos.x, pos.y, pos.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
