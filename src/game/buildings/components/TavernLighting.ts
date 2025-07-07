import * as THREE from 'three';
import { BaseBuilding } from '../BaseBuilding';

export class TavernLighting {
  private building: BaseBuilding;
  private scene: THREE.Scene;
  private chandelierLights: THREE.PointLight[] = [];
  private tableCandleLight: THREE.PointLight | null = null;

  constructor(building: BaseBuilding, scene: THREE.Scene) {
    this.building = building;
    this.scene = scene;
  }

  public createAllLighting(): void {
    this.createHangingChandeliers();
    this.createTableCandleLight();
  }

  private createHangingChandeliers(): void {
    const chandelierMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      metalness: 0.6,
      roughness: 0.4
    });
    
    const candleMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFACD,
      emissive: 0x221100,
      emissiveIntensity: 0.1
    });
    
    for (let i = 0; i < 2; i++) {
      const chandelierGroup = new THREE.Group();
      const xPos = -2 + i * 4;
      
      // Chandelier ring base (rotated to lay flat)
      const chandelierBase = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 16), chandelierMaterial.clone());
      chandelierBase.position.set(0, 0, 0);
      chandelierBase.rotation.x = Math.PI / 2;
      chandelierGroup.add(chandelierBase);
      
      // Hanging chain
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), chandelierMaterial.clone());
      chain.position.set(0, 0.6, 0);
      chandelierGroup.add(chain);
      
      // Candles around the chandelier
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const radius = 0.5;
        
        // Candle holder arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), chandelierMaterial.clone());
        arm.position.set(Math.cos(angle) * radius * 0.9, 0.02, Math.sin(angle) * radius * 0.9);
        arm.rotation.y = angle;
        chandelierGroup.add(arm);
        
        // Candle
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), candleMaterial.clone());
        candle.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
        chandelierGroup.add(candle);
        
        // Candle holder cup
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 8), chandelierMaterial.clone());
        holder.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        chandelierGroup.add(holder);
      }
      
      // Position the chandelier group
      chandelierGroup.position.set(xPos, 5, 1);
      this.building.addComponent(chandelierGroup, `hanging_chandelier_${i}`, 'metal');
      
      // Create point light for chandelier (initially off)
      const chandelierLight = new THREE.PointLight(0xffaa44, 0, 8, 2);
      chandelierLight.position.set(xPos, 5, 1);
      chandelierLight.castShadow = true;
      this.scene.add(chandelierLight);
      this.chandelierLights.push(chandelierLight);
    }
  }

  private createTableCandleLight(): void {
    // Create point light for table candle (initially off)
    this.tableCandleLight = new THREE.PointLight(0xffaa44, 0, 4, 2);
    this.tableCandleLight.position.set(3.5, 1.2, -3.5);
    this.tableCandleLight.castShadow = true;
    this.scene.add(this.tableCandleLight);
  }

  public updateTimeOfDay(gameTime: number, timePhases: any): void {
    const isNight = timePhases.isNight || gameTime < 0.25 || gameTime > 0.75;
    
    if (isNight) {
      // Turn on chandelier lights
      this.chandelierLights.forEach(light => {
        light.intensity = 1.5;
      });
      
      // Turn on table candle light
      if (this.tableCandleLight) {
        this.tableCandleLight.intensity = 0.8;
      }
    } else {
      // Turn off lights during day
      this.chandelierLights.forEach(light => {
        light.intensity = 0;
      });
      
      // Turn off table candle light
      if (this.tableCandleLight) {
        this.tableCandleLight.intensity = 0;
      }
    }
  }

  public dispose(): void {
    // Dispose chandelier lights
    this.chandelierLights.forEach(light => {
      this.scene.remove(light);
    });
    this.chandelierLights.length = 0;
    
    // Dispose table candle light
    if (this.tableCandleLight) {
      this.scene.remove(this.tableCandleLight);
      this.tableCandleLight = null;
    }
  }
}