
import * as THREE from 'three';

export class PlayerBody {
  private group: THREE.Group;
  private bodyParts: { [key: string]: THREE.Mesh } = {};
  private weaponMount: THREE.Group;

  constructor(parentGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.weaponMount = new THREE.Group();
    
    this.createBodyParts();
    parentGroup.add(this.group);
    
    console.log("🧍 [PlayerBody] Created with enhanced arm positioning");
  }

  private createBodyParts(): void {
    // Create simple body representation
    const bodyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    this.bodyParts.torso = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyParts.torso.position.set(0, 0.6, 0);
    this.group.add(this.bodyParts.torso);

    // Create head
    const headGeometry = new THREE.SphereGeometry(0.2);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    this.bodyParts.head = new THREE.Mesh(headGeometry, headMaterial);
    this.bodyParts.head.position.set(0, 1.4, 0);
    this.group.add(this.bodyParts.head);

    // Create arms
    const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    
    this.bodyParts.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.bodyParts.leftArm.position.set(-0.5, 0.4, 0);
    this.group.add(this.bodyParts.leftArm);

    this.bodyParts.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.bodyParts.rightArm.position.set(0.5, 0.4, 0);
    this.group.add(this.bodyParts.rightArm);

    // Add weapon mount to right arm
    this.weaponMount.position.set(0.5, 0.2, 0.3);
    this.group.add(this.weaponMount);
  }

  public attachWeapon(weaponMesh: THREE.Group): void {
    this.weaponMount.clear();
    this.weaponMount.add(weaponMesh);
  }

  public detachWeapon(): void {
    this.weaponMount.clear();
  }

  public startWindup(duration: number): void {
    // Simple animation placeholder
    console.log("🗡️ [PlayerBody] Starting windup animation");
  }

  public startSlash(duration: number): void {
    // Simple animation placeholder
    console.log("🗡️ [PlayerBody] Starting slash animation");
  }

  public startRecovery(duration: number): void {
    // Simple animation placeholder
    console.log("🗡️ [PlayerBody] Starting recovery animation");
  }

  public startBowDraw(): void {
    // Simple animation placeholder
    console.log("🏹 [PlayerBody] Starting bow draw animation");
  }

  public stopBowDraw(): void {
    // Simple animation placeholder
    console.log("🏹 [PlayerBody] Stopping bow draw animation");
  }

  public update(deltaTime: number, yaw: number, pitch: number, isSprinting: boolean, isMoving: boolean): void {
    // Update body animations based on state
    if (this.bodyParts.head) {
      this.bodyParts.head.rotation.y = yaw;
      this.bodyParts.head.rotation.x = pitch * 0.5; // Limit head pitch
    }
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
