
import * as THREE from 'three';

interface SpatialNode {
  bounds: THREE.Box3;
  objects: THREE.Object3D[];
  children: SpatialNode[];
  level: number;
}

export class SpatialIndex {
  private root: SpatialNode;
  private maxObjectsPerNode = 10;
  private maxLevels = 5;

  constructor(worldBounds: THREE.Box3) {
    this.root = {
      bounds: worldBounds.clone(),
      objects: [],
      children: [],
      level: 0
    };
  }

  public insert(object: THREE.Object3D): void {
    if (!object.geometry || !(object as THREE.Mesh).geometry) return;

    const mesh = object as THREE.Mesh;
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }

    if (mesh.geometry.boundingBox) {
      const worldBox = mesh.geometry.boundingBox.clone();
      worldBox.applyMatrix4(object.matrixWorld);
      this.insertIntoNode(this.root, object, worldBox);
    }
  }

  private insertIntoNode(node: SpatialNode, object: THREE.Object3D, bounds: THREE.Box3): void {
    if (node.children.length === 0) {
      node.objects.push(object);

      // Split if necessary
      if (node.objects.length > this.maxObjectsPerNode && node.level < this.maxLevels) {
        this.splitNode(node);
      }
    } else {
      // Insert into appropriate child nodes
      for (const child of node.children) {
        if (child.bounds.intersectsBox(bounds)) {
          this.insertIntoNode(child, object, bounds);
        }
      }
    }
  }

  private splitNode(node: SpatialNode): void {
    const center = node.bounds.getCenter(new THREE.Vector3());
    const size = node.bounds.getSize(new THREE.Vector3());

    // Create 8 child nodes (octree)
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const min = new THREE.Vector3(
            center.x + (x - 0.5) * size.x * 0.5,
            center.y + (y - 0.5) * size.y * 0.5,
            center.z + (z - 0.5) * size.z * 0.5
          );
          const max = new THREE.Vector3(
            min.x + size.x * 0.5,
            min.y + size.y * 0.5,
            min.z + size.z * 0.5
          );

          node.children.push({
            bounds: new THREE.Box3(min, max),
            objects: [],
            children: [],
            level: node.level + 1
          });
        }
      }
    }

    // Redistribute objects to children
    for (const object of node.objects) {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry?.boundingBox) {
        const worldBox = mesh.geometry.boundingBox.clone();
        worldBox.applyMatrix4(object.matrixWorld);

        for (const child of node.children) {
          if (child.bounds.intersectsBox(worldBox)) {
            child.objects.push(object);
          }
        }
      }
    }

    // Clear objects from parent node
    node.objects.length = 0;
  }

  public query(bounds: THREE.Box3): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    this.queryNode(this.root, bounds, result);
    return result;
  }

  private queryNode(node: SpatialNode, bounds: THREE.Box3, result: THREE.Object3D[]): void {
    if (!node.bounds.intersectsBox(bounds)) return;

    // Add objects from this node
    for (const object of node.objects) {
      if (!result.includes(object)) {
        result.push(object);
      }
    }

    // Query children
    for (const child of node.children) {
      this.queryNode(child, bounds, result);
    }
  }

  public clear(): void {
    this.root.objects.length = 0;
    this.root.children.length = 0;
  }
}
