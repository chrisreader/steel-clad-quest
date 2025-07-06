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
  temperature: number;
  sparkIntensity: number;
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
          (Math.random() - 0.5) * 0.3,
          Math.random() * 0.8 + 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        age: Math.random() * 5,
        maxAge: 3 + Math.random() * 4,
        size: this.particleType === 'smoke' ? 0.08 + Math.random() * 0.12 : 0.008 + Math.random() * 0.015, // Even smaller embers
        color: this.getParticleColor(),
        active: true,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        temperature: this.particleType === 'embers' ? 0.9 + Math.random() * 0.1 : 0.3, // Hot embers start very hot
        sparkIntensity: Math.random()
      };
      
      this.particles.push(particle);
    }
  }

  private getParticleColor(): THREE.Color {
    if (this.particleType === 'smoke') {
      // Lighter, more transparent smoke colors
      return new THREE.Color().setHSL(0, 0, 0.5 + Math.random() * 0.3);
    } else {
      // More realistic ember colors - very hot orange/yellow to cooler red
      const temperature = 0.8 + Math.random() * 0.2;
      if (temperature > 0.9) {
        // Very hot - white/yellow
        return new THREE.Color().setHSL(0.15, 0.7, 0.9);
      } else if (temperature > 0.7) {
        // Hot - bright orange
        return new THREE.Color().setHSL(0.08, 0.95, 0.7);
      } else {
        // Cooling - deeper red
        return new THREE.Color().setHSL(0.02, 0.9, 0.5);
      }
    }
  }

  private createGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.emberCount * 3);
    const colors = new Float32Array(this.emberCount * 3);
    const sizes = new Float32Array(this.emberCount);
    const rotations = new Float32Array(this.emberCount);
    const temperatures = new Float32Array(this.emberCount);
    const sparkIntensities = new Float32Array(this.emberCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
    this.geometry.setAttribute('temperature', new THREE.BufferAttribute(temperatures, 1));
    this.geometry.setAttribute('sparkIntensity', new THREE.BufferAttribute(sparkIntensities, 1));
  }

  private createOrganicMaterial(): void {
    // Create organic circular particles using shader with enhanced ember effects
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: this.particleType === 'smoke' ? 0.2 : 0.8 } // Slightly more visible embers
      },
      vertexShader: `
        attribute float size;
        attribute float rotation;
        attribute float temperature;
        attribute float sparkIntensity;
        varying vec3 vColor;
        varying float vRotation;
        varying float vTemperature;
        varying float vSparkIntensity;
        uniform float uTime;
        
        void main() {
          vColor = color;
          vRotation = rotation + uTime * 0.5;
          vTemperature = temperature;
          vSparkIntensity = sparkIntensity;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z); // Adjusted scale for tiny embers
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vRotation;
        varying float vTemperature;
        varying float vSparkIntensity;
        uniform float uOpacity;
        uniform float uTime;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Create sharp circular ember with hot center
          float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
          
          // Add hot center glow for embers
          if (vColor.r > 0.5) { // Ember particles
            float hotCenter = 1.0 - smoothstep(0.0, 0.2, dist);
            alpha += hotCenter * vTemperature * 0.8;
            
            // Simplified sparking effect - less expensive
            float sparkle = vSparkIntensity * 0.3 + 0.7;
            alpha *= sparkle;
            
            // Simplified flickering - cached calculation
            float flicker = vTemperature * 0.2 + 0.8;
            alpha *= flicker;
          } else {
            // Organic variation for smoke
            float angle = atan(center.y, center.x) + vRotation;
            float organicVariation = sin(angle * 8.0) * 0.08 + 0.92;
            alpha *= organicVariation;
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
    
    // Add temperature and spark attributes
    let temperatures = this.geometry.attributes.temperature?.array as Float32Array;
    let sparkIntensities = this.geometry.attributes.sparkIntensity?.array as Float32Array;
    
    if (!temperatures) {
      temperatures = new Float32Array(this.emberCount);
      sparkIntensities = new Float32Array(this.emberCount);
      this.geometry.setAttribute('temperature', new THREE.BufferAttribute(temperatures, 1));
      this.geometry.setAttribute('sparkIntensity', new THREE.BufferAttribute(sparkIntensities, 1));
    }

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      if (!particle.active) continue;
      
      // Update age
      particle.age += deltaTime;
      
      // Reset particle if expired
      if (particle.age >= particle.maxAge) {
        particle.position.copy(this.position);
        particle.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          0,
          (Math.random() - 0.5) * 0.6
        ));
        
        if (this.particleType === 'smoke') {
          particle.velocity.set(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.6 + 0.3,
            (Math.random() - 0.5) * 0.2
          );
        } else {
          // Embers start with more random upward velocity
          particle.velocity.set(
            (Math.random() - 0.5) * 0.4,
            Math.random() * 1.2 + 0.6,
            (Math.random() - 0.5) * 0.4
          );
          particle.temperature = 0.9 + Math.random() * 0.1; // Reset temperature
        }
        
        particle.age = 0;
        particle.maxAge = 2 + Math.random() * 3; // Shorter ember lifespan
        particle.color = this.getParticleColor();
        particle.sparkIntensity = Math.random();
      }
      
      // Apply realistic ember physics
      if (this.particleType === 'smoke') {
        particle.velocity.y += 0.08 * deltaTime;
        particle.velocity.multiplyScalar(0.995);
      } else {
        // Embers: strong initial upward thrust, then gravity takes over
        particle.velocity.y -= 0.4 * deltaTime; // Stronger gravity for embers
        particle.velocity.multiplyScalar(0.98); // More air resistance
        
        // Cool down over time
        particle.temperature *= (1 - deltaTime * 0.3);
        
        // Update color based on cooling
        const coolingFactor = particle.temperature;
        if (coolingFactor > 0.7) {
          particle.color.setHSL(0.12, 0.9, 0.8); // Bright yellow-orange
        } else if (coolingFactor > 0.4) {
          particle.color.setHSL(0.06, 0.95, 0.6); // Orange
        } else {
          particle.color.setHSL(0.02, 0.9, 0.4); // Deep red
        }
      }
      
      // Add realistic wind effects - embers are more affected
      const windStrength = this.particleType === 'smoke' ? 0.15 : 0.25;
      particle.velocity.x += Math.sin(this.time * 1.8 + i) * windStrength * deltaTime;
      particle.velocity.z += Math.cos(this.time * 1.3 + i) * windStrength * deltaTime;
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      // Update attributes
      const i3 = i * 3;
      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;
      
      // Realistic fading based on temperature and age
      const ageRatio = particle.age / particle.maxAge;
      let alpha;
      
      if (this.particleType === 'embers') {
        // Embers fade based on temperature and age
        alpha = particle.temperature * (1 - ageRatio * 0.8);
      } else {
        // Smoke fades normally
        const fadeVariation = Math.sin(this.time * 2.5 + i) * 0.08 + 0.92;
        alpha = Math.max(0, (1 - ageRatio) * fadeVariation);
      }
      
      colors[i3] = particle.color.r * alpha;
      colors[i3 + 1] = particle.color.g * alpha;
      colors[i3 + 2] = particle.color.b * alpha;
      
      // Size variation - embers get smaller as they cool
      const sizeMultiplier = this.particleType === 'smoke' ? 
        (0.3 + ageRatio * 1.2) : 
        (particle.temperature * (1.2 - ageRatio * 0.3)); // Size based on temperature
      
      sizes[i] = particle.size * alpha * sizeMultiplier * 80; // Adjusted scale
      
      // Update rotation
      rotations[i] += particle.rotationSpeed * deltaTime;
      
      // Update ember-specific attributes
      if (this.particleType === 'embers') {
        temperatures[i] = particle.temperature;
        sparkIntensities[i] = particle.sparkIntensity;
      }
    }
    
    // Mark attributes for update
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.rotation.needsUpdate = true;
    
    if (this.particleType === 'embers') {
      this.geometry.attributes.temperature.needsUpdate = true;
      this.geometry.attributes.sparkIntensity.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
