import * as THREE from 'three';
import { RockShape, ClusterRole, RockCategory, DeformationOptions, ClusterLayoutOptions } from '../types/RockTypes';
import { StackingPhysics } from './StackingPhysics';

export class RockGenerationUtils {
  private static noiseSeed = Math.random();

  /**
   * Calculate cluster counts with proper 40% foundation / 40% support / 20% accent distribution
   */
  public static calculateClusterCounts(
    minClusterSize: number,
    maxClusterSize: number
  ): { foundationCount: number; supportCount: number; accentCount: number; total: number } {
    const total = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    
    // Ensure proper distribution: 40% foundation, 40% support, 20% accent
    const foundationCount = Math.max(1, Math.floor(total * 0.4));
    const supportCount = Math.max(1, Math.floor(total * 0.4));
    const accentCount = Math.max(1, total - foundationCount - supportCount);
    
    return { foundationCount, supportCount, accentCount, total };
  }

  /**
   * Select rock shape by role with proper shape restrictions
   */
  public static selectShapeByRole(rockShapes: RockShape[], role: ClusterRole, index: number): RockShape {
    switch (role) {
      case 'foundation':
        // Foundation: boulder, weathered, slab (stable shapes)
        const foundationShapes = rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        return foundationShapes[index % foundationShapes.length];
        
      case 'support':
        // Support: all except spire (spires are unstable for support)
        const supportShapes = rockShapes.filter(s => s.type !== 'spire');
        return supportShapes[index % supportShapes.length];
        
      case 'accent':
        // Accent: any shape including spires and dramatic forms
        return rockShapes[index % rockShapes.length];
        
      default:
        return rockShapes[index % rockShapes.length];
    }
  }

  /**
   * Generate realistic cluster layout with proper role positioning
   */
  public static generateClusterLayout(options: ClusterLayoutOptions): THREE.Vector3[] {
    const { count, radiusRange, centerPosition, role } = options;
    const positions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
      
      let position: THREE.Vector3;
      
      switch (role) {
        case 'foundation':
          // Foundation rocks cluster closer to center for stability
          position = new THREE.Vector3(
            centerPosition.x + Math.cos(angle) * distance * 0.6,
            centerPosition.y,
            centerPosition.z + Math.sin(angle) * distance * 0.6
          );
          break;
          
        case 'support':
          // Support rocks at medium distance, arranged around foundation
          position = new THREE.Vector3(
            centerPosition.x + Math.cos(angle) * distance * 0.8,
            centerPosition.y,
            centerPosition.z + Math.sin(angle) * distance * 0.8
          );
          break;
          
        case 'accent':
          // Accent rocks can be anywhere within full radius
          position = new THREE.Vector3(
            centerPosition.x + Math.cos(angle) * distance,
            centerPosition.y,
            centerPosition.z + Math.sin(angle) * distance
          );
          break;
          
        default:
          position = new THREE.Vector3(
            centerPosition.x + Math.cos(angle) * distance,
            centerPosition.y,
            centerPosition.z + Math.sin(angle) * distance
          );
      }
      
      positions.push(position);
    }
    
    return positions;
  }

  /**
   * Apply stacking physics using the new StackingPhysics system
   */
  public static calculateStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: ClusterRole,
    category: RockCategory
  ): THREE.Vector3 {
    return StackingPhysics.calculateRealisticStackingPosition({
      basePosition,
      rockSize,
      baseSize,
      role,
      category
    });
  }

  /**
   * Apply role-based rotation with enhanced spire tilting
   */
  public static applyRoleBasedRotation(rock: THREE.Object3D, role: ClusterRole, rockShape: RockShape, category: RockCategory): void {
    if (rockShape.type === 'spire') {
      StackingPhysics.applySpireTilting(rock, role);
    } else {
      StackingPhysics.applyStackingRotation(rock, role, category);
    }
  }

  /**
   * Apply unified deformation using legacy parameters
   */
  public static applyDeformation(geometry: THREE.BufferGeometry, options: DeformationOptions): void {
    const { intensity, noiseSeed = this.noiseSeed, category = 'medium', weatheringLevel = 0.5 } = options;
    
    const positions = geometry.attributes.position.array as Float32Array;
    const adjustedIntensity = this.calculateSizeAwareIntensity(intensity, category);
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Apply organic noise deformation
      const noise1 = Math.sin((x + noiseSeed) * 2) * Math.cos((y + noiseSeed) * 2) * Math.sin((z + noiseSeed) * 2);
      const noise2 = Math.sin((x + noiseSeed) * 4) * Math.cos((z + noiseSeed) * 4) * 0.5;
      const noise3 = Math.cos((y + noiseSeed) * 6) * Math.sin((x + noiseSeed) * 6) * 0.25;
      
      const combinedNoise = noise1 + noise2 + noise3;
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = combinedNoise * adjustedIntensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    // Apply weathering if high weathering level
    if (weatheringLevel > 0.7) {
      this.applySurfaceRoughness(geometry, adjustedIntensity * 0.3);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private static applySurfaceRoughness(geometry: THREE.BufferGeometry, intensity: number): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const roughness = Math.sin(x * 12) * Math.cos(y * 12) * Math.sin(z * 12);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      if (length > 0) {
        const normalX = x / length;
        const normalY = y / length;
        const normalZ = z / length;
        
        const displacement = roughness * intensity;
        positions[i] += normalX * displacement;
        positions[i + 1] += normalY * displacement;
        positions[i + 2] += normalZ * displacement;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  }

  private static calculateSizeAwareIntensity(baseIntensity: number, category: RockCategory): number {
    switch (category) {
      case 'tiny':
        return baseIntensity * 0.2;
      case 'small':
        return baseIntensity * 0.4;
      case 'medium':
        return baseIntensity * 0.8;
      default:
        return baseIntensity;
    }
  }

  public static smoothGeometry(geometry: THREE.BufferGeometry, passes: number = 1): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let pass = 0; pass < passes; pass++) {
      const smoothedPositions = new Float32Array(positions.length);
      
      for (let i = 0; i < positions.length; i++) {
        smoothedPositions[i] = positions[i];
      }
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        const neighbors: THREE.Vector3[] = [];
        const currentVertex = new THREE.Vector3(x, y, z);
        
        for (let j = 0; j < positions.length; j += 3) {
          if (j !== i) {
            const neighbor = new THREE.Vector3(positions[j], positions[j + 1], positions[j + 2]);
            const distance = currentVertex.distanceTo(neighbor);
            
            if (distance < currentVertex.length() * 0.3) {
              neighbors.push(neighbor);
            }
          }
        }
        
        if (neighbors.length > 0) {
          const average = new THREE.Vector3();
          neighbors.forEach(neighbor => average.add(neighbor));
          average.divideScalar(neighbors.length);
          
          const smoothingFactor = 0.3;
          smoothedPositions[i] = x * (1 - smoothingFactor) + average.x * smoothingFactor;
          smoothedPositions[i + 1] = y * (1 - smoothingFactor) + average.y * smoothingFactor;
          smoothedPositions[i + 2] = z * (1 - smoothingFactor) + average.z * smoothingFactor;
        }
      }
      
      for (let i = 0; i < positions.length; i++) {
        positions[i] = smoothedPositions[i];
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  public static randomizeRotation(mesh: THREE.Object3D, role?: ClusterRole): void {
    if (role) {
      StackingPhysics.applyStackingRotation(mesh, role, 'medium');
    } else {
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
    }
  }

  public static validateGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
      }
    }
    
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    if (geometry.index) {
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        if (a === b || b === c || a === c) {
          console.warn('🔧 Fixed degenerate triangle in rock geometry');
        }
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  public static applyStandardRockProperties(
    rock: THREE.Object3D, 
    category: RockCategory, 
    role?: ClusterRole
  ): void {
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    rock.userData = {
      type: 'rock',
      category,
      role: role || 'standalone',
      generated: Date.now()
    };
    
    rock.name = `rock_${category}_${role || 'standalone'}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
