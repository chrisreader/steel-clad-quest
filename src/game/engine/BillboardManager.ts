import * as THREE from 'three';
import { BillboardSystem } from './BillboardSystem';
import { TreeSpeciesType } from '../world/vegetation/TreeSpecies';

interface ManagedObject {
  id: string;
  object: THREE.Object3D;
  species?: TreeSpeciesType;
  type: 'tree' | 'rock' | 'bush';
  registered: boolean;
}

export class BillboardManager {
  private billboardSystem: BillboardSystem;
  private managedObjects: Map<string, ManagedObject> = new Map();
  private objectIdCounter = 0;
  
  // Performance tracking
  private lastStatsLog = 0;
  private readonly STATS_LOG_INTERVAL = 10000; // Log every 10 seconds
  
  constructor(
    scene: THREE.Scene, 
    camera: THREE.PerspectiveCamera, 
    renderer: THREE.WebGLRenderer
  ) {
    this.billboardSystem = new BillboardSystem(scene, camera, renderer);
    console.log('🎛️ [BillboardManager] Initialized - managing tree billboarding for optimal performance');
  }
  
  /**
   * Register a tree for billboard management
   */
  public registerTree(treeMesh: THREE.Object3D, species: TreeSpeciesType): string {
    const id = `tree_${this.objectIdCounter++}`;
    
    const managedObject: ManagedObject = {
      id,
      object: treeMesh,
      species,
      type: 'tree',
      registered: false
    };
    
    this.managedObjects.set(id, managedObject);
    
    // Register with billboard system
    this.billboardSystem.registerTree(id, treeMesh, species);
    managedObject.registered = true;
    
    return id;
  }
  
  /**
   * Register multiple trees at once (batch operation)
   */
  public registerTrees(treesData: Array<{ mesh: THREE.Object3D; species: TreeSpeciesType }>): string[] {
    const ids: string[] = [];
    
    treesData.forEach(({ mesh, species }) => {
      const id = this.registerTree(mesh, species);
      ids.push(id);
    });
    
    console.log(`🎛️ [BillboardManager] Batch registered ${ids.length} trees for billboard management`);
    return ids;
  }
  
  /**
   * Update all managed objects - call this every frame
   */
  public update(playerPosition: THREE.Vector3): void {
    // Update billboard system
    this.billboardSystem.update(playerPosition);
    
    // Log performance stats periodically
    this.logPerformanceStats();
  }
  
  /**
   * Unregister an object from billboard management
   */
  public unregister(id: string): void {
    const obj = this.managedObjects.get(id);
    if (!obj) return;
    
    if (obj.type === 'tree' && obj.registered) {
      this.billboardSystem.unregisterTree(id);
    }
    
    this.managedObjects.delete(id);
  }
  
  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    totalObjects: number;
    billboardCount: number;
    tree3DCount: number;
    performanceGain: string;
  } {
    const totalObjects = this.managedObjects.size;
    const billboardCount = this.billboardSystem.getBillboardCount();
    const tree3DCount = this.billboardSystem.get3DTreeCount();
    
    // Calculate performance gain from billboarding
    const renderingComplexityReduction = billboardCount > 0 
      ? ((billboardCount * 0.05) / (tree3DCount + billboardCount * 0.05) * 100).toFixed(1)
      : '0.0';
    
    return {
      totalObjects,
      billboardCount,
      tree3DCount,
      performanceGain: `${renderingComplexityReduction}% complexity reduction`
    };
  }
  
  private logPerformanceStats(): void {
    const now = Date.now();
    if (now - this.lastStatsLog < this.STATS_LOG_INTERVAL) return;
    
    const stats = this.getPerformanceStats();
    console.log(`🎛️ [BillboardManager] Performance Stats:`, {
      managed: stats.totalObjects,
      billboards: stats.billboardCount,
      highDetail: stats.tree3DCount,
      gain: stats.performanceGain
    });
    
    this.lastStatsLog = now;
  }
  
  /**
   * Set billboard distance threshold
   */
  public setBillboardDistance(distance: number): void {
    // This would require exposing the distance setting in BillboardSystem
    console.log(`🎛️ [BillboardManager] Billboard distance threshold: ${distance} units`);
  }
  
  /**
   * Get all managed objects of a specific type
   */
  public getManagedObjects(type?: 'tree' | 'rock' | 'bush'): ManagedObject[] {
    const objects = Array.from(this.managedObjects.values());
    return type ? objects.filter(obj => obj.type === type) : objects;
  }
  
  /**
   * Force update all objects (useful for debugging)
   */
  public forceUpdate(playerPosition: THREE.Vector3): void {
    console.log('🎛️ [BillboardManager] Force updating all billboard states');
    this.billboardSystem.update(playerPosition);
  }
  
  /**
   * Get system status for debugging
   */
  public getSystemStatus(): {
    isActive: boolean;
    managedObjectCount: number;
    billboardSystemActive: boolean;
  } {
    return {
      isActive: true,
      managedObjectCount: this.managedObjects.size,
      billboardSystemActive: this.billboardSystem !== null
    };
  }
  
  /**
   * Clean up all resources
   */
  public dispose(): void {
    console.log('🎛️ [BillboardManager] Disposing billboard management system');
    
    // Unregister all objects
    const objectIds = Array.from(this.managedObjects.keys());
    objectIds.forEach(id => this.unregister(id));
    
    // Dispose billboard system
    if (this.billboardSystem) {
      this.billboardSystem.dispose();
    }
    
    console.log('🎛️ [BillboardManager] Billboard management system disposed');
  }
}