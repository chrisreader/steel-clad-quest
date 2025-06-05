
import * as THREE from 'three';
import { RockVariation } from './RockVariations';

export class RockFeatures {
  static addSurfaceFeatures(rockMesh: THREE.Mesh, variation: RockVariation, shape: string): void {
    const featureGroup = new THREE.Group();
    
    // Add features based on rock size and type
    if (variation.sizeRange.max > 1.0) {
      this.addCracks(featureGroup, rockMesh, variation);
      this.addMoss(featureGroup, rockMesh, variation);
    }
    
    if (variation.sizeRange.max > 2.0) {
      this.addLichen(featureGroup, rockMesh, variation);
      this.addDebris(featureGroup, rockMesh, variation);
    }
    
    if (featureGroup.children.length > 0) {
      rockMesh.add(featureGroup);
    }
  }

  private static addCracks(group: THREE.Group, rockMesh: THREE.Mesh, variation: RockVariation): void {
    const crackCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < crackCount; i++) {
      const crackGeometry = new THREE.PlaneGeometry(0.1, variation.sizeRange.max * 0.5);
      const crackMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.8
      });
      
      const crack = new THREE.Mesh(crackGeometry, crackMaterial);
      crack.position.set(
        (Math.random() - 0.5) * variation.sizeRange.max,
        Math.random() * variation.sizeRange.max * 0.5,
        (Math.random() - 0.5) * variation.sizeRange.max
      );
      crack.rotation.y = Math.random() * Math.PI * 2;
      crack.rotation.z = (Math.random() - 0.5) * Math.PI * 0.5;
      
      group.add(crack);
    }
  }

  private static addMoss(group: THREE.Group, rockMesh: THREE.Mesh, variation: RockVariation): void {
    if (Math.random() > 0.6) return;
    
    const mossCount = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < mossCount; i++) {
      const mossGeometry = new THREE.SphereGeometry(0.05, 6, 4);
      const mossMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5a2d,
        roughness: 1.0
      });
      
      const moss = new THREE.Mesh(mossGeometry, mossMaterial);
      
      // Position moss on lower parts of the rock
      const angle = Math.random() * Math.PI * 2;
      const radius = variation.sizeRange.max * 0.8;
      moss.position.set(
        Math.cos(angle) * radius,
        -variation.sizeRange.max * 0.3 + Math.random() * variation.sizeRange.max * 0.2,
        Math.sin(angle) * radius
      );
      
      group.add(moss);
    }
  }

  private static addLichen(group: THREE.Group, rockMesh: THREE.Mesh, variation: RockVariation): void {
    if (Math.random() > 0.4) return;
    
    const lichenCount = Math.floor(Math.random() * 6) + 2;
    
    for (let i = 0; i < lichenCount; i++) {
      const lichenGeometry = new THREE.CircleGeometry(0.1, 6);
      const lichenMaterial = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x8FBC8F : 0xF0E68C,
        transparent: true,
        opacity: 0.7
      });
      
      const lichen = new THREE.Mesh(lichenGeometry, lichenMaterial);
      
      // Position lichen on rock surface
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * Math.PI;
      const radius = variation.sizeRange.max * 0.9;
      
      lichen.position.set(
        Math.cos(angle) * Math.sin(height) * radius,
        Math.cos(height) * radius,
        Math.sin(angle) * Math.sin(height) * radius
      );
      
      lichen.lookAt(lichen.position.clone().multiplyScalar(2));
      
      group.add(lichen);
    }
  }

  private static addDebris(group: THREE.Group, rockMesh: THREE.Mesh, variation: RockVariation): void {
    if (Math.random() > 0.3) return;
    
    const debrisCount = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = Math.random() * 0.05 + 0.02;
      const debrisGeometry = new THREE.SphereGeometry(debrisSize, 4, 3);
      const debrisMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.9
      });
      
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Scatter debris around the base of the rock
      const angle = Math.random() * Math.PI * 2;
      const distance = variation.sizeRange.max + Math.random() * variation.sizeRange.max * 0.5;
      
      debris.position.set(
        Math.cos(angle) * distance,
        -variation.sizeRange.max * 0.5 + Math.random() * 0.1,
        Math.sin(angle) * distance
      );
      
      group.add(debris);
    }
  }

  static addWeathering(rockMesh: THREE.Mesh, variation: RockVariation): void {
    // Apply weathering effects based on rock age and exposure
    const weatheringIntensity = Math.random();
    
    if (weatheringIntensity > 0.7) {
      this.addSedimentAccumulation(rockMesh, variation);
    }
    
    if (weatheringIntensity > 0.5) {
      this.addColorVariation(rockMesh, variation);
    }
  }

  private static addSedimentAccumulation(rockMesh: THREE.Mesh, variation: RockVariation): void {
    const sedimentGeometry = new THREE.RingGeometry(
      variation.sizeRange.max * 0.8,
      variation.sizeRange.max * 1.2,
      8
    );
    const sedimentMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B7765,
      transparent: true,
      opacity: 0.6
    });
    
    const sediment = new THREE.Mesh(sedimentGeometry, sedimentMaterial);
    sediment.rotation.x = -Math.PI / 2;
    sediment.position.y = -variation.sizeRange.max * 0.5;
    
    rockMesh.add(sediment);
  }

  private static addColorVariation(rockMesh: THREE.Mesh, variation: RockVariation): void {
    // Add color variation through material modification
    const material = rockMesh.material as THREE.MeshStandardMaterial;
    if (material && material.color) {
      const hsl = { h: 0, s: 0, l: 0 };
      material.color.getHSL(hsl);
      
      // Slightly vary the color
      hsl.h += (Math.random() - 0.5) * 0.1;
      hsl.s += (Math.random() - 0.5) * 0.2;
      hsl.l += (Math.random() - 0.5) * 0.1;
      
      material.color.setHSL(hsl.h, Math.max(0, hsl.s), Math.max(0, Math.min(1, hsl.l)));
    }
  }
}
