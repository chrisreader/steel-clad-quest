
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
    
    // Central fireplace
    this.createFireplace();
    
    // Furniture (moved to sides to make room for fireplace)
    this.createFurniture();
  }
  
  private createFireplace(): void {
    // Fireplace base (stone platform)
    const fireplaceBaseMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x696969,
      map: TextureGenerator.createStoneTexture()
    });
    const fireplaceBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1), fireplaceBaseMaterial);
    fireplaceBase.position.set(0, 0.05, 0);
    this.addComponent(fireplaceBase, 'fireplace_base', 'stone');
    
    // Small rocks around the fireplace
    const rockMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x555555,
      map: TextureGenerator.createStoneTexture()
    });
    
    // Create 8 rocks in a circle
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 1.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Vary rock sizes and shapes slightly
      const rockWidth = 0.15 + Math.random() * 0.1;
      const rockHeight = 0.2 + Math.random() * 0.15;
      const rockDepth = 0.15 + Math.random() * 0.1;
      
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(rockWidth, rockHeight, rockDepth), 
        rockMaterial.clone()
      );
      rock.position.set(x, rockHeight / 2 + 0.1, z);
      
      // Add slight random rotation for natural look
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.rotation.x = (Math.random() - 0.5) * 0.2;
      rock.rotation.z = (Math.random() - 0.5) * 0.2;
      
      this.addComponent(rock, `fireplace_rock_${i}`, 'stone');
    }
    
    // Fire effect (simple glowing material)
    const fireMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF4500,
      transparent: true,
      opacity: 0.8
    });
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 6), fireMaterial);
    fire.position.set(0, 0.4, 0);
    this.addComponent(fire, 'fire', 'fabric');
    
    // Add warm fireplace light
    const fireplaceLight = new THREE.PointLight(0xFF6600, 1.5, 8);
    fireplaceLight.position.set(0, 1, 0);
    fireplaceLight.castShadow = true;
    this.buildingGroup.add(fireplaceLight);
    
    console.log('🔥 Fireplace with rocks created in tavern center');
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
  
  protected getBuildingName(): string {
    return 'Tavern';
  }
}
