
import * as THREE from 'three';

export class CelestialGlowSystem {
  private scene: THREE.Scene;
  private sunGlowLayers: THREE.Mesh[] = [];
  private moonGlowLayers: THREE.Mesh[] = [];
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createSunGlow(sunMesh: THREE.Mesh): void {
    // Clear existing glow layers
    this.clearSunGlow();

    // Sun glow configuration - multiple layers for realistic effect
    const sunGlowConfigs = [
      { radius: 10, color: 0xFFFFF0, opacity: 0.8, name: 'core' },
      { radius: 14, color: 0xFFFF99, opacity: 0.4, name: 'inner' },
      { radius: 20, color: 0xFFCC66, opacity: 0.2, name: 'middle' },
      { radius: 28, color: 0xFF9933, opacity: 0.1, name: 'outer' },
      { radius: 40, color: 0xFF6600, opacity: 0.05, name: 'halo' }
    ];

    sunGlowConfigs.forEach((config, index) => {
      const glowGeometry = new THREE.SphereGeometry(config.radius, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        fog: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.userData.glowLayer = config.name;
      glowMesh.userData.baseOpacity = config.opacity;
      glowMesh.userData.baseRadius = config.radius;
      
      sunMesh.add(glowMesh);
      this.sunGlowLayers.push(glowMesh);
    });

    console.log(`Created ${this.sunGlowLayers.length} sun glow layers`);
  }

  public createMoonGlow(moonMesh: THREE.Mesh): void {
    // Clear existing glow layers
    this.clearMoonGlow();

    // Moon glow configuration - softer, cooler colors
    const moonGlowConfigs = [
      { radius: 8, color: 0xF5F5FF, opacity: 0.6, name: 'core' },
      { radius: 12, color: 0xE6E6FF, opacity: 0.3, name: 'inner' },
      { radius: 18, color: 0xCCCCFF, opacity: 0.15, name: 'middle' },
      { radius: 25, color: 0xB0B0FF, opacity: 0.08, name: 'outer' },
      { radius: 35, color: 0x9999FF, opacity: 0.04, name: 'halo' }
    ];

    moonGlowConfigs.forEach((config, index) => {
      const glowGeometry = new THREE.SphereGeometry(config.radius, 24, 24);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        fog: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.userData.glowLayer = config.name;
      glowMesh.userData.baseOpacity = config.opacity;
      glowMesh.userData.baseRadius = config.radius;
      
      moonMesh.add(glowMesh);
      this.moonGlowLayers.push(glowMesh);
    });

    console.log(`Created ${this.moonGlowLayers.length} moon glow layers`);
  }

  public updateSunGlow(timeOfDay: number, sunElevation: number, atmosphericDensity: number = 1.0): void {
    const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    
    // Calculate glow intensity based on sun position and atmospheric conditions
    const horizonFactor = Math.max(0, 1 - Math.abs(sunHeight) * 2); // Stronger glow near horizon
    const elevationFactor = Math.max(0.1, Math.abs(sunHeight)); // Minimum glow when below horizon
    const atmosphericFactor = atmosphericDensity; // Fog/atmosphere affects glow
    
    this.sunGlowLayers.forEach((glowMesh, index) => {
      const material = glowMesh.material as THREE.MeshBasicMaterial;
      const baseOpacity = glowMesh.userData.baseOpacity;
      const layerName = glowMesh.userData.glowLayer;
      
      // Different intensity curves for different layers
      let intensityMultiplier = 1.0;
      if (layerName === 'core') {
        intensityMultiplier = elevationFactor;
      } else if (layerName === 'inner') {
        intensityMultiplier = elevationFactor * 0.8;
      } else if (layerName === 'middle') {
        intensityMultiplier = (elevationFactor * 0.6) + (horizonFactor * 0.8);
      } else if (layerName === 'outer') {
        intensityMultiplier = (elevationFactor * 0.4) + (horizonFactor * 1.2);
      } else if (layerName === 'halo') {
        intensityMultiplier = (elevationFactor * 0.2) + (horizonFactor * 1.5);
      }
      
      // Apply atmospheric scattering effect
      intensityMultiplier *= atmosphericFactor;
      
      // Update opacity
      material.opacity = baseOpacity * intensityMultiplier * (sunHeight > -0.1 ? 1 : 0);
      
      // Color temperature shift based on elevation
      if (sunHeight < 0.3) {
        // Warmer colors when sun is low
        const warmth = (0.3 - Math.max(0, sunHeight)) / 0.3;
        if (layerName === 'outer' || layerName === 'halo') {
          const warmColor = new THREE.Color().setHSL(0.08 - warmth * 0.02, 0.8, 0.5); // Orange to red
          material.color.copy(warmColor);
        }
      }
      
      // Scale glow size slightly based on atmospheric conditions
      const scaleMultiplier = 1.0 + (atmosphericDensity - 1.0) * 0.2;
      glowMesh.scale.setScalar(scaleMultiplier);
    });
  }

  public updateMoonGlow(timeOfDay: number, moonElevation: number, atmosphericDensity: number = 1.0): void {
    const moonAngle = (timeOfDay - 0.25) * Math.PI * 2 + Math.PI;
    const moonHeight = Math.sin(moonAngle);
    
    // Calculate moon glow intensity
    const elevationFactor = Math.max(0.1, Math.abs(moonHeight));
    const nightFactor = timeOfDay < 0.25 || timeOfDay > 0.75 ? 1.0 : 0.3; // Stronger during night
    const atmosphericFactor = atmosphericDensity;
    
    this.moonGlowLayers.forEach((glowMesh, index) => {
      const material = glowMesh.material as THREE.MeshBasicMaterial;
      const baseOpacity = glowMesh.userData.baseOpacity;
      const layerName = glowMesh.userData.glowLayer;
      
      // Different intensity curves for different layers
      let intensityMultiplier = 1.0;
      if (layerName === 'core') {
        intensityMultiplier = elevationFactor * nightFactor;
      } else if (layerName === 'inner') {
        intensityMultiplier = elevationFactor * nightFactor * 0.8;
      } else if (layerName === 'middle') {
        intensityMultiplier = elevationFactor * nightFactor * 0.6;
      } else if (layerName === 'outer') {
        intensityMultiplier = elevationFactor * nightFactor * 0.4;
      } else if (layerName === 'halo') {
        intensityMultiplier = elevationFactor * nightFactor * 0.3;
      }
      
      // Apply atmospheric effect
      intensityMultiplier *= atmosphericFactor;
      
      // Update opacity
      material.opacity = baseOpacity * intensityMultiplier * (moonHeight > -0.1 ? 1 : 0);
      
      // Subtle scale variation for atmospheric effect
      const scaleMultiplier = 1.0 + (atmosphericDensity - 1.0) * 0.15;
      glowMesh.scale.setScalar(scaleMultiplier);
    });
  }

  public clearSunGlow(): void {
    this.sunGlowLayers.forEach(glowMesh => {
      if (glowMesh.parent) {
        glowMesh.parent.remove(glowMesh);
      }
      if (glowMesh.geometry) glowMesh.geometry.dispose();
      if (glowMesh.material instanceof THREE.Material) {
        glowMesh.material.dispose();
      }
    });
    this.sunGlowLayers = [];
  }

  public clearMoonGlow(): void {
    this.moonGlowLayers.forEach(glowMesh => {
      if (glowMesh.parent) {
        glowMesh.parent.remove(glowMesh);
      }
      if (glowMesh.geometry) glowMesh.geometry.dispose();
      if (glowMesh.material instanceof THREE.Material) {
        glowMesh.material.dispose();
      }
    });
    this.moonGlowLayers = [];
  }

  public dispose(): void {
    this.clearSunGlow();
    this.clearMoonGlow();
    console.log("CelestialGlowSystem disposed");
  }
}
