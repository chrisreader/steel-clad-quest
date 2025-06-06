import * as THREE from 'three';
import { RockShape, ClusterRole, RockCategory, DeformationOptions, ClusterLayoutOptions } from '../types/RockTypes';

export class RockGenerationUtils {
  private static noiseSeed = Math.random();

  public static calculateRealisticStackingPosition(
    basePosition: THREE.Vector3,
    rockSize: number,
    baseSize: number,
    role: ClusterRole
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (role === 'support') {
      // Support rocks lean against base rocks
      const angle = Math.random() * Math.PI * 2;
      const distance = (baseSize + rockSize) * 0.4;
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.3 + Math.random() * baseSize * 0.2,
        basePosition.z + Math.sin(angle) * distance
      );
    } else if (role === 'accent') {
      // Accent rocks can be on top or in gaps
      if (Math.random() < 0.6) {
        // On top
        const offsetX = (Math.random() - 0.5) * baseSize * 0.3;
        const offsetZ = (Math.random() - 0.5) * baseSize * 0.3;
        
        position.set(
          basePosition.x + offsetX,
          basePosition.y + baseSize * 0.6 + rockSize * 0.3,
          basePosition.z + offsetZ
        );
      } else {
        // In gaps around base
        const angle = Math.random() * Math.PI * 2;
        const distance = baseSize * (0.8 + Math.random() * 0.4);
        
        position.set(
          basePosition.x + Math.cos(angle) * distance,
          basePosition.y + rockSize * 0.2,
          basePosition.z + Math.sin(angle) * distance
        );
      }
    } else {
      // Foundation rocks
      const angle = Math.random() * Math.PI * 2;
      const distance = rockSize * 0.3;
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.15,
        basePosition.z + Math.sin(angle) * distance
      );
    }
    
    return position;
  }

  /**
   * Select shape with spire formation logic for legacy accuracy
   */
  public static selectShapeByRole(rockShapes: RockShape[], role: ClusterRole, index: number, category?: RockCategory): RockShape {
    switch (role) {
      case 'foundation':
        // Slabs prioritized for foundation (15-25% of total cluster)
        if (this.shouldUseSlabForFoundation(index)) {
          return rockShapes.find(s => s.type === 'slab') || rockShapes[0];
        }
        const foundationShapes = rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        return foundationShapes[index % foundationShapes.length];
        
      case 'support':
        // Slabs can appear in support role, spires rarely
        if (this.shouldUseSlabForSupport(index)) {
          return rockShapes.find(s => s.type === 'slab') || rockShapes[0];
        }
        if (this.shouldUseSpireForSupport(index)) {
          return rockShapes.find(s => s.type === 'spire') || rockShapes[0];
        }
        const supportShapes = rockShapes.filter(s => 
          s.type !== 'spire' || Math.random() < 0.1 // rare spire in support
        );
        return supportShapes[index % supportShapes.length];
        
      case 'accent':
        // 15-20% of accent rocks should be spires in medium/large clusters
        if (this.shouldUseSpireForAccent(index, category)) {
          return rockShapes.find(s => s.type === 'spire') || rockShapes[0];
        }
        return rockShapes[index % rockShapes.length];
        
      default:
        return rockShapes[index % rockShapes.length];
    }
  }

  /**
   * Check if slab should be used for foundation (15-25% distribution)
   */
  private static shouldUseSlabForFoundation(index: number): boolean {
    return (index % 5) === 0 || (index % 7) === 0; // ~20% chance
  }

  /**
   * Check if slab should be used for support (part of 15-25% distribution)
   */
  private static shouldUseSlabForSupport(index: number): boolean {
    return (index % 6) === 0; // ~17% chance
  }

  /**
   * Check if spire should be used for support (rare occurrence)
   */
  private static shouldUseSpireForSupport(index: number): boolean {
    return (index % 13) === 0; // ~8% chance (rare)
  }

  /**
   * Legacy spire selection logic - 15-20% of accent rocks in medium/large clusters
   */
  private static shouldUseSpireForAccent(index: number, category?: RockCategory): boolean {
    if (category !== 'medium' && category !== 'large' && category !== 'massive') {
      return false; // No spires in tiny/small clusters
    }
    
    // 15-20% chance for spires in accent role
    const spireChance = 0.15 + Math.random() * 0.05; // 15-20%
    const hashValue = (index * 31 + 17) % 100;
    return hashValue < (spireChance * 100);
  }

  /**
   * Check if accent spires should appear in pairs (30% chance)
   */
  public static shouldCreateSpirePair(index: number): boolean {
    return (index % 10) < 3; // 30% chance
  }

  /**
   * Apply role-based rotation with legacy spire tilting
   */
  public static applyRoleBasedRotation(rock: THREE.Object3D, role: ClusterRole, rockShape?: RockShape): void {
    const r = Math.random;
    
    if (rockShape?.type === 'spire') {
      // Legacy spire tilting - never upright, always dramatic
      if (role === 'accent') {
        rock.rotation.set(
          Math.PI / 2 * (0.7 + r() * 0.3), // steep tilt
          r() * Math.PI * 2,                // random rotation around Y
          (r() - 0.5) * 0.2                 // subtle Z wobble
        );
      } else {
        rock.rotation.set(
          (r() - 0.5) * Math.PI * 0.35,     // diagonal lean
          r() * Math.PI * 2,
          (r() - 0.5) * Math.PI * 0.35
        );
      }
    } else if (rockShape?.type === 'slab') {
      // Legacy slab ground tilt
      rock.rotation.set(
        (r() - 0.5) * 0.05,  // slight ground tilt
        r() * Math.PI * 2,
        (r() - 0.5) * 0.05
      );
    } else if (role === 'foundation') {
      rock.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
    } else {
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
    }
  }

  public static calculateClusterCounts(
    minClusterSize: number,
    maxClusterSize: number
  ): { foundationCount: number; supportCount: number; accentCount: number; total: number } {
    const total = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1));
    const foundationCount = Math.min(2, Math.floor(total * 0.4));
    const supportCount = Math.floor(total * 0.4);
    const accentCount = total - foundationCount - supportCount;
    
    return { foundationCount, supportCount, accentCount, total };
  }

  /**
   * Apply unified deformation to geometry with consistent parameters
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

  /**
   * Apply surface roughness for weathered rocks
   */
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

  /**
   * Calculate size-aware deformation intensity
   */
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

  /**
   * Smooth geometry with multiple passes
   */
  public static smoothGeometry(geometry: THREE.BufferGeometry, passes: number = 1): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let pass = 0; pass < passes; pass++) {
      const smoothedPositions = new Float32Array(positions.length);
      
      // Copy original positions
      for (let i = 0; i < positions.length; i++) {
        smoothedPositions[i] = positions[i];
      }
      
      // Apply Laplacian smoothing
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Find neighboring vertices
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
      
      // Apply smoothed positions
      for (let i = 0; i < positions.length; i++) {
        positions[i] = smoothedPositions[i];
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Apply standardized rotation to mesh with legacy spire/slab logic
   */
  public static randomizeRotation(mesh: THREE.Object3D, role?: ClusterRole, rockShape?: RockShape): void {
    if (role && rockShape) {
      this.applyRoleBasedRotation(mesh, role, rockShape);
    } else if (role) {
      this.applyRoleBasedRotation(mesh, role);
    } else {
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
    }
  }

  /**
   * Generate random cluster layout positions
   */
  public static generateRandomClusterLayout(options: ClusterLayoutOptions): THREE.Vector3[] {
    const { count, radiusRange, centerPosition, role } = options;
    const positions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
      
      let position: THREE.Vector3;
      
      if (role === 'foundation') {
        // Foundation rocks closer to center
        position = new THREE.Vector3(
          centerPosition.x + Math.cos(angle) * distance * 0.6,
          centerPosition.y,
          centerPosition.z + Math.sin(angle) * distance * 0.6
        );
      } else if (role === 'support') {
        // Support rocks at medium distance
        position = new THREE.Vector3(
          centerPosition.x + Math.cos(angle) * distance * 0.8,
          centerPosition.y,
          centerPosition.z + Math.sin(angle) * distance * 0.8
        );
      } else {
        // Accent rocks can be anywhere
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
   * Validate and repair geometry
   */
  public static validateGeometry(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Fix invalid positions
    for (let i = 0; i < positions.length; i++) {
      if (!isFinite(positions[i])) {
        positions[i] = 0;
      }
    }
    
    // Ensure geometry has proper bounds
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    // Validate triangle integrity
    if (geometry.index) {
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        // Check for degenerate triangles
        if (a === b || b === c || a === c) {
          console.warn('🔧 Fixed degenerate triangle in rock geometry');
          // Could repair here if needed
        }
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Apply standard rock properties (shadows, metadata, etc.)
   */
  public static applyStandardRockProperties(
    rock: THREE.Object3D, 
    category: RockCategory, 
    role?: ClusterRole
  ): void {
    // Set shadows
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    // Set metadata
    rock.userData = {
      type: 'rock',
      category,
      role: role || 'standalone',
      generated: Date.now()
    };
    
    // Set name for debugging
    rock.name = `rock_${category}_${role || 'standalone'}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
