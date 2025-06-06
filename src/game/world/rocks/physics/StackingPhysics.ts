
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
        return this.calculateSupportPosition(newRock, existingRocks, clusterCenter);
      case 'accent':
        return this.calculateAccentPosition(newRock, existingRocks, clusterCenter);
      default:
        return clusterCenter.clone();
    }
  }
  
  public positionFoundationRock(rock: THREE.Object3D, position: THREE.Vector3, size: number): void {
    rock.position.copy(position);
    rock.position.y -= size * 0.15; // Embed 15% into ground
    rock.scale.set(size, size, size);
  }
  
  public positionSupportRock(rock: THREE.Object3D, position: THREE.Vector3, size: number, existingRocks: THREE.Object3D[]): void {
    const nearest = this.findNearestRock(position, existingRocks);
    if (nearest) {
      const offset = position.clone().sub(nearest.position).normalize().multiplyScalar(size);
      rock.position.copy(nearest.position).add(offset);
      rock.position.y = nearest.position.y + size * 0.5;
      rock.scale.set(size, size, size);
    } else {
      // Fallback to foundation positioning
      this.positionFoundationRock(rock, position, size);
    }
  }
  
  public positionAccentRock(rock: THREE.Object3D, position: THREE.Vector3, size: number, existingRocks: THREE.Object3D[]): void {
    const nearest = this.findNearestRock(position, existingRocks);
    if (nearest) {
      const offset = position.clone().sub(nearest.position).normalize().multiplyScalar(size * 0.5);
      rock.position.copy(nearest.position).add(offset);
      rock.position.y = nearest.position.y + size * 0.7;
      rock.scale.set(size, size, size);
    } else {
      // Fallback to foundation positioning
      this.positionFoundationRock(rock, position, size);
    }
  }
  
  private findNearestRock(position: THREE.Vector3, rocks: THREE.Object3D[]): THREE.Object3D | null {
    let nearest: THREE.Object3D | null = null;
    let minDist = Infinity;
    
    for (const rock of rocks) {
      const dist = position.distanceTo(rock.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = rock;
      }
    }
    
    return nearest;
  }
  
  private static calculateFoundationPosition(
    rock: RockInstance,
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    // Foundation rocks are properly grounded at Y=0
    const position = clusterCenter.clone();
    
    // Add reasonable offset within cluster bounds
    const offsetRange = rock.boundingRadius * 2;
    position.x += (Math.random() - 0.5) * offsetRange;
    position.z += (Math.random() - 0.5) * offsetRange;
    
    // Ground properly - rocks sit ON the ground, not embedded deeply
    position.y = 0;
    
    return position;
  }
  
  private static calculateSupportPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[],
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    // Find suitable foundation rocks to lean against
    const foundationRocks = existingRocks.filter(r => r.tier === 'foundation');
    
    if (foundationRocks.length === 0) {
      // Fallback to foundation position if no foundation rocks exist
      return this.calculateFoundationPosition(rock, clusterCenter);
    }
    
    // Choose the most suitable foundation rock (largest and stable)
    const targetFoundation = foundationRocks.reduce((best, current) => {
      const stability = current.instance.properties.stability * current.instance.boundingRadius;
      const bestStability = best.instance.properties.stability * best.instance.boundingRadius;
      return stability > bestStability ? current : best;
    });
    
    // Calculate realistic contact position
    const contactAngle = Math.random() * Math.PI * 2;
    const contactDistance = targetFoundation.instance.boundingRadius + rock.boundingRadius * 0.6;
    
    const position = targetFoundation.position.clone();
    position.x += Math.cos(contactAngle) * contactDistance;
    position.z += Math.sin(contactAngle) * contactDistance;
    
    // Calculate realistic height based on actual contact geometry
    position.y = this.calculateRealisticContactHeight(
      rock, 
      targetFoundation.instance, 
      contactAngle
    );
    
    return position;
  }
  
  private static calculateAccentPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[],
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    // Accent rocks can rest on foundation or support rocks
    const supportableRocks = existingRocks.filter(r => 
      r.tier === 'foundation' || r.tier === 'support'
    );
    
    if (supportableRocks.length === 0) {
      return this.calculateFoundationPosition(rock, clusterCenter);
    }
    
    // Prefer stable, larger rocks for support
    const targetSupport = supportableRocks.reduce((best, current) => {
      const suitability = current.instance.properties.stability * 
                         current.instance.boundingRadius * 
                         (current.tier === 'foundation' ? 1.5 : 1.0);
      const bestSuitability = best.instance.properties.stability * 
                             best.instance.boundingRadius * 
                             (best.tier === 'foundation' ? 1.5 : 1.0);
      return suitability > bestSuitability ? current : best;
    });
    
    // Position on top or against the support rock
    const position = targetSupport.position.clone();
    
    // Add small offset for natural placement
    position.x += (Math.random() - 0.5) * rock.boundingRadius * 0.5;
    position.z += (Math.random() - 0.5) * rock.boundingRadius * 0.5;
    
    // Calculate proper stacking height
    position.y = targetSupport.position.y + 
                 targetSupport.instance.boundingRadius + 
                 rock.boundingRadius * 0.7; // 70% overlap for stability
    
    return position;
  }
  
  private static calculateRealisticContactHeight(
    rock: RockInstance,
    supportRock: RockInstance,
    contactAngle: number
  ): number {
    // Calculate realistic contact height based on rock shapes and contact geometry
    const supportRadius = supportRock.boundingRadius;
    const rockRadius = rock.boundingRadius;
    
    // Base height from support rock center
    const baseHeight = supportRock.boundingRadius * 0.8; // Support rock mostly above ground
    
    // Contact geometry - rocks lean against each other naturally
    const contactDepth = Math.min(supportRadius, rockRadius) * 0.3;
    const leanHeight = Math.sqrt(Math.max(0, 
      Math.pow(rockRadius, 2) - Math.pow(contactDepth, 2)
    ));
    
    return Math.max(0, baseHeight + leanHeight - rockRadius * 0.2);
  }
  
  public static isPositionStable(
    position: THREE.Vector3,
    rock: RockInstance,
    existingRocks: ClusterRock[]
  ): boolean {
    // Improved stability checking
    
    // Check for reasonable positioning (not floating too high)
    if (position.y > rock.boundingRadius * 3) {
      return false;
    }
    
    // Check overlaps with existing rocks
    for (const existing of existingRocks) {
      const distance = position.distanceTo(existing.position);
      const minDistance = (rock.boundingRadius + existing.instance.boundingRadius) * 0.7;
      
      // Allow natural contact but prevent excessive overlap
      if (distance < minDistance) {
        return false;
      }
    }
    
    // Check if rock has adequate support (for non-foundation rocks)
    if (position.y > rock.boundingRadius * 0.5) {
      const hasSupport = existingRocks.some(existing => {
        const horizontalDistance = Math.sqrt(
          Math.pow(position.x - existing.position.x, 2) + 
          Math.pow(position.z - existing.position.z, 2)
        );
        const verticalDistance = Math.abs(position.y - existing.position.y);
        
        return horizontalDistance < (rock.boundingRadius + existing.instance.boundingRadius) * 0.8 &&
               verticalDistance < existing.instance.boundingRadius * 1.2 &&
               existing.position.y < position.y;
      });
      
      if (!hasSupport) {
        return false;
      }
    }
    
    return true;
  }
}
