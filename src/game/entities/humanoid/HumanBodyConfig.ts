import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { HumanoidConfig } from './EnemyHumanoid';

export class HumanBodyConfig {
  /**
   * Creates a realistic human body configuration
   * Humans are smaller, more refined than orcs
   * Realistic proportions with civilian appearance
   */
  public static createHumanConfig(): HumanoidConfig {
    return {
      type: EnemyType.GOBLIN, // Reuse goblin type for smaller build, but with human features
      health: 100,
      maxHealth: 100,
      speed: 1.5,
      damage: 0, // Peaceful NPC
      goldReward: 0,
      experienceReward: 0,
      attackRange: 0,
      damageRange: 0,
      attackCooldown: 0,
      points: 0,
      knockbackResistance: 0,
      
      // Realistic human body proportions
      bodyScale: {
        body: { radius: 0.35, height: 1.3 },     // Slender human torso
        head: { radius: 0.32 },                  // Proportional human head
        arm: { radius: [0.12, 0.15], length: 0.9 },      // Human arms
        forearm: { radius: [0.10, 0.12], length: 0.7 },  // Human forearms
        leg: { radius: [0.15, 0.18], length: 0.8 },      // Human thighs
        shin: { radius: [0.12, 0.14], length: 0.7 }      // Human calves
      },
      
      // Realistic human skin tones and clothing colors
      colors: {
        skin: 0xFFDBAE,    // Natural human skin tone
        muscle: 0xE6C2A6,  // Slightly darker muscle definition
        accent: 0xD4AF8C   // Accent for joints and details
      },
      
      // Human facial features - no tusks, normal eyes
      features: {
        hasEyes: true,
        hasTusks: false,   // Humans don't have tusks
        hasWeapon: false,  // Peaceful NPC doesn't carry weapons
        eyeConfig: {
          radius: 0.08,
          color: 0x4A4A4A,        // Dark human eyes, not red
          emissiveIntensity: 0.0,  // No glow for human eyes
          offsetX: 0.12,
          offsetY: 0.05,
          offsetZ: 0.9
        }
      }
    };
  }

  /**
   * Creates configuration for a tavern keeper specifically
   */
  public static createTavernKeeperConfig(): HumanoidConfig {
    const baseConfig = this.createHumanConfig();
    
    return {
      ...baseConfig,
      // Tavern keeper specific colors - apron and work clothes
      colors: {
        skin: 0xFFDBAE,    // Human skin tone
        muscle: 0x8B4513,  // Brown clothing/apron
        accent: 0x654321   // Darker brown for details
      }
    };
  }

  /**
   * Creates hair geometry for human NPCs
   */
  public static createHumanHair(headRadius: number, hairColor: number = 0x8B4513): THREE.Mesh {
    // Create natural-looking human hair cap
    const hairGeometry = new THREE.SphereGeometry(headRadius * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
    
    // Modify geometry for more natural hair shape
    const positions = hairGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Add slight randomness for natural hair texture
      const normalizedY = (y / (headRadius * 1.08)) + 0.5;
      const hairThickness = 1.0 + (Math.random() - 0.5) * 0.1;
      
      positions[i] = x * hairThickness;
      positions[i + 2] = z * hairThickness;
    }
    
    hairGeometry.attributes.position.needsUpdate = true;
    hairGeometry.computeVertexNormals();
    
    const hairMaterial = new THREE.MeshPhongMaterial({
      color: hairColor,
      shininess: 35,
      specular: 0x333333
    });
    
    return new THREE.Mesh(hairGeometry, hairMaterial);
  }

  /**
   * Creates clothing overlay for human NPCs
   */
  public static createClothing(bodyRadius: number, bodyHeight: number, clothingColor: number = 0x8B4513): THREE.Mesh {
    // Create simple tunic/apron overlay
    const clothingGeometry = new THREE.CylinderGeometry(
      bodyRadius * 1.15, 
      bodyRadius * 1.1, 
      bodyHeight * 0.8, 
      16, 4
    );
    
    const clothingMaterial = new THREE.MeshPhongMaterial({
      color: clothingColor,
      shininess: 10,
      specular: 0x222222
    });
    
    return new THREE.Mesh(clothingGeometry, clothingMaterial);
  }
}
