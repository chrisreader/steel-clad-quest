
import * as THREE from 'three';
import { ClusterRole, RockCategory } from '../types/RockTypes';

export interface StackingPosition {
  position: THREE.Vector3;
  parentRock?: THREE.Object3D;
  contactSurface: THREE.Vector3;
  isStable: boolean;
}

export interface GeologicalFormationRules {
  maxStackHeight: number;
  avalancheAngle: number; // Maximum stable angle in degrees
  tightnessFactor: number;
  verticalPreference: number; // 0-1, higher = more vertical stacking
}

export class GeologicalStackingSystem {
  private static readonly FORMATION_RULES: Record<RockCategory, GeologicalFormationRules> = {
    tiny: { maxStackHeight: 2, avalancheAngle: 35, tightnessFactor: 0.8, verticalPreference: 0.4 },
    small: { maxStackHeight: 3, avalancheAngle: 32, tightnessFactor: 0.7, verticalPreference: 0.5 },
    medium: { maxStackHeight: 4, avalancheAngle: 30, tightnessFactor: 0.6, verticalPreference: 0.80 },
    large: { maxStackHeight: 5, avalancheAngle: 28, tightnessFactor: 0.5, verticalPreference: 0.85 },
    massive: { maxStackHeight: 6, avalancheAngle: 25, tightnessFactor: 0.4, verticalPreference: 0.90 }
  };

  public static calculateSequentialStackingPosition(
    existingRocks: THREE.Object3D[],
    rockSize: number,
    role: ClusterRole,
    category: RockCategory,
    centerPosition: THREE.Vector3,
    rockIndex: number
  ): StackingPosition {
    const rules = this.FORMATION_RULES[category];
    
    // First rock always goes to foundation position
    if (existingRocks.length === 0) {
      console.log(`🏔️ Placing first foundation rock at center`);
      return this.calculateFoundationPosition(centerPosition, rockSize, rules);
    }

    console.log(`🗻 Placing rock ${rockIndex + 1} (${role}) - attempting vertical stacking on ${existingRocks.length} existing rocks`);
    
    // ALWAYS try vertical stacking first for all rocks after the first
    const stackingResult = this.attemptVerticalStacking(existingRocks, rockSize, role, rules);
    if (stackingResult) {
      console.log(`✅ Vertical stacking SUCCESS at height ${stackingResult.position.y.toFixed(1)}`);
      return stackingResult;
    }

    console.log(`❌ Vertical stacking FAILED, using tight horizontal clustering`);
    // Fall back to very tight horizontal clustering near existing rocks
    return this.calculateTightHorizontalPosition(existingRocks, rockSize, rules, centerPosition);
  }

  private static calculateFoundationPosition(
    centerPosition: THREE.Vector3,
    rockSize: number,
    rules: GeologicalFormationRules
  ): StackingPosition {
    // First foundation rock at exact center
    return {
      position: new THREE.Vector3(
        centerPosition.x,
        centerPosition.y + rockSize * 0.15,
        centerPosition.z
      ),
      contactSurface: new THREE.Vector3(0, 1, 0),
      isStable: true
    };
  }

  private static attemptVerticalStacking(
    existingRocks: THREE.Object3D[],
    rockSize: number,
    role: ClusterRole,
    rules: GeologicalFormationRules
  ): StackingPosition | null {
    // Try all existing rocks as potential parents, starting with the most recently placed
    const candidates = [...existingRocks].reverse();
    console.log(`🔍 Checking ${candidates.length} potential parent rocks for stacking`);

    for (let i = 0; i < candidates.length; i++) {
      const parentRock = candidates[i];
      console.log(`🎯 Attempting to stack on parent rock ${i + 1}/${candidates.length} at height ${parentRock.position.y.toFixed(1)}`);
      
      // Calculate multiple stacking positions on this parent
      const stackingPositions = this.calculateMultipleStackPositions(parentRock, rockSize, rules);
      
      for (const stackingPos of stackingPositions) {
        if (this.validateStackingStability(stackingPos, existingRocks, rules, rockSize)) {
          console.log(`✅ Found valid stacking position on parent ${i + 1}`);
          return stackingPos;
        }
      }
      
      console.log(`❌ No valid positions found on parent ${i + 1}`);
    }

    console.log(`❌ All ${candidates.length} parent candidates failed`);
    return null;
  }

  private static calculateMultipleStackPositions(
    parentRock: THREE.Object3D,
    rockSize: number,
    rules: GeologicalFormationRules
  ): StackingPosition[] {
    const positions: StackingPosition[] = [];
    
    // Get parent bounding box with improved fallback
    let parentBox: THREE.Box3;
    let parentSize: THREE.Vector3;
    
    try {
      parentBox = new THREE.Box3().setFromObject(parentRock);
      parentSize = parentBox.getSize(new THREE.Vector3());
      
      // Validate bounding box
      if (parentSize.x === 0 || parentSize.y === 0 || parentSize.z === 0) {
        throw new Error('Invalid bounding box dimensions');
      }
    } catch (error) {
      console.log(`⚠️ Using fallback bounding box calculation`);
      const estimatedSize = rockSize * 1.5;
      parentSize = new THREE.Vector3(estimatedSize, estimatedSize, estimatedSize);
      parentBox = new THREE.Box3(
        new THREE.Vector3(
          parentRock.position.x - estimatedSize/2,
          parentRock.position.y - estimatedSize/2,
          parentRock.position.z - estimatedSize/2
        ),
        new THREE.Vector3(
          parentRock.position.x + estimatedSize/2,
          parentRock.position.y + estimatedSize/2,
          parentRock.position.z + estimatedSize/2
        )
      );
    }
    
    // Generate multiple contact points on the parent's top surface
    const contactPoints = [
      { x: 0, z: 0 }, // center
      { x: 0.3, z: 0 }, // front
      { x: -0.3, z: 0 }, // back  
      { x: 0, z: 0.3 }, // right
      { x: 0, z: -0.3 }, // left
    ];
    
    for (const point of contactPoints) {
      const contactOffset = new THREE.Vector3(
        point.x * parentSize.x * 0.4,
        0,
        point.z * parentSize.z * 0.4
      );

      const stackHeight = parentBox.max.y + rockSize * 0.3; // Reduced gap for tighter stacking
      
      if (stackHeight > parentRock.position.y) {
        const stackPosition = new THREE.Vector3(
          parentRock.position.x + contactOffset.x,
          stackHeight,
          parentRock.position.z + contactOffset.z
        );

        positions.push({
          position: stackPosition,
          parentRock: parentRock,
          contactSurface: new THREE.Vector3(0, 1, 0),
          isStable: true
        });
      }
    }
    
    return positions;
  }

  private static calculateTightHorizontalPosition(
    existingRocks: THREE.Object3D[],
    rockSize: number,
    rules: GeologicalFormationRules,
    centerPosition: THREE.Vector3
  ): StackingPosition {
    // Find the nearest existing rock for very tight clustering
    let nearestRock = existingRocks[0];
    let minDistance = Infinity;

    for (const rock of existingRocks) {
      const distance = rock.position.distanceTo(centerPosition);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRock = rock;
      }
    }

    // Get the size of the nearest rock
    let nearestSize: THREE.Vector3;
    try {
      const nearestBox = new THREE.Box3().setFromObject(nearestRock);
      nearestSize = nearestBox.getSize(new THREE.Vector3());
    } catch (error) {
      nearestSize = new THREE.Vector3(rockSize * 1.5, rockSize * 1.5, rockSize * 1.5);
    }
    
    // Place very close to the nearest rock
    const clusteringDistance = (rockSize + Math.max(nearestSize.x, nearestSize.z)) * 0.3; // Very tight
    const angle = Math.random() * Math.PI * 2;

    const contactPoint = new THREE.Vector3(
      nearestRock.position.x + Math.cos(angle) * clusteringDistance,
      centerPosition.y + rockSize * 0.1,
      nearestRock.position.z + Math.sin(angle) * clusteringDistance
    );

    return {
      position: contactPoint,
      parentRock: nearestRock,
      contactSurface: new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
      isStable: true
    };
  }

  private static validateStackingStability(
    stackingPos: StackingPosition,
    existingRocks: THREE.Object3D[],
    rules: GeologicalFormationRules,
    rockSize: number
  ): boolean {
    if (!stackingPos.parentRock) {
      return true;
    }

    // Check avalanche angle
    const parentPos = stackingPos.parentRock.position;
    const horizontalDistance = Math.sqrt(
      Math.pow(stackingPos.position.x - parentPos.x, 2) +
      Math.pow(stackingPos.position.z - parentPos.z, 2)
    );
    const verticalDistance = stackingPos.position.y - parentPos.y;

    if (horizontalDistance > 0) {
      const angle = Math.atan(verticalDistance / horizontalDistance) * (180 / Math.PI);
      
      if (angle > rules.avalancheAngle) {
        console.log(`❌ Unstable stacking angle: ${angle.toFixed(1)}° > ${rules.avalancheAngle}°`);
        return false;
      }
    }

    // Check for collisions with existing rocks (much more permissive)
    const minSpacing = rockSize * 0.1; // Very small minimum spacing
    
    for (const existingRock of existingRocks) {
      const distance = existingRock.position.distanceTo(stackingPos.position);
      if (distance < minSpacing) {
        console.log(`❌ Too close to existing rock: ${distance.toFixed(2)} < ${minSpacing.toFixed(2)}`);
        return false;
      }
    }

    console.log(`✅ Stability validation passed`);
    return true;
  }

  public static calculateClusterDimensions(category: RockCategory, maxSize: number) {
    const rules = this.FORMATION_RULES[category];
    
    // Much smaller cluster dimensions to encourage vertical stacking
    const baseRadius = maxSize * 0.8; // Reduced from original scatter calculations
    
    return {
      foundationZone: baseRadius * 0.1, // Very small foundation zone
      supportZone: baseRadius * 0.3,    // Small support zone  
      accentZone: baseRadius * 0.5,     // Medium accent zone
      maxClusterRadius: baseRadius
    };
  }
}
