
import * as THREE from 'three';
import { RockVariation } from './RockVariations';

export class RockGeometry {
  static createRockGeometry(variation: RockVariation, shape: string): THREE.BufferGeometry {
    const baseSize = variation.sizeRange.min + Math.random() * (variation.sizeRange.max - variation.sizeRange.min);
    const heightMultiplier = variation.heightMultiplier.min + Math.random() * (variation.heightMultiplier.max - variation.heightMultiplier.min);
    
    let geometry: THREE.BufferGeometry;
    
    switch (shape) {
      case 'angular':
        geometry = this.createAngularRock(baseSize, heightMultiplier);
        break;
      case 'rounded':
        geometry = this.createRoundedRock(baseSize, heightMultiplier);
        break;
      case 'jagged':
        geometry = this.createJaggedRock(baseSize, heightMultiplier);
        break;
      case 'smooth':
        geometry = this.createSmoothRock(baseSize, heightMultiplier);
        break;
      case 'crystalline':
        geometry = this.createCrystallineRock(baseSize, heightMultiplier);
        break;
      case 'weathered':
        geometry = this.createWeatheredRock(baseSize, heightMultiplier);
        break;
      case 'stratified':
        geometry = this.createStratifiedRock(baseSize, heightMultiplier);
        break;
      case 'fractured':
        geometry = this.createFracturedRock(baseSize, heightMultiplier);
        break;
      default:
        geometry = this.createRoundedRock(baseSize, heightMultiplier);
    }
    
    this.applyDeformation(geometry, variation);
    return geometry;
  }

  private static createAngularRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const segments = 6 + Math.floor(Math.random() * 8);
    const geometry = new THREE.ConeGeometry(size, size * heightMultiplier, segments);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      
      const noise = (Math.random() - 0.5) * 0.3;
      position.setXYZ(i, x + noise * size, y, z + noise * size);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createRoundedRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const widthSegments = 8 + Math.floor(Math.random() * 8);
    const heightSegments = 6 + Math.floor(Math.random() * 6);
    const geometry = new THREE.SphereGeometry(size, widthSegments, heightSegments);
    
    geometry.scale(1, heightMultiplier, 1);
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createJaggedRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const geometry = new THREE.IcosahedronGeometry(size, 0);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      const spike = 1 + (Math.random() - 0.5) * 0.8;
      const scale = (spike * size) / length;
      
      position.setXYZ(i, x * scale, y * scale * heightMultiplier, z * scale);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createSmoothRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(size, 16, 12);
    geometry.scale(1, heightMultiplier, 1);
    return geometry;
  }

  private static createCrystallineRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const geometry = new THREE.OctahedronGeometry(size);
    geometry.scale(1, heightMultiplier, 1);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      
      const facet = Math.random() > 0.7 ? 1.2 : 1;
      position.setXYZ(i, x * facet, y, z * facet);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createWeatheredRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(size, 12, 8);
    geometry.scale(1, heightMultiplier * 0.7, 1);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      
      const erosion = 1 - Math.random() * 0.4;
      position.setXYZ(i, x * erosion, y, z * erosion);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createStratifiedRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(size, size * 0.8, size * heightMultiplier, 8, 4);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const layerEffect = Math.sin(y * 10) * 0.1;
      const x = position.getX(i);
      const z = position.getZ(i);
      
      position.setXYZ(i, x + layerEffect, y, z + layerEffect);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private static createFracturedRock(size: number, heightMultiplier: number): THREE.BufferGeometry {
    const geometry = new THREE.DodecahedronGeometry(size);
    geometry.scale(1, heightMultiplier, 1);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const crack = Math.random() > 0.8 ? 0.8 : 1;
      const x = position.getX(i) * crack;
      const y = position.getY(i);
      const z = position.getZ(i) * crack;
      
      position.setXYZ(i, x, y, z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private static applyDeformation(geometry: THREE.BufferGeometry, variation: RockVariation): void {
    const intensity = variation.deformationIntensity.min + 
      Math.random() * (variation.deformationIntensity.max - variation.deformationIntensity.min);
    
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      
      const noise = (Math.random() - 0.5) * intensity;
      position.setXYZ(i, x + noise, y + noise * 0.5, z + noise);
    }
    
    geometry.computeVertexNormals();
  }
}
