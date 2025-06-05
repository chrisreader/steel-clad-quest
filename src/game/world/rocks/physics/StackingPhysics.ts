
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
    console.log(`🏔️ Calculating stacking position for ${tier} rock (size: ${newRock.boundingRadius.toFixed(2)})`);
    
    switch (tier) {
      case 'foundation':
        return this.calculateEnhancedFoundationPosition(newRock, existingRocks, clusterCenter);
      case 'support':
        return this.calculateEnhancedSupportPosition(newRock, existingRocks, clusterCenter);
      case 'accent':
        return this.calculateEnhancedAccentPosition(newRock, existingRocks, clusterCenter);
      default:
        return clusterCenter.clone();
    }
  }
  
  private static calculateEnhancedFoundationPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[],
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    const position = clusterCenter.clone();
    
    // Foundation rocks spread out more for massive clusters
    const spreadRadius = Math.max(rock.boundingRadius * 3, 8); // Minimum 8 unit spread
    const angle = Math.random() * Math.PI * 2;
    
    position.x += Math.cos(angle) * spreadRadius * (0.5 + Math.random() * 1.0);
    position.z += Math.sin(angle) * spreadRadius * (0.5 + Math.random() * 1.0);
    
    // Foundation rocks are properly grounded with slight embedding for stability
    position.y = -rock.boundingRadius * 0.1; // Slight embedding for massive rocks
    
    console.log(`🏔️ Foundation rock positioned at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    return position;
  }
  
  private static calculateEnhancedSupportPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[],
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    const foundationRocks = existingRocks.filter(r => r.tier === 'foundation');
    
    if (foundationRocks.length === 0) {
      console.log(`🏔️ No foundation rocks - placing support as foundation`);
      return this.calculateEnhancedFoundationPosition(rock, existingRocks, clusterCenter);
    }
    
    // Choose the best foundation rock for support (largest and most stable)
    const targetFoundation = foundationRocks.reduce((best, current) => {
      const stability = current.instance.properties.stability * current.instance.boundingRadius;
      const bestStability = best.instance.properties.stability * best.instance.boundingRadius;
      return stability > bestStability ? current : best;
    });
    
    // Calculate realistic contact position with enhanced physics
    const contactAngle = Math.random() * Math.PI * 2;
    const contactDistance = targetFoundation.instance.boundingRadius + rock.boundingRadius * 0.5; // Better contact
    
    const position = targetFoundation.position.clone();
    position.x += Math.cos(contactAngle) * contactDistance;
    position.z += Math.sin(contactAngle) * contactDistance;
    
    // Enhanced height calculation for realistic stacking
    position.y = this.calculateEnhancedContactHeight(
      rock, 
      targetFoundation.instance, 
      contactAngle,
      'lean' // Support rocks lean against foundation
    );
    
    console.log(`🏔️ Support rock leaning on foundation at height ${position.y.toFixed(2)}`);
    return position;
  }
  
  private static calculateEnhancedAccentPosition(
    rock: RockInstance,
    existingRocks: ClusterRock[],
    clusterCenter: THREE.Vector3
  ): THREE.Vector3 {
    const supportableRocks = existingRocks.filter(r => 
      r.tier === 'foundation' || r.tier === 'support'
    );
    
    if (supportableRocks.length === 0) {
      console.log(`🏔️ No support rocks - placing accent as foundation`);
      return this.calculateEnhancedFoundationPosition(rock, existingRocks, clusterCenter);
    }
    
    // Prefer stable, larger rocks for accent placement
    const targetSupport = supportableRocks.reduce((best, current) => {
      const suitability = current.instance.properties.stability * 
                         current.instance.boundingRadius * 
                         (current.tier === 'foundation' ? 2.0 : 1.2); // Strong preference for foundation
      const bestSuitability = best.instance.properties.stability * 
                             best.instance.boundingRadius * 
                             (best.tier === 'foundation' ? 2.0 : 1.2);
      return suitability > bestSuitability ? current : best;
    });
    
    const position = targetSupport.position.clone();
    
    // Enhanced accent positioning
    if (Math.random() < 0.7) {
      // 70% chance to stack on top
      position.y = this.calculateEnhancedContactHeight(
        rock,
        targetSupport.instance,
        0,
        'stack'
      );
    } else {
      // 30% chance to lean against
      const leanAngle = Math.random() * Math.PI * 2;
      const leanDistance = (targetSupport.instance.boundingRadius + rock.boundingRadius) * 0.6;
      
      position.x += Math.cos(leanAngle) * leanDistance;
      position.z += Math.sin(leanAngle) * leanDistance;
      position.y = this.calculateEnhancedContactHeight(
        rock,
        targetSupport.instance,
        leanAngle,
        'lean'
      );
    }
    
    console.log(`🏔️ Accent rock positioned at height ${position.y.toFixed(2)}`);
    return position;
  }
  
  private static calculateEnhancedContactHeight(
    rock: RockInstance,
    supportRock: RockInstance,
    contactAngle: number,
    contactType: 'lean' | 'stack'
  ): number {
    const supportRadius = supportRock.boundingRadius;
    const rockRadius = rock.boundingRadius;
    
    if (contactType === 'stack') {
      // Stacking on top with realistic contact
      return supportRadius * 0.9 + rockRadius * 0.8; // Realistic stacking height
    } else {
      // Leaning against with realistic physics
      const baseHeight = supportRadius * 0.7; // Support rock height above ground
      const contactDepth = Math.min(supportRadius, rockRadius) * 0.4; // Deeper contact for stability
      
      // Calculate lean geometry
      const leanHeight = Math.sqrt(Math.max(0.1, 
        Math.pow(rockRadius * 0.9, 2) - Math.pow(contactDepth, 2)
      ));
      
      return Math.max(rockRadius * 0.3, baseHeight + leanHeight - rockRadius * 0.3);
    }
  }
  
  public static isPositionStable(
    position: THREE.Vector3,
    rock: RockInstance,
    existingRocks: ClusterRock[]
  ): boolean {
    // Enhanced stability checking for massive rocks
    
    // Check for reasonable positioning (prevent floating islands)
    const maxFloatingHeight = rock.boundingRadius * 4; // Allow higher for massive rocks
    if (position.y > maxFloatingHeight) {
      console.log(`🏔️ ❌ Rock too high: ${position.y.toFixed(2)} > ${maxFloatingHeight.toFixed(2)}`);
      return false;
    }
    
    // Enhanced overlap checking
    for (const existing of existingRocks) {
      const distance = position.distanceTo(existing.position);
      const minDistance = (rock.boundingRadius + existing.instance.boundingRadius) * 0.6; // Allow more contact for stacking
      
      if (distance < minDistance) {
        console.log(`🏔️ ❌ Overlap detected: distance ${distance.toFixed(2)} < min ${minDistance.toFixed(2)}`);
        return false;
      }
    }
    
    // Enhanced support checking for elevated rocks
    if (position.y > rock.boundingRadius * 0.6) {
      const hasAdequateSupport = existingRocks.some(existing => {
        const horizontalDistance = Math.sqrt(
          Math.pow(position.x - existing.position.x, 2) + 
          Math.pow(position.z - existing.position.z, 2)
        );
        const verticalDistance = Math.abs(position.y - existing.position.y);
        
        const supportRange = (rock.boundingRadius + existing.instance.boundingRadius) * 0.9;
        const heightRange = existing.instance.boundingRadius * 1.5;
        
        const isInSupportRange = horizontalDistance < supportRange;
        const isAtCorrectHeight = verticalDistance < heightRange && existing.position.y < position.y;
        
        return isInSupportRange && isAtCorrectHeight;
      });
      
      if (!hasAdequateSupport) {
        console.log(`🏔️ ❌ Insufficient support for elevated rock at height ${position.y.toFixed(2)}`);
        return false;
      }
    }
    
    console.log(`🏔️ ✅ Position stable at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    return true;
  }
}
