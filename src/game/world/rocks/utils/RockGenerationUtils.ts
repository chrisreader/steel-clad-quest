
import * as THREE from 'three';
import { RockShape, ClusterRole } from '../types/RockTypes';

export class RockGenerationUtils {
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

  public static selectShapeByRole(rockShapes: RockShape[], role: ClusterRole, index: number): RockShape {
    switch (role) {
      case 'foundation':
        const foundationShapes = rockShapes.filter(s => 
          s.type === 'boulder' || s.type === 'weathered' || s.type === 'slab'
        );
        return foundationShapes[index % foundationShapes.length];
        
      case 'support':
        const supportShapes = rockShapes.filter(s => 
          s.type !== 'spire'
        );
        return supportShapes[index % supportShapes.length];
        
      case 'accent':
        return rockShapes[index % rockShapes.length];
        
      default:
        return rockShapes[index % rockShapes.length];
    }
  }

  public static applyRoleBasedRotation(rock: THREE.Object3D, role: ClusterRole): void {
    if (role === 'foundation') {
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
}
