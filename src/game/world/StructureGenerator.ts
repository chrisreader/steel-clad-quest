
import * as THREE from 'three';

interface StructureData {
  meshes: THREE.Object3D[];
  regionKey: string;
}

export class StructureGenerator {
  private scene: THREE.Scene;
  private generatedStructures: Map<string, StructureData> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🏰 [StructureGenerator] Initialized');
  }

  public generateStructuresForRegion(regionKey: string, centerX: number, centerZ: number): THREE.Object3D[] {
    if (this.generatedStructures.has(regionKey)) {
      console.log(`🏰 [StructureGenerator] Structures already exist for region ${regionKey}`);
      return this.generatedStructures.get(regionKey)!.meshes;
    }

    console.log(`🏰 [StructureGenerator] Generating structures for region ${regionKey} at (${centerX}, ${centerZ})`);
    
    const structures: THREE.Object3D[] = [];
    
    // Skip structure generation near center (tavern area)
    if (Math.abs(centerX) < 500 && Math.abs(centerZ) < 500) {
      console.log(`🏰 [StructureGenerator] Skipping structure generation near center for region ${regionKey}`);
      return structures;
    }
    
    // Chance to generate a ruined castle
    if (Math.random() < 0.3) {
      const castle = this.createRuinedCastle(centerX, centerZ);
      if (castle) {
        structures.push(castle);
        this.scene.add(castle);
      }
    }
    
    // Generate some smaller structures
    const hutCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < hutCount; i++) {
      const hut = this.createHut(centerX, centerZ);
      if (hut) {
        structures.push(hut);
        this.scene.add(hut);
      }
    }

    const structureData: StructureData = {
      meshes: structures,
      regionKey
    };
    
    this.generatedStructures.set(regionKey, structureData);
    
    console.log(`🏰 [StructureGenerator] Generated ${structures.length} structures for region ${regionKey}`);
    return structures;
  }

  private createRuinedCastle(centerX: number, centerZ: number): THREE.Group | null {
    const castle = new THREE.Group();
    
    // Random position within the region (away from edges)
    const offsetX = (Math.random() - 0.5) * 600;
    const offsetZ = (Math.random() - 0.5) * 600;
    const x = centerX + offsetX;
    const z = centerZ + offsetZ;
    
    const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    
    // Main castle walls (partially destroyed)
    const wallHeight = 8;
    const wallThickness = 1;
    
    // North wall (broken)
    const northWall1 = this.createWallSegment(-15, 0, -15, wallHeight * 0.8, wallThickness, stoneMaterial);
    const northWall2 = this.createWallSegment(5, 0, -15, wallHeight * 0.6, wallThickness, stoneMaterial);
    castle.add(northWall1);
    castle.add(northWall2);
    
    // South wall (mostly intact)
    const southWall = this.createWallSegment(0, 0, 15, wallHeight, wallThickness, stoneMaterial);
    southWall.scale.x = 2.5;
    castle.add(southWall);
    
    // East wall (damaged)
    const eastWall = this.createWallSegment(15, 0, 0, wallHeight * 0.7, wallThickness, stoneMaterial);
    eastWall.scale.z = 2;
    castle.add(eastWall);
    
    // West wall (partial)
    const westWall1 = this.createWallSegment(-15, 0, -8, wallHeight * 0.5, wallThickness, stoneMaterial);
    const westWall2 = this.createWallSegment(-15, 0, 8, wallHeight * 0.4, wallThickness, stoneMaterial);
    castle.add(westWall1);
    castle.add(westWall2);
    
    // Ruined tower
    const towerGeometry = new THREE.CylinderGeometry(3, 3.5, wallHeight * 1.2, 8);
    const tower = new THREE.Mesh(towerGeometry, stoneMaterial);
    tower.position.set(-12, wallHeight * 0.6, -12);
    castle.add(tower);
    
    // Debris and rubble
    for (let i = 0; i < 8; i++) {
      const rubble = this.createRubble(stoneMaterial);
      rubble.position.set(
        (Math.random() - 0.5) * 30,
        0.5,
        (Math.random() - 0.5) * 30
      );
      castle.add(rubble);
    }
    
    castle.position.set(x, 0, z);
    castle.rotation.y = Math.random() * Math.PI * 2;
    
    return castle;
  }

  private createWallSegment(x: number, y: number, z: number, height: number, thickness: number, material: THREE.Material): THREE.Mesh {
    const wallGeometry = new THREE.BoxGeometry(thickness, height, 10);
    const wall = new THREE.Mesh(wallGeometry, material);
    wall.position.set(x, y + height / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  private createRubble(material: THREE.Material): THREE.Mesh {
    const size = 0.5 + Math.random() * 1.0;
    const rubbleGeometry = new THREE.DodecahedronGeometry(size, 0);
    const rubble = new THREE.Mesh(rubbleGeometry, material);
    rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rubble.castShadow = true;
    rubble.receiveShadow = true;
    return rubble;
  }

  private createHut(centerX: number, centerZ: number): THREE.Group | null {
    const hut = new THREE.Group();
    
    // Random position within the region
    const offsetX = (Math.random() - 0.5) * 700;
    const offsetZ = (Math.random() - 0.5) * 700;
    const x = centerX + offsetX;
    const z = centerZ + offsetZ;
    
    const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    
    // Hut base
    const baseGeometry = new THREE.BoxGeometry(4, 3, 4);
    const base = new THREE.Mesh(baseGeometry, woodMaterial);
    base.position.y = 1.5;
    base.castShadow = true;
    base.receiveShadow = true;
    hut.add(base);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(3, 2, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    hut.add(roof);
    
    hut.position.set(x, 0, z);
    hut.rotation.y = Math.random() * Math.PI * 2;
    
    return hut;
  }

  public removeStructuresForRegion(regionKey: string): void {
    const structureData = this.generatedStructures.get(regionKey);
    if (structureData) {
      for (const mesh of structureData.meshes) {
        this.scene.remove(mesh);
        
        // Dispose geometry and materials
        if (mesh instanceof THREE.Mesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        } else if (mesh instanceof THREE.Group) {
          mesh.traverse((child) => {
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
        }
      }
      
      this.generatedStructures.delete(regionKey);
      console.log(`🏰 [StructureGenerator] Removed structures for region ${regionKey}`);
    }
  }

  public dispose(): void {
    for (const regionKey of this.generatedStructures.keys()) {
      this.removeStructuresForRegion(regionKey);
    }
    console.log('🏰 [StructureGenerator] Disposed all structures');
  }
}
