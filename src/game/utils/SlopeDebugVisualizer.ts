
import * as THREE from 'three';

export interface SlopeDebugInfo {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  angle: number;
  isWalkable: boolean;
  rayDirection: THREE.Vector3;
  hitPoint: THREE.Vector3;
}

export class SlopeDebugVisualizer {
  private scene: THREE.Scene;
  private debugObjects: THREE.Object3D[] = [];
  private enabled: boolean = false;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearDebugObjects();
    }
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  public visualizeSlope(debugInfo: SlopeDebugInfo): void {
    if (!this.enabled) return;
    
    // Clear previous debug objects if too many
    if (this.debugObjects.length > 50) {
      this.clearOldestDebugObjects(25);
    }
    
    // 1. Ray visualization
    this.createRayVisualization(debugInfo);
    
    // 2. Normal vector visualization
    this.createNormalVisualization(debugInfo);
    
    // 3. Slope angle indicator
    this.createAngleIndicator(debugInfo);
    
    // 4. Hit point marker
    this.createHitPointMarker(debugInfo);
  }
  
  private createRayVisualization(debugInfo: SlopeDebugInfo): void {
    const rayLength = debugInfo.position.distanceTo(debugInfo.hitPoint);
    const rayGeometry = new THREE.CylinderGeometry(0.02, 0.02, rayLength, 8);
    const rayMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6
    });
    
    const ray = new THREE.Mesh(rayGeometry, rayMaterial);
    
    // Position and orient the ray
    const midPoint = new THREE.Vector3().addVectors(debugInfo.position, debugInfo.hitPoint).multiplyScalar(0.5);
    ray.position.copy(midPoint);
    
    // Align with ray direction
    const direction = new THREE.Vector3().subVectors(debugInfo.hitPoint, debugInfo.position).normalize();
    ray.lookAt(ray.position.clone().add(direction));
    ray.rotateX(Math.PI / 2);
    
    this.scene.add(ray);
    this.debugObjects.push(ray);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      this.removeDebugObject(ray);
    }, 3000);
  }
  
  private createNormalVisualization(debugInfo: SlopeDebugInfo): void {
    const normalLength = 2.0;
    const normalGeometry = new THREE.CylinderGeometry(0.05, 0.1, normalLength, 8);
    
    // Color based on walkability
    const normalColor = debugInfo.isWalkable ? 0x00ff00 : 0xff0000;
    const normalMaterial = new THREE.MeshBasicMaterial({ 
      color: normalColor,
      transparent: true,
      opacity: 0.8
    });
    
    const normal = new THREE.Mesh(normalGeometry, normalMaterial);
    normal.position.copy(debugInfo.hitPoint);
    
    // Orient normal vector
    const up = new THREE.Vector3(0, 1, 0);
    const normalDirection = debugInfo.normal.clone().normalize();
    normal.lookAt(normal.position.clone().add(normalDirection));
    normal.rotateX(-Math.PI / 2);
    
    this.scene.add(normal);
    this.debugObjects.push(normal);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      this.removeDebugObject(normal);
    }, 3000);
  }
  
  private createAngleIndicator(debugInfo: SlopeDebugInfo): void {
    // Create a text sprite showing the angle
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 64;
    
    // Clear canvas
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.fillStyle = debugInfo.isWalkable ? '#00ff00' : '#ff0000';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(`${debugInfo.angle.toFixed(1)}°`, canvas.width / 2, 20);
    context.fillText(debugInfo.isWalkable ? 'WALKABLE' : 'BLOCKED', canvas.width / 2, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.position.copy(debugInfo.hitPoint);
    sprite.position.y += 1.5; // Slightly above hit point
    sprite.scale.set(2, 1, 1);
    
    this.scene.add(sprite);
    this.debugObjects.push(sprite);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      this.removeDebugObject(sprite);
    }, 3000);
  }
  
  private createHitPointMarker(debugInfo: SlopeDebugInfo): void {
    const markerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const markerColor = debugInfo.isWalkable ? 0x00ff00 : 0xff0000;
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: markerColor,
      transparent: true,
      opacity: 0.9
    });
    
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(debugInfo.hitPoint);
    
    this.scene.add(marker);
    this.debugObjects.push(marker);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      this.removeDebugObject(marker);
    }, 3000);
  }
  
  public visualizeHeightAdjustment(fromPosition: THREE.Vector3, toPosition: THREE.Vector3): void {
    if (!this.enabled) return;
    
    const heightDiff = toPosition.y - fromPosition.y;
    if (Math.abs(heightDiff) < 0.01) return; // Skip tiny adjustments
    
    // Create arrow showing height adjustment
    const arrowLength = Math.abs(heightDiff);
    const arrowGeometry = new THREE.CylinderGeometry(0.05, 0.1, arrowLength, 8);
    const arrowColor = heightDiff > 0 ? 0x0080ff : 0xff8000; // Blue for up, orange for down
    const arrowMaterial = new THREE.MeshBasicMaterial({ 
      color: arrowColor,
      transparent: true,
      opacity: 0.7
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.x = fromPosition.x;
    arrow.position.y = fromPosition.y + heightDiff / 2;
    arrow.position.z = fromPosition.z;
    
    this.scene.add(arrow);
    this.debugObjects.push(arrow);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      this.removeDebugObject(arrow);
    }, 2000);
  }
  
  private removeDebugObject(object: THREE.Object3D): void {
    const index = this.debugObjects.indexOf(object);
    if (index !== -1) {
      this.debugObjects.splice(index, 1);
      this.scene.remove(object);
      
      // Dispose resources
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      } else if (object instanceof THREE.Sprite && object.material) {
        object.material.dispose();
        if (object.material.map) object.material.map.dispose();
      }
    }
  }
  
  private clearOldestDebugObjects(count: number): void {
    const toRemove = this.debugObjects.splice(0, count);
    toRemove.forEach(object => {
      this.scene.remove(object);
      
      // Dispose resources
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      } else if (object instanceof THREE.Sprite && object.material) {
        object.material.dispose();
        if (object.material.map) object.material.map.dispose();
      }
    });
  }
  
  private clearDebugObjects(): void {
    this.debugObjects.forEach(object => {
      this.scene.remove(object);
      
      // Dispose resources
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      } else if (object instanceof THREE.Sprite && object.material) {
        object.material.dispose();
        if (object.material.map) object.material.map.dispose();
      }
    });
    
    this.debugObjects = [];
  }
  
  public dispose(): void {
    this.clearDebugObjects();
  }
}
