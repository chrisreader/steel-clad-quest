import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TextureGenerator } from '../utils';
import { FireplaceComponent } from './components/FireplaceComponent';
import { AudioManager } from '../engine/AudioManager';

export class TavernBuilding extends BaseBuilding {
  private fireplaceComponent: FireplaceComponent | null = null;
  private audioManager: AudioManager | null = null;

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  protected createStructure(): void {
    // Tavern floor
    const tavernFloorGeometry = new THREE.PlaneGeometry(12, 12);
    const tavernFloorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture()
    });
    const tavernFloor = new THREE.Mesh(tavernFloorGeometry, tavernFloorMaterial);
    tavernFloor.rotation.x = -Math.PI / 2;
    tavernFloor.position.y = 0.01;
    this.addComponent(tavernFloor, 'floor', 'wood');
    
    // Tavern walls
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B7355,
      map: TextureGenerator.createStoneTexture()
    });
    const wallHeight = 6;
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(12, wallHeight, 0.3);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight/2, -6);
    this.addComponent(backWall, 'back_wall', 'stone');
    
    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(0.3, wallHeight, 12);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial.clone());
    leftWall.position.set(-6, wallHeight/2, 0);
    this.addComponent(leftWall, 'left_wall', 'stone');
    
    // Right wall
    const rightWall = new THREE.Mesh(leftWallGeometry, wallMaterial.clone());
    rightWall.position.set(6, wallHeight/2, 0);
    this.addComponent(rightWall, 'right_wall', 'stone');
    
    // Front walls with door
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight, 0.3), wallMaterial.clone());
    frontWallLeft.position.set(-3, wallHeight/2, 6);
    this.addComponent(frontWallLeft, 'front_wall_left', 'stone');
    
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight, 0.3), wallMaterial.clone());
    frontWallRight.position.set(3, wallHeight/2, 6);
    this.addComponent(frontWallRight, 'front_wall_right', 'stone');
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(9, 3, 8);
    const roofMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xCD5C5C,
      map: TextureGenerator.createStoneTexture()
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, wallHeight + 1.5, 0);
    roof.rotation.y = Math.PI / 8;
    this.addComponent(roof, 'roof', 'stone');
    
    // Enhanced fireplace system
    this.createEnhancedFireplace();
    
    // Furniture (moved to sides to make room for fireplace)
    this.createFurniture();
  }
  
  private createEnhancedFireplace(): void {
    if (!this.audioManager) {
      console.warn('🔥 AudioManager not set for TavernBuilding. Creating fireplace without audio.');
      // Create a mock audio manager for now
      this.audioManager = {} as AudioManager;
    }

    console.log('🔥 Creating enhanced fireplace system for tavern');
    
    this.fireplaceComponent = new FireplaceComponent(
      this.scene,
      this.physicsManager,
      this.audioManager,
      new THREE.Vector3(0, 0, 0), // Center of tavern
      'tavern_fireplace'
    );
    
    const fireplaceGroup = this.fireplaceComponent.create();
    this.buildingGroup.add(fireplaceGroup);
    
    // Register fireplace collisions
    this.fireplaceComponent.registerCollisions('tavern');
    
    console.log('🔥 Enhanced fireplace system created with realistic fire, organic rocks, and dynamic lighting');
  }
  
  private createFurniture(): void {
    // Table (moved to the side)
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture()
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1), tableMaterial);
    table.position.set(-3, 1, -2);
    this.addComponent(table, 'table', 'wood');
    
    // Table legs
    const legMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xCD853F,
      map: TextureGenerator.createWoodTexture()
    });
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 8);
    
    const legPositions = [
      [-1, 0.5, -0.3], [1, 0.5, -0.3], [-1, 0.5, 0.3], [1, 0.5, 0.3]
    ];
    
    legPositions.forEach((pos, index) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial.clone());
      leg.position.set(-3 + pos[0], pos[1], -2 + pos[2]);
      this.addComponent(leg, `table_leg_${index + 1}`, 'wood');
    });
    
    // Add a couple of chairs around the table
    const chairMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    
    // Chair 1
    const chair1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), chairMaterial);
    chair1.position.set(-2, 0.5, -2);
    this.addComponent(chair1, 'chair_1', 'wood');
    
    // Chair 2
    const chair2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), chairMaterial.clone());
    chair2.position.set(-4, 0.5, -2);
    this.addComponent(chair2, 'chair_2', 'wood');
  }
  
  public update(deltaTime: number): void {
    if (this.fireplaceComponent) {
      this.fireplaceComponent.update(deltaTime);
    }
  }
  
  public dispose(): void {
    if (this.fireplaceComponent) {
      this.fireplaceComponent.dispose();
      this.fireplaceComponent = null;
    }
    super.dispose();
  }
  
  protected getBuildingName(): string {
    return 'Tavern';
  }
}
