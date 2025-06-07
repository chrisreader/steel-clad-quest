
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';

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

    // Fireplace base (stone platform)
    this.createFireplaceBase();
    
    // Charred logs inside the fire ring
    this.createCharredLogs();
    
    // Ash bed
    this.createAshBed();

    this.scene.add(this.fireplaceGroup);
    console.log(`🏗️ Fireplace structure created with ${this.components.length} components`);
    
    return this.fireplaceGroup;
  }

  private createFireplaceBase(): void {
    const baseMaterial = new THREE.MeshLambertMaterial({
      color: 0x696969,
      map: TextureGenerator.createStoneTexture(),
      roughness: 0.8,
      metalness: 0.1
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1), baseMaterial);
    base.position.set(0, 0.05, 0);
    base.castShadow = false;
    base.receiveShadow = true;

    this.components.push(base);
    this.fireplaceGroup.add(base);
    
    console.log('🏗️ Fireplace stone base created');
  }

  private createCharredLogs(): void {
    const logMaterial = new THREE.MeshLambertMaterial({
      color: 0x2F1B14, // Dark charred brown
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.9,
      metalness: 0.0
    });

    // Create 3-4 logs arranged naturally
    const logConfigs = [
      { length: 0.8, radius: 0.08, position: new THREE.Vector3(0.2, 0.15, 0), rotation: new THREE.Euler(0, 0.3, 0.1) },
      { length: 0.9, radius: 0.09, position: new THREE.Vector3(-0.15, 0.15, 0.1), rotation: new THREE.Euler(0, -0.5, -0.05) },
      { length: 0.7, radius: 0.07, position: new THREE.Vector3(0, 0.15, -0.2), rotation: new THREE.Euler(0.1, 0.8, 0) },
      { length: 0.6, radius: 0.06, position: new THREE.Vector3(-0.1, 0.25, 0.05), rotation: new THREE.Euler(-0.2, 0.2, 0.15) }
    ];

    for (let i = 0; i < logConfigs.length; i++) {
      const config = logConfigs[i];
      const logGeometry = new THREE.CylinderGeometry(config.radius, config.radius, config.length, 8);
      const log = new THREE.Mesh(logGeometry, logMaterial.clone());
      
      log.position.copy(config.position);
      log.rotation.copy(config.rotation);
      log.castShadow = true;
      log.receiveShadow = true;

      this.components.push(log);
      this.fireplaceGroup.add(log);
    }
    
    console.log(`🏗️ Created ${logConfigs.length} charred logs`);
  }

  private createAshBed(): void {
    const ashMaterial = new THREE.MeshLambertMaterial({
      color: 0x808080, // Light gray ash
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.8
    });

    const ashGeometry = new THREE.CylinderGeometry(1.0, 1.0, 0.02, 16);
    const ashBed = new THREE.Mesh(ashGeometry, ashMaterial);
    ashBed.position.set(0, 0.12, 0);
    ashBed.castShadow = false;
    ashBed.receiveShadow = true;

    this.components.push(ashBed);
    this.fireplaceGroup.add(ashBed);
    
    console.log('🏗️ Ash bed created');
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
