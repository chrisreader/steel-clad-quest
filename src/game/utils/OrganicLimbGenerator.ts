
import * as THREE from 'three';

export interface LimbProfile {
  segments: number;
  length: number;
  baseRadius: number;
  midRadius: number;
  endRadius: number;
  curvature: number;
  muscleBulge: number;
}

export class OrganicLimbGenerator {
  /**
   * Creates a muscular upper arm with bicep/tricep definition
   */
  public static createMuscularUpperArm(length: number = 1.1): THREE.BufferGeometry {
    const profile: LimbProfile = {
      segments: 32,
      length,
      baseRadius: 0.22,  // Shoulder attachment
      midRadius: 0.28,   // Bicep bulge
      endRadius: 0.18,   // Elbow attachment
      curvature: 0.15,
      muscleBulge: 0.06
    };
    
    return this.createCurvedMuscularLimb(profile);
  }

  /**
   * Creates a forearm with natural taper and slight curve
   */
  public static createMuscularForearm(length: number = 0.9): THREE.BufferGeometry {
    const profile: LimbProfile = {
      segments: 28,
      length,
      baseRadius: 0.18,  // Elbow attachment
      midRadius: 0.16,   // Slight muscle definition
      endRadius: 0.14,   // Wrist attachment
      curvature: 0.08,
      muscleBulge: 0.03
    };
    
    return this.createCurvedMuscularLimb(profile);
  }

  /**
   * Creates a muscular thigh with quadriceps definition
   */
  public static createMuscularThigh(length: number = 0.7): THREE.BufferGeometry {
    const profile: LimbProfile = {
      segments: 36,
      length,
      baseRadius: 0.26,  // Hip attachment
      midRadius: 0.32,   // Quadriceps bulge
      endRadius: 0.22,   // Knee attachment
      curvature: 0.12,
      muscleBulge: 0.08
    };
    
    return this.createCurvedMuscularLimb(profile);
  }

  /**
   * Creates a calf with pronounced muscle definition
   */
  public static createMuscularCalf(length: number = 0.65): THREE.BufferGeometry {
    const profile: LimbProfile = {
      segments: 32,
      length,
      baseRadius: 0.20,  // Knee attachment
      midRadius: 0.24,   // Calf muscle bulge
      endRadius: 0.16,   // Ankle attachment
      curvature: 0.10,
      muscleBulge: 0.05
    };
    
    return this.createCurvedMuscularLimb(profile);
  }

  /**
   * Core function to create curved muscular limbs with organic shape
   */
  private static createCurvedMuscularLimb(profile: LimbProfile): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(1, 1, profile.length, profile.segments, 16);
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;

    // Apply organic shaping to each vertex
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Normalize Y position from -0.5 to 0.5 to 0 to 1
      const normalizedY = (y / profile.length) + 0.5;
      
      // Calculate radius variation along the length
      let radiusMultiplier: number;
      if (normalizedY < 0.5) {
        // Interpolate from base to mid
        const t = normalizedY * 2;
        radiusMultiplier = THREE.MathUtils.lerp(profile.baseRadius, profile.midRadius, t);
      } else {
        // Interpolate from mid to end
        const t = (normalizedY - 0.5) * 2;
        radiusMultiplier = THREE.MathUtils.lerp(profile.midRadius, profile.endRadius, t);
      }

      // Add muscle bulge based on angle around the limb
      const angle = Math.atan2(z, x);
      const muscleBulge = Math.cos(angle * 2) * profile.muscleBulge * 
                         Math.sin(normalizedY * Math.PI); // Peak bulge in middle

      // Add natural curvature
      const curveBend = Math.sin(normalizedY * Math.PI) * profile.curvature;
      
      // Apply the transformations
      const distance = Math.sqrt(x * x + z * z);
      const finalRadius = (radiusMultiplier + muscleBulge) * distance;
      
      positions[i] = (x / distance) * finalRadius + curveBend;
      positions[i + 2] = (z / distance) * finalRadius;
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  /**
   * Creates enhanced muscle texture with normal mapping
   */
  public static createMuscleTexture(baseColor: number): THREE.MeshPhongMaterial {
    // Create a simple muscle texture pattern
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create muscle fiber pattern
    const color = new THREE.Color(baseColor);
    ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    ctx.fillRect(0, 0, 512, 512);

    // Add muscle definition lines
    ctx.strokeStyle = `rgba(${Math.floor(color.r * 200)}, ${Math.floor(color.g * 200)}, ${Math.floor(color.b * 200)}, 0.3)`;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, 0);
      ctx.quadraticCurveTo(
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, 512
      );
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);

    return new THREE.MeshPhongMaterial({
      color: baseColor,
      map: texture,
      shininess: 45,
      specular: 0x444444,
      bumpMap: texture,
      bumpScale: 0.2
    });
  }
}
