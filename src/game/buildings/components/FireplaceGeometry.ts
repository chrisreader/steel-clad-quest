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

    // Organic dirt patch base (replaces circular stone base)
    this.createOrganicDirtPatch();
    
    // Charred logs inside the fire ring
    this.createCharredLogs();
    
    // Ash bed
    this.createAshBed();

    this.scene.add(this.fireplaceGroup);
    console.log(`🏗️ Fireplace structure created with ${this.components.length} components`);
    
    return this.fireplaceGroup;
  }

  private createOrganicDirtPatch(): void {
    // Create irregular, organic dirt patch geometry
    const vertices: THREE.Vector3[] = [];
    const baseRadius = 1.5;
    const vertexCount = 12; // More vertices for smoother organic shape
    
    // Generate irregular vertices in a rough circle with random variations
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      
      // Add randomness to radius (0.7 to 1.3 times base radius)
      const radiusVariation = baseRadius * (0.7 + Math.random() * 0.6);
      
      // Add angular offset for more organic shape
      const angleOffset = (Math.random() - 0.5) * 0.4;
      const finalAngle = angle + angleOffset;
      
      const x = Math.cos(finalAngle) * radiusVariation;
      const z = Math.sin(finalAngle) * radiusVariation;
      
      // Add slight height variation for uneven ground
      const y = (Math.random() - 0.5) * 0.03;
      
      vertices.push(new THREE.Vector3(x, y, z));
    }
    
    // Create geometry from vertices using triangulation
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    
    // Add center vertex for triangulation
    const centerY = (Math.random() - 0.5) * 0.02;
    vertices.push(new THREE.Vector3(0, centerY, 0));
    const centerIndex = vertices.length - 1;
    
    // Convert vertices to position array
    for (const vertex of vertices) {
      positions.push(vertex.x, vertex.y, vertex.z);
    }
    
    // Create triangular faces from center to edge vertices
    for (let i = 0; i < vertexCount; i++) {
      const next = (i + 1) % vertexCount;
      
      // Triangle from center to edge
      indices.push(centerIndex, i, next);
    }
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    // Create realistic dirt material
    const dirtMaterial = new THREE.MeshLambertMaterial({
      color: 0x4A3728, // Dark brown earth color
      map: this.createDirtTexture(),
      roughness: 0.9
    });

    const dirtPatch = new THREE.Mesh(geometry, dirtMaterial);
    dirtPatch.position.set(0, 0.01, 0); // Slightly above ground
    dirtPatch.castShadow = false;
    dirtPatch.receiveShadow = true;

    this.components.push(dirtPatch);
    this.fireplaceGroup.add(dirtPatch);
    
    console.log('🏗️ Organic dirt patch base created with irregular shape');
  }

  private createDirtTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base dirt color - dark brown
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add dirt variations and organic texture
    const dirtPatches = 80;
    for (let i = 0; i < dirtPatches; i++) {
      const brightness = 0.3 + Math.random() * 0.4;
      const earthTone = Math.random() * 40 + 20; // Brown variations
      ctx.fillStyle = `rgba(${earthTone + 30}, ${earthTone + 10}, ${earthTone}, ${brightness})`;
      
      const size = Math.random() * 12 + 4;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add small charred spots from previous fires
    const charredSpots = 15;
    for (let i = 0; i < charredSpots; i++) {
      ctx.fillStyle = `rgba(20, 15, 10, ${0.6 + Math.random() * 0.3})`;
      
      const size = Math.random() * 6 + 2;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add tiny debris (twigs, small stones)
    const debris = 25;
    for (let i = 0; i < debris; i++) {
      const debrisColor = Math.random() > 0.7 ? '#555555' : '#654321'; // Stones or twigs
      ctx.fillStyle = debrisColor;
      
      const width = Math.random() * 3 + 1;
      const height = Math.random() * 8 + 2;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const rotation = Math.random() * Math.PI * 2;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillRect(-width/2, -height/2, width, height);
      ctx.restore();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2); // Tile the texture for more detail
    
    return texture;
  }

  private createCharredLogs(): void {
    const logMaterial = new THREE.MeshLambertMaterial({
      color: 0x2F1B14, // Dark charred brown
      map: TextureGenerator.createWoodTexture()
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
