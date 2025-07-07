import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { BaseBuilding } from '../BaseBuilding';

export class TavernFurniture {
  private building: BaseBuilding;
  private scene: THREE.Scene;

  constructor(building: BaseBuilding, scene: THREE.Scene) {
    this.building = building;
    this.scene = scene;
  }

  public createAllFurniture(): void {
    this.createBarCounter();
    this.createDiningArea();
    this.createTavernProps();
    this.createSeatingAreas();
  }

  private createBarCounter(): void {
    const barMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    // Main bar counter along left wall
    const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 6), barMaterial);
    barTop.position.set(-4.5, 1.2, -1);
    this.building.addComponent(barTop, 'bar_counter_top', 'wood');
    
    // Bar base/support
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 6), barMaterial.clone());
    barBase.position.set(-4.5, 0.5, -1);
    this.building.addComponent(barBase, 'bar_counter_base', 'wood');
    
    // Bar stools facing the counter
    for (let i = 0; i < 3; i++) {
      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12), barMaterial.clone());
      stoolSeat.position.set(-3, 0.8, -2.5 + i * 1.5);
      this.building.addComponent(stoolSeat, `bar_stool_seat_${i}`, 'wood');
      
      const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), barMaterial.clone());
      stoolLeg.position.set(-3, 0.4, -2.5 + i * 1.5);
      this.building.addComponent(stoolLeg, `bar_stool_leg_${i}`, 'wood');
    }
    
    // Bar shelf behind counter on wall
    const backShelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 6), barMaterial.clone());
    backShelf.position.set(-5.2, 2, -1);
    this.building.addComponent(backShelf, 'bar_back_shelf', 'wood');
    
    // Add bottles on shelf
    for (let i = 0; i < 5; i++) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), new THREE.MeshStandardMaterial({ 
        color: 0x228B22 + Math.random() * 0x444444,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.1
      }));
      bottle.position.set(-5.2, 2.3, -3 + i * 1);
      this.building.addComponent(bottle, `bar_bottle_${i}`, 'metal');
    }
  }

  private createDiningArea(): void {
    const tableMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    const chairMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.9,
      metalness: 0
    });
    
    // Large round table moved to center-right
    const roundTable = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16), tableMaterial);
    roundTable.position.set(2, 0.9, -1);
    this.building.addComponent(roundTable, 'round_table_top', 'wood');
    
    const roundTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8), tableMaterial.clone());
    roundTableLeg.position.set(2, 0.45, -1);
    this.building.addComponent(roundTableLeg, 'round_table_leg', 'wood');
    
    // Chairs around round table
    const chairPositions = [
      [2, 0.4, -2.5], [0.5, 0.4, -1], [2, 0.4, 0.5], [3.5, 0.4, -1]
    ];
    
    chairPositions.forEach((pos, index) => {
      this.createChair(pos, index, chairMaterial, 'round');
    });
    
    // Rectangular table moved to right side near back wall
    const rectTable = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), tableMaterial.clone());
    rectTable.position.set(3.5, 0.9, -3.5);
    this.building.addComponent(rectTable, 'rect_table_top', 'wood');
    
    // Rectangular table legs
    const rectLegPositions = [
      [2.5, 0.45, -4], [4.5, 0.45, -4], [2.5, 0.45, -3], [4.5, 0.45, -3]
    ];
    
    rectLegPositions.forEach((pos, index) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), tableMaterial.clone());
      leg.position.set(pos[0], pos[1], pos[2]);
      this.building.addComponent(leg, `rect_table_leg_${index}`, 'wood');
    });
  }

  private createChair(pos: number[], index: number, material: THREE.MeshStandardMaterial, prefix: string): void {
    // Chair seat
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), material.clone());
    chairSeat.position.set(pos[0], pos[1] + 0.4, pos[2]);
    this.building.addComponent(chairSeat, `${prefix}_chair_seat_${index}`, 'wood');
    
    // Chair back
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.05), material.clone());
    chairBack.position.set(pos[0], pos[1] + 0.7, pos[2] + 0.175);
    this.building.addComponent(chairBack, `${prefix}_chair_back_${index}`, 'wood');
    
    // Chair legs
    for (let legIndex = 0; legIndex < 4; legIndex++) {
      const legX = pos[0] + (legIndex % 2 === 0 ? -0.15 : 0.15);
      const legZ = pos[2] + (legIndex < 2 ? -0.15 : 0.15);
      const chairLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), material.clone());
      chairLeg.position.set(legX, pos[1] + 0.2, legZ);
      this.building.addComponent(chairLeg, `${prefix}_chair_leg_${index}_${legIndex}`, 'wood');
    }
  }

  private createTavernProps(): void {
    // Wooden mugs on tables
    const mugMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.9
    });
    
    // Mugs on round table
    for (let i = 0; i < 3; i++) {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), mugMaterial.clone());
      const angle = (i / 3) * Math.PI * 2;
      mug.position.set(2 + Math.cos(angle) * 0.6, 1.06, -1 + Math.sin(angle) * 0.6);
      this.building.addComponent(mug, `table_mug_${i}`, 'wood');
      
      // Mug handle
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), mugMaterial.clone());
      handle.position.copy(mug.position);
      handle.position.x += 0.1;
      handle.rotation.z = Math.PI / 2;
      this.building.addComponent(handle, `table_mug_handle_${i}`, 'wood');
    }
    
    // Candle on rectangular table
    const candleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFACD,
      emissive: 0x221100,
      emissiveIntensity: 0.1
    });
    
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8), candleMaterial);
    candle.position.set(3.5, 1.08, -3.5);
    this.building.addComponent(candle, 'table_candle', 'fabric');
    
    // Candle holder
    const holderMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      metalness: 0.6,
      roughness: 0.4
    });
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 8), holderMaterial);
    holder.position.set(3.5, 0.985, -3.5);
    this.building.addComponent(holder, 'candle_holder', 'metal');
  }

  private createSeatingAreas(): void {
    const benchMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8
    });
    
    // Wall bench along back wall
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 0.4), benchMaterial);
    benchSeat.position.set(1.5, 0.5, -5.5);
    this.building.addComponent(benchSeat, 'wall_bench_seat', 'wood');
    
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 0.08), benchMaterial.clone());
    benchBack.position.set(1.5, 0.8, -5.8);
    this.building.addComponent(benchBack, 'wall_bench_back', 'wood');
    
    // Bench supports
    for (let i = 0; i < 3; i++) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), benchMaterial.clone());
      support.position.set(-0.5 + i * 2, 0.25, -5.5);
      this.building.addComponent(support, `bench_support_${i}`, 'wood');
    }
  }
}