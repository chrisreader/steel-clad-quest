import * as THREE from 'three';

// Visibility zones for optimized culling
export enum VisibilityZone {
  NEAR = 'near',       // 0-80 units: Always render
  MEDIUM = 'medium',   // 80-150 units: Frustum cull only
  FAR = 'far',         // 150-250 units: Behind-player cull
  EXTREME = 'extreme'  // 250+ units: Full cull
}

// View angles for behind-player detection
export enum ViewAngle {
  FRONT = 'front',     // ±90°: Always render
  SIDE = 'side',       // ±90-135°: Partial cull
  BEHIND = 'behind'    // ±135-180°: Aggressive cull
}

export interface VisibilityConfig {
  nearDistance: number;
  mediumDistance: number;
  farDistance: number;
  extremeDistance: number;
  frontAngle: number;
  sideAngle: number;
  behindAngle: number;
  updateInterval: number;
  renderCacheTime: number;
}

export interface ObjectVisibilityState {
  isVisible: boolean;
  zone: VisibilityZone;
  angle: ViewAngle;
  distance: number;
  lastUpdate: number;
  shouldRender: boolean;
  isEnemy: boolean;
  isStatic: boolean;
  renderPriority: number;
}

export class AdvancedVisibilityManager {
  private config: VisibilityConfig = {
    nearDistance: 80,    // Expanded from 30 - always render, no culling
    mediumDistance: 150, // Expanded from 80 - frustum cull only
    farDistance: 250,    // Expanded from 150 - selective behind-player cull
    extremeDistance: 300, // Expanded from 200 - full distance cull
    frontAngle: 90,      // Expanded from 60° - wider visible cone (180° total)
    sideAngle: 135,      // Expanded from 120° - moderate culling zone
    behindAngle: 180,    // degrees - aggressive culling only for truly behind
    updateInterval: 16,  // ~60fps update rate
    renderCacheTime: 100 // Cache visibility decisions for 100ms
  };

  private objectStates: Map<string, ObjectVisibilityState> = new Map();
  private lastGlobalUpdate: number = 0;
  private camera: THREE.PerspectiveCamera;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    console.log("🎯 [AdvancedVisibilityManager] Initialized with smart behind-player occlusion");
  }

  /**
   * Main update function - processes all objects for visibility
   */
  public update(scene: THREE.Scene, playerPosition: THREE.Vector3): void {
    const now = performance.now();
    
    // Skip update if too soon (performance optimization)
    if (now - this.lastGlobalUpdate < this.config.updateInterval) {
      return;
    }

    // Update frustum for traditional culling
    this.updateFrustum();
    
    // Get camera forward direction for behind-player detection
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Ignore vertical component
    cameraDirection.normalize();

    // Process all objects in the scene
    let renderedObjects = 0;
    let culledObjects = 0;

    scene.traverse((object) => {
      if (this.shouldProcessObject(object)) {
        const objectId = this.getObjectId(object);
        const visibility = this.calculateVisibility(object, playerPosition, cameraDirection);
        
        // Store visibility state for debugging/optimization
        this.objectStates.set(objectId, visibility);
        
        // Apply visibility decision
        const shouldRender = this.determineRenderState(object, visibility);
        object.visible = shouldRender;
        
        if (shouldRender) {
          renderedObjects++;
        } else {
          culledObjects++;
        }
      }
    });

    this.lastGlobalUpdate = now;
    
    // Debug logging every 3 seconds
    if (Math.floor(now / 3000) !== Math.floor((now - this.config.updateInterval) / 3000)) {
      console.log(`🎯 [AdvancedVisibilityManager] Player: (${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)}) | Rendered: ${renderedObjects}, Culled: ${culledObjects}, Ratio: ${(100 * culledObjects / (renderedObjects + culledObjects)).toFixed(1)}%`);
    }
  }

  /**
   * Calculate visibility state for an object
   */
  private calculateVisibility(
    object: THREE.Object3D, 
    playerPosition: THREE.Vector3, 
    cameraDirection: THREE.Vector3
  ): ObjectVisibilityState {
    const distance = playerPosition.distanceTo(object.position);
    const zone = this.getVisibilityZone(distance);
    
    // Calculate angle between camera direction and object direction
    const toObject = new THREE.Vector3()
      .subVectors(object.position, playerPosition)
      .normalize();
    toObject.y = 0; // Ignore vertical component
    
    const dot = cameraDirection.dot(toObject);
    const angleDegrees = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
    const angle = this.getViewAngle(angleDegrees);
    
    // Determine if object should be rendered
    const shouldRender = this.shouldRenderObject(zone, angle, distance, object);
    
    return {
      isVisible: object.visible,
      zone,
      angle,
      distance,
      lastUpdate: performance.now(),
      shouldRender,
      isEnemy: this.isEnemyObject(object),
      isStatic: this.isStaticObject(object),
      renderPriority: this.calculateRenderPriority(zone, angle, distance, object)
    };
  }

  /**
   * Determine final render state based on visibility analysis
   */
  private determineRenderState(object: THREE.Object3D, visibility: ObjectVisibilityState): boolean {
    // Always render very close objects regardless of angle
    if (visibility.zone === VisibilityZone.NEAR) {
      return true;
    }

    // Traditional frustum culling check
    if (!this.isInFrustum(object)) {
      return false;
    }

    // Behind-player culling for distant objects
    if (visibility.zone === VisibilityZone.FAR && visibility.angle === ViewAngle.BEHIND) {
      return false;
    }

    // Extreme distance culling
    if (visibility.zone === VisibilityZone.EXTREME) {
      return false;
    }

    // Special handling for enemies - they continue logic but may not render
    if (visibility.isEnemy) {
      return this.shouldRenderEnemy(visibility);
    }

    return true;
  }

  /**
   * Smart enemy rendering logic - maintains gameplay while optimizing visuals
   */
  private shouldRenderEnemy(visibility: ObjectVisibilityState): boolean {
    // Keep all enemies visible within 120 units regardless of angle or zone
    if (visibility.distance <= 120) {
      return true;
    }

    // Always render enemies that are close or in front
    if (visibility.zone === VisibilityZone.NEAR || visibility.angle === ViewAngle.FRONT) {
      return true;
    }

    // Don't render enemies that are far behind the player
    if (visibility.zone === VisibilityZone.FAR && visibility.angle === ViewAngle.BEHIND) {
      return false;
    }

    // Medium distance enemies - render if not directly behind
    if (visibility.zone === VisibilityZone.MEDIUM && visibility.angle === ViewAngle.BEHIND) {
      return false;
    }

    return true;
  }

  /**
   * Update frustum for traditional culling
   */
  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  /**
   * Check if object is in camera frustum
   */
  private isInFrustum(object: THREE.Object3D): boolean {
    // Skip frustum check for InstancedMesh (like grass) to avoid complexity
    if (object instanceof THREE.InstancedMesh) {
      return true;
    }

    if (object instanceof THREE.Mesh && object.geometry) {
      const sphere = object.geometry.boundingSphere;
      if (sphere) {
        const worldSphere = sphere.clone().applyMatrix4(object.matrixWorld);
        return this.frustum.intersectsSphere(worldSphere);
      }
    }

    return true; // Default to visible if no bounding info
  }

  /**
   * Determine visibility zone based on distance
   */
  private getVisibilityZone(distance: number): VisibilityZone {
    if (distance <= this.config.nearDistance) return VisibilityZone.NEAR;
    if (distance <= this.config.mediumDistance) return VisibilityZone.MEDIUM;
    if (distance <= this.config.farDistance) return VisibilityZone.FAR;
    return VisibilityZone.EXTREME;
  }

  /**
   * Determine view angle category
   */
  private getViewAngle(angleDegrees: number): ViewAngle {
    if (angleDegrees <= this.config.frontAngle) return ViewAngle.FRONT;
    if (angleDegrees <= this.config.sideAngle) return ViewAngle.SIDE;
    return ViewAngle.BEHIND;
  }

  /**
   * Check if object should be processed by visibility system
   */
  private shouldProcessObject(object: THREE.Object3D): boolean {
    // Process meshes and groups, but skip lights, cameras, etc.
    return object instanceof THREE.Mesh || 
           object instanceof THREE.Group || 
           object instanceof THREE.InstancedMesh;
  }

  /**
   * Generate unique ID for object tracking
   */
  private getObjectId(object: THREE.Object3D): string {
    return object.uuid || `obj_${object.id}`;
  }

  /**
   * Check if object is an enemy
   */
  private isEnemyObject(object: THREE.Object3D): boolean {
    return object.name?.includes('enemy') || 
           object.userData?.isEnemy || 
           object.parent?.name?.includes('enemy');
  }

  /**
   * Check if object is static (trees, rocks, etc.)
   */
  private isStaticObject(object: THREE.Object3D): boolean {
    return object.name?.includes('tree') ||
           object.name?.includes('rock') ||
           object.name?.includes('bush') ||
           object.userData?.isStatic;
  }

  /**
   * Calculate render priority for object
   */
  private calculateRenderPriority(
    zone: VisibilityZone, 
    angle: ViewAngle, 
    distance: number, 
    object: THREE.Object3D
  ): number {
    let priority = 100;

    // Distance priority
    if (zone === VisibilityZone.NEAR) priority += 50;
    else if (zone === VisibilityZone.MEDIUM) priority += 30;
    else if (zone === VisibilityZone.FAR) priority += 10;

    // Angle priority
    if (angle === ViewAngle.FRONT) priority += 30;
    else if (angle === ViewAngle.SIDE) priority += 15;

    // Object type priority
    if (this.isEnemyObject(object)) priority += 25;

    return priority;
  }

  /**
   * Check if should render object based on zone and angle
   */
  private shouldRenderObject(
    zone: VisibilityZone, 
    angle: ViewAngle, 
    distance: number, 
    object: THREE.Object3D
  ): boolean {
    // Near objects always render
    if (zone === VisibilityZone.NEAR) return true;

    // Front-facing objects usually render
    if (angle === ViewAngle.FRONT) return true;

    // Behind objects at far distances don't render
    if (zone === VisibilityZone.FAR && angle === ViewAngle.BEHIND) return false;

    // Extreme distance objects don't render
    if (zone === VisibilityZone.EXTREME) return false;

    return true;
  }

  /**
   * Get visibility statistics for debugging
   */
  public getVisibilityStats(): {
    totalObjects: number;
    visibleObjects: number;
    culledObjects: number;
    enemiesProcessed: number;
    staticObjectsCulled: number;
  } {
    const stats = {
      totalObjects: this.objectStates.size,
      visibleObjects: 0,
      culledObjects: 0,
      enemiesProcessed: 0,
      staticObjectsCulled: 0
    };

    this.objectStates.forEach(state => {
      if (state.shouldRender) {
        stats.visibleObjects++;
      } else {
        stats.culledObjects++;
        if (state.isStatic) stats.staticObjectsCulled++;
      }
      if (state.isEnemy) stats.enemiesProcessed++;
    });

    return stats;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<VisibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("🎯 [AdvancedVisibilityManager] Configuration updated:", newConfig);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.objectStates.clear();
    console.log("🎯 [AdvancedVisibilityManager] Disposed");
  }
}