
import * as THREE from 'three';

export type DramaticShapeType = 'tallObelisk' | 'stackedChunk' | 'boulder' | 'splitSlab' | 'coneFracture';

export interface DramaticShapeConfig {
  type: DramaticShapeType;
  weight: number;
}

export const DRAMATIC_SHAPE_TYPES: DramaticShapeConfig[] = [
  { type: 'tallObelisk', weight: 25 },
  { type: 'stackedChunk', weight: 30 },
  { type: 'boulder', weight: 20 },
  { type: 'splitSlab', weight: 15 },
  { type: 'coneFracture', weight: 10 }
];

export class DramaticRockShapeGenerator {
  private static r(): number {
    return Math.random();
  }

  /**
   * Choose weighted random shape type
   */
  public static chooseWeightedShapeType(): DramaticShapeType {
    const totalWeight = DRAMATIC_SHAPE_TYPES.reduce((sum, shape) => sum + shape.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const shape of DRAMATIC_SHAPE_TYPES) {
      if (random < shape.weight) {
        return shape.type;
      }
      random -= shape.weight;
    }
    
    return 'boulder'; // fallback
  }

  /**
   * Generate dramatic shape geometry based on type
   */
  public static generateDramaticShapeGeometry(shapeType: DramaticShapeType, rockSize: number): THREE.BufferGeometry {
    switch (shapeType) {
      case 'tallObelisk':
        return this.createTallObeliskGeometry(rockSize);
      case 'stackedChunk':
        return this.createStackedChunkGeometry(rockSize);
      case 'boulder':
        return this.createBoulderGeometry(rockSize);
      case 'splitSlab':
        return this.createSplitSlabGeometry(rockSize);
      case 'coneFracture':
        return this.createConeFractureGeometry(rockSize);
      default:
        return this.createBoulderGeometry(rockSize);
    }
  }

  /**
   * Create tall obelisk (spire) geometry
   */
  private static createTallObeliskGeometry(rockSize: number): THREE.BufferGeometry {
    const baseRadius = (0.2 + this.r() * 0.2) * rockSize;
    const topRadius = (0.05 + this.r() * 0.1) * rockSize;
    const height = (2 + this.r() * 1.2) * rockSize;
    
    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, 8);
    
    // Apply scaling for organic variation
    geometry.scale(1 + this.r() * 0.4, 1, 1 + this.r() * 0.4);
    
    console.log(`🗿 Created tall obelisk: height=${height.toFixed(1)}, baseRadius=${baseRadius.toFixed(1)}`);
    
    return geometry;
  }

  /**
   * Create stacked chunk geometry (layered blocks)
   */
  private static createStackedChunkGeometry(rockSize: number): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    
    for (let j = 0; j < 3; j++) {
      const slabWidth = 0.6 * rockSize;
      const slabHeight = (0.2 + this.r() * 0.1) * rockSize;
      const slabDepth = 0.6 * rockSize;
      
      const slab = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth);
      
      // Translate each slab vertically
      const yOffset = j * 0.25 * rockSize + this.r() * 0.05 * rockSize;
      slab.translate(0, yOffset, 0);
      
      geometries.push(slab);
    }
    
    // Merge all slabs into one geometry
    const mergedGeometry = new THREE.BufferGeometry();
    const mergedPositions: number[] = [];
    const mergedIndices: number[] = [];
    let indexOffset = 0;
    
    geometries.forEach(geo => {
      const positions = geo.attributes.position.array as Float32Array;
      const indices = geo.index?.array as Uint16Array;
      
      // Add positions
      for (let i = 0; i < positions.length; i++) {
        mergedPositions.push(positions[i]);
      }
      
      // Add indices with offset
      if (indices) {
        for (let i = 0; i < indices.length; i++) {
          mergedIndices.push(indices[i] + indexOffset);
        }
        indexOffset += positions.length / 3;
      }
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
    mergedGeometry.setIndex(mergedIndices);
    mergedGeometry.computeVertexNormals();
    
    console.log(`🧱 Created stacked chunk with 3 layers`);
    
    return mergedGeometry;
  }

  /**
   * Create boulder geometry with organic noise
   */
  private static createBoulderGeometry(rockSize: number): THREE.BufferGeometry {
    const radius = (0.8 + this.r() * 0.3) * rockSize;
    const geometry = new THREE.SphereGeometry(radius, 10, 8);
    
    this.applyOrganicNoise(geometry, 0.2 * rockSize);
    
    console.log(`🪨 Created boulder: radius=${radius.toFixed(1)}`);
    
    return geometry;
  }

  /**
   * Create split slab geometry
   */
  private static createSplitSlabGeometry(rockSize: number): THREE.BufferGeometry {
    const width = 0.4 * rockSize;
    const height = 1.6 * rockSize;
    const depth = 0.3 * rockSize;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.rotateY(Math.PI / 4 + this.r() * 0.2);
    
    this.applyOrganicNoise(geometry, 0.12 * rockSize);
    
    console.log(`🪓 Created split slab: ${width.toFixed(1)}x${height.toFixed(1)}x${depth.toFixed(1)}`);
    
    return geometry;
  }

  /**
   * Create cone fracture geometry
   */
  private static createConeFractureGeometry(rockSize: number): THREE.BufferGeometry {
    const radius = (0.3 + this.r() * 0.2) * rockSize;
    const height = (1.4 + this.r() * 0.6) * rockSize;
    
    const geometry = new THREE.ConeGeometry(radius, height, 6);
    geometry.rotateX(Math.PI * 0.1 * this.r());
    geometry.rotateY(Math.PI * 2 * this.r());
    
    console.log(`🌀 Created cone fracture: radius=${radius.toFixed(1)}, height=${height.toFixed(1)}`);
    
    return geometry;
  }

  /**
   * Apply organic noise to geometry for natural variation
   */
  public static applyOrganicNoise(geometry: THREE.BufferGeometry, intensity: number = 0.1): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len === 0) continue;
      
      const nX = x / len;
      const nY = y / len;
      const nZ = z / len;
      
      const offset = Math.sin(x * 8) * Math.cos(z * 6) * intensity;
      
      positions[i] += nX * offset;
      positions[i + 1] += nY * offset;
      positions[i + 2] += nZ * offset;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Create vertical stacking for dramatic formations
   */
  public static createVerticalStack(
    baseRock: THREE.Object3D,
    rockGroup: THREE.Group,
    rockSize: number,
    material: THREE.Material
  ): void {
    // 30% chance to stack another rock on top
    if (Math.random() < 0.3) {
      const stackShapeType = this.chooseWeightedShapeType();
      const topGeometry = this.generateDramaticShapeGeometry(stackShapeType, rockSize);
      const topRock = new THREE.Mesh(topGeometry, material.clone());
      
      // Scale the top rock smaller
      const stackScale = 0.7 + this.r() * 0.3;
      topRock.scale.multiplyScalar(stackScale);
      
      // Calculate base height for positioning
      const baseBoundingBox = new THREE.Box3().setFromObject(baseRock);
      const baseHeight = baseBoundingBox.max.y - baseBoundingBox.min.y;
      
      // Position the stacked rock
      topRock.position.set(
        baseRock.position.x + (this.r() - 0.5) * 0.6 * rockSize,
        baseRock.position.y + baseHeight * 0.8 + this.r() * 0.4 * rockSize,
        baseRock.position.z + (this.r() - 0.5) * 0.6 * rockSize
      );
      
      // Random rotation
      topRock.rotation.y = this.r() * Math.PI * 2;
      topRock.rotation.x = (this.r() - 0.5) * 0.3;
      topRock.rotation.z = (this.r() - 0.5) * 0.3;
      
      // Set shadow properties
      topRock.castShadow = true;
      topRock.receiveShadow = true;
      
      // Add metadata
      topRock.userData = {
        type: 'rock',
        isStacked: true,
        shapeType: stackShapeType,
        originalSize: rockSize * stackScale
      };
      
      rockGroup.add(topRock);
      
      console.log(`🏗️ Created vertical stack: ${stackShapeType} on top of base rock`);
    }
  }

  /**
   * Get the estimated height of a dramatic shape
   */
  public static getShapeHeight(shapeType: DramaticShapeType, rockSize: number): number {
    switch (shapeType) {
      case 'tallObelisk':
        return (2 + Math.random() * 1.2) * rockSize;
      case 'stackedChunk':
        return 0.75 * rockSize; // 3 layers * 0.25
      case 'splitSlab':
        return 1.6 * rockSize;
      case 'coneFracture':
        return (1.4 + Math.random() * 0.6) * rockSize;
      case 'boulder':
      default:
        return (0.8 + Math.random() * 0.3) * rockSize * 2; // diameter
    }
  }
}
