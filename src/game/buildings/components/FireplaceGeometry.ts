
import * as THREE from 'three';
import { OrganicDirtPatch } from './geometry/OrganicDirtPatch';
import { CharredLogs } from './geometry/CharredLogs';
import { AshBed } from './geometry/AshBed';

export class FireplaceGeometry {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private fireplaceGroup: THREE.Group;
  private components: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    this.fireplaceGroup = new THREE.Group();
    this.fireplaceGroup.position.copy(this.position);
  }

  public createFireplaceStructure(): THREE.Group {
    console.log('🏗️ Creating fireplace structure');

    // Organic dirt patch base (replaces circular stone base)
    const dirtPatch = OrganicDirtPatch.create();
    this.components.push(dirtPatch);
    this.fireplaceGroup.add(dirtPatch);
    
    // Charred logs inside the fire ring
    const logs = CharredLogs.create();
    logs.forEach(log => {
      this.components.push(log);
      this.fireplaceGroup.add(log);
    });
    
    // Ash bed
    const ashBed = AshBed.create();
    this.components.push(ashBed);
    this.fireplaceGroup.add(ashBed);

    this.scene.add(this.fireplaceGroup);
    console.log(`🏗️ Fireplace structure created with ${this.components.length} components`);
    
    return this.fireplaceGroup;
  }

  public dispose(): void {
    console.log('🏗️ Disposing fireplace geometry');
    
    this.scene.remove(this.fireplaceGroup);
    
    for (const component of this.components) {
      if (component.geometry) component.geometry.dispose();
      if (component.material instanceof THREE.Material) {
        component.material.dispose();
      }
    }
    
    this.components = [];
    console.log('🏗️ Fireplace geometry disposed');
  }
}
