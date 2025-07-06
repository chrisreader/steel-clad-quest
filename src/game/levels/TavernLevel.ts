
import { TavernBuilding } from '../buildings/TavernBuilding';
import * as THREE from 'three';

export class TavernLevel {
  public static getLevelData() {
    return {
      name: 'The Rusty Sword Tavern',
      description: 'A cozy medieval tavern with stone foundations, wooden beams, flickering fireplace, and authentic atmosphere where adventures begin',
      backgroundMusic: 'tavern_ambient',
      lighting: {
        ambient: 0x404040,
        directional: 0xffffff,
        // Enhanced lighting for realistic atmosphere
        fireplace: {
          color: 0xff6600,
          intensity: 1.5,
          distance: 15,
          decay: 2
        },
        lanterns: {
          color: 0xffdd88,
          intensity: 0.8,
          distance: 8,
          decay: 1.5
        },
        candles: {
          color: 0xfff8dc,
          intensity: 0.4,
          distance: 3,
          decay: 2
        }
      },
      spawns: {
        player: { x: 0, y: 0.5, z: 4 }, // Spawn near entrance
        enemies: [] // No enemies in tavern (safe zone)
      },
      environment: {
        // Enhanced realistic tavern environment
        floor: {
          size: { width: 12, height: 12 },
          texture: 'realistic_wood_planks',
          color: 0x8B4513,
          material: 'MeshStandardMaterial',
          roughness: 0.8,
          metalness: 0.1
        },
        walls: {
          material: 'stone_wood_hybrid',
          foundation: {
            material: 'weathered_stone',
            height: 1.5,
            color: 0x696969
          },
          upper: {
            material: 'aged_wood',
            color: 0x8B7355,
            beams: true
          }
        },
        roof: {
          type: 'pitched',
          material: 'wood_shingles',
          color: 0x8B4513,
          beams: true
        },
        objects: [
          // Central fireplace (heart of the tavern)
          { 
            type: 'enhanced_fireplace', 
            position: { x: 0, y: 0, z: 0 },
            alwaysLit: true,
            hasChimney: true,
            organicRocks: true
          },
          
          // Bar counter area
          { 
            type: 'bar_counter', 
            position: { x: 3, y: 0, z: 3 },
            length: 6,
            hasStools: true,
            hasShelf: true,
            hasBottles: true
          },
          
          // Dining areas
          { 
            type: 'round_table', 
            position: { x: -2, y: 0, z: -1 },
            radius: 1.2,
            hasChairs: 4,
            hasMugs: true
          },
          { 
            type: 'rectangular_table', 
            position: { x: -3.5, y: 0, z: -3.5 },
            size: { width: 2.5, depth: 1.2 },
            hasChairs: 4,
            hasCandle: true
          },
          
          // Seating areas
          { 
            type: 'wall_bench', 
            position: { x: 1.5, y: 0, z: -5.5 },
            length: 4,
            hasBack: true
          },
          
          // Atmospheric elements
          { 
            type: 'decorative_barrels', 
            position: { x: -5, y: 0, z: -5 },
            count: 3,
            spacing: 1.5
          },
          { 
            type: 'hanging_lanterns', 
            positions: [
              { x: -2, y: 5, z: 1 },
              { x: 2, y: 5, z: 1 }
            ],
            hasChains: true
          },
          
          // Architectural details
          { 
            type: 'windows', 
            positions: [
              { x: -5.95, y: 3, z: -2 }, // Left wall
              { x: 5.95, y: 3, z: 2 }    // Right wall
            ],
            hasFrames: true,
            hasShutters: false
          },
          { 
            type: 'door_frame', 
            position: { x: 0, y: 2, z: 6.1 },
            hasPosts: true,
            hasLintel: true,
            hasSign: true
          },
          
          // Interactive elements
          { 
            type: 'treasure_chests',
            positions: [
              { x: -4.5, y: 0, z: -3, type: 'common' },
              { x: 4.5, y: 0, z: -4.5, type: 'rare' }
            ]
          }
        ],
        
        // NPCs
        npcs: [
          {
            type: 'tavern_keeper',
            name: 'Innkeeper Aldric',
            position: { x: 3, y: 0, z: 1 },
            behavior: 'tavern_keeper',
            hasDialogue: true,
            wanderRadius: 8,
            tool: 'mug'
          }
        ],
        
        // Ambient details
        ambiance: {
          sounds: [
            'crackling_fire',
            'tavern_chatter',
            'clinking_mugs',
            'wooden_footsteps',
            'ambient_medieval'
          ],
          lighting: {
            timeOfDay: 'evening',
            atmosphere: 'cozy',
            shadows: true,
            dynamicLighting: true
          }
        }
      }
    };
  }

  // Create the actual tavern building instance
  public static createTavernBuilding(
    scene: THREE.Scene, 
    physicsManager: any, 
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ): TavernBuilding {
    return new TavernBuilding(scene, physicsManager, position);
  }

  // Get spawn position for player
  public static getPlayerSpawnPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 0.5, 4); // Near the entrance
  }

  // Check if position is inside tavern safe zone
  public static isInsideTavern(position: THREE.Vector3): boolean {
    const tavernBounds = {
      minX: -6.5,
      maxX: 6.5,
      minZ: -6.5,
      maxZ: 6.5
    };
    
    return position.x >= tavernBounds.minX && 
           position.x <= tavernBounds.maxX &&
           position.z >= tavernBounds.minZ && 
           position.z <= tavernBounds.maxZ;
  }
}
