
import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';
import { DynamicCloudSpawningSystem } from '../world/spawning/DynamicCloudSpawningSystem';

export class SceneManager {
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private cloudSpawningSystem: DynamicCloudSpawningSystem;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.cloudSpawningSystem = new DynamicCloudSpawningSystem(scene);
  }

  public createDefaultWorld(): void {
    this.setupLighting();
    this.createFloor();
    this.createWalls();
    this.createFog();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  private createFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(500, 500);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.physicsManager.addCollisionPlane(floorPlane);
  }

  private createWalls(): void {
    const wallHeight = 10;
    const wallThickness = 1;
    const worldSize = 50;

    // North wall
    const northWall = this.createWall(worldSize, wallHeight, wallThickness);
    northWall.position.set(0, wallHeight / 2, worldSize / 2);
    this.scene.add(northWall);
    this.physicsManager.addCollisionBox(new THREE.Box3().setFromObject(northWall));

    // South wall  
    const southWall = this.createWall(worldSize, wallHeight, wallThickness);
    southWall.position.set(0, wallHeight / 2, -worldSize / 2);
    this.scene.add(southWall);
    this.physicsManager.addCollisionBox(new THREE.Box3().setFromObject(southWall));

    // East wall
    const eastWall = this.createWall(wallThickness, wallHeight, worldSize);
    eastWall.position.set(worldSize / 2, wallHeight / 2, 0);
    this.scene.add(eastWall);
    this.physicsManager.addCollisionBox(new THREE.Box3().setFromObject(eastWall));

    // West wall
    const westWall = this.createWall(wallThickness, wallHeight, worldSize);
    westWall.position.set(-worldSize / 2, wallHeight / 2, 0);
    this.scene.add(westWall);
    this.physicsManager.addCollisionBox(new THREE.Box3().setFromObject(westWall));
  }

  private createWall(width: number, height: number, depth: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const wall = new THREE.Mesh(geometry, material);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  private createFog(): void {
    const fog = new THREE.Fog(0xcccccc, 10, 200);
    this.scene.fog = fog;
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.cloudSpawningSystem.update(deltaTime, playerPosition);
    this.updateFog(playerPosition);
  }

  private updateFog(playerPosition: THREE.Vector3): void {
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = 10;
      this.scene.fog.far = 200;
    }
  }

  public dispose(): void {
    // Cleanup scene manager
  }
}
