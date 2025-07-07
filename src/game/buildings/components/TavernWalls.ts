import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { BaseBuilding } from '../BaseBuilding';

export class TavernWalls {
  private building: BaseBuilding;

  constructor(building: BaseBuilding) {
    this.building = building;
  }

  public createWalls(): void {
    const wallHeight = 6;
    const logHeight = 0.3;
    const logsPerWall = Math.floor(wallHeight / logHeight);
    
    // Wood log colors for variation
    const logColors = [
      0x8B4513, // Saddle brown
      0xA0522D, // Sienna  
      0x8B7355, // Dark khaki
      0xCD853F, // Peru
      0x654321  // Dark brown
    ];
    
    // Create stacked log walls for each side
    this.createLogWall('back', 0, -6, 12, 0.4, logsPerWall, logColors);
    
    // Left wall with window opening
    const leftWindowOpenings = [{
      minY: 2.25, maxY: 3.75, minZ: -3, maxZ: -1
    }];
    this.createLogWall('left', -6, 0, 0.4, 12, logsPerWall, logColors, leftWindowOpenings);
    
    // Right wall with two window openings
    const rightWindowOpenings = [
      { minY: 2.25, maxY: 3.75, minZ: 1, maxZ: 3 },
      { minY: 2.25, maxY: 3.75, minZ: -3, maxZ: -1 }
    ];
    this.createLogWall('right', 6, 0, 0.4, 12, logsPerWall, logColors, rightWindowOpenings);
    
    // Front walls with door opening
    this.createLogWall('front_left', -3, 6, 3, 0.4, logsPerWall, logColors);
    this.createLogWall('front_right', 3, 6, 3, 0.4, logsPerWall, logColors);
    
    // Create tavern door frame
    this.createDoorFrame();
  }

  private createLogWall(
    wallName: string, 
    centerX: number, 
    centerZ: number, 
    width: number, 
    depth: number, 
    logsCount: number, 
    logColors: number[], 
    windowOpenings?: Array<{minY: number, maxY: number, minZ: number, maxZ: number}>
  ): void {
    const logHeight = 0.35;
    const logRadius = logHeight * 0.6;
    
    for (let i = 0; i < logsCount; i++) {
      this.createSingleLog(wallName, i, centerX, centerZ, width, depth, logHeight, logRadius, logColors, windowOpenings);
    }
  }

  private createSingleLog(
    wallName: string,
    logIndex: number,
    centerX: number,
    centerZ: number,
    width: number,
    depth: number,
    logHeight: number,
    logRadius: number,
    logColors: number[],
    windowOpenings?: Array<{minY: number, maxY: number, minZ: number, maxZ: number}>
  ): void {
    const logY = (logIndex + 0.5) * logHeight;
    const colorIndex = logIndex % logColors.length;
    const logMaterial = new THREE.MeshStandardMaterial({
      color: logColors[colorIndex],
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    let logGeometry: THREE.CylinderGeometry;
    let logPosition: THREE.Vector3;
    let rotation = new THREE.Euler(0, 0, Math.PI / 2);
    
    if (width > depth) {
      // Horizontal log (back/front walls)
      logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, width, 12);
      logPosition = new THREE.Vector3(centerX, logY, centerZ);
    } else {
      // Vertical log (left/right walls)  
      logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, depth, 12);
      logPosition = new THREE.Vector3(centerX, logY, centerZ);
      rotation = new THREE.Euler(Math.PI / 2, 0, 0);
    }
    
    // Check if this log needs to be segmented around window openings
    if (windowOpenings && width <= depth) {
      if (this.handleWindowSegmentation(wallName, logIndex, logY, centerX, centerZ, depth, logRadius, logMaterial, rotation, windowOpenings)) {
        return; // Log was segmented, skip creating full log
      }
    }
    
    const log = new THREE.Mesh(logGeometry, logMaterial);
    log.position.copy(logPosition);
    log.rotation.copy(rotation);
    
    // Add slight variations
    log.position.y += (Math.random() - 0.5) * 0.01;
    log.rotation.z += (Math.random() - 0.5) * 0.02;
    
    this.building.addComponent(log, `${wallName}_log_${logIndex}`, 'wood');
    
    // Add log end caps for more realistic appearance
    if (logIndex % 2 === 0 && width > depth) {
      this.createLogEndCaps(logPosition, logRadius, width, wallName, logIndex);
    }
  }

  private handleWindowSegmentation(
    wallName: string,
    logIndex: number,
    logY: number,
    centerX: number,
    centerZ: number,
    depth: number,
    logRadius: number,
    logMaterial: THREE.MeshStandardMaterial,
    rotation: THREE.Euler,
    windowOpenings: Array<{minY: number, maxY: number, minZ: number, maxZ: number}>
  ): boolean {
    for (const opening of windowOpenings) {
      if (logY >= opening.minY && logY <= opening.maxY) {
        const logMinZ = centerZ - depth/2;
        const logMaxZ = centerZ + depth/2;
        
        if (logMaxZ > opening.minZ && logMinZ < opening.maxZ) {
          // Create log segment before window (if any)
          if (logMinZ < opening.minZ) {
            const segmentLength = opening.minZ - logMinZ;
            this.createLogSegment(centerX, logY, logMinZ + segmentLength/2, segmentLength, logRadius, logMaterial, rotation, `${wallName}_log_${logIndex}_pre`);
          }
          
          // Create log segment after window (if any)
          if (logMaxZ > opening.maxZ) {
            const segmentLength = logMaxZ - opening.maxZ;
            this.createLogSegment(centerX, logY, opening.maxZ + segmentLength/2, segmentLength, logRadius, logMaterial, rotation, `${wallName}_log_${logIndex}_post`);
          }
          return true; // Log was segmented
        }
      }
    }
    return false; // Log was not segmented
  }

  private createLogSegment(
    x: number, 
    y: number, 
    z: number, 
    length: number, 
    radius: number, 
    material: THREE.MeshStandardMaterial, 
    rotation: THREE.Euler, 
    name: string
  ): void {
    const segmentGeometry = new THREE.CylinderGeometry(radius, radius, length, 12);
    const segment = new THREE.Mesh(segmentGeometry, material);
    segment.position.set(x, y, z);
    segment.rotation.copy(rotation);
    
    // Add slight variations
    segment.position.y += (Math.random() - 0.5) * 0.01;
    segment.rotation.z += (Math.random() - 0.5) * 0.02;
    
    this.building.addComponent(segment, name, 'wood');
  }

  private createLogEndCaps(logPosition: THREE.Vector3, radius: number, length: number, wallName: string, logIndex: number): void {
    const endCapMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.9,
      metalness: 0
    });
    
    const endCapGeometry = new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.08, 12);
    
    if (length <= 12 && !wallName.includes('left') && !wallName.includes('right')) { 
      // Left end cap
      const leftEndCap = new THREE.Mesh(endCapGeometry, endCapMaterial.clone());
      leftEndCap.position.copy(logPosition);
      leftEndCap.position.x -= length / 2;
      leftEndCap.rotation.z = Math.PI / 2;
      this.building.addComponent(leftEndCap, `${wallName}_log_${logIndex}_left_end`, 'wood');
      
      // Right end cap
      const rightEndCap = new THREE.Mesh(endCapGeometry, endCapMaterial.clone());
      rightEndCap.position.copy(logPosition);
      rightEndCap.position.x += length / 2;
      rightEndCap.rotation.z = Math.PI / 2;
      this.building.addComponent(rightEndCap, `${wallName}_log_${logIndex}_right_end`, 'wood');
    }
  }

  private createDoorFrame(): void {
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    // Door frame posts
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), doorFrameMaterial);
    leftPost.position.set(-1, 2, 6.1);
    this.building.addComponent(leftPost, 'door_left_post', 'wood');
    
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), doorFrameMaterial.clone());
    rightPost.position.set(1, 2, 6.1);
    this.building.addComponent(rightPost, 'door_right_post', 'wood');
    
    // Door lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.2), doorFrameMaterial.clone());
    lintel.position.set(0, 4, 6.1);
    this.building.addComponent(lintel, 'door_lintel', 'wood');
    
    // Tavern sign
    const signMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.1), signMaterial);
    sign.position.set(0, 5, 6.2);
    this.building.addComponent(sign, 'tavern_sign', 'wood');
  }
}