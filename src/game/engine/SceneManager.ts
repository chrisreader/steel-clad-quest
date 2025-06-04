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
import { VolumetricFogSystem } from '../effects/VolumetricFogSystem';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private environmentCollisionManager: EnvironmentCollisionManager;
  
  // Ring-quadrant world system
  private ringSystem: RingQuadrantSystem;
  private terrainFeatureGenerator: TerrainFeatureGenerator;
  private structureGenerator: StructureGenerator;
  private loadedRegions: Map<string, Region> = new Map();
  private renderDistance: number = 800;
  private debugMode: boolean = true;
  
  // Building management system
  private buildingManager: BuildingManager;
  
  // Enhanced lighting system for realistic shadows
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private tavernLight: THREE.PointLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  
  // Dynamic shadow system
  private shadowCameraSize: number = 200;
  private lastPlayerPosition: THREE.Vector3 = new THREE.Vector3();
  private shadowUpdateThreshold: number = 10;
  
  // Environment
  private currentLevel: Level | null = null;
  private skybox: THREE.Mesh | null = null;
  private ground: THREE.Mesh | null = null;
  
  // Enhanced 3D sun, moon and star system
  private sun: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private cloudSpawningSystem: DynamicCloudSpawningSystem | null = null;
  
  // Distance-based fog system
  private fog: THREE.Fog;
  
  // Enhanced time of day system (1-minute cycle)
  private timeOfDay: number = 0.25;
  private dayNightCycleEnabled: boolean = true;
  private dayNightCycleSpeed: number = 1 / 60;
  private sunRadius: number = 150;
  private moonRadius: number = 140;
  
  // NEW: Time phases for different lighting
  private readonly TIME_PHASES = {
    SUNRISE: 0.25,
    NOON: 0.5,
    SUNSET: 0.75,
    MIDNIGHT: 0.0
  };
  
  // Enemy spawning system
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  
  // NEW: Volumetric fog system
  private volumetricFogSystem: VolumetricFogSystem | null = null;
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("SceneManager initialized with day/night cycle system");
    
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
    
    // Setup distance-based fog with visible fog layer
    this.setupEnhancedFog();
    
    // Setup enhanced lighting with day/night cycle
    this.setupDayNightLighting();
    
    // Initialize volumetric fog system with horizon blocking
    this.volumetricFogSystem = new VolumetricFogSystem(this.scene);
    console.log("VolumetricFogSystem with horizon blocking initialized");
    
    // Add debug ring markers
    if (this.debugMode) {
      this.ringSystem.createDebugRingMarkers(this.scene);
    }
    
    // Initialize cloud spawning system
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(this.scene);
    
    // Initialize environment collision manager
    this.environmentCollisionManager = new EnvironmentCollisionManager(this.scene, this.physicsManager);
    
    // Set up collision registration callback
    this.terrainFeatureGenerator.setCollisionRegistrationCallback((object: THREE.Object3D) => {
      this.environmentCollisionManager.registerSingleObject(object);
    });
    console.log('🔧 Day/night cycle collision system established');
  }

  private setupEnhancedFog(): void {
    // Enhanced fog system that changes color based on time of day
    const fogColor = this.getSmoothFogColorForTime(this.timeOfDay);
    const fogNear = 25;
    const fogFar = 120; // Increased for better volumetric fog blending
    
    this.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(fogColor);
    
    console.log("Enhanced day/night fog system initialized with smooth color transitions");
  }
  
  private lerpColor(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
    const result = new THREE.Color();
    result.lerpColors(color1, color2, Math.max(0, Math.min(1, factor)));
    return result;
  }
  
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  
  // UPDATED: Completely smooth fog color transitions using continuous interpolation
  private getSmoothFogColorForTime(time: number): number {
    const normalizedTime = time % 1;
    
    // Define key colors for smooth interpolation
    const keyColors = {
      midnight: new THREE.Color(0x000030),    // Deep night
      dawn: new THREE.Color(0xFF6B35),        // Orange dawn
      noon: new THREE.Color(0x87CEEB),        // Sky blue
      sunset: new THREE.Color(0xFF8C42),      // Orange sunset
      dusk: new THREE.Color(0x4B0082)         // Purple dusk
    };
    
    // Use smooth sine-based interpolation for seamless transitions
    const timeAngle = normalizedTime * Math.PI * 2;
    
    // Create smooth color progression using weighted blending
    let resultColor: THREE.Color;
    
    if (normalizedTime <= 0.2) {
      // Midnight to dawn (0.0 - 0.2)
      const factor = Math.sin((normalizedTime / 0.2) * Math.PI * 0.5);
      resultColor = this.lerpColor(keyColors.midnight, keyColors.dawn, factor);
    } else if (normalizedTime <= 0.5) {
      // Dawn to noon (0.2 - 0.5)
      const factor = Math.sin(((normalizedTime - 0.2) / 0.3) * Math.PI * 0.5);
      resultColor = this.lerpColor(keyColors.dawn, keyColors.noon, factor);
    } else if (normalizedTime <= 0.8) {
      // Noon to sunset (0.5 - 0.8)
      const factor = Math.sin(((normalizedTime - 0.5) / 0.3) * Math.PI * 0.5);
      resultColor = this.lerpColor(keyColors.noon, keyColors.sunset, factor);
    } else {
      // Sunset to midnight (0.8 - 1.0)
      const factor = Math.sin(((normalizedTime - 0.8) / 0.2) * Math.PI * 0.5);
      const duskToMidnight = this.lerpColor(keyColors.sunset, keyColors.dusk, Math.min(factor * 2, 1));
      resultColor = this.lerpColor(duskToMidnight, keyColors.midnight, Math.max(0, (factor - 0.5) * 2));
    }
    
    return resultColor.getHex();
  }
  
  private setupDayNightLighting(): void {
    // Enhanced ambient light that varies with time - now using smooth transitions
    this.ambientLight = new THREE.AmbientLight(0x404040, this.getSmoothAmbientIntensityForTime(this.timeOfDay));
    this.scene.add(this.ambientLight);
    console.log("Day/night ambient light system initialized with smooth transitions");
    
    // Main directional light (sun) - position will be updated dynamically
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.castShadow = true;
    
    // Enhanced shadow settings
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.left = -this.shadowCameraSize;
    this.directionalLight.shadow.camera.right = this.shadowCameraSize;
    this.directionalLight.shadow.camera.top = this.shadowCameraSize;
    this.directionalLight.shadow.camera.bottom = -this.shadowCameraSize;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.bias = -0.00005;
    this.directionalLight.shadow.normalBias = 0.003;
    this.directionalLight.shadow.camera.near = 0.1;
    
    this.scene.add(this.directionalLight);
    console.log("Dynamic sun lighting system initialized");
    
    // NEW: Moon directional light
    this.moonLight = new THREE.DirectionalLight(0xB0C4DE, 0.3);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);
    console.log("Moon lighting system initialized");
    
    // Enhanced fill light for better coverage
    this.fillLight = new THREE.DirectionalLight(0xB0E0E6, 0.4);
    this.fillLight.position.set(-10, 15, -10);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);
    
    // Tavern light - becomes more prominent at night
    this.tavernLight = new THREE.PointLight(0xffa500, 0.8, 30);
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = 1024;
    this.tavernLight.shadow.mapSize.height = 1024;
    this.tavernLight.shadow.bias = -0.00005;
    this.scene.add(this.tavernLight);
    
    // Rim light for atmospheric effect
    this.rimLight = new THREE.DirectionalLight(0xB0E0E6, 0.5);
    this.rimLight.position.set(-12, 8, -12);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
    
    console.log("Complete day/night lighting system initialized with smooth transitions");
  }
  
  // UPDATED: Smooth ambient intensity using continuous sine curve
  private getSmoothAmbientIntensityForTime(time: number): number {
    const normalizedTime = time % 1;
    
    // Use smooth sine curve for natural day/night intensity variation
    const dayAngle = (normalizedTime - 0.25) * Math.PI * 2; // Offset so noon is at peak
    const sineValue = Math.sin(dayAngle);
    
    // Map sine curve to intensity range with smooth easing
    const minIntensity = 0.8;   // Night minimum
    const maxIntensity = 2.0;   // Day maximum
    
    // Apply smooth curve mapping
    const normalizedValue = (sineValue + 1) * 0.5; // Convert from [-1,1] to [0,1]
    const easedValue = normalizedValue * normalizedValue * (3 - 2 * normalizedValue); // Smooth step
    
    return minIntensity + (maxIntensity - minIntensity) * easedValue;
  }
  
  private create3DSunAndMoon(): void {
    // Create sun
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFF8DC,
      emissive: 0xFFD700,
      emissiveIntensity: 0.5,
      fog: false
    });
    
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Add sun glow effect
    const sunGlowGeometry = new THREE.SphereGeometry(12, 16, 16);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFAA,
      transparent: true,
      opacity: 0.3,
      fog: false
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    this.sun.add(sunGlow);
    
    this.scene.add(this.sun);
    
    // NEW: Create moon
    const moonGeometry = new THREE.SphereGeometry(6, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      emissive: 0x444444,
      emissiveIntensity: 0.1,
      fog: false
    });
    
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Add subtle moon glow
    const moonGlowGeometry = new THREE.SphereGeometry(9, 16, 16);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xB0C4DE,
      transparent: true,
      opacity: 0.2,
      fog: false
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    this.moon.add(moonGlow);
    
    this.scene.add(this.moon);
    
    // Initial positioning
    this.updateSunAndMoonPositions();
    
    console.log("3D sun and moon created with dynamic positioning");
  }
  
  // NEW: Create star field for night sky
  private createStarField(): void {
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    
    // Generate random star positions on a sphere
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
  
  // NEW: Update sun and moon positions based on time of day
  private updateSunAndMoonPositions(): void {
    if (!this.sun || !this.moon) return;
    
    // Convert time of day to angle (0 = midnight, 0.5 = noon)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const moonAngle = sunAngle + Math.PI;
    
    // Calculate sun position (rises in east +X, sets in west -X)
    const sunHeight = Math.sin(sunAngle) * this.sunRadius;
    const sunX = Math.cos(sunAngle) * this.sunRadius;
    const sunY = Math.max(sunHeight, -50);
    
    this.sun.position.set(sunX, sunY, 0);
    
    // Calculate moon position (opposite to sun)
    const moonHeight = Math.sin(moonAngle) * this.moonRadius;
    const moonX = Math.cos(moonAngle) * this.moonRadius;
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
    
    // UPDATED: Smooth light intensity transitions
    const sunIntensity = Math.max(0, Math.sin(sunAngle)) * 1.2;
    const moonIntensity = Math.max(0, Math.sin(moonAngle)) * 0.3;
    
    this.directionalLight.intensity = sunIntensity;
    this.moonLight.intensity = moonIntensity;
    
    // Update sun and moon visibility
    this.sun.visible = sunY > -10;
    this.moon.visible = moonY > -10;
  }
  
  // NEW: Update star visibility based on time of day
  private updateStarVisibility(): void {
    if (!this.stars) return;
    
    // Stars are visible during night (when sun is down)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const starOpacity = Math.max(0, -Math.sin(sunAngle)) * 0.8;
    
    (this.stars.material as THREE.PointsMaterial).opacity = starOpacity;
  }
  
  // UPDATED: Simplified skybox with smooth continuous transitions
  private createDayNightSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        timeOfDay: { value: this.timeOfDay },
        sunPosition: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDirection = normalize(worldPosition.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float timeOfDay;
        uniform vec3 sunPosition;
        
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        
        vec3 lerpColor(vec3 a, vec3 b, float factor) {
          return mix(a, b, clamp(factor, 0.0, 1.0));
        }
        
        // Enhanced atmospheric scattering simulation
        vec3 getAtmosphericColor(vec3 direction, vec3 sunDir, float timeNormalized) {
          float height = direction.y;
          float sunDot = dot(direction, normalize(sunDir));
          
          // Define atmospheric color zones based on time of day
          vec3 zenithNight = vec3(0.01, 0.01, 0.08);     // Deep night blue
          vec3 zenithDawn = vec3(0.3, 0.5, 0.8);         // Dawn blue
          vec3 zenithDay = vec3(0.4, 0.7, 1.0);          // Day blue
          vec3 zenithSunset = vec3(0.6, 0.4, 0.8);       // Sunset purple
          
          vec3 horizonNight = vec3(0.05, 0.05, 0.2);     // Night horizon
          vec3 horizonDawn = vec3(1.0, 0.6, 0.3);        // Dawn orange
          vec3 horizonDay = vec3(0.8, 0.9, 1.0);         // Day white-blue
          vec3 horizonSunset = vec3(1.0, 0.4, 0.1);      // Sunset orange-red
          
          // Calculate base colors for zenith and horizon
          vec3 zenithColor, horizonColor;
          
          if (timeNormalized < 0.25) {
            // Night to dawn (0.0 - 0.25)
            float factor = smoothstep(0.0, 0.25, timeNormalized);
            zenithColor = lerpColor(zenithNight, zenithDawn, factor);
            horizonColor = lerpColor(horizonNight, horizonDawn, factor);
          } else if (timeNormalized < 0.5) {
            // Dawn to day (0.25 - 0.5)
            float factor = smoothstep(0.25, 0.5, timeNormalized);
            zenithColor = lerpColor(zenithDawn, zenithDay, factor);
            horizonColor = lerpColor(horizonDawn, horizonDay, factor);
          } else if (timeNormalized < 0.75) {
            // Day to sunset (0.5 - 0.75)
            float factor = smoothstep(0.5, 0.75, timeNormalized);
            zenithColor = lerpColor(zenithDay, zenithSunset, factor);
            horizonColor = lerpColor(horizonDay, horizonSunset, factor);
          } else {
            // Sunset to night (0.75 - 1.0)
            float factor = smoothstep(0.75, 1.0, timeNormalized);
            zenithColor = lerpColor(zenithSunset, zenithNight, factor);
            horizonColor = lerpColor(horizonSunset, horizonNight, factor);
          }
          
          // Create vertical atmospheric gradient (Rayleigh scattering simulation)
          float heightFactor = (height + 1.0) * 0.5; // Convert from [-1,1] to [0,1]
          heightFactor = pow(heightFactor, 0.6); // Non-linear for more realistic atmosphere
          
          vec3 baseAtmosphereColor = lerpColor(horizonColor, zenithColor, heightFactor);
          
          // Sun proximity influence for realistic sunset/sunrise glow
          float sunInfluence = 0.0;
          if (sunDir.y > -0.2) { // Only when sun is near or above horizon
            float sunDistance = 1.0 - sunDot; // Distance from sun direction
            sunInfluence = pow(max(0.0, 1.0 - sunDistance * 0.8), 3.0);
            sunInfluence *= max(0.0, (sunDir.y + 0.2) / 1.2); // Fade when sun is below horizon
          }
          
          // Sun glow colors
          vec3 sunGlowColor = vec3(1.0, 0.8, 0.4); // Warm sun glow
          if (timeNormalized > 0.6 && timeNormalized < 0.9) {
            // Enhanced sunset/sunrise glow
            sunGlowColor = vec3(1.0, 0.5, 0.2);
          }
          
          // Apply sun influence to create realistic sun glow
          vec3 finalColor = lerpColor(baseAtmosphereColor, sunGlowColor, sunInfluence * 0.7);
          
          // Add subtle atmospheric perspective for distance
          float atmosphericDepth = 1.0 - abs(height); // More atmosphere at horizon
          finalColor = lerpColor(finalColor, horizonColor, atmosphericDepth * 0.2);
          
          return finalColor;
        }
        
        void main() {
          vec3 direction = normalize(vDirection);
          vec3 sunDir = normalize(sunPosition);
          float normalizedTime = mod(timeOfDay, 1.0);
          
          // Get realistic atmospheric color
          vec3 skyColor = getAtmosphericColor(direction, sunDir, normalizedTime);
          
          // Add subtle stars for night sky
          if (normalizedTime < 0.3 || normalizedTime > 0.8) {
            float starField = fract(sin(dot(direction.xz * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
            if (starField > 0.999 && direction.y > 0.3) {
              float nightFactor = 1.0;
              if (normalizedTime < 0.3) {
                nightFactor = 1.0 - (normalizedTime / 0.3);
              } else {
                nightFactor = (normalizedTime - 0.8) / 0.2;
              }
              skyColor += vec3(0.8, 0.8, 1.0) * 0.5 * nightFactor;
            }
          }
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      fog: false
    });
    
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skybox);
    console.log('Realistic atmospheric gradient skybox created with proper color zones');
  }
  
  private updateDayNightSkybox(): void {
    if (!this.skybox || !this.skybox.material) return;
    
    const material = this.skybox.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.timeOfDay.value = this.timeOfDay;
      
      if (this.sun) {
        material.uniforms.sunPosition.value.copy(this.sun.position);
      }
      
      material.needsUpdate = true;
    }
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
  
  public updateDistanceFog(playerPosition: THREE.Vector3): void {
    this.lastPlayerPosition.copy(playerPosition);
    this.updateShadowCamera(playerPosition);
  }
  
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // NEW: Update day/night cycle with smooth transitions
    if (this.dayNightCycleEnabled) {
      this.timeOfDay += deltaTime * this.dayNightCycleSpeed;
      if (this.timeOfDay >= 1.0) {
        this.timeOfDay -= 1.0;
      }
      
      // Update sun and moon positions
      this.updateSunAndMoonPositions();
      
      // Update lighting based on time with smooth transitions
      this.updateSmoothDayNightLighting();
      
      // Update skybox
      this.updateDayNightSkybox();
      
      // Update star visibility
      this.updateStarVisibility();
      
      // Update fog color smoothly
      this.updateSmoothFogForTime();
    }
    
    // Update cloud spawning system
    if (this.cloudSpawningSystem && playerPosition) {
      this.cloudSpawningSystem.update(deltaTime, playerPosition);
    } else if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.update(deltaTime);
    }
    
    // Update enemy spawning system
    if (this.enemySpawningSystem && playerPosition) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }
    
    // Update shadow camera based on player position
    if (playerPosition) {
      this.updateShadowCamera(playerPosition);
    }
    
    // Manage region loading/unloading
    if (playerPosition) {
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
    
    // Update volumetric fog system
    if (this.volumetricFogSystem && playerPosition) {
      this.volumetricFogSystem.update(deltaTime, this.timeOfDay, playerPosition);
    }
  }
  
  // UPDATED: Smooth lighting transitions
  private updateSmoothDayNightLighting(): void {
    // Update ambient light intensity smoothly
    this.ambientLight.intensity = this.getSmoothAmbientIntensityForTime(this.timeOfDay);
    
    // Update tavern light intensity (brighter at night) with smooth transition
    const nightFactor = this.getSmoothNightFactor(this.timeOfDay);
    this.tavernLight.intensity = 0.5 + (0.5 * nightFactor);
    
    // UPDATED: Smooth directional light color transitions
    const lightColor = this.getSmoothLightColorForTime(this.timeOfDay);
    this.directionalLight.color.copy(lightColor);
  }
  
  // UPDATED: Smooth night factor calculation using continuous curve
  private getSmoothNightFactor(time: number): number {
    const normalizedTime = time % 1;
    const dayAngle = (normalizedTime - 0.25) * Math.PI * 2; // Offset for noon
    
    // Smooth inverted sine curve for night intensity
    const rawFactor = -Math.sin(dayAngle);
    const smoothFactor = (rawFactor + 1) * 0.5;
    
    // Apply easing for natural transition
    return smoothFactor * smoothFactor * (3 - 2 * smoothFactor);
  }
  
  // UPDATED: Smooth light color transitions using continuous interpolation
  private getSmoothLightColorForTime(time: number): THREE.Color {
    const normalizedTime = time % 1;
    
    // Define key light colors
    const nightColor = new THREE.Color(0x4169E1);       // Cool night blue
    const dawnColor = new THREE.Color(0xFFF4E6);        // Warm dawn light
    const noonColor = new THREE.Color(0xFFFAF0);        // Bright white light
    const sunsetColor = new THREE.Color(0xFFE4B5);      // Warm sunset light
    
    // Use smooth sine-based interpolation
    const timeAngle = normalizedTime * Math.PI * 2;
    
    if (normalizedTime <= 0.25) {
      // Night to dawn (0.0 - 0.25)
      const factor = Math.sin((normalizedTime / 0.25) * Math.PI * 0.5);
      return this.lerpColor(nightColor, dawnColor, factor);
    } else if (normalizedTime <= 0.5) {
      // Dawn to noon (0.25 - 0.5)
      const factor = Math.sin(((normalizedTime - 0.25) / 0.25) * Math.PI * 0.5);
      return this.lerpColor(dawnColor, noonColor, factor);
    } else if (normalizedTime <= 0.75) {
      // Noon to sunset (0.5 - 0.75)
      const factor = Math.sin(((normalizedTime - 0.5) / 0.25) * Math.PI * 0.5);
      return this.lerpColor(noonColor, sunsetColor, factor);
    } else {
      // Sunset to night (0.75 - 1.0)
      const factor = Math.sin(((normalizedTime - 0.75) / 0.25) * Math.PI * 0.5);
      return this.lerpColor(sunsetColor, nightColor, factor);
    }
  }
  
  // UPDATED: Smooth fog color updates
  private updateSmoothFogForTime(): void {
    const newFogColor = this.getSmoothFogColorForTime(this.timeOfDay);
    this.fog.color.setHex(newFogColor);
    this.scene.background = new THREE.Color(newFogColor);
    
    if (this.volumetricFogSystem) {
      console.log(`Smooth fog color updated for time ${(this.timeOfDay * 24).toFixed(1)}h: #${newFogColor.toString(16).padStart(6, '0')}`);
    }
  }
  
  // NEW: Debug method to set specific time
  public setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    console.log(`Time set to: ${(this.timeOfDay * 24).toFixed(1)} hours`);
  }
  
  // NEW: Debug method to toggle day/night cycle
  public toggleDayNightCycle(): void {
    this.dayNightCycleEnabled = !this.dayNightCycleEnabled;
    console.log(`Day/night cycle: ${this.dayNightCycleEnabled ? 'enabled' : 'disabled'}`);
  }
  
  // NEW: Debug method to adjust cycle speed
  public setCycleSpeed(speed: number): void {
    this.dayNightCycleSpeed = speed;
    console.log(`Day/night cycle speed set to: ${speed} (${60/speed} seconds per cycle)`);
  }
  
  public createDefaultWorld(): void {
    console.log('Creating default world with day/night cycle...');
    
    this.createSimpleGround();
    console.log('Simple ground plane created at origin');
    
    const startRegion = { ringIndex: 0, quadrant: 0 };
    this.loadRegion(startRegion);
    console.log('🔧 Starting region loaded');
    
    this.buildingManager.createBuilding({
      type: 'tavern',
      position: new THREE.Vector3(0, 0, 0)
    });
    console.log('🏗️ Tavern created using BuildingManager');
    
    this.structureGenerator.createTestHill(20, 0, 30, 15, 8);
    console.log('Test hill created for shadow testing');
    
    // Create day/night skybox
    this.createDayNightSkybox();
    console.log('Day/night skybox created');
    
    // Create 3D sun and moon
    this.create3DSunAndMoon();
    console.log('3D sun and moon created');
    
    // Create star field
    this.createStarField();
    console.log('Star field created');
    
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.initialize();
      console.log('Dynamic cloud spawning system initialized');
    }
    
    // Force initial updates
    this.updateDayNightSkybox();
    this.updateSmoothDayNightLighting();
    this.updateStarVisibility();
    
    console.log('🔧 Registering environment collisions...');
    this.environmentCollisionManager.registerEnvironmentCollisions();
    console.log('🔧 Environment collision system initialized');
    
    console.log('Default world with day/night cycle complete. Current time:', (this.timeOfDay * 24).toFixed(1), 'hours');
    
    // Add debug commands to window for testing
    if (this.debugMode) {
      (window as any).sceneDebug = {
        setTime: (time: number) => this.setTimeOfDay(time / 24),
        toggleCycle: () => this.toggleDayNightCycle(),
        setSpeed: (speed: number) => this.setCycleSpeed(speed),
        getCurrentTime: () => (this.timeOfDay * 24).toFixed(1) + ' hours'
      };
      console.log('Debug commands available: sceneDebug.setTime(hour), sceneDebug.toggleCycle(), sceneDebug.setSpeed(speed)');
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
  }
  
  private unloadRegion(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    const loadedRegion = this.loadedRegions.get(regionKey);
    
    if (!loadedRegion) return;
    
    console.log(`Unloading region: Ring ${region.ringIndex}, Quadrant ${region.quadrant}`);
    
    this.structureGenerator.cleanupStructuresForRegion(region);
    this.terrainFeatureGenerator.cleanupFeaturesForRegion(region);
    
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
  
  private createSimpleGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x5FAD5F,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  
  private createRegionTerrain(region: RegionCoordinates, centerPosition: THREE.Vector3): THREE.Mesh {
    const ringDef = this.ringSystem.getRingDefinition(region.ringIndex);
    
    let terrainGeometry: THREE.BufferGeometry;
    let terrainPosition: THREE.Vector3;
    
    if (region.ringIndex === 0) {
      terrainGeometry = new THREE.CircleGeometry(ringDef.outerRadius, 32);
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log('Creating center ring terrain at origin');
    } else {
      const innerRadius = ringDef.innerRadius;
      const outerRadius = ringDef.outerRadius;
      terrainGeometry = this.createQuadrantGeometry(innerRadius, outerRadius, region.quadrant);
      terrainPosition = new THREE.Vector3(0, 0, 0);
      console.log(`Creating ring ${region.ringIndex} quadrant ${region.quadrant} with geometry in world coordinates`);
    }
    
    const terrainMaterial = new THREE.MeshLambertMaterial({ 
      color: ringDef.terrainColor,
      map: TextureGenerator.createGrassTexture(),
      transparent: false
    });
    
    console.log(`Terrain for ring ${region.ringIndex}, quadrant ${region.quadrant} created with level floor`);
    
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.copy(terrainPosition);
    terrain.position.y = 0;
    terrain.receiveShadow = true;
    
    this.scene.add(terrain);
    
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
    
    // Dispose volumetric fog system
    if (this.volumetricFogSystem) {
      this.volumetricFogSystem.dispose();
      this.volumetricFogSystem = null;
    }
    
    // Clean up day/night cycle objects
    if (this.sun) {
      this.scene.remove(this.sun);
      if (this.sun.geometry) this.sun.geometry.dispose();
      if (this.sun.material instanceof THREE.Material) {
        this.sun.material.dispose();
      }
      this.sun = null;
    }
    
    if (this.moon) {
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
    
    for (const [regionKey, region] of this.loadedRegions.entries()) {
      this.unloadRegion(region.coordinates);
    }
    this.loadedRegions.clear();
    
    console.log("SceneManager with day/night cycle and volumetric fog disposed");
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
    
    if (distanceMoved > this.shadowUpdateThreshold || this.lastPlayerPosition.length() === 0) {
      const shadowCamera = this.directionalLight.shadow.camera;
      const expandedSize = this.shadowCameraSize * 1.2;
      
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
      
      console.log(`Enhanced shadow camera updated for position: ${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)} with dynamic sun tracking`);
    }
  }
}
