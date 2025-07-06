import * as THREE from 'three';
import { BaseBuilding } from './BaseBuilding';
import { TextureGenerator } from '../utils';
import { FireplaceComponent } from './components/FireplaceComponent';
import { AudioManager } from '../engine/AudioManager';
import { HumanNPC } from '../entities/humanoid/HumanNPC';
import { EffectsManager } from '../engine/EffectsManager';
import { ChestInteractionSystem } from '../systems/ChestInteractionSystem';
import { TreasureChest } from '../world/objects/TreasureChest';

export class TavernBuilding extends BaseBuilding {
  private fireplaceComponent: FireplaceComponent | null = null;
  private audioManager: AudioManager | null = null;
  private effectsManager: EffectsManager | null = null;
  private tavernKeeper: HumanNPC | null = null;
  private chestInteractionSystem: ChestInteractionSystem | null = null;
  private chests: TreasureChest[] = [];

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }

  public setEffectsManager(effectsManager: EffectsManager): void {
    this.effectsManager = effectsManager;
  }

  public setChestInteractionSystem(chestInteractionSystem: ChestInteractionSystem): void {
    this.chestInteractionSystem = chestInteractionSystem;
  }

  protected createStructure(): void {
    // Enhanced tavern floor with realistic wooden planks
    this.createRealisticFloor();
    
    // Enhanced walls with stone/wood hybrid construction
    this.createRealisticWalls();
    
    // Enhanced roof with proper pitched structure
    this.createRealisticRoof();
    
    // Add architectural details
    this.createArchitecturalDetails();
    
    // Enhanced fireplace system
    this.createEnhancedFireplace();
    
    // Furniture (moved to sides to make room for fireplace)
    this.createFurniture();
    
    // Create tavern keeper NPC
    this.createTavernKeeper();
    
    // Create treasure chests
    this.createTavernChests();
  }

  private createRealisticFloor(): void {
    // Create realistic wooden plank floor with wear patterns
    const floorGroup = new THREE.Group();
    
    // Main floor base
    const floorGeometry = new THREE.PlaneGeometry(12, 12);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floorGroup.add(floor);
    
    // Add individual wooden planks for detail
    for (let i = 0; i < 6; i++) {
      const plankGeometry = new THREE.BoxGeometry(12, 0.05, 1.8);
      const plankMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513 + Math.random() * 0x111111,
        map: TextureGenerator.createWoodTexture(),
        roughness: 0.9,
        metalness: 0.05
      });
      const plank = new THREE.Mesh(plankGeometry, plankMaterial);
      plank.position.set(0, 0.03, -5 + i * 2);
      floorGroup.add(plank);
    }
    
    this.addComponent(floorGroup, 'realistic_floor', 'wood');
  }

  private createRealisticWalls(): void {
    const wallHeight = 6;
    
    // Stone foundation base with individual rock outlines
    const foundationMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x696969,
      map: TextureGenerator.createStoneTexture(),
      roughness: 0.9,
      metalness: 0
    });
    
    // Wood upper walls
    const woodMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    // Back wall with stone foundation and wood upper
    const backFoundation = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 0.4), foundationMaterial);
    backFoundation.position.set(0, 0.75, -6);
    this.addComponent(backFoundation, 'back_foundation', 'stone');
    
    // Add individual rock outlines to back foundation
    this.addRockOutlines(0, 0.75, -6, 12, 0.4, 'back');
    
    const backWoodWall = new THREE.Mesh(new THREE.BoxGeometry(12, wallHeight - 1.5, 0.3), woodMaterial);
    backWoodWall.position.set(0, wallHeight - 2.25, -6);
    this.addComponent(backWoodWall, 'back_wall', 'wood');
    
    // Add wooden support beams
    for (let i = -1; i <= 1; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallHeight, 0.2), woodMaterial.clone());
      beam.position.set(i * 4, wallHeight/2, -5.9);
      this.addComponent(beam, `back_beam_${i + 1}`, 'wood');
    }
    
    // Left wall with rock outlines
    const leftFoundation = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 12), foundationMaterial.clone());
    leftFoundation.position.set(-6, 0.75, 0);
    this.addComponent(leftFoundation, 'left_foundation', 'stone');
    
    this.addRockOutlines(-6, 0.75, 0, 0.4, 12, 'left');
    
    const leftWoodWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallHeight - 1.5, 12), woodMaterial.clone());
    leftWoodWall.position.set(-6, wallHeight - 2.25, 0);
    this.addComponent(leftWoodWall, 'left_wall', 'wood');
    
    // Right wall with rock outlines
    const rightFoundation = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 12), foundationMaterial.clone());
    rightFoundation.position.set(6, 0.75, 0);
    this.addComponent(rightFoundation, 'right_foundation', 'stone');
    
    this.addRockOutlines(6, 0.75, 0, 0.4, 12, 'right');
    
    const rightWoodWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallHeight - 1.5, 12), woodMaterial.clone());
    rightWoodWall.position.set(6, wallHeight - 2.25, 0);
    this.addComponent(rightWoodWall, 'right_wall', 'wood');
    
    // Front walls with tavern door and rock outlines
    const frontLeftFoundation = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.4), foundationMaterial.clone());
    frontLeftFoundation.position.set(-3, 0.75, 6);
    this.addComponent(frontLeftFoundation, 'front_left_foundation', 'stone');
    
    this.addRockOutlines(-3, 0.75, 6, 3, 0.4, 'front_left');
    
    const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight - 1.5, 0.3), woodMaterial.clone());
    frontLeftWall.position.set(-3, wallHeight - 2.25, 6);
    this.addComponent(frontLeftWall, 'front_wall_left', 'wood');
    
    const frontRightFoundation = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.4), foundationMaterial.clone());
    frontRightFoundation.position.set(3, 0.75, 6);
    this.addComponent(frontRightFoundation, 'front_right_foundation', 'stone');
    
    this.addRockOutlines(3, 0.75, 6, 3, 0.4, 'front_right');
    
    const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight - 1.5, 0.3), woodMaterial.clone());
    frontRightWall.position.set(3, wallHeight - 2.25, 6);
    this.addComponent(frontRightWall, 'front_wall_right', 'wood');
    
    // Create tavern door frame
    this.createDoorFrame();
  }

  private addRockOutlines(centerX: number, centerY: number, centerZ: number, width: number, depth: number, wallName: string): void {
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x595959,
      roughness: 1.0,
      metalness: 0
    });
    
    // Calculate rock placement based on wall dimensions
    const rocksPerRow = Math.ceil(Math.max(width, depth) / 0.8);
    const rocksPerColumn = 2; // Two rows of rocks for foundation height
    
    for (let row = 0; row < rocksPerColumn; row++) {
      for (let i = 0; i < rocksPerRow; i++) {
        const rockSize = 0.3 + Math.random() * 0.2;
        const rock = new THREE.Mesh(
          new THREE.BoxGeometry(rockSize, rockSize * 0.8, rockSize * 0.6),
          rockMaterial.clone()
        );
        
        // Position rocks based on wall orientation
        let x = centerX;
        let y = centerY - 0.5 + row * 0.4;
        let z = centerZ;
        
        if (wallName.includes('back') || wallName.includes('front')) {
          // Horizontal wall - spread rocks along width
          x = centerX - width/2 + (i + 0.5) * (width / rocksPerRow);
          z = centerZ + (Math.random() - 0.5) * 0.2;
        } else {
          // Vertical wall - spread rocks along depth
          z = centerZ - depth/2 + (i + 0.5) * (depth / rocksPerRow);
          x = centerX + (Math.random() - 0.5) * 0.2;
        }
        
        // Add some random variation
        x += (Math.random() - 0.5) * 0.1;
        y += (Math.random() - 0.5) * 0.05;
        z += (Math.random() - 0.5) * 0.1;
        
        rock.position.set(x, y, z);
        rock.rotation.set(
          Math.random() * 0.2,
          Math.random() * Math.PI,
          Math.random() * 0.2
        );
        
        this.addComponent(rock, `${wallName}_rock_${row}_${i}`, 'stone');
      }
    }
  }

  private createRealisticRoof(): void {
    const wallHeight = 6;
    
    // Pitched roof with proper geometry
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    // Create proper pitched roof using box geometry for better visibility
    const roofWidth = 14;
    const roofDepth = 8;
    const roofHeight = 3;
    
    // Left roof slope
    const leftRoofGeometry = new THREE.BoxGeometry(roofWidth, 0.2, roofDepth);
    const leftRoof = new THREE.Mesh(leftRoofGeometry, roofMaterial);
    leftRoof.position.set(0, wallHeight + roofHeight / 2, 0);
    leftRoof.rotation.z = -Math.PI / 6; // 30-degree pitch
    leftRoof.position.x = -1.5;
    this.addComponent(leftRoof, 'roof_left', 'wood');
    
    // Right roof slope  
    const rightRoof = new THREE.Mesh(leftRoofGeometry.clone(), roofMaterial.clone());
    rightRoof.position.set(0, wallHeight + roofHeight / 2, 0);
    rightRoof.rotation.z = Math.PI / 6; // 30-degree pitch
    rightRoof.position.x = 1.5;
    this.addComponent(rightRoof, 'roof_right', 'wood');
    
    // Ridge beam at the peak
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, roofWidth), roofMaterial.clone());
    ridgeBeam.position.set(0, wallHeight + roofHeight + 0.5, 0);
    this.addComponent(ridgeBeam, 'ridge_beam', 'wood');
  }

  private createArchitecturalDetails(): void {
    // Add windows with frames
    this.createWindows();
    
    // Add decorative elements
    this.createDecorations();
    
    // Add hanging elements
    this.createHangingElements();
  }

  private createDoorFrame(): void {
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8,
      metalness: 0
    });
    
    // Door frame posts
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), doorFrameMaterial);
    leftPost.position.set(-1, 2, 6.1);
    this.addComponent(leftPost, 'door_left_post', 'wood');
    
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), doorFrameMaterial.clone());
    rightPost.position.set(1, 2, 6.1);
    this.addComponent(rightPost, 'door_right_post', 'wood');
    
    // Door lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.2), doorFrameMaterial.clone());
    lintel.position.set(0, 4, 6.1);
    this.addComponent(lintel, 'door_lintel', 'wood');
    
    // Tavern sign
    const signMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.1), signMaterial);
    sign.position.set(0, 5, 6.2);
    this.addComponent(sign, 'tavern_sign', 'wood');
  }

  private createWindows(): void {
    const windowFrameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.8
    });
    
    // Left wall window
    const leftWindow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 2), windowFrameMaterial);
    leftWindow.position.set(-5.95, 3, -2);
    this.addComponent(leftWindow, 'left_window_frame', 'wood');
    
    // Right wall window
    const rightWindow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 2), windowFrameMaterial.clone());
    rightWindow.position.set(5.95, 3, 2);
    this.addComponent(rightWindow, 'right_window_frame', 'wood');
  }

  private createDecorations(): void {
    // Add barrels for decoration
    for (let i = 0; i < 3; i++) {
      const barrelGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 12);
      const barrelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        map: TextureGenerator.createWoodTexture(),
        roughness: 0.9
      });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.position.set(-5 + i * 1.5, 0.6, -5);
      this.addComponent(barrel, `decoration_barrel_${i}`, 'wood');
    }
  }

  private createHangingElements(): void {
    // Hanging lanterns
    const lanternMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      metalness: 0.3,
      roughness: 0.7
    });
    
    for (let i = 0; i < 2; i++) {
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8), lanternMaterial.clone());
      lantern.position.set(-2 + i * 4, 5, 1);
      this.addComponent(lantern, `hanging_lantern_${i}`, 'metal');
      
      // Lantern chain
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), lanternMaterial.clone());
      chain.position.set(-2 + i * 4, 5.8, 1);
      this.addComponent(chain, `lantern_chain_${i}`, 'metal');
    }
  }
  
  private createEnhancedFireplace(): void {
    if (!this.audioManager) {
      console.warn('🔥 AudioManager not set for TavernBuilding. Creating fireplace without audio.');
      // Create a mock audio manager for now
      this.audioManager = {} as AudioManager;
    }

    console.log('🔥 Creating enhanced fireplace system for tavern');
    
    this.fireplaceComponent = new FireplaceComponent(
      this.scene,
      this.physicsManager,
      this.audioManager,
      new THREE.Vector3(0, 0, 0), // Center of tavern
      'tavern_fireplace',
      true // Always on for tavern
    );
    
    const fireplaceGroup = this.fireplaceComponent.create();
    this.buildingGroup.add(fireplaceGroup);
    
    // Register fireplace collisions
    this.fireplaceComponent.registerCollisions('tavern');
    
    console.log('🔥 Enhanced fireplace system created with realistic fire, organic rocks, and dynamic lighting');
  }
  
  private createFurniture(): void {
    // Create proper tavern bar counter
    this.createBarCounter();
    
    // Create realistic dining tables with proper chairs
    this.createDiningArea();
    
    // Add tavern props and atmospheric details
    this.createTavernProps();
    
    // Create seating areas
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
    this.addComponent(barTop, 'bar_counter_top', 'wood');
    
    // Bar base/support
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 6), barMaterial.clone());
    barBase.position.set(-4.5, 0.5, -1);
    this.addComponent(barBase, 'bar_counter_base', 'wood');
    
    // Bar stools facing the counter
    for (let i = 0; i < 3; i++) {
      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12), barMaterial.clone());
      stoolSeat.position.set(-3, 0.8, -2.5 + i * 1.5);
      this.addComponent(stoolSeat, `bar_stool_seat_${i}`, 'wood');
      
      const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), barMaterial.clone());
      stoolLeg.position.set(-3, 0.4, -2.5 + i * 1.5);
      this.addComponent(stoolLeg, `bar_stool_leg_${i}`, 'wood');
    }
    
    // Bar shelf behind counter on wall
    const backShelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 6), barMaterial.clone());
    backShelf.position.set(-5.2, 2, -1);
    this.addComponent(backShelf, 'bar_back_shelf', 'wood');
    
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
      this.addComponent(bottle, `bar_bottle_${i}`, 'metal');
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
    this.addComponent(roundTable, 'round_table_top', 'wood');
    
    const roundTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8), tableMaterial.clone());
    roundTableLeg.position.set(2, 0.45, -1);
    this.addComponent(roundTableLeg, 'round_table_leg', 'wood');
    
    // Chairs around round table (shifted positions)
    const chairPositions = [
      [2, 0.4, -2.5], [0.5, 0.4, -1], [2, 0.4, 0.5], [3.5, 0.4, -1]
    ];
    
    chairPositions.forEach((pos, index) => {
      // Chair seat
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), chairMaterial.clone());
      chairSeat.position.set(pos[0], pos[1] + 0.4, pos[2]);
      this.addComponent(chairSeat, `round_chair_seat_${index}`, 'wood');
      
      // Chair back
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.05), chairMaterial.clone());
      chairBack.position.set(pos[0], pos[1] + 0.7, pos[2] + 0.175);
      this.addComponent(chairBack, `round_chair_back_${index}`, 'wood');
      
      // Chair legs
      for (let legIndex = 0; legIndex < 4; legIndex++) {
        const legX = pos[0] + (legIndex % 2 === 0 ? -0.15 : 0.15);
        const legZ = pos[2] + (legIndex < 2 ? -0.15 : 0.15);
        const chairLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), chairMaterial.clone());
        chairLeg.position.set(legX, pos[1] + 0.2, legZ);
        this.addComponent(chairLeg, `round_chair_leg_${index}_${legIndex}`, 'wood');
      }
    });
    
    // Rectangular table moved to right side near back wall
    const rectTable = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), tableMaterial.clone());
    rectTable.position.set(3.5, 0.9, -3.5);
    this.addComponent(rectTable, 'rect_table_top', 'wood');
    
    // Rectangular table legs (shifted positions)
    const rectLegPositions = [
      [2.5, 0.45, -4], [4.5, 0.45, -4], [2.5, 0.45, -3], [4.5, 0.45, -3]
    ];
    
    rectLegPositions.forEach((pos, index) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), tableMaterial.clone());
      leg.position.set(pos[0], pos[1], pos[2]);
      this.addComponent(leg, `rect_table_leg_${index}`, 'wood');
    });
  }

  private createTavernProps(): void {
    // Wooden mugs on tables
    const mugMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture(),
      roughness: 0.9
    });
    
    // Mugs on round table (adjusted for new table position)
    for (let i = 0; i < 3; i++) {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), mugMaterial.clone());
      const angle = (i / 3) * Math.PI * 2;
      mug.position.set(2 + Math.cos(angle) * 0.6, 1.06, -1 + Math.sin(angle) * 0.6);
      this.addComponent(mug, `table_mug_${i}`, 'wood');
      
      // Mug handle
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), mugMaterial.clone());
      handle.position.copy(mug.position);
      handle.position.x += 0.1;
      handle.rotation.z = Math.PI / 2;
      this.addComponent(handle, `table_mug_handle_${i}`, 'wood');
    }
    
    // Candles on tables
    const candleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFACD,
      emissive: 0x332211,
      emissiveIntensity: 0.3
    });
    
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8), candleMaterial);
    candle.position.set(-3.5, 1.08, -3.5);
    this.addComponent(candle, 'table_candle', 'fabric');
    
    // Candle holder
    const holderMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      metalness: 0.6,
      roughness: 0.4
    });
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 8), holderMaterial);
    holder.position.set(-3.5, 0.985, -3.5);
    this.addComponent(holder, 'candle_holder', 'metal');
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
    this.addComponent(benchSeat, 'wall_bench_seat', 'wood');
    
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 0.08), benchMaterial.clone());
    benchBack.position.set(1.5, 0.8, -5.8);
    this.addComponent(benchBack, 'wall_bench_back', 'wood');
    
    // Bench supports
    for (let i = 0; i < 3; i++) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), benchMaterial.clone());
      support.position.set(-0.5 + i * 2, 0.25, -5.5);
      this.addComponent(support, `bench_support_${i}`, 'wood');
    }
  }
  
  private createTavernKeeper(): void {
    if (!this.audioManager || !this.effectsManager) {
      console.warn('🏠 [TavernBuilding] AudioManager or EffectsManager not set. Cannot create tavern keeper.');
      return;
    }

    console.log('👤 [TavernBuilding] Creating tavern keeper NPC');
    
    // Position the tavern keeper near the bar area
    const keeperPosition = new THREE.Vector3(3, 0, 1);
    // Adjust position to be relative to tavern position
    keeperPosition.add(this.position);
    
    this.tavernKeeper = HumanNPC.createTavernKeeper(
      this.scene,
      keeperPosition,
      this.effectsManager,
      this.audioManager
    );
    
    console.log('👤 [TavernBuilding] Tavern keeper created successfully');
  }

  private createTavernChests(): void {
    console.log('💰 [TavernBuilding] Creating tavern chests - START');
    console.log('💰 [TavernBuilding] Tavern position:', this.position);
    console.log('💰 [TavernBuilding] ChestInteractionSystem available:', !!this.chestInteractionSystem);
    
    if (!this.chestInteractionSystem) {
      console.warn('💰 [TavernBuilding] ChestInteractionSystem not available, skipping chest creation');
      return;
    }
    
    // Create common chest near the table
    const commonChestPosition = this.position.clone().add(
      new THREE.Vector3(-4.5, 0, -3) // Near the table area
    );
    
    console.log('💰 [TavernBuilding] Common chest position:', commonChestPosition);
    
    const commonChest = this.chestInteractionSystem.createChest({
      type: 'common',
      position: commonChestPosition,
      id: `tavern_common_chest_${this.position.x.toFixed(0)}_${this.position.z.toFixed(0)}`
    });
    
    this.chests.push(commonChest);
    this.addComponent(commonChest.getGroup(), 'common_chest', 'wood');
    console.log('💰 [TavernBuilding] Common chest created successfully');
    
    // Create rare chest in corner
    const rareChestPosition = this.position.clone().add(
      new THREE.Vector3(4.5, 0, -4.5) // Corner position
    );
    
    console.log('💰 [TavernBuilding] Rare chest position:', rareChestPosition);
    
    const rareChest = this.chestInteractionSystem.createChest({
      type: 'rare',
      position: rareChestPosition,
      id: `tavern_rare_chest_${this.position.x.toFixed(0)}_${this.position.z.toFixed(0)}`
    });
    
    this.chests.push(rareChest);
    this.addComponent(rareChest.getGroup(), 'rare_chest', 'metal');
    console.log('💰 [TavernBuilding] Rare chest created successfully');
    
    console.log(`💰 [TavernBuilding] Tavern chest creation COMPLETE - ${this.chests.length} chest(s) created`);
  }

  public update(deltaTime: number): void {
    if (this.fireplaceComponent) {
      this.fireplaceComponent.update(deltaTime);
    }
    
    if (this.tavernKeeper) {
      // For now, update without player position (tavern keeper will wander on its own)
      this.tavernKeeper.update(deltaTime);
    }
    
    // Update chests
    this.chests.forEach(chest => {
      chest.update(deltaTime);
    });
  }
  
  public dispose(): void {
    if (this.fireplaceComponent) {
      this.fireplaceComponent.dispose();
      this.fireplaceComponent = null;
    }
    
    if (this.tavernKeeper) {
      this.tavernKeeper.dispose();
      this.tavernKeeper = null;
    }
    
    // Dispose chests
    this.chests.forEach(chest => {
      this.scene.remove(chest.getGroup());
      chest.dispose();
    });
    this.chests.length = 0;
    
    super.dispose();
  }
  
  protected getBuildingName(): string {
    return 'Tavern';
  }

  public getChests(): TreasureChest[] {
    return [...this.chests];
  }
}
