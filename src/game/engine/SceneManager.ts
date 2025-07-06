import * as THREE from 'three';
import { TextureGenerator, GroundMaterialUtils } from '../utils';
import { DynamicCloudSpawningSystem } from '../systems/DynamicCloudSpawningSystem';
import { EnvironmentCollisionManager } from '../systems/EnvironmentCollisionManager';
import { PhysicsManager } from './PhysicsManager';
import { Level, TerrainConfig, TerrainFeature, LightingConfig } from '../../types/GameTypes';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { BirdSpawningSystem } from '../systems/BirdSpawningSystem';
import { RingQuadrantSystem, RegionCoordinates, Region } from '../world/RingQuadrantSystem';
import { TerrainFeatureGenerator } from '../world/TerrainFeatureGenerator';
import { StructureGenerator } from '../world/StructureGenerator';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { Enemy } from '../entities/Enemy';
import { BuildingManager } from '../buildings/BuildingManager';
import { SafeZoneManager } from '../systems/SafeZoneManager';
import { VolumetricFogSystem } from '../effects/VolumetricFogSystem';
import { SkyboxSystem } from '../effects/SkyboxSystem';
import { ColorUtils } from '../utils/ColorUtils';
import { TimeUtils } from '../utils/TimeUtils';
import { TIME_PHASES, DAY_NIGHT_CONFIG, LIGHTING_CONFIG, FOG_CONFIG } from '../config/DayNightConfig';
import { CelestialGlowShader } from '../effects/CelestialGlowShader';
import { GrassSystem } from '../vegetation/GrassSystem';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private environmentCollisionManager: EnvironmentCollisionManager;
  
  // Camera reference for sun direction calculations
  private camera: THREE.PerspectiveCamera | null = null;
  
  // Ring-quadrant world system
  private ringSystem: RingQuadrantSystem;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private structureGenerator: StructureGenerator;
  private loadedRegions: Map<string, Region> = new Map();
  private renderDistance: number = 800;
  private debugMode: boolean = true;
  
  // Building management system
  private buildingManager: BuildingManager;
  
  // 3D grass system
  private grassSystem: GrassSystem;
  
  // Enhanced lighting system for realistic shadows
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private tavernLight: THREE.PointLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  
  // Dynamic shadow system
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Environment
  private currentLevel: Level | null = null;
  private ground: THREE.Mesh | null = null;
  
  // Enhanced 3D sun, moon and star system with shader-based glow
  private sun: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private cloudSpawningSystem: DynamicCloudSpawningSystem | null = null;
  
  // Shader-based glow systems
  private sunGlow: THREE.Mesh | null = null;
  private moonGlow: THREE.Mesh | null = null;
  private sunGlowMaterial: THREE.ShaderMaterial | null = null;
  private moonGlowMaterial: THREE.ShaderMaterial | null = null;
  
  // Skybox system
  private skyboxSystem: SkyboxSystem;
  
  // Distance-based fog system
  private fog: THREE.Fog;
  
  // Enhanced time of day system (1-minute cycle)
  private timeOfDay: number = 0.25;
  private dayNightCycleEnabled: boolean = true;
  
  // Enemy spawning system
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  
  // Bird spawning system
  private birdSpawningSystem: BirdSpawningSystem | null = null;
  
  // Volumetric fog system
  private volumetricFogSystem: VolumetricFogSystem | null = null;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("SceneManager initialized with shader-based celestial glow system");
    
    // Initialize ring-quadrant system
    this.ringSystem = new RingQuadrantSystem(new THREE.Vector3(0, 0, 0));
    
    // Initialize terrain feature generator
    this.terrainFeatureGenerator = new TerrainFeatureGenerator(this.ringSystem, this.scene);
    
    // Initialize structure generator with PhysicsManager
    this.structureGenerator = new StructureGenerator(this.ringSystem, this.scene, this.physicsManager);
    
    // Initialize building manager
    this.buildingManager = new BuildingManager(this.scene, this.physicsManager);
    
    // Connect StructureGenerator with BuildingManager
    this.structureGenerator.setBuildingManager(this.buildingManager);
    
    // Initialize 3D grass system
    this.grassSystem = new GrassSystem(this.scene);
    console.log("🌱 3D Grass system initialized");
    
    // Initialize skybox system
    this.skyboxSystem = new SkyboxSystem(this.scene);
    
    // Setup distance-based fog with visible fog layer
    this.setupEnhancedFog();
    
    // Setup enhanced lighting with improved night visibility
    this.setupDayNightLighting();
    
    // Initialize volumetric fog system with horizon blocking
    this.volumetricFogSystem = new VolumetricFogSystem(this.scene);
    console.log("VolumetricFogSystem initialized");
    
    // Add debug ring markers
    if (this.debugMode) {
      this.ringSystem.createDebugRingMarkers(this.scene);
    }
    
    // Initialize cloud spawning system
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(this.scene);
    
    // Initialize bird spawning system
    this.birdSpawningSystem = new BirdSpawningSystem(this.scene);
    console.log('🐦 [SceneManager] Bird spawning system initialized');
    
    // Initialize environment collision manager
    this.environmentCollisionManager = new EnvironmentCollisionManager(this.scene, this.physicsManager);
    
    // Set up collision registration callback
    this.terrainFeatureGenerator.setCollisionRegistrationCallback((object: THREE.Object3D) => {
      this.environmentCollisionManager.registerSingleObject(object);
    });
    console.log('🔧 Simplified collision system established');
  }

  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    console.log("📹 [SceneManager] Camera reference set for sun glow calculations");
  }

  public initializeWithAudioManager(audioManager: AudioManager): void {
    this.buildingManager.setAudioManager(audioManager);
    console.log('🔊 SceneManager: AudioManager connected to BuildingManager for enhanced fire effects');
  }

  private setupEnhancedFog(): void {
    const fogColor = ColorUtils.getSynchronizedFogColorForTime(
      this.timeOfDay, 
      TIME_PHASES, 
      () => this.getMoonElevationFactor()
    );
    
    this.fog = new THREE.Fog(fogColor, FOG_CONFIG.near, FOG_CONFIG.far);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(fogColor);
    
    console.log("Simplified fog system initialized");
  }
  
  private getMoonElevationFactor(): number {
    if (!this.moon) return 0.5;
    
    const moonElevation = this.moon.position.y / DAY_NIGHT_CONFIG.moonRadius;
    const elevationFactor = Math.max(0.3, Math.max(0, moonElevation));
    
    return elevationFactor;
  }
  
  private setupDayNightLighting(): void {
    this.ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.ambient.color, 
      TimeUtils.getSynchronizedAmbientIntensityForTime(
        this.timeOfDay, 
        TIME_PHASES, 
        () => this.getMoonElevationFactor()
      )
    );
    this.scene.add(this.ambientLight);
    console.log("Simplified ambient lighting initialized");
    
    // Main directional light (sun) - position will be updated dynamically
    this.directionalLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.directional.color, 
      LIGHTING_CONFIG.directional.intensity
    );
    this.directionalLight.castShadow = true;
    
    // Enhanced shadow settings
    this.directionalLight.shadow.mapSize.width = LIGHTING_CONFIG.directional.shadowMapSize;
    this.directionalLight.shadow.mapSize.height = LIGHTING_CONFIG.directional.shadowMapSize;
    this.directionalLight.shadow.camera.left = -DAY_NIGHT_CONFIG.shadowCameraSize;
    this.directionalLight.shadow.camera.right = DAY_NIGHT_CONFIG.shadowCameraSize;
    this.directionalLight.shadow.camera.top = DAY_NIGHT_CONFIG.shadowCameraSize;
    this.directionalLight.shadow.camera.bottom = -DAY_NIGHT_CONFIG.shadowCameraSize;
    this.directionalLight.shadow.camera.far = LIGHTING_CONFIG.directional.shadowCameraFar;
    this.directionalLight.shadow.bias = LIGHTING_CONFIG.directional.shadowBias;
    this.directionalLight.shadow.normalBias = LIGHTING_CONFIG.directional.shadowNormalBias;
    this.directionalLight.shadow.camera.near = LIGHTING_CONFIG.directional.shadowCameraNear;
    
    this.scene.add(this.directionalLight);
    console.log("Dynamic sun lighting system initialized");
    
    // Moon directional light with much higher intensity for visibility
    this.moonLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.moon.color, 
      LIGHTING_CONFIG.moon.baseIntensity
    );
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);
    console.log("Simplified moon lighting initialized");
    
    // Fill light with day/night control
    this.fillLight = new THREE.DirectionalLight(LIGHTING_CONFIG.fill.color, 0.0);
    this.fillLight.position.set(
      LIGHTING_CONFIG.fill.position.x, 
      LIGHTING_CONFIG.fill.position.y, 
      LIGHTING_CONFIG.fill.position.z
    );
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);
    
    // Tavern light with much higher nighttime intensity
    this.tavernLight = new THREE.PointLight(
      LIGHTING_CONFIG.tavern.color, 
      LIGHTING_CONFIG.tavern.intensity, 
      LIGHTING_CONFIG.tavern.distance
    );
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = LIGHTING_CONFIG.tavern.shadowMapSize;
    this.tavernLight.shadow.mapSize.height = LIGHTING_CONFIG.tavern.shadowMapSize;
    this.tavernLight.shadow.bias = LIGHTING_CONFIG.tavern.shadowBias;
    this.scene.add(this.tavernLight);
    
    // Rim light with day/night control
    this.rimLight = new THREE.DirectionalLight(LIGHTING_CONFIG.rim.color, 0.0);
    this.rimLight.position.set(
      LIGHTING_CONFIG.rim.position.x, 
      LIGHTING_CONFIG.rim.position.y, 
      LIGHTING_CONFIG.rim.position.z
    );
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
    
    console.log("Simplified lighting system initialized");
  }
  
  private create3DSunAndMoon(): void {
    // Create sun with enhanced shader-based glow
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      emissive: 0xFFD700,
      emissiveIntensity: 0.2,
      fog: false
    });
    
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Create shader-based sun glow
    this.createShaderSunGlow();
    this.scene.add(this.sun);
    
    // Create moon with enhanced shader-based glow
    const moonGeometry = new THREE.SphereGeometry(6, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      emissive: 0x444444,
      emissiveIntensity: 0.1,
      fog: false
    });
    
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Create shader-based moon glow
    this.createShaderMoonGlow();
    this.scene.add(this.moon);
    
    // Initial positioning
    this.updateSunAndMoonPositions();
    
    console.log("3D sun and moon created with shader-based atmospheric glow system");
  }

  private createShaderSunGlow(): void {
    if (!this.sun) return;
    
    // Clean up existing glow
    if (this.sunGlow) {
      this.sun.remove(this.sunGlow);
      if (this.sunGlowMaterial) {
        this.sunGlowMaterial.dispose();
      }
      this.sunGlow.geometry.dispose();
    }
    
    // Create shader-based glow with larger plane for smooth edge falloff
    const glowGeometry = new THREE.PlaneGeometry(120, 120);
    this.sunGlowMaterial = CelestialGlowShader.createGlowMaterial(
      0.6,  // size - controls falloff radius
      0.4,  // intensity
      new THREE.Color(0xFFD700), // golden color
      0.3,  // atmospheric density
      1.8   // falloff power for smooth transition
    );
    
    this.sunGlow = new THREE.Mesh(glowGeometry, this.sunGlowMaterial);
    
    // Position glow to always face camera
    this.sunGlow.renderOrder = -1; // Render behind other objects
    this.sun.add(this.sunGlow);
    
    console.log("Shader-based sun glow created with expanded plane and edge falloff");
  }

  private createShaderMoonGlow(): void {
    if (!this.moon) return;
    
    // Clean up existing glow
    if (this.moonGlow) {
      this.moon.remove(this.moonGlow);
      if (this.moonGlowMaterial) {
        this.moonGlowMaterial.dispose();
      }
      this.moonGlow.geometry.dispose();
    }
    
    // Create shader-based moon glow with larger plane for smooth edge falloff
    const glowGeometry = new THREE.PlaneGeometry(100, 100);
    this.moonGlowMaterial = CelestialGlowShader.createGlowMaterial(
      0.7,  // size - slightly larger falloff for moon
      0.5,  // intensity
      new THREE.Color(0xB0C4DE), // steel blue color
      0.2,  // atmospheric density
      2.2   // falloff power for softer transition
    );
    
    this.moonGlow = new THREE.Mesh(glowGeometry, this.moonGlowMaterial);
    
    // Position glow to always face camera
    this.moonGlow.renderOrder = -1; // Render behind other objects
    this.moon.add(this.moonGlow);
    
    console.log("Shader-based moon glow created with expanded plane and edge falloff");
  }

  private updateCelestialGlow(): void {
    if (!this.sun || !this.moon || !this.sunGlowMaterial || !this.moonGlowMaterial) return;
    
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const moonAngle = sunAngle + Math.PI;
    
    // Update sun glow based on elevation and atmospheric conditions
    const sunElevation = Math.sin(sunAngle);
    const sunVisible = sunElevation > -0.1;
    
    if (sunVisible && this.sunGlow) {
      // Enhanced atmospheric scattering at horizon
      const atmosphericFactor = 1.0 + (1.0 - Math.abs(sunElevation)) * 1.2;
      const baseIntensity = Math.max(0.1, sunElevation * 0.6 + 0.4);
      
      // Dynamic size based on elevation (larger at horizon)
      const glowSize = 0.6 + (1.0 - Math.abs(sunElevation)) * 0.3;
      
      // Color temperature shift for sunrise/sunset
      let glowColor = new THREE.Color(0xFFD700);
      if (sunElevation < 0.3) {
        glowColor = new THREE.Color(0xFF8844); // Warmer orange at horizon
      }
      
      CelestialGlowShader.updateGlowMaterial(
        this.sunGlowMaterial,
        glowSize,
        baseIntensity * atmosphericFactor * 0.8,
        glowColor,
        0.3 + atmosphericFactor * 0.2,
        1.8,
        this.timeOfDay * 10 // time for subtle animation
      );
      
      this.sunGlow.visible = true;
      
      // Make glow face camera
      if (this.camera) {
        this.sunGlow.lookAt(this.camera.position);
      }
    } else if (this.sunGlow) {
      this.sunGlow.visible = false;
    }
    
    // Update moon glow based on elevation and phase
    const moonElevation = Math.sin(moonAngle);
    const moonVisible = moonElevation > -0.1;
    const moonElevationFactor = this.getMoonElevationFactor();
    
    if (moonVisible && this.moonGlow) {
      const baseIntensity = Math.max(0.2, moonElevation * 0.4 + 0.6);
      const elevationBoost = 1.0 + moonElevationFactor * 0.8;
      
      // Larger glow size for moon's softer atmospheric effect
      const glowSize = 0.7 + moonElevationFactor * 0.2;
      
      CelestialGlowShader.updateGlowMaterial(
        this.moonGlowMaterial,
        glowSize,
        baseIntensity * elevationBoost * 0.6,
        new THREE.Color(0xB0C4DE),
        0.2 + moonElevationFactor * 0.1,
        2.2,
        this.timeOfDay * 8 // slower animation for moon
      );
      
      this.moonGlow.visible = true;
      
      // Make glow face camera
      if (this.camera) {
        this.moonGlow.lookAt(this.camera.position);
      }
    } else if (this.moonGlow) {
      this.moonGlow.visible = false;
    }
  }
  
  private createStarField(): void {
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      const radius = 300;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      
      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.sin(phi);
      
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = Math.abs(y);
      starPositions[i * 3 + 2] = z;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2,
      transparent: true,
      opacity: 0.8,
      fog: false
    });
    
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
    
    console.log("Star field created with", starCount, "stars");
  }
  
  private updateSunAndMoonPositions(): void {
    if (!this.sun || !this.moon) return;
    
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const moonAngle = sunAngle + Math.PI;
    
    // Calculate sun position
    const sunHeight = Math.sin(sunAngle) * DAY_NIGHT_CONFIG.sunRadius;
    const sunX = Math.cos(sunAngle) * DAY_NIGHT_CONFIG.sunRadius;
    const sunY = Math.max(sunHeight, -50);
    
    this.sun.position.set(sunX, sunY, 0);
    
    // Calculate moon position
    const moonHeight = Math.sin(moonAngle) * DAY_NIGHT_CONFIG.moonRadius;
    const moonX = Math.cos(moonAngle) * DAY_NIGHT_CONFIG.moonRadius;
    const moonY = Math.max(moonHeight, -50);
    
    this.moon.position.set(moonX, moonY, 0);
    
    // Update directional lights to follow sun and moon
    this.directionalLight.position.copy(this.sun.position);
    this.moonLight.position.copy(this.moon.position);
    
    // Update light targets
    if (!this.directionalLight.target) {
      this.directionalLight.target = new THREE.Object3D();
      this.scene.add(this.directionalLight.target);
    }
    if (!this.moonLight.target) {
      this.moonLight.target = new THREE.Object3D();
      this.scene.add(this.moonLight.target);
    }
    
    this.directionalLight.target.position.set(0, 0, 0);
    this.moonLight.target.position.set(0, 0, 0);
    
    // Sun shadows only when sun is above horizon
    const sunIntensity = Math.max(0, Math.sin(sunAngle)) * 1.2;
    this.directionalLight.intensity = sunIntensity;
    this.directionalLight.castShadow = sunY > 0;
    
    // Reduced moon intensity with elevation variation
    const moonIntensity = Math.max(0, Math.sin(moonAngle)) * 0.12;
    this.moonLight.intensity = moonIntensity;
    
    // Update sun and moon visibility
    this.sun.visible = sunY > -10;
    this.moon.visible = moonY > -10;
  }
  
  private updateStarVisibility(): void {
    if (!this.stars) return;
    
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const starOpacity = Math.max(0, -Math.sin(sunAngle)) * 0.8;
    
    (this.stars.material as THREE.PointsMaterial).opacity = starOpacity;
  }
  
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
  
  public getBirds(): any[] {
    if (this.birdSpawningSystem) {
      return this.birdSpawningSystem.getAllLivingBirds();
    }
    return [];
  }
  
  public updateDistanceFog(playerPosition: THREE.Vector3): void {
    this.lastPlayerPosition.copy(playerPosition);
    this.updateShadowCamera(playerPosition);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (this.dayNightCycleEnabled) {
      this.timeOfDay += deltaTime * DAY_NIGHT_CONFIG.cycleSpeed;
      if (this.timeOfDay >= 1.0) {
        this.timeOfDay -= 1.0;
      }
      
      this.updateSunAndMoonPositions();
      this.updateCelestialGlow(); // Now uses shader-based glow system
      this.updateSynchronizedDayNightLighting();
      this.updateStarVisibility();
      this.updateSynchronizedFogForTime();
      
      // Update skybox system with proper player position and moon elevation
      if (playerPosition) {
        this.skyboxSystem.update(this.timeOfDay, playerPosition);
        
        // Update moon elevation in skybox
        if (this.skyboxSystem.skyboxMaterial && this.skyboxSystem.skyboxMaterial.uniforms) {
          this.skyboxSystem.skyboxMaterial.uniforms.moonElevation.value = this.getMoonElevationFactor();
        }
      }
    }
    
    if (this.cloudSpawningSystem && playerPosition) {
      this.cloudSpawningSystem.update(deltaTime, playerPosition);
    } else if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.update(deltaTime);
    }
    
    if (this.enemySpawningSystem && playerPosition) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }
    
    // Update bird spawning system
    if (this.birdSpawningSystem && playerPosition) {
      this.birdSpawningSystem.update(deltaTime, playerPosition);
    }
    
    // Update 3D grass system with game time for day/night color changes
    if (this.grassSystem && playerPosition) {
      this.grassSystem.update(deltaTime, playerPosition, this.timeOfDay);
    }
    
    // Update tree foliage materials for day/night lighting
    if (this.terrainFeatureGenerator && this.timeOfDay !== undefined) {
      const dayFactor = TimeUtils.getDayFactor(this.timeOfDay, TIME_PHASES);
      const nightFactor = TimeUtils.getSynchronizedNightFactor(this.timeOfDay, TIME_PHASES);
      this.terrainFeatureGenerator.updateTreeDayNightLighting(dayFactor, nightFactor);
    }
    
    if (playerPosition) {
      this.updateShadowCamera(playerPosition);
      
      const activeRegions = this.ringSystem.getActiveRegions(playerPosition, this.renderDistance);
      const activeRegionKeys = new Set<string>();
      
      for (const region of activeRegions) {
        const regionKey = this.ringSystem.getRegionKey(region);
        activeRegionKeys.add(regionKey);
        
        if (!this.loadedRegions.has(regionKey)) {
          this.loadRegion(region);
        }
      }
      
      for (const [regionKey, region] of this.loadedRegions.entries()) {
        if (!activeRegionKeys.has(regionKey)) {
          this.unloadRegion(region.coordinates);
        }
      }
    }
    
    if (playerPosition) {
      this.lastPlayerPosition.copy(playerPosition);
    }
    
    if (this.volumetricFogSystem && playerPosition) {
      this.volumetricFogSystem.update(deltaTime, this.timeOfDay, playerPosition);
    }
  }
  
  private updateSynchronizedDayNightLighting(): void {
    this.ambientLight.intensity = TimeUtils.getSynchronizedAmbientIntensityForTime(
      this.timeOfDay, 
      TIME_PHASES, 
      () => this.getMoonElevationFactor()
    );
    
    const dayFactor = TimeUtils.getDayFactor(this.timeOfDay, TIME_PHASES);
    this.fillLight.intensity = 0.4 * dayFactor;
    this.rimLight.intensity = 0.5 * dayFactor;
    
    const moonElevation = this.getMoonElevationFactor();
    const nightFactor = TimeUtils.getSynchronizedNightFactor(this.timeOfDay, TIME_PHASES);
    
    // Enhanced tavern lighting during darker phases
    const currentPhase = TimeUtils.getCurrentPhase(this.timeOfDay, TIME_PHASES);
    let tavernIntensity = 0.8;
    
    if (currentPhase === 'civilTwilight' || currentPhase === 'nauticalTwilight' || currentPhase === 'astronomicalTwilight' || currentPhase === 'night') {
      tavernIntensity = 1.5 + (1.5 * nightFactor) + (0.8 * moonElevation * nightFactor);
    }
    
    this.tavernLight.intensity = tavernIntensity;
    
    const lightColor = ColorUtils.getSynchronizedLightColorForTime(this.timeOfDay, TIME_PHASES);
    this.directionalLight.color.copy(lightColor);
    
    // Enhanced moon lighting with proper color temperature
    this.moonLight.color.setHex(0x6495ED);
    const moonIntensity = Math.max(0.15, Math.sin((this.timeOfDay - 0.25) * Math.PI * 2 + Math.PI)) * (0.5 + 0.4 * moonElevation);
    this.moonLight.intensity = moonIntensity;
  }
  
  private updateSynchronizedFogForTime(): void {
    const newFogColor = ColorUtils.getSynchronizedFogColorForTime(
      this.timeOfDay, 
      TIME_PHASES, 
      () => this.getMoonElevationFactor()
    );
    this.fog.color.setHex(newFogColor);
    this.scene.background = new THREE.Color(newFogColor);
    
    const currentPhase = TimeUtils.getCurrentPhase(this.timeOfDay, TIME_PHASES);
    console.log(`Sky system synchronized - Phase: ${currentPhase}, Time: ${(this.timeOfDay * 24).toFixed(1)}h, Color: #${newFogColor.toString(16).padStart(6, '0')}`);
  }

  public setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    console.log(`Time set to: ${(this.timeOfDay * 24).toFixed(1)} hours`);
  }
  
  public getTimeOfDay(): number {
    return this.timeOfDay;
  }
  
  public getTimePhases(): any {
    return TIME_PHASES;
  }
  
  public toggleDayNightCycle(): void {
    this.dayNightCycleEnabled = !this.dayNightCycleEnabled;
    console.log(`Day/night cycle: ${this.dayNightCycleEnabled ? 'enabled' : 'disabled'}`);
  }
  
  public setCycleSpeed(speed: number): void {
    console.log(`Day/night cycle speed set to: ${speed} (${60/speed} seconds per cycle)`);
  }

  public createDefaultWorld(): void {
    console.log('Creating default world with enhanced terrain and 3D grass system...');
    
    console.log('Skipped simple ground creation to prevent Z-fighting');
    
    const startRegion = { ringIndex: 0, quadrant: 0 };
    this.loadRegion(startRegion);
    console.log('🔧 Starting region loaded with proper terrain');
    
    this.buildingManager.createBuilding({
      type: 'tavern',
      position: new THREE.Vector3(0, 0, 0)
    });
    console.log('🏗️ Tavern created using BuildingManager');
    
    this.structureGenerator.createTestHill(20, 0, 30, 15, 8);
    console.log('Test hill created for shadow testing');
    
    // Initialize skybox with initial time
    this.skyboxSystem.update(this.timeOfDay, new THREE.Vector3(0, 0, 0));
    console.log('SkyboxSystem initialized and updated');
    
    this.create3DSunAndMoon();
    console.log('3D sun and moon created with shader-based atmospheric glow');
    
    this.createStarField();
    console.log('Star field created');
    
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.initialize();
      console.log('Dynamic cloud spawning system initialized');
    }
    
    this.updateSynchronizedDayNightLighting();
    this.updateStarVisibility();
    
    console.log('🔧 Registering environment collisions...');
    this.environmentCollisionManager.registerEnvironmentCollisions();
    console.log('🔧 Environment collision system initialized');
    
    console.log('World with enhanced terrain and 3D grass system complete. Current time:', (this.timeOfDay * 24).toFixed(1), 'hours');
    
    if (this.debugMode) {
      (window as any).sceneDebug = {
        setTime: (time: number) => this.setTimeOfDay(time / 24),
        toggleCycle: () => this.toggleDayNightCycle(),
        setSpeed: (speed: number) => this.setCycleSpeed(speed),
        getCurrentTime: () => (this.timeOfDay * 24).toFixed(1) + ' hours',
        getMoonElevation: () => this.getMoonElevationFactor().toFixed(2),
        // NEW: Realistic biome debugging
        getBiomeAt: (x: number, z: number) => {
          const { DeterministicBiomeManager } = require('../vegetation/biomes/DeterministicBiomeManager');
          return DeterministicBiomeManager.getDebugBiomeInfo(new THREE.Vector3(x, 0, z));
        },
        getSeedPoints: () => {
          const { BiomeSeedManager } = require('../vegetation/biomes/BiomeSeedManager');
          return BiomeSeedManager.getDebugInfo();
        },
        clearBiomeCache: () => {
          const { DeterministicBiomeManager } = require('../vegetation/biomes/DeterministicBiomeManager');
          DeterministicBiomeManager.clearCache();
          console.log('🌍 Biome cache cleared - new realistic biomes will generate');
        }
      };
      console.log('Debug commands available: sceneDebug.setTime(hour), sceneDebug.toggleCycle(), sceneDebug.setSpeed(speed), sceneDebug.getMoonElevation()');
      console.log('🌍 NEW Biome debug: sceneDebug.getBiomeAt(x, z), sceneDebug.getSeedPoints(), sceneDebug.clearBiomeCache()');
    }
  }

  private loadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    
    if (this.loadedRegions.has(regionKey)) return;
    
    console.log(`Loading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    const centerPosition = this.ringSystem.getRegionCenter(region);
    const terrain = this.createRegionTerrain(region, centerPosition);
    
    const newRegion: Region = {
      coordinates: region,
      centerPosition,
      terrain,
      isLoaded: true
    };
    
    this.loadedRegions.set(regionKey, newRegion);
    this.terrainFeatureGenerator.generateFeaturesForRegion(region);
    this.structureGenerator.generateStructuresForRegion(region);
    
    // Generate 3D grass for this region - PASS CURRENT PLAYER POSITION
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    const regionSize = region.ringIndex === 0 ? ringDef.outerRadius * 2 : 100;
    
    // Use lastPlayerPosition as current player position for grass generation
    this.grassSystem.generateGrassForRegion(
      region, 
      centerPosition, 
      regionSize, 
      ringDef.terrainColor,
      this.lastPlayerPosition.clone() // NEW: Pass current player position
    );
    console.log(`🌱 3D grass generated for region ${regionKey} using current player position`);
  }
  
  private unloadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const loadedRegion = this.loadedRegions.get(regionKey);
    
    if (!loadedRegion) return;
    
    console.log(`Unloading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    this.structureGenerator.cleanupStructuresForRegion(region);
    this.terrainFeatureGenerator.cleanupFeaturesForRegion(region);
    
    // Remove 3D grass for this region
    this.grassSystem.removeGrassForRegion(region);
    
    if (loadedRegion.terrain) {
      this.scene.remove(loadedRegion.terrain);
      
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
    
    this.loadedRegions.delete(regionKey);
  }
  
  private createRegionTerrain(region: RegionCoordinates, centerPosition: THREE.Vector3): THREE.Mesh {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    let terrainGeometry: THREE.BufferGeometry;
    let terrainPosition: THREE.Vector3;
    let terrainSize: number;
    
    if (region.ringIndex === 0) {
      // Center ring uses circular geometry that properly covers the spawn area
      terrainSize = ringDef.outerRadius * 2; // Diameter for full coverage
      terrainGeometry = new THREE.CircleGeometry(ringDef.outerRadius, 32);
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log(`Creating center ring terrain with radius ${ringDef.outerRadius} for full spawn coverage`);
    } else {
      // Outer rings use larger quadrant sizes to ensure proper coverage
      const innerRadius = ringDef.innerRadius;
      const outerRadius = ringDef.outerRadius;
      terrainSize = (outerRadius - innerRadius) * 1.2; // 20% larger for overlap
      terrainGeometry = this.createQuadrantGeometry(innerRadius, outerRadius, region.quadrant);
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log(`Creating ring ${region.ringIndex} quadrant ${region.quadrant} with enhanced coverage`);
    }
    
    // Check for smooth transitions and create appropriate material
    const center = this.ringSystem.getRegionCenter(region);
    const transitionInfo = this.ringSystem.getTransitionInfo(center);
    
    let terrainMaterial: THREE.MeshStandardMaterial;
    
    // Increased minimum blend threshold to prevent rapid switching
    const MIN_BLEND_THRESHOLD = 0.2;
    
    if (transitionInfo.isInTransition && transitionInfo.blendFactor > MIN_BLEND_THRESHOLD) {
      console.log(`🌈 Creating blended material for ring ${region.ringIndex} with blend factor ${transitionInfo.blendFactor.toFixed(2)}`);
      
      // Create blended material for smooth transitions
      terrainMaterial = GroundMaterialUtils.createBlendedGrassMaterial(
        this.ringSystem.getRingDefinition(transitionInfo.fromRing).terrainColor,
        this.ringSystem.getRingDefinition(transitionInfo.toRing).terrainColor,
        transitionInfo.blendFactor,
        region.ringIndex
      );
    } else {
      console.log(`🌱 Creating standard grass material for ring ${region.ringIndex}`);
      
      // Standard ring material with realistic grass
      terrainMaterial = GroundMaterialUtils.createGrassMaterial(
        ringDef.terrainColor,
        region.ringIndex,
        {
          roughness: 0.8,
          metalness: 0.1,
          textureScale: 3
        }
      );
    }
    
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.copy(terrainPosition);
    
    // Enhanced Y-offset system to prevent Z-fighting completely
    const baseYOffset = 0.01; // Base level separation
    const ringOffset = region.ringIndex * 0.005; // Ring-based separation
    const quadrantOffset = region.quadrant * 0.002; // Quadrant micro-separation
    terrain.position.y = baseYOffset + ringOffset + quadrantOffset;
    
    terrain.receiveShadow = true;
    
    this.scene.add(terrain);
    
    console.log(`✅ Enhanced terrain created for ring ${region.ringIndex}, quadrant ${region.quadrant} at Y-offset: ${terrain.position.y.toFixed(4)}`);
    
    return terrain;
  }
  
  private createQuadrantGeometry(innerRadius: number, outerRadius: number, quadrant: number): THREE.BufferGeometry {
    const quadrantAngles = [
      { start: 0, end: Math.PI / 2 },
      { start: Math.PI / 2, end: Math.PI },
      { start: Math.PI, end: 3 * Math.PI / 2 },
      { start: 3 * Math.PI / 2, end: 2 * Math.PI }
    ];
    
    const angles = quadrantAngles[quadrant];
    const radialSegments = 16;
    const ringSegments = 1;
    
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    for (let j = 0; j <= ringSegments; j++) {
      const radius = innerRadius + (outerRadius - innerRadius) * (j / ringSegments);
      
      for (let i = 0; i <= radialSegments; i++) {
        const angle = angles.start + (angles.end - angles.start) * (i / radialSegments);
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0;
        
        vertices.push(x, y, z);
        
        const u = i / radialSegments;
        const v = j / ringSegments;
        uvs.push(u, v);
      }
    }
    
    for (let j = 0; j < ringSegments; j++) {
      for (let i = 0; i < radialSegments; i++) {
        const a = (radialSegments + 1) * j + i;
        const b = (radialSegments + 1) * (j + 1) + i;
        const c = (radialSegments + 1) * (j + 1) + i + 1;
        const d = (radialSegments + 1) * j + i + 1;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    geometry.computeVertexNormals();
    
    console.log(`Created quadrant ${quadrant} geometry in XY plane with ${vertices.length / 3} vertices and ${indices.length / 3} triangles`);
    
    return geometry;
  }

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
  
  public getSafeZoneManager(): SafeZoneManager | null {
    return this.buildingManager.getSafeZoneManager();
  }
  
  public dispose(): void {
    this.scene.fog = null;
    
    if (this.skyboxSystem) {
      this.skyboxSystem.dispose();
    }
    
    if (this.environmentCollisionManager) {
      this.environmentCollisionManager.dispose();
    }
    
    if (this.buildingManager) {
      this.buildingManager.dispose();
    }
    
    if (this.structureGenerator) {
      this.structureGenerator.dispose();
    }
    
    if (this.terrainFeatureGenerator) {
      this.terrainFeatureGenerator.dispose();
    }
    
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.dispose();
      this.cloudSpawningSystem = null;
    }
    
    if (this.volumetricFogSystem) {
      this.volumetricFogSystem.dispose();
      this.volumetricFogSystem = null;
    }
    
    // Dispose 3D grass system
    if (this.grassSystem) {
      this.grassSystem.dispose();
    }
    
    // Dispose shader-based glow systems
    if (this.sunGlowMaterial) {
      this.sunGlowMaterial.dispose();
      this.sunGlowMaterial = null;
    }
    
    if (this.moonGlowMaterial) {
      this.moonGlowMaterial.dispose();
      this.moonGlowMaterial = null;
    }
    
    if (this.sun) {
      if (this.sunGlow) {
        this.sun.remove(this.sunGlow);
        this.sunGlow.geometry.dispose();
        this.sunGlow = null;
      }
      
      this.scene.remove(this.sun);
      if (this.sun.geometry) this.sun.geometry.dispose();
      if (this.sun.material instanceof THREE.Material) {
        this.sun.material.dispose();
      }
      this.sun = null;
    }
    
    if (this.moon) {
      if (this.moonGlow) {
        this.moon.remove(this.moonGlow);
        this.moonGlow.geometry.dispose();
        this.moonGlow = null;
      }
      
      this.scene.remove(this.moon);
      if (this.moon.geometry) this.moon.geometry.dispose();
      if (this.moon.material instanceof THREE.Material) {
        this.moon.material.dispose();
      }
      this.moon = null;
    }
    
    if (this.stars) {
      this.scene.remove(this.stars);
      if (this.stars.geometry) this.stars.geometry.dispose();
      if (this.stars.material instanceof THREE.Material) {
        this.stars.material.dispose();
      }
      this.stars = null;
    }
    
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
      this.enemySpawningSystem = null;
    }
    
    if (this.birdSpawningSystem) {
      this.birdSpawningSystem.dispose();
      this.birdSpawningSystem = null;
    }
    
    for (const [regionKey, region] of this.loadedRegions.entries()) {
      this.unloadRegion(region.coordinates);
    }
    this.loadedRegions.clear();
    
    console.log("SceneManager with 3D grass system disposed");
  }
  
  public getEnvironmentCollisionManager(): EnvironmentCollisionManager {
    return this.environmentCollisionManager;
  }

  public getBuildingManager(): BuildingManager {
    return this.buildingManager;
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public updateShadowCamera(playerPosition: THREE.Vector3): void {
    const distanceMoved = this.lastPlayerPosition.distanceTo(playerPosition);
    
    if (distanceMoved > DAY_NIGHT_CONFIG.shadowUpdateThreshold || this.lastPlayerPosition.length() === 0) {
      const shadowCamera = this.directionalLight.shadow.camera;
      const expandedSize = DAY_NIGHT_CONFIG.shadowCameraSize * 1.2;
      
      shadowCamera.left = playerPosition.x - expandedSize;
      shadowCamera.right = playerPosition.x + expandedSize;
      shadowCamera.top = playerPosition.z + expandedSize;
      shadowCamera.bottom = playerPosition.z - expandedSize;
      
      shadowCamera.updateProjectionMatrix();
      
      if (!this.directionalLight.target) {
        this.directionalLight.target = new THREE.Object3D();
        this.scene.add(this.directionalLight.target);
      }
      
      const targetPosition = playerPosition.clone();
      const hillPosition = new THREE.Vector3(20, 0, 30);
      const toHill = hillPosition.clone().sub(playerPosition).normalize().multiplyScalar(10);
      targetPosition.add(toHill);
      
      this.directionalLight.target.position.copy(targetPosition);
      this.lastPlayerPosition.copy(playerPosition);
      
      console.log(`Simplified shadow camera updated for position: ${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)} with dynamic sun tracking`);
    }
  }
}
