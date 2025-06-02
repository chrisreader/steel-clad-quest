
import * as THREE from 'three';

export interface SafeZoneConfig {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class SafeZoneManager {
  private config: SafeZoneConfig;
  private isPlayerInSafeZone: boolean = false;
  private onPlayerEnterSafeZone?: () => void;
  private onPlayerExitSafeZone?: () => void;

  constructor(config: SafeZoneConfig) {
    this.config = config;
    console.log(`🛡️ [SafeZoneManager] Initialized rectangular safe zone: X(${config.minX} to ${config.maxX}), Z(${config.minZ} to ${config.maxZ})`);
  }

  public isPositionInSafeZone(position: THREE.Vector3): boolean {
    return position.x >= this.config.minX && 
           position.x <= this.config.maxX && 
           position.z >= this.config.minZ && 
           position.z <= this.config.maxZ;
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
    const centerX = (this.config.minX + this.config.maxX) / 2;
    const centerZ = (this.config.minZ + this.config.maxZ) / 2;
    return new THREE.Vector3(centerX, 0, centerZ);
  }

  public getSafeZoneBounds(): SafeZoneConfig {
    return { ...this.config };
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

    // Fallback: spawn far from safe zone center
    const center = this.getSafeZoneCenter();
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + 10;
    return new THREE.Vector3(
      center.x + Math.cos(angle) * distance,
      0,
      center.z + Math.sin(angle) * distance
    );
  }
}
