
import * as THREE from 'three';
import { TextureGenerator } from '../../../utils';

export class CharredLogs {
  static create(): THREE.Mesh[] {
    const logMaterial = new THREE.MeshLambertMaterial({
      color: 0x2F1B14, // Dark charred brown
      map: TextureGenerator.createWoodTexture()
    });

    const logs: THREE.Mesh[] = [];

    // Create 3-4 logs arranged naturally
    const logConfigs = [
      { length: 0.8, radius: 0.08, position: new THREE.Vector3(0.2, 0.15, 0), rotation: new THREE.Euler(0, 0.3, 0.1) },
      { length: 0.9, radius: 0.09, position: new THREE.Vector3(-0.15, 0.15, 0.1), rotation: new THREE.Euler(0, -0.5, -0.05) },
      { length: 0.7, radius: 0.07, position: new THREE.Vector3(0, 0.15, -0.2), rotation: new THREE.Euler(0.1, 0.8, 0) },
      { length: 0.6, radius: 0.06, position: new THREE.Vector3(-0.1, 0.25, 0.05), rotation: new THREE.Euler(-0.2, 0.2, 0.15) }
    ];

    for (let i = 0; i < logConfigs.length; i++) {
      const config = logConfigs[i];
      const logGeometry = new THREE.CylinderGeometry(config.radius, config.radius, config.length, 8);
      const log = new THREE.Mesh(logGeometry, logMaterial.clone());
      
      log.position.copy(config.position);
      log.rotation.copy(config.rotation);
      log.castShadow = true;
      log.receiveShadow = true;

      logs.push(log);
    }
    
    console.log(`🏗️ Created ${logConfigs.length} charred logs`);
    return logs;
  }
}
