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
    const isSpire = rock.geometry && rock.userData.spireType;
    
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
}
