
import * as THREE from 'three';
import { ClusterRock, ClusterTier } from '../types/ClusterTypes';
import { RockInstance } from '../types/RockTypes';

export class StackingPhysics {
  
  public static calculateStackingPosition(
    newRock: RockInstance,
    tier: ClusterTier,
    existingRocks: ClusterRock[],
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    switch (tier) {
      case 'foundation':
        return this.calculateFoundationPosition(newRock, clusterCenter);
      case 'support':
        return this.calculateSupportPosition(newRock, existingRocks);
      case 'accent':
        return this.calculateAccentPosition(newRock, existingRocks);
      default:
        return clusterCenter.clone();
    }
  }
  
  private static calculateFoundationPosition(
    rock: RockInstance,
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    // Foundation rocks are placed at ground level with slight embedding
    const position = clusterCenter.clone();
    
    // Add some random offset within reasonable range
    const offsetRange = rock.boundingRadius * 1.5;
    position.x += (Math.random() - 0.5) * offsetRange;
    position.z += (Math.random() - 0.5) * offsetRange;
    
    // Slightly embed in ground
    position.y = -rock.boundingRadius * 0.1;
    
    return position;
  }
  
  private static calculateSupportPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[]
  ): THREE.Vector3 {
    // Find the best foundation rock to lean against
    const foundationRocks = existingRocks.filter(r => r.tier === 'foundation');
    
    if (foundationRocks.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    // Choose the largest foundation rock
    const targetFoundation = foundationRocks.reduce((largest, current) => 
      current.instance.boundingRadius > largest.instance.boundingRadius ? current : largest
    );
    
    // Position at the base of the foundation rock
    const angle = Math.random() * Math.PI * 2;
    const distance = targetFoundation.instance.boundingRadius + rock.boundingRadius * 0.8;
    
    const position = targetFoundation.position.clone();
    position.x += Math.cos(angle) * distance;
    position.z += Math.sin(angle) * distance;
    
    // Calculate realistic height based on contact with foundation
    position.y = this.calculateContactHeight(rock, targetFoundation.instance);
    
    return position;
  }
  
  private static calculateAccentPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[]
  ): THREE.Vector3 {
    // Accent rocks can be placed on top or in gaps
    const supportRocks = existingRocks.filter(r => r.tier === 'support' || r.tier === 'foundation');
    
    if (supportRocks.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    // Choose a random support rock
    const targetSupport = supportRocks[Math.floor(Math.random() * supportRocks.length)];
    
    // Position on top with some offset
    const position = targetSupport.position.clone();
    
    // Add small random offset
    position.x += (Math.random() - 0.5) * rock.boundingRadius;
    position.z += (Math.random() - 0.5) * rock.boundingRadius;
    
    // Place on top
    position.y = targetSupport.position.y + targetSupport.instance.boundingRadius + rock.boundingRadius * 0.8;
    
    return position;
  }
  
  private static calculateContactHeight(
    rock: RockInstance,
    supportRock: RockInstance
  ): number {
    // Simple contact height calculation
    // In a more sophisticated system, this would involve actual collision detection
    return supportRock.boundingRadius * 0.5 + rock.boundingRadius * 0.3;
  }
  
  public static isPositionStable(
    position: THREE.Vector3,
    rock: RockInstance,
    existingRocks: ClusterRock[]
  ): boolean {
    // Check if position doesn't overlap with existing rocks
    for (const existing of existingRocks) {
      const distance = position.distanceTo(existing.position);
      const minDistance = rock.boundingRadius + existing.instance.boundingRadius;
      
      if (distance < minDistance * 0.8) { // Allow some overlap for natural stacking
        return false;
      }
    }
    
    return true;
  }
}
