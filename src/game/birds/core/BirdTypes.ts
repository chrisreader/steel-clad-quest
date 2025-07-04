import * as THREE from 'three';
import { SpawnableEntity, EntityLifecycleState } from '../../../types/SpawnableEntity';

export enum BirdState {
  IDLE = 'idle',
  WALKING = 'walking',
  FORAGING = 'foraging',
  ALERT = 'alert',
  TAKING_OFF = 'taking_off',
  FLYING = 'flying',
  SOARING = 'soaring',
  LANDING = 'landing',
  PREENING = 'preening'
}

export enum FlightMode {
  GROUNDED = 'grounded',
  ASCENDING = 'ascending',
  CRUISING = 'cruising',
  DESCENDING = 'descending',
  LANDING_APPROACH = 'landing_approach'
}

export interface BirdBodyParts {
  body: THREE.Group;
  head: THREE.Group;
  neck: THREE.Group;
  tail: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  beak: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
}

export interface WingSegments {
  upperArm: THREE.Mesh;
  forearm: THREE.Mesh;
  hand: THREE.Mesh;
  primaryFeathers: THREE.Mesh[];
  secondaryFeathers: THREE.Mesh[];
  covertFeathers?: THREE.Mesh[];
}

export interface BirdConfig {
  species: string;
  size: number;
  wingspan: number;
  bodyLength: number;
  legLength: number;
  walkSpeed: number;
  flightSpeed: number;
  flightAltitude: { min: number; max: number };
  territoryRadius: number;
  alertDistance: number;
}

export interface BirdMaterials {
  feather: THREE.Material;
  beak: THREE.Material;
  eye: THREE.Material;
  leg: THREE.Material;
  body?: THREE.Material;
  belly?: THREE.Material;
  wingFeather?: THREE.Material;
  primaryFeather?: THREE.Material;
}

// Crow-specific configuration
export const CROW_CONFIG: BirdConfig = {
  species: 'Crow',
  size: 1.0,
  wingspan: 2.4,
  bodyLength: 1.0,
  legLength: 0.6,
  walkSpeed: 1.5,
  flightSpeed: 8.0,
  flightAltitude: { min: 15, max: 35 },
  territoryRadius: 25,
  alertDistance: 8
};