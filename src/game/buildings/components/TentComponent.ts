import * as THREE from 'three';
import { TextureGenerator } from '../../utils';

export class TentComponent {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private tentGroup: THREE.Group;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.position = position.clone();
    this.tentGroup = new THREE.Group();
    this.tentGroup.position.copy(this.position);
  }

  /**
   * Creates a realistic triangular tent with fabric texture and proper stakes
   */
  public createTriangularTent(
    width: number = 2.5,
    height: number = 1.8,
    depth: number = 3.0,
    tentColor: number = 0x8B4513
  ): THREE.Group {
    console.log(`⛺ [TentComponent] Creating triangular tent at position:`, this.position);
    
    // Create tent fabric material with proper appearance
    const tentMaterial = new THREE.MeshLambertMaterial({
      color: tentColor,
      map: TextureGenerator.createWoodTexture(), // Use wood texture as fabric alternative
      side: THREE.DoubleSide,
      transparent: false
    });

    // Create tent main body using custom geometry
    const tentGeometry = this.createTentGeometry(width, height, depth);
    const tentMesh = new THREE.Mesh(tentGeometry, tentMaterial);
    tentMesh.castShadow = true;
    tentMesh.receiveShadow = true;
    this.tentGroup.add(tentMesh);

    // Create tent floor
    const floorGeometry = new THREE.PlaneGeometry(width * 0.9, depth * 0.9);
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0x654321,
      map: TextureGenerator.createWoodTexture() // Use wood texture as fabric alternative
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    this.tentGroup.add(floor);

    // Create tent stakes
    this.createTentStakes(width, depth);

    // Create tent ropes
    this.createTentRopes(width, height, depth);

    console.log(`⛺ [TentComponent] Triangular tent created successfully`);
    return this.tentGroup;
  }

  /**
   * Creates a dome-style tent
   */
  public createDomeTent(
    radius: number = 1.5,
    height: number = 1.2,
    tentColor: number = 0x2F4F2F
  ): THREE.Group {
    console.log(`⛺ [TentComponent] Creating dome tent at position:`, this.position);
    
    // Create dome tent using sphere geometry
    const domeGeometry = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Scale to make it more tent-like
    const positions = domeGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      // Make it less spherical, more tent-like
      positions[i + 1] = y * (height / radius);
    }
    domeGeometry.attributes.position.needsUpdate = true;
    domeGeometry.computeVertexNormals();

    const tentMaterial = new THREE.MeshLambertMaterial({
      color: tentColor,
      map: TextureGenerator.createWoodTexture(), // Use wood texture as fabric alternative
      side: THREE.DoubleSide
    });

    const domeMesh = new THREE.Mesh(domeGeometry, tentMaterial);
    domeMesh.castShadow = true;
    domeMesh.receiveShadow = true;
    this.tentGroup.add(domeMesh);

    // Create entrance flap
    const flapGeometry = new THREE.PlaneGeometry(0.8, 1.0);
    const flap = new THREE.Mesh(flapGeometry, tentMaterial.clone());
    flap.position.set(0, height * 0.5, radius - 0.1);
    flap.rotation.x = -0.3; // Slightly open
    flap.castShadow = true;
    this.tentGroup.add(flap);

    // Create ground tarp
    const tarpGeometry = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
    const tarpMaterial = new THREE.MeshLambertMaterial({
      color: 0x444444,
      map: TextureGenerator.createWoodTexture() // Use wood texture as fabric alternative
    });
    const tarp = new THREE.Mesh(tarpGeometry, tarpMaterial);
    tarp.rotation.x = -Math.PI / 2;
    tarp.position.y = 0.01;
    tarp.receiveShadow = true;
    this.tentGroup.add(tarp);

    console.log(`⛺ [TentComponent] Dome tent created successfully`);
    return this.tentGroup;
  }

  /**
   * Creates custom tent geometry for triangular tent
   */
  private createTentGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    
    const vertices = [
      // Front triangle
      -width/2, 0, depth/2,        // Bottom left
      width/2, 0, depth/2,         // Bottom right  
      0, height, depth/2,          // Top
      
      // Back triangle
      -width/2, 0, -depth/2,       // Bottom left
      0, height, -depth/2,         // Top
      width/2, 0, -depth/2,        // Bottom right
      
      // Left side
      -width/2, 0, depth/2,        // Front bottom
      -width/2, 0, -depth/2,       // Back bottom
      0, height, depth/2,          // Front top
      
      -width/2, 0, -depth/2,       // Back bottom
      0, height, -depth/2,         // Back top
      0, height, depth/2,          // Front top
      
      // Right side
      width/2, 0, depth/2,         // Front bottom
      0, height, depth/2,          // Front top
      width/2, 0, -depth/2,        // Back bottom
      
      width/2, 0, -depth/2,        // Back bottom
      0, height, depth/2,          // Front top
      0, height, -depth/2,         // Back top
    ];
    
    const uvs = [
      // Front triangle
      0, 0,  1, 0,  0.5, 1,
      // Back triangle  
      0, 0,  0.5, 1,  1, 0,
      // Left side
      0, 0,  1, 0,  0, 1,
      1, 0,  1, 1,  0, 1,
      // Right side
      0, 0,  0, 1,  1, 0,
      1, 0,  0, 1,  1, 1
    ];
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Creates tent stakes around the tent
   */
  private createTentStakes(width: number, depth: number): void {
    const stakeGeometry = new THREE.CylinderGeometry(0.02, 0.015, 0.3, 8);
    const stakeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    
    const stakePositions = [
      [-width/2 - 0.3, 0.05, depth/2 + 0.2],
      [width/2 + 0.3, 0.05, depth/2 + 0.2],
      [-width/2 - 0.3, 0.05, -depth/2 - 0.2],
      [width/2 + 0.3, 0.05, -depth/2 - 0.2],
      [-width/2 - 0.2, 0.05, 0],
      [width/2 + 0.2, 0.05, 0]
    ];
    
    stakePositions.forEach((pos, index) => {
      const stake = new THREE.Mesh(stakeGeometry, stakeMaterial.clone());
      stake.position.set(pos[0], pos[1], pos[2]);
      stake.rotation.z = (Math.random() - 0.5) * 0.3; // Slight random angle
      stake.castShadow = true;
      this.tentGroup.add(stake);
    });
  }

  /**
   * Creates tent ropes connecting to stakes
   */
  private createTentRopes(width: number, height: number, depth: number): void {
    const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    
    // Create guy ropes from tent peak to stakes
    const ropeConnections = [
      { from: [0, height, depth/2], to: [-width/2 - 0.3, 0.25, depth/2 + 0.2] },
      { from: [0, height, depth/2], to: [width/2 + 0.3, 0.25, depth/2 + 0.2] },
      { from: [0, height, -depth/2], to: [-width/2 - 0.3, 0.25, -depth/2 - 0.2] },
      { from: [0, height, -depth/2], to: [width/2 + 0.3, 0.25, -depth/2 - 0.2] }
    ];
    
    ropeConnections.forEach(connection => {
      const start = new THREE.Vector3(...connection.from);
      const end = new THREE.Vector3(...connection.to);
      const distance = start.distanceTo(end);
      
      const ropeGeometry = new THREE.CylinderGeometry(0.01, 0.01, distance, 6);
      const rope = new THREE.Mesh(ropeGeometry, ropeMaterial.clone());
      
      // Position and orient the rope
      rope.position.copy(start.clone().add(end).divideScalar(2));
      rope.lookAt(end);
      rope.rotateX(Math.PI / 2);
      
      this.tentGroup.add(rope);
    });
  }

  /**
   * Creates a random camp tent (either triangular or dome)
   */
  public createRandomCampTent(): THREE.Group {
    const tentColors = [0x8B4513, 0x2F4F2F, 0x556B2F, 0x654321, 0x8B7355];
    const randomColor = tentColors[Math.floor(Math.random() * tentColors.length)];
    
    if (Math.random() < 0.7) {
      // 70% chance for triangular tent
      return this.createTriangularTent(
        2.0 + Math.random() * 1.0,  // width: 2-3
        1.5 + Math.random() * 0.6,  // height: 1.5-2.1
        2.5 + Math.random() * 1.0,  // depth: 2.5-3.5
        randomColor
      );
    } else {
      // 30% chance for dome tent
      return this.createDomeTent(
        1.2 + Math.random() * 0.6,  // radius: 1.2-1.8
        1.0 + Math.random() * 0.4,  // height: 1.0-1.4
        randomColor
      );
    }
  }

  public getGroup(): THREE.Group {
    return this.tentGroup;
  }

  public dispose(): void {
    this.tentGroup.traverse((child) => {
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
    
    console.log(`⛺ [TentComponent] Disposed tent component`);
  }
}