
import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TextureGenerator } from '../utils';

export class TavernBuilding extends BaseBuilding {
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
    
    // Furniture
    this.createFurniture();
  }
  
  private createFurniture(): void {
    // Table
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture()
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1.5), tableMaterial);
    table.position.set(-2, 1, -2);
    this.addComponent(table, 'table', 'wood');
    
    // Table legs
    const legMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xCD853F,
      map: TextureGenerator.createWoodTexture()
    });
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 8);
    
    const legPositions = [
      [-1, 0.5, -0.5], [1, 0.5, -0.5], [-1, 0.5, 0.5], [1, 0.5, 0.5]
    ];
    
    legPositions.forEach((pos, index) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial.clone());
      leg.position.set(-2 + pos[0], pos[1], -2 + pos[2]);
      this.addComponent(leg, `table_leg_${index + 1}`, 'wood');
    });
  }
  
  protected getBuildingName(): string {
    return 'Tavern';
  }
}
