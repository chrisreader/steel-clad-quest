
import * as THREE from 'three';
import { RockShape, ClusterRole, RockCategory, ClusterLayoutOptions } from '../types/RockTypes';

export class RockGenerationUtils {
  /**
   * Select shape by role with enhanced spire visibility
   */
  public static selectShapeByRole(rockShapes: RockShape[], role: ClusterRole, index: number): RockShape {
    // For large/massive clusters, use weighted selection to increase spire visibility
    if (role === 'foundation' || role === 'support' || role === 'accent') {
      // 30% chance for spire in large clusters (foundation/support)
      // 25% chance for spire in accent positions
      const spireChance = (role === 'accent') ? 0.25 : 0.30;
      
      if (Math.random() < spireChance) {
        const spireShape = rockShapes.find(shape => shape.type === 'spire');
        if (spireShape) {
          console.log(`🗿 Selected SPIRE rock for ${role} role (enhanced visibility)`);
          return spireShape;
        }
      }
    }
    
    // Fallback to existing random selection
    const roleFilteredShapes = rockShapes.filter(shape => {
      // Removed spire exclusion - spires can now appear in all roles
      if (role === 'foundation') {
        return ['boulder', 'slab', 'weathered', 'spire', 'angular'].includes(shape.type);
      } else if (role === 'support') {
        return ['boulder', 'angular', 'flattened', 'spire', 'weathered'].includes(shape.type);
      } else {
        return ['jagged', 'angular', 'flattened', 'spire'].includes(shape.type);
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
    
    // Enhanced properties for spire rocks
    if (rock.userData.role && ['foundation', 'support'].includes(rock.userData.role)) {
      rock.frustumCulled = false; // Ensure spires remain visible at distance
    }
  }

  public static randomizeRotation(rock: THREE.Object3D, role?: ClusterRole): void {
    // Spires get more controlled rotation to maintain their dramatic vertical effect
    const isSpire = (rock as THREE.Mesh).geometry && rock.userData.spireType;
    
    if (isSpire) {
      // Limited rotation for spires to keep them upright and dramatic
      rock.rotation.x = (Math.random() - 0.5) * 0.2; // Very slight tilt
      rock.rotation.y = Math.random() * Math.PI * 2; // Full Y rotation is fine
      rock.rotation.z = (Math.random() - 0.5) * 0.1; // Minimal Z rotation
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
}
