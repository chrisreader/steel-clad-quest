import * as THREE from 'three';
import { BaseBow } from './BaseBow';
import { WeaponConfig } from '../BaseWeapon';

export class HuntingBow extends BaseBow {
  constructor() {
    const config: WeaponConfig = {
      id: 'hunting_bow',
      name: 'Hunting Bow',
      type: 'bow',
      handRequirement: 'two-handed',
      stats: {
        damage: 20,
        attackSpeed: 0.8,
        range: 15,
        durability: 80,
        weight: 2.5
      },
      swingAnimation: {
        duration: 1250,
        phases: {
          windup: 0.4,
          slash: 0.3,
          recovery: 0.3
        },
        rotations: {
          neutral: { x: 0, y: 0, z: 0 },
          windup: { x: -0.1, y: -0.2, z: 0 },
          slash: { x: 0.1, y: 0.2, z: 0 }
        }
      }
    };
    
    super(config);
    console.log('🏹 [HuntingBow] Created two-handed hunting bow');
  }

  public createMesh(): THREE.Group {
    const bowGroup = new THREE.Group();

    // Main bow stave
    const staveGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
    const staveMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const stave = new THREE.Mesh(staveGeometry, staveMaterial);
    stave.rotation.z = Math.PI / 2;
    stave.castShadow = true;
    bowGroup.add(stave);

    // Upper limb
    const upperLimbGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.4, 8);
    const upperLimbMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const upperLimb = new THREE.Mesh(upperLimbGeometry, upperLimbMaterial);
    upperLimb.position.set(0.5, 0, 0);
    upperLimb.rotation.z = Math.PI / 2;
    upperLimb.castShadow = true;
    bowGroup.add(upperLimb);

    // Lower limb
    const lowerLimb = upperLimb.clone();
    lowerLimb.position.set(-0.5, 0, 0);
    bowGroup.add(lowerLimb);

    // Grip
    const gripGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 8);
    const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.rotation.z = Math.PI / 2;
    grip.castShadow = true;
    bowGroup.add(grip);

    // Bowstring
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.7, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.7, 0, 0)
    ]);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const bowstring = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(bowstring);

    return bowGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(1.4, 0.2, 0.2);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0 
    });
    
    const hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
    hitBox.visible = false;
    
    return hitBox;
  }

  public getBladeReference(): THREE.Mesh {
    return this.mesh.children.find(child => 
      child instanceof THREE.Mesh && child.position.x === 0
    ) as THREE.Mesh;
  }

  protected updateBowVisuals(): void {
    // Bow visual updates based on draw stage
    if (!this.mesh.children.length) return;
    
    const bowstring = this.mesh.children.find(child => child instanceof THREE.Line);
    if (bowstring) {
      const pullback = this.chargeLevel * 0.2;
      const positions = [
        new THREE.Vector3(-0.7, 0, 0),
        new THREE.Vector3(0, -pullback, 0),
        new THREE.Vector3(0.7, 0, 0)
      ];
      
      const newGeometry = new THREE.BufferGeometry().setFromPoints(positions);
      (bowstring as THREE.Line).geometry.dispose();
      (bowstring as THREE.Line).geometry = newGeometry;
    }
  }

  protected applyShakeEffect(): void {
    if (!this.mesh || this.shakeIntensity === 0) return;
    
    const shake = {
      x: (Math.random() - 0.5) * this.shakeIntensity,
      y: (Math.random() - 0.5) * this.shakeIntensity,
      z: (Math.random() - 0.5) * this.shakeIntensity
    };
    
    this.mesh.position.add(new THREE.Vector3(shake.x, shake.y, shake.z));
  }
}
