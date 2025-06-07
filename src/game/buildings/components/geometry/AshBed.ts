
import * as THREE from 'three';
import { logger } from '../../../core/Logger';
import { LOGGING_CONSTANTS, GEOMETRY_CONSTANTS } from '../../../core/GameConstants';

export class AshBed {
  static create(): THREE.Mesh {
    const ashMaterial = new THREE.MeshLambertMaterial({
      color: 0x808080, // Light gray ash
      transparent: true,
      opacity: 0.8
    });

    const ashGeometry = new THREE.CylinderGeometry(
      GEOMETRY_CONSTANTS.FIREPLACE.ASH_BED_RADIUS, 
      GEOMETRY_CONSTANTS.FIREPLACE.ASH_BED_RADIUS, 
      0.02, 
      16
    );
    const ashBed = new THREE.Mesh(ashGeometry, ashMaterial);
    ashBed.position.set(0, 0.12, 0);
    ashBed.castShadow = false;
    ashBed.receiveShadow = true;

    logger.debug(LOGGING_CONSTANTS.MODULES.BUILDING, 'Ash bed created');
    return ashBed;
  }
}
