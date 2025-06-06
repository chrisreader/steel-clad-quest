
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

  public static calculateRealisticScatterRadius(category: RockCategory, maxSize: number): number {
    // Reduced scatter radius for tighter clusters (60-70% reduction from original)
    switch (category) {
      case 'massive':
        return (Math.random() * 1.2 + 0.8) * maxSize;
      case 'large':
        return (Math.random() * 1.0 + 0.6) * maxSize;
      case 'medium':
        return (Math.random() * 0.8 + 0.4) * maxSize;
      default:
        return Math.random() * 0.6 + 0.3;
    }
  }

  public static calculateStableStackingPosition(
    existingRocks: THREE.Object3D[],
    rockSize: number,
    role: ClusterRole,
    category: RockCategory,
    centerPosition: THREE.Vector3
  ): StackingPosition {
    const rules = this.FORMATION_RULES[category];
    
    // Only the very first rock goes to foundation position
    if (existingRocks.length === 0) {
      console.log(`🏔️ Creating first foundation rock at center`);
      return this.calculateFoundationPosition(centerPosition, rockSize, rules);
    }

    // ALWAYS try vertical stacking first (remove probability gate)
    console.log(`🗻 Attempting vertical stacking for ${role} rock (${existingRocks.length} existing rocks)`);
    const stackingResult = this.tryVerticalStackingEnhanced(existingRocks, rockSize, rules);
    if (stackingResult) {
      console.log(`✅ Vertical stacking SUCCESS at height ${stackingResult.position.y.toFixed(1)}`);
      return stackingResult;
    }

    console.log(`❌ Vertical stacking FAILED, falling back to horizontal clustering`);
    // Fall back to enhanced tight horizontal clustering
    return this.calculateEnhancedTightHorizontalPosition(existingRocks, rockSize, rules, centerPosition);
  }

  private static calculateFoundationPosition(
    centerPosition: THREE.Vector3,
    rockSize: number,
    rules: GeologicalFormationRules
  ): StackingPosition {
    // Foundation rocks cluster very tightly around center
    const maxOffset = rockSize * rules.tightnessFactor;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * maxOffset;

    return {
      position: new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y + rockSize * 0.15,
        centerPosition.z + Math.sin(angle) * distance
      ),
      contactSurface: new THREE.Vector3(0, 1, 0),
      isStable: true
    };
  }

  private static tryVerticalStackingEnhanced(
    existingRocks: THREE.Object3D[],
    rockSize: number,
    rules: GeologicalFormationRules
  ): StackingPosition | null {
    // Expand candidate pool to include ALL existing rocks as potential parents
    const allCandidates = [...existingRocks];
    console.log(`🔍 Checking ${allCandidates.length} potential parent rocks for stacking`);

    if (allCandidates.length === 0) {
      console.log(`❌ No parent candidates available`);
      return null;
    }

    // Sort by height preference (lower rocks first for stability)
    allCandidates.sort((a, b) => a.position.y - b.position.y);

    // Try multiple candidates with enhanced retry logic
    for (let i = 0; i < allCandidates.length; i++) {
      const parentRock = allCandidates[i];
      console.log(`🎯 Trying to stack on parent rock ${i + 1}/${allCandidates.length} at height ${parentRock.position.y.toFixed(1)}`);
      
      const stackingPos = this.calculateStackPosition(parentRock, rockSize, rules);
      if (stackingPos && this.validateEnhancedStability(stackingPos, existingRocks, rules)) {
        console.log(`✅ Successfully found stacking position on parent ${i + 1}`);
        return stackingPos;
      } else {
        console.log(`❌ Stacking validation failed for parent ${i + 1}`);
      }
    }

    console.log(`❌ All ${allCandidates.length} parent candidates failed`);
    return null;
  }

  private static calculateStackPosition(
    parentRock: THREE.Object3D,
    rockSize: number,
    rules: GeologicalFormationRules
  ): StackingPosition | null {
    console.log(`📐 Calculating stack position on parent at (${parentRock.position.x.toFixed(1)}, ${parentRock.position.y.toFixed(1)}, ${parentRock.position.z.toFixed(1)})`);
    
    // Get parent rock bounding box with fallback
    let parentBox: THREE.Box3;
    let parentSize: THREE.Vector3;
    
    try {
      parentBox = new THREE.Box3().setFromObject(parentRock);
      parentSize = parentBox.getSize(new THREE.Vector3());
      console.log(`📦 Parent bounding box: ${parentSize.x.toFixed(1)} x ${parentSize.y.toFixed(1)} x ${parentSize.z.toFixed(1)}`);
    } catch (error) {
      console.log(`⚠️ Bounding box calculation failed, using fallback`);
      // Fallback: estimate size based on rock size
      const estimatedSize = rockSize * 2;
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
    
    // Calculate stable contact point on top surface
    const contactOffset = new THREE.Vector3(
      (Math.random() - 0.5) * parentSize.x * 0.6,
      0,
      (Math.random() - 0.5) * parentSize.z * 0.6
    );

    const stackHeight = parentBox.max.y + rockSize * 0.4;
    console.log(`📏 Calculated stack height: ${stackHeight.toFixed(1)} (parent top: ${parentBox.max.y.toFixed(1)} + rock offset: ${(rockSize * 0.4).toFixed(1)})`);

    // Validate that we're actually stacking above the parent
    if (stackHeight <= parentRock.position.y) {
      console.log(`❌ Invalid stack height: ${stackHeight.toFixed(1)} <= parent height ${parentRock.position.y.toFixed(1)}`);
      return null;
    }

    const stackPosition = new THREE.Vector3(
      parentRock.position.x + contactOffset.x,
      stackHeight,
      parentRock.position.z + contactOffset.z
    );

    console.log(`📍 Stack position: (${stackPosition.x.toFixed(1)}, ${stackPosition.y.toFixed(1)}, ${stackPosition.z.toFixed(1)})`);

    return {
      position: stackPosition,
      parentRock: parentRock,
      contactSurface: new THREE.Vector3(0, 1, 0),
      isStable: true
    };
  }

  private static calculateEnhancedTightHorizontalPosition(
    existingRocks: THREE.Object3D[],
    rockSize: number,
    rules: GeologicalFormationRules,
    centerPosition: THREE.Vector3
  ): StackingPosition {
    // Find the nearest existing rock for tight clustering
    let nearestRock = existingRocks[0];
    let minDistance = Infinity;

    for (const rock of existingRocks) {
      const distance = rock.position.distanceTo(centerPosition);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRock = rock;
      }
    }

    const nearestBox = new THREE.Box3().setFromObject(nearestRock);
    const nearestSize = nearestBox.getSize(new THREE.Vector3());
    
    const clusteringDistance = (rockSize + Math.max(nearestSize.x, nearestSize.z)) * 0.4;
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

  private static validateEnhancedStability(
    stackingPos: StackingPosition,
    existingRocks: THREE.Object3D[],
    rules: GeologicalFormationRules
  ): boolean {
    if (!stackingPos.parentRock) {
      console.log(`✅ No parent rock, position is stable`);
      return true;
    }

    // Check avalanche angle (realistic geological constraint)
    const parentPos = stackingPos.parentRock.position;
    const horizontalDistance = Math.sqrt(
      Math.pow(stackingPos.position.x - parentPos.x, 2) +
      Math.pow(stackingPos.position.z - parentPos.z, 2)
    );
    const verticalDistance = stackingPos.position.y - parentPos.y;

    if (horizontalDistance === 0) {
      console.log(`✅ Perfect vertical stack, no angle check needed`);
      return true;
    }

    const angle = Math.atan(verticalDistance / horizontalDistance) * (180 / Math.PI);
    
    if (angle > rules.avalancheAngle) {
      console.log(`❌ Unstable stacking angle: ${angle.toFixed(1)}° > ${rules.avalancheAngle}°`);
      return false;
    }

    // Enhanced: Reduced minimum spacing for better contact (0.5 -> 0.3)
    for (const existingRock of existingRocks) {
      const distance = existingRock.position.distanceTo(stackingPos.position);
      if (distance < 0.3) {
        console.log(`❌ Too close to existing rock: ${distance.toFixed(2)} < 0.3`);
        return false;
      }
    }

    console.log(`✅ Stability validation passed: angle ${angle.toFixed(1)}°, min distance ok`);
    return true;
  }

  public static generateGeologicalClusterLayout(
    totalCount: number,
    category: RockCategory,
    centerPosition: THREE.Vector3,
    maxSize: number
  ): { foundationPositions: THREE.Vector3[]; supportPositions: THREE.Vector3[]; accentPositions: THREE.Vector3[] } {
    const rules = this.FORMATION_RULES[category];
    const scatterRadius = this.calculateRealisticScatterRadius(category, maxSize);
    
    console.log(`🏔️ Generating geological cluster: ${totalCount} rocks, radius: ${scatterRadius.toFixed(1)}, vertical preference: ${(rules.verticalPreference * 100).toFixed(0)}%`);

    // Enhanced: Tighter foundation zone (0.3 -> 0.2)
    const foundationZone = scatterRadius * 0.2;
    const supportZone = scatterRadius * 0.6;
    const accentZone = scatterRadius;

    return {
      foundationPositions: this.generateEnhancedZonePositions(
        Math.max(1, Math.floor(totalCount * 0.35)), 
        centerPosition, 
        foundationZone,
        'foundation'
      ),
      supportPositions: this.generateEnhancedZonePositions(
        Math.floor(totalCount * 0.4), 
        centerPosition, 
        supportZone,
        'support'
      ),
      accentPositions: this.generateEnhancedZonePositions(
        totalCount - Math.max(1, Math.floor(totalCount * 0.35)) - Math.floor(totalCount * 0.4), 
        centerPosition, 
        accentZone,
        'accent'
      )
    };
  }

  private static generateEnhancedZonePositions(
    count: number,
    center: THREE.Vector3,
    maxRadius: number,
    role: ClusterRole
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const clusterAngle = (i / count) * Math.PI * 2;
      const randomAngle = clusterAngle + (Math.random() - 0.5) * 0.5;
      
      let distance: number;
      if (role === 'foundation') {
        // Enhanced: Foundation rocks stay within 50% of zone radius (was 70%)
        distance = Math.random() * maxRadius * 0.5;
      } else {
        distance = Math.random() * maxRadius;
      }
      
      positions.push(new THREE.Vector3(
        center.x + Math.cos(randomAngle) * distance,
        center.y,
        center.z + Math.sin(randomAngle) * distance
      ));
    }
    
    return positions;
  }
}
