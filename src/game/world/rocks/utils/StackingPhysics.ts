
import * as THREE from 'three';
import { ClusterRole, RockCategory } from '../types/RockTypes';

export interface StackingConfig {
  basePosition: THREE.Vector3;
  rockSize: number;
  baseSize: number;
  role: ClusterRole;
  category: RockCategory;
}

export class StackingPhysics {
  /**
   * Calculate realistic stacking position with proper contact physics
   */
  public static calculateRealisticStackingPosition(config: StackingConfig): THREE.Vector3 {
    const { basePosition, rockSize, baseSize, role, category } = config;
    const position = new THREE.Vector3();
    
    switch (role) {
      case 'foundation':
        return this.calculateFoundationPosition(basePosition, rockSize);
        
      case 'support':
        return this.calculateSupportPosition(basePosition, rockSize, baseSize, category);
        
      case 'accent':
        return this.calculateAccentPosition(basePosition, rockSize, baseSize, category);
        
      default:
        return basePosition.clone();
    }
  }

  /**
   * Calculate foundation rock position (embedded at ground level)
   */
  private static calculateFoundationPosition(basePosition: THREE.Vector3, rockSize: number): THREE.Vector3 {
    const position = basePosition.clone();
    
    // Slight clustering with small random offset
    const clusterOffset = rockSize * 0.3;
    const angle = Math.random() * Math.PI * 2;
    
    position.x += Math.cos(angle) * clusterOffset * (Math.random() - 0.5);
    position.z += Math.sin(angle) * clusterOffset * (Math.random() - 0.5);
    
    // Embed slightly in ground for stability
    position.y = rockSize * (0.1 + Math.random() * 0.1);
    
    return position;
  }

  /**
   * Calculate support rock position (leaning against foundation)
   */
  private static calculateSupportPosition(
    basePosition: THREE.Vector3, 
    rockSize: number, 
    baseSize: number,
    category: RockCategory
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    // Calculate contact distance based on rock sizes
    const contactDistance = (baseSize + rockSize) * 0.4;
    const angle = Math.random() * Math.PI * 2;
    
    // Position around base with contact physics
    position.set(
      basePosition.x + Math.cos(angle) * contactDistance,
      basePosition.y + this.calculateSupportHeight(rockSize, baseSize, category),
      basePosition.z + Math.sin(angle) * contactDistance
    );
    
    // Add slight vertical jitter for natural feel
    position.y += (Math.random() - 0.5) * rockSize * 0.2;
    
    return position;
  }

  /**
   * Calculate accent rock position (top layer or gaps)
   */
  private static calculateAccentPosition(
    basePosition: THREE.Vector3, 
    rockSize: number, 
    baseSize: number,
    category: RockCategory
  ): THREE.Vector3 {
    const position = new THREE.Vector3();
    
    if (Math.random() < 0.6) {
      // Place on top of base
      const offsetX = (Math.random() - 0.5) * baseSize * 0.3;
      const offsetZ = (Math.random() - 0.5) * baseSize * 0.3;
      
      position.set(
        basePosition.x + offsetX,
        basePosition.y + baseSize * 0.6 + rockSize * 0.3,
        basePosition.z + offsetZ
      );
    } else {
      // Place in gaps around base
      const angle = Math.random() * Math.PI * 2;
      const distance = baseSize * (0.8 + Math.random() * 0.4);
      
      position.set(
        basePosition.x + Math.cos(angle) * distance,
        basePosition.y + rockSize * 0.2,
        basePosition.z + Math.sin(angle) * distance
      );
    }
    
    return position;
  }

  /**
   * Calculate support rock height based on leaning physics
   */
  private static calculateSupportHeight(rockSize: number, baseSize: number, category: RockCategory): number {
    const baseLeanHeight = rockSize * 0.3;
    const baseContactHeight = baseSize * 0.2;
    
    // Larger categories have more dramatic leaning
    const categoryMultiplier = category === 'massive' ? 1.4 : 
                              category === 'large' ? 1.2 : 1.0;
    
    return (baseLeanHeight + baseContactHeight) * categoryMultiplier;
  }

  /**
   * Apply realistic rotation for stacked rocks
   */
  public static applyStackingRotation(mesh: THREE.Object3D, role: ClusterRole, category: RockCategory): void {
    const r = Math.random;
    
    switch (role) {
      case 'foundation':
        // Minimal rotation for stability
        mesh.rotation.set(
          (r() - 0.5) * 0.3,
          r() * Math.PI * 2,
          (r() - 0.5) * 0.3
        );
        break;
        
      case 'support':
        // Moderate leaning for natural contact
        const leanIntensity = category === 'massive' ? 0.4 : 
                             category === 'large' ? 0.3 : 0.2;
        mesh.rotation.set(
          (r() - 0.5) * leanIntensity,
          r() * Math.PI * 2,
          (r() - 0.5) * leanIntensity
        );
        break;
        
      case 'accent':
        // Full rotation freedom for natural scatter
        mesh.rotation.set(
          (r() - 0.5) * Math.PI * 0.6,
          r() * Math.PI * 2,
          (r() - 0.5) * Math.PI * 0.6
        );
        break;
    }
  }

  /**
   * Apply dramatic spire tilting based on role
   */
  public static applySpireTilting(mesh: THREE.Object3D, role: ClusterRole): void {
    const r = Math.random;
    
    if (role === 'accent' && r() < 0.3) {
      // 30% chance for dramatic accent spire tilting
      mesh.rotation.set(
        Math.PI / 2 * (0.7 + r() * 0.3),
        r() * Math.PI * 2,
        (r() - 0.5) * 0.2
      );
    } else {
      // Standard spire tilting
      mesh.rotation.set(
        (r() - 0.5) * Math.PI * 0.35,
        r() * Math.PI * 2,
        (r() - 0.5) * Math.PI * 0.35
      );
    }
  }

  /**
   * Check for collision overlap and adjust position
   */
  public static avoidCollisionOverlap(
    newPosition: THREE.Vector3, 
    newSize: number, 
    existingPositions: Array<{ position: THREE.Vector3; size: number }>
  ): THREE.Vector3 {
    const adjustedPosition = newPosition.clone();
    const minDistance = newSize * 0.8;
    
    for (const existing of existingPositions) {
      const distance = adjustedPosition.distanceTo(existing.position);
      const requiredDistance = (newSize + existing.size) * 0.4;
      
      if (distance < requiredDistance) {
        // Push away from collision
        const direction = adjustedPosition.clone().sub(existing.position).normalize();
        adjustedPosition.add(direction.multiplyScalar(requiredDistance - distance + minDistance));
      }
    }
    
    return adjustedPosition;
  }
}
