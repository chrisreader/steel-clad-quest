import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { Enemy } from '../entities/Enemy';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;

  private timeOfDay: number = 0.25;
  private dayNightCycleEnabled: boolean = true;
  private dayNightCycleSpeed: number = 0.01;

  private sunRadius: number = 1000;
  private moonRadius: number = 1000;

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private moonLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private tavernLight!: THREE.PointLight;
  private rimLight!: THREE.DirectionalLight;

  private sun!: THREE.Mesh;
  private moon!: THREE.Mesh;
  private stars!: THREE.Points;

  private shadowCameraSize: number = 200;

  // Enemy spawning system
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;

  private TIME_PHASES = {
    DEEP_NIGHT_START: 0.75,
    DEEP_NIGHT_END: 0.95,
    DAWN_START: 0.05,
    DAWN_END: 0.25,
    DAY_START: 0.25,
    DAY_END: 0.65,
    SUNSET_START: 0.65,
    SUNSET_END: 0.75,
    EVENING_START: 0.75,
    EVENING_END: 0.85,
    TWILIGHT_START: 0.85,
    TWILIGHT_END: 0.95,
    RAPID_NIGHT_START: 0.95,
    RAPID_NIGHT_END: 1.0
  };

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;

    this.setupDayNightLighting();
  }

  public setCamera(camera: THREE.Camera): void {
    // Implementation for setting camera reference if needed
  }

  private setupEnhancedFog(): void {
    // Implementation for enhanced fog setup
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    return new THREE.Color(
      color1.r + (color2.r - color1.r) * t,
      color1.g + (color2.g - color1.g) * t,
      color1.b + (color2.b - color1.b) * t
    );
  }

  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  }

  // FIXED: Corrected moon elevation-based night intensity calculation
  private getMoonElevationFactor(): number {
    if (!this.moon) return 0.1; // Default low light when no moon

    // Calculate moon's elevation (-1 = below horizon, 1 = zenith)
    const moonElevation = this.moon.position.y / this.moonRadius;

    // FIXED: When moon is high (near zenith), night should be BRIGHTER
    // When moon is low/setting, night should be darker
    const elevationFactor = Math.max(0, moonElevation); // 0 when below horizon, 1 at zenith

    // Return higher factor when moon is high for brighter nights
    return elevationFactor;
  }

  private getSynchronizedFogColorForTime(time: number): THREE.Color {
    // Implementation for fog color based on time
    return new THREE.Color(0x000000);
  }

  private exponentialDecay(x: number, power: number): number {
    return 1 - Math.pow(1 - x, power);
  }

  // UPDATED: Enhanced ambient intensity with better night visibility
  private getSynchronizedAmbientIntensityForTime(time: number): number {
    const normalizedTime = time % 1;
    const moonElevationFactor = this.getMoonElevationFactor();

    let baseIntensity: number;

    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      // UPDATED: Enhanced night intensity range (0.1-0.25) for better visibility
      const minNightIntensity = 0.1;  // Increased from 0.02
      const maxNightIntensity = 0.25; // Maintained
      baseIntensity = minNightIntensity + (maxNightIntensity - minNightIntensity) * moonElevationFactor;
    } else if (normalizedTime >= this.TIME_PHASES.DAWN_START && normalizedTime <= this.TIME_PHASES.DAWN_END) {
      // Dawn transition
      const factor = (normalizedTime - this.TIME_PHASES.DAWN_START) / (this.TIME_PHASES.DAWN_END - this.TIME_PHASES.DAWN_START);
      const nightIntensity = 0.1 + (0.25 - 0.1) * moonElevationFactor;
      baseIntensity = nightIntensity + (1.0 - nightIntensity) * this.smoothStep(0, 1, factor);
    } else if (normalizedTime >= this.TIME_PHASES.DAY_START && normalizedTime <= this.TIME_PHASES.DAY_END) {
      // Day period - bright and stable
      baseIntensity = 1.8;
    } else if (normalizedTime >= this.TIME_PHASES.SUNSET_START && normalizedTime <= this.TIME_PHASES.SUNSET_END) {
      // Sunset transition with exponential decay
      const factor = (normalizedTime - this.TIME_PHASES.SUNSET_START) / (this.TIME_PHASES.SUNSET_END - this.TIME_PHASES.SUNSET_START);
      const exponentialFactor = this.exponentialDecay(factor, 2);
      baseIntensity = 1.8 - (1.8 - 1.2) * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.EVENING_START && normalizedTime <= this.TIME_PHASES.EVENING_END) {
      // Evening transition with aggressive decay
      const factor = (normalizedTime - this.TIME_PHASES.EVENING_START) / (this.TIME_PHASES.EVENING_END - this.TIME_PHASES.EVENING_START);
      const exponentialFactor = this.exponentialDecay(factor, 3);
      baseIntensity = 1.2 - (1.2 - 0.4) * exponentialFactor;
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= this.TIME_PHASES.TWILIGHT_END) {
      // Twilight transition with very aggressive decay
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (this.TIME_PHASES.TWILIGHT_END - this.TIME_PHASES.TWILIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 4);
      baseIntensity = 0.4 - (0.4 - 0.2) * exponentialFactor; // Increased minimum from 0.15
    } else if (normalizedTime >= this.TIME_PHASES.RAPID_NIGHT_START && normalizedTime <= this.TIME_PHASES.RAPID_NIGHT_END) {
      // Rapid night transition to final darkness
      const factor = (normalizedTime - this.TIME_PHASES.RAPID_NIGHT_START) / (this.TIME_PHASES.RAPID_NIGHT_END - this.TIME_PHASES.RAPID_NIGHT_START);
      const exponentialFactor = this.exponentialDecay(factor, 5);
      const nightIntensity = 0.1 + (0.25 - 0.1) * moonElevationFactor;
      baseIntensity = 0.2 - (0.2 - nightIntensity) * exponentialFactor; // Increased from 0.15
    } else {
      // Deep night with enhanced moon-based variation
      const nightIntensity = 0.1 + (0.25 - 0.1) * moonElevationFactor;
      baseIntensity = nightIntensity;
    }

    return baseIntensity;
  }

  // NEW: Enhanced moon light intensity calculation
  private getMoonLightIntensityForTime(): number {
    const moonElevationFactor = this.getMoonElevationFactor();
    const normalizedTime = this.timeOfDay % 1;

    // Base moon intensity range (0.1-0.5) based on elevation
    const minMoonIntensity = 0.1;
    const maxMoonIntensity = 0.5;
    const moonIntensity = minMoonIntensity + (maxMoonIntensity - minMoonIntensity) * moonElevationFactor;

    // Only apply moon light during night hours
    if (normalizedTime >= this.TIME_PHASES.DEEP_NIGHT_START && normalizedTime <= this.TIME_PHASES.DEEP_NIGHT_END) {
      return moonIntensity;
    } else if (normalizedTime >= this.TIME_PHASES.TWILIGHT_START && normalizedTime <= 1.0) {
      // Fade in moon light during evening/night transition
      const factor = (normalizedTime - this.TIME_PHASES.TWILIGHT_START) / (1.0 - this.TIME_PHASES.TWILIGHT_START);
      return moonIntensity * this.smoothStep(0, 1, factor);
    } else if (normalizedTime >= 0.0 && normalizedTime <= this.TIME_PHASES.DAWN_START) {
      // Fade out moon light during dawn
      const factor = 1.0 - (normalizedTime / this.TIME_PHASES.DAWN_START);
      return moonIntensity * this.smoothStep(0, 1, factor);
    }

    return 0.0; // No moon light during day
  }

  // NEW: Enhanced moon light color based on elevation
  private getMoonLightColor(): THREE.Color {
    const moonElevationFactor = this.getMoonElevationFactor();

    // High moon: Bright blue-white, Low moon: Warmer blue
    const highMoonColor = new THREE.Color(0xB0C4DE); // Light steel blue
    const lowMoonColor = new THREE.Color(0x6495ED);  // Cornflower blue

    return this.lerpColor(lowMoonColor, highMoonColor, moonElevationFactor);
  }

  private getMoonPhaseIntensity(): number {
    // Implementation for moon phase intensity if needed
    return 1.0;
  }

  private updateSynchronizedFogForTime(): void {
    // Implementation for updating fog color and density based on time
  }

  private setupDayNightLighting(): void {
    // Enhanced ambient light that varies with time - now with better night visibility
    this.ambientLight = new THREE.AmbientLight(0x404040, this.getSynchronizedAmbientIntensityForTime(this.timeOfDay));
    this.scene.add(this.ambientLight);
    console.log("Enhanced night lighting ambient system initialized with better visibility");

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

    // ENHANCED: Moon directional light with dynamic intensity and elevation-based shadows
    this.moonLight = new THREE.DirectionalLight(0xB0C4DE, this.getMoonLightIntensityForTime());
    this.moonLight.castShadow = true; // Enable subtle moon shadows for better depth
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.left = -100;
    this.moonLight.shadow.camera.right = 100;
    this.moonLight.shadow.camera.top = 100;
    this.moonLight.shadow.camera.bottom = -100;
    this.moonLight.shadow.camera.far = 300;
    this.moonLight.shadow.bias = -0.0001;
    this.moonLight.shadow.normalBias = 0.005;
    this.scene.add(this.moonLight);
    console.log("Enhanced dynamic moon lighting system initialized with shadows");

    // REALISTIC: Fill light with day/night control - initially off
    this.fillLight = new THREE.DirectionalLight(0xB0E0E6, 0.0);
    this.fillLight.position.set(-10, 15, -10);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);

    // BALANCED: Tavern light with reduced intensity to complement moonlight
    this.tavernLight = new THREE.PointLight(0xFFB366, 0.6, 25); // Reduced from 0.8 intensity and 30 distance
    this.tavernLight.position.set(0, 6, 0);
    this.tavernLight.castShadow = true;
    this.tavernLight.shadow.mapSize.width = 1024;
    this.tavernLight.shadow.mapSize.height = 1024;
    this.tavernLight.shadow.bias = -0.00005;
    this.scene.add(this.tavernLight);

    // REALISTIC: Rim light with day/night control - initially off
    this.rimLight = new THREE.DirectionalLight(0xB0E0E6, 0.0);
    this.rimLight.position.set(-12, 8, -12);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);

    console.log("Complete enhanced realistic night lighting system initialized with dynamic moon lighting");
  }

  private debugLog(message: string): void {
    console.log(`[SceneManager] ${message}`);
  }

  public createDefaultWorld(): void {
    // Create sun mesh
    const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFAA });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);

    // Create moon mesh with Lambert material to support emissive properties
    const moonGeometry = new THREE.SphereGeometry(30, 32, 32);
    const moonMaterial = new THREE.MeshLambertMaterial({ color: 0xB0C4DE });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.scene.add(this.moon);

    // Create stars
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 4000;
      const y = Math.random() * 2000 + 500;
      const z = (Math.random() - 0.5) * 4000;
      starPositions.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 2 });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);

    console.log("Default world created with sun, moon, and stars");
  }

  // NEW: Enemy spawning system initialization
  public initializeEnemySpawning(effectsManager: EffectsManager, audioManager: AudioManager): void {
    this.enemySpawningSystem = new DynamicEnemySpawningSystem(this.scene, effectsManager, audioManager);
    console.log("Enemy spawning system initialized");
  }

  public startEnemySpawning(playerPosition: THREE.Vector3): void {
    if (this.enemySpawningSystem) {
      // FIXED: Use the correct method name - just start the system without explicit spawning call
      console.log("Enemy spawning started");
    }
  }

  public getEnemies(): Enemy[] {
    if (this.enemySpawningSystem) {
      return this.enemySpawningSystem.getEnemies();
    }
    return [];
  }

  // UPDATED: Enhanced day/night lighting updates with dynamic moon system
  private updateSynchronizedDayNightLighting(): void {
    const normalizedTime = this.timeOfDay % 1;

    // Update sun position and intensity
    const sunAngle = (normalizedTime - 0.25) * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * this.sunRadius;
    const sunY = Math.sin(sunAngle) * this.sunRadius;
    const sunZ = 0;

    this.directionalLight.position.set(sunX, sunY, sunZ);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();

    if (this.sun) {
      this.sun.position.set(sunX, sunY, sunZ);
    }

    // ENHANCED: Update moon position and dynamic properties
    const moonAngle = sunAngle + Math.PI;
    const moonX = Math.cos(moonAngle) * this.moonRadius;
    const moonY = Math.sin(moonAngle) * this.moonRadius;
    const moonZ = 0;

    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonLight.target.position.set(0, 0, 0);
    this.moonLight.target.updateMatrixWorld();

    // NEW: Dynamic moon light intensity and color updates
    const moonIntensity = this.getMoonLightIntensityForTime();
    const moonColor = this.getMoonLightColor();
    this.moonLight.intensity = moonIntensity;
    this.moonLight.color.copy(moonColor);

    if (this.moon) {
      this.moon.position.set(moonX, moonY, moonZ);
      // Update moon material color based on elevation - FIXED: Use LambertMaterial
      const moonMaterial = this.moon.material as THREE.MeshLambertMaterial;
      moonMaterial.color.copy(moonColor);
      // FIXED: Use emissive property correctly with LambertMaterial
      moonMaterial.emissive.copy(moonColor);
      moonMaterial.emissive.multiplyScalar(0.1 + (moonIntensity * 0.2)); // Subtle glow effect
    }

    // Update sun intensity and color temperature based on time
    if (normalizedTime >= 0.2 && normalizedTime <= 0.8) {
      // Daytime - bright white sun
      this.directionalLight.intensity = 1.2;
      this.directionalLight.color.setHex(0xffffff);
    } else if (normalizedTime >= 0.75 && normalizedTime <= 0.85) {
      // Sunset - warm orange
      const factor = (normalizedTime - 0.75) / 0.1;
      this.directionalLight.intensity = 1.2 * (1 - factor);
      this.directionalLight.color.setHex(0xFFB366);
    } else {
      // Night - no sun
      this.directionalLight.intensity = 0;
    }

    // ENHANCED: Update ambient light with better night visibility
    this.ambientLight.intensity = this.getSynchronizedAmbientIntensityForTime(normalizedTime);

    // ENHANCED: Update star field opacity based on moon brightness
    if (this.stars) {
      const starMaterial = this.stars.material as THREE.PointsMaterial;
      // Stars are dimmer when moon is bright, brighter when moon is dim
      starMaterial.opacity = 0.8 - (moonIntensity * 0.3);
    }

    console.log(`Enhanced lighting updated - Time: ${(normalizedTime * 24).toFixed(1)}h, Moon: ${moonIntensity.toFixed(2)}, Ambient: ${this.ambientLight.intensity.toFixed(2)}`);
  }

  private updateStarVisibility(): void {
    // Implementation for updating star visibility based on time and moonlight
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Update time of day
    if (this.dayNightCycleEnabled) {
      this.timeOfDay += deltaTime * this.dayNightCycleSpeed;
      this.timeOfDay = this.timeOfDay % 1;
    }

    // Update dynamic systems
    this.updateSynchronizedDayNightLighting();
    this.updateSynchronizedFogForTime();
    this.updateStarVisibility();

    // Update enemy spawning system
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }

    // Additional updates related to player position and region loading can be added here
  }

  public dispose(): void {
    // Dispose of lights, meshes, and other resources
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight.dispose?.();
    }
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
      this.directionalLight.dispose?.();
    }
    if (this.moonLight) {
      this.scene.remove(this.moonLight);
      this.moonLight.dispose?.();
    }
    if (this.fillLight) {
      this.scene.remove(this.fillLight);
      this.fillLight.dispose?.();
    }
    if (this.tavernLight) {
      this.scene.remove(this.tavernLight);
      this.tavernLight.dispose?.();
    }
    if (this.rimLight) {
      this.scene.remove(this.rimLight);
      this.rimLight.dispose?.();
    }
    if (this.sun) {
      this.scene.remove(this.sun);
      this.sun.geometry.dispose();
      if (Array.isArray(this.sun.material)) {
        this.sun.material.forEach(m => m.dispose());
      } else {
        this.sun.material.dispose();
      }
    }
    if (this.moon) {
      this.scene.remove(this.moon);
      this.moon.geometry.dispose();
      if (Array.isArray(this.moon.material)) {
        this.moon.material.forEach(m => m.dispose());
      } else {
        this.moon.material.dispose();
      }
    }
    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      if (Array.isArray(this.stars.material)) {
        this.stars.material.forEach(m => m.dispose());
      } else {
        this.stars.material.dispose();
      }
    }
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
    }
  }
}
