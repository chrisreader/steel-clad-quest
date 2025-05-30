
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
    
    // Create group for the complete gold coin
    const goldGroup = new THREE.Group();
    goldGroup.add(coinMesh);
    
    // Set position
    goldGroup.position.copy(position);
    goldGroup.position.y = position.y + 0.18;
    
    // Enable shadows
    coinMesh.castShadow = true;
    coinMesh.receiveShadow = true;
    edgeMesh.castShadow = true;
    edgeMesh.receiveShadow = true;
    
    return {
      mesh: goldGroup,
      value: value,
      collected: false,
      collectTime: 0,
      collectionRadius: 1.5,
      bobOffset: Math.random() * Math.PI * 2 // Random phase offset for varied bobbing
    };
  }
  
  private addCoinDetails(coinMesh: THREE.Mesh, radius: number): void {
    // Add small decorative elements to make it look more like a coin
    const starGeometry = new THREE.RingGeometry(radius * 0.3, radius * 0.4, 6);
    const starMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffed4e,
      shininess: 150,
      emissive: 0x443300,
      emissiveIntensity: 0.05
    });
    
    // Front star
    const frontStar = new THREE.Mesh(starGeometry, starMaterial);
    frontStar.position.z = 0.026;
    frontStar.rotation.z = Math.PI / 6;
    coinMesh.add(frontStar);
    
    // Back star
    const backStar = new THREE.Mesh(starGeometry, starMaterial.clone());
    backStar.position.z = -0.026;
    backStar.rotation.z = -Math.PI / 6;
    coinMesh.add(backStar);
    
    // Add center dot
    const dotGeometry = new THREE.CylinderGeometry(radius * 0.1, radius * 0.1, 0.01, 8);
    const dotMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffed4e,
      shininess: 200
    });
    
    const frontDot = new THREE.Mesh(dotGeometry, dotMaterial);
    frontDot.position.z = 0.03;
    coinMesh.add(frontDot);
    
    const backDot = new THREE.Mesh(dotGeometry, dotMaterial.clone());
    backDot.position.z = -0.03;
    coinMesh.add(backDot);
  }
  
  public update(deltaTime: number): void {
    if (this.gold.collected) {
      this.updateCollectionAnimation(deltaTime);
      return;
    }
    
    // Update time for animations
    this.time += deltaTime;
    
    // Bobbing animation
    const bobOffset = Math.sin(this.time * this.bobSpeed + this.gold.bobOffset) * this.bobHeight;
    this.gold.mesh.position.y = this.originalY + bobOffset;
    
    // Rotation animation
    this.gold.mesh.rotation.y += this.rotationSpeed * deltaTime;
    
    // Gentle side-to-side sway
    this.gold.mesh.rotation.z = Math.sin(this.time * this.bobSpeed * 0.5 + this.gold.bobOffset) * 0.1;
    
    // Subtle scale pulsing for attraction
    const scalePulse = 1 + Math.sin(this.time * 4) * 0.05;
    this.gold.mesh.scale.setScalar(scalePulse);
  }
  
  private updateCollectionAnimation(deltaTime: number): void {
    const elapsed = Date.now() - this.gold.collectTime;
    const duration = 500; // Animation duration in ms
    
    if (elapsed < duration) {
      const progress = elapsed / duration;
      
      // Scale up and fade out
      const scale = 1 + progress * 2;
      this.gold.mesh.scale.setScalar(scale);
      
      // Move upward
      this.gold.mesh.position.y = this.originalY + progress * 2;
      
      // Fade out
      this.gold.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshPhongMaterial;
          material.transparent = true;
          material.opacity = 1 - progress;
        }
      });
      
      // Spin faster
      this.gold.mesh.rotation.y += this.rotationSpeed * deltaTime * 5;
    }
  }
  
  public checkCollision(playerPosition: THREE.Vector3): boolean {
    if (this.gold.collected) return false;
    
    const distance = this.gold.mesh.position.distanceTo(playerPosition);
    return distance <= this.gold.collectionRadius;
  }
  
  public collect(): number {
    if (this.gold.collected) return 0;
    
    this.gold.collected = true;
    this.gold.collectTime = Date.now();
    
    return this.gold.value;
  }
  
  public isCollected(): boolean {
    return this.gold.collected;
  }
  
  public isReadyForRemoval(): boolean {
    if (!this.gold.collected) return false;
    
    const elapsed = Date.now() - this.gold.collectTime;
    return elapsed > 500; // Remove after animation completes
  }
  
  public getValue(): number {
    return this.gold.value;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.gold.mesh.position.clone();
  }
  
  public getMesh(): THREE.Group {
    return this.gold.mesh;
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
  
  public static createRandomGold(
    scene: THREE.Scene,
    position: THREE.Vector3,
    baseValue: number = 10
  ): Gold {
    // Random value variation (±25%)
    const valueVariation = 0.75 + Math.random() * 0.5;
    const value = Math.round(baseValue * valueVariation);
    
    // Small random position offset
    const offsetPosition = position.clone();
    offsetPosition.x += (Math.random() - 0.5) * 2;
    offsetPosition.z += (Math.random() - 0.5) * 2;
    
    return new Gold(scene, offsetPosition, value);
  }
}
