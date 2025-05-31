import * as THREE from 'three';
import { Entity } from '../engine/Entity';
import { Terrain } from '../terrain/Terrain';

export class Player extends Entity {
  public mesh: THREE.Group;
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  
  private moveSpeed: number = 2.5;
  private isGrounded: boolean = false;
  private velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private gravity: number = -9.8;
  private jumpForce: number = 5;
  
  private terrain: Terrain;
  
  constructor(scene: THREE.Scene, terrain: Terrain, startPosition: THREE.Vector3) {
    super(scene);
    this.terrain = terrain;
    this.createPlayerMesh();
    this.setPosition(startPosition.x, startPosition.y, startPosition.z);
    this.addToScene();
    
    console.log("👤 [Player] Spawned at:", this.position);
  }
  
  private createPlayerMesh(): void {
    console.log("👤 [Player] Creating player mesh...");
    
    this.mesh = new THREE.Group();
    
    // Body (torso) - lowered from y=0.35 to y=0.32 to create more clearance
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.set(0, 0.32, 0); // Lowered from 0.35 to 0.32
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);
    
    // Head - will be made invisible in first-person
    const headGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAE }); // Skin tone
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.set(0, 0.85, 0);
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.mesh.add(this.head);
    
    // Left Arm - positioned at realistic shoulder height
    const leftArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftArmMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAE }); // Skin tone
    this.leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    this.leftArm.position.set(-0.3, 0.55, 0); // Arms at shoulder height relative to lowered torso
    this.leftArm.castShadow = true;
    this.leftArm.receiveShadow = true;
    this.mesh.add(this.leftArm);
    
    // Right Arm - positioned at realistic shoulder height  
    const rightArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const rightArmMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAE }); // Skin tone
    this.rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    this.rightArm.position.set(0.3, 0.55, 0); // Arms at shoulder height relative to lowered torso
    this.rightArm.castShadow = true;
    this.rightArm.receiveShadow = true;
    this.mesh.add(this.rightArm);
    
    // Left Leg
    const leftLegGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftLegMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Tan
    this.leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    this.leftLeg.position.set(-0.2, -0.35, 0);
    this.leftLeg.castShadow = true;
    this.leftLeg.receiveShadow = true;
    this.mesh.add(this.leftLeg);
    
    // Right Leg
    const rightLegGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const rightLegMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Tan
    this.rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    this.rightLeg.position.set(0.2, -0.35, 0);
    this.rightLeg.castShadow = true;
    this.rightLeg.receiveShadow = true;
    this.mesh.add(this.rightLeg);
    
    // Debug: Show player's bounding box
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    console.log("👤 [Player] Bounding box size:", size);
    
    console.log("👤 [Player] Player mesh created with optimized positioning for first-person view");
  }
  
  public update(deltaTime: number, moveDirection: THREE.Vector3): void {
    this.updateMovement(deltaTime, moveDirection);
  }
  
  private updateMovement(deltaTime: number, moveDirection: THREE.Vector3): void {
    // Ground check
    this.isGrounded = this.checkIfGrounded();
    
    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * deltaTime;
    } else {
      this.velocity.y = Math.max(0, this.velocity.y); // Reset velocity when grounded
    }
    
    // Jumping
    if (this.isGrounded && moveDirection.y > 0) {
      this.velocity.y = this.jumpForce;
    }
    
    // Lateral movement
    let scaledMoveDirection = new THREE.Vector3(moveDirection.x, 0, moveDirection.z).normalize().multiplyScalar(this.moveSpeed * deltaTime);
    
    // Apply movement
    this.velocity.x = scaledMoveDirection.x;
    this.velocity.z = scaledMoveDirection.z;
    
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z;
    
    // Terrain collision
    this.position.y = Math.max(this.position.y, this.terrain.getHeightAt(this.position.x, this.position.z) + 0.4);
    
    // Reset isGrounded if player is on the ground
    if (Math.abs(this.position.y - (this.terrain.getHeightAt(this.position.x, this.position.z) + 0.4)) < 0.001) {
      this.isGrounded = true;
    }
    
    this.mesh.position.copy(this.position);
  }
  
  private checkIfGrounded(): boolean {
    // Raycast downwards to check for ground
    const raycaster = new THREE.Raycaster(this.position, new THREE.Vector3(0, -1, 0), 0, 0.5);
    const intersects = raycaster.intersectObject(this.terrain.mesh);
    return intersects.length > 0;
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public getMesh(): THREE.Group {
    return this.mesh;
  }
  
  public setVisible(visible: boolean): void {
    this.head.visible = visible;
  }
}
