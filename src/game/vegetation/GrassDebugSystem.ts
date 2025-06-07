
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

  private getBiomeBorderColor(biomeType: BiomeType): THREE.Color {
    switch (biomeType) {
      case 'normal':
        return new THREE.Color(0x00BFFF); // Bright blue
      case 'meadow':
        return new THREE.Color(0xFF8C00); // Bright orange
      case 'prairie':
        return new THREE.Color(0xFFD700); // Bright yellow
      default:
        return new THREE.Color(0xFFFFFF); // White fallback
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
        
        // Add thick bright colored border for each biome type (5cm thick, at y=2)
        const borderColor = this.getBiomeBorderColor(biomeInfo.type);
        const borderGeometry = new THREE.RingGeometry(resolution * 0.2, resolution * 0.7, 8); // Much thicker border
        const borderMaterial = new THREE.MeshBasicMaterial({
          color: borderColor,
          transparent: true,
          opacity: 0.9 + biomeInfo.strength * 0.1 // Very visible
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.set(x, 2, z); // Position at y=2 for visibility
        border.rotation.x = -Math.PI / 2;
        this.biomeOverlay.add(border);
        this.debugMeshes.push(border);
        
        // Add additional border for transition zones (white, also thick)
        if (biomeInfo.transitionZone) {
          const transitionBorderGeometry = new THREE.RingGeometry(resolution * 0.1, resolution * 0.3, 8); // Thick transition border
          const transitionBorderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
          });
          const transitionBorder = new THREE.Mesh(transitionBorderGeometry, transitionBorderMaterial);
          transitionBorder.position.set(x, 2.1, z); // Slightly higher than main border
          transitionBorder.rotation.x = -Math.PI / 2;
          this.biomeOverlay.add(transitionBorder);
          this.debugMeshes.push(transitionBorder);
        }

        this.biomeOverlay.add(mesh);
        this.debugMeshes.push(mesh);
      }
    }

    // Create legend with border colors
    this.createBiomeLegend();
  }

  private createBiomeLegend(): void {
    const biomeTypes = GrassBiomeManager.getAllBiomeTypes();
    let legendY = 0;

    biomeTypes.forEach((biomeType, index) => {
      const config = GrassBiomeManager.getBiomeConfiguration(biomeType);
      const borderColor = this.getBiomeBorderColor(biomeType);
      
      // Create legend marker with biome color
      const markerGeometry = new THREE.PlaneGeometry(5, 2);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.8
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(-140, 2.2, -100 + legendY); // At y=2.2 for visibility
      marker.rotation.x = -Math.PI / 2;
      
      // Create thick border around legend marker
      const borderGeometry = new THREE.RingGeometry(0.8, 2.0, 8); // Much thicker legend border
      const borderMaterial = new THREE.MeshBasicMaterial({
        color: borderColor,
        transparent: true,
        opacity: 0.9
      });
      
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.position.set(-140, 2.3, -100 + legendY); // Slightly higher
      border.rotation.x = -Math.PI / 2;
      
      this.biomeOverlay.add(marker);
      this.biomeOverlay.add(border);
      this.debugMeshes.push(marker);
      this.debugMeshes.push(border);
      
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
    const borderColor = this.getBiomeBorderColor(biomeInfo.type);

    // Get biome description
    let biomeDescription = '';
    switch (biomeInfo.type) {
      case 'normal':
        biomeDescription = 'Reduced prairie grass height to 0.5m, increased clumping grass density by 40%';
        break;
      case 'meadow':
        biomeDescription = 'Dense areas with 60% meadow grass, 1.5x density, 10% taller';
        break;
      case 'prairie':
        biomeDescription = '70% prairie grass, 30% taller, more wind exposure, lower density';
        break;
    }

    this.debugInfoElement.innerHTML = `
      <div><strong>Grass Biome Debug</strong></div>
      <div>Current Biome: <span style="color: #${borderColor.getHexString()}">${config.name}</span></div>
      <div>Type: ${biomeInfo.type}</div>
      <div>Strength: ${(biomeInfo.strength * 100).toFixed(1)}%</div>
      <div>Transition Zone: ${biomeInfo.transitionZone ? 'Yes' : 'No'}</div>
      <div style="margin: 5px 0; font-size: 10px; color: #ccc;">${biomeDescription}</div>
      <div>Density Multiplier: ${config.densityMultiplier}x</div>
      <div>Height Multiplier: ${config.heightMultiplier}x</div>
      <div>Wind Exposure: ${config.windExposureMultiplier}x</div>
      <div>Position: (${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)})</div>
      <div style="margin-top: 5px; font-size: 10px;">
        <div style="color: #00BFFF">■ Normal Biome (Blue)</div>
        <div style="color: #FF8C00">■ Meadow Biome (Orange)</div>
        <div style="color: #FFD700">■ Prairie Biome (Yellow)</div>
      </div>
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
