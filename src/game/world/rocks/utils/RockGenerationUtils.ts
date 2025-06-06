import * as THREE from 'three';
import { RockShape, ClusterRole, RockCategory, ClusterLayoutOptions } from '../types/RockTypes';

export class RockGenerationUtils {
  // Track spires per cluster to limit oversaturation
  private static clusterSpireCount: Map<string, number> = new Map();
  
  /**
   * Select shape by role with RESTORED realistic spire visibility (based on original code)
   */
  public static selectShapeByRole(
    rockShapes: RockShape[], 
    role: ClusterRole, 
    index: number,
    clusterId?: string
  ): RockShape {
    // RESTORED: Realistic spire frequency - tallObelisk represents ~25% of shape pool
    // but with cluster limits to prevent oversaturation
    const spireShape = rockShapes.find(shape => shape.type === 'spire');
    
    if (spireShape && clusterId) {
      const currentSpireCount = this.clusterSpireCount.get(clusterId) || 0;
      
      // RESTORED: Maximum 2 spires per cluster (from original code)
      if (currentSpireCount < 2) {
        // RESTORED: 25% base chance for spires in weighted selection
        const spireChance = 0.25;
        
        // RESTORED: Reduce chance if already have 1 spire (70% fallback chance)
        const adjustedChance = currentSpireCount >= 1 ? spireChance * 0.3 : spireChance;
        
        if (Math.random() < adjustedChance) {
          this.clusterSpireCount.set(clusterId, currentSpireCount + 1);
          console.log(`🗿 Selected tallObelisk spire (${currentSpireCount + 1}/2 in cluster)`);
          return spireShape;
        }
      }
    }
    
    // Fallback to existing role-based selection
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

  /**
   * Reset spire count for a new cluster
   */
  public static resetClusterSpireCount(clusterId: string): void {
    this.clusterSpireCount.delete(clusterId);
  }

  public static generateRandomClusterLayout(options: ClusterLayoutOptions): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const { count, radiusRange, centerPosition, role } = options;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const [minRadius, maxRadius] = radiusRange;
      let distance = minRadius + Math.random() * (maxRadius - minRadius);
      
      // RESTORED: Spire positioning variation (original: position.x += r()*0.4, z += r()*0.4)
      if (role === 'foundation' || role === 'support') {
        distance = distance * (0.7 + Math.random() * 0.6);
      }
      
      const position = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * distance
      );
      
      // RESTORED: Add slight positional staggering for spires
      if (Math.random() < 0.25) { // 25% chance for positional variation
        position.x += (Math.random() - 0.5) * 0.8; // ±0.4 variation
        position.z += (Math.random() - 0.5) * 0.8;
      }
      
      positions.push(position);
    }
    
    return positions;
  }

  public static calculateClusterCounts(minClusterSize: number, maxClusterSize: number) {
    // RESTORED: Original cluster sizes - Large: 2-3 rocks, Massive: 3-4 rocks
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
    
    // Enhanced properties for spire rocks
    if (rock.userData.role && ['foundation', 'support'].includes(rock.userData.role)) {
      rock.frustumCulled = false;
    }
  }

  public static randomizeRotation(rock: THREE.Object3D, role?: ClusterRole): void {
    const isSpire = (rock as THREE.Mesh).geometry && rock.userData.spireType;
    
    if (isSpire) {
      // RESTORED: Original natural tilt - ±4.5° on X and Z axes (±0.08 radians)
      rock.rotation.x = (Math.random() - 0.5) * 0.08; // ±4.5° natural tilt
      rock.rotation.y = Math.random() * Math.PI * 2;   // Full 360° Y rotation
      rock.rotation.z = (Math.random() - 0.5) * 0.08; // ±4.5° natural tilt
      
      console.log(`🗿 Applied realistic spire rotation: X=${(rock.rotation.x * 180/Math.PI).toFixed(1)}°, Z=${(rock.rotation.z * 180/Math.PI).toFixed(1)}°`);
    } else {
      // Normal rotation for other rocks
      rock.rotation.x = Math.random() * 0.3;
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.rotation.z = Math.random() * 0.3;
    }
  }

  /**
   * RESTORED: Create realistic spire geometry (based on original tallObelisk)
   */
  public static createSpireGeometry(size: number): THREE.BufferGeometry {
    const r = Math.random;
    
    // RESTORED: Original spire geometry parameters
    const geometry = new THREE.CylinderGeometry(
      (0.2 + r() * 0.2) * size,    // top radius
      (0.05 + r() * 0.1) * size,  // bottom radius  
      (2 + r() * 1.2) * size,     // height
      8                            // segments
    );
    
    // RESTORED: Organic wideness scaling
    geometry.scale(1 + r() * 0.4, 1, 1 + r() * 0.4);
    
    return geometry;
  }

  /**
   * RESTORED: Spire stacking logic - 30% chance to stack on boulder base
   */
  public static shouldStackSpire(): boolean {
    return Math.random() < 0.3; // 30% chance for stacking
  }

  /**
   * Create boulder base for spire stacking
   */
  public static createBoulderBase(spireSize: number): THREE.BufferGeometry {
    const r = Math.random;
    const baseSize = spireSize * (0.8 + r() * 0.4); // Base is 80-120% of spire size
    
    const geometry = new THREE.SphereGeometry(baseSize, 12, 8);
    
    // Flatten the boulder base slightly
    geometry.scale(1.2, 0.6, 1.1);
    
    return geometry;
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
}
