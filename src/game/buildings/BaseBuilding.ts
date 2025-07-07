
import * as THREE from 'three';
import { PhysicsManager } from '../engine/PhysicsManager';

export interface BuildingComponent {
  mesh: THREE.Object3D;
  name: string;
  material: 'wood' | 'stone' | 'metal' | 'fabric';
}

export abstract class BaseBuilding {
  protected scene: THREE.Scene;
  protected physicsManager: PhysicsManager;
  protected position: THREE.Vector3;
  protected buildingGroup: THREE.Group;
  protected components: BuildingComponent[] = [];
  protected registeredCollisionIds: string[] = [];
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager, position: THREE.Vector3) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.position = position.clone();
    this.buildingGroup = new THREE.Group();
    this.buildingGroup.position.copy(this.position);
  }
  
  // Abstract methods that each building type must implement
  protected abstract createStructure(): void;
  protected abstract getBuildingName(): string;
  
  // Create the building and add it to the scene
  public create(): THREE.Group {
    this.createStructure();
    this.scene.add(this.buildingGroup);
    this.registerCollisions();
    
    return this.buildingGroup;
  }
  
  // Register all building components for collision
  protected registerCollisions(): void {
    for (const component of this.components) {
      const id = this.physicsManager.addCollisionObject(
        component.mesh,
        'environment',
        component.material,
        `${this.getBuildingName()}_${component.name}_${Date.now()}`
      );
      this.registeredCollisionIds.push(id);
    }
  }
  
  // Helper method to add a component to the building
  public addComponent(mesh: THREE.Object3D, name: string, material: 'wood' | 'stone' | 'metal' | 'fabric'): void {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.buildingGroup.add(mesh);
    this.components.push({ mesh, name, material });
  }
  
  // Get the building's position
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  // Get the building's floor bounds for grass exclusion
  public getFloorBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    // Default bounds for most buildings (override in subclasses)
    const size = 12; // Default 12x12 floor
    return {
      minX: this.position.x - size / 2,
      maxX: this.position.x + size / 2,
      minZ: this.position.z - size / 2,
      maxZ: this.position.z + size / 2
    };
  }
  
  // Get the building group
  public getBuildingGroup(): THREE.Group {
    return this.buildingGroup;
  }
  
  // Clean up the building
  public dispose(): void {
    // Remove collision objects
    for (const id of this.registeredCollisionIds) {
      this.physicsManager.removeCollisionObject(id);
    }
    this.registeredCollisionIds.length = 0;
    
    // Remove from scene
    this.scene.remove(this.buildingGroup);
    
    // Dispose geometries and materials
    this.buildingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    this.components.length = 0;
  }
}
