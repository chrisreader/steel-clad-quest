import * as THREE from 'three';
import { TextureGenerator } from '../utils';
import { DynamicCloudSpawningSystem } from '../systems/DynamicCloudSpawningSystem';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { PhysicsManager } from './PhysicsManager';
import { Level, TerrainConfig, TerrainFeature, LightingConfig } from '../../types/GameTypes';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { RingQuadrantSystem, RegionCoordinates, Region } from '../world/RingQuadrantSystem';
import { TerrainFeatureGenerator } from '../world/TerrainFeatureGenerator';
import { StructureGenerator } from '../world/StructureGenerator';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { Enemy } from '../entities/Enemy';
import { BuildingManager } from '../buildings/BuildingManager';
import { SafeZoneManager } from '../systems/SafeZoneManager';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private environmentCollisionManager: EnvironmentCollisionManager;
  
  // Ring-quadrant world system
  private ringSystem: RingQuadrantSystem;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private structureGenerator: StructureGenerator;
  private loadedRegions: Map<string, Region> = new Map();
  private renderDistance: number = 800; // How far to load terrain
  private debugMode: boolean = true; // Set to false for production
  
  // NEW: Building management system
  private buildingManager: BuildingManager;
  
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
    
    // Initialize terrain feature generator
    this.terrainFeatureGenerator = new TerrainFeatureGenerator(this.ringSystem, this.scene);
    
    // Initialize structure generator with PhysicsManager
    this.structureGenerator = new StructureGenerator(this.ringSystem, this.scene, this.physicsManager);
    
    // NEW: Initialize building manager
    this.buildingManager = new BuildingManager(this.scene, this.physicsManager);
    
    // NEW: Connect StructureGenerator with BuildingManager
    this.structureGenerator.setBuildingManager(this.buildingManager);
    
    // Setup distance-based fog with visible fog layer
    this.setupEnhancedFog();
    
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
    
    // Set up collision registration callback BEFORE any regions are loaded
    this.terrainFeatureGenerator.setCollisionRegistrationCallback((object: THREE.Object3D) => {
      this.environmentCollisionManager.registerSingleObject(object);
    });
    console.log('🔧 Collision registration callback established between TerrainFeatureGenerator and EnvironmentCollisionManager');
  }

  private setupEnhancedFog(): void {
    // Enhanced fog system with visible fog layer and atmospheric depth
    const fogColor = 0xB0E0E6; // Atmospheric blue-white
    const fogNear = 25; // Start fading objects closer for denser effect
    const fogFar = 80; // Objects completely faded closer for wall effect
    
    // Create THREE.js fog for distance-based object fading
    this.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    this.scene.fog = this.fog;
    
    // Set scene background to fog color to create visible fog layer
    this.scene.background = new THREE.Color(fogColor);
    
    console.log("Enhanced dense fog system initialized:", {
      color: fogColor.toString(16),
      near: fogNear,
      far: fogFar,
      background: "fog color for dense wall effect"
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
  
  private createSkybox(): void {
    // Create a skybox with enhanced dense fog wall at horizon
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    
    // Enhanced dense fog wall shader for complete horizon obscuration
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4A90E2) }, // Clear sky blue
        horizonColor: { value: new THREE.Color(0xB0E0E6) }, // Atmospheric haze (matches fog)
        groundColor: { value: new THREE.Color(0xE8F4F8) }, // Very light fog color
        fogWallColor: { value: new THREE.Color(0xD0E8E8) }, // Dense fog wall color
        exponent: { value: 0.3 }, // Very gradual transition for higher fog extend
        horizonHeight: { value: 0.0 }, // Height of horizon line
        atmosphericDensity: { value: 6.0 }, // Stronger atmospheric effect
        fogDistance: { value: 80.0 }, // Match fog far distance
        fogIntensity: { value: 0.98 }, // Near-complete opacity at horizon
        fogWallDensity: { value: 0.95 }, // Dense fog wall opacity
        horizonFogThickness: { value: 0.6 }, // Thicker fog layer
        atmosphericExtend: { value: 0.8 }, // How high the atmospheric effect extends
        fogWallHeight: { value: 0.4 }, // How high the dense fog wall extends
        blurIntensity: { value: 0.9 }, // Strong blur effect
        layeredFogStrength: { value: 0.8 } // Multiple fog layer strength
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vDistance;
        varying float vHeightFactor;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          
          // Calculate distance from camera for atmospheric effect
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDistance = length(mvPosition.xyz);
          
          // Calculate normalized height factor (-1 to 1, where -1 is bottom, 1 is top)
          vec3 direction = normalize(worldPosition.xyz);
          vHeightFactor = direction.y;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 groundColor;
        uniform vec3 fogWallColor;
        uniform float exponent;
        uniform float horizonHeight;
        uniform float atmosphericDensity;
        uniform float fogDistance;
        uniform float fogIntensity;
        uniform float fogWallDensity;
        uniform float horizonFogThickness;
        uniform float atmosphericExtend;
        uniform float fogWallHeight;
        uniform float blurIntensity;
        uniform float layeredFogStrength;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vDistance;
        varying float vHeightFactor;
        
        void main() {
          // Normalize the world position to get direction
          vec3 direction = normalize(vWorldPosition);
          
          // Calculate height factor (y component of normalized direction)
          float height = direction.y;
          
          // Create DENSE fog wall at horizon - much more aggressive
          float horizonDistance = abs(height); // Distance from horizon
          
          // Primary dense fog wall that completely obscures horizon
          float fogWall = 1.0 - smoothstep(0.0, fogWallHeight, horizonDistance);
          fogWall = pow(fogWall, 0.8); // Sharp but not too harsh falloff
          
          // Secondary fog layer for extended coverage
          float fogLayer = 1.0 - smoothstep(0.0, horizonFogThickness, horizonDistance);
          fogLayer = pow(fogLayer, 1.2); // Slightly softer falloff for blending
          
          // Tertiary atmospheric layer for even higher extension
          float atmosphericLayer = 1.0 - smoothstep(0.0, atmosphericExtend, horizonDistance);
          atmosphericLayer = pow(atmosphericLayer, atmosphericDensity);
          
          // Create main gradient from top to horizon
          float gradientFactor = (height + 1.0) * 0.5; // Normalize to 0-1
          gradientFactor = pow(gradientFactor, exponent);
          
          // Start with base sky color gradient
          vec3 skyColor = mix(horizonColor, topColor, gradientFactor);
          
          // Apply dense fog wall first (strongest effect)
          vec3 denseWallColor = mix(fogWallColor, groundColor, gradientFactor * 0.1);
          skyColor = mix(denseWallColor, skyColor, 1.0 - fogWall * fogWallDensity);
          
          // Apply secondary fog layer
          vec3 secondaryFogColor = mix(groundColor, horizonColor, gradientFactor * 0.2);
          skyColor = mix(secondaryFogColor, skyColor, 1.0 - fogLayer * fogIntensity);
          
          // Apply atmospheric layer for height extension
          vec3 atmosphericColor = mix(groundColor, horizonColor, gradientFactor * 0.4);
          skyColor = mix(atmosphericColor, skyColor, 1.0 - atmosphericLayer * layeredFogStrength);
          
          // Enhanced horizon blur effect with much higher intensity
          float horizonBlur = 1.0 - smoothstep(0.0, 0.5, abs(height));
          horizonBlur = pow(horizonBlur, 1.5);
          vec3 blurColor = mix(fogWallColor, groundColor, 0.3); // More opaque blur
          skyColor = mix(skyColor, blurColor, horizonBlur * blurIntensity);
          
          // Distance-based atmospheric perspective for depth
          float distanceFactor = min(vDistance / fogDistance, 1.0);
          skyColor = mix(skyColor, fogWallColor, distanceFactor * 0.6);
          
          // Additional dense base layer near horizon line
          float baseLayer = 1.0 - smoothstep(0.0, 0.15, abs(height));
          baseLayer = pow(baseLayer, 0.5);
          vec3 baseLayerColor = mix(fogWallColor, groundColor, 0.1);
          skyColor = mix(skyColor, baseLayerColor, baseLayer * 0.85);
          
          // Final atmospheric haze overlay
          float finalHaze = 1.0 - smoothstep(0.0, 0.7, abs(height));
          finalHaze = pow(finalHaze, 2.5);
          vec3 hazeColor = mix(fogWallColor, horizonColor, 0.6);
          skyColor = mix(skyColor, hazeColor, finalHaze * 0.4);
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      fog: false // Don't let THREE.js fog affect the skybox
    });
    
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skybox);
    console.log('Enhanced dense fog wall skybox created with complete horizon obscuration');
  }
  
  private updateSkybox(): void {
    if (!this.skybox || !this.skybox.material) return;
    
    // Update skybox with enhanced dense fog wall parameters
    const material = this.skybox.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      // Ensure colors create proper fog wall effect
      material.uniforms.topColor.value.setHex(0x4A90E2); // Clear sky blue
      material.uniforms.horizonColor.value.setHex(0xB0E0E6); // Match fog color exactly
      material.uniforms.groundColor.value.setHex(0xE8F4F8); // Very light fog
      material.uniforms.fogWallColor.value.setHex(0xD0E8E8); // Dense fog wall
      
      // Enhanced parameters for dense fog wall
      material.uniforms.exponent.value = 0.3; // Very gradual transition
      material.uniforms.atmosphericDensity.value = 6.0; // Stronger effect
      material.uniforms.fogDistance.value = this.fog ? this.fog.far : 80.0; // Match fog distance
      material.uniforms.fogIntensity.value = 0.98; // Near-complete opacity
      material.uniforms.fogWallDensity.value = 0.95; // Dense wall opacity
      material.uniforms.horizonFogThickness.value = 0.6; // Thicker layer
      material.uniforms.atmosphericExtend.value = 0.8; // High extension
      material.uniforms.fogWallHeight.value = 0.4; // Dense wall height
      material.uniforms.blurIntensity.value = 0.9; // Strong blur
      material.uniforms.layeredFogStrength.value = 0.8; // Layered effect
      
      material.needsUpdate = true;
    }
    console.log('Skybox updated with enhanced dense fog wall effect completely obscuring horizon');
  }
  
  // NEW: Enemy spawning methods that GameEngine expects
  public initializeEnemySpawning(effectsManager: EffectsManager, audioManager: AudioManager): void {
    if (!this.enemySpawningSystem) {
      this.enemySpawningSystem = new DynamicEnemySpawningSystem(
        this.scene,
        effectsManager,
        audioManager
      );
      console.log("Enemy spawning system initialized");
    }
  }
  
  public startEnemySpawning(playerPosition: THREE.Vector3): void {
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.initialize(playerPosition);
      console.log("Enemy spawning started at player position:", playerPosition);
    }
  }
  
  public getEnemies(): Enemy[] {
    if (this.enemySpawningSystem) {
      return this.enemySpawningSystem.getEnemies();
    }
    return [];
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
    console.log('Creating default world with enhanced dense fog wall effect...');
    
    // Create simple ground plane at origin as fallback
    this.createSimpleGround();
    console.log('Simple ground plane created at origin');
    
    // Create starting region (center ring, NE quadrant)
    const startRegion = { ringIndex: 0, quadrant: 0 };
    this.loadRegion(startRegion);
    console.log('🔧 Starting region loaded');
    
    // NEW: Create tavern using BuildingManager
    this.buildingManager.createBuilding({
      type: 'tavern',
      position: new THREE.Vector3(0, 0, 0)
    });
    console.log('🏗️ Tavern created using BuildingManager');
    
    // Create test hill
    this.structureGenerator.createTestHill(20, 0, 30, 15, 8);
    console.log('Test hill created at (20, 0, 30) for slope walking testing');
    
    // Create enhanced dense fog wall skybox FIRST
    this.createSkybox();
    console.log('Enhanced dense fog wall skybox created');
    
    // Create 3D sun
    this.create3DSun();
    console.log('3D sun created');
    
    // Initialize cloud spawning system
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.initialize();
      console.log('Dynamic cloud spawning system initialized');
    }
    
    // Force update skybox to apply enhanced foggy horizon effects
    this.updateSkybox();
    console.log('Skybox updated with enhanced foggy horizon gradient');
    
    // Register environment collisions AFTER everything is created
    console.log('🔧 Registering environment collisions after all objects created...');
    this.environmentCollisionManager.registerEnvironmentCollisions();
    console.log('🔧 Environment collision system initialized (after all objects created)');
    
    console.log('Default world creation complete with enhanced dense fog wall effect. Total scene children:', this.scene.children.length);
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
    
    // Generate terrain features for this region
    this.terrainFeatureGenerator.generateFeaturesForRegion(region);
    
    // Generate structures for this region
    this.structureGenerator.generateStructuresForRegion(region);
  }
  
  // NEW: Manual collision registration for region features
  private registerCollisionForRegionFeatures(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const spawnedFeatures = this.terrainFeatureGenerator.getSpawnedFeaturesForRegion(regionKey);
    
    if (spawnedFeatures) {
      let registeredCount = 0;
      spawnedFeatures.forEach(feature => {
        this.environmentCollisionManager.registerSingleObject(feature);
        registeredCount++;
      });
      console.log(`🔧 Manually registered ${registeredCount} features for collision in region ${regionKey}`);
    }
  }
  
  private unloadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const loadedRegion = this.loadedRegions.get(regionKey);
    
    if (!loadedRegion) return;
    
    console.log(`Unloading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    // Clean up structures first
    this.structureGenerator.cleanupStructuresForRegion(region);
    
    // Clean up terrain features
    this.terrainFeatureGenerator.cleanupFeaturesForRegion(region);
    
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
  
  // Add simple ground plane at origin as safety measure
  private createSimpleGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x5FAD5F,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Make it horizontal
    ground.position.set(0, 0, 0); // At world origin
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  
  // Create terrain for a specific region
  private createRegionTerrain(region: RegionCoordinates, centerPosition: THREE.Vector3): THREE.Mesh {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    let terrainGeometry: THREE.BufferGeometry;
    let terrainPosition: THREE.Vector3;
    
    // Handle center ring differently - create full circle at origin
    if (region.ringIndex === 0) {
      // For center ring, create a simple circle at the origin
      terrainGeometry = new THREE.CircleGeometry(ringDef.outerRadius, 32);
      terrainPosition = new THREE.Vector3(0, 0, 0); // Always at world origin
      console.log('Creating center ring terrain at origin');
    } else {
      // For outer rings, create quadrant segments positioned correctly in world space
      const innerRadius = ringDef.innerRadius;
      const outerRadius = ringDef.outerRadius;
      terrainGeometry = this.createQuadrantGeometry(innerRadius, outerRadius, region.quadrant);
      // Don't offset the position since geometry is already in world coordinates
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log(`Creating ring ${region.ringIndex} quadrant ${region.quadrant} with geometry in world coordinates`);
    }
    
    // Create material with appropriate color for the ring
    const terrainMaterial = new THREE.MeshLambertMaterial({ 
      color: ringDef.terrainColor,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    
    // Add height variation only for outer rings
    if (region.ringIndex > 0) {
      this.addTerrainHeightVariation(terrainGeometry);
    }
    
    // Create mesh
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2; // Make it horizontal
    terrain.position.copy(terrainPosition);
    terrain.position.y = 0; // Ensure at ground level
    terrain.receiveShadow = true;
    
    // Add to scene
    this.scene.add(terrain);
    
    return terrain;
  }
  
  // Create quadrant geometry using XY plane (like CircleGeometry)
  private createQuadrantGeometry(innerRadius: number, outerRadius: number, quadrant: number): THREE.BufferGeometry {
    // Define quadrant angles (in radians)
    const quadrantAngles = [
      { start: 0, end: Math.PI / 2 },           // NE: 0° to 90°
      { start: Math.PI / 2, end: Math.PI },     // SE: 90° to 180°
      { start: Math.PI, end: 3 * Math.PI / 2 }, // SW: 180° to 270°
      { start: 3 * Math.PI / 2, end: 2 * Math.PI } // NW: 270° to 360°
    ];
    
    const angles = quadrantAngles[quadrant];
    const radialSegments = 16; // Number of segments in the quadrant
    const ringSegments = 1; // We only need one ring segment for each quadrant
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // FIXED: Generate vertices in XY plane (like CircleGeometry does)
    for (let j = 0; j <= ringSegments; j++) {
      const radius = innerRadius + (outerRadius - innerRadius) * (j / ringSegments);
      
      for (let i = 0; i <= radialSegments; i++) {
        const angle = angles.start + (angles.end - angles.start) * (i / radialSegments);
        
        // CORRECTED: Create in XY plane to match CircleGeometry behavior
        const x = Math.cos(angle) * radius;  // X coordinate
        const y = Math.sin(angle) * radius;  // Y coordinate (NOT Z!)
        const z = 0;                         // Z is always 0 in XY plane
        
        // Push vertices in XY plane format (matches CircleGeometry)
        vertices.push(x, y, z);
        
        // Generate UV coordinates
        const u = i / radialSegments;
        const v = j / ringSegments;
        uvs.push(u, v);
      }
    }
    
    // Generate indices for triangles
    for (let j = 0; j < ringSegments; j++) {
      for (let i = 0; i < radialSegments; i++) {
        const a = (radialSegments + 1) * j + i;
        const b = (radialSegments + 1) * (j + 1) + i;
        const c = (radialSegments + 1) * (j + 1) + i + 1;
        const d = (radialSegments + 1) * j + i + 1;
        
        // Create two triangles for each quad
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    // Compute normals for proper lighting
    geometry.computeVertexNormals();
    
    console.log(`Created quadrant ${quadrant} geometry in XY plane with ${vertices.length / 3} vertices and ${indices.length / 3} triangles`);
    
    return geometry;
  }
  
  // Add height variation to Z coordinate (since we're in XY plane before rotation)
  private addTerrainHeightVariation(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position.array as Float32Array;
    
    // Add random height variation to Z coordinate (since we're in XY plane before rotation)
    for (let i = 0; i < positions.length; i += 3) {
      // CORRECTED: Modify Z coordinate (index i+2) instead of Y coordinate
      positions[i + 2] = Math.random() * 0.3 - 0.15;  // Add height variation to Z
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
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
  
  // NEW: Safe zone management
  public getSafeZoneManager(): SafeZoneManager | null {
    return this.buildingManager.getSafeZoneManager();
  }
  
  public dispose(): void {
    // Clean up fog
    this.scene.fog = null;
    
    // Dispose collision manager
    if (this.environmentCollisionManager) {
      this.environmentCollisionManager.dispose();
    }
    
    // NEW: Dispose building manager
    if (this.buildingManager) {
      this.buildingManager.dispose();
    }
    
    // Dispose structure generator
    if (this.structureGenerator) {
      this.structureGenerator.dispose();
    }
    
    // Dispose terrain feature generator
    if (this.terrainFeatureGenerator) {
      this.terrainFeatureGenerator.dispose();
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

  // NEW: Get building manager
  public getBuildingManager(): BuildingManager {
    return this.buildingManager;
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
}
