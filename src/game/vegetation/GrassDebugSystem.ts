
import * as THREE from 'three';
import { GrassBiomeManager, BiomeType } from './GrassBiomeManager';

export class GrassDebugSystem {
  private scene: THREE.Scene;
  private debugMeshes: THREE.Mesh[] = [];
  private debugEnabled: boolean = false;
  private biomeOverlay: THREE.Group = new THREE.Group();
  private debugInfoElement: HTMLElement | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.biomeOverlay.name = 'BiomeDebugOverlay';
    this.scene.add(this.biomeOverlay);
    this.setupKeyboardControls();
    this.createDebugUI();
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        this.toggleBiomeVisualization();
      }
    });
  }

  private createDebugUI(): void {
    this.debugInfoElement = document.createElement('div');
    this.debugInfoElement.id = 'grass-debug-info';
    this.debugInfoElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      display: none;
      min-width: 200px;
    `;
    document.body.appendChild(this.debugInfoElement);
  }

  public toggleBiomeVisualization(): void {
    this.debugEnabled = !this.debugEnabled;
    
    if (this.debugEnabled) {
      this.generateBiomeVisualization();
      if (this.debugInfoElement) {
        this.debugInfoElement.style.display = 'block';
      }
      console.log('🌱 Grass biome debug visualization enabled (Ctrl+B to toggle)');
    } else {
      this.clearBiomeVisualization();
      if (this.debugInfoElement) {
        this.debugInfoElement.style.display = 'none';
      }
      console.log('🌱 Grass biome debug visualization disabled');
    }
  }

  private generateBiomeVisualization(): void {
    this.clearBiomeVisualization();

    const gridSize = 300;
    const resolution = 10;
    const halfGrid = gridSize / 2;

    // Create biome visualization grid
    for (let x = -halfGrid; x < halfGrid; x += resolution) {
      for (let z = -halfGrid; z < halfGrid; z += resolution) {
        const position = new THREE.Vector3(x, 0.1, z);
        const biomeInfo = GrassBiomeManager.getBiomeAtPosition(position);
        const config = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);

        // Create colored plane for this biome section
        const geometry = new THREE.PlaneGeometry(resolution * 0.9, resolution * 0.9);
        const material = new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.3 + biomeInfo.strength * 0.4,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.x = -Math.PI / 2;
        
        // Add border for transition zones
        if (biomeInfo.transitionZone) {
          const borderGeometry = new THREE.RingGeometry(resolution * 0.4, resolution * 0.45, 8);
          const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
          });
          const border = new THREE.Mesh(borderGeometry, borderMaterial);
          border.position.copy(position);
          border.rotation.x = -Math.PI / 2;
          this.biomeOverlay.add(border);
          this.debugMeshes.push(border);
        }

        this.biomeOverlay.add(mesh);
        this.debugMeshes.push(mesh);
      }
    }

    // Create legend
    this.createBiomeLegend();
  }

  private createBiomeLegend(): void {
    const biomeTypes = GrassBiomeManager.getAllBiomeTypes();
    let legendY = 0;

    biomeTypes.forEach((biomeType, index) => {
      const config = GrassBiomeManager.getBiomeConfiguration(biomeType);
      
      // Create legend marker
      const markerGeometry = new THREE.PlaneGeometry(5, 2);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.8
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(-140, 0.2, -100 + legendY);
      marker.rotation.x = -Math.PI / 2;
      
      this.biomeOverlay.add(marker);
      this.debugMeshes.push(marker);
      
      legendY += 8;
    });
  }

  private clearBiomeVisualization(): void {
    this.debugMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
      this.biomeOverlay.remove(mesh);
    });
    this.debugMeshes = [];
  }

  public updateDebugInfo(playerPosition: THREE.Vector3): void {
    if (!this.debugEnabled || !this.debugInfoElement) return;

    const biomeInfo = GrassBiomeManager.getBiomeAtPosition(playerPosition);
    const config = GrassBiomeManager.getBiomeConfiguration(biomeInfo.type);

    this.debugInfoElement.innerHTML = `
      <div><strong>Grass Biome Debug</strong></div>
      <div>Current Biome: ${config.name}</div>
      <div>Type: ${biomeInfo.type}</div>
      <div>Strength: ${(biomeInfo.strength * 100).toFixed(1)}%</div>
      <div>Transition Zone: ${biomeInfo.transitionZone ? 'Yes' : 'No'}</div>
      <div>Density Multiplier: ${config.densityMultiplier}x</div>
      <div>Height Multiplier: ${config.heightMultiplier}x</div>
      <div>Wind Exposure: ${config.windExposureMultiplier}x</div>
      <div>Position: (${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)})</div>
      <div style="margin-top: 5px; font-size: 10px;">Ctrl+B to toggle visualization</div>
    `;
  }

  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  public dispose(): void {
    this.clearBiomeVisualization();
    this.scene.remove(this.biomeOverlay);
    
    if (this.debugInfoElement) {
      document.body.removeChild(this.debugInfoElement);
    }
  }
}
