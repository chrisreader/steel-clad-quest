import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { DynamicCloudSpawningSystem } from '../systems/DynamicCloudSpawningSystem';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { PhysicsManager } from './PhysicsManager';
import { Level, TerrainConfig, TerrainFeature, LightingConfig } from '../../types/GameTypes';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { RingQuadrantSystem, RegionCoordinates, Region } from '../world/RingQuadrantSystem';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private environmentCollisionManager: EnvironmentCollisionManager;
  
  // Ring-quadrant world system
  private ringSystem: RingQuadrantSystem;
  private loadedRegions: Map<string, Region> = new Map();
  private renderDistance: number = 800; // How far to load terrain
  private debugMode: boolean = true; // Set to false for production
  
  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private tavernLight: THREE.PointLight;
  private rimLight: THREE.DirectionalLight;
  
  // Environment
  private currentLevel: Level | null = null;
  private skybox: THREE.Mesh | null = null;
  private ground: THREE.Mesh | null = null;
  
  // New 3D sun and cloud system
  private sun: THREE.Mesh | null = null;
  private cloudSpawningSystem: DynamicCloudSpawningSystem | null = null;
  
  // Distance-based fog system
  private fog: THREE.Fog;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Time of day
  private timeOfDay: number = 0.5; // 0-1, 0 = midnight, 0.5 = noon
  private dayNightCycleEnabled: boolean = false;
  private dayNightCycleSpeed: number = 0.001; // How quickly time passes
  
  // New enemy spawning system
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("SceneManager initialized with collision system");
    
    // Initialize ring-quadrant system
    this.ringSystem = new RingQuadrantSystem(new THREE.Vector3(0, 0, 0));
    
    // Setup distance-based fog
    this.setupDistanceFog();
    
    // Setup basic lighting
    this.setupLighting();
    
    // Add debug ring markers
    if (this.debugMode) {
      this.ringSystem.createDebugRingMarkers(this.scene);
    }
    
    // Initialize cloud spawning system
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(this.scene);
    
    // Initialize environment collision manager
    this.environmentCollisionManager = new EnvironmentCollisionManager(this.scene, this.physicsManager);
  }
  
  private setupDistanceFog(): void {
    // Create THREE.js fog for distance-based object fading
    const fogColor = 0xB0E0E6; // Atmospheric blue-white
    const fogNear = 35; // Start fading objects at this distance
    const fogFar = 120; // Objects completely faded at this distance
    
    this.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    this.scene.fog = this.fog;
    
    console.log("Distance-based fog system initialized:", {
      color: fogColor.toString(16),
      near: fogNear,
      far: fogFar
    });
  }
  
  private setupLighting(): void {
    // Ambient light - increased intensity for better visibility
    this.ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(this.ambientLight);
    console.log("Ambient light added with intensity 1.5");
    
    // Directional light (sun) - increased intensity
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(15, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02;
    this.scene.add(this.directionalLight);
    console.log("Directional light added at position:", this.directionalLight.position);
    
    // Tavern light (warm)
    this.tavernLight = new THREE.PointLight(0xffa500, 1.0, 25);
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = 512;
    this.tavernLight.shadow.mapSize.height = 512;
    this.scene.add(this.tavernLight);
    console.log("Tavern light added");
    
    // Rim light for atmosphere
    this.rimLight = new THREE.DirectionalLight(0xB0E0E6, 0.6);
    this.rimLight.position.set(-10, 5, -10);
    this.scene.add(this.rimLight);
    console.log("Rim light added");
  }
  
  private create3DSun(): void {
    // Calculate sun position based on directional light direction
    const lightDirection = this.directionalLight.position.clone().normalize();
    const sunDistance = 200; // Far away to appear on horizon
    
    // Create sun geometry
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC, // Cream color
      emissive: 0xFFD700, // Golden emissive
      emissiveIntensity: 0.3,
      fog: false // Don't let fog affect the sun
    });
    
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.position.copy(lightDirection.multiplyScalar(sunDistance));
    
    // Add subtle glow effect
    const glowGeometry = new THREE.SphereGeometry(12, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFAA,
      transparent: true,
      opacity: 0.2,
      fog: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sun.add(glow);
    
    this.scene.add(this.sun);
    console.log("3D sun created at position:", this.sun.position);
  }
  
  /**
   * Updates fog parameters based on player position (optional for dynamic adjustments)
   */
  public updateDistanceFog(playerPosition: THREE.Vector3): void {
    // Store player position for potential future fog adjustments
    this.lastPlayerPosition.copy(playerPosition);
    
    // The fog automatically works with THREE.js rendering pipeline
    // No manual updates needed as it's built into the renderer
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // Update cloud spawning system with player position
    if (this.cloudSpawningSystem && playerPosition) {
      console.log(`Updating cloud spawning system with player position: ${playerPosition.x.toFixed(2)}, ${playerPosition.y.toFixed(2)}, ${playerPosition.z.toFixed(2)}`);
      this.cloudSpawningSystem.update(deltaTime, playerPosition);
    } else if (this.cloudSpawningSystem) {
      // Fallback update without player position
      this.cloudSpawningSystem.update(deltaTime);
    }
    
    // Update enemy spawning system
    if (this.enemySpawningSystem && playerPosition) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }
    
    // NEW: Manage region loading/unloading based on player position
    if (playerPosition) {
      // Get regions that should be active
      const activeRegions = this.ringSystem.getActiveRegions(playerPosition, this.renderDistance);
      
      // Track current region keys for comparison
      const activeRegionKeys = new Set<string>();
      
      // Load new regions
      for (const region of activeRegions) {
        const regionKey = this.ringSystem.getRegionKey(region);
        activeRegionKeys.add(regionKey);
        
        if (!this.loadedRegions.has(regionKey)) {
          this.loadRegion(region);
        }
      }
      
      // Unload regions that are no longer active
      for (const [regionKey, region] of this.loadedRegions.entries()) {
        if (!activeRegionKeys.has(regionKey)) {
          this.unloadRegion(region.coordinates);
        }
      }
    }
    
    // Update stored player position if provided
    if (playerPosition) {
      this.lastPlayerPosition.copy(playerPosition);
    }
  }
  
  public createDefaultWorld(): void {
    console.log('Creating default world with ring-quadrant system...');
    
    // Create starting region (center ring, NE quadrant)
    const startRegion = { ringIndex: 0, quadrant: 0 };
    this.loadRegion(startRegion);
    
    // Place tavern at center
    this.createTavern();
    console.log('Tavern created at center');
    
    // Create some basic decoration around starting area
    this.createForestTrees(10);
    console.log('Forest trees created');
    
    this.createRocks(5);
    console.log('Rocks created');
    
    this.createBushes(15);
    console.log('Bushes created');
    
    // Create skybox
    this.createSkybox();
    console.log('Skybox created');
    
    // Create 3D sun
    this.create3DSun();
    console.log('3D sun created');
    
    // Initialize cloud spawning system
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.initialize();
      console.log('Dynamic cloud spawning system initialized');
    }
    
    // IMPORTANT: Register all environment objects for collision after creating the world
    this.environmentCollisionManager.registerEnvironmentCollisions();
    console.log('Environment collision system initialized');
    
    // Force update skybox to apply new realistic blue colors
    this.updateSkybox();
    console.log('Skybox updated with realistic blue colors');
    
    console.log('Default world creation complete with ring-quadrant system. Total scene children:', this.scene.children.length);
  }
  
  // NEW: Region management methods
  private loadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    // Skip if already loaded
    if (this.loadedRegions.has(regionKey)) return;
    
    console.log(`Loading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Get region center
    const centerPosition = this.ringSystem.getRegionCenter(region);
    
    // Create terrain for this region
    const terrain = this.createRegionTerrain(region, centerPosition);
    
    // Store region data
    const newRegion: Region = {
      coordinates: region,
      centerPosition,
      terrain,
      isLoaded: true
    };
    
    this.loadedRegions.set(regionKey, newRegion);
  }
  
  private unloadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const loadedRegion = this.loadedRegions.get(regionKey);
    
    if (!loadedRegion) return;
    
    console.log(`Unloading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Remove terrain
    if (loadedRegion.terrain) {
      this.scene.remove(loadedRegion.terrain);
      
      // Clean up geometry and materials
      if (loadedRegion.terrain.geometry) {
        loadedRegion.terrain.geometry.dispose();
      }
      
      if (loadedRegion.terrain.material) {
        if (Array.isArray(loadedRegion.terrain.material)) {
          loadedRegion.terrain.material.forEach(m => m.dispose());
        } else {
          loadedRegion.terrain.material.dispose();
        }
      }
    }
    
    // Remove from loaded regions
    this.loadedRegions.delete(regionKey);
  }
  
  // Create terrain for a specific region
  private createRegionTerrain(region: RegionCoordinates, centerPosition: THREE.Vector3): THREE.Mesh {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    // Calculate region size based on ring dimensions and quadrant (90-degree section)
    const innerRadius = ringDef.innerRadius;
    const outerRadius = ringDef.outerRadius;
    
    // Create a quarter-circle segment for the quadrant
    const terrainGeometry = this.createQuadrantGeometry(innerRadius, outerRadius, region.quadrant);
    
    // Create material with appropriate color for the ring
    const terrainMaterial = new THREE.MeshLambertMaterial({ 
      color: ringDef.terrainColor,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    
    // Add height variation
    this.addTerrainHeightVariation(terrainGeometry);
    
    // Create mesh
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2; // Make it horizontal
    terrain.position.copy(centerPosition);
    terrain.position.y = 0; // Ensure at ground level
    terrain.receiveShadow = true;
    
    // Add to scene
    this.scene.add(terrain);
    
    return terrain;
  }
  
  // Create quadrant geometry (quarter-circle segment)
  private createQuadrantGeometry(innerRadius: number, outerRadius: number, quadrant: number): THREE.BufferGeometry {
    // Create a custom geometry for the quadrant
    const geometry = new THREE.BufferGeometry();
    
    // Parameters for detail
    const radialSegments = 20; // Segments from inner to outer radius
    const heightSegments = 20; // Segments around the quadrant
    
    // Calculate start and end angles for this quadrant
    const startAngle = quadrant * Math.PI / 2;
    const endAngle = startAngle + Math.PI / 2;
    
    // Create vertices, uvs, and indices
    const vertices = [];
    const uvs = [];
    const indices = [];
    
    // Generate vertices
    for (let r = 0; r <= radialSegments; r++) {
      const radius = innerRadius + (outerRadius - innerRadius) * (r / radialSegments);
      
      for (let a = 0; a <= heightSegments; a++) {
        const angle = startAngle + (endAngle - startAngle) * (a / heightSegments);
        
        // Vertex
        vertices.push(
          Math.cos(angle) * radius, // x
          0,                       // y (height will be added later)
          Math.sin(angle) * radius  // z
        );
        
        // UV (simple mapping)
        uvs.push(
          r / radialSegments,
          a / heightSegments
        );
      }
    }
    
    // Generate indices
    for (let r = 0; r < radialSegments; r++) {
      for (let a = 0; a < heightSegments; a++) {
        const first = r * (heightSegments + 1) + a;
        const second = first + heightSegments + 1;
        
        // Two triangles per segment
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
    
    // Set attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    return geometry;
  }
  
  // Add height variation to terrain
  private addTerrainHeightVariation(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Add random height variation
    for (let i = 0; i < positions.length; i += 3) {
      // Keep y-coordinate at index i+1
      positions[i + 1] = Math.random() * 0.3 - 0.15;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  public createTavern(): void {
    const tavernGroup = new THREE.Group();
    
    // Tavern floor
    const tavernFloorGeometry = new THREE.PlaneGeometry(12, 12);
    const tavernFloorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture()
    });
    const tavernFloor = new THREE.Mesh(tavernFloorGeometry, tavernFloorMaterial);
    tavernFloor.rotation.x = -Math.PI / 2;
    tavernFloor.position.y = 0.01;
    tavernFloor.receiveShadow = true;
    tavernGroup.add(tavernFloor);
    
    // Tavern walls
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B7355,
      map: TextureGenerator.createStoneTexture()
    });
    const wallHeight = 6;
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(12, wallHeight, 0.3);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight/2, -6);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    tavernGroup.add(backWall);
    
    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(0.3, wallHeight, 12);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial.clone());
    leftWall.position.set(-6, wallHeight/2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    tavernGroup.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(leftWallGeometry, wallMaterial.clone());
    rightWall.position.set(6, wallHeight/2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    tavernGroup.add(rightWall);
    
    // Front walls with door
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight, 0.3), wallMaterial.clone());
    frontWallLeft.position.set(-3, wallHeight/2, 6);
    frontWallLeft.castShadow = true;
    frontWallLeft.receiveShadow = true;
    tavernGroup.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight, 0.3), wallMaterial.clone());
    frontWallRight.position.set(3, wallHeight/2, 6);
    frontWallRight.castShadow = true;
    frontWallRight.receiveShadow = true;
    tavernGroup.add(frontWallRight);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(9, 3, 8);
    const roofMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xCD5C5C,
      map: TextureGenerator.createStoneTexture()
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, wallHeight + 1.5, 0);
    roof.rotation.y = Math.PI / 8;
    roof.castShadow = true;
    tavernGroup.add(roof);
    
    // Furniture
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xDEB887,
      map: TextureGenerator.createWoodTexture()
    });
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1.5), tableMaterial);
    table.position.set(-2, 1, -2);
    table.castShadow = true;
    table.receiveShadow = true;
    tavernGroup.add(table);
    
    // Table legs
    const legMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xCD853F,
      map: TextureGenerator.createWoodTexture()
    });
    
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 8);
    
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -0.5; z <= 0.5; z += 1) {
        const leg = new THREE.Mesh(legGeometry, legMaterial.clone());
        leg.position.set(-2 + x, 0.5, -2 + z);
        leg.castShadow = true;
        tavernGroup.add(leg);
      }
    }
    
    this.scene.add(tavernGroup);
  }
  
  private createForestTrees(count: number): void {
    for (let i = 0; i < count; i++) {
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.6, 8, 12);
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B7355,
        map: TextureGenerator.createWoodTexture()
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      
      let x, z;
      do {
        x = (Math.random() - 0.5) * 80;
        z = (Math.random() - 0.5) * 80;
      } while (Math.sqrt(x * x + z * z) < 20 || (Math.abs(x) < 15 && Math.abs(z) < 15));
      
      trunk.position.set(x, 4, z);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      this.scene.add(trunk);
      
      // Tree leaves
      for (let layer = 0; layer < 3; layer++) {
        const leavesGeometry = new THREE.ConeGeometry(2.5 - layer * 0.3, 4, 8);
        const leavesColor = new THREE.Color().setHSL(0.3, 0.7, 0.5 + Math.random() * 0.3);
        const leavesMaterial = new THREE.MeshLambertMaterial({ 
          color: leavesColor,
          transparent: true,
          opacity: 0.9
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(x, 7 + layer * 1.5, z);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        this.scene.add(leaves);
      }
    }
  }
  
  private createRocks(count: number): void {
    for (let i = 0; i < count; i++) {
      const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 0.6 + 0.3, 1);
      const rockMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0, 0, 0.5 + Math.random() * 0.4),
        map: TextureGenerator.createStoneTexture()
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      let x, z;
      do {
        x = (Math.random() - 0.5) * 60;
        z = (Math.random() - 0.5) * 60;
      } while (Math.abs(x) < 10 && Math.abs(z) < 10);
      
      rock.position.set(x, Math.random() * 0.3 + 0.2, z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }
  
  private createBushes(count: number): void {
    for (let i = 0; i < count; i++) {
      const bushGeometry = new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 8, 6);
      const bushMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.25, 0.6, 0.45 + Math.random() * 0.3)
      });
      const bush = new THREE.Mesh(bushGeometry, bushMaterial);
      
      let x, z;
      do {
        x = (Math.random() - 0.5) * 50;
        z = (Math.random() - 0.5) * 50;
      } while (Math.abs(x) < 12 && Math.abs(z) < 12);
      
      bush.position.set(x, 0.4, z);
      bush.scale.y = 0.6;
      bush.castShadow = true;
      bush.receiveShadow = true;
      this.scene.add(bush);
    }
  }
  
  private createSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: TextureGenerator.createSkyTexture(this.timeOfDay),
      side: THREE.BackSide,
      fog: false
    });
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skybox);
  }
  
  /**
   * Updates the skybox texture with current time of day
   */
  public updateSkybox(): void {
    if (this.skybox) {
      const newSkyTexture = TextureGenerator.createSkyTexture(this.timeOfDay);
      
      if (this.skybox.material instanceof THREE.MeshBasicMaterial && this.skybox.material.map) {
        this.skybox.material.map.dispose();
      }
      
      if (this.skybox.material instanceof THREE.MeshBasicMaterial) {
        this.skybox.material.map = newSkyTexture;
        this.skybox.material.fog = false;
        this.skybox.material.needsUpdate = true;
      }
      
      console.log('Skybox texture updated with timeOfDay:', this.timeOfDay);
    }
  }
  
  /**
   * Sets the time of day and updates the skybox
   */
  public setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time)); // Clamp between 0 and 1
    this.updateSkybox();
  }
  
  // Legacy compatibility methods
  public loadLevel(levelName: string): void {
    console.log(`Loading level: ${levelName}`);
    this.clearScene();
    
    switch (levelName) {
      case 'tavern':
        this.loadTavernLevel();
        break;
      case 'forest':
        this.loadForestLevel();
        break;
      default:
        this.loadDefaultLevel();
    }
  }

  private clearScene(): void {
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => this.scene.remove(obj));
  }

  private loadTavernLevel(): void {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.addTavernFurniture();
  }

  private loadForestLevel(): void {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x228B22,
      map: TextureGenerator.createGrassTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.addTrees();
  }

  private loadDefaultLevel(): void {
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x90EE90,
      map: TextureGenerator.createGrassTexture()
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private addTavernFurniture(): void {
    const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: TextureGenerator.createWoodTexture()
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(3, 0.5, 0);
    table.castShadow = true;
    this.scene.add(table);

    for (let i = 0; i < 4; i++) {
      const chairGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
      const chairMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x654321,
        map: TextureGenerator.createWoodTexture()
      });
      const chair = new THREE.Mesh(chairGeometry, chairMaterial);
      const angle = (i / 4) * Math.PI * 2;
      chair.position.set(3 + Math.cos(angle) * 1.5, 0.5, Math.sin(angle) * 1.5);
      chair.castShadow = true;
      this.scene.add(chair);
    }
  }

  private addTrees(): void {
    for (let i = 0; i < 20; i++) {
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3);
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,
        map: TextureGenerator.createWoodTexture()
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

      const leavesGeometry = new THREE.SphereGeometry(1.5);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 2.5;

      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(leaves);

      tree.position.set(
        (Math.random() - 0.5) * 40,
        1.5,
        (Math.random() - 0.5) * 40
      );

      tree.castShadow = true;
      this.scene.add(tree);
    }
  }

  public getCurrentLevel(): string {
    return this.currentLevel?.name || 'default';
  }
  
  // Utility methods
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public dispose(): void {
    // Clean up fog
    this.scene.fog = null;
    
    // Dispose collision manager
    if (this.environmentCollisionManager) {
      this.environmentCollisionManager.dispose();
    }
    
    // Dispose cloud spawning system
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.dispose();
      this.cloudSpawningSystem = null;
    }
    
    // Clean up sun
    if (this.sun) {
      this.scene.remove(this.sun);
      if (this.sun.geometry) this.sun.geometry.dispose();
      if (this.sun.material instanceof THREE.Material) {
        this.sun.material.dispose();
      }
      this.sun = null;
    }
    
    // Dispose enemy spawning system
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
      this.enemySpawningSystem = null;
    }
    
    // Clean up loaded regions
    for (const [regionKey, region] of this.loadedRegions.entries()) {
      this.unloadRegion(region.coordinates);
    }
    this.loadedRegions.clear();
    
    console.log("SceneManager disposed with collision system cleanup");
  }
  
  public getEnvironmentCollisionManager(): EnvironmentCollisionManager {
    return this.environmentCollisionManager;
  }
}
