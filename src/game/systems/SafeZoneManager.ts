
import * as THREE from 'three';

export interface SafeZoneConfig {
  center: THREE.Vector3;
  radius: number;
}

export class SafeZoneManager {
  private config: SafeZoneConfig;
  private isPlayerInSafeZone: boolean = false;
  private onPlayerEnterSafeZone?: () => void;
  private onPlayerExitSafeZone?: () => void;

  constructor(config: SafeZoneConfig) {
    this.config = config;
    console.log(`🛡️ [SafeZoneManager] Initialized safe zone at center (${config.center.x}, ${config.center.z}) with radius ${config.radius}`);
  }

  public isPositionInSafeZone(position: THREE.Vector3): boolean {
    const distance = new THREE.Vector2(position.x - this.config.center.x, position.z - this.config.center.z).length();
    return distance <= this.config.radius;
  }

  public updatePlayerPosition(playerPosition: THREE.Vector3): void {
    const wasInSafeZone = this.isPlayerInSafeZone;
    this.isPlayerInSafeZone = this.isPositionInSafeZone(playerPosition);

    if (!wasInSafeZone && this.isPlayerInSafeZone) {
      console.log('🛡️ [SafeZoneManager] Player entered safe zone');
      this.onPlayerEnterSafeZone?.();
    } else if (wasInSafeZone && !this.isPlayerInSafeZone) {
      console.log('🛡️ [SafeZoneManager] Player exited safe zone');
      this.onPlayerExitSafeZone?.();
    }
  }

  public getIsPlayerInSafeZone(): boolean {
    return this.isPlayerInSafeZone;
  }

  public getSafeZoneCenter(): THREE.Vector3 {
    return this.config.center.clone();
  }

  public getSafeZoneRadius(): number {
    return this.config.radius;
  }

  public setCallbacks(onEnter?: () => void, onExit?: () => void): void {
    this.onPlayerEnterSafeZone = onEnter;
    this.onPlayerExitSafeZone = onExit;
  }

  public generateSafeSpawnPosition(minDistance: number, maxDistance: number, playerPosition?: THREE.Vector3): THREE.Vector3 {
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      let spawnPosition: THREE.Vector3;

      if (playerPosition) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        spawnPosition = new THREE.Vector3(
          playerPosition.x + Math.cos(angle) * distance,
          0,
          playerPosition.z + Math.sin(angle) * distance
        );
      } else {
        spawnPosition = new THREE.Vector3(
          (Math.random() - 0.5) * maxDistance * 2,
          0,
          (Math.random() - 0.5) * maxDistance * 2
        );
      }

      if (!this.isPositionInSafeZone(spawnPosition)) {
        return spawnPosition;
      }

      attempts++;
    }

    // Fallback: spawn far from safe zone
    const angle = Math.random() * Math.PI * 2;
    const distance = this.config.radius + minDistance + 10;
    return new THREE.Vector3(
      this.config.center.x + Math.cos(angle) * distance,
      0,
      this.config.center.z + Math.sin(angle) * distance
    );
  }
}
