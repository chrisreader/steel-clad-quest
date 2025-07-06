import * as THREE from 'three';

/**
 * Factory for creating optimized geometries for human NPCs
 * Reduces code duplication and improves maintainability
 */
export class HumanGeometryFactory {
  private static geometryCache = new Map<string, THREE.BufferGeometry>();

  /**
   * Creates and caches geometries to avoid recreation
   */
  private static createCached<T extends THREE.BufferGeometry>(
    key: string,
    createFn: () => T
  ): T {
    if (!this.geometryCache.has(key)) {
      this.geometryCache.set(key, createFn());
    }
    return this.geometryCache.get(key)! as T;
  }

  /**
   * Creates tapered limb geometry (common pattern for arms/legs)
   */
  public static createTaperedLimb(
    topRadius: number,
    bottomRadius: number,
    length: number,
    segments: number = 24
  ): THREE.CylinderGeometry {
    const key = `limb_${topRadius}_${bottomRadius}_${length}_${segments}`;
    return this.createCached(key, () => 
      new THREE.CylinderGeometry(topRadius, bottomRadius, length, segments, segments)
    );
  }

  /**
   * Creates joint geometry (spherical)
   */
  public static createJoint(
    radius: number,
    widthSegments: number = 20,
    heightSegments: number = 16
  ): THREE.SphereGeometry {
    const key = `joint_${radius}_${widthSegments}_${heightSegments}`;
    return this.createCached(key, () => 
      new THREE.SphereGeometry(radius, widthSegments, heightSegments)
    );
  }

  /**
   * Creates finger geometry
   */
  public static createFinger(): THREE.CylinderGeometry {
    return this.createCached('finger', () => 
      new THREE.CylinderGeometry(0.02, 0.015, 0.12, 8)
    );
  }

  /**
   * Creates toe geometry
   */
  public static createToe(): THREE.SphereGeometry {
    return this.createCached('toe', () => 
      new THREE.SphereGeometry(0.02, 8, 6)
    );
  }

  /**
   * Creates foot geometry (capsule shape)
   */
  public static createFoot(): THREE.CapsuleGeometry {
    return this.createCached('foot', () => 
      new THREE.CapsuleGeometry(0.12, 0.35, 4, 8)
    );
  }

  /**
   * Creates claw geometry
   */
  public static createClaw(): THREE.ConeGeometry {
    return this.createCached('claw', () => 
      new THREE.ConeGeometry(0.03, 0.18, 8)
    );
  }

  /**
   * Dispose of all cached geometries
   */
  public static dispose(): void {
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
  }
}

// Add cleanup to be called when the application shuts down
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    HumanGeometryFactory.dispose();
  });
}