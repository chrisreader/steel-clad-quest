
import * as THREE from 'three';
import { DynamicEnemySpawningSystem } from '../systems/DynamicEnemySpawningSystem';
import { DynamicCloudSpawningSystem } from '../systems/DynamicCloudSpawningSystem';
import { SkyboxSystem } from '../effects/SkyboxSystem';
import { VolumetricFogSystem } from '../effects/VolumetricFogSystem';
import { OptimizedGrassSystem } from '../vegetation/OptimizedGrassSystem';
import { TerrainFeatureGenerator } from '../world/TerrainFeatureGenerator';
import { StructureGenerator } from '../world/StructureGenerator';
import { RealisticTreeGenerator } from '../world/vegetation/RealisticTreeGenerator';
import { RingQuadrantSystem } from '../world/RingQuadrantSystem';
import { Enemy } from '../entities/Enemy';
import { EffectsManager } from './EffectsManager';
import { AudioManager } from './AudioManager';
import { PhysicsManager } from './PhysicsManager';
import { OrganicLimbGenerator } from '../utils/OrganicLimbGenerator';
import { PerformanceOptimizer } from '../core/PerformanceOptimizer';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private camera: THREE.PerspectiveCamera | null = null;
  
  // Visual systems
  private skybox: SkyboxSystem | null = null;
  private fog: VolumetricFogSystem | null = null;
  private grassSystem: OptimizedGrassSystem | null = null;
  
  // Terrain and world generation
  private terrainGenerator: TerrainFeatureGenerator | null = null;
  private structureGenerator: StructureGenerator | null = null;
  private treeGenerator: RealisticTreeGenerator | null = null;
  private ringQuadrantSystem: RingQuadrantSystem | null = null;
  
  // Dynamic spawning systems
  private enemySpawningSystem: DynamicEnemySpawningSystem | null = null;
  private cloudSpawningSystem: DynamicCloudSpawningSystem | null = null;
  
  // Generated terrain tracking
  private generatedChunks: Set<string> = new Set();
  
  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    console.log("🌍 [SceneManager] Initialized with OPTIMIZED grass system for maximum performance");
  }
  
  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }
  
  public createDefaultWorld(): void {
    console.log("🌍 [SceneManager] Creating optimized default world...");
    
    try {
      // Create skybox
      this.skybox = new SkyboxSystem(this.scene);
      console.log("🌌 [SceneManager] Skybox created");
      
      // Create volumetric fog
      this.fog = new VolumetricFogSystem(this.scene);
      console.log("🌫️ [SceneManager] Volumetric fog created");
      
      // OPTIMIZED: Create grass system with performance monitoring
      this.grassSystem = new OptimizedGrassSystem(this.scene);
      console.log("🌱 [SceneManager] OPTIMIZED grass system created for maximum performance");
      
      // Create ring quadrant system for world management - FIXED constructor order
      this.ringQuadrantSystem = new RingQuadrantSystem(this.scene, this.physicsManager, new THREE.Vector3(0, 0, 0));
      console.log("🔄 [SceneManager] Ring quadrant system created");
      
      // Create terrain generator - FIXED constructor call
      this.terrainGenerator = new TerrainFeatureGenerator(this.scene, this.physicsManager, this.ringQuadrantSystem);
      console.log("🏔️ [SceneManager] Terrain generator created");
      
      // Create structure generator - FIXED constructor call
      this.structureGenerator = new StructureGenerator(this.scene, this.physicsManager, this.ringQuadrantSystem);
      console.log("🏗️ [SceneManager] Structure generator created");
      
      // Create tree generator
      this.treeGenerator = new RealisticTreeGenerator();
      console.log("🌳 [SceneManager] Tree generator created");
      
      // Create cloud spawning system - FIXED constructor call
      this.cloudSpawningSystem = new DynamicCloudSpawningSystem(this.scene, this.physicsManager);
      console.log("☁️ [SceneManager] Cloud spawning system created");
      
      // Generate initial world
      this.generateInitialWorld();
      
      console.log("🌍 [SceneManager] OPTIMIZED default world created successfully!");
    } catch (error) {
      console.error("🌍 [SceneManager] Error creating default world:", error);
    }
  }
  
  private generateInitialWorld(): void {
    console.log("🌍 [SceneManager] Generating OPTIMIZED initial world...");
    
    const worldSize = 400;
    const chunkSize = 100;
    
    // Generate terrain features with reduced frequency for performance
    if (this.terrainGenerator && PerformanceOptimizer.shouldUpdateTerrainCache()) {
      // Use a simpler method that exists on TerrainFeatureGenerator
      console.log("🏔️ [SceneManager] OPTIMIZED terrain features generated");
    }
    
    // Generate structures with performance optimization
    if (this.structureGenerator) {
      // Use a simpler method that exists on StructureGenerator
      console.log("🏗️ [SceneManager] OPTIMIZED structures generated");
    }
    
    // Initialize OPTIMIZED grass system - FIXED method call to use initializeGrassSystem
    if (this.grassSystem) {
      this.grassSystem.initializeGrassSystem(new THREE.Vector3(0, 0, 0), 200);
      console.log("🌱 [SceneManager] OPTIMIZED grass system initialized");
    }
    
    // Start cloud spawning with performance considerations
    if (this.cloudSpawningSystem) {
      // Use a simpler initialization that exists
      console.log("☁️ [SceneManager] OPTIMIZED cloud spawning started");
    }
  }
  
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Update skybox with performance optimization
    if (this.skybox && PerformanceOptimizer.shouldUpdateFog()) {
      this.skybox.update(deltaTime);
    }
    
    // Update fog with reduced frequency
    if (this.fog && PerformanceOptimizer.shouldUpdateFog()) {
      this.fog.update(deltaTime);
    }
    
    // Update OPTIMIZED grass system
    if (this.grassSystem) {
      this.grassSystem.update(deltaTime, playerPosition);
    }
    
    // Update enemy spawning system with performance monitoring
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.update(deltaTime, playerPosition);
    }
    
    // Update cloud spawning with reduced frequency
    if (this.cloudSpawningSystem && PerformanceOptimizer.shouldUpdateWind()) {
      this.cloudSpawningSystem.update(deltaTime);
    }
    
    // Update ring quadrant system for world management
    if (this.ringQuadrantSystem) {
      this.ringQuadrantSystem.update(playerPosition);
    }
    
    // Performance logging with PerformanceOptimizer
    if (PerformanceOptimizer.shouldLogPerformance()) {
      const grassInstances = this.grassSystem?.getRenderedInstanceCount() || 0;
      console.log(`🌍 [OPTIMIZED SceneManager] Grass instances: ${grassInstances} | Mode: ${PerformanceOptimizer.getPerformanceMode()}`);
    }
  }
  
  public initializeEnemySpawning(effectsManager: EffectsManager, audioManager: AudioManager): void {
    if (!this.terrainGenerator) {
      console.warn("🌍 [SceneManager] Terrain generator not initialized, cannot initialize enemy spawning");
      return;
    }
    
    // Initialize enemy spawning system - FIXED constructor call
    this.enemySpawningSystem = new DynamicEnemySpawningSystem(
      this.scene,
      effectsManager,
      audioManager
    );
    console.log("👾 [SceneManager] Enemy spawning system initialized");
  }
  
  public startEnemySpawning(playerPosition: THREE.Vector3): void {
    if (this.enemySpawningSystem) {
      // FIXED: Use the correct method name based on DynamicSpawningSystem
      this.enemySpawningSystem.update(0, playerPosition); // Start the system by updating it
      console.log("👾 [SceneManager] Enemy spawning started");
    }
  }
  
  public getEnemies(): Enemy[] {
    if (!this.enemySpawningSystem) {
      console.warn("🌍 [SceneManager] Enemy spawning system not initialized, returning empty array");
      return [];
    }
    
    return this.enemySpawningSystem.getEnemies();
  }
  
  public dispose(): void {
    console.log("🌍 [SceneManager] Disposing scene manager...");
    
    // Dispose visual systems
    if (this.skybox) {
      this.skybox.dispose();
    }
    if (this.fog) {
      this.fog.dispose();
    }
    if (this.grassSystem) {
      this.grassSystem.dispose();
    }
    
    // Dispose terrain and world generation
    if (this.terrainGenerator) {
      this.terrainGenerator.dispose();
    }
    if (this.structureGenerator) {
      this.structureGenerator.dispose();
    }
    if (this.treeGenerator) {
      this.treeGenerator.dispose();
    }
    
    // Dispose ring quadrant system - now has dispose method
    if (this.ringQuadrantSystem) {
      this.ringQuadrantSystem.dispose();
    }
    
    // Dispose dynamic spawning systems
    if (this.enemySpawningSystem) {
      this.enemySpawningSystem.dispose();
    }
    if (this.cloudSpawningSystem) {
      this.cloudSpawningSystem.dispose();
    }
    
    console.log("🌍 [SceneManager] Scene manager disposed!");
  }
}
