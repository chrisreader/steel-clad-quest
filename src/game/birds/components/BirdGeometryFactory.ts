import * as THREE from 'three';

export class BirdGeometryFactory {
  public static createTaperedFeatherGeometry(baseWidth: number, tipWidth: number, length: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const thickness = 0.002; // Add slight thickness to make feathers visible from all angles
    
    // Create tapered feather shape with thickness - tips pointing backward (negative X direction)
    const vertices = [
      // Bottom face
      // Base (wider) - at wing bone attachment point
      0, -baseWidth/2, -thickness/2,
      0, baseWidth/2, -thickness/2,
      // Tip (narrower) - extending backward from wing bone
      -length, -tipWidth/2, -thickness/2,
      -length, tipWidth/2, -thickness/2,
      
      // Top face
      // Base (wider) - at wing bone attachment point
      0, -baseWidth/2, thickness/2,
      0, baseWidth/2, thickness/2,
      // Tip (narrower) - extending backward from wing bone
      -length, -tipWidth/2, thickness/2,
      -length, tipWidth/2, thickness/2
    ];
    
    const indices = [
      // Bottom face
      0, 1, 2,  1, 3, 2,
      // Top face  
      4, 6, 5,  5, 6, 7,
      // Front edge
      0, 4, 5,  0, 5, 1,
      // Back edge
      2, 3, 7,  2, 7, 6,
      // Left edge
      0, 2, 6,  0, 6, 4,
      // Right edge
      1, 5, 7,  1, 7, 3
    ];
    
    const uvs = [
      // Bottom face
      0, 0,  0, 1,  1, 0,  1, 1,
      // Top face
      0, 0,  0, 1,  1, 0,  1, 1
    ];
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }

  public static createBirdBodyGeometry(): THREE.SphereGeometry {
    const bodyGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    // Scale to create oval bird body proportions (length, height, width)
    bodyGeometry.scale(1.6, 0.9, 1.1);
    return bodyGeometry;
  }

  public static createBirdNeckGeometry(): THREE.CapsuleGeometry {
    const neckGeometry = new THREE.CapsuleGeometry(0.07, 0.22, 8, 12);
    neckGeometry.rotateZ(Math.PI / 2); // Orient along X-axis
    return neckGeometry;
  }

  public static createBirdHeadGeometry(): THREE.SphereGeometry {
    const headGeometry = new THREE.SphereGeometry(0.08, 12, 10);
    headGeometry.scale(1.5, 1.0, 0.9); // Elongated for realistic bird head
    return headGeometry;
  }

  public static createBirdBeakGeometry(): THREE.ConeGeometry {
    return new THREE.ConeGeometry(0.025, 0.12, 6);
  }

  public static createBirdEyeGeometry(): THREE.SphereGeometry {
    return new THREE.SphereGeometry(0.025, 6, 4);
  }

  public static createBirdTailGeometry(): THREE.SphereGeometry {
    const tailGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    tailGeometry.scale(2.0, 0.7, 1.4); // Elongated and flattened crow tail
    
    // Shape tail to flow naturally from body oval
    const tailPositions = tailGeometry.attributes.position;
    for (let i = 0; i < tailPositions.count; i++) {
      const x = tailPositions.getX(i);
      const y = tailPositions.getY(i);
      const z = tailPositions.getZ(i);
      
      // Create natural tail taper that extends from body
      if (x < 0) {
        const tailIntensity = Math.abs(x) / 0.16;
        tailPositions.setY(i, y * (1 - tailIntensity * 0.4)); // Flatten toward tip
        tailPositions.setZ(i, z * (1 + tailIntensity * 0.3)); // Slight fan spread
      }
    }
    tailPositions.needsUpdate = true;
    tailGeometry.computeVertexNormals();
    
    return tailGeometry;
  }
}