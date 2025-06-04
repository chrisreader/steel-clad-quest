import * as THREE from 'three';

export class VolumetricFogSystem {
  private scene: THREE.Scene;
  private fogWallLayers: THREE.Group[] = [];
  private fogWallMaterial: THREE.ShaderMaterial;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🌫️ [VolumetricFogSystem] Initializing with fog walls only...');
    
    // Create fog wall material
    this.fogWallMaterial = this.createFogWallShaderMaterial();
    
    // Only create fog walls - no atmospheric, horizon, or ground fog layers
    this.createRealisticFogWalls();
    
    console.log('🌫️ [VolumetricFogSystem] Fog walls created successfully');
  }
  
  
  private createFogWallShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        fogColor: { value: new THREE.Color(0.7, 0.7, 0.8) },
        fogDensity: { value: 0.95 },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vDistance;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDistance = length(cameraPosition - worldPosition.xyz);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float time;
        varying vec3 vWorldPosition;
        varying float vDistance;
        
        void main() {
          float fog = 1.0 - exp(-vDistance * vDistance * fogDensity * 0.001);
          fog = clamp(fog, 0.0, 1.0);
          
          vec3 color = fogColor;
          gl_FragColor = vec4(color, fog);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
  }
  
  
  private createRealisticFogWalls(): void {
    console.log('🌫️ [VolumetricFogSystem] Creating realistic fog walls...');
    
    const distances = [45, 55, 65];
    const heights = [80, 100, 120];
    
    distances.forEach((distance, index) => {
      const fogWallGroup = new THREE.Group();
      
      for (let angle = 0; angle < 360; angle += 15) {
        const radian = (angle * Math.PI) / 180;
        const x = Math.cos(radian) * distance;
        const z = Math.sin(radian) * distance;
        
        const wallGeometry = new THREE.PlaneGeometry(20, heights[index]);
        const wallMesh = new THREE.Mesh(wallGeometry, this.fogWallMaterial);
        
        wallMesh.position.set(x, heights[index] / 2, z);
        wallMesh.lookAt(0, heights[index] / 2, 0);
        
        fogWallGroup.add(wallMesh);
      }
      
      this.fogWallLayers.push(fogWallGroup);
      this.scene.add(fogWallGroup);
    });
    
    console.log('🌫️ [VolumetricFogSystem] Fog walls created successfully');
  }
  
  public update(playerPosition: THREE.Vector3, deltaTime: number): void {
    // Update only fog wall layers - no atmospheric, horizon, or ground fog
    this.fogWallLayers.forEach(layer => {
      layer.position.x = playerPosition.x;
      layer.position.z = playerPosition.z;
    });
    
    // Update material time uniform
    if (this.fogWallMaterial) {
      this.fogWallMaterial.uniforms.time.value += deltaTime;
    }
  }
  
  public dispose(): void {
    console.log('🌫️ [VolumetricFogSystem] Disposing...');
    
    this.fogWallLayers.forEach(layer => {
      this.scene.remove(layer);
      layer.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    });
    
    if (this.fogWallMaterial) {
      this.fogWallMaterial.dispose();
    }
    
    this.fogWallLayers.length = 0;
  }
}
