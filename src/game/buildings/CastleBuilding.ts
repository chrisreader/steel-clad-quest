import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';

export interface CastleOptions {
  wallLength?: number;
  wallHeight?: number;
  towerHeight?: number;
  keepWidth?: number;
  keepHeight?: number;
}

export class CastleBuilding extends BaseBuilding {
  private options: CastleOptions;
  
  constructor(scene: THREE.Scene, physicsManager: any, position: THREE.Vector3, options: CastleOptions = {}) {
    super(scene, physicsManager, position);
    this.options = {
      wallLength: 36,
      wallHeight: 8,
      towerHeight: 12,
      keepWidth: 15,
      keepHeight: 15,
      ...options
    };
  }
  
  protected createStructure(): void {
    // Create base/foundation
    this.createFoundation();
    
    // Create outer walls (partially ruined)
    this.createOuterWalls();
    
    // Create towers (some broken)
    this.createTowers();
    
    // Create central keep
    this.createKeep();
    
    // Create rubble for ruined sections
    this.createRubblePiles();
  }
  
  private createFoundation(): void {
    const baseGeometry = new THREE.BoxGeometry(40, 2, 40);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1;
    this.addComponent(base, 'foundation', 'stone');
  }
  
  private createOuterWalls(): void {
    const wallHeight = this.options.wallHeight!;
    const wallThickness = 2;
    const wallLength = this.options.wallLength!;
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
    
    // North wall (partially broken)
    const northWallGeometry = new THREE.BoxGeometry(wallLength * 0.7, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight/2 + 1, -wallLength/2 + wallThickness/2);
    this.addComponent(northWall, 'north_wall', 'stone');
    
    // East wall (intact)
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial.clone());
    eastWall.position.set(wallLength/2 - wallThickness/2, wallHeight/2 + 1, 0);
    this.addComponent(eastWall, 'east_wall', 'stone');
    
    // South wall (intact)
    const southWallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial.clone());
    southWall.position.set(0, wallHeight/2 + 1, wallLength/2 - wallThickness/2);
    this.addComponent(southWall, 'south_wall', 'stone');
    
    // West wall (very broken - only partial)
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallLength * 0.3);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial.clone());
    westWall.position.set(-wallLength/2 + wallThickness/2, wallHeight/2 + 1, wallLength/3);
    this.addComponent(westWall, 'west_wall', 'stone');
  }
  
  private createTowers(): void {
    const towerRadius = 4;
    const towerHeight = this.options.towerHeight!;
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const wallLength = this.options.wallLength!;
    
    // Northeast tower (intact)
    const neTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius+1, towerHeight, 8),
      towerMaterial
    );
    neTower.position.set(wallLength/2 - 2, towerHeight/2 + 1, -wallLength/2 + 2);
    this.addComponent(neTower, 'northeast_tower', 'stone');
    
    // Southeast tower (intact)
    const seTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius+1, towerHeight, 8),
      towerMaterial.clone()
    );
    seTower.position.set(wallLength/2 - 2, towerHeight/2 + 1, wallLength/2 - 2);
    this.addComponent(seTower, 'southeast_tower', 'stone');
    
    // Southwest tower (broken - half height)
    const swTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius+1, towerHeight/2, 8),
      towerMaterial.clone()
    );
    swTower.position.set(-wallLength/2 + 2, towerHeight/4 + 1, wallLength/2 - 2);
    this.addComponent(swTower, 'southwest_tower', 'stone');
    
    // Northwest tower (very broken - just base)
    const nwTower = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius+1, towerRadius+2, 3, 8),
      towerMaterial.clone()
    );
    nwTower.position.set(-wallLength/2 + 2, 1.5, -wallLength/2 + 2);
    this.addComponent(nwTower, 'northwest_tower', 'stone');
  }
  
  private createKeep(): void {
    const keepWidth = this.options.keepWidth!;
    const keepDepth = 20;
    const keepHeight = this.options.keepHeight!;
    const keepMaterial = new THREE.MeshLambertMaterial({ color: 0x777777 });
    
    // Main keep structure
    const keepGeometry = new THREE.BoxGeometry(keepWidth, keepHeight, keepDepth);
    const keep = new THREE.Mesh(keepGeometry, keepMaterial);
    keep.position.set(2, keepHeight/2 + 1, 0);
    this.addComponent(keep, 'keep_main', 'stone');
    
    // Keep roof (partially collapsed)
    const roofGeometry = new THREE.ConeGeometry(keepWidth/1.5, 8, 4);
    const roof = new THREE.Mesh(roofGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    roof.position.set(2, keepHeight + 5, -keepDepth/4);
    roof.rotation.x = Math.PI * 0.1; // Tilted, as if collapsing
    this.addComponent(roof, 'keep_roof', 'wood');
    
    // Keep entrance
    const doorGeometry = new THREE.BoxGeometry(4, 6, 1);
    const door = new THREE.Mesh(doorGeometry, new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    door.position.set(2, 4, keepDepth/2 + 0.5);
    this.addComponent(door, 'keep_door', 'wood');
    
    // Create windows as separate components
    this.createKeepWindows(keep, keepWidth, keepDepth, keepHeight);
  }
  
  private createKeepWindows(keep: THREE.Mesh, keepWidth: number, keepDepth: number, keepHeight: number): void {
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Create windows on each side of the keep
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        // Front windows
        const frontWindow = new THREE.Mesh(
          new THREE.BoxGeometry(2, 3, 0.5),
          windowMaterial.clone()
        );
        frontWindow.position.set(
          2 - keepWidth/3 + i * keepWidth/3,
          keepHeight/2 + 1 - keepHeight/6 + j * keepHeight/3,
          keepDepth/2 + 0.3
        );
        this.addComponent(frontWindow, `front_window_${i}_${j}`, 'stone');
        
        // Back windows
        const backWindow = new THREE.Mesh(
          new THREE.BoxGeometry(2, 3, 0.5),
          windowMaterial.clone()
        );
        backWindow.position.set(
          2 - keepWidth/3 + i * keepWidth/3,
          keepHeight/2 + 1 - keepHeight/6 + j * keepHeight/3,
          -keepDepth/2 - 0.3
        );
        this.addComponent(backWindow, `back_window_${i}_${j}`, 'stone');
      }
    }
  }
  
  private createRubblePiles(): void {
    const wallLength = this.options.wallLength!;
    const rubblePositions = [
      [-wallLength/4, 0, -wallLength/2], // North wall rubble
      [-wallLength/2, 0, 0], // West wall rubble
      [-wallLength/2 + 2, 0, -wallLength/2 + 2], // NW tower rubble
      [-wallLength/2 + 2, 0, wallLength/2 - 2] // SW tower rubble
    ];
    
    rubblePositions.forEach((pos, index) => {
      this.createRubblePile(pos[0], pos[1], pos[2], `rubble_pile_${index + 1}`);
    });
  }
  
  private createRubblePile(x: number, y: number, z: number, name: string): void {
    const rubbleMaterial = new THREE.MeshLambertMaterial({ color: 0x999999 });
    
    // Create 5-8 random stone pieces per pile
    const stoneCount = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < stoneCount; i++) {
      const stoneSize = 0.5 + Math.random() * 1.5;
      
      let stoneGeometry;
      if (Math.random() > 0.5) {
        stoneGeometry = new THREE.BoxGeometry(
          stoneSize * (0.5 + Math.random() * 0.5),
          stoneSize * (0.5 + Math.random() * 0.5),
          stoneSize * (0.5 + Math.random() * 0.5)
        );
      } else {
        stoneGeometry = new THREE.IcosahedronGeometry(stoneSize * 0.5, 0);
      }
      
      const stone = new THREE.Mesh(stoneGeometry, rubbleMaterial.clone());
      
      stone.position.set(
        x + (Math.random() * 6) - 3,
        y + (Math.random() * stoneSize),
        z + (Math.random() * 6) - 3
      );
      
      stone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      this.addComponent(stone, `${name}_stone_${i + 1}`, 'stone');
    }
  }
  
  protected getBuildingName(): string {
    return 'Castle';
  }
}
