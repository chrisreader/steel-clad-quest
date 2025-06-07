
import * as THREE from 'three';

interface EmberParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
  color: THREE.Color;
  active: boolean;
  rotationSpeed: number;
}

export class EmberParticleSystem {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private particles: EmberParticle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private time: number = 0;
  private emberCount: number;
  private particleType: string;

  constructor(scene: THREE.Scene, position: THREE.Vector3, emberCount: number = 20, type: string = 'embers') {
    this.scene = scene;
    this.position = position.clone();
    this.emberCount = emberCount;
    this.particleType = type;
    
    this.initializeParticles();
    this.createGeometry();
    this.createOrganicMaterial();
    this.createPoints();
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.emberCount; i++) {
      const particle: EmberParticle = {
        position: this.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 1.0 + 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        age: Math.random() * 5,
        maxAge: 3 + Math.random() * 4,
        size: this.particleType === 'smoke' ? 0.3 + Math.random() * 0.4 : 0.02 + Math.random() * 0.04,
        color: this.getParticleColor(),
        active: true,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      };
      
      this.particles.push(particle);
    }
  }

  private getParticleColor(): THREE.Color {
    if (this.particleType === 'smoke') {
      return new THREE.Color().setHSL(0, 0, 0.3 + Math.random() * 0.4);
    } else {
      // Embers - orange to red
      return new THREE.Color().setHSL(0.08 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.3);
    }
  }

  private createGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.emberCount * 3);
    const colors = new Float32Array(this.emberCount * 3);
    const sizes = new Float32Array(this.emberCount);
    const rotations = new Float32Array(this.emberCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
  }

  private createOrganicMaterial(): void {
    // Create organic circular particles using shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: this.particleType === 'smoke' ? 0.4 : 0.8 }
      },
      vertexShader: `
        attribute float size;
        attribute float rotation;
        varying vec3 vColor;
        varying float vRotation;
        uniform float uTime;
        
        void main() {
          vColor = color;
          vRotation = rotation + uTime * 0.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vRotation;
        uniform float uOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          
          // Create organic circular shape with soft edges
          float dist = length(center);
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          // Add subtle rotation effect for organic feel
          float angle = atan(center.y, center.x) + vRotation;
          float organicVariation = sin(angle * 6.0) * 0.1 + 0.9;
          alpha *= organicVariation;
          
          // Add inner glow for embers
          if (vColor.r > 0.8) { // Ember particles
            float innerGlow = 1.0 - smoothstep(0.0, 0.2, dist);
            alpha += innerGlow * 0.5;
          }
          
          alpha *= uOpacity;
          
          if (alpha < 0.01) discard;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: this.particleType === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false
    });
  }

  private createPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.material.uniforms.uTime.value = this.time;
    
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    const rotations = this.geometry.attributes.rotation.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      if (!particle.active) continue;
      
      // Update age
      particle.age += deltaTime;
      
      // Reset particle if expired
      if (particle.age >= particle.maxAge) {
        particle.position.copy(this.position);
        particle.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0,
          (Math.random() - 0.5) * 0.8
        ));
        
        if (this.particleType === 'smoke') {
          particle.velocity.set(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.8 + 0.4,
            (Math.random() - 0.5) * 0.3
          );
        } else {
          particle.velocity.set(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 1.0 + 0.5,
            (Math.random() - 0.5) * 0.5
          );
        }
        
        particle.age = 0;
        particle.maxAge = 3 + Math.random() * 4;
        particle.color = this.getParticleColor();
      }
      
      // Apply physics
      if (this.particleType === 'smoke') {
        particle.velocity.y += 0.1 * deltaTime; // Smoke rises
        particle.velocity.multiplyScalar(0.99); // Less air resistance for smoke
      } else {
        particle.velocity.y -= 0.15 * deltaTime; // Slight gravity for embers
        particle.velocity.multiplyScalar(0.98); // Air resistance
      }
      
      // Add organic wind effect
      const windStrength = this.particleType === 'smoke' ? 0.2 : 0.1;
      particle.velocity.x += Math.sin(this.time * 2 + i) * windStrength * deltaTime;
      particle.velocity.z += Math.cos(this.time * 1.5 + i) * windStrength * deltaTime;
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      // Update attributes
      const i3 = i * 3;
      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;
      
      // Fade out over time with organic variation
      const ageRatio = particle.age / particle.maxAge;
      const fadeVariation = Math.sin(this.time * 3 + i) * 0.1 + 0.9;
      const alpha = Math.max(0, (1 - ageRatio) * fadeVariation);
      
      colors[i3] = particle.color.r * alpha;
      colors[i3 + 1] = particle.color.g * alpha;
      colors[i3 + 2] = particle.color.b * alpha;
      
      // Size variation over lifetime
      const sizeMultiplier = this.particleType === 'smoke' ? 
        (0.5 + ageRatio * 1.5) : // Smoke grows over time
        (1.0 - ageRatio * 0.5);   // Embers shrink over time
      
      sizes[i] = particle.size * alpha * sizeMultiplier * 100; // Scale for shader
      
      // Update rotation
      rotations[i] += particle.rotationSpeed * deltaTime;
    }
    
    // Mark attributes for update
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.rotation.needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
