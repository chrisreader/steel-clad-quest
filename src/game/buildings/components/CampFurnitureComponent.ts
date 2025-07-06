import * as THREE from 'three';
import { TextureGenerator } from '../../utils';

export class CampFurnitureComponent {
  private scene: THREE.Scene;
  private position: THREE.Vector3;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
  }

  /**
   * Creates a realistic chopped tree trunk/log for seating
   */
  public createLogSeat(
    radius: number = 0.25,
    height: number = 0.4,
    length: number = 1.5
  ): THREE.Group {
    const logGroup = new THREE.Group();
    logGroup.position.copy(this.position);

    // Main log cylinder
    const logGeometry = new THREE.CylinderGeometry(radius, radius * 1.1, length, 16);
    const logMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    
    const log = new THREE.Mesh(logGeometry, logMaterial);
    log.rotation.z = Math.PI / 2; // Horizontal
    log.position.y = radius;
    log.castShadow = true;
    log.receiveShadow = true;
    logGroup.add(log);

    // Create end caps with tree ring details
    const endCapGeometry = new THREE.CylinderGeometry(radius, radius, 0.05, 16);
    const endCapMaterial = new THREE.MeshLambertMaterial({
      color: 0x654321,
      map: TextureGenerator.createWoodTexture()
    });

    // Left end cap
    const leftCap = new THREE.Mesh(endCapGeometry, endCapMaterial);
    leftCap.position.set(-length/2, radius, 0);
    leftCap.rotation.z = Math.PI / 2;
    this.addTreeRings(leftCap, radius);
    logGroup.add(leftCap);

    // Right end cap
    const rightCap = new THREE.Mesh(endCapGeometry, endCapMaterial.clone());
    rightCap.position.set(length/2, radius, 0);
    rightCap.rotation.z = Math.PI / 2;
    this.addTreeRings(rightCap, radius);
    logGroup.add(rightCap);

    // Add some bark texture variations
    this.addBarkDetails(log, radius, length);

    console.log(`🪵 [CampFurnitureComponent] Created log seat`);
    return logGroup;
  }

  /**
   * Creates a simple camp table from logs and planks
   */
  public createCampTable(
    width: number = 1.2,
    depth: number = 0.8,
    height: number = 0.7
  ): THREE.Group {
    const tableGroup = new THREE.Group();
    tableGroup.position.copy(this.position);

    // Table top made from planks
    const plankWidth = width / 4;
    const plankMaterial = new THREE.MeshLambertMaterial({
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture()
    });

    for (let i = 0; i < 4; i++) {
      const plankGeometry = new THREE.BoxGeometry(plankWidth * 0.9, 0.05, depth);
      const plank = new THREE.Mesh(plankGeometry, plankMaterial.clone());
      plank.position.set(
        -width/2 + plankWidth/2 + i * plankWidth,
        height,
        0
      );
      plank.castShadow = true;
      plank.receiveShadow = true;
      tableGroup.add(plank);
    }

    // Log legs
    const legRadius = 0.08;
    const legGeometry = new THREE.CylinderGeometry(legRadius, legRadius * 1.2, height, 8);
    const legMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });

    const legPositions = [
      [-width/2 + 0.1, height/2, -depth/2 + 0.1],
      [width/2 - 0.1, height/2, -depth/2 + 0.1],
      [-width/2 + 0.1, height/2, depth/2 - 0.1],
      [width/2 - 0.1, height/2, depth/2 - 0.1]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial.clone());
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.rotation.set(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1
      );
      leg.castShadow = true;
      leg.receiveShadow = true;
      tableGroup.add(leg);
    });

    console.log(`🪑 [CampFurnitureComponent] Created camp table`);
    return tableGroup;
  }

  /**
   * Creates a camp stool from a log section
   */
  public createCampStool(
    radius: number = 0.2,
    height: number = 0.4
  ): THREE.Group {
    const stoolGroup = new THREE.Group();
    stoolGroup.position.copy(this.position);

    // Main stool body
    const stoolGeometry = new THREE.CylinderGeometry(radius, radius * 1.1, height, 12);
    const stoolMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });

    const stool = new THREE.Mesh(stoolGeometry, stoolMaterial);
    stool.position.y = height / 2;
    stool.castShadow = true;
    stool.receiveShadow = true;
    stoolGroup.add(stool);

    // Top surface with tree rings
    const topGeometry = new THREE.CylinderGeometry(radius, radius, 0.03, 16);
    const topMaterial = new THREE.MeshLambertMaterial({
      color: 0x654321,
      map: TextureGenerator.createWoodTexture()
    });

    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = height;
    this.addTreeRings(top, radius);
    stoolGroup.add(top);

    // Add bark texture
    this.addBarkDetails(stool, radius, height);

    console.log(`🪑 [CampFurnitureComponent] Created camp stool`);
    return stoolGroup;
  }

  /**
   * Creates scattered firewood pile
   */
  public createFirewoodPile(count: number = 8): THREE.Group {
    const firewoodGroup = new THREE.Group();
    firewoodGroup.position.copy(this.position);

    const woodMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });

    for (let i = 0; i < count; i++) {
      const length = 0.4 + Math.random() * 0.3;
      const radius = 0.02 + Math.random() * 0.03;
      
      const logGeometry = new THREE.CylinderGeometry(radius, radius * 0.8, length, 6);
      const logPiece = new THREE.Mesh(logGeometry, woodMaterial.clone());
      
      // Random positioning in a small area
      logPiece.position.set(
        (Math.random() - 0.5) * 1.0,
        radius + Math.random() * 0.1,
        (Math.random() - 0.5) * 1.0
      );
      
      // Random rotation
      logPiece.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      
      logPiece.castShadow = true;
      logPiece.receiveShadow = true;
      firewoodGroup.add(logPiece);
    }

    console.log(`🪵 [CampFurnitureComponent] Created firewood pile with ${count} pieces`);
    return firewoodGroup;
  }

  /**
   * Adds realistic tree ring details to a log end
   */
  private addTreeRings(mesh: THREE.Mesh, radius: number): void {
    const ringCount = 3 + Math.floor(Math.random() * 4);
    const ringMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4A4A4A,
      transparent: true,
      opacity: 0.3
    });

    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (radius * i) / (ringCount + 1);
      const ringGeometry = new THREE.RingGeometry(ringRadius - 0.01, ringRadius, 16);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
      ring.position.z = 0.001 * i; // Slight offset to prevent z-fighting
      mesh.add(ring);
    }
  }

  /**
   * Adds bark texture details to logs
   */
  private addBarkDetails(mesh: THREE.Mesh, radius: number, length: number): void {
    // Add vertical bark lines
    const barkMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x654321,
      transparent: true,
      opacity: 0.4
    });

    const lineCount = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const lineGeometry = new THREE.BoxGeometry(0.01, length * 0.8, 0.01);
      const barkLine = new THREE.Mesh(lineGeometry, barkMaterial.clone());
      
      barkLine.position.set(
        Math.cos(angle) * (radius + 0.005),
        0,
        Math.sin(angle) * (radius + 0.005)
      );
      
      mesh.add(barkLine);
    }
  }

  public dispose(): void {
    console.log(`🪑 [CampFurnitureComponent] Disposed camp furniture component`);
  }
}