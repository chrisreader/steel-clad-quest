
import * as THREE from 'three';
import { Gold as GoldInterface } from '../../types/GameTypes';

export class Gold {
  private gold: GoldInterface;
  private scene: THREE.Scene;
  private bobHeight: number = 0.1;
  private bobSpeed: number = 3;
  private rotationSpeed: number = 2;
  private originalY: number = 0;
  private time: number = Math.random() * Math.PI * 2; // Start at random phase
  
  constructor(scene: THREE.Scene, position: THREE.Vector3, value: number = 10) {
    this.scene = scene;
    
    // Create gold coin
    this.gold = this.createGold(position, value);
    
    // Save original Y position for bobbing animation
    this.originalY = position.y + 0.18; // Set initial height
    
    // Add to scene
    scene.add(this.gold.mesh);
  }
  
  private createGold(position: THREE.Vector3, value: number): GoldInterface {
    // Determine size based on value
    const sizeMultiplier = 0.8 + (value / 50) * 0.4; // Larger coins for higher values
    
    // Create coin geometry
    const coinGeometry = new THREE.CylinderGeometry(
      0.18 * sizeMultiplier, // Radius
      0.18 * sizeMultiplier, // Radius
      0.05 * sizeMultiplier, // Height (thin coin)
      16 // Segments
    );
    
    // Create gold material with enhanced properties
    const goldMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffd700,
      shininess: 120,
      specular: 0xfffff0,
      emissive: 0x332200,
      emissiveIntensity: 0.1
    });
    
    // Create coin mesh
    const coinMesh = new THREE.Mesh(coinGeometry, goldMaterial);
    
    // Add edge detail to coin
    const edgeGeometry = new THREE.TorusGeometry(
      0.18 * sizeMultiplier, // Radius
      0.02 * sizeMultiplier, // Tube radius
      8, // Radial segments
      24 // Tubular segments
    );
    const edgeMesh = new THREE.Mesh(edgeGeometry, goldMaterial);
    coinMesh.add(edgeMesh);
    
    // Add coin details
    this.addCoinDetails(coinMesh, 0.18 * sizeMultiplier);
    
    // Set position
    coinMesh.position.copy(position);
    coinMesh.position.y = position.y + 0.18; // Float slightly above ground
    
    // Rotate coin to display properly
    coinMesh.rotation.x = Math.PI / 2;
    
    // Add shadows
    coinMesh.castShadow = true;
    coinMesh.receiveShadow = true;
    
    // Set rotation speed based on value
    const rotSpeed = 1 + (value / 50); // Higher value coins rotate faster
    
    // Return gold interface
    return {
      mesh: coinMesh,
      value: value,
      rotationSpeed: rotSpeed
    };
  }
  
  private addCoinDetails(coinMesh: THREE.Mesh, radius: number): void {
    // Create a texture for the coin face
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Draw gold background
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, 0, size, size);
    
    // Draw coin rim
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw simple crown symbol
    ctx.fillStyle = '#DAA520';
    
    // Crown base
    ctx.fillRect(size/4, size/2 - size/10, size/2, size/5);
    
    // Crown points
    for (let i = 0; i < 3; i++) {
      const x = size/4 + (i * size/6);
      ctx.beginPath();
      ctx.moveTo(x, size/2 - size/10);
      ctx.lineTo(x + size/12, size/2 - size/4);
      ctx.lineTo(x + size/6, size/2 - size/10);
      ctx.fill();
    }
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create coin face details
    const faceGeometry = new THREE.CircleGeometry(radius * 0.9, 16);
    const faceMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      specular: 0xffffff,
      shininess: 100
    });
    
    // Create front face
    const frontFace = new THREE.Mesh(faceGeometry, faceMaterial);
    frontFace.position.set(0, 0, 0.03);
    frontFace.rotation.x = -Math.PI / 2;
    coinMesh.add(frontFace);
    
    // Create back face
    const backFace = new THREE.Mesh(faceGeometry, faceMaterial.clone());
    backFace.position.set(0, 0, -0.03);
    backFace.rotation.x = Math.PI / 2;
    coinMesh.add(backFace);
  }
  
  public update(deltaTime: number): void {
    // Update time
    this.time += deltaTime * this.bobSpeed;
    
    // Bobbing animation
    if (this.gold.mesh) {
      this.gold.mesh.position.y = this.originalY + Math.sin(this.time) * this.bobHeight;
      
      // Spinning animation
      this.gold.mesh.rotation.y += deltaTime * this.rotationSpeed;
    }
  }
  
  public isInRange(playerPosition: THREE.Vector3, range: number): boolean {
    return this.gold.mesh.position.distanceTo(playerPosition) <= range;
  }
  
  public getValue(): number {
    return this.gold.value;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.gold.mesh.position.clone();
  }
  
  public getMesh(): THREE.Mesh {
    return this.gold.mesh;
  }
  
  public static createGoldDrop(
    scene: THREE.Scene, 
    position: THREE.Vector3, 
    baseValue: number = 10,
    randomness: number = 0.5
  ): Gold {
    // Add some randomness to value
    const randomFactor = 1 - randomness + Math.random() * randomness * 2;
    const value = Math.round(baseValue * randomFactor);
    
    // Add some randomness to position
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      0,
      (Math.random() - 0.5) * 0.5
    );
    
    const goldPosition = position.clone().add(randomOffset);
    
    return new Gold(scene, goldPosition, value);
  }
  
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.gold.mesh);
    
    // Dispose geometries and materials
    this.gold.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
