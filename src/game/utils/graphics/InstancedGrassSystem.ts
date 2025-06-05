
import * as THREE from 'three';

export interface GrassInstanceData {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: number;
  bendAngle: number;
  color: THREE.Color;
}

export class InstancedGrassSystem {
  private scene: THREE.Scene;
  private grassMesh: THREE.InstancedMesh | null = null;
  private instances: GrassInstanceData[] = [];
  private maxInstances: number = 5000;
  private grassGeometry: THREE.BufferGeometry;
  private grassMaterial: THREE.MeshLambertMaterial;
  private windTime: number = 0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.grassGeometry = this.createGrassBladeGeometry();
    this.grassMaterial = this.createGrassMaterial();
    this.setupInstancedMesh();
  }
  
  private createGrassBladeGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    
    // Create a simple grass blade shape
    const vertices = new Float32Array([
      // Bottom triangle
      0, 0, 0,
      -0.1, 0, 0,
      0.1, 0, 0,
      
      // Middle section
      -0.05, 0.3, 0,
      0.05, 0.3, 0,
      
      // Top point
      0, 0.6, 0
    ]);
    
    const indices = new Uint16Array([
      // Bottom triangle
      0, 1, 2,
      
      // Middle quad (2 triangles)
      1, 3, 2,
      2, 3, 4,
      
      // Top triangle
      3, 5, 4
    ]);
    
    const uvs = new Float32Array([
      // Bottom
      0.5, 0,
      0, 0,
      1, 0,
      
      // Middle
      0, 0.5,
      1, 0.5,
      
      // Top
      0.5, 1
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  private createGrassMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      color: 0x4A7C59,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.1,
      vertexColors: true
    });
  }
  
  private setupInstancedMesh(): void {
    this.grassMesh = new THREE.InstancedMesh(
      this.grassGeometry,
      this.grassMaterial,
      this.maxInstances
    );
    
    this.grassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.grassMesh.castShadow = true;
    this.grassMesh.receiveShadow = false;
    
    this.scene.add(this.grassMesh);
  }
  
  public generateGrassInArea(
    center: THREE.Vector3,
    radius: number,
    density: number = 0.8,
    worn: boolean = false
  ): void {
    this.instances = [];
    
    const actualDensity = worn ? density * 0.4 : density;
    const grassCount = Math.floor(actualDensity * this.maxInstances);
    
    for (let i = 0; i < grassCount; i++) {
      // Random position within radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;
      
      // Skip worn areas (simplified - could be more sophisticated)
      if (worn && Math.random() < 0.6) continue;
      
      const instance: GrassInstanceData = {
        position: new THREE.Vector3(x, center.y, z),
        scale: new THREE.Vector3(
          0.8 + Math.random() * 0.6,
          0.8 + Math.random() * 0.8,
          0.8 + Math.random() * 0.6
        ),
        rotation: Math.random() * Math.PI * 2,
        bendAngle: (Math.random() - 0.5) * 0.3,
        color: new THREE.Color().setHSL(
          0.25 + (Math.random() - 0.5) * 0.1, // Green hue variation
          0.6 + Math.random() * 0.3,           // Saturation
          0.3 + Math.random() * 0.4            // Lightness
        )
      };
      
      this.instances.push(instance);
    }
    
    this.updateInstancedMesh();
  }
  
  private updateInstancedMesh(): void {
    if (!this.grassMesh) return;
    
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    
    // Set up color attribute if not exists
    if (!this.grassMesh.geometry.attributes.color) {
      const colors = new Float32Array(this.instances.length * 3);
      this.grassMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[i];
      
      // Create transformation matrix
      matrix.makeRotationY(instance.rotation);
      matrix.setPosition(instance.position);
      matrix.scale(instance.scale);
      
      this.grassMesh.setMatrixAt(i, matrix);
      this.grassMesh.setColorAt(i, instance.color);
    }
    
    this.grassMesh.instanceMatrix.needsUpdate = true;
    if (this.grassMesh.instanceColor) {
      this.grassMesh.instanceColor.needsUpdate = true;
    }
    
    // Set the count for rendering
    this.grassMesh.count = this.instances.length;
    
    console.log(`Generated ${this.instances.length} grass instances`);
  }
  
  public update(deltaTime: number, windStrength: number = 0.5): void {
    if (!this.grassMesh || this.instances.length === 0) return;
    
    this.windTime += deltaTime * 2;
    
    const matrix = new THREE.Matrix4();
    
    for (let i = 0; i < this.instances.length; i++) {
      const instance = this.instances[i];
      
      // Calculate wind sway
      const windOffset = Math.sin(this.windTime + instance.position.x * 0.1 + instance.position.z * 0.1) * windStrength * 0.1;
      const swayRotation = instance.rotation + windOffset;
      
      // Apply wind bend
      matrix.makeRotationY(swayRotation);
      matrix.setPosition(instance.position);
      matrix.scale(instance.scale);
      
      this.grassMesh.setMatrixAt(i, matrix);
    }
    
    this.grassMesh.instanceMatrix.needsUpdate = true;
  }
  
  public dispose(): void {
    if (this.grassMesh) {
      this.scene.remove(this.grassMesh);
      this.grassMesh.dispose();
    }
    
    this.grassGeometry.dispose();
    this.grassMaterial.dispose();
    this.instances = [];
  }
  
  public setVisibility(visible: boolean): void {
    if (this.grassMesh) {
      this.grassMesh.visible = visible;
    }
  }
  
  public getInstanceCount(): number {
    return this.instances.length;
  }
}
