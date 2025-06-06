import * as THREE from 'three';
import { RockShape, ClusterRole, RockCategory, ClusterLayoutOptions } from '../types/RockTypes';

export class RockGenerationUtils {
  private static spireCountPerCluster = new Map<string, number>();

  /**
   * Choose weighted shape type with spire limiting
   */
  public static chooseWeighted(shapes: RockShape[], clusterId: string): RockShape {
    // Initialize spire count for new clusters
    if (!this.spireCountPerCluster.has(clusterId)) {
      this.spireCountPerCluster.set(clusterId, 0);
    }

    const currentSpireCount = this.spireCountPerCluster.get(clusterId) || 0;
    
    // Weighted shape selection pool (spire = ~25% chance)
    const weightedPool = [
      'boulder', 'boulder', 'boulder',  // 3/12 = 25%
      'angular', 'angular', 'weathered', // 3/12 = 25% 
      'slab', 'flattened', 'jagged',    // 3/12 = 25%
      'spire', 'spire', 'spire'         // 3/12 = 25%
    ];

    let selectedType = weightedPool[Math.floor(Math.random() * weightedPool.length)];

    // Limit spires per cluster (max 2)
    if (selectedType === 'spire') {
      if (currentSpireCount >= 2 && Math.random() < 0.7) {
        // 70% chance to fallback to other shapes when limit exceeded
        const fallbackPool = ['boulder', 'angular', 'slab', 'weathered'];
        selectedType = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      } else {
        this.spireCountPerCluster.set(clusterId, currentSpireCount + 1);
      }
    }

    // Find matching shape or fallback
    const matchingShape = shapes.find(shape => shape.type === selectedType);
    return matchingShape || shapes[Math.floor(Math.random() * shapes.length)];
  }

  /**
   * Select shape by role with realistic spire frequency
   */
  public static selectShapeByRole(rockShapes: RockShape[], role: ClusterRole, index: number, clusterId?: string): RockShape {
    if (clusterId) {
      return this.chooseWeighted(rockShapes, clusterId);
    }

    // Fallback to role-based selection for non-cluster rocks
    const roleFilteredShapes = rockShapes.filter(shape => {
      if (role === 'foundation') {
        return ['boulder', 'slab', 'weathered', 'angular'].includes(shape.type);
      } else if (role === 'support') {
        return ['boulder', 'angular', 'flattened', 'weathered'].includes(shape.type);
      } else {
        return ['jagged', 'angular', 'flattened'].includes(shape.type);
      }
    });
    
    if (roleFilteredShapes.length === 0) {
      return rockShapes[index % rockShapes.length];
    }
    
    return roleFilteredShapes[index % roleFilteredShapes.length];
  }

  public static generateRandomClusterLayout(options: ClusterLayoutOptions): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const { count, radiusRange, centerPosition, role } = options;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const [minRadius, maxRadius] = radiusRange;
      let distance = minRadius + Math.random() * (maxRadius - minRadius);
      
      // For spire-favorable positioning in support/foundation roles
      if (role === 'foundation' || role === 'support') {
        // Slightly bias spires toward more prominent positions
        distance = distance * (0.7 + Math.random() * 0.6);
      }
      
      const position = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * distance
      );
      
      positions.push(position);
    }
    
    return positions;
  }

  public static calculateClusterCounts(minClusterSize: number, maxClusterSize: number) {
    const totalRocks = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    const foundationCount = Math.max(1, Math.floor(totalRocks * 0.3));
    const supportCount = Math.floor(totalRocks * 0.4);
    const accentCount = totalRocks - foundationCount - supportCount;
    
    return {
      foundationCount,
      supportCount,
      accentCount,
      total: totalRocks
    };
  }

  public static applyStandardRockProperties(rock: THREE.Object3D, category: RockCategory, role?: ClusterRole): void {
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.userData = { 
      type: 'rock', 
      category,
      role: role || 'standalone'
    };
    
    // Add stacking logic for spires (30% chance)
    if ((rock as THREE.Mesh).geometry && rock.userData.spireType && Math.random() < 0.3) {
      rock.userData.hasStacking = true;
    }
  }

  public static randomizeRotation(rock: THREE.Object3D, role?: ClusterRole): void {
    const isSpire = (rock as THREE.Mesh).geometry && rock.userData.spireType;
    
    if (isSpire) {
      // Original natural spire rotation (±4.5° tilt)
      const r = () => Math.random();
      rock.rotation.x = (r() - 0.5) * 0.08; // ±4.5° x tilt
      rock.rotation.y = r() * Math.PI * 2;   // Full 360° y rotation
      rock.rotation.z = (r() - 0.5) * 0.08; // ±4.5° z tilt
      
      // Add positional staggering for natural look
      if (rock.position) {
        rock.position.x += (Math.random() - 0.5) * 0.4;
        rock.position.z += (Math.random() - 0.5) * 0.4;
      }
    } else {
      // Normal rotation for other rocks
      rock.rotation.x = Math.random() * 0.3;
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.rotation.z = Math.random() * 0.3;
    }
  }

  /**
   * Validate geometry for mesh integrity
   */
  public static validateGeometry(geometry: THREE.BufferGeometry): void {
    if (!geometry.attributes.position) {
      console.warn('🪨 Geometry missing position attribute');
      return;
    }
    
    // Ensure geometry has proper normals
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    // Update geometry attributes
    geometry.attributes.position.needsUpdate = true;
    if (geometry.attributes.normal) {
      geometry.attributes.normal.needsUpdate = true;
    }
  }

  /**
   * Apply deformation to geometry with intensity control
   */
  public static applyDeformation(
    geometry: THREE.BufferGeometry, 
    options: {
      intensity: number;
      category: RockCategory;
      weatheringLevel?: number;
    }
  ): void {
    const positions = geometry.attributes.position.array as Float32Array;
    const { intensity, category } = options;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      if (distance > 0) {
        const noise = Math.sin(x * 2) * Math.cos(y * 2) * Math.sin(z * 2);
        const deformation = noise * intensity;
        
        const normalX = x / distance;
        const normalY = y / distance;
        const normalZ = z / distance;
        
        positions[i] += normalX * deformation;
        positions[i + 1] += normalY * deformation;
        positions[i + 2] += normalZ * deformation;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Smooth geometry to reduce sharp edges
   */
  public static smoothGeometry(geometry: THREE.BufferGeometry, iterations: number = 1): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let iter = 0; iter < iterations; iter++) {
      const smoothedPositions = new Float32Array(positions.length);
      
      for (let i = 0; i < positions.length; i += 3) {
        // Simple smoothing by averaging with nearby vertices
        let avgX = positions[i];
        let avgY = positions[i + 1];
        let avgZ = positions[i + 2];
        let count = 1;
        
        // Find nearby vertices (simplified approach)
        for (let j = 0; j < positions.length; j += 3) {
          if (i !== j) {
            const dx = positions[i] - positions[j];
            const dy = positions[i + 1] - positions[j + 1];
            const dz = positions[i + 2] - positions[j + 2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance < 0.5) { // If vertices are close
              avgX += positions[j];
              avgY += positions[j + 1];
              avgZ += positions[j + 2];
              count++;
            }
          }
        }
        
        smoothedPositions[i] = avgX / count;
        smoothedPositions[i + 1] = avgY / count;
        smoothedPositions[i + 2] = avgZ / count;
      }
      
      // Copy smoothed positions back
      for (let i = 0; i < positions.length; i++) {
        positions[i] = smoothedPositions[i];
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Reset spire count for new cluster generation
   */
  public static resetClusterSpireCount(clusterId: string): void {
    this.spireCountPerCluster.delete(clusterId);
  }
}
