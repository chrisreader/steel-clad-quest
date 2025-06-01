import * as THREE from 'three';
import { BaseBow, WeaponConfig, WeaponStats } from '../BaseBow';

export class HuntingBow extends BaseBow {
  constructor() {
    super({
      id: 'hunting_bow',
      name: 'Hunting Bow',
      type: 'bow',
      handRequirement: 'two-handed',
      stats: {
        damage: 25,
        attackSpeed: 0.8,
        range: 50,
        durability: 80,
        weight: 3
      },
      drawAnimation: {
        duration: 1000,
        phases: {
          windup: 0.3,
          fullDraw: 0.7,
          release: 0.0
        },
        rotations: {
          neutral: { x: 0, y: 0, z: 0 },
          windup: { x: 0, y: 0, z: 0.2 },
          fullDraw: { x: 0, y: 0, z: 0.4 }
        }
      }
    });
  }

  public createMesh(): THREE.Group {
    const bowGroup = new THREE.Group();
    
    // Bow string color
    const stringColor = 0x000000;
    
    // Bow wood color
    const woodColor = 0x8B4513;
    
    // Bow limb
    const limbShape = new THREE.Shape();
    limbShape.moveTo(-0.5, 0);
    limbShape.quadraticCurveTo(-0.4, 0.5, 0, 0.5);
    limbShape.quadraticCurveTo(0.4, 0.5, 0.5, 0);
    limbShape.lineTo(0.5, -0.1);
    limbShape.quadraticCurveTo(0.4, -0.4, 0, -0.4);
    limbShape.quadraticCurveTo(-0.4, -0.4, -0.5, -0.1);
    limbShape.lineTo(-0.5, 0);
    
    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: false
    };
    
    const limbGeometry = new THREE.ExtrudeGeometry(limbShape, extrudeSettings);
    const limbMaterial = new THREE.MeshLambertMaterial({ color: woodColor });
    const limbMesh = new THREE.Mesh(limbGeometry, limbMaterial);
    bowGroup.add(limbMesh);
    
    // Invert and mirror the bow limb
    const invertedLimbMesh = limbMesh.clone();
    invertedLimbMesh.scale.y = -1;
    invertedLimbMesh.position.y = -0.4;
    bowGroup.add(invertedLimbMesh);
    
    // Bow handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: woodColor });
    const handleMesh = new THREE.Mesh(handleGeometry, handleMaterial);
    handleMesh.position.set(0, -0.2, 0);
    bowGroup.add(handleMesh);
    
    // Bow string
    const stringGeometry = new THREE.Geometry();
    stringGeometry.vertices.push(new THREE.Vector3(0, 0.42, 0));
    stringGeometry.vertices.push(new THREE.Vector3(0, -0.42, 0));
    
    const stringMaterial = new THREE.LineBasicMaterial({ color: stringColor });
    const stringMesh = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(stringMesh);
    
    // Adjust bow orientation
    bowGroup.rotation.x = Math.PI / 2;
    bowGroup.position.z = -0.5;
    bowGroup.position.y = 0.3;
    
    return bowGroup;
  }

  public createHitBox(): THREE.Mesh {
    const hitBoxGeometry = new THREE.BoxGeometry(0.5, 0.5, 3);
    const hitBoxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    return new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
  }

  public getBladeReference(): THREE.Mesh {
    return null;
  }
}
